import fs from 'fs';
import path from 'path';

async function testMergeApi() {
  const f1 = fs.readFileSync('test_samples/Document_Alpha_Report.pdf');
  const f2 = fs.readFileSync('test_samples/Document_Beta_Contract.pdf');

  const formData = new FormData();
  formData.append('files', new Blob([f1], { type: 'application/pdf' }), 'Document_Alpha_Report.pdf');
  formData.append('files', new Blob([f2], { type: 'application/pdf' }), 'Document_Beta_Contract.pdf');
  formData.append('outputFilename', 'test_merged_output');

  const res = await fetch('http://localhost:5000/api/tools/merge', {
    method: 'POST',
    body: formData
  });

  console.log('Status:', res.status, res.statusText);
  console.log('X-Total-Pages:', res.headers.get('X-Total-Pages'));
  console.log('X-Merged-Files-Count:', res.headers.get('X-Merged-Files-Count'));
  console.log('Content-Type:', res.headers.get('Content-Type'));
  
  const buffer = await res.arrayBuffer();
  console.log('Merged PDF Byte size:', buffer.byteLength);

  if (res.status === 200 && buffer.byteLength > 0) {
    fs.writeFileSync('test_samples/result_merged.pdf', Buffer.from(buffer));
    console.log('Successfully wrote test_samples/result_merged.pdf');
  }
}

testMergeApi().catch(console.error);
