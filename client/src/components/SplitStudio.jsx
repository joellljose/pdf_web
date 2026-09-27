import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, ArrowLeft, Trash2, Check, Download, 
  ExternalLink, RefreshCw, Scissors, Archive, CheckSquare, 
  Square, Sparkles, Layers, ShieldCheck, FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function SplitStudio({ onBackToDashboard, onShowToast }) {
  const [file, setFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [mode, setMode] = useState('extract'); // 'extract' (selected pages into 1 PDF) | 'split' (all pages into ZIP)
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [outputFilename, setOutputFilename] = useState('');
  
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [splitResult, setSplitResult] = useState(null);

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

  // Convert Set of page numbers to range string: e.g. [1, 2, 3, 5] -> "1-3, 5"
  const formatSetToRange = (pagesSet) => {
    const sorted = Array.from(pagesSet).sort((a, b) => a - b);
    if (sorted.length === 0) return '';
    
    const ranges = [];
    let start = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === prev + 1) {
        prev = sorted[i];
      } else {
        ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
        start = sorted[i];
        prev = sorted[i];
      }
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    return ranges.join(', ');
  };

  // Parse range string into Set of page numbers
  const parseRangeToSet = (str, max) => {
    const pages = new Set();
    if (!str || !max) return pages;

    const parts = str.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.includes('-')) {
        const [s, e] = trimmed.split('-').map((n) => parseInt(n.trim(), 10));
        if (!isNaN(s) && !isNaN(e)) {
          const from = Math.max(1, Math.min(s, e));
          const to = Math.min(max, Math.max(s, e));
          for (let i = from; i <= to; i++) {
            pages.add(i);
          }
        }
      } else {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= max) {
          pages.add(num);
        }
      }
    }
    return pages;
  };

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
      // Query page count from server
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const res = await fetch('/api/tools/info', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Failed to inspect PDF pages');
      }

      const json = await res.json();
      const count = json.data?.pageCount || 1;

      setFile(uploadedFile);
      setTotalPages(count);

      // Default: select all pages
      const allPages = new Set();
      for (let i = 1; i <= count; i++) allPages.add(i);
      setSelectedPages(allPages);
      setRangeInput(count > 1 ? `1-${count}` : '1');

      const cleanName = uploadedFile.name.replace(/\.pdf$/i, '');
      setOutputFilename(`${cleanName}_split`);

    } catch (err) {
      console.error(err);
      onShowToast({
        type: 'error',
        message: 'Could not read document. It may be password-protected or corrupted.'
      });
    }
  };

  // Quick selection presets
  const handleSelectAll = () => {
    const all = new Set();
    for (let i = 1; i <= totalPages; i++) all.add(i);
    setSelectedPages(all);
    setRangeInput(formatSetToRange(all));
  };

  const handleClearAll = () => {
    setSelectedPages(new Set());
    setRangeInput('');
  };

  const handleSelectOdd = () => {
    const odd = new Set();
    for (let i = 1; i <= totalPages; i += 2) odd.add(i);
    setSelectedPages(odd);
    setRangeInput(formatSetToRange(odd));
  };

  const handleSelectEven = () => {
    const even = new Set();
    for (let i = 2; i <= totalPages; i += 2) even.add(i);
    setSelectedPages(even);
    setRangeInput(formatSetToRange(even));
  };

  // Toggle individual page tile
  const togglePage = (pageNumber) => {
    const next = new Set(selectedPages);
    if (next.has(pageNumber)) {
      next.delete(pageNumber);
    } else {
      next.add(pageNumber);
    }
    setSelectedPages(next);
    setRangeInput(formatSetToRange(next));
  };

  // Handle typing in range text field
  const handleRangeInputChange = (e) => {
    const val = e.target.value;
    setRangeInput(val);
    const parsed = parseRangeToSet(val, totalPages);
    setSelectedPages(parsed);
  };

  // Execute Split API
  const handleExecuteSplit = async () => {
    if (!file) return;

    if (mode === 'extract' && selectedPages.size === 0) {
      onShowToast({
        type: 'error',
        message: 'Please select at least 1 page to extract.'
      });
      return;
    }

    setIsProcessing(true);
    setProgressStage(0);
    setProgressPercent(20);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);

      const ranges = mode === 'extract' ? formatSetToRange(selectedPages) : `1-${totalPages}`;
      formData.append('ranges', ranges);

      const cleanName = (outputFilename.trim() || 'split_document').replace(/\.pdf$/i, '').replace(/\.zip$/i, '');
      formData.append('outputFilename', cleanName);

      setTimeout(() => {
        setProgressStage(1);
        setProgressPercent(60);
      }, 350);

      const response = await fetch('/api/tools/split', {
        method: 'POST',
        body: formData
      });

      setProgressStage(2);
      setProgressPercent(90);

      if (!response.ok) {
        let errMessage = 'Failed to split document.';
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch {
          errMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errMessage);
      }

      const contentType = response.headers.get('Content-Type') || '';
      const isZip = contentType.includes('zip') || mode === 'split';
      const extension = isZip ? '.zip' : '.pdf';

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const fileCount = response.headers.get('X-Output-Files-Count') || (mode === 'split' ? totalPages : 1);
      const finalSize = blob.size;

      setProgressPercent(100);

      setTimeout(() => {
        setIsProcessing(false);
        setSplitResult({
          blobUrl,
          filename: `${cleanName}${extension}`,
          size: finalSize,
          fileCount: Number(fileCount),
          isZip
        });

        confetti({
          particleCount: 85,
          spread: 75,
          origin: { y: 0.6 }
        });
      }, 400);

    } catch (error) {
      console.error('Split error:', error);
      setIsProcessing(false);
      onShowToast({
        type: 'error',
        message: error.message || 'An error occurred while splitting the PDF.'
      });
    }
  };

  const handleDownload = () => {
    if (!splitResult) return;
    const a = document.createElement('a');
    a.href = splitResult.blobUrl;
    a.download = splitResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreview = () => {
    if (!splitResult || splitResult.isZip) return;
    window.open(splitResult.blobUrl, '_blank', 'noopener,noreferrer');
  };

  const handleReset = () => {
    if (splitResult && splitResult.blobUrl) {
      URL.revokeObjectURL(splitResult.blobUrl);
    }
    setFile(null);
    setTotalPages(0);
    setSelectedPages(new Set());
    setRangeInput('');
    setSplitResult(null);
    setOutputFilename('');
  };

  return (
    <div className="studio-container" id="split-studio-view">
      {/* Top Header & Breadcrumb */}
      <div className="studio-top-bar">
        <button 
          id="split-back-btn" 
          className="back-btn" 
          onClick={onBackToDashboard}
          title="Back to all tools"
        >
          <ArrowLeft size={16} />
          <span>All Tools</span>
        </button>

        <div className="studio-title-group">
          <h2 className="studio-heading">Split & Extract PDF Pages</h2>
          <span className="studio-subheading">Select specific pages to extract or split into separate files</span>
        </div>

        <div style={{ width: 90 }}>{/* spacer */}</div>
      </div>

      {/* RESULT VIEW (When split is complete) */}
      {splitResult ? (
        <div className="result-card" id="split-success-result">
          <div className="success-icon-badge" style={{ background: 'rgba(236, 72, 153, 0.15)', borderColor: 'rgba(236, 72, 153, 0.4)', color: '#ec4899' }}>
            <FileCheck size={42} />
          </div>

          <div>
            <h3 className="result-title">PDF Split Successfully!</h3>
            <p className="result-subtitle">
              Your generated file <strong>{splitResult.filename}</strong> is ready for download.
            </p>
          </div>

          <div className="result-stats-grid">
            <div className="result-stat-cell">
              <span className="result-stat-label">{splitResult.isZip ? 'Total Files' : 'Pages Extracted'}</span>
              <span className="result-stat-val">
                {splitResult.isZip ? splitResult.fileCount : selectedPages.size}
              </span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">File Type</span>
              <span className="result-stat-val">{splitResult.isZip ? 'ZIP Archive' : 'PDF Document'}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Output Size</span>
              <span className="result-stat-val">{formatBytes(splitResult.size)}</span>
            </div>
          </div>

          <div className="result-actions-group">
            <button 
              id="download-split-pdf-btn" 
              className="download-btn" 
              onClick={handleDownload}
            >
              <Download size={20} />
              <span>Download {splitResult.isZip ? 'ZIP Archive' : 'PDF'}</span>
            </button>

            {!splitResult.isZip && (
              <button 
                id="preview-split-pdf-btn" 
                className="preview-btn" 
                onClick={handlePreview}
              >
                <ExternalLink size={18} />
                <span>Preview in Browser</span>
              </button>
            )}

            <button 
              id="split-another-btn" 
              className="reset-btn" 
              onClick={handleReset}
            >
              <RefreshCw size={16} />
              <span>Split Another Document</span>
            </button>
          </div>
        </div>
      ) : !file ? (
        /* STAGE 1: EMPTY STATE / DROPZONE */
        <div 
          id="split-dropzone"
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
            id="split-hidden-file-input"
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
            <div className="dropzone-icon-circle" style={{ background: 'rgba(236, 72, 153, 0.12)', borderColor: 'rgba(236, 72, 153, 0.3)', color: '#ec4899' }}>
              <Scissors size={38} />
            </div>

            <div>
              <div className="dropzone-primary-text">Drag & drop your PDF file to split</div>
              <div className="dropzone-secondary-text">or click to browse from your device</div>
            </div>

            <button 
              id="split-select-file-btn"
              type="button" 
              className="browse-files-btn"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #8b5cf6 100%)' }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Scissors size={18} />
              <span>Select PDF File</span>
            </button>

            <div className="dropzone-meta">
              <span className="meta-chip">PDF format</span>
              <span className="meta-chip">Visual page selection</span>
              <span className="meta-chip">Zero file retention</span>
            </div>
          </div>
        </div>
      ) : (
        /* STAGE 2: WORKSPACE & PAGE SELECTION */
        <div className="staging-area" id="split-staging-workspace">
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
                <span className="stat-value">{totalPages}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">File Size</span>
                <span className="stat-value">{formatBytes(file.size)}</span>
              </div>
            </div>

            <div className="staging-toolbar">
              <button 
                id="change-file-btn"
                className="action-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Choose a different PDF"
              >
                <RefreshCw size={15} />
                <span>Change File</span>
              </button>

              <button 
                id="clear-split-file-btn"
                className="action-btn-sm danger"
                onClick={() => setFile(null)}
                title="Remove this file"
              >
                <Trash2 size={15} />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Split Mode Selector */}
          <div className="split-mode-selector">
            <div 
              id="mode-extract-card"
              className={`split-mode-card ${mode === 'extract' ? 'active' : ''}`}
              onClick={() => setMode('extract')}
            >
              <div className="mode-radio-dot">
                {mode === 'extract' && <div className="mode-radio-inner" />}
              </div>
              <div>
                <h4 className="mode-card-title">Extract Selected Pages</h4>
                <p className="mode-card-desc">
                  Select specific pages or ranges to combine into a single clean PDF document.
                </p>
              </div>
            </div>

            <div 
              id="mode-split-all-card"
              className={`split-mode-card ${mode === 'split' ? 'active' : ''}`}
              onClick={() => setMode('split')}
            >
              <div className="mode-radio-dot">
                {mode === 'split' && <div className="mode-radio-inner" />}
              </div>
              <div>
                <h4 className="mode-card-title">Split Every Page into Separate PDFs</h4>
                <p className="mode-card-desc">
                  Generates an individual PDF file for each page and bundles them into a ZIP archive.
                </p>
              </div>
            </div>
          </div>

          {/* Page Selection Controls (visible in extract mode) */}
          {mode === 'extract' && (
            <div className="page-selection-controls">
              <div className="selection-top-row">
                <div className="quick-select-pills">
                  <button className="action-btn-sm" onClick={handleSelectAll}>
                    <CheckSquare size={14} />
                    <span>Select All ({totalPages})</span>
                  </button>
                  <button className="action-btn-sm" onClick={handleClearAll}>
                    <Square size={14} />
                    <span>Clear</span>
                  </button>
                  <button className="action-btn-sm" onClick={handleSelectOdd}>
                    <span>Odd Pages</span>
                  </button>
                  <button className="action-btn-sm" onClick={handleSelectEven}>
                    <span>Even Pages</span>
                  </button>
                </div>

                <div className="range-input-box">
                  <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>Page Range:</span>
                  <input
                    id="page-range-input"
                    type="text"
                    className="range-input-field"
                    placeholder="e.g. 1-3, 5"
                    value={rangeInput}
                    onChange={handleRangeInputChange}
                  />
                </div>
              </div>

              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {selectedPages.size} of {totalPages} pages selected
              </span>
            </div>
          )}

          {/* Visual Page Grid (in extract mode) */}
          {mode === 'extract' && (
            <div className="pages-grid-container" id="visual-pages-grid">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isSelected = selectedPages.has(pageNum);

                return (
                  <div
                    key={pageNum}
                    id={`page-tile-${pageNum}`}
                    className={`page-tile ${isSelected ? 'selected' : ''}`}
                    onClick={() => togglePage(pageNum)}
                  >
                    <div className="page-mockup">
                      <div className="mockup-line title"></div>
                      <div className="mockup-line body-1"></div>
                      <div className="mockup-line body-2"></div>
                      <div className="mockup-line body-1" style={{ opacity: 0.5 }}></div>
                    </div>

                    <div className="page-tile-footer">
                      <span className="page-number-label">Page {pageNum}</span>
                      <div className="page-tile-checkbox">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action & Options Bar */}
          <div className="staging-options-bar">
            <div className="output-name-group">
              <label htmlFor="split-output-filename-input" className="input-label">
                Custom Output File Name:
              </label>
              <div className="input-with-addon">
                <input
                  id="split-output-filename-input"
                  type="text"
                  className="text-input"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="split_document"
                />
                <span className="input-addon">{mode === 'split' ? '.zip' : '.pdf'}</span>
              </div>
            </div>

            <button
              id="execute-split-cta-btn"
              className="split-action-cta-btn"
              disabled={isProcessing || (mode === 'extract' && selectedPages.size === 0)}
              onClick={handleExecuteSplit}
            >
              <span>
                {mode === 'extract' 
                  ? `Extract ${selectedPages.size} Page${selectedPages.size === 1 ? '' : 's'}`
                  : `Split All ${totalPages} Pages into ZIP`}
              </span>
              <Scissors size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING MODAL */}
      {isProcessing && (
        <div className="modal-backdrop" id="split-processing-modal">
          <div className="processing-card">
            <div className="spinner-ring" style={{ borderTopColor: '#ec4899', borderRightColor: '#d946ef' }}></div>

            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                Splitting Document...
              </h4>
              <div className="progress-status-text">
                {progressStage === 0 && 'Reading and verifying document structure...'}
                {progressStage === 1 && 'Extracting targeted pages into high-fidelity streams...'}
                {progressStage === 2 && 'Assembling output file...'}
              </div>
            </div>

            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #8b5cf6 100%)' 
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
