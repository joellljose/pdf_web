import fs from 'fs';
import { PdfService } from './src/services/pdfService.js';

async function testRemovePages() {
  const f = fs.readFileSync('test_samples/Document_Beta_Contract.pdf'); // 3 pages

  const result = await PdfService.removePages(f, '2', { outputFilename: 'contract_page2_removed' });
  console.log('Original: 3 pages');
  console.log('Remaining pages:', result.remainingPages);
  console.log('Removed pages count:', result.removedPagesCount);
  console.log('Output byte size:', result.finalSize);

  if (result.remainingPages === 2 && result.removedPagesCount === 1) {
    fs.writeFileSync('test_samples/test_removed_pages.pdf', Buffer.from(result.buffer));
    console.log('🎉 removePages unit test passed!');
  }
}

testRemovePages().catch(console.error);
