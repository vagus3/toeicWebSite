import { z } from "zod";

export const inviteCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const createPartySchema = z.object({
  name: z.string().trim().min(1, "파티 이름을 입력해 주세요").max(40),
  examDate: z.iso.date().nullable(),
  capacity: z.number().int().min(2).max(20).default(6),
});

export interface InvitePreview {
  partyName: string;
  inviterName: string;
  capacity: number;
  memberCount: number;
}

export function partyErrorMessage(error: string) {
  if (error.includes("party_full")) return "파티 정원이 가득 찼어요";
  if (error.includes("invalid_invite")) return "유효하지 않은 초대 링크예요";
  return "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요";
}

/** 로그인 후 돌아갈 주소는 같은 사이트의 경로만 허용한다. */
export function safeNextPath(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  ) {
    return "/dashboard";
  }
  return value;
}
