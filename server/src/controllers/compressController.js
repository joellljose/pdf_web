import { PdfService } from '../services/pdfService.js';

export class CompressController {
  /**
   * Handle POST /api/tools/compress
   */
  static async compress(req, res) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload a PDF document to compress.'
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

      const level = req.body.level || 'recommended';
      const password = req.body.password || '';

      const rawFilename = (req.body.outputFilename || file.originalname.replace(/\.pdf$/i, '') + '_compressed').trim();
      const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.pdf$/i, '');
      const finalFilename = `${sanitizedFilename || 'compressed_document'}.pdf`;

      const result = await PdfService.compressPdf(file.buffer, {
        level,
        password,
        outputFilename: sanitizedFilename
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
      res.setHeader('Content-Length', result.finalSize);
      res.setHeader('X-Original-Size', result.originalSize);
      res.setHeader('X-Final-Size', result.finalSize);
      res.setHeader('X-Savings-Percent', result.savingsPercent);
      res.setHeader('X-Total-Pages', result.totalPages);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Total-Pages, X-Original-Size, X-Final-Size, X-Savings-Percent');

      return res.end(Buffer.from(result.buffer));
    } catch (error) {
      console.error('Error during PDF compression:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred while compressing your PDF file.'
      });
    }
  }
}
