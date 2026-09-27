import { PdfService } from '../services/pdfService.js';

export class ProtectController {
  /**
   * Handle POST /api/tools/protect
   */
  static async protect(req, res) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload a PDF document to protect.'
        });
      }

      // Check mime types and magic bytes (%PDF)
      const isPdfMime = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
      const hasPdfHeader = file.buffer.slice(0, 5).toString() === '%PDF-';
      
      if (!isPdfMime && !hasPdfHeader) {
        return res.status(400).json({
          success: false,
          error: `File "${file.originalname}" is not a valid PDF document.`
        });
      }

      const password = req.body.password;
      if (!password || typeof password !== 'string' || password.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a password to protect the document.'
        });
      }

      const rawFilename = (req.body.outputFilename || 'protected_document').trim();
      const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.pdf$/i, '');
      const finalFilename = `${sanitizedFilename || 'protected_document'}.pdf`;

      const result = await PdfService.protectPdf(file.buffer, password, {
        outputFilename: sanitizedFilename
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
      res.setHeader('Content-Length', result.finalSize);
      res.setHeader('X-Total-Pages', result.totalPages);
      res.setHeader('X-Final-Size', result.finalSize);
      // Expose custom headers to client
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Total-Pages, X-Final-Size');

      return res.end(Buffer.from(result.buffer));
    } catch (error) {
      console.error('Error during PDF protection:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred while encrypting your PDF file.'
      });
    }
  }
}
