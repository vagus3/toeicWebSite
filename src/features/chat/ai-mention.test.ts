import { describe, expect, it } from "vitest";
import { parseAiMention } from "./ai-mention";

describe("parseAiMention", () => {
  it("맨 앞의 @AI를 떼고 질문만 남긴다", () => {
    expect(parseAiMention("@AI 현재완료 설명해 줘")).toEqual({ prompt: "현재완료 설명해 줘" });
    expect(parseAiMention("  @ai   because vs because of")).toEqual({ prompt: "because vs because of" });
    expect(parseAiMention("@AI\n줄바꿈 뒤 질문")).toEqual({ prompt: "줄바꿈 뒤 질문" });
  });

  it("전각 ＠와 구분 기호를 받는다", () => {
    expect(parseAiMention("＠AI 질문")).toEqual({ prompt: "질문" });
    expect(parseAiMention("@AI: implement와 impose")).toEqual({ prompt: "implement와 impose" });
  });

  it("부름말(야·님)은 떼지만 질문 속 같은 글자는 그대로 둔다", () => {
    expect(parseAiMention("@AI야 이거 뭐야?")).toEqual({ prompt: "이거 뭐야?" });
    expect(parseAiMention("@AI님, 알려 주세요")).toEqual({ prompt: "알려 주세요" });
    expect(parseAiMention("@AI 야구 용어 알려줘")).toEqual({ prompt: "야구 용어 알려줘" });
  });

  it("맨 앞이 아니거나 다른 단어면 호출이 아니다", () => {
    expect(parseAiMention("이거 @AI 알려줘")).toBeNull();
    expect(parseAiMention("@AIbot 안녕")).toBeNull();
    expect(parseAiMention("@ai2 테스트")).toBeNull();
    expect(parseAiMention("AI 질문")).toBeNull();
  });

  it("질문이 비면 호출이 아니다", () => {
    expect(parseAiMention("@AI")).toBeNull();
    expect(parseAiMention("@AI   ")).toBeNull();
    expect(parseAiMention("@AI야")).toBeNull();
  });
});
