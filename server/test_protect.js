import fs from 'fs';

async function testProtectApi() {
  const f = fs.readFileSync('test_samples/Document_Alpha_Report.pdf');

  const formData = new FormData();
  formData.append('file', new Blob([f], { type: 'application/pdf' }), 'Document_Alpha_Report.pdf');
  formData.append('password', 'SuperSecret2026!');
  formData.append('outputFilename', 'alpha_protected');

  const res = await fetch('http://localhost:5000/api/tools/protect', {
    method: 'POST',
    body: formData
  });

  console.log('Protect Test Status:', res.status, res.headers.get('Content-Type'));
  console.log('X-Total-Pages:', res.headers.get('X-Total-Pages'));
  console.log('Content-Disposition:', res.headers.get('Content-Disposition'));

  const buf = await res.arrayBuffer();
  console.log('Protected PDF Byte Size:', buf.byteLength);

  if (res.status === 200 && buf.byteLength > 0) {
    fs.writeFileSync('test_samples/api_test_protected.pdf', Buffer.from(buf));
    console.log('🎉 Protect API passed! Saved test_samples/api_test_protected.pdf');
  }
}

testProtectApi().catch(console.error);
