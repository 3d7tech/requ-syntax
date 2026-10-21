import { it, expect } from "vitest";
import { encodeShare, decodeShare } from "../../../apps/playground/src/share";
it.each(["", 'process "Hello"', 'process "Résumé 日本語 →"'])(
  "round-trips a compressed source: %s",
  async (source) => {
    const hash = await encodeShare(source);
    expect(hash).toMatch(/^#r=[a-zA-Z0-9_-]+$/);
    expect(await decodeShare(hash)).toBe(source);
  },
);
it.each(["#r=", "wrong", "#r=!!", "#r=a", "#r=" + "a".repeat(140001)])(
  "rejects an invalid share link",
  async (hash) => {
    await expect(decodeShare(hash)).rejects.toThrow();
  },
);
it("rejects oversized source", async () => {
  await expect(encodeShare("x".repeat(100001))).rejects.toThrow();
});
it("rejects decompression bombs", async () => {
  const data = await new Response(
    new Blob(["x".repeat(200000)])
      .stream()
      .pipeThrough(new CompressionStream("deflate")),
  ).arrayBuffer();
  const encoded = btoa(String.fromCharCode(...new Uint8Array(data)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  await expect(decodeShare("#r=" + encoded)).rejects.toThrow();
});
