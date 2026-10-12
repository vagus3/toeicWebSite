"use client";

import { useEffect, useState } from "react";

/**
 * 화면 키보드가 레이아웃 아래쪽을 가리는 높이(px).
 * iOS Safari와 Android Chrome은 키보드가 열려도 레이아웃 높이를 줄이지 않고 보이는 영역(visualViewport)만 줄인다.
 * 그래서 아래에 붙은 입력창이 키보드에 가려지므로, 이 값만큼 올려 준다.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setInset(
        Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)),
      );
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}
