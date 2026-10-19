import { PdfService } from '../services/pdfService.js';

export class PdfToImgController {
  /**
   * Handle POST /api/tools/pdf-to-img
   */
  static async convert(req, res) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload a PDF document to convert to images.'
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

      const format = req.body.format || 'png';
      const dpi = Number(req.body.dpi) || 150;
      const quality = Number(req.body.quality) || 90;
      const asZip = req.body.asZip === 'true' || req.body.asZip === true;

      const rawFilename = (req.body.outputFilename || file.originalname.replace(/\.pdf$/i, '') + '_images').trim();
      const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

      const result = await PdfService.pdfToImages(file.buffer, {
        format,
        dpi,
        quality,
        asZip,
        outputFilename: sanitizedFilename
      });

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.buffer.length);
      res.setHeader('X-Total-Pages', result.fileCount);
      res.setHeader('X-Is-Zip', result.isZip ? '1' : '0');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Total-Pages, X-Is-Zip');

      return res.end(result.buffer);
    } catch (error) {
      console.error('Error during PDF to Image conversion:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred while converting PDF to images.'
      });
    }
  }
}
