import { create } from "zustand";

interface ToastState {
  message: string;
  flash: (message: string) => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** 시안과 같이 1.8초 동안 우측 하단(모바일은 탭 위)에 뜨는 확인 토스트 */
export const useToast = create<ToastState>((set) => ({
  message: "",
  flash: (message) => {
    set({ message });
    clearTimeout(timer);
    timer = setTimeout(() => set({ message: "" }), 1800);
  },
}));
