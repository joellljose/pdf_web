import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { encryptPDF, AlreadyEncryptedError } from '@pdfsmaller/pdf-encrypt-lite';
import { PDFParse } from 'pdf-parse';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TableRow,
  TableCell,
  Table,
  WidthType,
  ShadingType
} from 'docx';

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
      const zip = new JSZip();
      
      for (let i = 0; i < targetIndices.length; i++) {
        const pageIndex = targetIndices[i];
        const singlePdf = await PDFDocument.create();
        const [copiedPage] = await singlePdf.copyPages(srcDoc, [pageIndex]);
        singlePdf.addPage(copiedPage);
        
        singlePdf.setTitle(`${cleanName} - Page ${pageIndex + 1}`);
        const singlePdfBytes = await singlePdf.save();
        
        zip.file(`${cleanName}_page_${pageIndex + 1}.pdf`, singlePdfBytes);
      }
      
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      
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

  /**
   * Encrypts a PDF buffer with a user password
   * @param {Buffer} buffer - Original PDF buffer
   * @param {string} password - Password to protect the document
   * @param {Object} options - Additional options (outputFilename)
   * @returns {Promise<{ buffer: Uint8Array, finalSize: number, totalPages: number }>}
   */
  static async protectPdf(buffer, password, options = {}) {
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      throw new Error('A valid password is required to protect the PDF document.');
    }

    let totalPages = 1;
    try {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      totalPages = doc.getPageCount();
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('password')) {
        throw new Error('This PDF document is already password protected.');
      }
      throw new Error(`Failed to read PDF: ${err.message}`);
    }

    try {
      const encryptedBytes = await encryptPDF(buffer, password.trim());
      return {
        buffer: encryptedBytes,
        finalSize: encryptedBytes.length,
        totalPages
      };
    } catch (err) {
      if (err instanceof AlreadyEncryptedError || err.message?.toLowerCase().includes('already encrypted')) {
        throw new Error('This PDF document is already encrypted.');
      }
      throw new Error(`Failed to encrypt document: ${err.message}`);
    }
  }

  /**
   * Removes specific pages from a PDF document
   * @param {Buffer} buffer - Original PDF buffer
   * @param {string | number[]} pagesToRemove - 1-indexed pages or range string to delete
   * @param {Object} options - outputFilename, title
   * @returns {Promise<{ buffer: Uint8Array, finalSize: number, remainingPages: number, removedPagesCount: number }>}
   */
  static async removePages(buffer, pagesToRemove, options = {}) {
    let srcDoc;
    try {
      srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('password')) {
        throw new Error('This PDF is password protected. Please unlock it before removing pages.');
      }
      throw new Error(`Failed to load PDF: ${err.message}`);
    }

    const totalPages = srcDoc.getPageCount();
    let toRemoveIndices = [];

    if (typeof pagesToRemove === 'string') {
      toRemoveIndices = parseRanges(pagesToRemove, totalPages);
    } else if (Array.isArray(pagesToRemove)) {
      toRemoveIndices = pagesToRemove.map(p => Number(p) - 1).filter(p => p >= 0 && p < totalPages);
    }

    const removeSet = new Set(toRemoveIndices);
    if (removeSet.size === 0) {
      throw new Error('No valid pages selected for removal.');
    }

    if (removeSet.size >= totalPages) {
      throw new Error('Cannot remove all pages from the document. At least one page must remain.');
    }

    const newPdf = await PDFDocument.create();
    const keepIndices = [];
    for (let i = 0; i < totalPages; i++) {
      if (!removeSet.has(i)) {
        keepIndices.push(i);
      }
    }

    const copiedPages = await newPdf.copyPages(srcDoc, keepIndices);
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const cleanTitle = (options.outputFilename || 'document_pages_removed').replace(/\.pdf$/i, '');
    newPdf.setTitle(cleanTitle);
    newPdf.setProducer('PDF Studio Platform');

    const newPdfBytes = await newPdf.save();

    return {
      buffer: newPdfBytes,
      finalSize: newPdfBytes.length,
      remainingPages: keepIndices.length,
      removedPagesCount: removeSet.size
    };
  }

  /**
   * Reorders pages in a PDF document according to a specified sequence
   * @param {Buffer} buffer - Original PDF buffer
   * @param {number[] | string} pageOrder - Array or comma-separated string of 1-indexed page numbers in desired order
   * @param {Object} options - outputFilename
   * @returns {Promise<{ buffer: Uint8Array, finalSize: number, totalPages: number }>}
   */
  static async reorderPages(buffer, pageOrder, options = {}) {
    let srcDoc;
    try {
      srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('password')) {
        throw new Error('This PDF is password protected. Please unlock it before reordering pages.');
      }
      throw new Error(`Failed to load PDF: ${err.message}`);
    }

    const totalPages = srcDoc.getPageCount();
    let orderArray = [];

    if (typeof pageOrder === 'string') {
      orderArray = pageOrder.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    } else if (Array.isArray(pageOrder)) {
      orderArray = pageOrder.map(n => Number(n)).filter(n => !isNaN(n));
    }

    if (orderArray.length === 0) {
      throw new Error('Please specify a valid page order.');
    }

    const validZeroIndices = [];
    for (const p of orderArray) {
      if (p < 1 || p > totalPages) {
        throw new Error(`Invalid page number ${p}. Document only has ${totalPages} pages.`);
      }
      validZeroIndices.push(p - 1);
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(srcDoc, validZeroIndices);

    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const cleanTitle = (options.outputFilename || 'reordered_document').replace(/\.pdf$/i, '');
    newPdf.setTitle(cleanTitle);
    newPdf.setProducer('PDF Studio Platform');

    const newPdfBytes = await newPdf.save();

    return {
      buffer: newPdfBytes,
      finalSize: newPdfBytes.length,
      totalPages: validZeroIndices.length
    };
  }

  /**
   * Converts a PDF buffer to a Word (.docx) document
   * @param {Buffer} buffer - Original PDF buffer
   * @param {Object} options - { outputFilename, originalname }
   * @returns {Promise<{ buffer: Buffer, finalSize: number, totalPages: number, wordCount: number }>}
   */
  static async convertPdfToWord(buffer, options = {}) {
    let textResult;
    let infoResult;
    try {
      const parser = new PDFParse({ data: buffer });
      textResult = await parser.getText();
      infoResult = await parser.getInfo();
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('password')) {
        throw new Error('This PDF is password protected. Please unlock it before converting.');
      }
      throw new Error(`Failed to parse PDF: ${err.message}`);
    }

    const rawText = textResult.text || '';
    const totalPages = textResult.total || 1;
    const pdfInfo = infoResult.info || {};

    // 2. Split the raw text into paragraphs (split on blank lines or page breaks)
    const lines = rawText.split(/\r?\n/);
    const paragraphs = [];
    let currentBlock = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        if (currentBlock.length > 0) {
          paragraphs.push(currentBlock.join(' '));
          currentBlock = [];
        }
      } else {
        currentBlock.push(trimmed);
      }
    }
    if (currentBlock.length > 0) {
      paragraphs.push(currentBlock.join(' '));
    }

    const wordCount = rawText.split(/\s+/).filter(Boolean).length;

    const docTitle = pdfInfo.Title || options.outputFilename || options.originalname?.replace(/\.pdf$/i, '') || 'Converted Document';
    const docAuthor = pdfInfo.Author || '';
    const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // 3. Build DOCX sections
    const docChildren = [];

    // Title
    docChildren.push(
      new Paragraph({
        text: docTitle,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Author if available
    if (docAuthor) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: `Author: ${docAuthor}`,
              italics: true,
              size: 22,
              color: '555555'
            })
          ]
        })
      );
    }

    // Conversion metadata
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `Converted from PDF on ${now}  •  ${totalPages} page${totalPages !== 1 ? 's' : ''}  •  ${wordCount.toLocaleString()} words`,
            size: 18,
            color: '888888'
          })
        ]
      })
    );

    // Horizontal rule (simulated by a paragraph with bottom border)
    docChildren.push(
      new Paragraph({
        spacing: { after: 400 },
        border: {
          bottom: {
            color: 'CCCCCC',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        }
      })
    );

    // Body content
    if (paragraphs.length === 0) {
      docChildren.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: '(No extractable text content found in this PDF. The document may contain scanned images or non-selectable text.)',
              italics: true,
              color: '888888',
              size: 22
            })
          ]
        })
      );
    } else {
      for (const para of paragraphs) {
        if (!para.trim()) continue;

        // Heuristic: if line is short (≤80 chars) and title-cased, treat as a section heading
        const isLikelyHeading =
          para.length <= 80 &&
          para.length > 2 &&
          !/[.,:;!?]$/.test(para) &&
          /^[A-Z]/.test(para) &&
          para.split(' ').filter(Boolean).length <= 10;

        if (isLikelyHeading) {
          docChildren.push(
            new Paragraph({
              text: para,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 120 }
            })
          );
        } else {
          docChildren.push(
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: para,
                  size: 24,
                  font: 'Calibri'
                })
              ]
            })
          );
        }
      }
    }

    // Footer note
    docChildren.push(
      new Paragraph({
        spacing: { before: 600 },
        border: {
          top: {
            color: 'EEEEEE',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 4
          }
        },
        children: [
          new TextRun({
            text: `Converted by PDF Studio Platform  •  ${totalPages} page(s)  •  ${wordCount.toLocaleString()} words extracted`,
            size: 16,
            color: 'AAAAAA',
            italics: true
          })
        ]
      })
    );

    // 4. Create and pack the document
    const doc = new Document({
      creator: 'PDF Studio Platform',
      description: `Converted from ${options.originalname || 'PDF document'}`,
      title: docTitle,
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: 24
            },
            paragraph: {
              spacing: { line: 276 }
            }
          }
        }
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440
              }
            }
          },
          children: docChildren
        }
      ]
    });

    const docxBuffer = await Packer.toBuffer(doc);

    return {
      buffer: docxBuffer,
      finalSize: docxBuffer.length,
      totalPages,
      wordCount
    };
  }
}



