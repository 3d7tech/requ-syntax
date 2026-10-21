import { issue, type Rule } from "./shared";
const rule: Rule = (d) => {
  return d.kind !== "process"
    ? []
    : d.steps
        .filter(
          (s) => s.kind !== "end" && !d.flows.some((f) => f.from === s.id),
        )
        .map((s) =>
          issue(
            "R006",
            s,
            `Step ${s.id} has no outgoing flow.`,
            `Add an outgoing flow from ${s.id} or mark it end.`,
          ),
        );
};
export default rule;
