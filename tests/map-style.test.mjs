import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = ts.transpileModule(
  await readFile(new URL("../lib/map-style.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { journalMapStyle } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("map themes keep source attribution and geometry while separating water and land", () => {
  const original = {
    version: 8,
    sources: { osm: { attribution: "OpenStreetMap" } },
    layers: [
      { id: "water", type: "fill", paint: { "fill-color": "gray" } },
      { id: "land", type: "fill" },
      { id: "town", type: "symbol", layout: { "text-field": "name" } },
    ],
  };
  const light = journalMapStyle(original, false),
    dark = journalMapStyle(original, true);
  assert.equal(light.sources, original.sources);
  assert.equal(light.layers[2].layout, original.layers[2].layout);
  assert.notEqual(
    light.layers[0].paint["fill-color"],
    light.layers[1].paint["fill-color"],
  );
  assert.notEqual(
    dark.layers[0].paint["fill-color"],
    light.layers[0].paint["fill-color"],
  );
  assert.equal(original.layers[0].paint["fill-color"], "gray");
});
