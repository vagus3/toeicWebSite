import { describe, expect, it } from "vitest";
import {
  detectInAppBrowser,
  detectInstallBrowser,
  detectInstallPlatform,
  externalOpenUrl,
  installGuidePlatform,
  isIosDevice,
} from "./install-detect";

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

const KAKAO_ANDROID = `${ANDROID} KAKAOTALK 10.8.5`;
const KAKAO_IPHONE = `${IPHONE} KAKAOTALK 10.8.5`;
const NAVER_ANDROID = `${ANDROID} NAVER(inapp; search; 2000; 12.9.1)`;
const SAMSUNG =
  "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36";
const CHROME_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";

describe("detectInAppBrowser", () => {
  it("카카오톡·네이버 앱 안의 브라우저를 알아본다", () => {
    expect(detectInAppBrowser(KAKAO_ANDROID)).toBe("kakaotalk");
    expect(detectInAppBrowser(KAKAO_IPHONE)).toBe("kakaotalk");
    expect(detectInAppBrowser(NAVER_ANDROID)).toBe("naver");
  });
  it("일반 브라우저는 인앱이 아니다", () => {
    expect(detectInAppBrowser(ANDROID)).toBeNull();
    expect(detectInAppBrowser(IPHONE)).toBeNull();
    expect(detectInAppBrowser(SAMSUNG)).toBeNull();
  });
});

describe("detectInstallBrowser", () => {
  it("브라우저마다 다른 설치 메뉴를 고른다", () => {
    expect(detectInstallBrowser(IPHONE, 5)).toBe("ios-safari");
    expect(detectInstallBrowser(CHROME_IOS, 5)).toBe("ios-other");
    expect(detectInstallBrowser(ANDROID, 5)).toBe("android-chrome");
    expect(detectInstallBrowser(SAMSUNG, 5)).toBe("android-other");
    expect(detectInstallBrowser(DESKTOP, 0)).toBeNull();
  });
});

describe("externalOpenUrl", () => {
  const url = "https://app.test/signup?invite=abc";
  it("카카오톡은 자체 주소로 기기 브라우저를 연다", () =>
    expect(externalOpenUrl("kakaotalk", "ios", url)).toBe(
      "kakaotalk://web/openExternal?url=https%3A%2F%2Fapp.test%2Fsignup%3Finvite%3Dabc",
    ));
  it("Android의 다른 인앱 브라우저는 Chrome intent 주소를 쓴다", () =>
    expect(externalOpenUrl("naver", "android", url)).toBe(
      "intent://app.test/signup?invite=abc#Intent;scheme=https;package=com.android.chrome;end",
    ));
  it("iOS의 다른 인앱 브라우저는 열 방법이 없다", () =>
    expect(externalOpenUrl("instagram", "ios", url)).toBeNull());
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
