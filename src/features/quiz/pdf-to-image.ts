/**
 * 해커스 결과지 PDF를 쪽별 이미지로 바꾼다.
 * 비전 모델 읽기·Drive 증빙·미리보기가 모두 이미지를 전제로 하므로, 서버는 그대로 두고
 * 브라우저에서만 변환한다. pdf.js는 PDF를 선택했을 때만 불러와 기본 번들을 키우지 않는다.
 */
import imageCompression from "browser-image-compression";
import { MAX_REPORT_PAGES } from "./hackers-schema";

/** 축소 후에도 표의 글자를 읽을 수 있는 폭 */
const TARGET_WIDTH = 1600;
const MB = 1024 * 1024;
/** 서버가 받는 한 장의 최대 크기 */
export const MAX_PAGE_BYTES = 3 * MB;
/** Vercel 함수 요청 본문 제한(4.5MB) 안에 여러 쪽이 함께 들어가도록 한다 */
export const MAX_READ_BYTES = 4 * MB;
export const CAPTURE_COMPRESSION = { maxSizeMB: 2.5, maxWidthOrHeight: 4000, initialQuality: 0.9, useWebWorker: true };
const PAGE_COMPRESSION = { maxSizeMB: 0.7, maxWidthOrHeight: 2400, initialQuality: 0.85, fileType: "image/jpeg", useWebWorker: true };

export class PdfPageLimitError extends Error {
  constructor(readonly pages: number) {
    super("pdf_too_many_pages");
  }
}
class PdfOpenError extends Error {
  constructor() {
    super("pdf_open_failed");
  }
}

/**
 * AI 읽기 요청에 넣을 이미지를 만든다. PDF는 쪽마다, 캡처는 한 장으로 압축하고
 * 서버 크기 제한을 넘으면 실패한다.
 */
export async function prepareReportImages(file: File) {
  const fromPdf = isPdf(file);
  let images: File[];
  try {
    images = fromPdf ? await pdfToPages(file) : [file];
  } catch (error) {
    throw error instanceof PdfPageLimitError ? error : new PdfOpenError();
  }
  const pages = await Promise.all(
    images.map((image) => imageCompression(image, fromPdf ? PAGE_COMPRESSION : CAPTURE_COMPRESSION)),
  );
  if (
    pages.some((p) => p.size > MAX_PAGE_BYTES) ||
    pages.reduce((sum, p) => sum + p.size, 0) > MAX_READ_BYTES
  )
    throw new Error("file_too_large");
  return { pages, fromPdf };
}

/** prepareReportImages 실패를 사용자 안내 문구로 바꾼다 */
export function reportFileErrorMessage(error: unknown) {
  if (error instanceof PdfPageLimitError)
    return `PDF가 ${error.pages}쪽이에요. ${MAX_REPORT_PAGES}쪽 이하 결과지만 읽을 수 있어요. 결과 표를 캡처해 올려 주세요.`;
  if (error instanceof PdfOpenError)
    return "PDF를 열지 못했어요. 암호가 걸려 있지 않은지 확인하거나 결과 표를 캡처해 주세요.";
  return "파일을 준비하지 못했어요. 더 작은 PNG·JPG로 다시 선택해 주세요.";
}

export function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function canvasToPng(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(new File([blob], name, { type: "image/png" }))
          : reject(new Error("pdf_render_failed")),
      "image/png",
    ),
  );
}

/** 쪽마다 PNG 한 장. 결과표가 어느 쪽에 있는지는 Groq가 읽으면서 알려준다. */
export async function pdfToPages(file: File): Promise<File[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  try {
    const doc = await task.promise;
    if (doc.numPages > MAX_REPORT_PAGES) throw new PdfPageLimitError(doc.numPages);
    const base = file.name.replace(/\.pdf$/i, "");
    const pages: File[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({
        scale: TARGET_WIDTH / page.getViewport({ scale: 1 }).width,
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      // 투명 배경이 JPEG 압축에서 검게 변하지 않도록 흰 바탕으로 그린다
      await page.render({ canvas, viewport, background: "#fff" }).promise;
      pages.push(await canvasToPng(canvas, `${base}-p${n}.png`));
    }
    return pages;
  } finally {
    // 문서와 워커를 함께 정리한다
    await task.destroy();
  }
}

/** 증빙으로 남길 쪽들을 세로로 이어 붙인다 */
export async function stitchImages(files: File[], name: string): Promise<File> {
  const bitmaps = await Promise.all(files.map((f) => createImageBitmap(f)));
  try {
    const out = document.createElement("canvas");
    out.width = Math.max(...bitmaps.map((b) => b.width));
    out.height = bitmaps.reduce((sum, b) => sum + b.height, 0);
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out.width, out.height);
    let y = 0;
    for (const b of bitmaps) {
      ctx.drawImage(b, 0, y);
      y += b.height;
    }
    return await canvasToPng(out, name);
  } finally {
    bitmaps.forEach((b) => b.close());
  }
}
