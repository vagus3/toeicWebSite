import { z } from "zod";
import { SCORE_TRACKS } from "@/types";

export type AuthMode = "login" | "signup";
export const TRACKS = SCORE_TRACKS;

export const authSchema = z
  .object({
    mode: z.enum(["login", "signup"]),
    nickname: z.string().trim(),
    email: z.email("이메일 형식을 확인해 주세요"),
    password: z.string().min(8, "비밀번호는 8자 이상이에요"),
    track: z.enum(TRACKS),
    agree: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.mode !== "signup") return;
    if (v.nickname.length < 1)
      ctx.addIssue({
        code: "custom",
        path: ["nickname"],
        message: "파티에서 보일 이름을 적어 주세요",
      });
    if (!v.agree)
      ctx.addIssue({
        code: "custom",
        path: ["agree"],
        message: "약관에 동의해야 가입할 수 있어요",
      });
  });

export type AuthForm = z.infer<typeof authSchema>;
