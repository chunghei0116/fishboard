import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const src = await readFile(
  new URL("../lib/fish-image.ts", import.meta.url),
  "utf8",
);
const mod = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      ts.transpileModule(src, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    ).toString("base64")
);
test("remove only edge-connected matte, preserve isolated fish markings", () => {
  const data = new Uint8Array(5 * 5 * 4);
  for (let i = 0; i < 25; i++) data.set([255, 0, 255, 255], i * 4);
  for (let y = 1; y < 4; y++)
    for (let x = 1; x < 4; x++) data.set([100, 100, 100, 255], (y * 5 + x) * 4);
  data.set([255, 0, 255, 255], 12 * 4);
  const result = mod.removeMatte(data, 5, 5);
  assert.equal(result[3], 0);
  assert.equal(result[12 * 4 + 3], 255);
  assert.equal(result[6 * 4 + 3], 255);
});
test("rejects huge image header before decompressing", () => {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 100000);
  view.setUint32(20, 100000);
  assert.throws(() => mod.pngDimensions(bytes, 1024));
});

test("right-facing fish are mirrored losslessly, including alpha", () => {
  const pixels = new Uint8Array([
    1, 2, 3, 0, 4, 5, 6, 128, 7, 8, 9, 255, 10, 11, 12, 255, 13, 14, 15, 0, 16,
    17, 18, 128,
  ]);
  assert.deepEqual(mod.orientFishPixels(pixels, 3, 2, "left"), pixels);
  const flipped = mod.orientFishPixels(pixels, 3, 2, "right");
  assert.deepEqual(
    [...flipped],
    [
      7, 8, 9, 255, 4, 5, 6, 128, 1, 2, 3, 0, 16, 17, 18, 128, 13, 14, 15, 0,
      10, 11, 12, 255,
    ],
  );
  assert.deepEqual(mod.orientFishPixels(flipped, 3, 2, "right"), pixels);
  assert.deepEqual(
    [...mod.orientFishPixels(pixels, 3, 2, "left", true)],
    [
      10, 11, 12, 255, 13, 14, 15, 0, 16, 17, 18, 128, 1, 2, 3, 0, 4, 5, 6, 128,
      7, 8, 9, 255,
    ],
  );
});
