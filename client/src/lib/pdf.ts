import { PDFDocument } from "pdf-lib";

export async function buildPdfFromImages(files: File[]): Promise<Blob> {
  if (files.length === 0) throw new Error('Add at least one image first.');

  const pdf = await PDFDocument.create();
  for (const file of files) {
    const { bytes, type } = await imageBytesForPdf(file);
    const image = type === 'png'
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  const out = await pdf.save();
  const pdfBuffer = new ArrayBuffer(out.byteLength);
  new Uint8Array(pdfBuffer).set(out);
  return new Blob([pdfBuffer], { type: "application/pdf" });
}

async function imageBytesForPdf(file: File): Promise<{ bytes: Uint8Array; type: 'jpg' | 'png' }> {
  if (file.type === 'image/png') {
    return { bytes: new Uint8Array(await file.arrayBuffer()), type: 'png' };
  }
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    return { bytes: new Uint8Array(await file.arrayBuffer()), type: 'jpg' };
  }

  const jpeg = await rasterizeImage(file);
  return { bytes: new Uint8Array(await jpeg.arrayBuffer()), type: 'jpg' };
}

async function rasterizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    throw new Error(`${file.name} is not a supported image format.`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare this image for PDF export.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not convert this image for PDF export.'));
    }, 'image/jpeg', 0.9);
  });
}
