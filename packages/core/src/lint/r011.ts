import { issue, type Rule } from "./shared";
const rule: Rule = (d) =>
  d.kind !== "process"
    ? []
    : d.steps
        .filter((s) => s.kind === "end" && d.flows.some((f) => f.from === s.id))
        .map((s) =>
          issue(
            "R011",
            s,
            `End step ${s.id} has an outgoing flow.`,
            `Remove end from step ${s.id} or remove its outgoing flows.`,
          ),
        );
export default rule;
