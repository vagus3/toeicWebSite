"use client";

import { X } from "@phosphor-icons/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  closeLabel,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** 주면 내용 맨 위 오른쪽에 닫기(X) 버튼을 둔다. 긴 내용에서도 스크롤과 함께 올라간다. */
  closeLabel?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-backdrop" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn("dialog", className)}
        {...props}
      >
        {closeLabel && (
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="-my-2 grid size-control-lg place-items-center self-end rounded-full text-muted"
          >
            <X className="text-icon-md" />
          </DialogPrimitive.Close>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("dialog-title", className)} {...props} />;
}

export function DialogActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("dialog-actions", className)} {...props} />;
}
