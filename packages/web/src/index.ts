import { render, type Diagnostic, type RenderOptions } from "@requstory/core";
export interface RunOptions {
  selector?: string;
  annotate?: boolean;
  theme?: RenderOptions["theme"];
}
let serial = 0;
const sources = new WeakMap<Element, string>();
// Core SVGs stay deterministic; embed instances need unique IDs in a shared DOM.
export function namespace(svg: string): string {
  const id = svg.match(/id="(requ-[a-z0-9]+)"/)?.[1];
  return id ? svg.split(id).join(`${id}-embed-${++serial}`) : svg;
}
function svgElement(svg: string): Element {
  const doc = new DOMParser().parseFromString(namespace(svg), "image/svg+xml");
  return document.importNode(doc.documentElement, true);
}
function theme(value: string | null | undefined): RenderOptions["theme"] {
  return value === "light" || value === "dark" ? value : "auto";
}
export async function run(options: RunOptions = {}): Promise<Diagnostic[][]> {
  const seen = new Set<Element>();
  const targets = [
    ...document.querySelectorAll(
      options.selector ?? "pre.requ, code.language-requ",
    ),
  ]
    .map((el) =>
      el.tagName === "CODE" && el.parentElement?.tagName === "PRE"
        ? el.parentElement
        : el,
    )
    .filter((el) => {
      if (seen.has(el)) return false;
      seen.add(el);
      return !el.closest("[data-requ-rendered]");
    });
  return Promise.all(
    targets.map(async (el) => {
      const source = sources.get(el) ?? el.textContent ?? "";
      sources.set(el, source);
      const result = await render(source, {
        theme: theme(options.theme),
        annotate: options.annotate,
      });
      if (!el.isConnected) return result.diagnostics;
      const wrapper = document.createElement("div");
      wrapper.dataset.requRendered = "";
      wrapper.replaceChildren(svgElement(result.svg));
      sources.set(wrapper, source);
      el.replaceWith(wrapper);
      wrapper.dispatchEvent(
        new CustomEvent("requ-diagnostics", {
          detail: result.diagnostics,
          bubbles: true,
        }),
      );
      return result.diagnostics;
    }),
  );
}
export function define(): void {
  if (
    typeof customElements === "undefined" ||
    customElements.get("requ-diagram")
  )
    return;
  class RequDiagram extends HTMLElement {
    static observedAttributes = ["theme", "diagram", "annotate"];
    private revision = 0;
    private observer = new MutationObserver(() => void this.update());
    private surface = this.attachShadow({ mode: "open" });
    connectedCallback(): void {
      this.observer.observe(this, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      void this.update();
    }
    disconnectedCallback(): void {
      this.observer.disconnect();
      this.revision++;
    }
    attributeChangedCallback(): void {
      if (this.isConnected) void this.update();
    }
    private async update(): Promise<void> {
      const revision = ++this.revision;
      const result = await render(this.textContent ?? "", {
        theme: theme(this.getAttribute("theme")),
        annotate: this.hasAttribute("annotate"),
        diagram: this.getAttribute("diagram") ?? undefined,
      });
      if (revision !== this.revision || !this.isConnected) return;
      const style = document.createElement("style");
      style.textContent =
        ":host{display:block}button{font:inherit;margin:8px 0}";
      this.surface.replaceChildren(style);
      if (this.hasAttribute("diagram")) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Back to first diagram";
        this.surface.append(button);
      }
      this.surface.append(svgElement(result.svg));
      this.surface
        .querySelector("button")
        ?.addEventListener("click", () => this.removeAttribute("diagram"));
      for (const link of this.surface.querySelectorAll("[data-requ-ref]"))
        link.addEventListener("click", (e) => {
          e.preventDefault();
          this.setAttribute("diagram", link.getAttribute("data-requ-ref")!);
        });
      this.dispatchEvent(
        new CustomEvent("requ-diagnostics", {
          detail: result.diagnostics,
          bubbles: true,
          composed: true,
        }),
      );
    }
  }
  customElements.define("requ-diagram", RequDiagram);
}
define();
export default { run, define };
