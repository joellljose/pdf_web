import fs from 'fs';

async function testSplitApi() {
  const f = fs.readFileSync('test_samples/Document_Beta_Contract.pdf'); // 3 pages

  // Test 1: Extract pages 1 and 3
  const form1 = new FormData();
  form1.append('file', new Blob([f], { type: 'application/pdf' }), 'Document_Beta_Contract.pdf');
  form1.append('mode', 'extract');
  form1.append('ranges', '1, 3');
  form1.append('outputFilename', 'contract_pages_1_and_3');

  const res1 = await fetch('http://localhost:5000/api/tools/split', {
    method: 'POST',
    body: form1
  });

  console.log('Extract Test Status:', res1.status, res1.headers.get('Content-Type'));
  const buf1 = await res1.arrayBuffer();
  console.log('Extracted PDF Size:', buf1.byteLength);

  // Test 2: Split all pages into ZIP
  const form2 = new FormData();
  form2.append('file', new Blob([f], { type: 'application/pdf' }), 'Document_Beta_Contract.pdf');
  form2.append('mode', 'split');
  form2.append('ranges', '1-3');
  form2.append('outputFilename', 'contract_all_split');

  const res2 = await fetch('http://localhost:5000/api/tools/split', {
    method: 'POST',
    body: form2
  });

  console.log('ZIP Test Status:', res2.status, res2.headers.get('Content-Type'));
  const buf2 = await res2.arrayBuffer();
  console.log('ZIP File Size:', buf2.byteLength);

  if (res1.status === 200 && res2.status === 200) {
    console.log('🎉 All Split API tests passed successfully!');
  }
}

testSplitApi().catch(console.error);
