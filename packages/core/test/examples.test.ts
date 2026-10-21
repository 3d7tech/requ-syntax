import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { parse, render } from "../src/index";
const files = readdirSync("examples")
  .filter((x) => x.endsWith(".requ"))
  .sort();
describe("example suite", () => {
  it("has all ten examples", () => expect(files).toHaveLength(10));
  it.each(files)("%s parses with its intended outcome", (file) => {
    const errors = parse(
      readFileSync("examples/" + file, "utf8"),
    ).diagnostics.filter((d) => d.severity === "error");
    expect(errors.length > 0).toBe(file === "errors-demo.requ");
  });
  it.each(files)("%s matches its SVG snapshot", async (file) => {
    const source = readFileSync("examples/" + file, "utf8");
    const a = await render(source, { theme: "light" }),
      b = await render(source, { theme: "light" });
    expect(a.svg).toBe(b.svg);
    await expect(a.svg).toMatchFileSnapshot(
      "../../../examples/__snapshots__/" + file.replace(".requ", ".svg"),
    );
  });
});
