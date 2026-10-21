import { issue, type Rule } from "./shared";
const rule: Rule = (d) => {
  return d.kind !== "process"
    ? []
    : d.steps
        .filter(
          (s) =>
            s.kind === "decision" &&
            (d.flows.filter((f) => f.from === s.id).length < 2 ||
              d.flows.some((f) => f.from === s.id && !f.label.trim())),
        )
        .map((s) =>
          issue(
            "R007",
            s,
            `Decision ${s.id} needs at least two labelled branches.`,
            `Add two outgoing flows from ${s.id} with branch labels.`,
          ),
        );
};
export default rule;
