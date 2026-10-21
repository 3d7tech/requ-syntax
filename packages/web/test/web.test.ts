// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { run, define } from "../src/index";
const source = 'process "Browser"\nlane t "T" owner="Owner"\nt.s: "S" start';
const waitFor = async (fn: () => boolean) => {
  for (let n = 0; n < 100; n++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw Error(
    "Timed out waiting for component: " +
      document.body.firstElementChild?.shadowRoot?.innerHTML,
  );
};
afterEach(() => document.body.replaceChildren());
describe("browser rendering", () => {
  it("renders two code blocks and a reactive component", async () => {
    const pre = document.createElement("pre");
    pre.className = "requ";
    pre.textContent = source;
    const nested = document.createElement("pre"),
      code = document.createElement("code");
    code.className = "language-requ";
    code.textContent = source;
    nested.append(code);
    const component = document.createElement("requ-diagram");
    component.textContent = source;
    document.body.append(pre, nested, component);
    await run();
    await waitFor(() => !!component.shadowRoot?.querySelector("svg"));
    expect(document.querySelectorAll("[data-requ-rendered] svg")).toHaveLength(
      2,
    );
    expect(component.shadowRoot?.querySelectorAll("svg")).toHaveLength(1);
    component.textContent = 'process "Changed"';
    await waitFor(
      () => !!component.shadowRoot?.textContent?.includes("Changed"),
    );
  });
  it("emits diagnostics", async () => {
    const component = document.createElement("requ-diagram");
    component.textContent = "broken";
    let codes: string[] = [];
    component.addEventListener("requ-diagnostics", (e) => {
      codes = (e as CustomEvent<{ code: string }[]>).detail.map((d) => d.code);
    });
    document.body.append(component);
    await waitFor(() => codes.length > 0);
    expect(codes).toContain("E005");
  });
  it("avoids duplicate rendering and duplicate SVG ids", async () => {
    document.body.innerHTML =
      '<pre class="requ"><code class="language-requ"></code></pre><pre class="requ"></pre>';
    for (const el of document.querySelectorAll("pre")) el.textContent = source;
    await run();
    await run();
    const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.querySelectorAll("svg")).toHaveLength(2);
  });
  it("uses only the newest component content", async () => {
    const el = document.createElement("requ-diagram");
    document.body.append(el);
    el.textContent = 'org "Slow"\nteam a "A"';
    el.textContent = 'process "Latest"';
    await waitFor(() => !!el.shadowRoot?.textContent?.includes("Latest"));
    expect(el.shadowRoot?.textContent).not.toContain("Slow");
  });
  it("registers idempotently and follows theme changes", async () => {
    define();
    define();
    const el = document.createElement("requ-diagram");
    el.textContent = source;
    document.body.append(el);
    await waitFor(() => !!el.shadowRoot?.querySelector("svg"));
    el.setAttribute("theme", "dark");
    await waitFor(() => !!el.shadowRoot?.textContent?.includes("--bg:#121b2b"));
  });
  it("follows org process links and returns to the first diagram", async () => {
    const el = document.createElement("requ-diagram");
    el.textContent =
      'org "O"\nteam t "T"\nprocess t "Go" ref=p\nprocess p "Linked"';
    document.body.append(el);
    await waitFor(() => !!el.shadowRoot?.querySelector("[data-requ-ref]"));
    el.shadowRoot!.querySelector("[data-requ-ref]")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await waitFor(() => !!el.shadowRoot?.querySelector("button"));
    expect(el.getAttribute("diagram")).toBe("p");
    el.shadowRoot!.querySelector("button")!.click();
    await waitFor(() => !el.shadowRoot?.querySelector("button"));
  });
});
