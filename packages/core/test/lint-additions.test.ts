import { it, expect } from "vitest";
import { parse, lint } from "../src/index";
const header = 'process "Lint"\nlane t "Team" owner="Owner"\n';
const issues = (body: string, code: string) =>
  lint(parse(header + body).doc).filter((d) => d.code === code);
it("R011 warns once per end step even with multiple outgoing flows", () => {
  const ds = issues(
    't.a: "Finished" end\nt.b: "B" end\nt.c: "C" end\na -> b\na -> c',
    "R011",
  );
  expect(ds).toHaveLength(1);
  expect(ds[0]).toMatchObject({
    severity: "warning",
    loc: { line: 3, col: 1 },
  });
  expect(ds[0].hint).toContain("Remove end");
});
it.each(['t.a: "Finished" end', 't.a: "Work"\nt.b: "Finish" end\na -> b'])(
  "R011 accepts an end without outgoing flows and regular continuations: %s",
  (body) => expect(issues(body, "R011")).toEqual([]),
);
it("R011 includes an end self-loop", () =>
  expect(issues('t.a: "Finished" end\na -> a', "R011")).toHaveLength(1));
it.each(["task", "start", "wait", "end"])(
  "R012 flags labelled branches on a %s step",
  (kind) => {
    const ds = issues(
      `t.a: "Branch" ${kind}\nt.b: "B" end\nt.c: "C" end\na -> b : "yes"\na -> c : "no"`,
      "R012",
    );
    expect(ds).toHaveLength(1);
    expect(ds[0]).toMatchObject({ severity: "info", loc: { line: 3, col: 1 } });
    expect(ds[0].hint).toBe("Mark step a as decision.");
  },
);
it.each([
  't.a: "Branch?" decision\nt.b: "B" end\nt.c: "C" end\na -> b : "yes"\na -> c : "no"',
  't.a: "Branch"\nt.b: "B" end\nt.c: "C" end\na -> b\na -> c',
  't.a: "Branch"\nt.b: "B" end\nt.c: "C" end\na -> b : "yes"\na -> c : "   "',
  't.a: "Branch"\nt.b: "B" end\na -> b : "yes"',
])(
  "R012 skips decisions and fewer than two labelled outgoing flows: %s",
  (body) => expect(issues(body, "R012")).toEqual([]),
);
it("R012 counts labelled branches even when another branch is unlabelled", () => {
  expect(
    issues(
      't.a: "Branch"\nt.b: "B" end\nt.c: "C" end\nt.d: "D" end\na -> b : "yes"\na -> c : "no"\na -> d',
      "R012",
    ),
  ).toHaveLength(1);
});
it("R013 reports decision wording at the decision location", () => {
  const ds = issues('t.a: "Review rating" decision', "R013");
  expect(ds).toHaveLength(1);
  expect(ds[0]).toMatchObject({ severity: "info", loc: { line: 3, col: 1 } });
  expect(ds[0].hint).toContain('"?"');
});
it.each([
  't.a: "Approve?" decision',
  't.a: "Approve?   " decision',
  't.a: "Review rating"',
])("R013 accepts questions or non-decisions: %s", (body) =>
  expect(issues(body, "R013")).toEqual([]),
);
it("keeps new rules isolated to each process and ignores org diagrams", () => {
  const doc = parse(
    'org "Org"\nteam a "A"\nteam b "B"\nhandoff a -> b : "yes"\nhandoff a -> a : "no"\nprocess first "First"\nlane t "Team"\nt.a: "Finished" end\nprocess second "Second"\nlane t "Team"\nt.a: "Start" start\nt.b: "End" end\na -> b',
  ).doc;
  expect(
    lint(doc).filter((d) => ["R011", "R012", "R013"].includes(d.code)),
  ).toEqual([]);
});
