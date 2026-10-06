import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../lib/fish-log.ts", import.meta.url),
  "utf8",
);
const selectors = await import(
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
const species = [
  { id: "a", chineseName: "魚", englishName: "Fish", pixelImage: "/fish.png" },
  {
    id: "b",
    chineseName: "魚二",
    englishName: "Other",
    pixelImage: "/fish.png",
  },
];
const catches = [
  {
    id: "1",
    speciesId: "a",
    date: "2026-10-04",
    time: "19:42",
    location: "Harbour",
    length: 21,
  },
  { id: "2", speciesId: "a", date: "2026-09-01", location: "Bay", length: 27 },
];
test("one unlocked fish per caught species, with derived best and first date", () => {
  assert.deepEqual(
    selectors
      .summarizeSpecies(species, catches)
      .map((s) => [s.id, s.totalCaught, s.bestLength, s.firstCaughtDate]),
    [["a", 2, 27, "2026-09-01"]],
  );
  assert.deepEqual(selectors.summarizeSpecies(species, []), []);
});
test("unknown species is excluded from summaries; missing measurements remain missing", () => {
  assert.equal(
    selectors.summarizeSpecies(species, [
      { ...catches[0], speciesId: "missing" },
    ]).length,
    0,
  );
  assert.equal(
    selectors.summarizeSpecies(species, [
      { ...catches[0], length: undefined },
    ])[0].bestLength,
    undefined,
  );
});
test("combined filters and newest-first order", () => {
  assert.equal(
    selectors.filterCatches(catches, {
      species: "a",
      location: "Bay",
      year: "2026",
    }).length,
    1,
  );
  assert.equal(selectors.filterCatches(catches, { year: "2025" }).length, 0);
  assert.deepEqual(
    selectors.sortCatches([...catches].reverse()).map((c) => c.id),
    ["1", "2"],
  );
});
test("validation rejects impossible dates, oversized fields and coordinate mismatches", () => {
  const valid = {
    speciesId: "a",
    date: "2026-10-04",
    time: "19:42",
    location: "Harbour",
    length: 21,
  };
  assert.equal(selectors.validateCatch(valid).speciesId, "a");
  for (const bad of [
    { date: "2026-02-30" },
    { time: "25:00" },
    { length: -1 },
    { weight: 0 },
    { location: "x".repeat(161) },
    { latitude: 22 },
    { latitude: 99, longitude: 114 },
  ])
    assert.throws(() => selectors.validateCatch({ ...valid, ...bad }));
});
