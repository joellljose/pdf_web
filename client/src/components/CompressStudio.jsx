import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, ArrowLeft, Trash2, Check, Download, 
  RefreshCw, Minimize2, ShieldCheck, Zap, Sparkles, 
  Layers, Lock, Eye, ArrowRight, CheckCircle2, AlertCircle, FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

const COMPRESSION_LEVELS = [
  {
    id: 'extreme',
    title: 'Extreme Compression',
    badge: 'Smallest Size',
    badgeClass: 'badge-extreme',
    dpi: '72 DPI',
    reduction: 'Up to 80%',
    description: 'Maximum file size reduction. Ideal for strict email attachment limits and low-bandwidth web access.',
    icon: Zap,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.35)'
  },
  {
    id: 'recommended',
    title: 'Recommended',
    badge: 'Best Balance',
    badgeClass: 'badge-recommended',
    dpi: '150 DPI',
    reduction: '50% - 70%',
    description: 'Optimal balance of high visual clarity and substantial size reduction. Perfect for standard documents and sharing.',
    icon: Sparkles,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.4)',
    popular: true
  },
  {
    id: 'low',
    title: 'High Quality',
    badge: 'Print Ready',
    badgeClass: 'badge-quality',
    dpi: '300 DPI',
    reduction: '20% - 40%',
    description: 'Subtle compression preserving maximum image detail, line art sharpness, and vector typography.',
    icon: Layers,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.35)'
  }
];

