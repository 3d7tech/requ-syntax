import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { parse, render } from "../src/index";
import { layoutProcess } from "../src/layout/process";
import { layoutOrg, journeyTeamOrder } from "../src/layout/org";
import { routeEdges } from "../src/layout/routing";
import type { Box, Layout, PlacedNode, Point } from "../src/layout/types";
const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;
const parts = (points: Point[]) =>
  points.slice(1).map((p, i) => [points[i], p] as const);
function assertNoSharedSegments(l: Layout): void {
  for (let i = 0; i < l.edges.length; i++)
    for (let j = i + 1; j < l.edges.length; j++)
      for (const [a, b] of parts(l.edges[i].points))
        for (const [c, d] of parts(l.edges[j].points)) {
          const horizontal = a.y === b.y && c.y === d.y && a.y === c.y;
          const vertical = a.x === b.x && c.x === d.x && a.x === c.x;
          const amount = horizontal
            ? Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) -
              Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x))
            : vertical
              ? Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) -
                Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
              : 0;
          expect(
            amount,
            `${l.edges[i].id} and ${l.edges[j].id} share a segment`,
          ).toBeLessThanOrEqual(0.001);
        }
}
function assertNoLabelOverlap(l: Layout): void {
  const labels = [
    ...l.edges.flatMap((e) => (e.label ? [e.label] : [])),
    ...(l.stages ?? []).flatMap((s) => s.pills),
  ];
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++)
      expect(overlap(labels[i], labels[j]), `Labels ${i}/${j} overlap`).toBe(
        false,
      );
  for (const box of l.edges.flatMap((e) => (e.label ? [e.label] : [])))
    for (const node of l.nodes)
      expect(overlap(box, node), "Edge label overlaps a node").toBe(false);
}
const files = readdirSync("examples")
  .filter((f) => f.endsWith(".requ"))
  .sort();
