import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, ArrowLeft, Trash2, Check, Download, 
  RefreshCw, Lock, ShieldCheck, Eye, EyeOff, KeyRound, 
  FileCheck, ShieldAlert, Sparkles 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function ProtectStudio({ onBackToDashboard, onShowToast }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [outputFilename, setOutputFilename] = useState('');

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [protectResult, setProtectResult] = useState(null);

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

  // Calculate password strength
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: '#f43f5e' };
    if (score <= 3) return { score: 2, label: 'Good', color: '#f59e0b' };
    return { score: 3, label: 'Strong', color: '#10b981' };
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Handle file selection
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
        throw new Error('Failed to read PDF document');
      }

      const json = await res.json();
      if (json.data?.isEncrypted) {
        onShowToast({
          type: 'error',
          message: 'This document is already password protected.'
        });
        return;
      }

      setFile(uploadedFile);
      setPageCount(json.data?.pageCount || 1);

      const cleanName = uploadedFile.name.replace(/\.pdf$/i, '');
      setOutputFilename(`${cleanName}_protected`);

    } catch (err) {
      console.error(err);
      onShowToast({
        type: 'error',
        message: 'Could not read document. It may already be encrypted or corrupted.'
      });
    }
  };

  // Execute Protection
  const handleExecuteProtect = async () => {
    if (!file) return;

    if (!password.trim()) {
      onShowToast({
        type: 'error',
        message: 'Please enter a password to protect your document.'
      });
      return;
    }

    if (password !== confirmPassword) {
      onShowToast({
        type: 'error',
        message: 'Passwords do not match. Please verify your confirmation password.'
      });
      return;
    }

    setIsProcessing(true);
    setProgressStage(0);
    setProgressPercent(25);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);

      const cleanName = (outputFilename.trim() || 'protected_document').replace(/\.pdf$/i, '');
      formData.append('outputFilename', cleanName);

      setTimeout(() => {
        setProgressStage(1);
        setProgressPercent(65);
      }, 350);

      const response = await fetch('/api/tools/protect', {
        method: 'POST',
        body: formData
      });

      setProgressStage(2);
      setProgressPercent(90);

      if (!response.ok) {
        let errMessage = 'Failed to protect document.';
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
      const finalPages = response.headers.get('X-Total-Pages') || pageCount;
      const finalSize = blob.size;

      setProgressPercent(100);

      setTimeout(() => {
        setIsProcessing(false);
        setProtectResult({
          blobUrl,
          filename: `${cleanName}.pdf`,
          size: finalSize,
          totalPages: finalPages
        });

        confetti({
          particleCount: 85,
          spread: 75,
          origin: { y: 0.6 }
        });
      }, 400);

    } catch (error) {
      console.error('Protect error:', error);
      setIsProcessing(false);
      onShowToast({
        type: 'error',
        message: error.message || 'An error occurred while encrypting the PDF.'
      });
    }
  };

  const handleDownload = () => {
    if (!protectResult) return;
    const a = document.createElement('a');
    a.href = protectResult.blobUrl;
    a.download = protectResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    if (protectResult && protectResult.blobUrl) {
      URL.revokeObjectURL(protectResult.blobUrl);
    }
    setFile(null);
    setPageCount(0);
    setPassword('');
    setConfirmPassword('');
    setProtectResult(null);
    setOutputFilename('');
  };

  return (
    <div className="studio-container" id="protect-studio-view">
      {/* Top Header & Breadcrumb */}
      <div className="studio-top-bar">
        <button 
          id="protect-back-btn" 
          className="back-btn" 
          onClick={onBackToDashboard}
          title="Back to all tools"
        >
          <ArrowLeft size={16} />
          <span>All Tools</span>
        </button>

        <div className="studio-title-group">
          <h2 className="studio-heading">Protect & Encrypt PDF</h2>
          <span className="studio-subheading">Lock your PDF with secure password encryption</span>
        </div>

        <div style={{ width: 90 }}>{/* spacer */}</div>
      </div>

      {/* RESULT VIEW */}
      {protectResult ? (
        <div className="result-card" id="protect-success-result">
          <div className="success-icon-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' }}>
            <ShieldCheck size={44} />
          </div>

          <div>
            <h3 className="result-title">PDF Encrypted & Protected!</h3>
            <p className="result-subtitle">
              Your document <strong>{protectResult.filename}</strong> has been secured with standard 128-bit encryption.
            </p>
          </div>

          <div className="result-stats-grid">
            <div className="result-stat-cell">
              <span className="result-stat-label">Total Pages</span>
              <span className="result-stat-val">{protectResult.totalPages}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Security Level</span>
              <span className="result-stat-val" style={{ color: '#10b981' }}>128-Bit AES</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">File Size</span>
              <span className="result-stat-val">{formatBytes(protectResult.size)}</span>
            </div>
          </div>

          <div className="security-notice-box" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'left' }}>
            <KeyRound size={20} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Password Applied:</strong> Anyone attempting to open, print, or extract pages from this file will now be required to enter the password you set.
            </div>
          </div>

          <div className="result-actions-group">
            <button 
              id="download-protected-pdf-btn" 
              className="download-btn" 
              onClick={handleDownload}
            >
              <Download size={20} />
              <span>Download Protected PDF</span>
            </button>

            <button 
              id="protect-another-btn" 
              className="reset-btn" 
              onClick={handleReset}
            >
              <RefreshCw size={16} />
              <span>Protect Another Document</span>
            </button>
          </div>
        </div>
      ) : !file ? (
        /* STAGE 1: DROPZONE */
        <div 
          id="protect-dropzone"
          className={`dropzone-card ${isDraggingOver ? 'dragging-over' : ''}`}
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
            id="protect-hidden-file-input"
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
            <div className="dropzone-icon-circle" style={{ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}>
              <Lock size={38} />
            </div>

            <div>
              <div className="dropzone-primary-text">Drag & drop your PDF file to protect</div>
              <div className="dropzone-secondary-text">or click to browse from your device</div>
            </div>

            <button 
              id="protect-select-file-btn"
              type="button" 
              className="browse-files-btn"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Lock size={18} />
              <span>Select PDF File</span>
            </button>

            <div className="dropzone-meta">
              <span className="meta-chip">PDF format</span>
              <span className="meta-chip">128-bit encryption</span>
              <span className="meta-chip">Zero file retention</span>
            </div>
          </div>
        </div>
      ) : (
        /* STAGE 2: CONFIGURATION WORKSPACE */
        <div className="staging-area" id="protect-staging-workspace">
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
                <span className="stat-label">File Size</span>
                <span className="stat-value">{formatBytes(file.size)}</span>
              </div>
            </div>

            <div className="staging-toolbar">
              <button 
                id="change-protect-file-btn"
                className="action-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Choose a different PDF"
              >
                <RefreshCw size={15} />
                <span>Change File</span>
              </button>

              <button 
                id="clear-protect-file-btn"
                className="action-btn-sm danger"
                onClick={() => setFile(null)}
                title="Remove this file"
              >
                <Trash2 size={15} />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Password Security Form Card */}
          <div className="protect-form-card">
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>
                Set Document Password
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                Choose a strong password to restrict access to this document.
              </p>
            </div>

            {/* Password Field */}
            <div className="protect-form-group">
              <label htmlFor="protect-password-input" className="input-label">
                Password:
              </label>
              <div className="password-input-container">
                <span className="password-icon-left">
                  <Lock size={16} />
                </span>
                <input
                  id="protect-password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="password-text-input"
                  placeholder="Enter a secure password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Strength Indicator */}
              {password.length > 0 && (
                <div className="strength-meter-box">
                  <div className="strength-meter-bar">
                    <div 
                      className="strength-segment" 
                      style={{ background: strength.score >= 1 ? strength.color : 'rgba(255,255,255,0.08)' }} 
                    />
                    <div 
                      className="strength-segment" 
                      style={{ background: strength.score >= 2 ? strength.color : 'rgba(255,255,255,0.08)' }} 
                    />
                    <div 
                      className="strength-segment" 
                      style={{ background: strength.score >= 3 ? strength.color : 'rgba(255,255,255,0.08)' }} 
                    />
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>
                    Strength: {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="protect-form-group">
              <label htmlFor="protect-confirm-password-input" className="input-label">
                Confirm Password:
              </label>
              <div className="password-input-container">
                <span className="password-icon-left">
                  <KeyRound size={16} />
                </span>
                <input
                  id="protect-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="password-text-input"
                  placeholder="Re-enter password to confirm..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', marginTop: 2 }}>
                  {passwordsMatch ? (
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={14} /> Passwords match perfectly
                    </span>
                  ) : (
                    <span style={{ color: '#f43f5e' }}>
                      Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Custom Output Filename */}
            <div className="protect-form-group">
              <label htmlFor="protect-output-filename-input" className="input-label">
                Output File Name:
              </label>
              <div className="input-with-addon">
                <input
                  id="protect-output-filename-input"
                  type="text"
                  className="text-input"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="protected_document"
                />
                <span className="input-addon">.pdf</span>
              </div>
            </div>

            {/* Security Guarantee Banner */}
            <div className="security-notice-box">
              <ShieldCheck size={22} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Guaranteed Security & Compatibility:</strong> Uses industry-standard 128-bit PDF encryption. Compatible with Adobe Acrobat, Google Chrome, Firefox, Apple Preview, and mobile PDF readers.
              </div>
            </div>

            {/* Submit CTA */}
            <button
              id="execute-protect-cta-btn"
              className="protect-action-cta-btn"
              disabled={isProcessing || !password.trim() || !passwordsMatch}
              onClick={handleExecuteProtect}
            >
              <span>Encrypt & Protect Document</span>
              <ShieldCheck size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING MODAL */}
      {isProcessing && (
        <div className="modal-backdrop" id="protect-processing-modal">
          <div className="processing-card">
            <div className="spinner-ring" style={{ borderTopColor: '#10b981', borderRightColor: '#059669' }}></div>

            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                Encrypting PDF Document...
              </h4>
              <div className="progress-status-text">
                {progressStage === 0 && 'Validating document structures and headers...'}
                {progressStage === 1 && 'Applying standard 128-bit cryptographic key...'}
                {progressStage === 2 && 'Generating password-locked PDF document...'}
              </div>
            </div>

            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' 
                }}
              ></div>
            </div>

            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Processed in secure volatile RAM • Zero permanent storage
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
