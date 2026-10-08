import { cn } from "@/lib/utils";
import { FieldError } from "./field-error";

interface TextFieldProps extends React.ComponentProps<"input"> {
  id: string;
  label: string;
  error?: string;
}

/** 라벨 + 입력 + 검증 메시지 (Nocturne .field / .input) — react-hook-form register()를 그대로 펼쳐 쓴다 */
export function TextField({ id, label, error, className, ...inputProps }: TextFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className={cn("input", className)} aria-invalid={Boolean(error)} {...inputProps} />
      <FieldError message={error} />
    </div>
  );
}
