import { issue, type Rule } from "./shared";
const rule: Rule = (d) =>
  d.kind !== "process"
    ? []
    : d.steps
        .filter(
          (s) =>
            s.kind !== "decision" &&
            d.flows.filter((f) => f.from === s.id && f.label.trim()).length >=
              2,
        )
        .map((s) =>
          issue(
            "R012",
            s,
            `Step ${s.id} has multiple labelled outgoing flows but is not a decision.`,
            `Mark step ${s.id} as decision.`,
          ),
        );
export default rule;
