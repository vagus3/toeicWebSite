"use client";

import { useRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface FilePickerButtonProps extends Omit<ButtonProps, "onClick" | "onSelect"> {
  accept: string;
  onSelect: (file: File | undefined) => void;
}

/**
 * 숨긴 파일 입력 + 앱 버튼. 브라우저 기본 파일 입력("파일 선택 · 선택된 파일 없음")은
 * 모바일에서 작고 앱과 모양이 달라서 대신 쓴다 (해커스 채점표, 오답노트 결과지).
 */
export function FilePickerButton({
  accept,
  onSelect,
  disabled,
  children,
  ...props
}: FilePickerButtonProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        disabled={disabled}
        onChange={(event) => {
          onSelect(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button {...props} disabled={disabled} onClick={() => ref.current?.click()}>
        {children}
      </Button>
    </>
  );
}
