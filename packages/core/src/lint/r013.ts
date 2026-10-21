import { issue, type Rule } from "./shared";
const rule: Rule = (d) =>
  d.kind !== "process"
    ? []
    : d.steps
        .filter(
          (s) => s.kind === "decision" && !s.label.trimEnd().endsWith("?"),
        )
        .map((s) =>
          issue(
            "R013",
            s,
            `Decision ${s.id} has a label that does not end with "?".`,
            `Phrase the label for ${s.id} as a question ending with "?".`,
          ),
        );
export default rule;
