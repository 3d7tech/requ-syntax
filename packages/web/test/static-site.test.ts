import { describe, it, expect } from "vitest";
import { staticSite } from "../../../apps/playground/src/static-site";
describe("public Requ documentation", () => {
  it("renders headings, tables and a playable link under each guide example", async () => {
    const { files } = await staticSite();
    const guide = files.get("guide.html")!;
    expect(guide).toContain("<h1>Requ language guide</h1>");
    expect(guide).toContain("<table>");
    expect(guide).not.toContain("2. Language spec");
    expect(guide).not.toContain("MVP acceptance");
    expect(guide.match(/class="language-requ"/g)).toHaveLength(2);
    expect(guide.match(/>Open in playground</g)).toHaveLength(2);
  });
  it("ships static diagrams, source and discovery links for every example", async () => {
    const { files, examples, landing } = await staticSite();
    expect(examples).toHaveLength(9);
    expect(landing).toContain("<svg");
    for (const example of examples) {
      const path = `examples/${example.id}/index.html`;
      const html = files.get(path)!;
      expect(html).toContain("<svg");
      expect(html).toContain('class="language-requ"');
      expect(files.get(`examples/${example.id}/source.requ`)).toBe(
        example.source,
      );
      expect(files.get("sitemap.xml")).toContain(
        `https://requstory.com/dev/examples/${example.id}/`,
      );
      expect(files.get("llms.txt")).toContain(
        `https://requstory.com/dev/examples/${example.id}/`,
      );
    }
    expect(files.get("llms-full.txt")).toContain("# Requ language guide");
  });
});
