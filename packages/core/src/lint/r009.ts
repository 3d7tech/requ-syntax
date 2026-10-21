import { issue, type Rule } from "./shared";
const rule: Rule = (d) => {
  if (d.kind !== "process") return [];
  return d.steps
    .filter((s) => d.lanes.find((l) => l.id === s.lane)?.type === "agent")
    .filter((s) => {
      const queue = [s.id],
        seen = new Set<string>();
      while (queue.length) {
        const id = queue.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        const step = d.steps.find((x) => x.id === id);
        if (!step) continue;
        const type = d.lanes.find((l) => l.id === step.lane)?.type;
        if (id !== s.id && (type === "team" || type === "customer")) continue;
        if (step.kind === "end") return true;
        for (const f of d.flows) if (f.from === id) queue.push(f.to);
      }
      return false;
    })
    .map((s) =>
      issue(
        "R009",
        s,
        `Agent step ${s.id} can reach an end without human review.`,
        `Route output from ${s.id} through a team or customer review step if review is required.`,
      ),
    );
};
export default rule;
