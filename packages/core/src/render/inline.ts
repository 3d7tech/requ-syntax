import { light, dark } from "./theme";

/** Resolve only our generated SVG markup; no DOM or CSS engine is needed. */
export function inlineSVG(
  svg: string,
  theme: "light" | "dark" | "auto",
): string {
  // Static renderers have no media preference. Auto has a stable light fallback.
  const colors = new Map(
    [...(theme === "dark" ? dark : light).matchAll(/--([\w-]+):([^;]+);/g)].map(
      (m) => [m[1], m[2]],
    ),
  );
  const resolve = (value: string) =>
    value.replace(/var\(--([\w-]+)\)/g, (_, name: string) => colors.get(name)!);
  const stack: { tag: string; actor?: string; suggested: boolean }[] = [];
  const withoutCSS = svg.replace(/<style>[\s\S]*?<\/style>/g, "");
  return withoutCSS.replace(/<\/?[\w:-]+\b[^>]*>/g, (tag) => {
    if (tag.startsWith("</")) {
      stack.pop();
      return tag;
    }
    const name = tag.match(/^<([\w:-]+)/)![1];
    const values = new Map(
      [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [
        m[1],
        resolve(m[2]),
      ]),
    );
    const classes = (values.get("class") ?? "").split(/\s+/);
    const parent = stack.at(-1);
    const actor =
      classes.find((c) => c.startsWith("actor-"))?.slice(6) ?? parent?.actor;
    const set = (key: string, value: string) => values.set(key, resolve(value));
    if (name === "text") {
      set("font-family", "Inter,system-ui,sans-serif");
      set(
        "font-size",
        classes.includes("badge")
          ? "10"
          : classes.includes("muted")
            ? "11"
            : "13",
      );
      set(
        "fill",
        classes.includes("muted") ? colors.get("muted")! : colors.get("fg")!,
      );
      if (classes.includes("badge")) set("font-weight", "700");
    }
    if (classes.includes("requ-edge")) {
      set("fill", "none");
      set("stroke", colors.get("muted")!);
      set("stroke-width", "1.5");
      set("stroke-linejoin", "round");
      set("stroke-linecap", "round");
    }
    if (classes.includes("shape")) {
      const colored =
        actor && ["customer", "agent", "external"].includes(actor);
      set("fill", colors.get(colored ? actor! : "bg")!);
      set("stroke", colors.get(colored ? actor! + "-line" : "fg")!);
      set("stroke-width", "1.5");
      if (actor === "external" || parent?.suggested)
        set("stroke-dasharray", "5 4");
    }
    if (classes.includes("pill")) set("fill", colors.get("bg")!);
    // Inline declarations override the stylesheet, matching browser precedence.
    for (const declaration of (values.get("style") ?? "").split(";")) {
      const colon = declaration.indexOf(":");
      if (colon < 0) continue;
      const key = declaration.slice(0, colon).trim(),
        value = declaration.slice(colon + 1).trim();
      if (
        [
          "fill",
          "stroke",
          "font-family",
          "font-size",
          "font-style",
          "font-weight",
          "stroke-width",
          "stroke-dasharray",
        ].includes(key)
      )
        set(key, key === "font-size" ? value.replace(/px$/, "") : value);
    }
    values.delete("style");
    let background = "";
    if (name === "svg") {
      const [, , width, height] = values.get("viewBox")!.split(" ").map(Number);
      const scale = Number(values.get("width")) / width;
      set("height", String(height * scale));
      background = `<rect width="${width}" height="${height}" fill="${colors.get("bg")}"/>`;
    }
    const selfClosing = tag.endsWith("/>");
    if (!selfClosing)
      stack.push({
        tag: name,
        actor,
        suggested: classes.includes("suggested"),
      });
    return `<${name}${[...values].map(([key, value]) => ` ${key}="${value}"`).join("")}${selfClosing ? "/>" : ">"}${background}`;
  });
}
