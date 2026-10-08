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
