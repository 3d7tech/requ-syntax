import { readFile, cp, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
const [buildPath, frontendPath] = process.argv.slice(2);
if (!buildPath || !frontendPath)
  throw Error(
    "Usage: node scripts/stage-playground.mjs <playground-build> <frontend-dist>",
  );
const build = resolve(buildPath),
  frontend = resolve(frontendPath);
const index = await readFile(resolve(build, "index.html"), "utf8");
if (!index.includes("/dev/assets/"))
  throw Error("Expected a /dev/ Vite build.");
await access(resolve(build, "guide.html"));
await access(resolve(frontend, "index.html"));
const manifestPath = resolve(frontend, "site-pages.json");
const pages = JSON.parse(await readFile(manifestPath, "utf8"));
if (
  !Array.isArray(pages) ||
  pages.some(
    (p) => typeof p !== "string" || !/^[a-z0-9][a-z0-9-]{1,40}$/.test(p),
  )
)
  throw Error("Invalid frontend page manifest.");
await cp(build, resolve(frontend, "dev"), { recursive: true });
await writeFile(manifestPath, JSON.stringify([...new Set([...pages, "dev"])]));
console.log("Staged /dev/ in the frontend release and page backup manifest.");

// Include the playground in the main domain's existing discovery files.
async function optionalFile(name) {
  try {
    return await readFile(resolve(frontend, name), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
let sitemap = await optionalFile("sitemap.xml");
let exampleUrls = [];
try {
  const built = await readFile(resolve(build, "sitemap.xml"), "utf8");
  exampleUrls = [
    ...built.matchAll(/<loc>(https:\/\/requstory\.com\/dev\/[^<]*)<\/loc>/g),
  ].map((match) => match[1]);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (sitemap !== null) {
  for (const url of new Set([
    "https://requstory.com/dev/",
    "https://requstory.com/dev/guide.html",
    ...exampleUrls,
  ]))
    if (!sitemap.includes(`<loc>${url}</loc>`))
      sitemap = sitemap.replace(
        "</urlset>",
        `<url><loc>${url}</loc></url></urlset>`,
      );
  await writeFile(resolve(frontend, "sitemap.xml"), sitemap);
}
const llms = await optionalFile("llms.txt");
if (llms !== null) {
  const entries = [
    "Requ syntax playground: https://requstory.com/dev/",
    "Language guide: https://requstory.com/dev/guide.html",
    "Requ LLM reference: https://requstory.com/dev/llms.txt",
    "Complete Requ guide and example source: https://requstory.com/dev/llms-full.txt",
    "Static Requ examples: https://requstory.com/dev/examples/",
  ].filter((entry) => !llms.includes(entry));
  if (entries.length)
    await writeFile(
      resolve(frontend, "llms.txt"),
      llms.trimEnd() + "\n\n" + entries.join("\n") + "\n",
    );
}
