import { issue, type Rule, reached } from "./shared";
const rule: Rule = (d) => {
  if (d.kind !== "process") return [];
  const seen = reached(d);
  return d.steps
    .filter((s) => !seen.has(s.id))
    .map((s) =>
      issue(
        "R005",
        s,
        `Step ${s.id} cannot be reached from a start.`,
        `Connect ${s.id} to a reachable step or mark it start.`,
      ),
    );
};
export default rule;
