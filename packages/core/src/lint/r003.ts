import { issue, type Rule } from "./shared";
const rule: Rule = (d) => {
  return d.kind === "process"
    ? []
    : d.handoffs
        .filter((h) => !h.label.trim())
        .map((h) =>
          issue(
            "R003",
            h,
            `Handoff ${h.from} to ${h.to} has no label.`,
            `Add : "What moves" to the handoff on line ${h.loc.line}.`,
          ),
        );
};
export default rule;
