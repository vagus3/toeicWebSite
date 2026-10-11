/** Tutor answers use plain text; leave user prompts untouched. */
export function plainTutorText(text: string) {
  const lines = text.split("\n");
  const output: string[] = [];
  const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  for (let i = 0; i < lines.length; i++) {
    const headers = cells(lines[i]);
    const separator = cells(lines[i + 1] ?? "");
    if (headers.length > 1 && separator.length === headers.length && separator.every((cell) => /^:?-{3,}:?$/.test(cell))) {
      i++;
      while (i + 1 < lines.length && lines[i + 1].includes("|") && cells(lines[i + 1]).length === headers.length) {
        const row = cells(lines[++i]);
        output.push(headers.map((header, column) => `${header}: ${row[column]}`).join("\n"), "");
      }
    } else {
      output.push(lines[i]);
    }
  }
  return output.join("\n")
    .replace(/^\s*```[^\n]*$/gm, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^(\s*)[-+*]\s+/gm, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*|__/g, "")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1");
}
