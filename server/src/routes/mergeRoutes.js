import express from 'express';
import multer from 'multer';
import { MergeController } from '../controllers/mergeController.js';
import { SplitController } from '../controllers/splitController.js';

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

// Info endpoint for single file
router.post('/info', upload.single('file'), MergeController.getInfo);

export default router;
