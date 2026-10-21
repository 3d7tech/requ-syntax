import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "../src/index";
const example = (name: string) =>
  readFileSync(
    new URL(`../../../examples/${name}.requ`, import.meta.url),
    "utf8",
  );
describe("parser", () => {
  it.each(["loan-application", "northbank-org"])("parses %s", (name) => {
    const r = parse(example(name));
    expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(r.doc.diagrams.length).toBeGreaterThan(0);
  });
  it("inherits owners across process declarations", () => {
    const r = parse(example("loan-application"));
    const d = r.doc.diagrams[1];
    expect(d.kind === "process" && d.lanes[0].owner).toBe("Head of Lending");
  });
  it.each(["-->", "=>", "→"])("normalises %s", (arrow) => {
    const r = parse(
      `process "X"\nlane a "A"\na.s: "S" start\na.e: "E" end\ns ${arrow} e`,
    );
    expect(r.diagnostics.map((x) => x.code)).toEqual(["I001"]);
  });
  it.each(["'X'", "“X”", "‘X’"])("accepts %s labels", (quote) => {
    expect(parse(`process ${quote}`).doc.diagrams[0].label).toBe("X");
  });
  it("keeps comments and arrows inside strings", () => {
    const r = parse('process "X # -->"');
    expect(r.doc.diagrams[0].label).toBe("X # -->");
    expect(r.diagnostics).toEqual([]);
  });
  it("creates unknown steps", () => {
    const r = parse('process "X"\na -> b');
    expect(r.diagnostics.filter((x) => x.code === "W003")).toHaveLength(2);
  });
  it("assigns a missing prefix", () => {
    const r = parse('process "X"\nlane a "A"\ns: "S"');
    expect(r.diagnostics[0].code).toBe("W004");
  });
  it("last duplicate wins", () => {
    const r = parse('process "X"\nlane a "First"\nlane a "Last"');
    const d = r.doc.diagrams[0];
    expect(d.kind === "process" && d.lanes[0].label).toBe("Last");
    expect(r.diagnostics[0].code).toBe("W001");
  });
  it("recovers after unknown lines and unclosed quotes", () => {
    const r = parse('process "X"\n???\nlane a "A\nlane b "B"');
    expect(r.diagnostics.map((x) => x.code)).toEqual(["E001", "E002"]);
    const d = r.doc.diagrams[0];
    expect(d.kind === "process" && d.lanes[0].id).toBe("b");
  });
  it("validates attributes and unknown lanes", () => {
    const r = parse('process "X"\nx.s: "S" nonsense=yes basis=wrong');
    expect(r.diagnostics.map((x) => x.code)).toEqual(["W002", "W002", "E003"]);
  });
  it("detects missing headers and cycles", () => {
    expect(parse("").diagnostics[0].code).toBe("E005");
    expect(
      parse('process a "A"\nlane t "T"\nt.s: "S" sub=a').diagnostics.some(
        (x) => x.code === "E004",
      ),
    ).toBe(true);
  });
  it("supports case-insensitive ids and org-to-process transitions", () => {
    const r = parse(
      'org "O"\nteam T "Team"\nprocess t "Owned" ref=p\nprocess P "P"\nlane T "T"\nT.S: "S"',
    );
    expect(r.doc.diagrams.map((x) => x.id)).toEqual(["org", "p"]);
    expect(r.diagnostics).toEqual([]);
  });
  it("never throws for 1,000 seeded random strings", () => {
    let seed = 42;
    for (let i = 0; i < 1000; i++) {
      let s = "";
      for (let j = 0; j < i % 180; j++) {
        seed = (1664525 * seed + 1013904223) >>> 0;
        s += String.fromCharCode(seed % 180);
      }
      expect(() => parse(s)).not.toThrow();
    }
  });
  it("bounds excessive input", () => {
    expect(parse("x".repeat(100001)).diagnostics[0].code).toBe("E007");
  });
});
