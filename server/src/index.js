import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mergeRoutes from './routes/mergeRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition', 'X-Total-Pages', 'X-Merged-Files-Count', 'X-Original-Size', 'X-Final-Size']
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'PDF Studio API Engine',
    version: '1.0.0',
    supportedTools: ['merge-pdf', 'pdf-info']
  });
});

// Tool Routes
app.use('/api/tools', mergeRoutes);
app.use('/api/pdf', mergeRoutes); // Alias for convenience

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.url}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File size limit exceeded. Maximum file size is 100MB.'
    });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too many files uploaded. Maximum is 40 files.'
    });
  }
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 PDF Studio Server running on http://localhost:${PORT}`);
  console.log(`📡 Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`📑 Merge endpoint: POST http://localhost:${PORT}/api/tools/merge`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
