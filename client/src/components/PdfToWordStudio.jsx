import React, { useState, useRef } from 'react';
import {
  Upload, FileText, ArrowLeft, Check, Download,
  RefreshCw, FileCheck, Sparkles, ShieldCheck, Zap, AlertTriangle, X
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE = '/api/tools';

export function PdfToWordStudio({ onBackToDashboard, onShowToast }) {
  const [file, setFile] = useState(null);
  const [outputFilename, setOutputFilename] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState(0); // 0=idle, 1=extracting, 2=building, 3=done
  const [progressPercent, setProgressPercent] = useState(0);
  const [convertResult, setConvertResult] = useState(null); // { blobUrl, filename, size, totalPages }

  const fileInputRef = useRef(null);

  const formatBytes = (bytes, decimals = 1) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const processFile = (incoming) => {
    if (!incoming) return;
    if (!incoming.name.toLowerCase().endsWith('.pdf') && incoming.type !== 'application/pdf') {
      onShowToast({ type: 'error', message: 'Only PDF files are supported.' });
      return;
    }
    if (incoming.size > 100 * 1024 * 1024) {
      onShowToast({ type: 'error', message: 'File exceeds the 100 MB limit.' });
      return;
    }
    setFile({ rawFile: incoming, name: incoming.name, size: incoming.size });
    setOutputFilename(incoming.name.replace(/\.pdf$/i, ''));
    setConvertResult(null);
  };

  const handleFileInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDraggingOver(true); };
  const handleDragLeave = () => setIsDraggingOver(false);

  const handleRemoveFile = () => {
    setFile(null);
    setConvertResult(null);
    setOutputFilename('');
  };

  const simulateProgress = (percentSetter, startPct, endPct, duration) => {
    return new Promise((resolve) => {
      const steps = 30;
      const increment = (endPct - startPct) / steps;
      const interval = duration / steps;
      let current = startPct;
      const timer = setInterval(() => {
        current = Math.min(current + increment, endPct);
        percentSetter(Math.round(current));
        if (current >= endPct) {
          clearInterval(timer);
          resolve();
        }
      }, interval);
    });
  };

  const handleConvert = async () => {
    if (!file) {
      onShowToast({ type: 'error', message: 'Please upload a PDF file first.' });
      return;
    }

    setIsProcessing(true);
    setProgressStage(1);
    setProgressPercent(0);

    try {
      // Stage 1: Extracting text
      await simulateProgress(setProgressPercent, 0, 45, 800);
      setProgressStage(2);
      // Stage 2: Building Word document
      await simulateProgress(setProgressPercent, 45, 80, 600);

      const formData = new FormData();
      formData.append('file', file.rawFile);
      formData.append('outputFilename', outputFilename.trim() || 'converted_document');

      const response = await fetch(`${API_BASE}/pdf-to-word`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      await simulateProgress(setProgressPercent, 80, 100, 300);
      setProgressPercent(100);
      setProgressStage(3);

      const totalPages = parseInt(response.headers.get('X-Total-Pages') || '1', 10);
      const finalSize = parseInt(response.headers.get('X-Final-Size') || '0', 10);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const rawFilename = (outputFilename.trim() || 'converted_document').replace(/\.docx$/i, '');
      const finalFilename = `${rawFilename}.docx`;

      setConvertResult({ blobUrl, filename: finalFilename, size: finalSize || blob.size, totalPages });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#60a5fa', '#93c5fd', '#1d4ed8', '#dbeafe']
      });

      onShowToast({
        type: 'success',
        message: `Converted! ${totalPages} page(s) exported as Word document.`
      });
    } catch (err) {
      onShowToast({ type: 'error', message: err.message || 'Conversion failed. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!convertResult?.blobUrl) return;
    const a = document.createElement('a');
    a.href = convertResult.blobUrl;
    a.download = convertResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast({ type: 'success', message: `"${convertResult.filename}" downloaded!` });
  };

  const handleStartOver = () => {
    if (convertResult?.blobUrl) URL.revokeObjectURL(convertResult.blobUrl);
    setFile(null);
    setConvertResult(null);
    setOutputFilename('');
    setProgressStage(0);
    setProgressPercent(0);
  };

  // ---- Stage labels ----
  const stageLabel = {
    1: 'Extracting text from PDF\u2026',
    2: 'Building Word document\u2026',
    3: 'Finalizing\u2026'
  };

  return (
    <div className="studio-container" id="pdf-to-word-studio-view">

      {/* Top Bar */}
      <div className="studio-top-bar">
        <button
          id="ptw-back-btn"
          className="back-btn"
          onClick={onBackToDashboard}
          title="Back to all tools"
        >
          <ArrowLeft size={16} />
          <span>All Tools</span>
        </button>

        <div className="studio-title-group">
          <h2 className="studio-heading">PDF to Word Converter</h2>
          <span className="studio-subheading">Convert your PDF into an editable Microsoft Word (.docx) document</span>
        </div>

        <div style={{ width: 90 }} />
      </div>

      {/* ---- RESULT VIEW ---- */}
      {convertResult ? (
        <div className="result-card" id="ptw-success-result" style={{ borderColor: 'rgba(37, 99, 235, 0.4)', boxShadow: '0 0 40px -5px rgba(37,99,235,0.25)' }}>
          <div className="success-icon-badge" style={{ background: 'rgba(37,99,235,0.15)', borderColor: 'rgba(37,99,235,0.4)', color: '#2563eb', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}>
            <FileCheck size={42} />
          </div>

          <div>
            <h3 className="result-title">Conversion Complete!</h3>
            <p className="result-subtitle">
              Your Word document <strong>{convertResult.filename}</strong> is ready.
            </p>
          </div>

          <div className="result-stats-grid">
            <div className="result-stat-cell">
              <span className="result-stat-label">Pages</span>
              <span className="result-stat-val">{convertResult.totalPages}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Output Size</span>
              <span className="result-stat-val">{formatBytes(convertResult.size)}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Format</span>
              <span className="result-stat-val">.docx</span>
            </div>
          </div>

          {/* Notice callout */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '12px',
            padding: '0.9rem 1.1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            maxWidth: '520px',
            textAlign: 'left'
          }}>
            <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
              Conversion quality depends on the PDF's embedded text layer. Scanned or image-only PDFs
              may produce limited output. Open the result in Microsoft Word or Google Docs for editing.
            </p>
          </div>

          <div className="result-actions-group">
            <button
              id="ptw-download-btn"
              className="download-btn"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}
              onClick={handleDownload}
            >
              <Download size={20} />
              <span>Download Word Document</span>
            </button>

            <button
              id="ptw-convert-another-btn"
              className="reset-btn"
              onClick={handleStartOver}
            >
              <RefreshCw size={16} />
              <span>Convert Another PDF</span>
            </button>
          </div>
        </div>

      ) : (
        <>
          {/* ---- UPLOAD / DROPZONE ---- */}
          {!file ? (
            <div
              id="ptw-dropzone"
              className={`dropzone-card ${isDraggingOver ? 'dragging-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Drop a PDF file here or click to browse"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              <input
                ref={fileInputRef}
                id="ptw-file-input"
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
              <div className="dropzone-content">
                <div className="dropzone-icon-circle" style={{ background: 'rgba(37,99,235,0.12)', borderColor: 'rgba(37,99,235,0.3)', color: '#2563eb', boxShadow: '0 8px 24px rgba(37,99,235,0.25)' }}>
                  <FileText size={36} />
                </div>
                <p className="dropzone-primary-text">
                  {isDraggingOver ? 'Release to upload' : 'Drop your PDF file here'}
                </p>
                <p className="dropzone-secondary-text">or click to browse from your computer</p>
                <div className="dropzone-meta">
                  <span className="meta-chip">PDF Only</span>
                  <span className="meta-chip">Max 100 MB</span>
                  <span className="meta-chip">Outputs .docx</span>
                </div>
              </div>
            </div>
          ) : (
            /* ---- STAGING AREA ---- */
            <div className="staging-area" id="ptw-staging-area">

              {/* Selected File Card */}
              <div className="staging-header-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                  <div className="file-icon-box" style={{ background: 'rgba(37,99,235,0.12)', borderColor: 'rgba(37,99,235,0.25)', color: '#2563eb' }}>
                    <FileText size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="file-name-text">{file.name}</p>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {formatBytes(file.size)} · PDF Document
                    </p>
                  </div>
                </div>
                <div className="staging-toolbar">
                  <button
                    className="action-btn-sm danger"
                    id="ptw-remove-file-btn"
                    onClick={handleRemoveFile}
                    title="Remove file"
                  >
                    <X size={14} />
                    Remove
                  </button>
                </div>
              </div>

              {/* Output Options Bar */}
              <div className="staging-options-bar">
                <div className="output-name-group">
                  <label className="input-label" htmlFor="ptw-filename-input">
                    <FileCheck size={14} />
                    Output Filename
                  </label>
                  <div className="input-with-addon">
                    <input
                      id="ptw-filename-input"
                      type="text"
                      className="text-input"
                      value={outputFilename}
                      onChange={(e) => setOutputFilename(e.target.value)}
                      placeholder="converted_document"
                      aria-label="Output filename without extension"
                    />
                    <span className="input-addon">.docx</span>
                  </div>
                </div>

                {/* Feature callouts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Zap size={13} style={{ color: '#22d3ee' }} />
                    Text extracted from PDF text layer
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Sparkles size={13} style={{ color: '#a78bfa' }} />
                    Smart heading detection &amp; structure
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ShieldCheck size={13} style={{ color: '#34d399' }} />
                    File never stored on server
                  </div>
                </div>

                {/* Convert button */}
                {!isProcessing && (
                  <button
                    id="ptw-convert-btn"
                    className="merge-action-cta-btn"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 25px rgba(37,99,235,0.45)' }}
                    onClick={handleConvert}
                    disabled={isProcessing}
                  >
                    <FileText size={20} />
                    <span>Convert to Word</span>
                  </button>
                )}
              </div>

              {/* Processing Progress */}
              {isProcessing && (
                <div className="processing-card" id="ptw-processing-card" style={{ border: '1px solid rgba(37,99,235,0.4)', maxWidth: '100%', boxShadow: '0 0 35px -5px rgba(37,99,235,0.3)' }}>
                  <div className="spinner-ring" style={{ borderColor: 'rgba(37,99,235,0.2)', borderTopColor: '#2563eb', borderRightColor: '#60a5fa' }} />

                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                      {stageLabel[progressStage] || 'Processing\u2026'}
                    </p>
                    <p className="progress-status-text">
                      Please wait while your document is being converted
                    </p>
                  </div>

                  <div style={{ width: '100%' }}>
                    <div className="progress-track" id="ptw-progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${progressPercent}%`,
                          background: 'linear-gradient(90deg, #2563eb, #60a5fa)'
                        }}
                      />
                    </div>
                    <p style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
                      {progressPercent}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PdfToWordStudio;
