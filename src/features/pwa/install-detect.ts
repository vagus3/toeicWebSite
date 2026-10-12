export type InstallPlatform = "ios" | "android" | "other";

/** iPhone · iPad (iPadOS는 데스크톱 Safari로 보이므로 터치 포인트로 구분) */
export function isIosDevice(userAgent: string, maxTouchPoints = 0) {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

export function isAndroidDevice(userAgent: string) {
  return /Android/i.test(userAgent);
}

export function detectInstallPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  if (isIosDevice(userAgent, maxTouchPoints)) return "ios";
  if (isAndroidDevice(userAgent)) return "android";
  return "other";
}

/**
 * 카카오톡·네이버 앱 등 다른 앱 안의 브라우저. 초대 링크는 대부분 카카오톡으로 오는데,
 * 이 안에서는 홈 화면 설치·푸시가 안 되고 Google 로그인도 막힐 수 있어 다른 브라우저로 보내야 한다.
 */
export type InAppBrowser = "kakaotalk" | "naver" | "instagram" | "facebook" | "line" | "daum";

const IN_APP_PATTERNS: [InAppBrowser, RegExp][] = [
  ["kakaotalk", /KAKAOTALK/i],
  ["naver", /NAVER\(inapp/i],
  ["instagram", /Instagram/],
  ["facebook", /FBAN|FBAV/],
  ["line", /\bLine\//],
  ["daum", /DaumApps/],
];

export const IN_APP_NAME: Record<InAppBrowser, string> = {
  kakaotalk: "카카오톡",
  naver: "네이버 앱",
  instagram: "인스타그램",
  facebook: "페이스북",
  line: "라인",
  daum: "다음 앱",
};

export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  return IN_APP_PATTERNS.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? null;
}

/**
 * 홈 화면에 추가하는 메뉴가 브라우저마다 달라서 안내 문구를 나눈다.
 * - ios-safari: Safari 공유 버튼 / ios-other: iOS의 Chrome·Edge·Firefox (iOS 16.4부터 공유 메뉴로 추가)
 * - android-chrome: Chrome ⋮ 메뉴 / android-other: 삼성 인터넷·웨일 등 (메뉴 이름이 조금씩 다르다)
 */
export type InstallBrowser = "ios-safari" | "ios-other" | "android-chrome" | "android-other";

export function detectInstallBrowser(userAgent: string, maxTouchPoints = 0): InstallBrowser | null {
  const platform = detectInstallPlatform(userAgent, maxTouchPoints);
  if (platform === "ios") return /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent) ? "ios-other" : "ios-safari";
  if (platform === "android")
    return /Chrome\//.test(userAgent) && !/SamsungBrowser|EdgA|OPR|Firefox|Whale|YaBrowser/.test(userAgent)
      ? "android-chrome"
      : "android-other";
  return null;
}

/**
 * 인앱 브라우저에서 기기 브라우저로 여는 주소. 사용자가 버튼을 눌러야 동작한다.
 * 카카오톡은 자체 주소(공식 문서는 없지만 널리 쓰임), 그 밖의 Android 앱은 Chrome intent 주소를 쓴다.
 * iOS의 다른 인앱 브라우저는 열 방법이 없어 null — 링크 복사와 메뉴 안내로 대신한다.
 */
export function externalOpenUrl(
  inApp: InAppBrowser,
  platform: InstallPlatform,
  url: string,
): string | null {
  if (inApp === "kakaotalk") return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  if (platform !== "android") return null;
  const target = new URL(url);
  return `intent://${target.host}${target.pathname}${target.search}#Intent;scheme=${target.protocol.replace(":", "")};package=com.android.chrome;end`;
}

interface InstallGuideInput {
  userAgent: string;
  maxTouchPoints: number;
  /** display-mode: standalone 또는 navigator.standalone */
  standalone: boolean;
  dismissed: boolean;
}

/** 아직 홈 화면에 설치하지 않은 iOS·Android에서, 닫지 않았을 때 보여줄 안내 */
export function installGuidePlatform({
  userAgent,
  maxTouchPoints,
  standalone,
  dismissed,
}: InstallGuideInput): InstallPlatform | null {
  if (standalone || dismissed) return null;
  const platform = detectInstallPlatform(userAgent, maxTouchPoints);
  return platform === "other" ? null : platform;
}
