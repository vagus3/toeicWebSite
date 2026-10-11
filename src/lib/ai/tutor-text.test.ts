import { describe, expect, it } from "vitest";
import { plainTutorText } from "./tutor-text";

describe("plain tutor answer formatting", () => {
  it("converts existing Markdown table rows into labeled paragraphs", () => {
    const text = "| 문장 | 구조 | 의미 |\n|------|:------:|------|\n| She was late because she had a meeting. | 접속사 + 절 | 회의가 있어서 늦었다. |\n| She was late because of her meeting. | 전치사구 | 회의 때문에 늦었다. |\n\n추가 설명";
    expect(plainTutorText(text)).toBe("문장: She was late because she had a meeting.\n구조: 접속사 + 절\n의미: 회의가 있어서 늦었다.\n\n문장: She was late because of her meeting.\n구조: 전치사구\n의미: 회의 때문에 늦었다.\n\n\n추가 설명");
  });
  it("removes Markdown decorations while retaining sentence boundaries and numbered examples", () => {
    expect(plainTutorText("## 구조\n1. She was late / because / she had a meeting.\n- **because** = *접속사*\n> `she had a meeting` = 절"))
      .toBe("구조\n1. She was late / because / she had a meeting.\nbecause = 접속사\nshe had a meeting = 절");
  });
  it("preserves literal pipes and plain text that are not tables", () => {
    expect(plainTutorText("A | B\n해석: A 또는 B\n1. 예문 / 구간"))
      .toBe("A | B\n해석: A 또는 B\n1. 예문 / 구간");
  });
  it("is idempotent for stored answers rendered again", () => {
    const text = "# 비교\n- **because** / 절\n- *because of* / 명사구";
    expect(plainTutorText(plainTutorText(text))).toBe(plainTutorText(text));
  });
});
