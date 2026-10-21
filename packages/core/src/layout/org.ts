import { longestLayers } from "./layers";
import type { Diagnostic, OrgDiagram } from "../model";
import { measure, wrap } from "./text";
import { portRequirements, routeEdges } from "./routing";
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
export async function layoutOrg(
  d: OrgDiagram,
  options: { annotate?: boolean } = {},
): Promise<Layout> {
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
  const contentTop = Math.max(64, ...stages.map((s) => s.y + s.height + 32)),
    columns = longestLayers(order, d.handoffs),
    nodes: Layout["nodes"] = [];
  let rows = 0;
  const firstStage = (id: string) => {
    const index = d.journey.findIndex((s) => s.teams.includes(id));
    return index < 0 ? d.journey.length : index;
  };
  for (const team of teams) {
    const headerHeight =
      team.owner?.trim() ||
      (options.annotate && (team.type === "team" || team.type === "agent"))
        ? 80
        : 56;
    const height =
      headerHeight +
      (team.processes.length
        ? 16 +
          Math.min(team.processes.length, 6) * 26 +
          (team.processes.length > 6 ? 24 : 0)
        : 0);
    nodes.push({
      id: team.id,
      x: 0,
      y: 0,
      width: 264,
      height,
      row: firstStage(team.id),
      column: columns.get(team.id)!,
      headerHeight,
    });
  }
  // Size card sides for actual port demand before placing rows and columns.
  const valid = d.handoffs.filter(
    (e) =>
      nodes.some((n) => n.id === e.from) && nodes.some((n) => n.id === e.to),
  );
  const needed = portRequirements(nodes, valid, { mode: "column" });
  for (const n of nodes) {
    const min = needed.get(n.id)!;
    n.width = Math.max(n.width, min.width);
    n.height = Math.max(n.height, min.height);
  }
  for (const stage of [...new Set(teams.map((t) => firstStage(t.id)))]) {
    const used = new Map<number, number>();
    let groupRows = 0;
    for (const team of teams.filter((t) => firstStage(t.id) === stage)) {
      const n = nodes.find((n) => n.id === team.id)!,
        slot = used.get(n.column!) ?? 0,
        span = Math.max(1, Math.ceil((n.height + 8) / 160));
      n.row = rows + slot;
      n.y = contentTop + n.row * 160 + (span * 160 - n.height) / 2;
      used.set(n.column!, slot + span);
      groupRows = Math.max(groupRows, slot + span);
    }
    rows += groupRows;
  }
  const widths = Array.from(
    { length: Math.max(0, ...columns.values()) + 1 },
    (_, i) =>
      Math.max(264, ...nodes.filter((n) => n.column === i).map((n) => n.width)),
  );
  for (const n of nodes)
    n.x =
      64 +
      widths.slice(0, n.column).reduce((sum, w) => sum + w + 144, 0) +
      (widths[n.column!] - n.width) / 2;
  const diagnostics: Diagnostic[] = [];
  const gridHeight = contentTop + Math.max(1, rows) * 160,
    edges = routeEdges(nodes, d.handoffs, 16, contentTop, {
      mode: "column",
      diagnostics,
      maxY: gridHeight - 8,
    }),
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
    height: gridHeight,
    rows,
    diagnostics,
    journeyHeight: contentTop,
    nodes,
    edges,
    bands: [],
    stages,
  };
}
