import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, ArrowLeft, Check, Download, 
  ExternalLink, RefreshCw, X, ArrowUpDown, ChevronLeft, 
  ChevronRight, GripVertical, FileCheck, Eye, RotateCcw, 
  Sparkles, Layers 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { loadPdfDocument, renderPageThumbnail } from '../utils/pdfRenderer';

export function ReorderPagesStudio({ onBackToDashboard, onShowToast }) {
  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pagesList, setPagesList] = useState([]); // array of { originalPage: number }
  const [outputFilename, setOutputFilename] = useState('');
  const [inspectingPage, setInspectingPage] = useState(null); // number | null

  // Drag and drop states
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [reorderResult, setReorderResult] = useState(null);

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
        throw new Error('Failed to inspect PDF pages');
      }

      const json = await res.json();
      const count = json.data?.pageCount || 1;

      if (count <= 1) {
        onShowToast({
          type: 'error',
          message: 'This document only has 1 page. Reordering requires at least 2 pages.'
        });
        return;
      }

      // Load PDF.js document for visual rendering
      const loadedDoc = await loadPdfDocument(uploadedFile);

      const initialPages = [];
      for (let i = 1; i <= count; i++) {
        initialPages.push({ originalPage: i });
      }

      setFile(uploadedFile);
      setPdfDoc(loadedDoc);
      setTotalPages(count);
      setPagesList(initialPages);

      const cleanName = uploadedFile.name.replace(/\.pdf$/i, '');
      setOutputFilename(`${cleanName}_reordered`);

    } catch (err) {
      console.error(err);
      onShowToast({
        type: 'error',
        message: 'Could not read document. It may be password-protected or corrupted.'
      });
    }
  };

  // Reorder page move
  const movePage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= pagesList.length) return;
    const updated = [...pagesList];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setPagesList(updated);
  };

  // Quick actions
  const handleReverse = () => {
    setPagesList((prev) => [...prev].reverse());
    onShowToast({ type: 'success', message: 'Reversed all document pages.' });
  };

  const handleReset = () => {
    const original = [];
    for (let i = 1; i <= totalPages; i++) {
      original.push({ originalPage: i });
    }
    setPagesList(original);
    onShowToast({ type: 'info', message: 'Restored original page order.' });
  };

  // HTML5 Drag and drop
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      movePage(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Check if order changed
  const isOrderChanged = pagesList.some((item, idx) => item.originalPage !== idx + 1);

  // Execute Reorder
  const handleExecuteReorder = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgressStage(0);
    setProgressPercent(20);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const orderString = pagesList.map((p) => p.originalPage).join(',');
      formData.append('pageOrder', orderString);

      const cleanName = (outputFilename.trim() || 'reordered_document').replace(/\.pdf$/i, '');
      formData.append('outputFilename', cleanName);

      setTimeout(() => {
        setProgressStage(1);
        setProgressPercent(60);
      }, 350);

      const response = await fetch('/api/tools/reorder-pages', {
        method: 'POST',
        body: formData
      });

      setProgressStage(2);
      setProgressPercent(90);

      if (!response.ok) {
        let errMessage = 'Failed to reorder document.';
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
      const finalPages = response.headers.get('X-Total-Pages') || totalPages;
      const finalSize = blob.size;

      setProgressPercent(100);

      setTimeout(() => {
        setIsProcessing(false);
        setReorderResult({
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
      console.error('Reorder error:', error);
      setIsProcessing(false);
      onShowToast({
        type: 'error',
        message: error.message || 'An error occurred while reordering the PDF.'
      });
    }
  };

  const handleDownload = () => {
    if (!reorderResult) return;
    const a = document.createElement('a');
    a.href = reorderResult.blobUrl;
    a.download = reorderResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreview = () => {
    if (!reorderResult) return;
    window.open(reorderResult.blobUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFullReset = () => {
    if (reorderResult && reorderResult.blobUrl) {
      URL.revokeObjectURL(reorderResult.blobUrl);
    }
    setFile(null);
    setPdfDoc(null);
    setTotalPages(0);
    setPagesList([]);
    setReorderResult(null);
    setOutputFilename('');
    setInspectingPage(null);
  };

  return (
    <div className="studio-container" id="reorder-pages-studio-view">
      {/* Top Header & Breadcrumb */}
      <div className="studio-top-bar">
        <button 
          id="reorder-pages-back-btn" 
          className="back-btn" 
          onClick={onBackToDashboard}
          title="Back to all tools"
        >
          <ArrowLeft size={16} />
          <span>All Tools</span>
        </button>

        <div className="studio-title-group">
          <h2 className="studio-heading">Reorder PDF Pages</h2>
          <span className="studio-subheading">Drag and drop pages to rearrange their sequence</span>
        </div>

        <div style={{ width: 90 }}>{/* spacer */}</div>
      </div>

      {/* RESULT VIEW */}
      {reorderResult ? (
        <div className="result-card" id="reorder-pages-success-result">
          <div className="success-icon-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#3b82f6' }}>
            <FileCheck size={42} />
          </div>

          <div>
            <h3 className="result-title">Pages Reordered Successfully!</h3>
            <p className="result-subtitle">
              Your new document <strong>{reorderResult.filename}</strong> has been assembled in your custom order.
            </p>
          </div>

          <div className="result-stats-grid">
            <div className="result-stat-cell">
              <span className="result-stat-label">Total Pages</span>
              <span className="result-stat-val">{reorderResult.totalPages}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Sequence Status</span>
              <span className="result-stat-val" style={{ color: '#10b981' }}>Reordered</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Output Size</span>
              <span className="result-stat-val">{formatBytes(reorderResult.size)}</span>
            </div>
          </div>

          <div className="result-actions-group">
            <button 
              id="download-reordered-pdf-btn" 
              className="download-btn" 
              onClick={handleDownload}
            >
              <Download size={20} />
              <span>Download Reordered PDF</span>
            </button>

            <button 
              id="preview-reordered-pdf-btn" 
              className="preview-btn" 
              onClick={handlePreview}
            >
              <ExternalLink size={18} />
              <span>Preview in Browser</span>
            </button>

            <button 
              id="reorder-another-btn" 
              className="reset-btn" 
              onClick={handleFullReset}
            >
              <RefreshCw size={16} />
              <span>Reorder Another Document</span>
            </button>
          </div>
        </div>
      ) : !file ? (
        /* STAGE 1: DROPZONE */
        <div 
          id="reorder-pages-dropzone"
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
            id="reorder-pages-hidden-file-input"
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
            <div className="dropzone-icon-circle" style={{ background: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' }}>
              <ArrowUpDown size={38} />
            </div>

            <div>
              <div className="dropzone-primary-text">Drag & drop your PDF file to reorder</div>
              <div className="dropzone-secondary-text">or click to browse from your device</div>
            </div>

            <button 
              id="reorder-pages-select-file-btn"
              type="button" 
              className="browse-files-btn"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <ArrowUpDown size={18} />
              <span>Select PDF File</span>
            </button>

            <div className="dropzone-meta">
              <span className="meta-chip">PDF format</span>
              <span className="meta-chip">Visual drag-and-drop</span>
              <span className="meta-chip">Zero file retention</span>
            </div>
          </div>
        </div>
      ) : (
        /* STAGE 2: REORDER WORKSPACE */
        <div className="staging-area" id="reorder-pages-staging-workspace">
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
                <span className="stat-label">Order Status</span>
                <span className="stat-value" style={{ color: isOrderChanged ? '#3b82f6' : '#94a3b8' }}>
                  {isOrderChanged ? 'Custom Order' : 'Original Order'}
                </span>
              </div>
            </div>

            <div className="staging-toolbar">
              <button 
                id="reverse-order-btn"
                className="action-btn-sm"
                onClick={handleReverse}
                title="Reverse all page sequence"
              >
                <ArrowUpDown size={15} />
                <span>Reverse Order</span>
              </button>

              <button 
                id="reset-order-btn"
                className="action-btn-sm"
                disabled={!isOrderChanged}
                onClick={handleReset}
                title="Reset to original 1, 2, 3... order"
              >
                <RotateCcw size={15} />
                <span>Reset Order</span>
              </button>

              <button 
                id="change-reorder-file-btn"
                className="action-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Choose a different PDF"
              >
                <RefreshCw size={15} />
                <span>Change File</span>
              </button>

              <button 
                id="clear-reorder-file-btn"
                className="action-btn-sm danger"
                onClick={() => { setFile(null); setPdfDoc(null); }}
                title="Cancel"
              >
                <X size={15} />
                <span>Cancel</span>
              </button>
            </div>
          </div>

          <div style={{ padding: '0.4rem 0.2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            💡 <strong>Drag and drop</strong> any page card to change its position, or use the <strong>Left / Right arrows</strong> on each card.
          </div>

          {/* Visual Reorder Grid */}
          <div 
            className="pages-grid-container" 
            id="reorder-pages-grid" 
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
          >
            {pagesList.map((item, index) => {
              const currentPosition = index + 1;
              const originalPageNumber = item.originalPage;
              const isDragging = draggedIndex === index;
              const isDragTarget = dragOverIndex === index;
              const isDifferentFromOriginal = currentPosition !== originalPageNumber;

              return (
                <div
                  key={`${item.originalPage}-${index}`}
                  id={`reorder-page-card-${index}`}
                  className={`reorder-page-card ${isDragging ? 'is-dragging' : ''} ${isDragTarget ? 'drag-over-target' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <div className="reorder-card-header">
                    <span className="current-pos-badge" title="Current page sequence">
                      Page #{currentPosition}
                    </span>

                    {isDifferentFromOriginal && (
                      <span className="orig-pos-tag" title="Originally page number in source file">
                        was #{originalPageNumber}
                      </span>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <ReorderThumbnail
                    pdfDoc={pdfDoc}
                    pageNumber={originalPageNumber}
                    onZoom={(p) => setInspectingPage(p)}
                  />

                  {/* Card Controls */}
                  <div className="reorder-card-actions">
                    <button
                      type="button"
                      className="reorder-nav-btn"
                      disabled={index === 0}
                      onClick={() => movePage(index, index - 1)}
                      title="Move page left"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div style={{ color: '#64748b', cursor: 'grab', display: 'flex', alignItems: 'center' }} title="Drag to reorder">
                      <GripVertical size={16} />
                    </div>

                    <button
                      type="button"
                      className="reorder-nav-btn"
                      disabled={index === pagesList.length - 1}
                      onClick={() => movePage(index, index + 1)}
                      title="Move page right"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action & Options Bar */}
          <div className="staging-options-bar">
            <div className="output-name-group">
              <label htmlFor="reorder-output-filename-input" className="input-label">
                Output File Name:
              </label>
              <div className="input-with-addon">
                <input
                  id="reorder-output-filename-input"
                  type="text"
                  className="text-input"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="reordered_document"
                />
                <span className="input-addon">.pdf</span>
              </div>
            </div>

            <button
              id="execute-reorder-pages-cta-btn"
              className="reorder-action-cta-btn"
              disabled={isProcessing}
              onClick={handleExecuteReorder}
            >
              <span>Save & Download Reordered PDF</span>
              <FileCheck size={20} />
            </button>
          </div>
        </div>
      )}

      {/* LARGE PAGE INSPECTOR MODAL */}
      {inspectingPage && (
        <ReorderInspectModal
          pdfDoc={pdfDoc}
          pageNumber={inspectingPage}
          totalPages={totalPages}
          onClose={() => setInspectingPage(null)}
          onNavigate={(p) => setInspectingPage(p)}
        />
      )}

      {/* PROCESSING MODAL */}
      {isProcessing && (
        <div className="modal-backdrop" id="reorder-processing-modal">
          <div className="processing-card">
            <div className="spinner-ring" style={{ borderTopColor: '#3b82f6', borderRightColor: '#1d4ed8' }}></div>

            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                Reordering Pages...
              </h4>
              <div className="progress-status-text">
                {progressStage === 0 && 'Reading document structure and page tree...'}
                {progressStage === 1 && 'Recompiling pages according to specified sequence...'}
                {progressStage === 2 && 'Generating finalized reordered PDF...'}
              </div>
            </div>

            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' 
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
 * Thumbnail rendering sub-component
 */
function ReorderThumbnail({ pdfDoc, pageNumber, onZoom }) {
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
          opacity: isRendered ? 1 : 0,
          transition: 'all 0.2s'
        }}
      />

      {!isRendered && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#64748b' }}>
          <div className="spinner-ring" style={{ width: 20, height: 20, borderWidth: 2, borderTopColor: '#3b82f6' }}></div>
          <span style={{ fontSize: '0.65rem' }}>Loading page...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Page inspection lightbox for reordering
 */
function ReorderInspectModal({ pdfDoc, pageNumber, totalPages, onClose, onNavigate }) {
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, totalPages, onClose, onNavigate]);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="inspect-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="inspect-header">
          <div className="inspect-header-info">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              Inspecting Page #{pageNumber} of {totalPages}
            </h3>
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

        <div className="inspect-body">
          {isLoading && (
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#94a3b8' }}>
              <div className="spinner-ring" style={{ width: 36, height: 36, borderTopColor: '#3b82f6' }}></div>
              <span style={{ fontSize: '0.85rem' }}>Rendering high-resolution page...</span>
            </div>
          )}
          <canvas 
            ref={largeCanvasRef} 
            className="inspect-canvas" 
            style={{ opacity: isLoading ? 0 : 1 }} 
          />
        </div>

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

          <button
            type="button"
            className="action-btn-sm"
            onClick={onClose}
          >
            Done Inspecting
          </button>
        </div>
      </div>
    </div>
  );
}
