import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateSamplePdfs() {
  const outDir = path.resolve('test_samples');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const samples = [
    { name: 'Document_Alpha_Report.pdf', title: 'Document Alpha - Annual Report', pages: 2, color: rgb(0.39, 0.4, 0.95) },
    { name: 'Document_Beta_Contract.pdf', title: 'Document Beta - Master Agreement', pages: 3, color: rgb(0.02, 0.71, 0.83) },
    { name: 'Document_Gamma_Appendix.pdf', title: 'Document Gamma - Technical Appendix', pages: 1, color: rgb(0.06, 0.73, 0.51) }
  ];

  for (const sample of samples) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const subFont = await doc.embedFont(StandardFonts.Helvetica);

    for (let p = 1; p <= sample.pages; p++) {
      const page = doc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();

      // Draw top header band
      page.drawRectangle({
        x: 0,
        y: height - 100,
        width,
        height: 100,
        color: sample.color
      });

      page.drawText(sample.title, {
        x: 40,
        y: height - 60,
        size: 20,
        font,
        color: rgb(1, 1, 1)
      });

      page.drawText(`Page ${p} of ${sample.pages}`, {
        x: 40,
        y: height - 85,
        size: 12,
        font: subFont,
        color: rgb(0.9, 0.9, 0.9)
      });

      page.drawText(`Sample content for ${sample.name}. Page number ${p}.`, {
        x: 40,
        y: height - 160,
        size: 14,
        font: subFont,
        color: rgb(0.2, 0.2, 0.2)
      });
    }

    const bytes = await doc.save();
    const filePath = path.join(outDir, sample.name);
    fs.writeFileSync(filePath, bytes);
    console.log(`Created sample PDF: ${filePath} (${bytes.length} bytes)`);
  }
}

generateSamplePdfs().catch(console.error);
