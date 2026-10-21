#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import {
  parse,
  lint,
  render,
  type Diagnostic,
  type RenderOptions,
} from "@requstory/core";
function printDiagnostics(file: string, diagnostics: Diagnostic[]): void {
  for (const d of diagnostics)
    process.stderr.write(
      `${file}:${d.loc?.line ?? 1}:${d.loc?.col ?? 1} ${d.severity} ${d.code}: ${d.message}\n${d.hint ? "  " + d.hint + "\n" : ""}`,
    );
}
async function main(): Promise<void> {
  const args = process.argv.slice(2),
    command = args.shift();
  if (command === "--help" || command === "-h" || !command) {
    process.stdout.write(
      "requ render <file|-> [-o file.svg] [--theme light|dark|auto] [--diagram id] [--json]\nrequ lint <file|->\n",
    );
    return;
  }
  if (command !== "render" && command !== "lint")
    throw Error("Use requ render or requ lint.");
  let file: string | undefined,
    output: string | undefined,
    json = false;
  const opts: RenderOptions = {};
  while (args.length) {
    const a = args.shift()!;
    if (a === "--json") {
      json = true;
      continue;
    }
    if (["-o", "--theme", "--diagram"].includes(a)) {
      const value = args.shift();
      if (!value || value.startsWith("--"))
        throw Error(`Missing value for ${a}.`);
      if (a === "-o") output = value;
      else if (a === "--diagram") opts.diagram = value.toLowerCase();
      else {
        if (!["light", "dark", "auto"].includes(value))
          throw Error("Theme must be light, dark or auto.");
        opts.theme = value as RenderOptions["theme"];
      }
      continue;
    }
    if (a.startsWith("-") && a !== "-") throw Error(`Unknown option ${a}.`);
    if (file) throw Error("Pass one input file.");
    file = a;
  }
  if (!file) throw Error("Pass an input file or - for stdin.");
  if (command === "lint" && (json || output || Object.keys(opts).length))
    throw Error("Lint accepts only an input file.");
  if (json && opts.diagram)
    throw Error("--json returns the full document; omit --diagram.");
  const source = readFileSync(file === "-" ? 0 : file, "utf8");
  const parsed = parse(source);
  let diagnostics: Diagnostic[], result: string | undefined;
  if (command === "lint" || json) {
    diagnostics = [...parsed.diagnostics, ...lint(parsed.doc)];
    if (json) result = JSON.stringify(parsed.doc, null, 2) + "\n";
  } else {
    const rendered = await render(source, opts);
    diagnostics = rendered.diagnostics;
    result = rendered.svg + "\n";
  }
  printDiagnostics(file, diagnostics);
  if (result !== undefined) {
    if (output) writeFileSync(output, result);
    else process.stdout.write(result);
  }
  if (diagnostics.some((d) => d.severity === "error")) process.exitCode = 1;
}
main().catch((error: unknown) => {
  process.stderr.write(
    `requ: ${error instanceof Error ? error.message : "Command failed."}\n`,
  );
  process.exitCode = 1;
});
