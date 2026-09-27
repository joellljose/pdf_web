import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, ArrowLeft, Trash2, Check, Download, 
  ExternalLink, RefreshCw, X, AlertCircle, Square, 
  FileCheck, Eye, ChevronLeft, ChevronRight, Maximize2 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { loadPdfDocument, renderPageThumbnail } from '../utils/pdfRenderer';

export function RemovePagesStudio({ onBackToDashboard, onShowToast }) {
  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pagesToDelete, setPagesToDelete] = useState(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [outputFilename, setOutputFilename] = useState('');
  const [inspectingPage, setInspectingPage] = useState(null); // number | null

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [removeResult, setRemoveResult] = useState(null);

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
      // 1. Inspect metadata from backend
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

      if (count <= 1) {
        onShowToast({
          type: 'error',
          message: 'This PDF only has 1 page. A PDF must have at least 2 pages to remove any pages.'
        });
        return;
      }

      // 2. Load PDF.js document for live page rendering
      const loadedDoc = await loadPdfDocument(uploadedFile);

      setFile(uploadedFile);
      setPdfDoc(loadedDoc);
      setTotalPages(count);
      setPagesToDelete(new Set()); // start with none selected
      setRangeInput('');

      const cleanName = uploadedFile.name.replace(/\.pdf$/i, '');
      setOutputFilename(`${cleanName}_pages_removed`);

    } catch (err) {
      console.error(err);
      onShowToast({
        type: 'error',
        message: 'Could not read document. It may be password-protected or corrupted.'
      });
    }
  };

  // Toggle page for removal
  const togglePageRemoval = (pageNum) => {
    const next = new Set(pagesToDelete);
    if (next.has(pageNum)) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    setPagesToDelete(next);
    setRangeInput(formatSetToRange(next));
  };

  // Quick selections
  const handleClearAll = () => {
    setPagesToDelete(new Set());
    setRangeInput('');
  };

  const handleDeleteFirst = () => {
    const next = new Set(pagesToDelete);
    next.add(1);
    setPagesToDelete(next);
    setRangeInput(formatSetToRange(next));
  };

  const handleDeleteLast = () => {
    const next = new Set(pagesToDelete);
    next.add(totalPages);
    setPagesToDelete(next);
    setRangeInput(formatSetToRange(next));
  };

  const handleDeleteOdd = () => {
    const odd = new Set();
    for (let i = 1; i <= totalPages; i += 2) odd.add(i);
    setPagesToDelete(odd);
    setRangeInput(formatSetToRange(odd));
  };

  const handleDeleteEven = () => {
    const even = new Set();
    for (let i = 2; i <= totalPages; i += 2) even.add(i);
    setPagesToDelete(even);
    setRangeInput(formatSetToRange(even));
  };

  // Handle typing in range text field
  const handleRangeInputChange = (e) => {
    const val = e.target.value;
    setRangeInput(val);
    const parsed = parseRangeToSet(val, totalPages);
    setPagesToDelete(parsed);
  };

  // Execute Page Removal
  const handleExecuteRemove = async () => {
    if (!file) return;

    if (pagesToDelete.size === 0) {
      onShowToast({
        type: 'error',
        message: 'Please select at least 1 page to remove.'
      });
      return;
    }

    if (pagesToDelete.size >= totalPages) {
      onShowToast({
        type: 'error',
        message: 'Cannot delete all pages! At least 1 page must remain in the document.'
      });
      return;
    }

    setIsProcessing(true);
    setProgressStage(0);
    setProgressPercent(20);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pagesToRemove', formatSetToRange(pagesToDelete));

      const cleanName = (outputFilename.trim() || 'pages_removed').replace(/\.pdf$/i, '');
      formData.append('outputFilename', cleanName);

      setTimeout(() => {
        setProgressStage(1);
        setProgressPercent(60);
      }, 350);

      const response = await fetch('/api/tools/remove-pages', {
        method: 'POST',
        body: formData
      });

      setProgressStage(2);
      setProgressPercent(90);

      if (!response.ok) {
        let errMessage = 'Failed to remove pages.';
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
      const remainingPages = response.headers.get('X-Remaining-Pages') || (totalPages - pagesToDelete.size);
      const removedCount = response.headers.get('X-Removed-Pages-Count') || pagesToDelete.size;
      const finalSize = blob.size;

      setProgressPercent(100);

      setTimeout(() => {
        setIsProcessing(false);
        setRemoveResult({
          blobUrl,
          filename: `${cleanName}.pdf`,
          size: finalSize,
          remainingPages: Number(remainingPages),
          removedCount: Number(removedCount)
        });

        confetti({
          particleCount: 85,
          spread: 75,
          origin: { y: 0.6 }
        });
      }, 400);

    } catch (error) {
      console.error('Remove pages error:', error);
      setIsProcessing(false);
      onShowToast({
        type: 'error',
        message: error.message || 'An error occurred while removing pages.'
      });
    }
  };

  const handleDownload = () => {
    if (!removeResult) return;
    const a = document.createElement('a');
    a.href = removeResult.blobUrl;
    a.download = removeResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreview = () => {
    if (!removeResult) return;
    window.open(removeResult.blobUrl, '_blank', 'noopener,noreferrer');
  };

  const handleReset = () => {
    if (removeResult && removeResult.blobUrl) {
      URL.revokeObjectURL(removeResult.blobUrl);
    }
    setFile(null);
    setPdfDoc(null);
    setTotalPages(0);
    setPagesToDelete(new Set());
    setRangeInput('');
    setRemoveResult(null);
    setOutputFilename('');
    setInspectingPage(null);
  };

  const remainingCount = totalPages - pagesToDelete.size;
  const isInvalid = pagesToDelete.size === 0 || remainingCount <= 0;

  return (
    <div className="studio-container" id="remove-pages-studio-view">
      {/* Top Header & Breadcrumb */}
      <div className="studio-top-bar">
        <button 
          id="remove-pages-back-btn" 
          className="back-btn" 
          onClick={onBackToDashboard}
          title="Back to all tools"
        >
          <ArrowLeft size={16} />
          <span>All Tools</span>
        </button>

        <div className="studio-title-group">
          <h2 className="studio-heading">Remove PDF Pages</h2>
          <span className="studio-subheading">Preview each page visually, mark unwanted pages, and download your updated PDF</span>
        </div>

        <div style={{ width: 90 }}>{/* spacer */}</div>
      </div>

      {/* RESULT VIEW */}
      {removeResult ? (
        <div className="result-card" id="remove-pages-success-result">
          <div className="success-icon-badge" style={{ background: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.4)', color: '#f43f5e' }}>
            <FileCheck size={42} />
          </div>

          <div>
            <h3 className="result-title">Pages Removed Successfully!</h3>
            <p className="result-subtitle">
              Your new document <strong>{removeResult.filename}</strong> has been generated without the deleted pages.
            </p>
          </div>

          <div className="result-stats-grid">
            <div className="result-stat-cell">
              <span className="result-stat-label">Pages Deleted</span>
              <span className="result-stat-val" style={{ color: '#f43f5e' }}>{removeResult.removedCount}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Pages Remaining</span>
              <span className="result-stat-val" style={{ color: '#10b981' }}>{removeResult.remainingPages}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Output Size</span>
              <span className="result-stat-val">{formatBytes(removeResult.size)}</span>
            </div>
          </div>

          <div className="result-actions-group">
            <button 
              id="download-removed-pdf-btn" 
              className="download-btn" 
              onClick={handleDownload}
            >
              <Download size={20} />
              <span>Download PDF</span>
            </button>

            <button 
              id="preview-removed-pdf-btn" 
              className="preview-btn" 
              onClick={handlePreview}
            >
              <ExternalLink size={18} />
              <span>Preview in Browser</span>
            </button>

            <button 
              id="remove-another-btn" 
              className="reset-btn" 
              onClick={handleReset}
            >
              <RefreshCw size={16} />
              <span>Process Another Document</span>
            </button>
          </div>
        </div>
      ) : !file ? (
        /* STAGE 1: DROPZONE */
        <div 
          id="remove-pages-dropzone"
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
            id="remove-pages-hidden-file-input"
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
            <div className="dropzone-icon-circle" style={{ background: 'rgba(244, 63, 94, 0.12)', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#f43f5e' }}>
              <Trash2 size={38} />
            </div>

            <div>
              <div className="dropzone-primary-text">Drag & drop your PDF file here</div>
              <div className="dropzone-secondary-text">or click to browse from your device</div>
            </div>

            <button 
              id="remove-pages-select-file-btn"
              type="button" 
              className="browse-files-btn"
              style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)' }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Trash2 size={18} />
              <span>Select PDF File</span>
            </button>

            <div className="dropzone-meta">
              <span className="meta-chip">PDF format</span>
              <span className="meta-chip">Live visual page view</span>
              <span className="meta-chip">Zero file retention</span>
            </div>
          </div>
        </div>
      ) : (
        /* STAGE 2: VISUAL PAGE REMOVAL WORKSPACE */
        <div className="staging-area" id="remove-pages-staging-workspace">
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
                <span className="stat-label">Pages to Delete</span>
                <span className="stat-value" style={{ color: pagesToDelete.size > 0 ? '#f43f5e' : '#94a3b8' }}>
                  {pagesToDelete.size}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Remaining</span>
                <span className="stat-value" style={{ color: remainingCount > 0 ? '#10b981' : '#f43f5e' }}>
                  {remainingCount}
                </span>
              </div>
            </div>

            <div className="staging-toolbar">
              <button 
                id="change-remove-file-btn"
                className="action-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Choose a different PDF"
              >
                <RefreshCw size={15} />
                <span>Change File</span>
              </button>

              <button 
                id="clear-remove-file-btn"
                className="action-btn-sm danger"
                onClick={() => { setFile(null); setPdfDoc(null); }}
                title="Remove this file"
              >
                <X size={15} />
                <span>Cancel</span>
              </button>
            </div>
          </div>

          {/* Quick Selection Toolbar */}
          <div className="page-selection-controls">
            <div className="selection-top-row">
              <div className="quick-select-pills">
                <button className="action-btn-sm" onClick={handleClearAll} title="Unmark all pages">
                  <Square size={14} />
                  <span>Unmark All</span>
                </button>
                <button className="action-btn-sm" onClick={handleDeleteFirst} title="Delete Page 1">
                  <span>Delete Page 1</span>
                </button>
                <button className="action-btn-sm" onClick={handleDeleteLast} title={`Delete Page ${totalPages}`}>
                  <span>Delete Last Page</span>
                </button>
                <button className="action-btn-sm" onClick={handleDeleteOdd} title="Delete odd pages">
                  <span>Delete Odd Pages</span>
                </button>
                <button className="action-btn-sm" onClick={handleDeleteEven} title="Delete even pages">
                  <span>Delete Even Pages</span>
                </button>
              </div>

              <div className="range-input-box">
                <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>Pages to Delete:</span>
                <input
                  id="remove-pages-range-input"
                  type="text"
                  className="range-input-field"
                  placeholder="e.g. 2, 4-6"
                  style={{ borderColor: pagesToDelete.size > 0 ? '#f43f5e' : undefined }}
                  value={rangeInput}
                  onChange={handleRangeInputChange}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#94a3b8' }}>
                💡 Click any page to mark for deletion, or click the <strong>Eye icon</strong> to view full-size.
              </span>
              {remainingCount <= 0 && (
                <span style={{ color: '#f43f5e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={14} /> You cannot delete all pages!
                </span>
              )}
            </div>
          </div>

          {/* Visual Page Grid with Live Canvas Thumbnails */}
          <div className="pages-grid-container" id="remove-pages-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isMarkedForDeletion = pagesToDelete.has(pageNum);

              return (
                <div
                  key={pageNum}
                  id={`remove-page-tile-${pageNum}`}
                  className={`page-tile ${isMarkedForDeletion ? 'to-remove' : ''}`}
                  onClick={() => togglePageRemoval(pageNum)}
                  title={isMarkedForDeletion ? `Page ${pageNum} marked for deletion (click to keep)` : `Click to delete Page ${pageNum}`}
                >
                  <PageThumbnail
                    pdfDoc={pdfDoc}
                    pageNumber={pageNum}
                    isMarkedForDeletion={isMarkedForDeletion}
                    onZoom={(p) => setInspectingPage(p)}
                  />

                  <div className="page-tile-footer">
                    <span 
                      className="page-number-label" 
                      style={{ 
                        color: isMarkedForDeletion ? '#f43f5e' : '#cbd5e1',
                        textDecoration: isMarkedForDeletion ? 'line-through' : 'none'
                      }}
                    >
                      Page {pageNum}
                    </span>
                    <div className="page-tile-checkbox" style={{ borderColor: isMarkedForDeletion ? '#f43f5e' : undefined }}>
                      {isMarkedForDeletion && <Trash2 size={11} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action & Options Bar */}
          <div className="staging-options-bar">
            <div className="output-name-group">
              <label htmlFor="remove-output-filename-input" className="input-label">
                Output File Name:
              </label>
              <div className="input-with-addon">
                <input
                  id="remove-output-filename-input"
                  type="text"
                  className="text-input"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="pages_removed"
                />
                <span className="input-addon">.pdf</span>
              </div>
            </div>

            <button
              id="execute-remove-pages-cta-btn"
              className="remove-action-cta-btn"
              disabled={isProcessing || isInvalid}
              onClick={handleExecuteRemove}
            >
              <span>
                {pagesToDelete.size === 0
                  ? 'Select Pages to Remove'
                  : remainingCount <= 0
                  ? 'At least 1 page must remain'
                  : `Remove ${pagesToDelete.size} Page${pagesToDelete.size === 1 ? '' : 's'} (${remainingCount} Remaining)`}
              </span>
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      )}

      {/* LARGE PAGE INSPECTOR MODAL */}
      {inspectingPage && (
        <PageInspectModal
          pdfDoc={pdfDoc}
          pageNumber={inspectingPage}
          totalPages={totalPages}
          isMarkedForDeletion={pagesToDelete.has(inspectingPage)}
          onToggleDelete={(p) => togglePageRemoval(p)}
          onClose={() => setInspectingPage(null)}
          onNavigate={(p) => setInspectingPage(p)}
        />
      )}

      {/* PROCESSING MODAL */}
      {isProcessing && (
        <div className="modal-backdrop" id="remove-processing-modal">
          <div className="processing-card">
            <div className="spinner-ring" style={{ borderTopColor: '#f43f5e', borderRightColor: '#be123c' }}></div>

            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                Removing Pages...
              </h4>
              <div className="progress-status-text">
                {progressStage === 0 && 'Loading and parsing document pages...'}
                {progressStage === 1 && 'Stripping specified pages and rebuilding sequence...'}
                {progressStage === 2 && 'Generating optimized PDF document...'}
              </div>
            </div>

            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)' 
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

/**
 * Sub-component for individual page canvas thumbnail
 */
function PageThumbnail({ pdfDoc, pageNumber, isMarkedForDeletion, onZoom }) {
  const canvasRef = useRef(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    if (pdfDoc && canvasRef.current) {
      renderPageThumbnail(pdfDoc, pageNumber, canvasRef.current, 0.35)
        .then(() => {
          if (!isCancelled) setIsRendered(true);
        })
        .catch(() => {});
    }
    return () => { isCancelled = true; };
  }, [pdfDoc, pageNumber]);

  return (
    <div className="page-thumbnail-container">
      <button 
        type="button"
        className="page-zoom-trigger-btn"
        title={`View Page ${pageNumber} full size`}
        onClick={(e) => {
          e.stopPropagation();
          onZoom(pageNumber);
        }}
      >
        <Eye size={13} />
      </button>

      <canvas 
        ref={canvasRef} 
        className="page-thumbnail-canvas"
        style={{ 
          opacity: isRendered ? (isMarkedForDeletion ? 0.35 : 1) : 0,
          filter: isMarkedForDeletion ? 'grayscale(80%)' : 'none',
          transition: 'all 0.2s'
        }}
      />

      {!isRendered && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#64748b' }}>
          <div className="spinner-ring" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
          <span style={{ fontSize: '0.65rem' }}>Loading page...</span>
        </div>
      )}

      {isMarkedForDeletion && (
        <div className="delete-badge-overlay">
          <Trash2 size={15} />
        </div>
      )}
    </div>
  );
}

/**
 * Sub-component for full-size inspection lightbox
 */
function PageInspectModal({ pdfDoc, pageNumber, totalPages, isMarkedForDeletion, onToggleDelete, onClose, onNavigate }) {
  const largeCanvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    if (pdfDoc && largeCanvasRef.current) {
      renderPageThumbnail(pdfDoc, pageNumber, largeCanvasRef.current, 1.2)
        .then(() => {
          if (!isCancelled) setIsLoading(false);
        })
        .catch(() => {
          if (!isCancelled) setIsLoading(false);
        });
    }
    return () => { isCancelled = true; };
  }, [pdfDoc, pageNumber]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && pageNumber > 1) onNavigate(pageNumber - 1);
      if (e.key === 'ArrowRight' && pageNumber < totalPages) onNavigate(pageNumber + 1);
      if (e.key === ' ' || e.key === 'Delete') {
        e.preventDefault();
        onToggleDelete(pageNumber);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, totalPages, onClose, onNavigate, onToggleDelete]);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="inspect-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="inspect-header">
          <div className="inspect-header-info">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              Inspecting Page {pageNumber} of {totalPages}
            </h3>
            <span 
              className="license-tag" 
              style={{ 
                color: isMarkedForDeletion ? '#f43f5e' : '#10b981',
                borderColor: isMarkedForDeletion ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                background: isMarkedForDeletion ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                fontWeight: 700
              }}
            >
              {isMarkedForDeletion ? 'Marked for Deletion' : 'Kept in Document'}
            </span>
          </div>

          <button 
            type="button" 
            className="action-btn-sm" 
            onClick={onClose} 
            title="Close viewer (Esc)"
          >
            <X size={16} />
            <span>Close</span>
          </button>
        </div>

        {/* Body Canvas */}
        <div className="inspect-body">
          {isLoading && (
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#94a3b8' }}>
              <div className="spinner-ring" style={{ width: 36, height: 36 }}></div>
              <span style={{ fontSize: '0.85rem' }}>Rendering high-resolution page...</span>
            </div>
          )}
          <canvas 
            ref={largeCanvasRef} 
            className="inspect-canvas" 
            style={{ 
              opacity: isLoading ? 0 : 1,
              filter: isMarkedForDeletion ? 'grayscale(40%)' : 'none'
            }} 
          />
        </div>

        {/* Footer controls */}
        <div className="inspect-footer">
          <div className="inspect-nav-btns">
            <button
              type="button"
              className="action-btn-sm"
              disabled={pageNumber <= 1}
              onClick={() => onNavigate(pageNumber - 1)}
              title="Previous Page (Left Arrow)"
            >
              <ChevronLeft size={16} />
              <span>Previous Page</span>
            </button>
            <button
              type="button"
              className="action-btn-sm"
              disabled={pageNumber >= totalPages}
              onClick={() => onNavigate(pageNumber + 1)}
              title="Next Page (Right Arrow)"
            >
              <span>Next Page</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div>
            <button
              type="button"
              className="action-btn-sm"
              style={{
                background: isMarkedForDeletion ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                borderColor: isMarkedForDeletion ? '#10b981' : '#f43f5e',
                color: isMarkedForDeletion ? '#10b981' : '#f43f5e',
                fontWeight: 700,
                padding: '0.65rem 1.25rem'
              }}
              onClick={() => onToggleDelete(pageNumber)}
            >
              {isMarkedForDeletion ? (
                <>
                  <Check size={16} />
                  <span>Keep This Page</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Mark This Page for Removal</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
