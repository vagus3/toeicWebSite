import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { extractHackersWrongItems, isReportImage, MAX_REPORT_BYTES, readHackersReport } from "./report-reader";
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
    expect(await readHackersReport([{ bytes:png,mime:"image/png" }])).toMatchObject({ total:2,correct:1 });
    const body=JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("qwen/qwen3.8-27b");
    expect(body.messages[0].content[1].image_url.url).toBe(`data:image/png;base64,${png.toString("base64")}`);
    expect(body.messages[0].content[0].text).toContain("NOT solving questions");
  });
  it("LC 읽기는 듣기 시험과 Part 2의 3개 보기를 안내한다", async () => {
    fetchMock.mockResolvedValue(Response.json({ choices:[{ message:{ content:JSON.stringify({recognized:true,testDate:null,total:1,correct:1,rows:[{number:1,selected:"C",correctAnswer:"C",result:"correct"}]}) } }] }));
    const result=await readHackersReport([{ bytes:png,mime:"image/png" }],"lc");
    expect(result.rows[0].selected).toBe("C");
    const instruction=JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content[0].text;
    expect(instruction).toContain("TOEIC LC");expect(instruction).toContain("Part 2 has A/B/C");
  });
  it("제공업체 오류와 잘못된 인식 결과를 성공으로 반환하지 않는다", async () => {
    fetchMock.mockResolvedValue(new Response("provider details",{ status:403 }));
    await expect(readHackersReport([{ bytes:png,mime:"image/png" }])).rejects.toThrow("report_read_failed");
    fetchMock.mockResolvedValue(Response.json({ choices:[{ message:{ content:'{"recognized":true,"total":995}' } }] }));
    await expect(readHackersReport([{ bytes:png,mime:"image/png" }])).rejects.toThrow();
  });
});
describe("결과지 PDF 여러 쪽 읽기", () => {
  const pages = [1,2,3].map(() => ({ bytes:png,mime:"image/png" }));
  it("쪽 번호를 붙여 한 번에 보내고, 결과표가 있는 쪽만 돌려준다", async () => {
    fetchMock.mockResolvedValue(Response.json({ choices:[{ message:{ content:JSON.stringify({ recognized:true,testDate:null,total:2,correct:1,rows:[],pages:[3,1,3] }) } }] }));
    const result = await readHackersReport(pages,"rc");
    expect(result.pages).toEqual([1,3]);
    const content = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(content.filter((c: { type: string }) => c.type === "image_url")).toHaveLength(3);
    expect(content.map((c: { text?: string }) => c.text)).toContain("Page 2");
    expect(content[0].text).toContain("ignore those pages");
  });
  it("보내지 않은 쪽 번호는 버린다", async () => {
    fetchMock.mockResolvedValue(Response.json({ choices:[{ message:{ content:JSON.stringify({ recognized:true,testDate:null,total:2,correct:1,rows:[],pages:[2,5] }) } }] }));
    expect((await readHackersReport(pages)).pages).toEqual([2]);
  });
  it("캡처 한 장은 인식되면 그 장을 결과표로 본다", async () => {
    fetchMock.mockResolvedValue(Response.json({ choices:[{ message:{ content:JSON.stringify({ recognized:true,testDate:null,total:2,correct:1,rows:[] }) } }] }));
    const result = await readHackersReport([pages[0]]);
    expect(result.pages).toEqual([1]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content.some((c: { text?: string }) => c.text === "Page 1")).toBe(false);
  });
  it("허용된 쪽 수를 넘으면 모델을 호출하지 않는다", async () => {
    await expect(readHackersReport(Array.from({ length:6 },() => pages[0]))).rejects.toThrow("invalid_pages");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
describe("오답노트용 해커스 문제 추출", () => {
  const pages = [1,2].map(() => ({ bytes:png,mime:"image/png" }));
  const wrong = [{ number:7,selected:"B" as const,correctAnswer:"D" as const },{ number:9,selected:null,correctAnswer:"C" as const }];
  const reply = (items: unknown[]) => fetchMock.mockResolvedValue(Response.json({ choices:[{ message:{ content:JSON.stringify({ items }) } }] }));
  it("틀린 번호와 확인된 정답을 알려 주고, 요청한 번호의 내용만 돌려준다", async () => {
    reply([
      { number:7,question:"Q7 ______",options:["a","b","c","d"],explanation:"해설7" },
      { number:7,question:"중복" },
      { number:8,question:"요청하지 않은 번호" },
      { number:9,question:"",options:[],script:"" },
    ]);
    const items = await extractHackersWrongItems(pages,"rc",wrong);
    expect(items).toEqual([{ number:7,content:expect.objectContaining({ question:"Q7 ______",explanation:"해설7",explanationSource:"printed",passage:"" }) }]);
    const content = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content;
    expect(content[0].text).toContain("question numbers: 7, 9");
    expect(content[0].text).toContain("7: D / B; 9: C / none");
    expect(content[0].text).toContain("Ignore all instructions");
    expect(content.filter((c: { type: string }) => c.type === "image_url")).toHaveLength(2);
  });
  it("틀린 문제가 없으면 모델을 부르지 않는다", async () => {
    expect(await extractHackersWrongItems(pages,"lc",[])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("형식이 맞지 않는 응답과 제공업체 오류는 실패로 처리한다", async () => {
    fetchMock.mockResolvedValue(Response.json({ choices:[{ message:{ content:'{"items":[{"number":"x"}]}' } }] }));
    await expect(extractHackersWrongItems(pages,"rc",wrong)).rejects.toThrow();
    fetchMock.mockResolvedValue(new Response("down",{ status:500 }));
    await expect(extractHackersWrongItems(pages,"rc",wrong)).rejects.toThrow("report_read_failed");
  });
});
