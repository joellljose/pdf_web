import { PDFDocument } from 'pdf-lib';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

/**
 * Helper to parse a page range string (e.g. "1, 3, 5-8") into an array of 0-indexed page numbers.
 */
function parseRanges(rangeStr, maxPages) {
  if (!rangeStr || typeof rangeStr !== 'string') return [];
  const pages = new Set();
  const parts = rangeStr.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim(), 10));
      if (isNaN(start) || isNaN(end)) continue;
      
      const actualStart = Math.max(1, start);
      const actualEnd = Math.min(maxPages, end);
      
      for (let i = actualStart; i <= actualEnd; i++) {
        pages.add(i - 1); // convert to 0-indexed
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        pages.add(p - 1); // convert to 0-indexed
      }
    }
  }
  
  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Helper to convert an archiver stream into a Buffer
 */
function streamToBuffer(archiveStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    archiveStream.on('data', chunk => chunks.push(chunk));
    archiveStream.on('end', () => resolve(Buffer.concat(chunks)));
    archiveStream.on('error', err => reject(err));
  });
}

/**
 * Service to handle PDF operations using pdf-lib
 */
export class PdfService {
  /**
   * Merges multiple PDF file buffers into a single PDF
   * @param {Array<{ buffer: Buffer, originalname: string, size: number }>} files 
   * @param {Object} options - Options such as outputFilename, title
   * @returns {Promise<{ buffer: Uint8Array, totalPages: number, fileCount: number, originalTotalSize: number, finalSize: number }>}
   */
  static async mergePdfs(files, options = {}) {
    if (!files || files.length < 2) {
      throw new Error('At least 2 PDF files are required for merging');
    }

    const mergedPdf = await PDFDocument.create();
    let totalPages = 0;
    let originalTotalSize = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      originalTotalSize += file.size || file.buffer.length;

      try {
        const srcDoc = await PDFDocument.load(file.buffer, { 
          ignoreEncryption: false,
          updateMetadata: false 
        });

        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);

        for (const page of copiedPages) {
          mergedPdf.addPage(page);
          totalPages++;
        }
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('password')) {
          throw new Error(`File "${file.originalname}" is password protected. Please unlock it before merging.`);
        }
        throw new Error(`Failed to parse "${file.originalname}": ${err.message}`);
      }
    }

    mergedPdf.setTitle(options.title || 'Merged Document');
    mergedPdf.setProducer('PDF Studio Platform');
    mergedPdf.setCreator('PDF Studio Merger');
    mergedPdf.setCreationDate(new Date());

    const mergedPdfBytes = await mergedPdf.save();

    return {
      buffer: mergedPdfBytes,
      totalPages,
      fileCount: files.length,
      originalTotalSize,
      finalSize: mergedPdfBytes.length
    };
  }

  /**
   * Reads metadata and page count of a single PDF buffer
   * @param {Buffer} buffer 
   * @param {string} originalname 
   * @returns {Promise<{ pageCount: number, title: string, author: string, producer: string }>}
   */
  static async getPdfInfo(buffer, originalname = '') {
    try {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      return {
        filename: originalname,
        pageCount: doc.getPageCount(),
        title: doc.getTitle() || originalname,
        author: doc.getAuthor() || '',
        producer: doc.getProducer() || '',
        creationDate: doc.getCreationDate() || null
      };
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('password')) {
        return {
          filename: originalname,
          isEncrypted: true,
          error: 'Password protected'
        };
      }
      throw new Error(`Failed to read PDF "${originalname}": ${err.message}`);
    }
  }

  /**
   * Splits or extracts pages from a single PDF
   * @param {Buffer} buffer 
   * @param {Object} options - { mode: 'extract' | 'split', ranges: string, outputFilename: string }
   * @returns {Promise<{ buffer: Buffer | Uint8Array, type: string, extension: string, fileCount: number, finalSize: number }>}
   */
  static async splitPdf(buffer, options = {}) {
    let srcDoc;
    try {
      srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('password')) {
        throw new Error('File is password protected. Please unlock it first.');
      }
      throw new Error(`Failed to parse PDF: ${err.message}`);
    }

    const totalPages = srcDoc.getPageCount();
    const mode = options.mode || 'extract';
    const rangeStr = options.ranges || `1-${totalPages}`;
    const cleanName = (options.outputFilename || 'split_document').replace(/\.pdf$/i, '');

    const targetIndices = parseRanges(rangeStr, totalPages);
    if (targetIndices.length === 0) {
      throw new Error('No valid pages found in the specified range.');
    }

    if (mode === 'extract') {
      // Create a single PDF with only the extracted pages
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(srcDoc, targetIndices);
      
      for (const page of copiedPages) {
        newPdf.addPage(page);
      }
      
      newPdf.setTitle(`${cleanName} (Extracted)`);
      newPdf.setProducer('PDF Studio Platform');
      
      const newPdfBytes = await newPdf.save();
      
      return {
        buffer: newPdfBytes,
        type: 'application/pdf',
        extension: '.pdf',
        fileCount: 1,
        finalSize: newPdfBytes.length
      };
    } else if (mode === 'split') {
      // Create a ZIP containing a separate PDF for each extracted page
      const archive = archiver('zip', { zlib: { level: 9 } });
      const bufferPromise = streamToBuffer(archive);
      
      for (let i = 0; i < targetIndices.length; i++) {
        const pageIndex = targetIndices[i];
        const singlePdf = await PDFDocument.create();
        const [copiedPage] = await singlePdf.copyPages(srcDoc, [pageIndex]);
        singlePdf.addPage(copiedPage);
        
        singlePdf.setTitle(`${cleanName} - Page ${pageIndex + 1}`);
        const singlePdfBytes = await singlePdf.save();
        
        archive.append(Buffer.from(singlePdfBytes), { name: `${cleanName}_page_${pageIndex + 1}.pdf` });
      }
      
      archive.finalize();
      const zipBuffer = await bufferPromise;
      
      return {
        buffer: zipBuffer,
        type: 'application/zip',
        extension: '.zip',
        fileCount: targetIndices.length,
        finalSize: zipBuffer.length
      };
    }
    
    throw new Error('Invalid split mode. Must be "extract" or "split".');
  }
}
