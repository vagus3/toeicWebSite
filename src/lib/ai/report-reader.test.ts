import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isReportImage, MAX_REPORT_BYTES, readHackersReport } from "./report-reader";
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
const fetchMock = vi.fn();
beforeEach(() => { vi.stubEnv("GROQ_API_KEY","test-key"); vi.stubEnv("GROQ_VISION_MODEL",""); vi.stubGlobal("fetch",fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("채점표 이미지 읽기", () => {
  it("MIME뿐 아니라 파일 헤더와 크기를 검사한다", () => {
    expect(isReportImage(png,"image/png")).toBe(true);
    expect(isReportImage(png,"image/jpeg")).toBe(false);
    expect(isReportImage(Buffer.from('<svg><script>bad</script></svg>'),"image/png")).toBe(false);
    expect(isReportImage(Buffer.alloc(MAX_REPORT_BYTES+1),"image/png")).toBe(false);
  });
  it("선택한 이미지와 OCR 지침만 vision 모델로 보내고 결과를 검사한다", async () => {
    fetchMock.mockResolvedValue(Response.json({ choices:[{ message:{ content:JSON.stringify({ recognized:true,testDate:null,total:2,correct:1,rows:[] }) } }] }));
    expect(await readHackersReport(png,"image/png")).toMatchObject({ total:2,correct:1 });
    const body=JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("qwen/qwen3.8-27b");
    expect(body.messages[0].content[1].image_url.url).toBe(`data:image/png;base64,${png.toString("base64")}`);
    expect(body.messages[0].content[0].text).toContain("NOT solving questions");
  });
  it("제공업체 오류와 잘못된 인식 결과를 성공으로 반환하지 않는다", async () => {
    fetchMock.mockResolvedValue(new Response("provider details",{ status:403 }));
    await expect(readHackersReport(png,"image/png")).rejects.toThrow("report_read_failed");
    fetchMock.mockResolvedValue(Response.json({ choices:[{ message:{ content:'{"recognized":true,"total":995}' } }] }));
    await expect(readHackersReport(png,"image/png")).rejects.toThrow();
  });
});
