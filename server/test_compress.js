import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PdfService } from './src/services/pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  console.log('🧪 Starting Compress PDF Service Test...');

  const samplePath = path.join(__dirname, 'test_samples', 'Document_Beta_Contract.pdf');
  const buffer = fs.readFileSync(samplePath);

  console.log(`📄 Input document: ${samplePath} (${buffer.length} bytes)`);

  const levels = ['recommended', 'extreme', 'low'];

  for (const level of levels) {
    console.log(`\n⚙️ Testing compression level: "${level}"...`);
    const start = Date.now();
    const result = await PdfService.compressPdf(buffer, {
      level,
      outputFilename: `contract_${level}`
    });
    const elapsed = Date.now() - start;

    console.log(`✅ Success in ${elapsed}ms:`, {
      originalSize: result.originalSize,
      finalSize: result.finalSize,
      savingsPercent: result.savingsPercent + '%',
      totalPages: result.totalPages,
      bufferType: result.buffer.constructor.name,
      validPdfHeader: result.buffer.slice(0, 5).toString()
    });

    // Save test output
    const outPath = path.join(__dirname, 'test_samples', `test_out_compress_${level}.pdf`);
    fs.writeFileSync(outPath, result.buffer);
    console.log(`💾 Saved test file to ${outPath}`);
  }

  console.log('\n🎉 All compression service tests completed successfully!');
}

runTest().catch((err) => {
  console.error('❌ Compression test failed:', err);
  process.exit(1);
});
