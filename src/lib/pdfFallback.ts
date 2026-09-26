const MAX_FALLBACK_PAGES = 3;
const TARGET_PAGE_WIDTH = 1200;
const PAGE_GAP = 24;

function isPdf(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.9) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PDF_FALLBACK_IMAGE_FAILED"));
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Converts the first few PDF pages to one local JPEG contact sheet.
 * The original PDF never leaves the normal Athari flow; this file is only
 * a temporary browser-side AI fallback for image-only/scanned PDFs.
 */
export async function renderPdfForAiFallback(
  file: File
): Promise<File | null> {
  if (!isPdf(file) || typeof window === "undefined") return null;

  // pdfjs-dist/webpack.mjs configures the PDF.js web worker for Webpack.
  const pdfjs = (await import("pdfjs-dist/webpack.mjs")) as any;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  try {
    const pageCount = Math.min(pdf.numPages, MAX_FALLBACK_PAGES);
    const rendered: HTMLCanvasElement[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.max(
        0.8,
        Math.min(2, TARGET_PAGE_WIDTH / baseViewport.width)
      );
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("PDF_FALLBACK_CANVAS_FAILED");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      rendered.push(canvas);
      page.cleanup();
    }

    if (!rendered.length) return null;

    const width = Math.max(...rendered.map((canvas) => canvas.width));
    const height =
      rendered.reduce((sum, canvas) => sum + canvas.height, 0) +
      PAGE_GAP * Math.max(0, rendered.length - 1);

    const sheet = document.createElement("canvas");
    sheet.width = width;
    sheet.height = height;

    const sheetContext = sheet.getContext("2d", { alpha: false });
    if (!sheetContext) throw new Error("PDF_FALLBACK_CANVAS_FAILED");

    sheetContext.fillStyle = "#ffffff";
    sheetContext.fillRect(0, 0, width, height);

    let y = 0;
    for (const canvas of rendered) {
      const x = Math.floor((width - canvas.width) / 2);
      sheetContext.drawImage(canvas, x, y);
      y += canvas.height + PAGE_GAP;
    }

    const blob = await canvasToJpeg(sheet);
    const baseName = file.name.replace(/\.pdf$/i, "") || "athari-document";

    return new File([blob], `${baseName}-visual-fallback.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    await pdf.destroy();
  }
}
