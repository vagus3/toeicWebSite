/** 폼 필드 아래 검증 메시지 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1 block text-label text-accent">
      {message}
    </span>
  );
}
