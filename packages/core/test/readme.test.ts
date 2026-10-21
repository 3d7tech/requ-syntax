import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { render } from "../src/index";
it("keeps the ten-line README source and its hero diagram in sync", async () => {
  const root = new URL("../../../", import.meta.url);
  const read = (name: string) => readFile(new URL(name, root), "utf8");
  const source = await read("docs/readme-example.requ");
  expect(source.trim().split("\n")).toHaveLength(10);
  expect(await read("README.md")).toContain(
    "```requ\n" + source.trim() + "\n```",
  );
  const result = await render(source);
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  expect(await read("docs/readme-example.svg")).toBe(result.svg + "\n");
});
