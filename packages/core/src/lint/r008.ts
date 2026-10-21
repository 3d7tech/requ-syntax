import { issue, type Rule } from "./shared";
const rule: Rule = (d) => {
  return d.kind !== "process"
    ? []
    : d.lanes
        .filter((l) => !d.steps.some((s) => s.lane === l.id))
        .map((l) =>
          issue(
            "R008",
            l,
            `Lane ${l.id} has no steps.`,
            `Add a step to lane ${l.id} or remove it.`,
          ),
        );
};
export default rule;
