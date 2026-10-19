import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Loads a PDF Document from a File or Blob object
 */
export async function loadPdfDocument(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

/**
 * Renders a specific page onto an HTML5 canvas element
 */
export async function renderPageThumbnail(pdfDoc, pageNumber, canvas, scale = 0.4) {
  if (!pdfDoc || !canvas) return;

  try {
    if (canvas._currentRenderTask) {
      try {
        canvas._currentRenderTask.cancel();
      } catch (_) {}
      canvas._currentRenderTask = null;
    }

    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    const renderTask = page.render(renderContext);
    canvas._currentRenderTask = renderTask;
    await renderTask.promise;
    canvas._currentRenderTask = null;
  } catch (err) {
    if (err?.name !== 'RenderingCancelledException') {
      console.warn(`Error rendering thumbnail for page ${pageNumber}:`, err);
    }
  }
}

/**
 * Renders a specific page at high resolution and returns Blob + DataURL
 */
export async function renderPageToImage(pdfDoc, pageNumber, options = {}) {
  const { format = 'png', scale = 2.0, quality = 0.92 } = options;
  const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png';

  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d');

  // Fill pure white background for JPEGs to avoid black transparent areas
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport
  };

  await page.render(renderContext).promise;

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve({
          blob,
          dataUrl: canvas.toDataURL(mimeType, quality),
          width: canvas.width,
          height: canvas.height,
          pageNumber
        });
      },
      mimeType,
      quality
    );
  });
}

