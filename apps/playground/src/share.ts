import { MAX_INPUT_LENGTH } from "@requstory/core";
const MAX_ENCODED_LENGTH = 140000;
async function bytes(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<Uint8Array> {
  const reader = stream.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw Error("The shared diagram is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export async function encodeShare(source: string): Promise<string> {
  const data = new TextEncoder().encode(source);
  if (source.length > MAX_INPUT_LENGTH || data.length > MAX_INPUT_LENGTH)
    throw Error("Use at most 100,000 UTF-8 bytes in share links.");
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  const compressed = await bytes(stream, MAX_INPUT_LENGTH);
  let binary = "";
  for (const value of compressed) binary += String.fromCharCode(value);
  return (
    "#r=" +
    btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
  );
}
export async function decodeShare(hash: string): Promise<string> {
  if (!hash.startsWith("#r=")) throw Error("This is not a Requ share link.");
  const encoded = hash.slice(3);
  if (encoded.length > MAX_ENCODED_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(encoded))
    throw Error("The share link is invalid or too large.");
  try {
    const data = Uint8Array.from(
      atob(encoded.replaceAll("-", "+").replaceAll("_", "/")),
      (c) => c.charCodeAt(0),
    );
    const stream = new Blob([data])
      .stream()
      .pipeThrough(new DecompressionStream("deflate"));
    const decoded = await bytes(stream, MAX_INPUT_LENGTH);
    return new TextDecoder("utf-8", { fatal: true }).decode(decoded);
  } catch {
    throw Error("The share link is invalid or too large.");
  }
}
