import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../lib/fish-swimming.ts", import.meta.url),
  "utf8",
);
const api = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    ).toString("base64")
);
test("individual fish stay inside desktop and mobile tanks through many turns", () => {
  for (const [width, height, fw, fh] of [
    [1120, 460, 130, 84],
    [335, 330, 88, 57],
    [88, 90, 88, 57],
  ]) {
    for (const [index, id] of [
      "black-seabream",
      "yellowfin-seabream",
      "rabbitfish",
      "new-species",
    ].entries()) {
      const profile = api.swimProfile(id, index);
      for (let t = 0; t < 300; t += 0.1) {
        const p = api.swimPosition(profile, t, width, height, fw, fh);
        assert.ok(p.x >= 0 && p.x + fw <= width + 1e-6);
        assert.ok(p.y >= 0 && p.y + fh <= height + 1e-6);
      }
    }
  }
});
test("profiles are deterministic, travel continuously and turn according to velocity", () => {
  const p = api.swimProfile("black-seabream", 0);
  assert.deepEqual(p, api.swimProfile("black-seabream", 0));
  assert.notDeepEqual(p, api.swimProfile("rabbitfish", 1));
  assert.ok(p.period >= 20 && p.period <= 60);
  let previous = api.swimPosition(p, 0, 1120, 460, 130, 84),
    signs = new Set();
  for (let t = 0.05; t < 120; t += 0.05) {
    const next = api.swimPosition(p, t, 1120, 460, 130, 84);
    assert.ok(Math.abs(next.x - previous.x) < 10);
    if (Math.abs(next.velocity) > 0.03) {
      assert.equal(Math.sign(next.x - previous.x), Math.sign(next.velocity));
      signs.add(Math.sign(next.velocity));
    }
    previous = next;
  }
  assert.equal(signs.size, 2);
});
