import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse, lint } from "../src/index";
const codes = (text: string) => lint(parse(text).doc).map((d) => d.code);
const p = 'process "X"\nlane t "Team" owner="Owner"\n';
const fixtures: [string, string, string][] = [
  ["R001", 'org "X"\nteam t "T"', 'org "X"\nteam t "T" owner="O"'],
  [
    "R002",
    'org "X"\nteam t "T"',
    'org "X"\nteam t "T"\nhandoff t -> t : "Work"',
  ],
  [
    "R003",
    'org "X"\nteam t "T"\nhandoff t -> t',
    'org "X"\nteam t "T"\nhandoff t -> t : "Work"',
  ],
  ["R004", p + 't.a: "A"', p + 't.a: "A" start'],
  [
    "R005",
    p + 't.a: "A" start\nt.b: "B" end',
    p + 't.a: "A" start\nt.b: "B" end\na -> b',
  ],
  ["R006", p + 't.a: "A" start', p + 't.a: "A" end'],
  [
    "R007",
    p + 't.a: "A" decision',
    p +
      't.a: "A" decision\nt.b: "B" end\nt.c: "C" end\na -> b : "yes"\na -> c : "no"',
  ],
  ["R008", p, p + 't.a: "A" start'],
  [
    "R009",
    'process "X"\nlane a "Agent" type=agent\nlane t "Team" owner="O"\na.s: "S" start\na.e: "E" end\ns -> e',
    'process "X"\nlane a "Agent" type=agent\nlane t "Team" owner="O"\na.s: "S" start\nt.r: "Review"\nt.e: "E" end\ns -> r -> e',
  ],
  ["R010", p + 't.a: "A" basis=suggested', p + 't.a: "A" basis=confirmed'],
];
describe("lint rules", () => {
  it.each(fixtures)("%s flags its failing fixture", (code, bad) =>
    expect(codes(bad)).toContain(code),
  );
  it.each(fixtures)("%s accepts its passing fixture", (code, _bad, good) =>
    expect(codes(good)).not.toContain(code),
  );
  it("loan has exactly R010", () =>
    expect(
      codes(readFileSync("examples/loan-application.requ", "utf8")),
    ).toEqual(["R010"]));
  it("Northbank has ops and assist missing owners, no isolation", () => {
    const ds = lint(
      parse(readFileSync("examples/northbank-org.requ", "utf8")).doc,
    );
    expect(ds.map((x) => x.code)).toEqual(["R001", "R001"]);
    expect(ds.map((x) => x.message)).toEqual([
      "Actor ops has no owner.",
      "Actor assist has no owner.",
    ]);
  });
  it("counts suggested elements once per diagram", () =>
    expect(
      codes(p + 't.a: "A" basis=suggested\nt.b: "B" basis=suggested').filter(
        (x) => x === "R010",
      ),
    ).toHaveLength(1));
  it("handles cycles and checks all agent paths", () => {
    expect(
      codes(
        'process "X"\nlane a "A" type=agent\nlane e "E" type=external\na.s: "S" start\ne.x: "X"\ne.z: "Z" end\ns -> x\nx -> s\nx -> z',
      ),
    ).toContain("R009");
  });
  it("returns locations and actionable hints for every issue", () => {
    for (const [, bad] of fixtures)
      for (const d of lint(parse(bad).doc)) {
        expect(d.loc?.line).toBeGreaterThan(0);
        expect(d.hint?.length).toBeGreaterThan(5);
      }
  });
});
