export function pngResponse(file: Buffer): Response {
  const bytes = new Uint8Array(file.byteLength);
  bytes.set(file);

  return new Response(bytes, { headers: { "content-type": "image/png" } });
}
