// Quick import test
import { PdfService } from './src/services/pdfService.js';
import { PdfToWordController } from './src/controllers/pdfToWordController.js';

console.log('PdfService:', typeof PdfService);
console.log('PdfToWordController:', typeof PdfToWordController);
console.log('convertPdfToWord method:', typeof PdfService.convertPdfToWord);
console.log('All imports OK');
