import { PdfService } from '../services/pdfService.js';

export class PdfToWordController {
  /**
   * Handle POST /api/tools/pdf-to-word
   * Converts an uploaded PDF to a .docx Word document
   */
  static async convert(req, res) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload a PDF file to convert.'
        });
      }

      // Validate PDF magic bytes
      const hasPdfHeader = file.buffer.slice(0, 5).toString() === '%PDF-';
      const isPdfMime = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
      if (!hasPdfHeader && !isPdfMime) {
        return res.status(400).json({
          success: false,
          error: `File "${file.originalname}" is not a valid PDF document.`
        });
      }

      const rawFilename = (req.body.outputFilename || file.originalname.replace(/\.pdf$/i, '')).trim();
      const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.docx$/i, '');
      const finalFilename = `${sanitizedFilename || 'converted_document'}.docx`;

      const result = await PdfService.convertPdfToWord(file.buffer, {
        outputFilename: sanitizedFilename,
        originalname: file.originalname
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
      res.setHeader('Content-Length', result.finalSize);
      res.setHeader('X-Total-Pages', result.totalPages);
      res.setHeader('X-Original-Size', file.size);
      res.setHeader('X-Final-Size', result.finalSize);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Total-Pages, X-Original-Size, X-Final-Size');

      return res.end(Buffer.from(result.buffer));
    } catch (error) {
      console.error('Error during PDF to Word conversion:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred during conversion.'
      });
    }
  }
}
