import { issue, type Rule } from "./shared";
const rule: Rule = (d) => {
  const actors =
    d.kind === "process"
      ? d.lanes.filter((x) => x.type === "team")
      : d.teams.filter((x) => x.type === "team" || x.type === "agent");
  return actors
    .filter((x) => !x.owner?.trim())
    .map((x) =>
      issue(
        "R001",
        x,
        `Actor ${x.id} has no owner.`,
        `Add owner="Name" to ${d.kind === "org" ? "team" : "lane"} ${x.id} on line ${x.loc.line}.`,
      ),
    );
};
export default rule;
