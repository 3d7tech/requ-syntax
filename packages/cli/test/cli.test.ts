import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const call = (args: string[], input?: string) =>
  spawnSync(process.execPath, ["packages/cli/dist/index.js", ...args], {
    encoding: "utf8",
    input,
  });
describe("built CLI", () => {
  it("renders SVG and keeps diagnostics on stderr", () => {
    const r = call(["render", "examples/loan-application.requ"]);
    expect(r.status).toBe(0);
    expect(r.stdout.startsWith("<svg")).toBe(true);
    expect(r.stdout).not.toContain("R010");
    expect(r.stderr).toContain("R010");
  });
  it("exports attribute-styled SVG for external converters", () => {
    const r = call([
      "render",
      "examples/loan-application.requ",
      "--inline-styles",
      "--theme",
      "dark",
    ]);
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain("<style");
    expect(r.stdout).not.toContain("var(");
    expect(r.stdout).toContain('fill="#121b2b"');
    expect(r.stdout).toContain('font-family="Inter,system-ui,sans-serif"');
  });
  it("returns resolved JSON", () => {
    const r = call(["render", "examples/loan-application.requ", "--json"]);
    expect(JSON.parse(r.stdout).diagrams).toHaveLength(2);
    expect(r.status).toBe(0);
  });
  it("reads stdin", () =>
    expect(call(["render", "-"], 'process "Stdin"').stdout).toContain("Stdin"));
  it("selects diagrams and themes", () => {
    const r = call([
      "render",
      "examples/loan-application.requ",
      "--diagram",
      "kyc",
      "--theme",
      "dark",
    ]);
    expect(r.stdout).toContain("KYC checks");
    expect(r.stdout).toContain("--bg:#121b2b");
  });
  it("writes -o output", () => {
    const dir = mkdtempSync(join(tmpdir(), "requ-cli-"));
    try {
      const file = join(dir, "loan.svg");
      const r = call(["render", "examples/loan-application.requ", "-o", file]);
      expect(r.status).toBe(0);
      expect(r.stdout).toBe("");
      expect(readFileSync(file, "utf8")).toContain("<svg");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("lint exits zero for warnings and one for errors", () => {
    expect(call(["lint", "examples/loan-application.requ"]).status).toBe(0);
    expect(call(["lint", "-"], "broken").status).toBe(1);
  });
  it("renders valid parts with errors and exits one", () => {
    const r = call(["render", "-"], 'process "X"\n???');
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("requ-errors");
  });
  it.each([
    ["render"],
    ["wrong"],
    ["render", "no-file"],
    ["render", "-", "--theme", "wrong"],
    ["render", "-", "--oops"],
    ["lint", "-", "--json"],
    ["lint", "-", "--inline-styles"],
  ])("rejects invalid invocation %j", (...args) =>
    expect(call(args, "").status).toBe(1),
  );
});
