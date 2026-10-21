/* global window, document */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "@playwright/test"
);
const root = new URL("../", import.meta.url);
const server = createServer(async (req, res) => {
  try {
    if (req.url === "/requ.esm.js" || req.url === "/requ.global.js") {
      res.setHeader("content-type", "text/javascript");
      res.end(await readFile(new URL("packages/web/dist" + req.url, root)));
      return;
    }
    res.setHeader("content-type", "text/html");
    res.end(
      '<!doctype html><meta charset="utf-8"><pre class="requ">process "First"</pre><pre class="requ">process "Second"</pre><requ-diagram>org "Map"\nteam t "T"\nprocess t "Go" ref=p\nprocess p "Linked"</requ-diagram>',
    );
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e));
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true });
try {
  for (const format of ["esm", "global"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    if (format === "esm")
      await page.evaluate(async () => {
        const mod = await import("/requ.esm.js");
        await mod.run();
      });
    else {
      await page.addScriptTag({ url: "/requ.global.js" });
      await page.evaluate(() => window.requ.run());
    }
    await page.locator("[data-requ-rendered] svg").nth(1).waitFor();
    assert.equal(await page.locator("[data-requ-rendered] svg").count(), 2);
    await page.locator("requ-diagram [data-requ-ref]").waitFor();
    await page.locator("requ-diagram [data-requ-ref]").click();
    await page.getByRole("button", { name: "Back to first diagram" }).waitFor();
    assert.equal(
      await page.locator("requ-diagram").getAttribute("diagram"),
      "p",
    );
    await page.getByRole("button", { name: "Back to first diagram" }).click();
    await page.locator("requ-diagram [data-requ-ref]").waitFor();
    const host = page.locator("requ-diagram");
    await host.evaluate((el) => (el.textContent = 'process "Changed"'));
    await host
      .locator("svg title")
      .first()
      .filter({ hasText: "Changed" })
      .waitFor({ state: "attached" });
    await host.evaluate((el) => el.setAttribute("theme", "dark"));
    await page.waitForFunction(() =>
      document
        .querySelector("requ-diagram")
        .shadowRoot.querySelector("svg style")
        .textContent.includes("--bg:#121b2b"),
    );
    assert.deepEqual(errors, []);
    console.log(
      `${format}: two embeds, component link/back, text/theme updates passed`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
