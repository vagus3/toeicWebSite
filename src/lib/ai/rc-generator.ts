import "server-only";
import { rcSetSchema } from "@/features/quiz/rc-schema";

const questionJsonSchema = {
  type: "object", additionalProperties: false,
  required: ["part", "skill", "passage", "text", "opts", "answer", "why"],
  properties: {
    part: { type: "integer", enum: [5, 6, 7] },
    skill: { type: "string" }, passage: { type: "string" }, text: { type: "string" },
    opts: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
    answer: { type: "integer", enum: [0, 1, 2, 3] }, why: { type: "string" },
  },
};
const outputSchema = {
  type: "object", additionalProperties: false, required: ["questions"],
  properties: { questions: { type: "array", minItems: 3, maxItems: 3, items: questionJsonSchema } },
};

export async function generateDailyRc(studyDate: string) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY;
  if (!apiKey) throw new Error("ai_not_configured");
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  const signal = AbortSignal.timeout(45_000);
  let correction = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model, temperature: 0.4, max_completion_tokens: 6000,
        ...(model.startsWith("openai/gpt-oss-") ? { reasoning_effort: "medium" } : {}),
        response_format: ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"].includes(model)
          ? { type: "json_schema", json_schema: { name: "daily_rc", strict: true, schema: outputSchema } }
          : { type: "json_object" },
        messages: [
          { role: "system", content: [
            "Create original TOEIC Reading practice, never reproduce published or actual exam questions. Return JSON only.",
            'Example format only; invent different content: {"questions":[{"part":5,"skill":"동사 형태","passage":"","text":"Please ____ the invoice.","opts":["check","checked","checking","checks"],"answer":0,"why":"한국어 해설"},{"part":6,"skill":"문맥 어휘","passage":"Dear team, The new delivery schedule is now available. Please ____ your shipping dates by Friday so we can coordinate the warehouse staff. Thank you for helping us prepare for the upcoming sales season. Additional details will be shared at the meeting next week.","text":"Which word best completes the blank in the email?","opts":["confirm","cancel","delay","ignore"],"answer":0,"why":"한국어 해설"},{"part":7,"skill":"세부 정보","passage":"Notice: The office will close at 3 p.m. on Friday for building maintenance. Employees should work from home after 3 p.m. Normal business hours resume Monday.","text":"Why will the office close early?","opts":["Building maintenance","A staff holiday","A client visit","A training session"],"answer":0,"why":"한국어 해설"}]}',
            "CRITICAL: In Part 6, put ____ INSIDE passage, never leave the completed word in passage. Part 6 text must be a question/instruction, not a second copy of the blank sentence. The examples above are short for illustration; generate full-length passages.",
            "Exactly 3 questions in order: Part 5, Part 6, Part 7. Each has exactly 4 distinct plausible options and exactly ONE unambiguous correct answer. answer is a zero-based integer 0..3. No A/B/C/D prefixes in options.",
            "Part 5: a single business-context English sentence containing exactly one ____ blank, passage empty. Rotate grammar (60%) and vocabulary (40%) across days; grammar includes word form, agreement, tense/voice, conjunctions/prepositions, relative clauses, conditionals.",
            "Part 6: one original English email, notice, letter or article of 90-140 words containing exactly one ____ blank. text asks to fill the blank. Rotate contextual grammar, vocabulary and a whole missing sentence. No other blanks.",
            "Part 7: one original English passage of 100-170 words or 2 short related documents separated by headings. text is one English reading question testing details, inference, intent, synonym, cross-document information or sentence insertion (mark four candidate positions [1] through [4] in the passage and make the options these positions). Answer must be supported by explicit passage evidence.",
            "why: explain in Korean why the correct option is right, cite the relevant English evidence, and briefly explain why EACH other option is wrong. Include sentence meaning for Part 5. Keep explanation under 220 Korean words.",
            "Privately solve and check every question before returning JSON. Avoid ambiguous tense questions and unsupported inferences. Do not include explanations outside the JSON.",
          ].join("\n") },
          { role: "user", content: `Create today's three-question practice for ${studyDate}. Vary business topic, grammar focus and correct answer positions. ${correction}` },
        ],
      }),
      signal, cache: "no-store",
    });
    if (!response.ok) throw new Error("ai_provider_failed");
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    try {
      return rcSetSchema.parse(JSON.parse(data.choices?.[0]?.message?.content ?? "null")).questions;
    } catch {
      if (attempt === 1) throw new Error("invalid_quiz");
      correction = "The previous response failed validation. Check: exactly parts 5,6,7 in order, four DISTINCT options per question, one continuous underscore blank INSIDE Part 5 text and INSIDE Part 6 passage, sufficiently long Part 6/7 passages, nonempty Korean explanation, answer index 0..3. Return a complete NEW corrected JSON set.";
    }
  }
  throw new Error("invalid_quiz");
}
