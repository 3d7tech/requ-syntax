import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const script = new URL(
  "../../../scripts/stage-playground.mjs",
  import.meta.url,
);
describe("playground release staging", () => {
  it("adds /dev to the backed-up pages and preserves the app", async () => {
    const root = await mkdtemp(join(tmpdir(), "requ-stage-"));
    try {
      const build = join(root, "build"),
        frontend = join(root, "frontend");
      await mkdir(build);
      await mkdir(frontend);
      await writeFile(
        join(build, "index.html"),
        '<script src="/dev/assets/test.js"></script>',
      );
      await writeFile(join(build, "guide.html"), "Guide");
      await writeFile(
        join(build, "sitemap.xml"),
        "<urlset><url><loc>https://requstory.com/dev/examples/loan-application/</loc></url></urlset>",
      );
      await writeFile(join(frontend, "index.html"), "Existing app");
      await writeFile(join(frontend, "site-pages.json"), '["pricing"]');
      await writeFile(
        join(frontend, "sitemap.xml"),
        "<urlset><url><loc>https://requstory.com/</loc></url></urlset>",
      );
      await writeFile(join(frontend, "llms.txt"), "Existing guide");
      for (let i = 0; i < 2; i++)
        execFileSync(process.execPath, [script.pathname, build, frontend]);
      expect(
        JSON.parse(await readFile(join(frontend, "site-pages.json"), "utf8")),
      ).toEqual(["pricing", "dev"]);
      expect(await readFile(join(frontend, "index.html"), "utf8")).toBe(
        "Existing app",
      );
      expect(await readFile(join(frontend, "dev/guide.html"), "utf8")).toBe(
        "Guide",
      );
      expect(await readFile(join(frontend, "sitemap.xml"), "utf8")).toContain(
        "https://requstory.com/dev/examples/loan-application/",
      );
      expect(await readFile(join(frontend, "llms.txt"), "utf8")).toContain(
        "https://requstory.com/dev/llms-full.txt",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("rejects builds with the wrong base before touching the app", async () => {
    const root = await mkdtemp(join(tmpdir(), "requ-stage-"));
    try {
      const build = join(root, "build"),
        frontend = join(root, "frontend");
      await mkdir(build);
      await mkdir(frontend);
      await writeFile(
        join(build, "index.html"),
        '<script src="/assets/test.js"></script>',
      );
      await writeFile(join(frontend, "index.html"), "Existing app");
      expect(() =>
        execFileSync(process.execPath, [script.pathname, build, frontend], {
          stdio: "pipe",
        }),
      ).toThrow();
      expect(await readFile(join(frontend, "index.html"), "utf8")).toBe(
        "Existing app",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
