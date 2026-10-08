import { create } from "zustand";
import { applyTheme, DEFAULT_THEME, readTheme, THEME_COLOR, type ThemeMode } from "@/lib/theme";

interface ThemeState {
  mode: ThemeMode;
  /** 첫 렌더 이후 <html data-theme>(인라인 스크립트가 맞춰 둔 값)과 동기화 */
  hydrate: () => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: DEFAULT_THEME,
  hydrate: () => {
    const mode = readTheme();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[mode]);
    set({ mode });
  },
  toggle: () => {
    const next: ThemeMode = get().mode === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ mode: next });
  },
}));
