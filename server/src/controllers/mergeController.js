import { PdfService } from '../services/pdfService.js';

export class MergeController {
  /**
   * Handle POST /api/tools/merge
   */
  static async merge(req, res) {
    try {
      const files = req.files;

      if (!files || files.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Please upload at least 2 PDF files to merge.'
        });
      }

      // Check mime types and magic bytes (%PDF)
      for (const file of files) {
        const isPdfMime = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
        const hasPdfHeader = file.buffer.slice(0, 5).toString() === '%PDF-';
        
        if (!isPdfMime && !hasPdfHeader) {
          return res.status(400).json({
            success: false,
            error: `File "${file.originalname}" is not a valid PDF document.`
          });
        }
      }

      const rawFilename = (req.body.outputFilename || 'merged_document').trim();
      const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.pdf$/i, '');
      const finalFilename = `${sanitizedFilename || 'merged_document'}.pdf`;

      const result = await PdfService.mergePdfs(files, {
        title: sanitizedFilename
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
      res.setHeader('Content-Length', result.finalSize);
      res.setHeader('X-Total-Pages', result.totalPages);
      res.setHeader('X-Merged-Files-Count', result.fileCount);
      res.setHeader('X-Original-Size', result.originalTotalSize);
      res.setHeader('X-Final-Size', result.finalSize);
      // Expose custom headers to client
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Total-Pages, X-Merged-Files-Count, X-Original-Size, X-Final-Size');

      return res.end(Buffer.from(result.buffer));
    } catch (error) {
      console.error('Error during PDF merge:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred while merging your PDF files.'
      });
    }
  }

  /**
   * Handle POST /api/tools/pdf-info
   */
  static async getInfo(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No PDF file provided.' });
      }

      const info = await PdfService.getPdfInfo(file.buffer, file.originalname);
      return res.json({
        success: true,
        data: {
          ...info,
          size: file.size
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to inspect PDF.'
      });
    }
  }
}