export function CompressStudio({ onBackToDashboard, onShowToast }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState('recommended');
  const [outputFilename, setOutputFilename] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [compressResult, setCompressResult] = useState(null);

  // Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fileInputRef = useRef(null);

  // Format bytes helper
  const formatBytes = (bytes, decimals = 1) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Handle file selection and read metadata
  const handleFileLoaded = async (uploadedFile) => {
    const isPdf = uploadedFile.type === 'application/pdf' || uploadedFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      onShowToast({
        type: 'error',
        message: `"${uploadedFile.name}" is not a valid PDF document.`
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const res = await fetch('/api/tools/info', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Failed to read PDF document metadata');
      }

      const json = await res.json();
      const isEncrypted = json.data?.isEncrypted;

      setFile(uploadedFile);
      setPageCount(json.data?.pageCount || 1);
      if (isEncrypted) {
        setShowPasswordField(true);
        onShowToast({
          type: 'info',
          message: 'This document is password-protected. Please enter the password below.'
        });
      }

      const cleanName = uploadedFile.name.replace(/\.pdf$/i, '');
      setOutputFilename(`${cleanName}_compressed`);

    } catch (err) {
      console.warn('Metadata inspection fallback:', err);
      // Still allow file upload even if info endpoint failed
      setFile(uploadedFile);
      setPageCount(1);
      const cleanName = uploadedFile.name.replace(/\.pdf$/i, '');
      setOutputFilename(`${cleanName}_compressed`);
    }
  };

  // Execute Compression
  const handleExecuteCompress = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgressStage(0);
    setProgressPercent(20);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('level', selectedLevel);
      if (password.trim()) {
        formData.append('password', password.trim());
      }

      const cleanName = (outputFilename.trim() || 'compressed_document').replace(/\.pdf$/i, '');
      formData.append('outputFilename', cleanName);

      setTimeout(() => {
        setProgressStage(1);
        setProgressPercent(60);
      }, 400);

      const response = await fetch('/api/tools/compress', {
        method: 'POST',
        body: formData
      });

      setProgressStage(2);
      setProgressPercent(90);

      if (!response.ok) {
        let errMessage = 'Failed to compress document.';
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch {
          errMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errMessage);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const originalSize = Number(response.headers.get('X-Original-Size')) || file.size;
      const finalSize = Number(response.headers.get('X-Final-Size')) || blob.size;
      const savingsPercent = Number(response.headers.get('X-Savings-Percent')) || 
        Math.max(0, Math.round(((originalSize - finalSize) / originalSize) * 100));
      const totalPages = Number(response.headers.get('X-Total-Pages')) || pageCount;

      setProgressPercent(100);

      setTimeout(() => {
        setIsProcessing(false);
        setCompressResult({
          blobUrl,
          filename: `${cleanName}.pdf`,
          originalSize,
          finalSize,
          savingsPercent,
          totalPages,
          level: selectedLevel
        });

        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      }, 350);

    } catch (error) {
      console.error('Compress error:', error);
      setIsProcessing(false);
      onShowToast({
        type: 'error',
        message: error.message || 'An error occurred while compressing the PDF.'
      });
    }
  };

  const handleDownload = () => {
    if (!compressResult) return;
    const a = document.createElement('a');
    a.href = compressResult.blobUrl;
    a.download = compressResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    if (compressResult && compressResult.blobUrl) {
      URL.revokeObjectURL(compressResult.blobUrl);
    }
    setFile(null);
    setPageCount(0);
    setCompressResult(null);
    setOutputFilename('');
    setPassword('');
    setShowPasswordField(false);
    setSelectedLevel('recommended');
  };

  const savedBytes = compressResult ? Math.max(0, compressResult.originalSize - compressResult.finalSize) : 0;

  return (
    <div className="studio-container" id="compress-studio-view">
      {/* Top Header & Breadcrumb */}
      <div className="studio-top-bar">
        <button 
          id="compress-back-btn" 
          className="back-btn" 
          onClick={onBackToDashboard}
          title="Back to all tools"
        >
          <ArrowLeft size={16} />
          <span>All Tools</span>
        </button>

        <div className="studio-title-group">
          <h2 className="studio-heading">Compress PDF</h2>
          <span className="studio-subheading">Reduce document size with intelligent multi-tier optimization</span>
        </div>

        <div style={{ width: 90 }}>{/* spacer */}</div>
      </div>

      {/* RESULT VIEW */}
      {compressResult ? (
        <div className="result-card" id="compress-success-result">
          <div className="success-icon-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', borderColor: 'rgba(6, 182, 212, 0.4)', color: '#06b6d4' }}>
            <Minimize2 size={44} />
          </div>

          <div>
            <h3 className="result-title">PDF Successfully Compressed!</h3>
            <p className="result-subtitle">
              Your document <strong>{compressResult.filename}</strong> has been streamlined and optimized.
            </p>
          </div>

          {/* Before vs After Visual Comparison Card */}
          <div className="compress-comparison-card">
            <div className="compress-stats-row">
              <div className="compress-stat-item">
                <span className="compress-stat-sub">Original Size</span>
                <span className="compress-stat-orig">{formatBytes(compressResult.originalSize)}</span>
              </div>

              <div className="compress-arrow-indicator">
                <ArrowRight size={22} />
              </div>

              <div className="compress-stat-item">
                <span className="compress-stat-sub">Optimized Size</span>
                <span className="compress-stat-final">{formatBytes(compressResult.finalSize)}</span>
              </div>

              <div className="compress-stat-badge-cell">
                <div className="compress-savings-pill">
                  {compressResult.savingsPercent > 0 ? (
                    <>
                      <Zap size={14} />
                      <span>{compressResult.savingsPercent}% Smaller</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Optimally Compact</span>
                    </>
                  )}
                </div>
                {savedBytes > 0 && (
                  <span className="compress-saved-text">
                    Saved {formatBytes(savedBytes)}
                  </span>
                )}
              </div>
            </div>

            {/* Visual ratio bar */}
            <div className="compress-ratio-track" title={`Reduced to ${Math.round((compressResult.finalSize / (compressResult.originalSize || 1)) * 100)}% of original`}>
              <div 
                className="compress-ratio-fill" 
                style={{ 
                  width: `${Math.min(100, Math.max(10, Math.round((compressResult.finalSize / (compressResult.originalSize || 1)) * 100)))}%` 
                }} 
              />
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="result-stats-grid">
            <div className="result-stat-cell">
              <span className="result-stat-label">Total Pages</span>
              <span className="result-stat-val">{compressResult.totalPages}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Preset Applied</span>
              <span className="result-stat-val" style={{ textTransform: 'capitalize', color: '#38bdf8' }}>
                {compressResult.level}
              </span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Space Saved</span>
              <span className="result-stat-val" style={{ color: '#10b981' }}>
                {savedBytes > 0 ? formatBytes(savedBytes) : 'Already Minimized'}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="result-actions-group">
            <button 
              id="download-compressed-pdf-btn" 
              className="download-btn"
              style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 50%, #2563eb 100%)', boxShadow: '0 4px 25px rgba(6, 182, 212, 0.45)' }}
              onClick={handleDownload}
            >
              <Download size={20} />
              <span>Download Compressed PDF</span>
            </button>

            <button 
              id="preview-compressed-pdf-btn"
              type="button"
              className="action-btn-sm"
              style={{ padding: '0.85rem 1.5rem', borderRadius: 14, fontSize: '0.95rem' }}
              onClick={() => setShowPreviewModal(true)}
            >
              <Eye size={17} />
              <span>Preview Result</span>
            </button>

            <button 
              id="compress-another-btn" 
              className="reset-btn" 
              onClick={handleReset}
            >
              <RefreshCw size={16} />
              <span>Compress Another PDF</span>
            </button>
          </div>
        </div>
      ) : !file ? (
        /* STAGE 1: DROPZONE */
        <div 
          id="compress-dropzone"
          className={`dropzone-card ${isDraggingOver ? 'dragging-over' : ''}`}
          style={{ borderColor: isDraggingOver ? '#06b6d4' : 'rgba(6, 182, 212, 0.3)' }}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDraggingOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFileLoaded(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            id="compress-hidden-file-input"
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileLoaded(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />

          <div className="dropzone-content">
            <div className="dropzone-icon-circle" style={{ background: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.35)', color: '#06b6d4' }}>
              <Minimize2 size={38} />
            </div>

            <div>
              <div className="dropzone-primary-text">Drag & drop your PDF file to compress</div>
              <div className="dropzone-secondary-text">or click to browse from your device</div>
            </div>

            <button 
              id="compress-select-file-btn"
              type="button" 
              className="browse-files-btn"
              style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)' }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Minimize2 size={18} />
              <span>Select PDF File</span>
            </button>

            <div className="dropzone-meta">
              <span className="meta-chip">Multi-tier compression</span>
              <span className="meta-chip">Lossless stream packing</span>
              <span className="meta-chip">Zero file retention</span>
              <span className="meta-chip">Max 100 MB</span>
            </div>
          </div>
        </div>
      ) : (
        /* STAGE 2: CONFIGURATION WORKSPACE */
        <div className="staging-area" id="compress-staging-workspace">
          {/* File Overview Card */}
          <div className="staging-header-card">
            <div className="staging-stats">
              <div className="stat-item">
                <span className="stat-label">Document Name</span>
                <span className="stat-value" style={{ fontSize: '1rem', color: '#fff', maxWidth: 280, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Pages</span>
                <span className="stat-value">{pageCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Original Size</span>
                <span className="stat-value" style={{ color: '#38bdf8' }}>{formatBytes(file.size)}</span>
              </div>
            </div>

            <div className="staging-toolbar">
              <button 
                id="change-compress-file-btn"
                className="action-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Choose a different PDF"
              >
                <RefreshCw size={15} />
                <span>Change File</span>
              </button>

              <button 
                id="clear-compress-file-btn"
                className="action-btn-sm danger"
                onClick={() => setFile(null)}
                title="Remove this file"
              >
                <Trash2 size={15} />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Compression Configuration Card */}
          <div className="compress-config-card">
            <div className="compress-section-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                Select Compression Level
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                Choose the optimal reduction strategy for your document needs.
              </p>
            </div>

            {/* Level Selector Cards Grid */}
            <div className="compress-levels-grid" role="radiogroup" aria-label="Compression levels">
              {COMPRESSION_LEVELS.map((lvl) => {
                const IconComponent = lvl.icon;
                const isSelected = selectedLevel === lvl.id;

                return (
                  <div
                    key={lvl.id}
                    id={`compress-level-${lvl.id}`}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    className={`compress-level-card ${isSelected ? 'selected' : ''} ${lvl.popular ? 'is-popular' : ''}`}
                    onClick={() => setSelectedLevel(lvl.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setSelectedLevel(lvl.id);
                      }
                    }}
                    style={isSelected ? {
                      borderColor: lvl.color,
                      boxShadow: `0 0 25px ${lvl.color}35`,
                      background: 'rgba(16, 23, 42, 0.88)'
                    } : {}}
                  >
                    {lvl.popular && (
                      <span className="popular-badge">
                        <Sparkles size={11} /> Recommended
                      </span>
                    )}

                    <div className="level-card-header">
                      <div 
                        className="level-icon-wrapper" 
                        style={{ 
                          background: lvl.bg, 
                          color: lvl.color, 
                          border: `1px solid ${lvl.border}` 
                        }}
                      >
                        <IconComponent size={22} />
                      </div>

                      <div className="level-radio-indicator">
                        <div className={`radio-outer ${isSelected ? 'checked' : ''}`} style={isSelected ? { borderColor: lvl.color } : {}}>
                          {isSelected && <div className="radio-inner" style={{ background: lvl.color }} />}
                        </div>
                      </div>
                    </div>

                    <div className="level-info">
                      <div className="level-title-row">
                        <h4 className="level-title">{lvl.title}</h4>
                        <span className="level-dpi-tag">{lvl.dpi}</span>
                      </div>
                      <p className="level-description">{lvl.description}</p>
                    </div>

                    <div className="level-footer">
                      <div className="level-reduction-pill" style={{ color: lvl.color, borderColor: `${lvl.color}40`, background: `${lvl.color}15` }}>
                        <Zap size={13} />
                        <span>{lvl.reduction}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Output Filename */}
            <div className="compress-options-row">
              <div className="compress-form-group" style={{ flex: 1 }}>
                <label htmlFor="compress-output-filename-input" className="input-label">
                  Output File Name:
                </label>
                <div className="input-with-addon">
                  <input
                    id="compress-output-filename-input"
                    type="text"
                    className="text-input"
                    value={outputFilename}
                    onChange={(e) => setOutputFilename(e.target.value)}
                    placeholder="compressed_document"
                  />
                  <span className="input-addon">.pdf</span>
                </div>
              </div>

              {/* Toggle Password input if needed */}
              {showPasswordField ? (
                <div className="compress-form-group" style={{ flex: 1 }}>
                  <label htmlFor="compress-password-input" className="input-label">
                    Document Password (if encrypted):
                  </label>
                  <div className="password-input-container">
                    <span className="password-icon-left">
                      <Lock size={16} />
                    </span>
                    <input
                      id="compress-password-input"
                      type="password"
                      className="password-text-input"
                      placeholder="Enter password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.25rem' }}>
                  <button
                    type="button"
                    className="action-btn-sm"
                    onClick={() => setShowPasswordField(true)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    <Lock size={14} />
                    <span>File is password protected?</span>
                  </button>
                </div>
              )}
            </div>

            {/* Privacy & Guarantee note */}
            <div className="compress-guarantee-box">
              <ShieldCheck size={20} style={{ color: '#06b6d4', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Zero File Retention & Smart Packing:</strong> Your document is processed in isolated volatile memory. Object streams are packed and images downsampled according to your chosen DPI profile.
              </div>
            </div>

            {/* Submit Action CTA */}
            <button
              id="execute-compress-cta-btn"
              className="compress-action-cta-btn"
              disabled={isProcessing}
              onClick={handleExecuteCompress}
            >
              <span>Compress PDF Now</span>
              <Minimize2 size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING MODAL */}
      {isProcessing && (
        <div className="modal-backdrop" id="compress-processing-modal">
          <div className="processing-card">
            <div className="spinner-ring" style={{ borderTopColor: '#06b6d4', borderRightColor: '#0891b2' }}></div>

            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                Compressing PDF Document...
              </h4>
              <div className="progress-status-text">
                {progressStage === 0 && 'Analyzing document streams and image assets...'}
                {progressStage === 1 && `Re-encoding objects with ${selectedLevel} profile...`}
                {progressStage === 2 && 'Packing optimized stream dictionaries...'}
              </div>
            </div>

            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 50%, #2563eb 100%)' 
                }}
              ></div>
            </div>

            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Processed in secure volatile RAM • Zero permanent storage
            </span>
          </div>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {showPreviewModal && compressResult && (
        <div 
          className="modal-backdrop" 
          id="compress-preview-modal-backdrop"
          onClick={() => setShowPreviewModal(false)}
        >
          <div 
            className="pdf-preview-modal-card" 
            id="compress-preview-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pdf-preview-modal-header">
              <div className="pdf-preview-header-left">
                <FileCheck size={20} style={{ color: '#06b6d4' }} />
                <div>
                  <h4 className="pdf-preview-modal-title">{compressResult.filename}</h4>
                  <div className="pdf-preview-modal-subtitle">
                    <span>{formatBytes(compressResult.finalSize)}</span>
                    <span>•</span>
                    <span style={{ color: '#10b981' }}>{compressResult.savingsPercent}% Reduced</span>
                    <span>•</span>
                    <span>{compressResult.totalPages} Pages</span>
                  </div>
                </div>
              </div>

              <div className="pdf-preview-header-actions">
                <button 
                  className="download-btn"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #06b6d4, #0284c7)' }}
                  onClick={handleDownload}
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
                <button 
                  className="back-btn" 
                  style={{ padding: '0.45rem 0.85rem' }}
                  onClick={() => setShowPreviewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="pdf-preview-modal-body">
              <iframe 
                src={compressResult.blobUrl} 
                title="Compressed PDF Preview"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
