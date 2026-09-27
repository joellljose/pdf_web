import { PDFDocument } from 'pdf-lib';

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
        // If password protected or corrupted, give descriptive error
        if (err.message && err.message.toLowerCase().includes('password')) {
          throw new Error(`File "${file.originalname}" is password protected. Please unlock it before merging.`);
        }
        throw new Error(`Failed to parse "${file.originalname}": ${err.message}`);
      }
    }

    // Set document metadata
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
}
