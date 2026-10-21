/* global document */
import { readFile, readdir } from "node:fs/promises";
import { URL } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "@playwright/test"
);
const root = new URL("../", import.meta.url),
  browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1400 },
  });
  for (const file of (
    await readdir(new URL("examples/__snapshots__", root))
  ).filter((f) => f.endsWith(".svg"))) {
    await page.setContent(
      await readFile(new URL("examples/__snapshots__/" + file, root), "utf8"),
    );
    const result = await page.evaluate(() => {
      const text = [...document.querySelectorAll("svg text")]
        .filter((el) => el.textContent.trim())
        .map((el) => ({
          text: el.textContent,
          box: el.getBoundingClientRect(),
        }));
      const collisions = [];
      for (let i = 0; i < text.length; i++)
        for (let j = i + 1; j < text.length; j++) {
          const a = text[i].box,
            b = text[j].box;
          if (
            a.left < b.right - 0.5 &&
            b.left < a.right - 0.5 &&
            a.top < b.bottom - 0.5 &&
            b.top < a.bottom - 0.5
          )
            collisions.push([text[i].text, text[j].text]);
        }
      for (const node of document.querySelectorAll(".requ-step")) {
        const shape = node.querySelector("path.shape");
        if (!shape) continue;
        const box = shape.getBBox();
        for (const text of node.querySelectorAll(
          "text:not(.badge):not(.muted)",
        )) {
          const b = text.getBBox();
          for (const x of [b.x - 8, b.x + b.width + 8])
            for (const y of [b.y - 8, b.y + b.height + 8])
              if (
                Math.abs(x - (box.x + box.width / 2)) / (box.width / 2) +
                  Math.abs(y - (box.y + box.height / 2)) / (box.height / 2) >
                1.001
              )
                collisions.push(["diamond padding", text.textContent]);
        }
      }
      return collisions;
    });
    assert.deepEqual(result, [], `${file}: visible text overlaps`);
    console.log(file + ": browser text bounds clear");
  }
} finally {
  await browser.close();
}
