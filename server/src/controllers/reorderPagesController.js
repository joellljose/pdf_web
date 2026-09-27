import { PdfService } from '../services/pdfService.js';

export class ReorderPagesController {
  /**
   * Handle POST /api/tools/reorder-pages
   */
  static async reorderPages(req, res) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload a PDF document.'
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

      const pageOrder = req.body.pageOrder;
      if (!pageOrder) {
        return res.status(400).json({
          success: false,
          error: 'Please specify the new page order.'
        });
      }

      const rawFilename = (req.body.outputFilename || 'reordered_document').trim();
      const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.pdf$/i, '');
      const finalFilename = `${sanitizedFilename || 'reordered_document'}.pdf`;

      const result = await PdfService.reorderPages(file.buffer, pageOrder, {
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
      console.error('Error reordering PDF pages:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while reordering pages in your PDF.'
      });
    }
  }
}
