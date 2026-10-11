import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { rcFixture } from "../../../tests/fixtures/rc";
vi.mock("server-only", () => ({}));
import { generateDailyRc } from "./rc-generator";
const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", "test-key"); vi.stubEnv("GROQ_KEY", ""); vi.stubEnv("GROQ_MODEL", "");
  vi.stubGlobal("fetch", mockFetch); mockFetch.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("Groq RC 생성", () => {
  it("JSON으로 생성하고 파트별 문항을 검증한다", async () => {
    mockFetch.mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify({ questions: rcFixture }) } }] }));
    expect(await generateDailyRc("2026-10-12")).toHaveLength(3);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.messages[1].content).toContain("2026-10-12");
  });
  it("문제 수가 틀리거나 잘못된 JSON이면 저장할 결과를 반환하지 않는다", async () => {
    for (const content of ["not json", '{"questions":[]}']) {
      mockFetch.mockResolvedValue(Response.json({ choices: [{ message: { content } }] }));
      await expect(generateDailyRc("2026-10-12")).rejects.toThrow();
    }
  });
  it("형식 오류만 한 번 재생성하고 유효한 결과를 반환한다", async () => {
    mockFetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: '{"questions":[]}' } }] }))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: JSON.stringify({ questions: rcFixture }) } }] }));
    expect(await generateDailyRc("2026-10-12")).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(mockFetch.mock.calls[1][1].body).messages[1].content).toContain("failed validation");
    expect(mockFetch.mock.calls[1][1].signal).toBe(mockFetch.mock.calls[0][1].signal);
  });
  it("스키마 강제를 지원하지 않는 설정 모델은 JSON 모드로 검증한다", async () => {
    vi.stubEnv("GROQ_MODEL", "another-model");
    mockFetch.mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify({ questions: rcFixture }) } }] }));
    await generateDailyRc("2026-10-12");
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).response_format).toEqual({ type: "json_object" });
  });
  it("키 누락과 제공업체 오류를 처리한다", async () => {
    vi.stubEnv("GROQ_API_KEY", ""); await expect(generateDailyRc("2026-10-12")).rejects.toThrow("ai_not_configured"); expect(mockFetch).not.toHaveBeenCalled();
    vi.stubEnv("GROQ_API_KEY", "test-key"); mockFetch.mockResolvedValue(new Response("secret details", { status: 401 }));
    await expect(generateDailyRc("2026-10-12")).rejects.toThrow("ai_provider_failed");
  });
});
