import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";
import {
  defaultKeymap,
  history as undoHistory,
  historyKeymap,
} from "@codemirror/commands";
import {
  StreamLanguage,
  syntaxHighlighting,
  HighlightStyle,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { setDiagnostics } from "@codemirror/lint";
import {
  parse,
  render,
  MAX_INPUT_LENGTH,
  type Diagnostic,
  type RenderOptions,
} from "@requstory/core";
import { encodeShare, decodeShare } from "./share";
import "./style.css";

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw Error(`Missing control: ${id}`);
  return el as T;
}
const examplePicker = element<HTMLSelectElement>("examples");
const diagramPicker = element<HTMLSelectElement>("diagrams");
const themePicker = element<HTMLSelectElement>("theme");
const annotate = element<HTMLInputElement>("annotate");
const preview = element("preview");
const actionStatus = element("action-status");
const renderStatus = element("render-status");
const workspace = document.querySelector<HTMLElement>(".workspace")!;
const samples = import.meta.glob("../../../examples/*.requ", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const names: Record<string, string> = {
  "support-triage-agent": "Support triage",
  "loan-application": "Retail loan application",
  "northbank-org": "Northbank Retail",
  "customer-refund": "Customer refund",
  "employee-onboarding": "Employee onboarding",
  "invoice-approval-with-agent": "Invoice approval with agent",
  "saas-company-org": "SaaS operating map",
  "bank-account-opening": "Bank account opening",
  "errors-demo": "Errors and recovery",
};
const examples = Object.entries(names).map(([id, label]) => ({
  id,
  label,
  source: samples[`../../../examples/${id}.requ`],
}));
examplePicker.replaceChildren(
  ...examples.map(({ id, label }) => new Option(label, id)),
);
let timer: ReturnType<typeof setTimeout> | undefined;
let revision = 0;
let currentSvg = "";
let selectedDiagram = "";
let ready = false;

const language = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/^#.*/)) return "comment";
    if (stream.match(/^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/)) return "string";
    if (
      stream.match(
        /^(?:requ|process|org|lane|team|handoff|stage|task|start|end|decision|wait)\b/,
      )
    )
      return "keyword";
    if (stream.match(/^[a-z_]+(?==)/i)) return "attributeName";
    if (stream.match(/^(?:->|-->|=>|→)/)) return "operator";
    stream.next();
    return null;
  },
});
const editor = new EditorView({
  parent: element("editor"),
  state: EditorState.create({
    doc: examples[0].source,
    extensions: [
      lineNumbers(),
      undoHistory(),
      drawSelection(),
      highlightActiveLine(),
      EditorView.lineWrapping,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      language,
      syntaxHighlighting(
        HighlightStyle.define([
          { tag: tags.keyword, color: "var(--accent)" },
          { tag: tags.string, color: "light-dark(#905424, #efc094)" },
          { tag: tags.comment, color: "var(--muted)" },
          { tag: tags.attributeName, color: "light-dark(#385d9f, #a1bdf0)" },
          { tag: tags.operator, color: "var(--accent)" },
        ]),
      ),
      EditorView.contentAttributes.of({
        "aria-label": "Requ source",
        spellcheck: "false",
      }),
      EditorState.transactionFilter.of((tr) =>
        tr.newDoc.length > MAX_INPUT_LENGTH ? [] : tr,
      ),
      EditorView.theme({
        "&": { backgroundColor: "var(--bg)", color: "var(--fg)" },
        ".cm-gutters": {
          backgroundColor: "var(--soft)",
          color: "var(--muted)",
          borderRight: "1px solid var(--line)",
        },
        ".cm-activeLine, .cm-activeLineGutter": {
          backgroundColor: "var(--soft)",
        },
        ".cm-cursor": { borderLeftColor: "var(--fg)" },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
          backgroundColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
        },
      }),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || !ready) return;
        if (examplePicker.value !== "custom") {
          if (!examplePicker.querySelector('option[value="custom"]'))
            examplePicker.add(new Option("Custom source", "custom"));
          examplePicker.value = "custom";
        }
        scheduleRender();
      }),
    ],
  }),
});

