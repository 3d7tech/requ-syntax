export function measure(text: string, size = 13): number {
  return [...text].reduce(
    (sum, c) =>
      sum +
      (/[MWmw@]/.test(c)
        ? 0.85
        : /[ilI.,' ]/.test(c)
          ? 0.29
          : /[A-Z]/.test(c)
            ? 0.65
            : 0.56) *
        size,
    0,
  );
}
export function wrap(
  text: string,
  width: number,
  size = 13,
  maxLines = 3,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (measure((current ? current + " " : "") + word, size) <= width) {
      current += (current ? " " : "") + word;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
    }
    for (const c of word) {
      if (current && measure(current + c, size) > width) {
        lines.push(current);
        current = "";
      }
      current += c;
    }
  }
  if (current || !lines.length) lines.push(current);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (last && measure(last + "…", size) > width) last = last.slice(0, -1);
    lines[maxLines - 1] = last + "…";
  }
  return lines;
}
