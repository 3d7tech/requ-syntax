import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "../src/index";
import { layoutProcess } from "../src/layout/process";
import { segments, segmentDistance, boxesOverlap } from "../src/layout/routing";
it("compacts the rating example to 2600px without increasing its recovered crossing count", () => {
  const d = parse(readFileSync("examples/bond-rating.requ", "utf8")).doc
    .diagrams[0];
  if (d.kind !== "process") throw Error("Expected process");
  const l = layoutProcess(d);
  expect(l.width).toBeLessThanOrEqual(2600);
  let crossings = 0;
  for (let i = 0; i < l.edges.length; i++)
    for (let j = i + 1; j < l.edges.length; j++)
      for (const [a, b] of segments(l.edges[i].points))
        for (const [c, d] of segments(l.edges[j].points))
          if (segmentDistance(a, b, c, d) < 0.001) crossings++;
  // Item 1 recovered the 4336px source with seven segment intersections.
  expect(crossings).toBeLessThanOrEqual(7);
  for (let i = 0; i < l.nodes.length; i++)
    for (let j = i + 1; j < l.nodes.length; j++)
      expect(boxesOverlap(l.nodes[i], l.nodes[j])).toBe(false);
  expect(l.edges).toHaveLength(d.flows.length);
});
it("shares independent lane columns while keeping successors after predecessors", () => {
  const d = parse(
    'process "Parallel"\nlane a "A"\nlane b "B"\nlane c "C"\na.start: "Start"\nb.left: "Left"\nc.right: "Right"\na.join: "Join"\nstart -> left -> join\nstart -> right -> join',
  ).doc.diagrams[0];
  if (d.kind !== "process") throw Error("Expected process");
  const l = layoutProcess(d),
    node = (id: string) => l.nodes.find((n) => n.id === id)!;
  expect(node("left").column).toBe(node("right").column);
  for (const f of d.flows)
    expect(node(f.to).column).toBeGreaterThan(node(f.from).column!);
});
