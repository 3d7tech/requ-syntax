import { URL } from "node:url";
import { chromium } from "/Users/3d7tech/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { readFile, mkdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
await mkdir(new URL("output/", root), { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
for (const name of ["loan-application", "northbank-org"]) {
  let svg;
  try {
    svg = await readFile(
      new URL(`examples/__snapshots__/${name}.svg`, root),
      "utf8",
    );
  } catch {
    continue;
  }
  await page.setContent(
    `<html><body style="margin:16px;background:#eef1f6">${svg}</body></html>`,
  );
  await page.screenshot({
    path: new URL(`output/${name}.png`, root).pathname,
    fullPage: true,
  });
  console.log(
    name,
    await page.locator("svg").evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
      steps: el.querySelectorAll(".requ-step").length,
      cards: el.querySelectorAll(".requ-team").length,
    })),
  );
}
await browser.close();
