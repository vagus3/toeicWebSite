import { describe, expect, it } from "vitest";
import { detectInstallPlatform, installGuidePlatform, isIosDevice } from "./install-detect";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

describe("isIosDevice", () => {
  it("iPhone", () => expect(isIosDevice(IPHONE)).toBe(true));
  it("데스크톱 모드 iPad는 터치 포인트로 구분", () => {
    expect(isIosDevice(IPAD_DESKTOP, 5)).toBe(true);
    expect(isIosDevice(IPAD_DESKTOP, 0)).toBe(false);
  });
});

describe("detectInstallPlatform", () => {
  it("iOS / Android / 그 외", () => {
    expect(detectInstallPlatform(IPHONE, 5)).toBe("ios");
    expect(detectInstallPlatform(ANDROID, 5)).toBe("android");
    expect(detectInstallPlatform(DESKTOP, 0)).toBe("other");
  });
});

describe("installGuidePlatform", () => {
  const base = { userAgent: IPHONE, maxTouchPoints: 5, standalone: false, dismissed: false };
  it("설치 전 iPhone → ios 안내", () => expect(installGuidePlatform(base)).toBe("ios"));
  it("설치 전 Android → android 안내", () =>
    expect(installGuidePlatform({ ...base, userAgent: ANDROID })).toBe("android"));
  it("이미 홈 화면 앱으로 열었으면 숨긴다", () =>
    expect(installGuidePlatform({ ...base, standalone: true })).toBeNull());
  it("닫았으면 숨긴다", () =>
    expect(installGuidePlatform({ ...base, dismissed: true })).toBeNull());
  it("데스크톱에서는 숨긴다", () =>
    expect(installGuidePlatform({ ...base, userAgent: DESKTOP, maxTouchPoints: 0 })).toBeNull());
});
