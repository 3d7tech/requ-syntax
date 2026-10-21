import { lexLine, type Token } from "./lexer";
import {
  diagnostic,
  type Common,
  type Diagnostic,
  type Diagram,
  type Lane,
  type Loc,
  type ParseResult,
  type ProcessDiagram,
  type RequDocument,
  type Step,
  type Team,
} from "./model";
const idPattern = /^[a-z][a-z0-9_]*$/i;
const actorTypes = ["customer", "team", "agent", "external"];
const bases = ["website", "research", "suggested", "confirmed"];
const kinds = ["task", "start", "end", "decision", "wait"];
export const MAX_INPUT_LENGTH = 100000;
export const MAX_STATEMENTS = 2000;
export function parse(text: string): ParseResult {
  try {
    return parseDocument(text);
  } catch {
    return {
      doc: { diagrams: [] },
      diagnostics: [
        diagnostic(
          "E999",
          "The document could not be parsed.",
          undefined,
          "Use plain Requ text with one statement per line.",
        ),
      ],
    };
  }
}
function parseDocument(text: string): ParseResult {
  const doc: RequDocument = { diagrams: [] },
    diagnostics: Diagnostic[] = [];
  if (typeof text !== "string" || text.length > MAX_INPUT_LENGTH)
    return {
      doc,
      diagnostics: [
        diagnostic(
          "E007",
          "The input exceeds the supported size.",
          undefined,
          "Use at most 100,000 characters.",
        ),
      ],
    };
  let current: Diagram | undefined,
    count = 0;
  const explicit = new Map<Lane, Set<string>>();
  const add = (code: string, msg: string, loc?: Loc, hint?: string) =>
    diagnostics.push(diagnostic(code, msg, loc, hint));
  const replace = <T extends Common>(items: T[], item: T) => {
    const i = items.findIndex((x) => x.id === item.id);
    if (i < 0) items.push(item);
    else {
      items[i] = item;
      add(
        "W001",
        `Duplicate id ${item.id} was replaced.`,
        item.loc,
        `Keep one declaration of ${item.id}.`,
      );
    }
  };
  const identifier = (t: Token | undefined) => {
    if (!t || t.quoted || !idPattern.test(t.value))
      throw Error("Expected an identifier.");
    return t.value.toLowerCase();
  };
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const result = lexLine(line, index + 1);
    diagnostics.push(...result.diagnostics);
    const t = result.tokens;
    if (!t.length || result.diagnostics.some((d) => d.severity === "error"))
      continue;
    if (++count > MAX_STATEMENTS) {
      add(
        "E007",
        "The document has too many statements.",
        t[0].loc,
        "Split the document into files of at most 2,000 statements.",
      );
      break;
    }
    const loc = { line: index + 1, col: t[0].loc.col, endCol: line.length + 1 },
      word = t[0].value.toLowerCase();
    let cursor = 0;
    const attrs = (allowed: string[]) => {
      const values: Record<string, string> = {};
      while (cursor < t.length) {
        const key = t[cursor++].value.toLowerCase();
        if (t[cursor]?.value !== "=" || !t[cursor + 1])
          throw Error("Expected key=value after the label.");
        cursor++;
        const val = t[cursor++].value;
        if (
          !allowed.includes(key) ||
          (key === "type" && !actorTypes.includes(val.toLowerCase())) ||
          (key === "basis" && !bases.includes(val.toLowerCase()))
        ) {
          add(
            "W002",
            `Unknown attribute or value ${key}=${val}.`,
            loc,
            `Use a supported ${key} value or remove it.`,
          );
          continue;
        }
        values[key] = ["type", "basis", "sub", "ref"].includes(key)
          ? val.toLowerCase()
          : val;
      }
      return values;
    };
    const common = (
      id: string,
      label: string,
      a: Record<string, string>,
    ): Common => ({
      id,
      label,
      loc,
      ...(a.basis ? { basis: a.basis as Common["basis"] } : {}),
      ...(a.note ? { note: a.note } : {}),
    });
    const label = () => {
      const x = t[cursor++];
      if (!x || (!x.quoted && !idPattern.test(x.value)))
        throw Error("Expected a label.");
      return x.value;
    };
    const shared = ["basis", "note"];
    try {
      if (word === "requ") {
        if (count !== 1) throw Error("Put the version before all diagrams.");
        const version = t
          .slice(1)
          .map((x) => x.value)
          .join("");
        doc.version = version;
        if (version !== "0.1")
          add(
            "W006",
            `Version ${version} is not supported.`,
            loc,
            "Use requ 0.1.",
          );
        continue;
      }
      if (word === "org" || word === "process") {
        cursor = 1;
        if (
          word === "process" &&
          current?.kind === "org" &&
          t[1] &&
          !t[1].quoted &&
          current.teams.some((x) => x.id === t[1].value.toLowerCase())
        ) {
          const teamId = identifier(t[cursor++]),
            team = current.teams.find((x) => x.id === teamId)!;
          const name = label(),
            a = attrs([...shared, "owner", "ref"]);
          team.processes.push({
            ...common(
              `${teamId}_process_${team.processes.length + 1}`,
              name,
              a,
            ),
            team: teamId,
            ...(a.ref ? { ref: a.ref } : {}),
            ...(a.owner ? { owner: a.owner } : {}),
          });
          continue;
        }
        if (word === "org" && doc.diagrams.some((d) => d.kind === "org"))
          throw Error("Only one org diagram is allowed per file.");
        let id = word === "org" ? "org" : `process_${doc.diagrams.length + 1}`;
        if (
          word === "process" &&
          t[cursor] &&
          !t[cursor].quoted &&
          t[cursor + 1] &&
          t[cursor + 1].value !== "="
        )
          id = identifier(t[cursor++]);
        else if (
          word === "process" &&
          doc.diagrams.some((d) => d.kind === "process")
        )
          throw Error("Give later process diagrams an explicit id.");
        const name = label(),
          a = attrs([...shared, "owner"]);
        current =
          word === "org"
            ? {
                ...common(id, name, a),
                kind: "org",
                teams: [],
                handoffs: [],
                journey: [],
              }
            : {
                ...common(id, name, a),
                kind: "process",
                lanes: [],
                steps: [],
                flows: [],
                ...(a.owner ? { owner: a.owner } : {}),
              };
        replace(doc.diagrams, current);
        continue;
      }
      if (!current) throw Error("Start with a process or org header.");
      if (word === "lane" || word === "team") {
        if (
          (word === "lane" && current.kind !== "process") ||
          (word === "team" && current.kind !== "org")
        )
          throw Error("Use lanes in processes and teams in org diagrams.");
        cursor = 1;
        const id = identifier(t[cursor++]),
          name = label(),
          a = attrs([...shared, "owner", "type"]);
        const lane: Lane = {
          ...common(id, name, a),
          type: (a.type ?? "team") as Lane["type"],
          ...(a.owner ? { owner: a.owner } : {}),
        };
        explicit.set(lane, new Set(Object.keys(a)));
        if (current.kind === "process") replace(current.lanes, lane);
        else replace(current.teams, { ...lane, processes: [] } as Team);
        continue;
      }
      if (word === "stage") {
        if (current.kind !== "org")
          throw Error("Stages belong in an org diagram.");
        cursor = 1;
        const name = label();
        if (t[cursor++]?.value !== ":")
          throw Error("Put : before stage teams.");
        const teams: string[] = [];
        while (cursor < t.length) {
          teams.push(identifier(t[cursor++]));
          if (cursor < t.length && t[cursor++]?.value !== ",")
            throw Error("Separate stage teams with commas.");
        }
        current.journey.push({
          ...common(`stage_${current.journey.length + 1}`, name, {}),
          teams,
        });
        continue;
      }
      if (word === "handoff" || t.some((x) => !x.quoted && x.value === "->")) {
        if (word === "handoff" && current.kind !== "org")
          throw Error("Handoffs belong in an org diagram.");
        if (word !== "handoff" && current.kind !== "process")
          throw Error("Use handoff between org teams.");
        cursor = word === "handoff" ? 1 : 0;
        const ids = [identifier(t[cursor++])];
        while (t[cursor]?.value === "->") {
          cursor++;
          ids.push(identifier(t[cursor++]));
        }
        if (ids.length < 2) throw Error("An arrow needs two ids.");
        let name = "";
        if (t[cursor]?.value === ":") {
          cursor++;
          name = label();
        }
        const a = attrs(shared);
        const edges =
          current.kind === "process" ? current.flows : current.handoffs;
        for (let j = 1; j < ids.length; j++)
          edges.push({
            ...common(`edge_${edges.length + 1}`, name, a),
            from: ids[j - 1],
            to: ids[j],
          });
        continue;
      }
      if (current.kind === "process") {
        cursor = 0;
        let lane = "",
          id = identifier(t[cursor++]);
        if (t[cursor]?.value === ".") {
          cursor++;
          lane = id;
          id = identifier(t[cursor++]);
        } else {
          lane = current.lanes.at(-1)?.id ?? "unassigned";
          add(
            "W004",
            `Step ${id} uses the last declared lane.`,
            loc,
            `Write ${lane}.${id}: before its label.`,
          );
        }
        if (t[cursor++]?.value !== ":")
          throw Error("Put : before the step label.");
        const name = label();
        let kind: Step["kind"] = "task";
        if (
          t[cursor] &&
          kinds.includes(t[cursor].value.toLowerCase()) &&
          t[cursor + 1]?.value !== "="
        )
          kind = t[cursor++].value.toLowerCase() as Step["kind"];
        const a = attrs([...shared, "sub", "system"]);
        replace(current.steps, {
          ...common(id, name, a),
          lane,
          kind,
          ...(a.sub ? { sub: a.sub } : {}),
          ...(a.system ? { system: a.system } : {}),
        });
        continue;
      }
      throw Error("Unknown statement.");
    } catch (e) {
      add(
        "E001",
        e instanceof Error ? e.message : "Unknown statement.",
        loc,
        "Use a supported statement from LANGUAGE.md.",
      );
    }
  }
  if (!doc.diagrams.length)
    add(
      "E005",
      "No process or org header was found.",
      undefined,
      'Add process "Title" as the first diagram header.',
    );
  // Inherit omitted actor fields from explicit lane declarations anywhere in the file.
  const lanes = doc.diagrams.flatMap((d) =>
    d.kind === "process" ? d.lanes : [],
  );
  for (const lane of lanes)
    for (const key of ["owner", "type"] as const) {
      const sources = lanes.filter(
        (x) => x.id === lane.id && explicit.get(x)?.has(key),
      );
      if (!explicit.get(lane)?.has(key) && sources[0]) {
        if (key === "owner") lane.owner = sources[0].owner;
        else lane.type = sources[0].type;
      }
      if (
        sources.some((x) => x[key] !== sources[0]?.[key]) &&
        explicit.get(lane)?.has(key)
      )
        add(
          "W007",
          `Actor ${lane.id} has conflicting ${key} values.`,
          lane.loc,
          `Use one ${key} for actor ${lane.id} across processes.`,
        );
    }
  for (const d of doc.diagrams) {
    if (d.kind === "process") {
      const ensureLane = () => {
        if (!d.lanes.some((x) => x.id === "unassigned"))
          d.lanes.push({
            id: "unassigned",
            label: "Unassigned",
            type: "team",
            loc: d.loc,
          });
      };
      for (const edge of d.flows)
        for (const id of [edge.from, edge.to])
          if (!d.steps.some((x) => x.id === id)) {
            ensureLane();
            d.steps.push({
              id,
              label: id,
              lane: "unassigned",
              kind: "task",
              loc: edge.loc,
            });
            add(
              "W003",
              `Undeclared step ${id} was created in Unassigned.`,
              edge.loc,
              `Declare a lane and a step named ${id}.`,
            );
          }
      for (const step of d.steps) {
        if (!d.lanes.some((x) => x.id === step.lane)) {
          if (step.lane === "unassigned") ensureLane();
          else
            add(
              "E003",
              `Step ${step.id} refers to unknown lane ${step.lane}.`,
              step.loc,
              `Declare lane ${step.lane} before rendering this step.`,
            );
        }
        if (
          step.sub &&
          !doc.diagrams.some((x) => x.kind === "process" && x.id === step.sub)
        )
          add(
            "E006",
            `Sub-process ${step.sub} was not found.`,
            step.loc,
            `Add process ${step.sub} or remove sub=${step.sub}.`,
          );
      }
    } else {
      for (const h of d.handoffs)
        for (const id of [h.from, h.to])
          if (!d.teams.some((t) => t.id === id))
            add(
              "E003",
              `Handoff refers to unknown team ${id}.`,
              h.loc,
              `Declare team ${id}.`,
            );
      for (const stage of d.journey)
        for (const id of stage.teams)
          if (!d.teams.some((t) => t.id === id))
            add(
              "E003",
              `Stage refers to unknown team ${id}.`,
              stage.loc,
              `Declare team ${id}.`,
            );
      for (const p of d.teams.flatMap((t) => t.processes))
        if (
          p.ref &&
          !doc.diagrams.some((x) => x.kind === "process" && x.id === p.ref)
        )
          add(
            "W005",
            `Referenced process ${p.ref} was not found.`,
            p.loc,
            `Add process ${p.ref} or remove ref=${p.ref}.`,
          );
    }
  }
  const processes = doc.diagrams.filter(
    (d): d is ProcessDiagram => d.kind === "process",
  );
  for (const p of processes) {
    const stack: { id: string; path: string[] }[] = [{ id: p.id, path: [] }];
    let invalid = false;
    while (stack.length && !invalid) {
      const { id, path } = stack.pop()!;
      if (path.includes(id) || path.length >= 5) {
        invalid = true;
        break;
      }
      const target = processes.find((x) => x.id === id);
      for (const s of target?.steps ?? [])
        if (s.sub) stack.push({ id: s.sub, path: [...path, id] });
    }
    if (invalid)
      add(
        "E004",
        `Process ${p.id} has a cycle or exceeds five levels.`,
        p.loc,
        "Remove the cyclic sub reference or reduce nesting to five processes.",
      );
  }
  return { doc, diagnostics };
}
