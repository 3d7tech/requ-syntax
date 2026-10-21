import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { OrgDiagram } from "../model";
import { measure } from "./text";
import type { Layout } from "./types";
export async function layoutOrg(d: OrgDiagram): Promise<Layout> {
  const elk = new ELK();
  const graph: ElkNode = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.randomSeed": "42",
      "elk.spacing.nodeNode": "48",
      "elk.layered.spacing.nodeNodeBetweenLayers": "96",
      "elk.padding": "[top=24,left=24,bottom=24,right=24]",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: d.teams.map((t) => ({
      id: t.id,
      width: 240,
      height:
        104 +
        Math.min(t.processes.length, 6) * 26 +
        (t.processes.length > 6 ? 24 : 0),
    })),
    edges: d.handoffs
      .filter(
        (h) =>
          d.teams.some((t) => t.id === h.from) &&
          d.teams.some((t) => t.id === h.to),
      )
      .map((h) => ({
        id: h.id,
        sources: [h.from],
        targets: [h.to],
        labels: h.label
          ? [
              {
                text: h.label,
                width: Math.min(150, measure(h.label, 11) + 12),
                height: 22,
              },
            ]
          : [],
      })),
  });
  const top = d.journey.length ? 164 : 64;
  return {
    width: Math.max(480, (graph.width ?? 0) + 32, d.journey.length * 216 + 32),
    height: (graph.height ?? 0) + top + 24,
    bands: [],
    nodes: (graph.children ?? []).map((n) => ({
      id: n.id,
      x: (n.x ?? 0) + 16,
      y: (n.y ?? 0) + top,
      width: n.width!,
      height: n.height!,
    })),
    edges: (graph.edges ?? []).flatMap((e) =>
      (e.sections ?? []).map((s) => ({
        id: e.id,
        back: false,
        points: [s.startPoint, ...(s.bendPoints ?? []), s.endPoint].map(
          (p) => ({ x: p.x + 16, y: p.y + top }),
        ),
      })),
    ),
  };
}
