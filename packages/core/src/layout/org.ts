import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { OrgDiagram } from "../model";
import { measure, wrap } from "./text";
import { routeEdges } from "./routing";
import type { JourneyStage, Layout } from "./types";
export function journeyTeamOrder(d: OrgDiagram): string[] {
  return [
    ...new Set([
      ...d.journey
        .flatMap((s) => s.teams)
        .filter((id) => d.teams.some((t) => t.id === id)),
      ...d.teams.map((t) => t.id),
    ]),
  ];
}
export async function layoutOrg(d: OrgDiagram): Promise<Layout> {
  const order = journeyTeamOrder(d),
    teams = order.map((id) => d.teams.find((t) => t.id === id)!);
  const stages: JourneyStage[] = d.journey.map((stage, i) => {
    const x = 16 + i * 232,
      pills: JourneyStage["pills"] = [];
    let left = x + 8,
      top = 128,
      rowHeight = 0;
    for (const id of stage.teams) {
      const label = d.teams.find((t) => t.id === id)?.label ?? id,
        lines = wrap(label, 188, 12, 3),
        width = Math.max(...lines.map((t) => measure(t, 12))) + 16,
        height = lines.length * 16 + 8;
      if (left + width > x + 216) {
        left = x + 8;
        top += rowHeight + 8;
        rowHeight = 0;
      }
      pills.push({ team: id, label, lines, x: left, y: top, width, height });
      left += width + 8;
      rowHeight = Math.max(rowHeight, height);
    }
    return {
      id: stage.id,
      x,
      y: 64,
      width: 224,
      height: Math.max(64, top + rowHeight - 64),
      pills,
    };
  });
  const contentTop = Math.max(64, ...stages.map((s) => s.y + s.height + 32));
  const elk = new ELK();
  const graph: ElkNode = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.randomSeed": "42",
      "elk.layered.spacing.nodeNodeBetweenLayers": "96",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: teams.map((t) => ({
      id: t.id,
      width: 264,
      height: Math.max(
        80 +
          (t.processes.length
            ? 16 +
              Math.min(t.processes.length, 6) * 26 +
              (t.processes.length > 6 ? 24 : 0)
            : 0),
        d.handoffs.filter((h) => h.from === t.id || h.to === t.id).length * 12 +
          32,
      ),
    })),
    edges: d.handoffs
      .filter(
        (h) =>
          teams.some((t) => t.id === h.from) &&
          teams.some((t) => t.id === h.to),
      )
      .map((h) => ({ id: h.id, sources: [h.from], targets: [h.to] })),
  });
  // ELK determines horizontal layers; explicit rows preserve journey reading order.
  let y = contentTop + 32;
  const nodes = teams.map((t) => {
    const n = graph.children!.find((n) => n.id === t.id)!;
    const result = {
      id: t.id,
      x: Math.round(n.x ?? 0) + 64,
      y,
      width: n.width!,
      height: n.height!,
    };
    y += n.height! + 64;
    return result;
  });
  const edges = routeEdges(nodes, d.handoffs, 16, contentTop),
    width = Math.max(
      480,
      stages.length * 232 + 32,
      ...nodes.map((n) => n.x + n.width + 48),
      ...edges.flatMap((e) => e.points.map((p) => p.x + 24)),
      ...edges
        .filter((e) => e.label)
        .map((e) => e.label!.x + e.label!.width + 24),
    );
  return {
    width,
    height: Math.max(
      y,
      ...edges.flatMap((e) => e.points.map((p) => p.y + 24)),
      ...edges
        .filter((e) => e.label)
        .map((e) => e.label!.y + e.label!.height + 24),
    ),
    nodes,
    edges,
    bands: [],
    stages,
  };
}
