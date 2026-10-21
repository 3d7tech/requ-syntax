export const light =
  "--bg:#ffffff;--fg:#0e1d38;--muted:#536277;--line:#dce3ec;--band:#f7f9fc;--customer:#e4f5f2;--customer-line:#167969;--agent:#f1eaff;--agent-line:#7653b5;--external:#f1f3f5;--external-line:#74808e;";
export const dark =
  "--bg:#121b2b;--fg:#edf2fa;--muted:#adbdd2;--line:#34445c;--band:#192539;--customer:#173c3a;--customer-line:#71cdbd;--agent:#34264e;--agent-line:#c1a0f2;--external:#273240;--external-line:#a8b4c3;";
export function themeCSS(id: string, theme: "light" | "dark" | "auto"): string {
  return `#${id}{${theme === "dark" ? dark : light}}${theme === "auto" ? `@media(prefers-color-scheme:dark){#${id}{${dark}}}` : ""}
#${id} text{font-family:Inter,system-ui,sans-serif;fill:var(--fg);font-size:13px}#${id} .muted{fill:var(--muted);font-size:11px}#${id} .requ-edge{fill:none;stroke:var(--muted);stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}#${id} .shape{fill:var(--bg);stroke:var(--fg);stroke-width:1.5}#${id} .actor-customer .shape{fill:var(--customer);stroke:var(--customer-line)}#${id} .actor-agent .shape{fill:var(--agent);stroke:var(--agent-line)}#${id} .actor-external .shape{fill:var(--external);stroke:var(--external-line);stroke-dasharray:5 4}#${id} .suggested>.shape{stroke-dasharray:5 4}#${id} a{cursor:pointer}#${id} .badge{font-size:10px;font-weight:700}#${id} .pill{fill:var(--bg)}#${id} .requ-step:focus .shape{stroke-width:3}`;
}
