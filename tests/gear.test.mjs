import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = ts.transpileModule(
  await readFile(new URL("../lib/gear.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { gearChanged, validateGear } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("save is hidden for untouched or reverted equipment and absent slots", () => {
  const original = { name: "Shore kit", rod: "Rod A", mainLine: "PE 0.8" };
  assert.equal(gearChanged({ ...original }, original), false);
  assert.equal(
    gearChanged({ ...original, reel: "", leaderLine: " " }, original),
    false,
  );
  const draft = { ...original, rod: "Rod B" };
  assert.equal(gearChanged(draft, original), true);
  draft.rod = "Rod A";
  assert.equal(gearChanged(draft, original), false);
  for (const key of ["name", "rod", "reel", "mainLine", "leaderLine", "lure"])
    assert.equal(
      gearChanged({ ...original, [key]: "changed" }, original),
      true,
      key,
    );
});
test("normalized saved equipment becomes a clean baseline", () => {
  const draft = {
    name: " Shore kit ",
    rod: " Rod A ",
    leaderLine: "8 lb ",
    lure: " ",
  };
  const stored = validateGear(draft);
  assert.equal(gearChanged(draft, stored), false);
  assert.equal(gearChanged({ ...draft, leaderLine: "10 lb" }, stored), true);
});
