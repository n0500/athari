const MAX_FALLBACK_PAGES = 3;
const TARGET_WIDTH = 1200;
const PAGE_GAP = 24;

function isPdf(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("PDFIUM_IMAGE_LOAD_FAILED"));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.9) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PDFIUM_JPEG_FAILED"));
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Visual fallback for image-only/scanned PDFs.
 *
 * This deliberately avoids PDF.js workers because iOS Safari proved
 * unreliable in the current Athari deployment. PDFium runs as WebAssembly
 * on the browser's main thread. The original PDF stays on the device while
 * it is rendered; only a temporary JPEG is sent to the existing AI endpoint.
 */
export async function renderPdfForAiFallback(
  file: File
): Promise<File | null> {
  if (!isPdf(file) || typeof window === "undefined") return null;

  let engine: any = null;
  let documentHandle: any = null;

  try {
    const [
      { init, DEFAULT_PDFIUM_WASM_URL },
      { PdfiumNative, PdfEngine },
      { browserImageDataToBlobConverter },
    ] = await Promise.all([
      import("@embedpdf/pdfium"),
      import("@embedpdf/engines/pdfium"),
      import("@embedpdf/engines/converters"),
    ]);

    const wasmResponse = await fetch(DEFAULT_PDFIUM_WASM_URL);
    if (!wasmResponse.ok) {
      throw new Error(`PDFIUM_WASM_HTTP_${wasmResponse.status}`);
    }

    const wasmBinary = await wasmResponse.arrayBuffer();
    const pdfiumModule = await init({ wasmBinary });
    const native = new PdfiumNative(pdfiumModule);

    engine = new PdfEngine(native, {
      imageConverter: browserImageDataToBlobConverter,
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    documentHandle = await engine
      .openDocumentBuffer({
        id: `athari-${crypto.randomUUID()}`,
        content: bytes,
      })
      .toPromise();

    const pages = Array.isArray(documentHandle.pages)
      ? documentHandle.pages.slice(0, MAX_FALLBACK_PAGES)
      : [];

    if (!pages.length) {
      throw new Error("PDFIUM_NO_PAGES");
    }

    const rendered: Blob[] = [];

    for (const page of pages) {
      const pageWidth = Number(page?.size?.width || 800);
      const scaleFactor = Math.max(
        1,
        Math.min(2.25, TARGET_WIDTH / Math.max(pageWidth, 1))
      );

      const blob = await engine
        .renderPage(documentHandle, page, {
          scaleFactor,
          dpr: 1,
          imageType: "image/png",
          withAnnotations: true,
        })
        .toPromise();

      rendered.push(blob);
    }

    if (rendered.length === 1) {
      const baseName =
        file.name.replace(/\.pdf$/i, "") || "athari-document";

      return new File(
        [rendered[0]],
        `${baseName}-visual-fallback.png`,
        {
          type: "image/png",
          lastModified: Date.now(),
        }
      );
    }

    const images = await Promise.all(rendered.map(blobToImage));
    const width = Math.max(...images.map((image) => image.naturalWidth));
    const height =
      images.reduce((sum, image) => sum + image.naturalHeight, 0) +
      PAGE_GAP * (images.length - 1);

    const sheet = document.createElement("canvas");
    sheet.width = width;
    sheet.height = height;

    const context = sheet.getContext("2d", { alpha: false });
    if (!context) throw new Error("PDFIUM_CANVAS_FAILED");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    let y = 0;
    for (const image of images) {
      const x = Math.floor((width - image.naturalWidth) / 2);
      context.drawImage(image, x, y);
      y += image.naturalHeight + PAGE_GAP;
    }

    const contactSheet = await canvasToJpeg(sheet);
    const baseName =
      file.name.replace(/\.pdf$/i, "") || "athari-document";

    return new File(
      [contactSheet],
      `${baseName}-visual-fallback.jpg`,
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UNKNOWN_PDFIUM_ERROR";
    throw new Error(`PDF_VISUAL_FALLBACK_FAILED:${message}`);
  } finally {
    if (engine && documentHandle) {
      try {
        await engine.closeDocument(documentHandle).toPromise();
      } catch {
        // Best-effort cleanup.
      }
    }
    if (engine) {
      try {
        await engine.destroy().toPromise();
      } catch {
        // Best-effort cleanup.
      }
    }
  }
}
