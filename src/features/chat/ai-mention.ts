/**
 * 채팅의 "@AI" 호출 규칙. 서버(AI 답변 생성)와 화면(질문만 보기·답변 대기 표시)이 같이 쓴다.
 *
 * 기본값은 보수적으로 잡았다. 하루 AI 질문 한도(질문 창구와 공유)를 실수로 쓰지 않도록
 * - 메시지 **맨 앞**의 @AI만 호출로 본다. 문장 중간의 "@AI"는 그냥 글자다.
 * - 대소문자를 가리지 않고, 한글 자판의 전각 ＠도 받는다.
 * - "@AIbot"처럼 영문·숫자가 바로 붙으면 다른 단어로 보고 호출하지 않는다.
 * - "@AI야", "@AI님," 같은 부름말과 구분 기호(: ,)는 떼고 질문만 남긴다.
 * - 떼고 나서 질문이 비면 호출이 아니다.
 */
const MENTION = /^\s*[@＠]ai(?![a-z0-9])/i;
const VOCATIVE = /^(?:야|아|님)(?=[\s,，:：!?]|$)/;
const SEPARATORS = /^[\s,，:：]+/;

export function parseAiMention(content: string): { prompt: string } | null {
  const match = MENTION.exec(content);
  if (!match) return null;
  const prompt = content
    .slice(match[0].length)
    .replace(VOCATIVE, "")
    .replace(SEPARATORS, "")
    .trim();
  return prompt ? { prompt } : null;
}
