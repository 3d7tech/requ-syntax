import { issue, type Rule } from "./shared";
const rule: Rule = (d) => {
  return d.kind === "process"
    ? []
    : d.teams
        .filter(
          (t) => !d.handoffs.some((h) => h.from === t.id || h.to === t.id),
        )
        .map((t) =>
          issue(
            "R002",
            t,
            `Team ${t.id} has no handoffs.`,
            `Add a handoff to or from ${t.id}.`,
          ),
        );
};
export default rule;
