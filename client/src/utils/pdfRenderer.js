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
