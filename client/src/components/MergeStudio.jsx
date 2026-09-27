import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, ArrowLeft, Trash2, ArrowUp, ArrowDown, 
  Plus, Check, Download, ExternalLink, RefreshCw, FileCheck, 
  GripVertical, Copy, ArrowUpDown, Shield, AlertTriangle 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function MergeStudio({ onBackToDashboard, onShowToast }) {
  const [files, setFiles] = useState([]);
  const [outputFilename, setOutputFilename] = useState('merged_document');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState(0); // 0: upload, 1: merge, 2: finalize
  const [progressPercent, setProgressPercent] = useState(0);
  const [mergeResult, setMergeResult] = useState(null); // { blobUrl, filename, size, totalPages, fileCount }

  // Drag and drop reordering states
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const fileInputRef = useRef(null);
  const appendFileInputRef = useRef(null);

  // Format bytes to KB / MB
  const formatBytes = (bytes, decimals = 1) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Helper to fetch page count info from backend
  const fetchFileInfo = async (fileObj) => {
    try {
      const formData = new FormData();
      formData.append('file', fileObj.rawFile);
      const res = await fetch('/api/tools/info', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setFiles((prev) =>
            prev.map((item) =>
              item.id === fileObj.id
                ? { ...item, pageCount: json.data.pageCount, title: json.data.title }
                : item
            )
          );
        }
      }
    } catch {
      // Ignore background info fetch failure
    }
  };

  // Handle file addition
  const handleFilesAdded = (incomingFiles) => {
    const validPdfs = [];
    let invalidCount = 0;

    Array.from(incomingFiles).forEach((file) => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        const fileObj = {
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          size: file.size,
          rawFile: file,
          pageCount: null // will be loaded
        };
        validPdfs.push(fileObj);
        // Async query page count
        fetchFileInfo(fileObj);
      } else {
        invalidCount++;
      }
    });

    if (invalidCount > 0) {
      onShowToast({
        type: 'error',
        message: `${invalidCount} file(s) were skipped because they are not valid PDF documents.`
      });
    }

    if (validPdfs.length > 0) {
      setFiles((prev) => [...prev, ...validPdfs]);
      // If user hasn't touched the filename yet, auto-suggest based on first file
      if (files.length === 0 && validPdfs.length > 0) {
        const cleanFirst = validPdfs[0].name.replace(/\.pdf$/i, '');
        setOutputFilename(`${cleanFirst}_merged`);
      }
    }
  };

  // Native input change
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  // Drag & drop files onto dropzone
  const handleDropzoneDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDropzoneDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDropzoneDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Reordering functions
  const moveFile = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= files.length) return;
    const updated = [...files];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setFiles(updated);
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const duplicateFile = (indexToDuplicate) => {
    const item = files[indexToDuplicate];
    const duplicated = {
      ...item,
      id: `${item.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: `${item.name.replace(/\.pdf$/i, '')} (Copy).pdf`
    };
    const updated = [...files];
    updated.splice(indexToDuplicate + 1, 0, duplicated);
    setFiles(updated);
  };

  // Sort helpers
  const handleSortAlphabetical = () => {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
    setFiles(sorted);
    onShowToast({ type: 'success', message: 'Sorted files alphabetically (A-Z).' });
  };

  const handleSortBySize = () => {
    const sorted = [...files].sort((a, b) => b.size - a.size);
    setFiles(sorted);
    onShowToast({ type: 'success', message: 'Sorted files by size (largest first).' });
  };

  // HTML5 Drag and drop item reorder
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
      moveFile(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Execute Merge Operation
  const handleExecuteMerge = async () => {
    if (files.length < 2) {
      onShowToast({
        type: 'error',
        message: 'Please add at least 2 PDF files to merge.'
      });
      return;
    }

    setIsProcessing(true);
    setProgressStage(0);
    setProgressPercent(15);

    try {
      const formData = new FormData();
      files.forEach((fileObj) => {
        formData.append('files', fileObj.rawFile);
      });
      
      const cleanName = (outputFilename.trim() || 'merged_document').replace(/\.pdf$/i, '');
      formData.append('outputFilename', cleanName);

      // Stage 1 animation
      setTimeout(() => {
        setProgressStage(1);
        setProgressPercent(55);
      }, 400);

      const response = await fetch('/api/tools/merge', {
        method: 'POST',
        body: formData
      });

      // Stage 2 animation
      setProgressStage(2);
      setProgressPercent(90);

      if (!response.ok) {
        let errMessage = 'Failed to merge files.';
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
      const totalPages = response.headers.get('X-Total-Pages') || 'Multiple';
      const mergedCount = response.headers.get('X-Merged-Files-Count') || files.length;
      const finalSize = blob.size;

      setProgressPercent(100);

      setTimeout(() => {
        setIsProcessing(false);
        setMergeResult({
          blobUrl,
          filename: `${cleanName}.pdf`,
          size: finalSize,
          totalPages,
          fileCount: mergedCount
        });

        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 400);

    } catch (error) {
      console.error('Merge failure:', error);
      setIsProcessing(false);
      onShowToast({
        type: 'error',
        message: error.message || 'An unexpected error occurred while merging your PDF files.'
      });
    }
  };

  const handleDownload = () => {
    if (!mergeResult) return;
    const a = document.createElement('a');
    a.href = mergeResult.blobUrl;
    a.download = mergeResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreview = () => {
    if (!mergeResult) return;
    window.open(mergeResult.blobUrl, '_blank', 'noopener,noreferrer');
  };

  const handleReset = () => {
    if (mergeResult && mergeResult.blobUrl) {
      URL.revokeObjectURL(mergeResult.blobUrl);
    }
    setFiles([]);
    setMergeResult(null);
    setOutputFilename('merged_document');
  };

  // Calculate totals
  const totalCombinedBytes = files.reduce((acc, curr) => acc + curr.size, 0);
  const knownTotalPages = files.reduce((acc, curr) => acc + (curr.pageCount || 0), 0);

  return (
    <div className="studio-container" id="merge-studio-view">
      {/* Top Header & Breadcrumb */}
      <div className="studio-top-bar">
        <button 
          id="merge-back-btn" 
          className="back-btn" 
          onClick={onBackToDashboard}
          title="Back to all tools"
        >
          <ArrowLeft size={16} />
          <span>All Tools</span>
        </button>

        <div className="studio-title-group">
          <h2 className="studio-heading">Merge PDF Documents</h2>
          <span className="studio-subheading">Combine multiple files into a single, cohesive PDF</span>
        </div>

        <div style={{ width: 90 }}>{/* spacer for centered alignment */}</div>
      </div>

      {/* RESULT VIEW (When merge is completed) */}
      {mergeResult ? (
        <div className="result-card" id="merge-success-result">
          <div className="success-icon-badge">
            <FileCheck size={42} />
          </div>

          <div>
            <h3 className="result-title">PDF Merged Successfully!</h3>
            <p className="result-subtitle">
              Your documents have been perfectly combined into <strong>{mergeResult.filename}</strong>.
            </p>
          </div>

          <div className="result-stats-grid">
            <div className="result-stat-cell">
              <span className="result-stat-label">Files Merged</span>
              <span className="result-stat-val">{mergeResult.fileCount}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Total Pages</span>
              <span className="result-stat-val">{mergeResult.totalPages}</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-label">Output Size</span>
              <span className="result-stat-val">{formatBytes(mergeResult.size)}</span>
            </div>
          </div>

          <div className="result-actions-group">
            <button 
              id="download-merged-pdf-btn" 
              className="download-btn" 
              onClick={handleDownload}
            >
              <Download size={20} />
              <span>Download PDF</span>
            </button>

            <button 
              id="preview-merged-pdf-btn" 
              className="preview-btn" 
              onClick={handlePreview}
            >
              <ExternalLink size={18} />
              <span>Preview in Browser</span>
            </button>

            <button 
              id="merge-another-btn" 
              className="reset-btn" 
              onClick={handleReset}
            >
              <RefreshCw size={16} />
              <span>Merge Another Document</span>
            </button>
          </div>
        </div>
      ) : files.length === 0 ? (
        /* STAGE 1: EMPTY STATE / DROPZONE */
        <div 
          id="pdf-dropzone"
          className={`dropzone-card ${isDraggingOver ? 'dragging-over' : ''}`}
          onDragOver={handleDropzoneDragOver}
          onDragLeave={handleDropzoneDragLeave}
          onDrop={handleDropzoneDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            id="pdf-hidden-file-input"
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <div className="dropzone-content">
            <div className="dropzone-icon-circle">
              <Upload size={38} />
            </div>

            <div>
              <div className="dropzone-primary-text">Drag & drop your PDF files here</div>
              <div className="dropzone-secondary-text">or click to browse from your device</div>
            </div>

            <button 
              id="dropzone-select-files-btn"
              type="button" 
              className="browse-files-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Plus size={18} />
              <span>Select PDF Files</span>
            </button>

            <div className="dropzone-meta">
              <span className="meta-chip">PDF format</span>
              <span className="meta-chip">Multi-file select</span>
              <span className="meta-chip">Zero file retention</span>
            </div>
          </div>
        </div>
      ) : (
        /* STAGE 2: STAGING & REORDERING WORKSPACE */
        <div className="staging-area" id="staging-workspace">
          {/* Staging Summary Header */}
          <div className="staging-header-card">
            <div className="staging-stats">
              <div className="stat-item">
                <span className="stat-label">Files Selected</span>
                <span className="stat-value">{files.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Size</span>
                <span className="stat-value">{formatBytes(totalCombinedBytes)}</span>
              </div>
              {knownTotalPages > 0 && (
                <div className="stat-item">
                  <span className="stat-label">Total Pages</span>
                  <span className="stat-value">{knownTotalPages}</span>
                </div>
              )}
            </div>

            <div className="staging-toolbar">
              <input
                ref={appendFileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />

              <button 
                id="append-more-files-btn"
                className="action-btn-sm"
                onClick={() => appendFileInputRef.current?.click()}
                title="Add more files to merge"
              >
                <Plus size={15} />
                <span>Add Files</span>
              </button>

              <button 
                id="sort-alpha-btn"
                className="action-btn-sm"
                onClick={handleSortAlphabetical}
                title="Sort A to Z"
              >
                <ArrowUpDown size={15} />
                <span>Sort A-Z</span>
              </button>

              <button 
                id="clear-all-files-btn"
                className="action-btn-sm danger"
                onClick={() => setFiles([])}
                title="Remove all files"
              >
                <Trash2 size={15} />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Reorderable File Rows */}
          <div className="file-cards-list" id="staged-files-list">
            {files.map((file, index) => {
              const isDragging = draggedIndex === index;
              const isDragTarget = dragOverIndex === index;

              return (
                <div
                  key={file.id}
                  id={`file-row-${index}`}
                  className={`file-card-row ${isDragging ? 'is-dragging' : ''} ${isDragTarget ? 'drag-over-target' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <div className="drag-handle" title="Drag to reorder file position">
                    <GripVertical size={20} />
                  </div>

                  <div className="file-index-badge">
                    {index + 1}
                  </div>

                  <div className="file-icon-box">
                    <FileText size={22} />
                  </div>

                  <div className="file-main-info">
                    <span className="file-name-text" title={file.name}>
                      {file.name}
                    </span>
                    <div className="file-sub-info">
                      <span className="file-size-chip">{formatBytes(file.size)}</span>
                      {file.pageCount ? (
                        <span className="page-count-chip">
                          {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      ) : (
                        <span className="page-count-chip" style={{ opacity: 0.7 }}>
                          Reading pages...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="file-row-actions">
                    <button
                      className="icon-btn"
                      disabled={index === 0}
                      onClick={() => moveFile(index, index - 1)}
                      title="Move Up"
                      aria-label="Move file up"
                    >
                      <ArrowUp size={15} />
                    </button>

                    <button
                      className="icon-btn"
                      disabled={index === files.length - 1}
                      onClick={() => moveFile(index, index + 1)}
                      title="Move Down"
                      aria-label="Move file down"
                    >
                      <ArrowDown size={15} />
                    </button>

                    <button
                      className="icon-btn"
                      onClick={() => duplicateFile(index)}
                      title="Duplicate File"
                      aria-label="Duplicate this file"
                    >
                      <Copy size={15} />
                    </button>

                    <button
                      className="icon-btn delete-btn"
                      onClick={() => removeFile(index)}
                      title="Remove File"
                      aria-label="Remove this file"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Merge Options & Action CTA */}
          <div className="staging-options-bar">
            <div className="output-name-group">
              <label htmlFor="output-filename-input" className="input-label">
                Custom Output File Name:
              </label>
              <div className="input-with-addon">
                <input
                  id="output-filename-input"
                  type="text"
                  className="text-input"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="merged_document"
                />
                <span className="input-addon">.pdf</span>
              </div>
            </div>

            <button
              id="execute-merge-cta-btn"
              className="merge-action-cta-btn"
              disabled={files.length < 2 || isProcessing}
              onClick={handleExecuteMerge}
            >
              <span>Merge {files.length} PDF Files</span>
              <FileCheck size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING & PROGRESS OVERLAY */}
      {isProcessing && (
        <div className="modal-backdrop" id="processing-modal">
          <div className="processing-card">
            <div className="spinner-ring"></div>

            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                Merging Documents...
              </h4>
              <div className="progress-status-text">
                {progressStage === 0 && 'Streaming and verifying PDF byte streams...'}
                {progressStage === 1 && 'Extracting and stitching document pages in sequence...'}
                {progressStage === 2 && 'Building finalized PDF output file...'}
              </div>
            </div>

            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercent}%` }}
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
