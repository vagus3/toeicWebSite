import { describe, expect, it } from "vitest";
import { previewText, splitChatRecipients, type RoomMemberPrefs } from "./recipients";

const NOW = Date.parse("2026-10-08T07:00:00+09:00");
const prefs = (chat: boolean, preview: boolean) => ({ chat_enabled: chat, preview_enabled: preview });

describe("splitChatRecipients", () => {
  it("음소거·알림 끔은 제외, 미리보기 끔은 따로", () => {
    const members: RoomMemberPrefs[] = [
      { user_id: "a", muted_until: null, notification_preferences: prefs(true, true) },
      { user_id: "b", muted_until: "2026-10-08T09:00:00+09:00", notification_preferences: prefs(true, true) },
      { user_id: "c", muted_until: null, notification_preferences: prefs(false, true) },
      { user_id: "d", muted_until: null, notification_preferences: prefs(true, false) },
      { user_id: "e", muted_until: "2026-10-08T06:00:00+09:00", notification_preferences: null },
    ];
    expect(splitChatRecipients(members, NOW)).toEqual({ withPreview: ["a", "e"], withoutPreview: ["d"] });
  });
});

describe("previewText", () => {
  it("길면 자르고 말줄임", () => {
    expect(previewText("가".repeat(100), 10)).toBe(`${"가".repeat(10)}…`);
    expect(previewText("짧은 메시지")).toBe("짧은 메시지");
  });
});