function setView(view: "editor" | "preview") {
  workspace.dataset.view = view;
  element("editor-tab").setAttribute("aria-pressed", String(view === "editor"));
  element("preview-tab").setAttribute(
    "aria-pressed",
    String(view === "preview"),
  );
  if (view === "editor") editor.requestMeasure();
}
function source() {
  return editor.state.doc.toString();
}
function scheduleRender() {
  revision++;
  clearTimeout(timer);
  renderStatus.textContent = "Updating…";
  preview.setAttribute("aria-busy", "true");
  timer = setTimeout(() => {
    void refresh();
  }, 150);
}
function jump(diagnostic: Diagnostic) {
  if (!diagnostic.loc) return;
  const line = editor.state.doc.line(
    Math.min(editor.state.doc.lines, Math.max(1, diagnostic.loc.line)),
  );
  const from = Math.min(
    line.to,
    line.from + Math.max(0, diagnostic.loc.col - 1),
  );
  setView("editor");
  editor.dispatch({ selection: { anchor: from }, scrollIntoView: true });
  editor.focus();
}
function showDiagnostics(diagnostics: Diagnostic[]) {
  const list = element("diagnostic-list");
  list.replaceChildren();
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  element("diagnostic-count").textContent = diagnostics.length
    ? `${errors} errors · ${diagnostics.length - errors} notes`
    : "";
  if (!diagnostics.length) {
    const item = document.createElement("li");
    item.textContent = "No issues found.";
    item.className = "no-issues";
    list.append(item);
  }
  for (const d of diagnostics) {
    const item = document.createElement("li");
    item.className = d.severity;
    const content = document.createElement(d.loc ? "button" : "span");
    content.textContent = `${d.code}${d.loc ? ` · ${d.loc.line}:${d.loc.col}` : ""} · ${d.message}`;
    if (d.hint) {
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = d.hint;
      content.append(hint);
    }
    if (content instanceof HTMLButtonElement) {
      content.type = "button";
      content.addEventListener("click", () => jump(d));
    }
    item.append(content);
    list.append(item);
  }
  editor.dispatch(
    setDiagnostics(
      editor.state,
      diagnostics
        .filter((d) => d.loc)
        .map((d) => {
          const line = editor.state.doc.line(
            Math.min(editor.state.doc.lines, Math.max(1, d.loc!.line)),
          );
          const from = Math.min(
            line.to,
            line.from + Math.max(0, d.loc!.col - 1),
          );
          return {
            from,
            to: Math.min(
              line.to,
              Math.max(from, line.from + d.loc!.endCol - 1),
            ),
            severity: d.severity,
            message: `${d.code}: ${d.message}`,
          };
        }),
    ),
  );
}
async function refresh(): Promise<void> {
  clearTimeout(timer);
  const generation = ++revision,
    text = source();
  const diagrams = parse(text).doc.diagrams;
  if (!diagrams.some((d) => d.id === selectedDiagram))
    selectedDiagram = diagrams[0]?.id ?? "";
  diagramPicker.replaceChildren(
    ...diagrams.map((d) => new Option(d.label, d.id)),
  );
  diagramPicker.value = selectedDiagram;
  element("diagram-field").hidden = diagrams.length < 2;
  const result = await render(text, {
    diagram: selectedDiagram || undefined,
    theme: themePicker.value as RenderOptions["theme"],
    annotate: annotate.checked,
    showDiagnostics: false,
  });
  if (generation !== revision) return;
  currentSvg = result.svg;
  preview.innerHTML = currentSvg;
  showDiagnostics(result.diagnostics);
  renderStatus.textContent = "Live";
  preview.setAttribute("aria-busy", "false");
}
function replaceSource(text: string) {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: text },
  });
  selectedDiagram = "";
}
async function copy(text: string, success: string) {
  try {
    await navigator.clipboard.writeText(text);
    actionStatus.textContent = success;
    return true;
  } catch {
    actionStatus.textContent =
      "Clipboard unavailable. Use Download SVG or copy the share link below.";
    return false;
  }
}
function action(task: () => Promise<void>) {
  void task().catch((error) => {
    actionStatus.textContent =
      error instanceof Error
        ? error.message
        : "The action could not be completed.";
  });
  element<HTMLDetailsElement>("exports").open = false;
}
element("editor-tab").addEventListener("click", () => setView("editor"));
element("preview-tab").addEventListener("click", () => setView("preview"));
examplePicker.addEventListener("change", () => {
  const example = examples.find((e) => e.id === examplePicker.value);
  if (!example) return;
  replaceSource(example.source);
  examplePicker.value = example.id;
  history.replaceState(null, "", location.pathname + location.search);
  element("share-fallback").hidden = true;
  actionStatus.textContent = "";
  action(refresh);
});
diagramPicker.addEventListener("change", () => {
  selectedDiagram = diagramPicker.value;
  action(refresh);
});
themePicker.addEventListener("change", () => {
  document.documentElement.dataset.theme = themePicker.value;
  action(refresh);
});
annotate.addEventListener("change", () => action(refresh));
element("zoom").addEventListener("click", () => {
  const native = preview.classList.toggle("native");
  preview.classList.toggle("fit", !native);
  element("zoom").textContent = native ? "Fit" : "100%";
  element("zoom").setAttribute("aria-pressed", String(native));
});
preview.addEventListener("click", (event) => {
  const link = (event.target as Element).closest("[data-requ-ref]");
  if (!link) return;
  event.preventDefault();
  selectedDiagram = link.getAttribute("data-requ-ref") ?? "";
  action(refresh);
});
element("share").addEventListener("click", () =>
  action(async () => {
    const button = element<HTMLButtonElement>("share");
    button.disabled = true;
    try {
      const hash = await encodeShare(source());
      const url = new URL(location.href);
      url.hash = hash;
      history.replaceState(null, "", url);
      element<HTMLInputElement>("share-url").value = url.href;
      const copied = await copy(url.href, "Share link copied.");
      element("share-fallback").hidden = copied;
      if (!copied) {
        element<HTMLInputElement>("share-url").select();
      }
    } finally {
      button.disabled = false;
    }
  }),
);
element("close-share").addEventListener("click", () => {
  element("share-fallback").hidden = true;
  element("share").focus();
});
element("copy-svg").addEventListener("click", () =>
  action(async () => {
    await refresh();
    await copy(currentSvg, "SVG copied.");
  }),
);
element("copy-markdown").addEventListener("click", () =>
  action(async () => {
    const text = source();
    const longest = Math.max(
      2,
      ...(text.match(/`+/g) ?? []).map((value) => value.length),
    );
    const fence = "`".repeat(longest + 1);
    await copy(`${fence}requ\n${text}\n${fence}\n`, "Markdown copied.");
  }),
);
element("download-svg").addEventListener("click", () =>
  action(async () => {
    await refresh();
    const url = URL.createObjectURL(
      new Blob([currentSvg], { type: "image/svg+xml" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedDiagram || "diagram"}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    actionStatus.textContent = "SVG downloaded.";
  }),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape")
    element<HTMLDetailsElement>("exports").open = false;
});
async function loadHash() {
  if (!location.hash) return;
  try {
    const text = await decodeShare(location.hash);
    replaceSource(text);
    if (!examplePicker.querySelector('option[value="custom"]'))
      examplePicker.add(new Option("Shared source", "custom"));
    examplePicker.value = "custom";
    actionStatus.textContent = "Shared source loaded.";
  } catch (error) {
    actionStatus.textContent =
      error instanceof Error ? error.message : "Could not open share link.";
  }
}
window.addEventListener("hashchange", () =>
  action(async () => {
    await loadHash();
    await refresh();
  }),
);
await loadHash();
ready = true;
await refresh();
