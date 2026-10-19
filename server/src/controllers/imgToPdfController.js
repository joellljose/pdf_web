import { PdfService } from '../services/pdfService.js';

export class ImgToPdfController {
  /**
   * Handle POST /api/tools/image-to-pdf
   */
  static async convert(req, res) {
    try {
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please upload at least one image file.'
        });
      }

      // Validate that uploaded files are images
      for (const file of files) {
        const isImageMime = file.mimetype.startsWith('image/');
        const isImageExt = /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.originalname);
        if (!isImageMime && !isImageExt) {
          return res.status(400).json({
            success: false,
            error: `File "${file.originalname}" is not a supported image format.`
          });
        }
      }

      const pageSize = req.body.pageSize || 'fit';
      const orientation = req.body.orientation || 'auto';
      const margin = req.body.margin || 'none';

      const rawFilename = (req.body.outputFilename || 'images_combined').trim();
      const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.pdf$/i, '');
      const finalFilename = `${sanitizedFilename || 'images_combined'}.pdf`;

      const result = await PdfService.imageToPdf(files, {
        pageSize,
        orientation,
        margin,
        outputFilename: sanitizedFilename
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
      res.setHeader('Content-Length', result.finalSize);
      res.setHeader('X-Total-Pages', result.totalPages);
      res.setHeader('X-Final-Size', result.finalSize);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Total-Pages, X-Final-Size');

      return res.end(Buffer.from(result.buffer));
    } catch (error) {
      console.error('Error during Image to PDF conversion:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred while converting images to PDF.'
      });
    }
  }
}
