import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, ArrowLeft, Trash2, Check, Download, 
  RefreshCw, Images, Plus, ArrowLeft as ArrowLeftIcon, 
  ArrowRight as ArrowRightIcon, RotateCw, Eye, ShieldCheck, 
  Sparkles, Layers, FileCheck, X
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function ImgToPdfStudio({ onBackToDashboard, onShowToast }) {
  const [images, setImages] = useState([]); // Array of { id, file, name, size, previewUrl, rotation }
  const [pageSize, setPageSize] = useState('fit'); // 'fit' | 'a4' | 'letter'
  const [orientation, setOrientation] = useState('auto'); // 'auto' | 'portrait' | 'landscape'
  const [margin, setMargin] = useState('none'); // 'none' | 'small' | 'normal'
  const [outputFilename, setOutputFilename] = useState('');

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  const [pdfResult, setPdfResult] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fileInputRef = useRef(null);
  const addMoreInputRef = useRef(null);

  // Format bytes helper
  const formatBytes = (bytes, decimals = 1) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Handle image files added
  const handleFilesAdded = (fileList) => {
    const validFiles = Array.from(fileList).filter((f) => {
      const isImgMime = f.type.startsWith('image/');
      const isImgExt = /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name);
      return isImgMime || isImgExt;
    });

    if (validFiles.length === 0) {
      onShowToast({
        type: 'error',
        message: 'No supported image files found. Please upload JPG, PNG, WebP, or BMP files.'
      });
      return;
    }

    const newEntries = validFiles.map((file) => ({
      id: Date.now() + Math.random().toString(36).substring(2, 8),
      file,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      rotation: 0
    }));

    setImages((prev) => {
      const combined = [...prev, ...newEntries];
      if (!outputFilename && combined.length > 0) {
        const baseName = combined[0].name.replace(/\.[^/.]+$/, '');
        setOutputFilename(`${baseName}_document`);
      }
      return combined;
    });
  };

  // Reordering functions
  const moveImage = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= images.length) return;

    setImages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[newIdx];
      next[newIdx] = temp;
      return next;
    });
  };

  // Rotate image
  const rotateImage = (id) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img
      )
    );
  };

  // Remove single image
  const removeImage = (id) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  // Execute Conversion
  const handleExecuteConvert = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setProgressPercent(20);
    setProgressStatus('Preparing images and normalizing color spaces...');

    try {
      const formData = new FormData();

      // Process each image (applying rotation if user rotated it)
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        let fileToUpload = item.file;

        // If rotated, draw onto canvas and get rotated blob
        if (item.rotation !== 0) {
          const imgEl = new Image();
          imgEl.src = item.previewUrl;
          await new Promise((res) => { imgEl.onload = res; });

          const canvas = document.createElement('canvas');
          if (item.rotation === 90 || item.rotation === 270) {
            canvas.width = imgEl.height;
            canvas.height = imgEl.width;
          } else {
            canvas.width = imgEl.width;
            canvas.height = imgEl.height;
          }

          const ctx = canvas.getContext('2d');
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((item.rotation * Math.PI) / 180);
          ctx.drawImage(imgEl, -imgEl.width / 2, -imgEl.height / 2);

          const rotatedBlob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.95));
          fileToUpload = new File([rotatedBlob], item.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
        }

        formData.append('images', fileToUpload);
      }

      formData.append('pageSize', pageSize);
      formData.append('orientation', orientation);
      formData.append('margin', margin);

      const cleanName = (outputFilename.trim() || 'images_document').replace(/\.pdf$/i, '');
      formData.append('outputFilename', cleanName);

      setProgressPercent(60);
      setProgressStatus('Assembling high-fidelity PDF pages...');

      const response = await fetch('/api/tools/image-to-pdf', {
        method: 'POST',
        body: formData
      });

      setProgressPercent(90);
      setProgressStatus('Finalizing document metadata...');

      if (!response.ok) {
        let errMessage = 'Failed to generate PDF from images.';
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
      const finalPages = Number(response.headers.get('X-Total-Pages')) || images.length;
      const finalSize = blob.size;

      setProgressPercent(100);

      setTimeout(() => {
        setIsProcessing(false);
        setPdfResult({
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
      }, 350);

    } catch (err) {
      console.error('Image to PDF error:', err);
      setIsProcessing(false);
      onShowToast({
        type: 'error',
        message: err.message || 'An error occurred while compiling your PDF.'
      });
    }
  };

  const handleDownload = () => {
    if (!pdfResult) return;
    const a = document.createElement('a');
    a.href = pdfResult.blobUrl;
    a.download = pdfResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    if (pdfResult) URL.revokeObjectURL(pdfResult.blobUrl);
    setImages([]);
    setPdfResult(null);
    setOutputFilename('');
    setPageSize('fit');
    setOrientation('auto');
    setMargin('none');
  };

  const totalBytesLoaded = images.reduce((sum, img) => sum + img.size, 0);

  return (
    <div className="studio-container" id="img-to-pdf-studio-view">
      {/* Top Header & Breadcrumb */}
      <div className="studio-top-bar">
        <button 
          id="img2pdf-back-btn" 
          className="back-btn" 
          onClick={onBackToDashboard}
          title="Back to all tools"
        >
          <ArrowLeft size={16} />
          <span>All Tools</span>
        </button>

        <div className="studio-title-group">
          <h2 className="studio-heading">Image to PDF Converter</h2>
          <span className="studio-subheading">Merge multiple images into a clean, professional PDF document</span>
        </div>

        <div style={{ width: 90 }}>{/* spacer */}</div>
      </div>

      {/* RESULT VIEW */}
      {pdfResult ? (
        <div className="result-card" id="img2pdf-success-result">
          <div className="success-icon-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' }}>
            <Images size={44} />
          </div>

          <div>
            <h3 className="result-title">PDF Successfully Created!</h3>
            <p className="result-subtitle">
              Your images have been unified into <strong>{pdfResult.filename}</strong> with high resolution.
            </p>
          </div>

          <div className="result-stats-grid">
            <div className="result-stat-cell">
              <span className="result-stat-label">Total Pages</span>
              <span className="result-stat-val" style={{ color: '#10b981' }}>{pdfResult.totalPages}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Page Layout</span>
              <span className="result-stat-val" style={{ textTransform: 'capitalize' }}>{pageSize}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">File Size</span>
              <span className="result-stat-val">{formatBytes(pdfResult.size)}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="result-actions-group">
            <button 
              id="download-created-pdf-btn" 
              className="download-btn"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)', boxShadow: '0 4px 25px rgba(16, 185, 129, 0.45)' }}
              onClick={handleDownload}
            >
              <Download size={20} />
              <span>Download PDF Document</span>
            </button>

            <button 
              id="preview-created-pdf-btn"
              type="button"
              className="action-btn-sm"
              style={{ padding: '0.85rem 1.5rem', borderRadius: 14, fontSize: '0.95rem' }}
              onClick={() => setShowPreviewModal(true)}
            >
              <Eye size={17} />
              <span>Preview Result</span>
            </button>

            <button 
              id="convert-more-images-btn" 
              className="reset-btn" 
              onClick={handleReset}
            >
              <RefreshCw size={16} />
              <span>Convert More Images</span>
            </button>
          </div>
        </div>
      ) : images.length === 0 ? (
        /* STAGE 1: DROPZONE */
        <div 
          id="img2pdf-dropzone"
          className={`dropzone-card ${isDraggingOver ? 'dragging-over' : ''}`}
          style={{ borderColor: isDraggingOver ? '#10b981' : 'rgba(16, 185, 129, 0.3)' }}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDraggingOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFilesAdded(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            id="img2pdf-hidden-file-input"
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFilesAdded(e.target.files);
                e.target.value = '';
              }
            }}
          />

          <div className="dropzone-content">
            <div className="dropzone-icon-circle" style={{ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)', color: '#10b981' }}>
              <Images size={38} />
            </div>

            <div>
              <div className="dropzone-primary-text">Drag & drop your images here</div>
              <div className="dropzone-secondary-text">JPG, PNG, WebP, or BMP • Select multiple images at once</div>
            </div>

            <button 
              id="img2pdf-select-files-btn"
              type="button" 
              className="browse-files-btn"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Images size={18} />
              <span>Select Images</span>
            </button>

            <div className="dropzone-meta">
              <span className="meta-chip">Multiple images supported</span>
              <span className="meta-chip">Reorder & rotate</span>
              <span className="meta-chip">Lossless 1:1 fit or A4</span>
              <span className="meta-chip">Zero file retention</span>
            </div>
          </div>
        </div>
      ) : (
        /* STAGE 2: STAGING WORKSPACE */
        <div className="staging-area" id="img2pdf-staging-workspace">
          {/* Header Bar */}
          <div className="staging-header-card">
            <div className="staging-stats">
              <div className="stat-item">
                <span className="stat-label">Total Images</span>
                <span className="stat-value" style={{ color: '#10b981' }}>{images.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Combined Size</span>
                <span className="stat-value">{formatBytes(totalBytesLoaded)}</span>
              </div>
            </div>

            <div className="staging-toolbar">
              <input
                ref={addMoreInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFilesAdded(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              <button 
                id="add-more-images-btn"
                className="action-btn-sm"
                onClick={() => addMoreInputRef.current?.click()}
                title="Add more images to this document"
              >
                <Plus size={15} />
                <span>Add More</span>
              </button>

              <button 
                id="clear-all-images-btn"
                className="action-btn-sm danger"
                onClick={handleReset}
                title="Clear all images"
              >
                <Trash2 size={15} />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Configuration Card */}
          <div className="img2pdf-config-card">
            <div className="img2pdf-options-row">
              {/* Page Sizing */}
              <div className="img2pdf-option-group">
                <label className="input-label">Page Sizing:</label>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segmented-btn ${pageSize === 'fit' ? 'active' : ''}`}
                    onClick={() => setPageSize('fit')}
                  >
                    <span>Fit Image (1:1)</span>
                    <span className="sub-badge">Seamless</span>
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${pageSize === 'a4' ? 'active' : ''}`}
                    onClick={() => setPageSize('a4')}
                  >
                    <span>A4 Standard</span>
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${pageSize === 'letter' ? 'active' : ''}`}
                    onClick={() => setPageSize('letter')}
                  >
                    <span>US Letter</span>
                  </button>
                </div>
              </div>

              {/* Orientation (active if A4 or Letter) */}
              {pageSize !== 'fit' && (
                <div className="img2pdf-option-group">
                  <label className="input-label">Orientation:</label>
                  <div className="segmented-control">
                    <button
                      type="button"
                      className={`segmented-btn ${orientation === 'auto' ? 'active' : ''}`}
                      onClick={() => setOrientation('auto')}
                    >
                      <span>Auto</span>
                    </button>
                    <button
                      type="button"
                      className={`segmented-btn ${orientation === 'portrait' ? 'active' : ''}`}
                      onClick={() => setOrientation('portrait')}
                    >
                      <span>Portrait</span>
                    </button>
                    <button
                      type="button"
                      className={`segmented-btn ${orientation === 'landscape' ? 'active' : ''}`}
                      onClick={() => setOrientation('landscape')}
                    >
                      <span>Landscape</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Margins */}
              {pageSize !== 'fit' && (
                <div className="img2pdf-option-group">
                  <label className="input-label">Margins:</label>
                  <div className="segmented-control">
                    <button
                      type="button"
                      className={`segmented-btn ${margin === 'none' ? 'active' : ''}`}
                      onClick={() => setMargin('none')}
                    >
                      <span>None</span>
                    </button>
                    <button
                      type="button"
                      className={`segmented-btn ${margin === 'small' ? 'active' : ''}`}
                      onClick={() => setMargin('small')}
                    >
                      <span>Small</span>
                    </button>
                    <button
                      type="button"
                      className={`segmented-btn ${margin === 'normal' ? 'active' : ''}`}
                      onClick={() => setMargin('normal')}
                    >
                      <span>Normal</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Output Name */}
              <div className="img2pdf-option-group" style={{ flex: 1.5 }}>
                <label htmlFor="img2pdf-output-filename" className="input-label">PDF File Name:</label>
                <div className="input-with-addon">
                  <input
                    id="img2pdf-output-filename"
                    type="text"
                    className="text-input"
                    value={outputFilename}
                    onChange={(e) => setOutputFilename(e.target.value)}
                    placeholder="images_document"
                  />
                  <span className="input-addon">.pdf</span>
                </div>
              </div>
            </div>

            {/* Images Reordering Grid */}
            <div className="img-reorder-section">
              <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 600 }}>
                Arrange page sequence (Use arrows to reorder, click rotate to orient):
              </span>

              <div className="img-reorder-grid">
                {images.map((item, index) => (
                  <div key={item.id} className="img-reorder-card">
                    <div className="img-card-index-badge">#{index + 1}</div>

                    <div className="img-thumb-frame">
                      <img 
                        src={item.previewUrl} 
                        alt={item.name} 
                        className="img-thumb-preview"
                        style={{ transform: `rotate(${item.rotation}deg)` }}
                      />
                    </div>

                    <div className="img-card-details">
                      <span className="img-card-filename" title={item.name}>{item.name}</span>
                      <span className="img-card-filesize">{formatBytes(item.size)}</span>
                    </div>

                    <div className="img-card-actions">
                      <div className="img-reorder-nav-btns">
                        <button
                          type="button"
                          className="reorder-nav-btn"
                          disabled={index === 0}
                          onClick={() => moveImage(index, -1)}
                          title="Move left"
                        >
                          <ArrowLeftIcon size={14} />
                        </button>
                        <button
                          type="button"
                          className="reorder-nav-btn"
                          disabled={index === images.length - 1}
                          onClick={() => moveImage(index, 1)}
                          title="Move right"
                        >
                          <ArrowRightIcon size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="reorder-nav-btn"
                          onClick={() => rotateImage(item.id)}
                          title="Rotate 90 degrees"
                        >
                          <RotateCw size={14} />
                        </button>

                        <button
                          type="button"
                          className="reorder-nav-btn danger"
                          onClick={() => removeImage(item.id)}
                          title="Remove image"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Action CTA */}
            <button
              id="execute-img2pdf-cta-btn"
              className="img2pdf-action-cta-btn"
              disabled={isProcessing || images.length === 0}
              onClick={handleExecuteConvert}
            >
              <span>Compile {images.length} {images.length === 1 ? 'Image' : 'Images'} into PDF</span>
              <FileCheck size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING MODAL */}
      {isProcessing && (
        <div className="modal-backdrop" id="img2pdf-processing-modal">
          <div className="processing-card">
            <div className="spinner-ring" style={{ borderTopColor: '#10b981', borderRightColor: '#059669' }}></div>

            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                Creating PDF Document...
              </h4>
              <div className="progress-status-text">
                {progressStatus || 'Embedding images into PDF pages...'}
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
              Building byte-accurate vector page dictionary
            </span>
          </div>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {showPreviewModal && pdfResult && (
        <div 
          className="modal-backdrop" 
          onClick={() => setShowPreviewModal(false)}
        >
          <div 
            className="pdf-preview-modal-card" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pdf-preview-modal-header">
              <div className="pdf-preview-header-left">
                <FileCheck size={20} style={{ color: '#10b981' }} />
                <div>
                  <h4 className="pdf-preview-modal-title">{pdfResult.filename}</h4>
                  <div className="pdf-preview-modal-subtitle">
                    <span>{pdfResult.totalPages} Pages</span>
                    <span>•</span>
                    <span>{formatBytes(pdfResult.size)}</span>
                  </div>
                </div>
              </div>

              <div className="pdf-preview-header-actions">
                <button 
                  className="download-btn"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
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
                src={pdfResult.blobUrl} 
                title="Generated PDF Preview"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
