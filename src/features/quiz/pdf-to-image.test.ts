import { describe, expect, it } from "vitest";
import { isPdf } from "./pdf-to-image";

describe("해커스 결과지 PDF 판별", () => {
  it("MIME 타입이나 확장자로 PDF를 알아본다", () => {
    expect(isPdf(new File(["%PDF"], "result.pdf", { type: "application/pdf" }))).toBe(true);
    // 일부 모바일 브라우저는 다운로드한 PDF의 MIME 타입을 비워 둔다
    expect(isPdf(new File(["%PDF"], "결과지.PDF", { type: "" }))).toBe(true);
  });
  it("이미지는 PDF로 취급하지 않는다", () => {
    expect(isPdf(new File(["x"], "capture.png", { type: "image/png" }))).toBe(false);
  });
});
