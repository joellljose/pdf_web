import fs from 'fs';
import { PdfService } from './src/services/pdfService.js';

async function runSplitTest() {
  console.log('--- Testing Split Functionality Directly ---');
  const buffer = fs.readFileSync('test_samples/result_merged.pdf');
  
  const info = await PdfService.getPdfInfo(buffer, 'result_merged.pdf');
  console.log('Input PDF Info:', info);

  // Test 1: Extract pages 1-2 into single PDF
  console.log('\nTest 1: Extracting pages 1-2 into single PDF...');
  const extractResult = await PdfService.splitPdf(buffer, {
    mode: 'extract',
    ranges: '1-2',
    outputFilename: 'extracted_sample'
  });
  console.log('Extract result type:', extractResult.type, 'Extension:', extractResult.extension, 'Size:', extractResult.finalSize);
  fs.writeFileSync('test_samples/test_extract_1_2.pdf', Buffer.from(extractResult.buffer));
  console.log('Saved test_samples/test_extract_1_2.pdf');

  // Verify extracted PDF
  const extractedInfo = await PdfService.getPdfInfo(Buffer.from(extractResult.buffer), 'test_extract_1_2.pdf');
  console.log('Extracted PDF Page Count:', extractedInfo.pageCount);
  if (extractedInfo.pageCount !== 2) {
    throw new Error(`Expected 2 pages in extracted PDF, got ${extractedInfo.pageCount}`);
  }

  // Test 2: Split all pages into ZIP
  console.log('\nTest 2: Splitting pages into separate files (ZIP)...');
  const splitResult = await PdfService.splitPdf(buffer, {
    mode: 'split',
    ranges: '1-3',
    outputFilename: 'split_sample'
  });
  console.log('Split result type:', splitResult.type, 'Extension:', splitResult.extension, 'File count:', splitResult.fileCount, 'Size:', splitResult.finalSize);
  fs.writeFileSync('test_samples/test_split.zip', Buffer.from(splitResult.buffer));
  console.log('Saved test_samples/test_split.zip');

  console.log('\n✅ All Split tests passed accurately!');
}

runSplitTest().catch(err => {
  console.error('❌ Split test failed:', err);
  process.exit(1);
});
