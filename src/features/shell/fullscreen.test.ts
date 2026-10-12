import { describe, expect, it } from "vitest";
import { isFullscreenPath } from "./fullscreen";

describe("isFullscreenPath", () => {
  it("촬영과 일일 퀴즈 화면은 전체 화면이다", () => {
    expect(isFullscreenPath("/study/upload")).toBe(true);
    expect(isFullscreenPath("/quizzes/daily")).toBe(true);
  });

  it("하위 경로도 같은 전체 화면으로 본다", () => {
    expect(isFullscreenPath("/study/upload/camera")).toBe(true);
  });

  it("파티 채팅방은 전체 화면이다", () => {
    expect(isFullscreenPath("/party/dawn-4/chat/general")).toBe(true);
    expect(isFullscreenPath("/partyroom")).toBe(false);
  });

  it("질문 상세는 전체 화면이고 질문 목록은 아니다", () => {
    expect(isFullscreenPath("/qna/t1")).toBe(true);
    expect(isFullscreenPath("/qna")).toBe(false);
  });

  it("이름만 비슷한 경로는 전체 화면이 아니다", () => {
    expect(isFullscreenPath("/study/uploads")).toBe(false);
    expect(isFullscreenPath("/quizzes/daily-archive")).toBe(false);
    expect(isFullscreenPath("/quizzes")).toBe(false);
    expect(isFullscreenPath("/dashboard")).toBe(false);
  });
});