const connection = (id: string, from: string, to: string, label = id) => ({
  id,
  from,
  to,
  label,
  loc: { line: 1, col: 1, endCol: 2 },
});
describe("renderer geometry regressions", () => {
  it.each(files)(
    "%s has no shared edge segments or overlapping label boxes",
    async (file) => {
      for (const d of parse(readFileSync("examples/" + file, "utf8")).doc
        .diagrams) {
        const layout =
          d.kind === "process" ? layoutProcess(d) : await layoutOrg(d);
        assertNoSharedSegments(layout);
        assertNoLabelOverlap(layout);
        const count = d.kind === "process" ? d.flows.length : d.handoffs.length;
        expect(layout.edges.length).toBe(count);
      }
    },
  );
  it("routes inverse edges on exactly 12px parallel tracks with separate labels", () => {
    const nodes: PlacedNode[] = [
      { id: "a", x: 200, y: 100, width: 140, height: 56 },
      { id: "b", x: 500, y: 100, width: 140, height: 56 },
    ];
    const edges = routeEdges(
      nodes,
      [
        connection("forward", "a", "b", "Request"),
        connection("return", "b", "a", "Response"),
      ],
      100,
      40,
    );
    expect(Math.abs(edges[0].points[0].y - edges[1].points.at(-1)!.y)).toBe(12);
    expect(edges[0].points).toHaveLength(2);
    expect(edges[1].points).toHaveLength(2);
    expect(overlap(edges[0].label!, edges[1].label!)).toBe(false);
    assertNoSharedSegments({
      nodes,
      edges,
      bands: [],
      width: 700,
      height: 300,
    });
  });
  it("gives four decision branches separate directional exits", () => {
    const nodes: PlacedNode[] = [
      { id: "d", x: 300, y: 300, width: 120, height: 120, diamond: true },
      { id: "left", x: 50, y: 330, width: 100, height: 56 },
      { id: "right", x: 600, y: 330, width: 100, height: 56 },
      { id: "top", x: 310, y: 80, width: 100, height: 56 },
      { id: "bottom", x: 310, y: 600, width: 100, height: 56 },
    ];
    const edges = routeEdges(
      nodes,
      ["left", "right", "top", "bottom"].map((id) => connection(id, "d", id)),
      16,
      16,
    );
    expect(edges.map((e) => e.source.side)).toEqual([
      "left",
      "right",
      "top",
      "bottom",
    ]);
    assertNoSharedSegments({
      nodes,
      edges,
      bands: [],
      width: 800,
      height: 800,
    });
  });
  it("spreads multiple ports on a side evenly", () => {
    const nodes: PlacedNode[] = [
      { id: "a", x: 100, y: 200, width: 140, height: 80 },
      ...[100, 210, 320].map((y, i) => ({
        id: "b" + i,
        x: 600,
        y,
        width: 140,
        height: 56,
      })),
    ];
    const edges = routeEdges(
      nodes,
      [0, 1, 2].map((i) => connection("e" + i, "a", "b" + i)),
      16,
      16,
    );
    expect(edges.every((e) => e.source.side === "right")).toBe(true);
    const ys = edges.map((e) => e.source.y).sort((a, b) => a - b);
    expect(ys[1] - ys[0]).toBe(ys[2] - ys[1]);
    expect(ys[1] - ys[0]).toBeGreaterThan(0);
    assertNoSharedSegments({
      nodes,
      edges,
      bands: [],
      width: 900,
      height: 600,
    });
  });
  it("sizes lanes from content plus 32px, with a 96px minimum", () => {
    const d = parse('process "X"\nlane a "A"\nlane b "B"\na.s: "S"\na.t: "T"')
      .doc.diagrams[0];
    if (d.kind !== "process") throw Error();
    const l = layoutProcess(d);
    expect(l.bands[0].height).toBe(56 + 32 + 56 + 32);
    expect(l.bands[1].height).toBe(96);
    expect(l.nodes[0].y - l.bands[0].y).toBe(16);
    expect(
      l.bands[0].y + l.bands[0].height - (l.nodes[1].y + l.nodes[1].height),
    ).toBe(16);
  });
  it("grows a decision around a long label with padding", () => {
    const d = parse(
      'process "X"\nlane a "A"\na.d: "Is the application ready for final approval?" decision',
    ).doc.diagrams[0];
    if (d.kind !== "process") throw Error();
    const n = layoutProcess(d).nodes[0];
    expect(n.width).toBeGreaterThan(72);
    expect(n.height).toBe(n.width);
  });
  it("places the suggestion badge inside its node", async () => {
    const source = 'process "X"\nlane a "A"\na.s: "Suggested" basis=suggested',
      d = parse(source).doc.diagrams[0];
    if (d.kind !== "process") throw Error();
    const node = layoutProcess(d).nodes[0],
      svg = (await render(source)).svg;
    const badge = svg.match(
      /class="badge requ-basis-badge" x="([\d.]+)" y="([\d.]+)"/,
    )!;
    expect(Number(badge[1])).toBeGreaterThan(node.x);
    expect(Number(badge[1])).toBeLessThan(node.x + node.width);
    expect(Number(badge[2])).toBeGreaterThan(node.y);
    expect(Number(badge[2])).toBeLessThan(node.y + node.height);
  });
  it("orders org rows by first journey appearance, with absent teams last", async () => {
    const source =
        'org "X"\nteam absent "Absent"\nteam last "Last"\nteam first "First"\nteam second "Second"\nstage "Begin" : first, second\nstage "Finish" : last, first',
      d = parse(source).doc.diagrams[0];
    if (d.kind !== "org") throw Error();
    expect(journeyTeamOrder(d)).toEqual(["first", "second", "last", "absent"]);
    const l = await layoutOrg(d);
    expect([...l.nodes].sort((a, b) => a.y - b.y).map((n) => n.id)).toEqual([
      "first",
      "second",
      "last",
      "absent",
    ]);
  });
  it("wraps journey team-name pills without overlap", async () => {
    const d = parse(
      'org "X"\nteam a "Customer support operations"\nteam b "Customer success operations"\nteam c "Credit decision operations"\nstage "Apply" : a, b, c',
    ).doc.diagrams[0];
    if (d.kind !== "org") throw Error();
    const l = await layoutOrg(d),
      pills = l.stages![0].pills;
    expect(pills.map((p) => p.label)).toEqual(d.teams.map((t) => t.label));
    expect(new Set(pills.map((p) => p.y)).size).toBeGreaterThan(1);
    assertNoLabelOverlap(l);
    expect(Math.min(...l.nodes.map((n) => n.y))).toBeGreaterThan(
      Math.max(...pills.map((p) => p.y + p.height)),
    );
  });
  it("hides empty process sections, removes dots and uses 4px accents", async () => {
    const svg = (await render('org "X"\nteam a "No processes"')).svg;
    expect(svg).not.toContain("requ-process-section");
    expect(svg).not.toContain("requ-process-divider");
    expect(svg).not.toContain("<circle");
    expect(svg).toContain("requ-team-accent");
    expect(svg).toContain('stroke-width="4"');
  });
  it("only annotates missing owners when requested, and only for R001 actors", async () => {
    const source =
      'org "X"\nteam human "Team"\nteam agent "Agent" type=agent\nteam outside "Outside" type=external\nteam customer "Customer" type=customer\nteam owned "Owned" owner="Owner"';
    expect((await render(source)).svg).not.toContain("No owner");
    const svg = (await render(source, { annotate: true })).svg;
    expect(svg.match(/>No owner<\/text>/g)).toHaveLength(2);
    expect(svg).toContain("font-style:italic");
    expect(svg).toContain("Owner");
  });
  it("keeps annotation output deterministic", async () => {
    const source = readFileSync("examples/northbank-org.requ", "utf8");
    expect((await render(source, { annotate: true })).svg).toBe(
      (await render(source, { annotate: true })).svg,
    );
  });
});

