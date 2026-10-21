export interface Arc {
  from: string;
  to: string;
}
/** Contract explicit groups, remove DFS back edges, then longest-path layer the DAG. */
export function longestLayers(
  ids: string[],
  arcs: Arc[],
  groups: Arc[] = [],
): Map<string, number> {
  const parents = new Map(ids.map((id) => [id, id]));
  const root = (id: string): string => {
    let p = id;
    while (parents.get(p) !== p) p = parents.get(p)!;
    return p;
  };
  for (const g of groups.filter(
    (g) => parents.has(g.from) && parents.has(g.to),
  )) {
    const a = root(g.from),
      b = root(g.to);
    if (a !== b) parents.set(b, a);
  }
  const vertices = [...new Set(ids.map(root))],
    edges = arcs
      .filter((e) => parents.has(e.from) && parents.has(e.to))
      .map((e) => ({ from: root(e.from), to: root(e.to) }))
      .filter((e) => e.from !== e.to),
    back = new Set<Arc>(),
    state = new Map<string, number>();
  for (const id of vertices) {
    if (state.has(id)) continue;
    const stack: { id: string; index: number }[] = [{ id, index: 0 }];
    state.set(id, 1);
    while (stack.length) {
      const current = stack.at(-1)!,
        out = edges.filter((e) => e.from === current.id);
      if (current.index >= out.length) {
        state.set(current.id, 2);
        stack.pop();
        continue;
      }
      const e = out[current.index++];
      if (state.get(e.to) === 1) back.add(e);
      else if (!state.has(e.to)) {
        state.set(e.to, 1);
        stack.push({ id: e.to, index: 0 });
      }
    }
  }
  const dag = edges.filter((e) => !back.has(e)),
    incoming = new Map(
      vertices.map((id) => [id, dag.filter((e) => e.to === id).length]),
    ),
    layers = new Map(vertices.map((id) => [id, 0])),
    queue = vertices.filter((id) => incoming.get(id) === 0);
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of dag.filter((e) => e.from === id)) {
      layers.set(e.to, Math.max(layers.get(e.to)!, layers.get(id)! + 1));
      incoming.set(e.to, incoming.get(e.to)! - 1);
      if (incoming.get(e.to) === 0) queue.push(e.to);
    }
  }
  return new Map(ids.map((id) => [id, layers.get(root(id))!]));
}
