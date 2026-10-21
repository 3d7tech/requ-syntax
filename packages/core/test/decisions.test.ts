import { it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { parse, render } from "../src/index";
import { layoutProcess } from "../src/layout/process";
import { boxesOverlap } from "../src/layout/routing";
it.each(readdirSync("examples").filter((f) => f.endsWith(".requ")))(
  "%s keeps every diamond at most 96px",
  (file) => {
    for (const d of parse(readFileSync("examples/" + file, "utf8")).doc
      .diagrams) {
      if (d.kind !== "process") continue;
      const l = layoutProcess(d);
      for (const n of l.nodes.filter((n) => n.diamond)) {
        expect(n.width).toBeLessThanOrEqual(96);
        expect(n.height).toBe(n.width);
        expect(n.labelLines!.length).toBeLessThanOrEqual(3);
        if (n.externalLabel) {
          expect(n.width).toBe(72);
          const band = l.bands.find((b) => b.id === n.lane)!;
          expect(
            n.externalLabel.y + n.externalLabel.height,
          ).toBeLessThanOrEqual(band.y + band.height - 16);
          for (const other of l.nodes)
            expect(boxesOverlap(n.externalLabel, other)).toBe(false);
          for (const edge of l.edges)
            if (edge.label)
              expect(boxesOverlap(n.externalLabel, edge.label)).toBe(false);
        }
      }
    }
  },
);
it("keeps short decision labels inside and long labels below", async () => {
  const short = await render(
    'process "Short"\nlane a "A"\na.d: "Go?" decision',
  );
  expect(short.svg).not.toContain('class="requ-external-label"');
  const long = await render(
    'process "Long"\nlane a "A"\na.d: "Should this application proceed to the final approval committee?" decision',
  );
  expect(long.svg).toContain('class="requ-external-label"');
});
