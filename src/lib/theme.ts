export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEY = "toeic-theme";
export const DEFAULT_THEME: ThemeMode = "dark";

export const THEME_COLOR: Record<ThemeMode, string> = {
  dark: "#141815",
  light: "#f3f7ec",
};

/**
 * 첫 페인트 전에 <html data-theme>를 맞춰서 새로고침 시 다크→라이트 깜빡임을 막는다.
 * 기본은 다크, 사용자가 고른 값이 있으면 그걸 쓴다.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark')t='${DEFAULT_THEME}';var d=document.documentElement;d.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='light'?'${THEME_COLOR.light}':'${THEME_COLOR.dark}');}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[mode]);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // 사파리 프라이빗 모드 등 저장소를 못 쓰는 환경에서는 이번 세션에만 적용
  }
}

export function readTheme(): ThemeMode {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}
