/** Tutor answers use plain text; leave user prompts untouched. */
export function plainTutorText(text: string) {
  return text.replace(/\*\*|__/g, "");
}
