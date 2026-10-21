import { it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { parse, render } from "../src/index";
const cases = readdirSync("examples")
  .filter((f) => f.endsWith(".requ"))
  .flatMap((file) =>
    (["light", "dark", "auto"] as const).map((theme) => ({ file, theme })),
  );
it.each(cases)(
  "$file $theme renders with explicit attributes only",
  async ({ file, theme }) => {
    const source = readFileSync("examples/" + file, "utf8");
    for (const d of parse(source).doc.diagrams) {
      const { svg, diagnostics } = await render(source, {
        diagram: d.id,
        theme,
        inlineStyles: true,
        annotate: true,
      });
      expect(svg).not.toContain("<style");
      expect(svg).not.toContain("var(");
      expect(svg).not.toMatch(/\sstyle="/);
      expect(diagnostics.some((d) => d.code === "E009")).toBe(false);
      for (const [text] of svg.matchAll(/<text\b[^>]*>/g)) {
        expect(text).toContain('font-family="');
        expect(text).toContain('font-size="');
        expect(text).toContain('fill="');
      }
      expect(svg).toContain(
        theme === "dark" ? 'fill="#121b2b"' : 'fill="#ffffff"',
      );
    }
  },
);
it("keeps normal CSS rendering as the default", async () => {
  expect((await render('process "Normal"')).svg).toContain("<style>");
});
it("resolves actor fills, suggested dashes, annotations and error text", async () => {
  const source =
    'org "Styles"\nteam a "AI" type=agent basis=suggested\nteam b "Bank" type=customer\nteam c "Outside" type=external\nteam d "Unowned"\n???';
  const { svg } = await render(source, { inlineStyles: true, annotate: true });
  expect(svg).toContain('fill="#f1eaff"');
  expect(svg).toContain('stroke="#7653b5"');
  expect(svg).toContain('stroke-dasharray="5 4"');
  expect(svg).toContain('fill="#e4f5f2"');
  expect(svg).toContain('fill="#f1f3f5"');
  expect(svg).toContain('font-style="italic"');
  expect(svg).toContain('fill="#9f2020"');
});
it("escapes hostile text and keeps malformed or empty input inline", async () => {
  for (const source of [
    "",
    "broken",
    'process "<script>& evil"\nlane a "<style>"\na.s: "<script>"',
  ]) {
    const { svg } = await render(source, { inlineStyles: true, maxWidth: 320 });
    expect(svg).not.toContain("<style");
    expect(svg).not.toContain("var(");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain('width="320"');
  }
});

it.each([
  { file: "loan-application", theme: "light" as const },
  { file: "northbank-org", theme: "dark" as const },
])(
  "keeps the $file $theme attribute export snapshot",
  async ({ file, theme }) => {
    const source = readFileSync(`examples/${file}.requ`, "utf8");
    const { svg } = await render(source, {
      theme,
      inlineStyles: true,
      annotate: true,
    });
    await expect(svg).toMatchFileSnapshot(
      `../../../examples/__snapshots__/inline/${file}-${theme}.svg`,
    );
  },
);
