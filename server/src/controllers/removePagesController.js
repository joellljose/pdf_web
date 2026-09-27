import { PdfService } from '../services/pdfService.js';

export class RemovePagesController {
  /**
   * Handle POST /api/tools/remove-pages
   */
  static async removePages(req, res) {
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

      const pagesToRemove = req.body.pagesToRemove;
      if (!pagesToRemove) {
        return res.status(400).json({
          success: false,
          error: 'Please specify the pages to remove.'
        });
      }

      const rawFilename = (req.body.outputFilename || 'pages_removed').trim();
      const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.pdf$/i, '');
      const finalFilename = `${sanitizedFilename || 'pages_removed'}.pdf`;

      const result = await PdfService.removePages(file.buffer, pagesToRemove, {
        outputFilename: sanitizedFilename
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
      res.setHeader('Content-Length', result.finalSize);
      res.setHeader('X-Remaining-Pages', result.remainingPages);
      res.setHeader('X-Removed-Pages-Count', result.removedPagesCount);
      res.setHeader('X-Final-Size', result.finalSize);
      // Expose custom headers to client
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Remaining-Pages, X-Removed-Pages-Count, X-Final-Size');

      return res.end(Buffer.from(result.buffer));
    } catch (error) {
      console.error('Error removing PDF pages:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while removing pages from your PDF.'
      });
    }
  }
}
