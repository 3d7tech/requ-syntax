import type { Common } from "../model";
import { measure, wrap } from "./text";
import type {
  Box,
  PlacedEdge,
  PlacedLabel,
  PlacedNode,
  Point,
  Port,
  Side,
} from "./types";
export interface Connection extends Common {
  from: string;
  to: string;
}
const EPS = 0.001;
const same = (a: number, b: number) => Math.abs(a - b) < EPS;
export function segments(points: Point[]): [Point, Point][] {
  return points
    .slice(1)
    .map((p, i): [Point, Point] => [points[i], p])
    .filter(([a, b]) => !same(a.x, b.x) || !same(a.y, b.y));
}
export function segmentsOverlap(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
): boolean {
  if (same(a.y, b.y) && same(c.y, d.y) && same(a.y, c.y))
    return (
      Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) -
        Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) >
      EPS
    );
  if (same(a.x, b.x) && same(c.x, d.x) && same(a.x, c.x))
    return (
      Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) -
        Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) >
      EPS
    );
  return false;
}
export function boxesOverlap(a: Box, b: Box, pad = 0): boolean {
  return (
    a.x < b.x + b.width + pad &&
    b.x < a.x + a.width + pad &&
    a.y < b.y + b.height + pad &&
    b.y < a.y + a.height + pad
  );
}
function hits(a: Point, b: Point, box: Box, pad = 8): boolean {
  const x = box.x - pad,
    y = box.y - pad,
    w = box.width + 2 * pad,
    h = box.height + 2 * pad;
  if (same(a.y, b.y))
    return (
      a.y > y + EPS &&
      a.y < y + h - EPS &&
      Math.max(a.x, b.x) > x + EPS &&
      Math.min(a.x, b.x) < x + w - EPS
    );
  return (
    a.x > x + EPS &&
    a.x < x + w - EPS &&
    Math.max(a.y, b.y) > y + EPS &&
    Math.min(a.y, b.y) < y + h - EPS
  );
}
function directions(a: PlacedNode, b: PlacedNode): Side[] {
  const dx = b.x + b.width / 2 - a.x - a.width / 2,
    dy = b.y + b.height / 2 - a.y - a.height / 2;
  const scores: { side: Side; score: number }[] = [
    { side: "right", score: dx },
    { side: "left", score: -dx },
    { side: "bottom", score: dy },
    { side: "top", score: -dy },
  ];
  return scores.sort((x, y) => y.score - x.score).map((x) => x.side);
}
interface Request {
  edge: Connection;
  node: PlacedNode;
  side: Side;
  out: boolean;
  port?: Port;
}
function allocatePorts(
  nodes: PlacedNode[],
  edges: Connection[],
): Map<string, { source: Port; target: Port }> {
  const map = new Map(nodes.map((n) => [n.id, n])),
    requests: Request[] = [],
    used = new Map<string, Set<Side>>();
  const sourceSides = new Map<string, Side>();
  for (const edge of edges) {
    const a = map.get(edge.from)!,
      b = map.get(edge.to)!;
    let side = edge.from === edge.to ? ("right" as Side) : directions(a, b)[0];
    if (a.diamond) {
      const sides = used.get(a.id) ?? new Set<Side>();
      side = directions(a, b).find((s) => !sides.has(s)) ?? side;
      sides.add(side);
      used.set(a.id, sides);
    }
    sourceSides.set(edge.id, side);
  }
  for (const edge of edges) {
    const a = map.get(edge.from)!,
      b = map.get(edge.to)!,
      reverse = edges.find(
        (e) => e.id !== edge.id && e.from === edge.to && e.to === edge.from,
      );
    requests.push(
      { edge, node: a, side: sourceSides.get(edge.id)!, out: true },
      {
        edge,
        node: b,
        side:
          edge.from === edge.to
            ? "bottom"
            : reverse
              ? sourceSides.get(reverse.id)!
              : directions(b, a)[0],
        out: false,
      },
    );
  }
  for (const node of nodes)
    for (const side of ["left", "right", "top", "bottom"] as Side[]) {
      const group = requests.filter((r) => r.node === node && r.side === side),
        ordered: Request[] = [],
        pending = [...group];
      while (pending.length) {
        const request = pending.shift()!;
        const reverse = pending.find(
          (r) =>
            r.edge.from === request.edge.to &&
            r.edge.to === request.edge.from &&
            r.out !== request.out,
        );
        if (reverse) {
          pending.splice(pending.indexOf(reverse), 1);
          const normalPositive = side === "right" || side === "top";
          const forwardFirst = request.out === normalPositive;
          ordered.push(
            ...(forwardFirst ? [request, reverse] : [reverse, request]),
          );
        } else ordered.push(request);
      }
      const available =
        (side === "left" || side === "right" ? node.height : node.width) - 24;
      const spacing = Math.min(12, available / Math.max(1, ordered.length - 1));
      ordered.forEach((r, i) => {
        const offset = (i - (ordered.length - 1) / 2) * spacing,
          cx = node.x + node.width / 2,
          cy = node.y + node.height / 2;
        let x = cx,
          y = cy;
        if (side === "left" || side === "right") {
          y += offset;
          x +=
            (side === "right" ? 1 : -1) *
            (node.width / 2 -
              (node.diamond
                ? (Math.abs(offset) * node.width) / node.height
                : 0));
        } else {
          x += offset;
          y +=
            (side === "bottom" ? 1 : -1) *
            (node.height / 2 -
              (node.diamond
                ? (Math.abs(offset) * node.height) / node.width
                : 0));
        }
        r.port = { x, y, side, node: node.id };
      });
    }
  return new Map(
    edges.map((e) => [
      e.id,
      {
        source: requests.find((r) => r.edge === e && r.out)!.port!,
        target: requests.find((r) => r.edge === e && !r.out)!.port!,
      },
    ]),
  );
}
function stub(p: Port, n: PlacedNode): Point {
  switch (p.side) {
    case "left":
      return { x: n.x - 32, y: p.y };
    case "right":
      return { x: n.x + n.width + 32, y: p.y };
    case "top":
      return { x: p.x, y: n.y - 32 };
    case "bottom":
      return { x: p.x, y: n.y + n.height + 32 };
  }
}
function simplify(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const p of points) {
    if (
      result.length &&
      same(p.x, result.at(-1)!.x) &&
      same(p.y, result.at(-1)!.y)
    )
      continue;
    result.push(p);
    while (result.length > 2) {
      const a = result.at(-3)!,
        b = result.at(-2)!,
        c = result.at(-1)!;
      if (
        (same(a.x, b.x) && same(b.x, c.x) && (b.y - a.y) * (c.y - b.y) >= 0) ||
        (same(a.y, b.y) && same(b.y, c.y) && (b.x - a.x) * (c.x - b.x) >= 0)
      )
        result.splice(result.length - 2, 1);
      else break;
    }
  }
  return result;
}
interface Entry {
  key: string;
  x: number;
  y: number;
  dir: number;
  cost: number;
  priority: number;
}
class Heap {
  items: Entry[] = [];
  push(value: Entry): void {
    let i = this.items.length;
    this.items.push(value);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.items[p].priority <= value.priority) break;
      this.items[i] = this.items[p];
      i = p;
    }
    this.items[i] = value;
  }
  pop(): Entry | undefined {
    const first = this.items[0],
      last = this.items.pop();
    if (this.items.length && last) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        if (
          child + 1 < this.items.length &&
          this.items[child + 1].priority < this.items[child].priority
        )
          child++;
        if (this.items[child].priority >= last.priority) break;
        this.items[i] = this.items[child];
        i = child;
      }
      this.items[i] = last;
    }
    return first;
  }
}
function path(
  start: Point,
  end: Point,
  nodes: PlacedNode[],
  occupied: [Point, Point][],
  minX: number,
  minY: number,
  pad: number,
): Point[] {
  const xs = new Set<number>([start.x, end.x, minX]),
    ys = new Set<number>([start.y, end.y, minY]);
  for (const n of nodes) {
    for (const x of [
      n.x - 32,
      n.x - 44,
      n.x + n.width + 32,
      n.x + n.width + 44,
    ])
      if (x >= minX) xs.add(x);
    for (const y of [
      n.y - 32,
      n.y - 44,
      n.y + n.height + 32,
      n.y + n.height + 44,
    ])
      if (y >= minY) ys.add(y);
  }
  for (const [a, b] of occupied) {
    for (const p of [a, b]) {
      if (p.x - 12 >= minX) xs.add(p.x - 12);
      xs.add(p.x + 12);
      if (p.y - 12 >= minY) ys.add(p.y - 12);
      ys.add(p.y + 12);
    }
  }
  const xList = [...xs].sort((a, b) => a - b),
    yList = [...ys].sort((a, b) => a - b),
    sx = xList.indexOf(start.x),
    sy = yList.indexOf(start.y),
    ex = xList.indexOf(end.x),
    ey = yList.indexOf(end.y);
  const open = new Heap(),
    best = new Map<string, number>(),
    previous = new Map<string, string>(),
    entries = new Map<string, Entry>();
  const first: Entry = {
    key: `${sx},${sy},0`,
    x: sx,
    y: sy,
    dir: 0,
    cost: 0,
    priority: 0,
  };
  open.push(first);
  best.set(first.key, 0);
  entries.set(first.key, first);
  const clear = new Map<string, boolean>();
  let visited = 0;
  while (open.items.length) {
    const current = open.pop()!;
    if (current.cost !== best.get(current.key)) continue;
    if (current.x === ex && current.y === ey) {
      const route: Point[] = [];
      let key: string | undefined = current.key;
      while (key) {
        const e: Entry = entries.get(key)!;
        route.push({ x: xList[e.x], y: yList[e.y] });
        key = previous.get(key);
      }
      return route.reverse();
    }
    if (++visited > 160000) throw Error("Routing search limit exceeded.");
    for (const [dx, dy, dir] of [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 2],
      [0, -1, 2],
    ]) {
      const x = current.x + dx,
        y = current.y + dy;
      if (x < 0 || y < 0 || x >= xList.length || y >= yList.length) continue;
      const a = { x: xList[current.x], y: yList[current.y] },
        b = { x: xList[x], y: yList[y] },
        segmentKey = [current.x, current.y, x, y].join(",");
      let allowed = clear.get(segmentKey);
      if (allowed === undefined) {
        allowed =
          !nodes.some((n) => hits(a, b, n, pad)) &&
          !occupied.some(([c, d]) => segmentsOverlap(a, b, c, d));
        clear.set(segmentKey, allowed);
      }
      if (!allowed) continue;
      const cost =
          current.cost +
          Math.abs(a.x - b.x) +
          Math.abs(a.y - b.y) +
          (current.dir && current.dir !== dir ? 18 : 0),
        key = `${x},${y},${dir}`;
      if (cost >= (best.get(key) ?? Infinity)) continue;
      const entry = {
        key,
        x,
        y,
        dir,
        cost,
        priority: cost + Math.abs(b.x - end.x) + Math.abs(b.y - end.y),
      };
      best.set(key, cost);
      previous.set(key, current.key);
      entries.set(key, entry);
      open.push(entry);
    }
  }
  throw Error("No free orthogonal route.");
}
function offsetPath(points: Point[], distance: number): Point[] {
  const ss = segments(points),
    normals = ss.map(([a, b]) => ({
      x: same(a.x, b.x) ? -Math.sign(b.y - a.y) * distance : 0,
      y: same(a.y, b.y) ? Math.sign(b.x - a.x) * distance : 0,
    }));
  return points.map((p, i) => {
    if (i === 0) return { x: p.x + normals[0].x, y: p.y + normals[0].y };
    if (i === points.length - 1)
      return { x: p.x + normals.at(-1)!.x, y: p.y + normals.at(-1)!.y };
    const a = normals[i - 1],
      b = normals[i];
    return { x: p.x + (a.x || b.x), y: p.y + (a.y || b.y) };
  });
}
function labels(
  edges: PlacedEdge[],
  connections: Connection[],
  nodes: PlacedNode[],
  minX: number,
  minY: number,
): void {
  const placed: PlacedLabel[] = [];
  for (const edge of edges) {
    const text = connections.find((c) => c.id === edge.id)!.label;
    if (!text) continue;
    const lines = wrap(text, 144, 12, 3),
      width = Math.max(...lines.map((t) => measure(t, 12))) + 16,
      height = lines.length * 16 + 8;
    const ss = segments(edge.points).sort(
      ([a, b], [c, d]) =>
        Math.abs(d.x - c.x) +
        Math.abs(d.y - c.y) -
        (Math.abs(b.x - a.x) + Math.abs(b.y - a.y)),
    );
    let found: PlacedLabel | undefined;
    for (const normal of [0, -1, 1, -2, 2, -3, 3, -4, 4, -6, 6]) {
      if (found) break;
      for (const [a, b] of ss) {
        if (found) break;
        for (const t of [0.5, 0.3, 0.7, 0.15, 0.85]) {
          const horizontal = same(a.y, b.y),
            x =
              a.x +
              (b.x - a.x) * t +
              (horizontal ? 0 : normal * (width / 2 + 8)),
            y =
              a.y +
              (b.y - a.y) * t +
              (horizontal ? normal * (height / 2 + 8) : 0);
          const box = {
            x: x - width / 2,
            y: y - height / 2,
            width,
            height,
            lines,
          };
          if (
            box.x < minX ||
            box.y < minY ||
            nodes.some((n) => boxesOverlap(box, n, 8)) ||
            placed.some((p) => boxesOverlap(box, p, 6))
          )
            continue;
          // Keep labels clear of other routes; paired labels naturally stagger.
          if (
            edges.some(
              (other) =>
                other !== edge &&
                segments(other.points).some(([c, d]) => hits(c, d, box, 3)),
            )
          )
            continue;
          found = box;
          break;
        }
      }
    }
    if (!found) {
      const right =
        Math.max(
          minX,
          ...nodes.map((n) => n.x + n.width),
          ...placed.map((p) => p.x + p.width),
        ) + 32;
      found = {
        x: right,
        y: Math.max(minY, edge.points[0].y - height / 2),
        width,
        height,
        lines,
      };
      while (placed.some((p) => boxesOverlap(found!, p, 6)))
        found.y += height + 8;
    }
    edge.label = found;
    placed.push(found);
  }
}
export function routeEdges(
  nodes: PlacedNode[],
  connections: Connection[],
  minX: number,
  minY: number,
): PlacedEdge[] {
  const valid = connections.filter(
      (c) =>
        nodes.some((n) => n.id === c.from) && nodes.some((n) => n.id === c.to),
    ),
    ports = allocatePorts(nodes, valid),
    occupied: [Point, Point][] = [],
    result = new Map<string, PlacedEdge>(),
    nodeMap = new Map(nodes.map((n) => [n.id, n]));
  // Route inverse pairs first so their two tracks can be offset exactly 12 px.
  const pending = [...valid].sort(
    (a, b) =>
      Number(
        valid.some((e) => e.from === b.to && e.to === b.from && e.id !== b.id),
      ) -
      Number(
        valid.some((e) => e.from === a.to && e.to === a.from && e.id !== a.id),
      ),
  );
  for (const connection of pending) {
    if (result.has(connection.id)) continue;
    const { source, target } = ports.get(connection.id)!,
      a = nodeMap.get(source.node)!,
      b = nodeMap.get(target.node)!;
    const reverse = pending.find(
      (e) =>
        e.id !== connection.id &&
        !result.has(e.id) &&
        e.from === connection.to &&
        e.to === connection.from &&
        e.from !== e.to,
    );
    const start = stub(source, a),
      end = stub(target, b);
    const outward = (p: Port, q: Point) =>
      p.side === "left"
        ? q.x < p.x
        : p.side === "right"
          ? q.x > p.x
          : p.side === "top"
            ? q.y < p.y
            : q.y > p.y;
    const direct =
      (same(source.x, target.x) || same(source.y, target.y)) &&
      connection.from !== connection.to &&
      outward(source, target) &&
      outward(target, source) &&
      !nodes
        .filter((n) => n.id !== a.id && n.id !== b.id)
        .some((n) => hits(source, target, n)) &&
      !occupied.some(([c, d]) => segmentsOverlap(source, target, c, d));
    const middle = direct
      ? []
      : path(
          start,
          end,
          nodes,
          [
            ...occupied,
            ...segments([source, start]),
            ...segments([end, target]),
          ],
          minX,
          minY,
          reverse ? 20 : 8,
        );
    const points = direct
      ? [source, target]
      : simplify([source, ...middle, target]);
    const edge: PlacedEdge = {
      id: connection.id,
      points,
      back: b.x <= a.x || connection.from === connection.to,
      source,
      target,
      ...(reverse ? { pair: reverse.id } : {}),
    };
    if (
      segments(points).some(([p, q]) =>
        occupied.some(([c, d]) => segmentsOverlap(p, q, c, d)),
      )
    )
      throw Error("Port segment conflicts with an earlier route.");
    result.set(connection.id, edge);
    occupied.push(...segments(points));
    if (reverse) {
      const rp = ports.get(reverse.id)!;
      let parallel = offsetPath(points, 12).reverse();
      const first = parallel[0],
        last = parallel.at(-1)!;
      // Port ordering follows the directed segment normal; use its signed offset.
      if (
        Math.abs(first.x - rp.source.x) + Math.abs(first.y - rp.source.y) > 1 ||
        Math.abs(last.x - rp.target.x) + Math.abs(last.y - rp.target.y) > 1
      )
        parallel = offsetPath(points, -12).reverse();
      parallel[0] = rp.source;
      parallel[parallel.length - 1] = rp.target;
      parallel = simplify(parallel);
      if (
        segments(parallel).some(([p, q]) => !same(p.x, q.x) && !same(p.y, q.y))
      )
        throw Error("Parallel track port mismatch.");
      if (
        segments(parallel).some(([p, q]) =>
          occupied.some(([c, d]) => segmentsOverlap(p, q, c, d)),
        )
      )
        throw Error("Parallel track conflicts with an earlier route.");
      result.set(reverse.id, {
        id: reverse.id,
        points: parallel,
        back: true,
        source: rp.source,
        target: rp.target,
        pair: connection.id,
      });
      occupied.push(...segments(parallel));
    }
  }
  const edges = valid.map((c) => result.get(c.id)!);
  labels(edges, valid, nodes, minX, minY);
  return edges;
}
