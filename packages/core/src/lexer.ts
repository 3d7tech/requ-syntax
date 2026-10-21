import { diagnostic, type Diagnostic, type Loc } from "./model";
export interface Token {
  value: string;
  quoted: boolean;
  loc: Loc;
}
export function lexLine(
  text: string,
  line: number,
): { tokens: Token[]; diagnostics: Diagnostic[] } {
  const tokens: Token[] = [],
    diagnostics: Diagnostic[] = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) {
      i++;
      continue;
    }
    if (text[i] === "#") break;
    const start = i,
      c = text[i];
    if (['"', "'", "“", "‘"].includes(c)) {
      const end = c === "“" ? "”" : c === "‘" ? "’" : c;
      i++;
      let value = "",
        closed = false;
      while (i < text.length) {
        if (text[i] === end) {
          i++;
          closed = true;
          break;
        }
        if (text.charCodeAt(i) === 92 && i + 1 < text.length) {
          i++;
          value += text[i++];
        } else value += text[i++];
      }
      if (!closed) {
        diagnostics.push(
          diagnostic(
            "E002",
            "A quoted label is not closed.",
            { line, col: start + 1, endCol: i + 1 },
            "Close the quoted label on this line.",
          ),
        );
        break;
      }
      tokens.push({
        value,
        quoted: true,
        loc: { line, col: start + 1, endCol: i + 1 },
      });
      continue;
    }
    const arrow = text.slice(i).match(/^(-->|->|=>|→)/)?.[0];
    if (arrow) {
      i += arrow.length;
      const loc = { line, col: start + 1, endCol: i + 1 };
      if (arrow !== "->")
        diagnostics.push(
          diagnostic(
            "I001",
            "A non-standard arrow was normalised.",
            loc,
            "Use -> for arrows.",
          ),
        );
      tokens.push({ value: "->", quoted: false, loc });
      continue;
    }
    if (".:=,".includes(c)) {
      i++;
      tokens.push({
        value: c,
        quoted: false,
        loc: { line, col: start + 1, endCol: i + 1 },
      });
      continue;
    }
    while (
      i < text.length &&
      !/[\s#.:=,]/.test(text[i]) &&
      !/^(-->|->|=>|→)/.test(text.slice(i))
    )
      i++;
    if (i === start) i++;
    tokens.push({
      value: text.slice(start, i),
      quoted: false,
      loc: { line, col: start + 1, endCol: i + 1 },
    });
  }
  return { tokens, diagnostics };
}
