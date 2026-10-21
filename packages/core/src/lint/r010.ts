import type { Common } from "../model";
import { issue, type Rule } from "./shared";
const rule: Rule = (d) => {
  const elements: Common[] =
    d.kind === "process"
      ? [d, ...d.lanes, ...d.steps, ...d.flows]
      : [
          d,
          ...d.teams,
          ...d.teams.flatMap((t) => t.processes),
          ...d.handoffs,
          ...d.journey,
        ];
  const count = elements.filter((x) => x.basis === "suggested").length;
  return count
    ? [
        issue(
          "R010",
          d,
          `Diagram ${d.id} has ${count} unconfirmed element${count === 1 ? "" : "s"}.`,
          "Review suggested elements and use basis=confirmed only after confirmation.",
        ),
      ]
    : [];
};
export default rule;
