import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, ArrowLeft, Trash2, Check, Download, 
  RefreshCw, Image as ImageIcon, Sparkles, Layers, 
  Eye, CheckSquare, Square, ZoomIn, X, FileArchive, ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { loadPdfDocument, renderPageThumbnail, renderPageToImage } from '../utils/pdfRenderer';

export function PdfToImgStudio({ onBackToDashboard, onShowToast }) {
  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState(new Set());

  // Conversion options
  const [imageFormat, setImageFormat] = useState('png'); // 'png' | 'jpeg'
  const [resolutionScale, setResolutionScale] = useState(2.0); // 1.5 (150 DPI) | 2.5 (300 DPI)
  const [outputFilename, setOutputFilename] = useState('');

  // UI States
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  // Results
  const [convertedImages, setConvertedImages] = useState(null);
  const [zipBlob, setZipBlob] = useState(null);

  // Full-size Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

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

  // Handle PDF loaded
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
      const doc = await loadPdfDocument(uploadedFile);
      const total = doc.numPages;

      setFile(uploadedFile);
      setPdfDoc(doc);
      setPageCount(total);

      // Select all pages by default
      const allPages = new Set();
      for (let i = 1; i <= total; i++) {
        allPages.add(i);
      }
      setSelectedPages(allPages);

      const cleanName = uploadedFile.name.replace(/\.pdf$/i, '');
      setOutputFilename(`${cleanName}_images`);

    } catch (err) {
      console.error('Failed to load PDF with PDF.js:', err);
      onShowToast({
        type: 'error',
        message: 'Could not load PDF document. It may be password protected or corrupted.'
      });
    }
  };

  // Toggle page selection
  const togglePage = (pageNum) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        if (next.size === 1) {
          onShowToast({
            type: 'warning',
            message: 'At least one page must be selected for conversion.'
          });
          return prev;
        }
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  const selectAllPages = () => {
    const all = new Set();
    for (let i = 1; i <= pageCount; i++) all.add(i);
    setSelectedPages(all);
  };

  const deselectAllPages = () => {
    setSelectedPages(new Set([1])); // Keep at least page 1
  };

  // Execute Conversion
  const handleExecuteConvert = async () => {
    if (!pdfDoc || selectedPages.size === 0) return;

    setIsProcessing(true);
    setProgressPercent(5);
    setProgressStatus('Initializing high-resolution renderer...');

    try {
      const pagesToRender = Array.from(selectedPages).sort((a, b) => a - b);
      const cleanName = (outputFilename.trim() || 'converted_images').replace(/\.(pdf|zip|png|jpe?g)$/i, '');
      const ext = imageFormat === 'jpeg' ? '.jpg' : '.png';

      const results = [];
      const zip = new JSZip();

      for (let i = 0; i < pagesToRender.length; i++) {
        const pageNum = pagesToRender[i];
        const percent = Math.round(((i + 1) / pagesToRender.length) * 85);
        setProgressPercent(percent);
        setProgressStatus(`Rendering page ${pageNum} of ${pageCount}...`);

        const imgData = await renderPageToImage(pdfDoc, pageNum, {
          format: imageFormat,
          scale: resolutionScale,
          quality: 0.92
        });

        const paddedNum = String(pageNum).padStart(2, '0');
        const filename = `${cleanName}_page_${paddedNum}${ext}`;

        results.push({
          pageNumber: pageNum,
          filename,
          blob: imgData.blob,
          dataUrl: imgData.dataUrl,
          width: imgData.width,
          height: imgData.height,
          size: imgData.blob.size
        });

        zip.file(filename, imgData.blob);
      }

      setProgressPercent(95);
      setProgressStatus('Packaging images into ZIP archive...');

      const zipFileBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

      setProgressPercent(100);

      setTimeout(() => {
        setIsProcessing(false);
        setConvertedImages(results);
        setZipBlob(zipFileBlob);

        confetti({
          particleCount: 85,
          spread: 75,
          origin: { y: 0.6 }
        });
      }, 350);

    } catch (err) {
      console.error('PDF to Image conversion error:', err);
      setIsProcessing(false);
      onShowToast({
        type: 'error',
        message: err.message || 'An error occurred while converting pages to images.'
      });
    }
  };

  // Download Single Image
  const downloadSingleImage = (img) => {
    const a = document.createElement('a');
    a.href = img.dataUrl;
    a.download = img.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download ZIP
  const downloadZipArchive = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = (outputFilename.trim() || 'converted_images').replace(/\.(pdf|zip|png|jpe?g)$/i, '');
    a.download = `${cleanName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Reset Studio
  const handleReset = () => {
    setFile(null);
    setPdfDoc(null);
    setPageCount(0);
    setSelectedPages(new Set());
    setConvertedImages(null);
    setZipBlob(null);
    setOutputFilename('');
  };

  return (
    <div className="studio-container" id="pdf-to-img-studio-view">
      {/* Top Header & Breadcrumb */}
      <div className="studio-top-bar">
        <button 
          id="pdf2img-back-btn" 
          className="back-btn" 
          onClick={onBackToDashboard}
          title="Back to all tools"
        >
          <ArrowLeft size={16} />
          <span>All Tools</span>
        </button>

        <div className="studio-title-group">
          <h2 className="studio-heading">PDF to Image Converter</h2>
          <span className="studio-subheading">Extract each PDF page into high-resolution PNG or JPG images</span>
        </div>

        <div style={{ width: 90 }}>{/* spacer */}</div>
      </div>

      {/* RESULT VIEW */}
      {convertedImages ? (
        <div className="result-card" id="pdf2img-success-result">
          <div className="success-icon-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}>
            <ImageIcon size={44} />
          </div>

          <div>
            <h3 className="result-title">Pages Successfully Converted to Images!</h3>
            <p className="result-subtitle">
              Generated <strong>{convertedImages.length} high-resolution {imageFormat.toUpperCase()}</strong> images from your document.
            </p>
          </div>

          {/* Quick Summary Pill Bar */}
          <div className="result-stats-grid">
            <div className="result-stat-cell">
              <span className="result-stat-label">Total Images</span>
              <span className="result-stat-val" style={{ color: '#f59e0b' }}>{convertedImages.length}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Format</span>
              <span className="result-stat-val" style={{ textTransform: 'uppercase' }}>{imageFormat}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">ZIP Archive Size</span>
              <span className="result-stat-val" style={{ color: '#10b981' }}>
                {zipBlob ? formatBytes(zipBlob.size) : 'Ready'}
              </span>
            </div>
          </div>

          {/* Main Action CTAs */}
          <div className="result-actions-group">
            <button 
              id="download-all-images-zip-btn" 
              className="download-btn"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', boxShadow: '0 4px 25px rgba(245, 158, 11, 0.45)' }}
              onClick={downloadZipArchive}
            >
              <FileArchive size={20} />
              <span>Download All Images (.ZIP)</span>
            </button>

            <button 
              id="convert-another-pdf-btn" 
              className="reset-btn" 
              onClick={handleReset}
            >
              <RefreshCw size={16} />
              <span>Convert Another PDF</span>
            </button>
          </div>

          {/* Converted Images Grid */}
          <div className="converted-images-section">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', textAlign: 'left', marginBottom: '1rem' }}>
              Extracted Page Images ({convertedImages.length})
            </h4>

            <div className="converted-images-grid">
              {convertedImages.map((img) => (
                <div key={img.pageNumber} className="converted-image-card">
                  <div className="img-card-preview-wrap" onClick={() => setPreviewImage(img)}>
                    <img 
                      src={img.dataUrl} 
                      alt={`Page ${img.pageNumber}`} 
                      className="img-card-thumb" 
                    />
                    <div className="img-hover-overlay">
                      <ZoomIn size={22} />
                      <span>Preview</span>
                    </div>
                    <span className="img-page-badge">Page {img.pageNumber}</span>
                  </div>

                  <div className="img-card-footer">
                    <div className="img-meta-info">
                      <span className="img-dim-text">{img.width} × {img.height} px</span>
                      <span className="img-size-text">{formatBytes(img.size)}</span>
                    </div>

                    <button 
                      className="action-btn-sm" 
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => downloadSingleImage(img)}
                      title={`Download Page ${img.pageNumber}`}
                    >
                      <Download size={13} />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !file ? (
        /* STAGE 1: DROPZONE */
        <div 
          id="pdf2img-dropzone"
          className={`dropzone-card ${isDraggingOver ? 'dragging-over' : ''}`}
          style={{ borderColor: isDraggingOver ? '#f59e0b' : 'rgba(245, 158, 11, 0.3)' }}
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
            id="pdf2img-hidden-file-input"
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
            <div className="dropzone-icon-circle" style={{ background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.35)', color: '#f59e0b' }}>
              <ImageIcon size={38} />
            </div>

            <div>
              <div className="dropzone-primary-text">Drag & drop your PDF file to extract images</div>
              <div className="dropzone-secondary-text">or click to browse from your device</div>
            </div>

            <button 
              id="pdf2img-select-file-btn"
              type="button" 
              className="browse-files-btn"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)' }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <ImageIcon size={18} />
              <span>Select PDF File</span>
            </button>

            <div className="dropzone-meta">
              <span className="meta-chip">PNG & JPG formats</span>
              <span className="meta-chip">Full resolution export</span>
              <span className="meta-chip">Batch ZIP packaging</span>
              <span className="meta-chip">Zero file retention</span>
            </div>
          </div>
        </div>
      ) : (
        /* STAGE 2: CONFIGURATION & PAGE SELECTION */
        <div className="staging-area" id="pdf2img-staging-workspace">
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
                <span className="stat-label">Selected Pages</span>
                <span className="stat-value" style={{ color: '#f59e0b' }}>
                  {selectedPages.size} of {pageCount}
                </span>
              </div>
            </div>

            <div className="staging-toolbar">
              <button 
                id="change-pdf2img-file-btn"
                className="action-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Choose a different PDF"
              >
                <RefreshCw size={15} />
                <span>Change File</span>
              </button>

              <button 
                id="clear-pdf2img-file-btn"
                className="action-btn-sm danger"
                onClick={handleReset}
                title="Remove this file"
              >
                <Trash2 size={15} />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Options & Configuration Card */}
          <div className="pdf2img-options-card">
            <div className="pdf2img-options-grid">
              {/* Format Selection */}
              <div className="pdf2img-option-group">
                <label className="input-label">Image Format:</label>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segmented-btn ${imageFormat === 'png' ? 'active' : ''}`}
                    onClick={() => setImageFormat('png')}
                  >
                    <span>PNG</span>
                    <span className="sub-badge">Lossless</span>
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${imageFormat === 'jpeg' ? 'active' : ''}`}
                    onClick={() => setImageFormat('jpeg')}
                  >
                    <span>JPG</span>
                    <span className="sub-badge">Compact</span>
                  </button>
                </div>
              </div>

              {/* Resolution / DPI */}
              <div className="pdf2img-option-group">
                <label className="input-label">Output Quality / DPI:</label>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segmented-btn ${resolutionScale === 1.5 ? 'active' : ''}`}
                    onClick={() => setResolutionScale(1.5)}
                  >
                    <span>Standard</span>
                    <span className="sub-badge">150 DPI</span>
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${resolutionScale === 2.5 ? 'active' : ''}`}
                    onClick={() => setResolutionScale(2.5)}
                  >
                    <span>Ultra HD</span>
                    <span className="sub-badge">300 DPI</span>
                  </button>
                </div>
              </div>

              {/* Output Zip Name */}
              <div className="pdf2img-option-group" style={{ flex: 1.5 }}>
                <label htmlFor="pdf2img-output-filename" className="input-label">ZIP / Output Name:</label>
                <div className="input-with-addon">
                  <input
                    id="pdf2img-output-filename"
                    type="text"
                    className="text-input"
                    value={outputFilename}
                    onChange={(e) => setOutputFilename(e.target.value)}
                    placeholder="extracted_images"
                  />
                  <span className="input-addon">.zip</span>
                </div>
              </div>
            </div>

            {/* Page Selection Bar */}
            <div className="page-selection-header">
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
                Select pages to extract ({selectedPages.size} selected):
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="action-btn-sm" 
                  onClick={selectAllPages}
                >
                  <CheckSquare size={14} />
                  <span>Select All</span>
                </button>
                <button 
                  type="button" 
                  className="action-btn-sm" 
                  onClick={deselectAllPages}
                >
                  <Square size={14} />
                  <span>Deselect All</span>
                </button>
              </div>
            </div>

            {/* Thumbnail Selection Grid */}
            <div className="page-thumbnail-selector-grid">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
                const isSelected = selectedPages.has(pageNum);
                return (
                  <div
                    key={pageNum}
                    className={`page-thumb-select-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => togglePage(pageNum)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                  >
                    <div className="thumb-check-badge">
                      {isSelected ? <Check size={14} /> : null}
                    </div>

                    <PageThumbnailPreview pdfDoc={pdfDoc} pageNumber={pageNum} />

                    <div className="thumb-page-label">
                      Page {pageNum}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit Action CTA */}
            <button
              id="execute-pdf2img-cta-btn"
              className="pdf2img-action-cta-btn"
              disabled={isProcessing || selectedPages.size === 0}
              onClick={handleExecuteConvert}
            >
              <span>Convert {selectedPages.size} {selectedPages.size === 1 ? 'Page' : 'Pages'} to {imageFormat.toUpperCase()}</span>
              <ImageIcon size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING MODAL */}
      {isProcessing && (
        <div className="modal-backdrop" id="pdf2img-processing-modal">
          <div className="processing-card">
            <div className="spinner-ring" style={{ borderTopColor: '#f59e0b', borderRightColor: '#d97706' }}></div>

            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                Rendering High-Resolution Images...
              </h4>
              <div className="progress-status-text">
                {progressStatus || 'Processing PDF pages...'}
              </div>
            </div>

            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)' 
                }}
              ></div>
            </div>

            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Rendering high-DPI vector paths & anti-aliased typography
            </span>
          </div>
        </div>
      )}

      {/* IMAGE FULLSCREEN PREVIEW MODAL */}
      {previewImage && (
        <div 
          className="modal-backdrop" 
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="img-preview-modal-card" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pdf-preview-modal-header">
              <div className="pdf-preview-header-left">
                <ImageIcon size={20} style={{ color: '#f59e0b' }} />
                <div>
                  <h4 className="pdf-preview-modal-title">{previewImage.filename}</h4>
                  <span className="pdf-preview-modal-subtitle">
                    {previewImage.width} × {previewImage.height} px • {formatBytes(previewImage.size)}
                  </span>
                </div>
              </div>

              <div className="pdf-preview-header-actions">
                <button 
                  className="download-btn"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                  onClick={() => downloadSingleImage(previewImage)}
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
                <button 
                  className="back-btn" 
                  style={{ padding: '0.45rem 0.85rem' }}
                  onClick={() => setPreviewImage(null)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="img-preview-modal-body">
              <img 
                src={previewImage.dataUrl} 
                alt={previewImage.filename} 
                className="img-preview-full" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Thumbnail canvas helper component
 */
function PageThumbnailPreview({ pdfDoc, pageNumber }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      renderPageThumbnail(pdfDoc, pageNumber, canvasRef.current, 0.35);
    }
  }, [pdfDoc, pageNumber]);

  return (
    <div className="thumb-canvas-wrapper">
      <canvas ref={canvasRef} className="page-thumbnail-canvas" />
    </div>
  );
}