it("does not retrace a short vertical connection", () => {
  const nodes: PlacedNode[] = [
    { id: "a", x: 200, y: 100, width: 140, height: 56 },
    { id: "b", x: 200, y: 196, width: 140, height: 56 },
  ];
  const edges = routeEdges(nodes, [connection("e", "a", "b", "Work")], 100, 40);
  expect(edges[0].points).toHaveLength(2);
  expect(edges[0].source.side).toBe("bottom");
  expect(edges[0].target.side).toBe("top");
});
it("matches an annotated org golden SVG", async () => {
  await expect(
    (
      await render(readFileSync("examples/northbank-org.requ", "utf8"), {
        theme: "light",
        annotate: true,
      })
    ).svg,
  ).toMatchFileSnapshot(
    "../../../examples/__snapshots__/northbank-org-annotated.svg",
  );
});

it("keeps bent inverse routes 12px apart on both axes", () => {
  const nodes: PlacedNode[] = [
      { id: "a", x: 200, y: 100, width: 140, height: 56 },
      { id: "b", x: 500, y: 300, width: 140, height: 56 },
    ],
    edges = routeEdges(
      nodes,
      [connection("f", "a", "b"), connection("r", "b", "a")],
      100,
      40,
    );
  const a = parts(edges[0].points),
    b = parts([...edges[1].points].reverse());
  expect(a.length).toBe(b.length);
  expect(a.length).toBeGreaterThan(1);
  for (let i = 0; i < a.length; i++) {
    if (a[i][0].x === a[i][1].x)
      expect(Math.abs(a[i][0].x - b[i][0].x)).toBe(12);
    else expect(Math.abs(a[i][0].y - b[i][0].y)).toBe(12);
  }
  assertNoSharedSegments({ nodes, edges, bands: [], width: 800, height: 600 });
});
it("preserves paired tracks when a decision uses a different exit for its second branch", () => {
  const nodes: PlacedNode[] = [
      { id: "a", x: 200, y: 200, width: 120, height: 120, diamond: true },
      { id: "b", x: 600, y: 200, width: 140, height: 80 },
      { id: "c", x: 600, y: 500, width: 140, height: 80 },
    ],
    edges = routeEdges(
      nodes,
      [
        connection("ab", "a", "b"),
        connection("ba", "b", "a"),
        connection("ac", "a", "c"),
        connection("ca", "c", "a"),
      ],
      16,
      16,
    );
  expect(
    new Set(
      edges.filter((e) => e.source.node === "a").map((e) => e.source.side),
    ).size,
  ).toBe(2);
  assertNoSharedSegments({ nodes, edges, bands: [], width: 1000, height: 800 });
});
it("treats annotate:false exactly like the default", async () => {
  const source = 'org "X"\nteam t "T"';
  expect((await render(source, { annotate: false })).svg).toBe(
    (await render(source)).svg,
  );
});
