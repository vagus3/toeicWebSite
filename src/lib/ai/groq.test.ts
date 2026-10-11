import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { answerInitialQuestion, answerTutorConversation } from "./groq";
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("GROQ_KEY", "");
  vi.stubEnv("GROQ_MODEL", "");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(Response.json({ choices: [{ message: { content: "답변" } }] }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("Groq AI 대화", () => {
  it("영어 표현의 내부 띄어쓰기를 원문 그대로 전송한다", async () => {
    const prompt = "take a way를 활용한 예문을 만들어줘";
    await answerTutorConversation("단어", "표현 질문", null, [], prompt);
    const messages = JSON.parse(fetchMock.mock.calls[0][1].body).messages;
    expect(messages.at(-1)).toEqual({ role: "user", content: prompt });
    expect(messages[0].content).toContain("공백을 임의로 제거하거나");
    expect(messages[0].content).toContain("어떤 뜻인지 먼저 확인해");
  });
  it("신규 AI 답변의 강조 표시는 저장 전에 제거하고 질문은 변경하지 않는다", async () => {
    fetchMock.mockResolvedValue(Response.json({ choices: [{ message: { content: "  **take away**는 __가져가다__라는 뜻입니다.  " } }] }));
    expect(await answerInitialQuestion("단어", "**take away**를 설명해 줘")).toBe("take away는 가져가다라는 뜻입니다.");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content).toBe("[단어] **take away**를 설명해 줘");
  });
  it("운영 환경에 등록된 GROQ_KEY도 인식한다", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GROQ_KEY", "legacy-test-key");
    expect(await answerInitialQuestion("문법", "질문")).toBe("답변");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer legacy-test-key");
  });
  it("질문과 이전 AI 대화를 Groq 메시지 형식으로 전달한다", async () => {
    expect(await answerTutorConversation("문법", "원래 질문", "첫 답변", [{ prompt: "추가 질문", answer: "추가 답변" }], "새 질문")).toBe("답변");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    const body = JSON.parse(options.body);
    expect(body.model).toBe("openai/gpt-oss-20b");
    expect(body.messages.slice(1)).toEqual([
      { role: "user", content: "[문법] 원래 질문" },
      { role: "assistant", content: "첫 답변" },
      { role: "user", content: "추가 질문" },
      { role: "assistant", content: "추가 답변" },
      { role: "user", content: "새 질문" },
    ]);
  });
  it("첫 답변이 없어도 원래 질문과 새 프롬프트를 전달한다", async () => {
    await answerTutorConversation("문법", "원래 질문", null, [], "새 질문");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages.slice(1)).toEqual([
      { role: "user", content: "[문법] 원래 질문" }, { role: "user", content: "새 질문" },
    ]);
  });
  it("키가 없으면 외부 AI 요청을 보내지 않는다", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    expect(await answerInitialQuestion("문법", "질문")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("환경변수 모델을 사용하고 다른 모델에 GPT 전용 옵션을 보내지 않는다", async () => {
    vi.stubEnv("GROQ_MODEL", "another-model");
    await answerInitialQuestion("단어", "질문");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("another-model");
    expect(body.reasoning_effort).toBeUndefined();
  });
  it("제공업체 오류 본문을 오류 메시지에 포함하지 않는다", async () => {
    fetchMock.mockResolvedValue(new Response("provider secret details", { status: 401 }));
    await expect(answerInitialQuestion("문법", "질문")).rejects.toThrow("ai_provider_failed");
  });
  it("비어 있는 응답을 실제 답변으로 취급하지 않는다", async () => {
    fetchMock.mockResolvedValue(Response.json({ choices: [{ message: { content: " " } }] }));
    expect(await answerInitialQuestion("문법", "질문")).toBeNull();
  });
});
