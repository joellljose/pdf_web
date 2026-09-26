import { PdfService } from '../services/pdfService.js';

export class SplitController {
  /**
   * Handle POST /api/tools/split
   */
  static async split(req, res) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload a single PDF file to split.'
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

      const { mode, ranges, outputFilename } = req.body;
      const cleanName = (outputFilename || 'split_document').trim();
      const sanitizedFilename = cleanName.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.pdf$/i, '');

      const result = await PdfService.splitPdf(file.buffer, {
        mode: mode || 'extract',
        ranges: ranges || '',
        outputFilename: sanitizedFilename
      });

      const finalFilename = `${sanitizedFilename || 'split_document'}${result.extension}`;

      res.setHeader('Content-Type', result.type);
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
      res.setHeader('Content-Length', result.finalSize);
      res.setHeader('X-Output-Files-Count', result.fileCount);
      res.setHeader('X-Final-Size', result.finalSize);
      // Expose custom headers to client
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Output-Files-Count, X-Final-Size');

      return res.end(Buffer.from(result.buffer));
    } catch (error) {
      console.error('Error during PDF split:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred while splitting your PDF file.'
      });
    }
  }
}
