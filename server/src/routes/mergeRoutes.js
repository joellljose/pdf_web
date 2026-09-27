import express from 'express';
import multer from 'multer';
import { MergeController } from '../controllers/mergeController.js';
import { SplitController } from '../controllers/splitController.js';
import { ProtectController } from '../controllers/protectController.js';
import { RemovePagesController } from '../controllers/removePagesController.js';
import { ReorderPagesController } from '../controllers/reorderPagesController.js';
import { PdfToWordController } from '../controllers/pdfToWordController.js';

const router = express.Router();

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB per file limit
    files: 40 // Up to 40 files at once
  },
  fileFilter: (req, file, cb) => {
    // Basic file filter
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error(`File "${file.originalname}" is not a PDF.`));
    }
  }
});

// Merging endpoint
router.post('/merge', upload.array('files', 40), MergeController.merge);

// Splitting endpoint
router.post('/split', upload.single('file'), SplitController.split);

// Protect endpoint
router.post('/protect', upload.single('file'), ProtectController.protect);

// Remove Pages endpoint
router.post('/remove-pages', upload.single('file'), RemovePagesController.removePages);

// Reorder Pages endpoint
router.post('/reorder-pages', upload.single('file'), ReorderPagesController.reorderPages);

// PDF to Word (DOCX) conversion endpoint
router.post('/pdf-to-word', upload.single('file'), PdfToWordController.convert);

// Info endpoint for single file
router.post('/info', upload.single('file'), MergeController.getInfo);

export default router;
