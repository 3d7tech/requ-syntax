import type { Common, Diagnostic, Diagram, ProcessDiagram } from "../model";
export type Rule = (diagram: Diagram) => Diagnostic[];
export function issue(
  code: string,
  target: Common,
  message: string,
  hint: string,
): Diagnostic {
  return {
    code,
    severity:
      code === "R003" || code === "R008" || code === "R009" || code === "R010"
        ? "info"
        : "warning",
    message,
    hint,
    loc: target.loc,
  };
}
export function reached(d: ProcessDiagram): Set<string> {
  const found = new Set<string>(),
    queue = d.steps.filter((s) => s.kind === "start").map((s) => s.id);
  while (queue.length) {
    const id = queue.pop()!;
    if (found.has(id)) continue;
    found.add(id);
    for (const f of d.flows) if (f.from === id) queue.push(f.to);
  }
  return found;
}
