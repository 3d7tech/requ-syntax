/* global document, window, navigator */
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath, URL } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "@playwright/test"
);
const root = resolve(
  fileURLToPath(new URL("../apps/playground/dist/", import.meta.url)),
);
const screenshots = fileURLToPath(
  new URL("../output/playground/", import.meta.url),
);
await mkdir(screenshots, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/dev") {
      res.writeHead(301, { Location: "/dev/" });
      res.end();
      return;
    }
    if (!url.pathname.startsWith("/dev/")) throw Error("Outside playground");
    const path = resolve(
      root,
      decodeURIComponent(
        url.pathname.slice(5) +
          (url.pathname.endsWith("/") ? "index.html" : ""),
      ),
    );
    if (!path.startsWith(root + "/")) throw Error("Outside build");
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".md": "text/plain",
        ".txt": "text/plain",
        ".svg": "image/svg+xml",
        ".requ": "text/plain",
      }[extname(path)] ?? "application/octet-stream",
    );
    res.end(await readFile(path));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/dev/`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [],
    failed = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (res) => {
    if (res.status() >= 400) failed.push(res.url());
  });
  await page.addInitScript(() => {
    window.testClipboard = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.testClipboard = text;
        },
      },
    });
  });
  const wait = () =>
    page.waitForFunction(
      () =>
        document.querySelector("#render-status").textContent === "Live" &&
        document.querySelector("#preview").getAttribute("aria-busy") ===
          "false",
    );
  const title = () => page.locator("#preview svg>title").textContent();
  const edit = async (text) => {
    await page
      .getByRole("button", { name: "Editor", exact: true })
      .evaluate((el) => el.click());
    await page.locator(".cm-content").fill(text);
    await wait();
  };
  await page.goto(base);
  await wait();
  assert.equal(await title(), "Support triage");
  assert.equal(await page.locator("#examples option").count(), 11);
  const examples = await page
    .locator("#examples option")
    .evaluateAll((els) => els.map((el) => el.value));
  for (const id of examples) {
    await page.selectOption("#examples", id);
    await wait();
    assert.equal(await page.locator("#preview svg").count(), 1);
    if (id !== "errors-demo")
      assert.ok(
        !(await page
          .locator("#diagnostic-list")
          .textContent()
          .then((t) => t.includes("E009"))),
        id,
      );
  }
  await page.selectOption("#examples", "loan-application");
  await wait();
  await page.selectOption("#diagrams", "kyc");
  await wait();
  assert.equal(await title(), "KYC checks");
  await page.selectOption("#theme", "dark");
  await wait();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.selectOption("#theme", "light");
  await wait();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.selectOption("#examples", "northbank-org");
    await wait();
    if (width < 701)
      await page.getByRole("button", { name: "Preview", exact: true }).click();
    assert.equal(await page.locator("#preview-pane").isVisible(), true);
    await page.locator("#annotate").check();
    await wait();
    assert.ok(
      (await page.locator("#preview").textContent()).includes("No owner"),
    );
    await page.locator("#zoom").click();
    assert.equal(
      await page
        .locator("#preview")
        .evaluate((el) => el.scrollWidth > el.clientWidth),
      true,
    );
    await page.locator("#zoom").click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
      `${width}: page overflow`,
    );
    await page.screenshot({
      path: resolve(screenshots, `playground-${width}.png`),
      fullPage: true,
    });
    if (width < 701) {
      await page.getByRole("button", { name: "Editor", exact: true }).click();
      assert.equal(await page.locator("#source-pane").isVisible(), true);
    }
  }
  await page.selectOption("#examples", "errors-demo");
  await wait();
  await page.locator("#diagnostic-list button").first().click();
  assert.equal(await page.locator("#source-pane").isVisible(), true);
  assert.equal(
    await page
      .locator(".cm-content")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await edit('process test "First edit"\nlane a "A"\na.start: "Go" start');
  await edit('process test "Latest edit"\nlane a "A"\na.start: "Go" start');
  assert.equal(await title(), "Latest edit");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByText("Share link copied.", { exact: true }).waitFor();
  const share = await page.evaluate(() => window.testClipboard);
  assert.equal(new URL(share).pathname, "/dev/");
  assert.ok(new URL(share).hash.startsWith("#r="));
  await page.goto(share);
  await wait();
  assert.equal(await title(), "Latest edit");
  await page.locator("#exports summary").click();
  await page.getByRole("button", { name: "Copy SVG", exact: true }).click();
  await page.getByText("SVG copied.", { exact: true }).waitFor();
  assert.ok(
    (await page.evaluate(() => window.testClipboard)).startsWith("<svg"),
  );
  await page.locator("#exports summary").click();
  await page
    .getByRole("button", { name: "Copy Markdown", exact: true })
    .click();
  await page.getByText("Markdown copied.", { exact: true }).waitFor();
  assert.ok(
    (await page.evaluate(() => window.testClipboard)).startsWith("```requ\n"),
  );
  await page.locator("#exports summary").click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG", exact: true }).click();
  const file = await downloaded;
  assert.equal(file.suggestedFilename(), "test.svg");
  await file.saveAs(resolve(screenshots, "download.svg"));
  assert.ok(
    (await readFile(resolve(screenshots, "download.svg"), "utf8")).includes(
      "Latest edit",
    ),
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("Denied");
        },
      },
    });
  });
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.locator("#share-url").waitFor({ state: "visible" });
  assert.ok((await page.locator("#share-url").inputValue()).includes("#r="));
  await page.goto(base + "#r=invalid");
  await wait();
  assert.ok(
    (await page.locator("#action-status").textContent()).includes("invalid"),
  );
  assert.equal(await title(), "Support triage");
  await edit('process x "<script>alert(1)</script>"');
  assert.equal(await page.locator("#preview script").count(), 0);
  assert.equal(await title(), "<script>alert(1)</script>");
  await page.goto(base + "?example=loan-application");
  await wait();
  assert.equal(await title(), "Retail loan application");
  await page.getByRole("button", { name: "Copy for AI", exact: true }).click();
  await page
    .getByText("AI prompt and language guide copied.", { exact: true })
    .waitFor();
  assert.ok(
    (await page.evaluate(() => window.testClipboard)).includes(
      "# Requ language guide",
    ),
  );
  await page.locator("#exports summary").click();
  assert.equal(
    await page
      .getByRole("link", { name: "Open in Requstory (new tab)" })
      .getAttribute("href"),
    "/?from=requ-syntax",
  );
  assert.ok(
    (await page.locator("#annotate").locator("..").textContent()).includes(
      "Show gaps",
    ),
  );
  const staticContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 950 },
  });
  const staticPage = await staticContext.newPage();
  await staticPage.goto(base);
  assert.ok(await staticPage.locator(".static-examples svg").count());
  assert.equal(
    await staticPage.getByText("Loading examples…", { exact: true }).count(),
    0,
  );
  await staticPage.goto(base + "guide.html");
  assert.ok(await staticPage.locator("table").count());
  assert.equal(
    await staticPage
      .getByRole("link", { name: "Open in playground", exact: true })
      .count(),
    2,
  );
  assert.ok(
    !(await staticPage.locator("body").textContent()).includes(
      "MVP acceptance",
    ),
  );
  for (const id of examples) {
    await staticPage.goto(base + `examples/${id}/`);
    assert.ok(await staticPage.locator("svg").count());
    assert.ok(await staticPage.locator("code.language-requ").textContent());
  }
  await staticPage.goto(base + "examples/loan-application/");
  await staticPage.screenshot({
    path: resolve(screenshots, "static-loan-390.png"),
    fullPage: true,
  });
  await staticPage.setViewportSize({ width: 1440, height: 1000 });
  await staticPage.goto(base + "guide.html");
  await staticPage.screenshot({
    path: resolve(screenshots, "static-guide-1440.png"),
    fullPage: true,
  });
  await staticContext.close();
  await page.goto(base + "guide.html");
  assert.equal(
    await page.getByRole("heading", { name: "Requ language guide" }).count(),
    1,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  console.log(
    "Playground: all eleven examples, diagrams, source, diagnostics, themes, annotation, phone views, zoom, sharing, exports, escaping and /dev assets passed",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
