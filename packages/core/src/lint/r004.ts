import { issue, type Rule } from "./shared";
const rule: Rule = (d) => {
  return d.kind !== "process" || d.steps.some((s) => s.kind === "start")
    ? []
    : [
        issue(
          "R004",
          d,
          `Process ${d.id} has no start step.`,
          `Mark its first step start.`,
        ),
      ];
};
export default rule;
