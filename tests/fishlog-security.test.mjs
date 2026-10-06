import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../lib/fishlog-security.ts", import.meta.url),
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
const claims = {
  aud: "fishlog",
  iss: "https://securetoken.google.com/fishlog",
  sub: "owner",
  iat: 900,
  auth_time: 900,
  exp: 1100,
};
test("Firebase claims reject wrong project, empty subject and expired/future claims", () => {
  assert.equal(api.validateClaims(claims, "fishlog", 1000).uid, "owner");
  for (const bad of [
    { aud: "other" },
    { iss: "https://evil.test" },
    { sub: "" },
    { exp: 1000 },
    { iat: 1100 },
    { auth_time: 1100 },
  ])
    assert.throws(() =>
      api.validateClaims({ ...claims, ...bad }, "fishlog", 1000),
    );
});
test("origin and document ids fail closed", () => {
  assert.doesNotThrow(() =>
    api.requireOrigin(
      new Request("https://fish.test/api", {
        headers: { origin: "https://fish.test" },
      }),
      "https://fish.test",
    ),
  );
  for (const origin of [undefined, "https://evil.test"])
    assert.throws(() =>
      api.requireOrigin(
        new Request("https://fish.test/api", {
          headers: origin ? { origin } : {},
        }),
        "https://fish.test",
      ),
    );
  for (const id of ["../owner", "a/b", "", "x".repeat(151)])
    assert.throws(() => api.safeId(id));
});
test("Firestore codec preserves arrays, optional fields, coordinates and prevents prototype injection", () => {
  const value = {
    id: "fish",
    sprite: 0,
    length: 21.5,
    latitude: 22.3,
    date: "2026-10-06",
    note: undefined,
    coords: [1, 2],
    flag: true,
  };
  const decoded = api.decodeFields(api.encodeFields(value));
  assert.deepEqual(decoded, {
    id: "fish",
    sprite: 0,
    length: 21.5,
    latitude: 22.3,
    date: "2026-10-06",
    coords: [1, 2],
    flag: true,
  });
  assert.throws(() =>
    api.decodeFields(JSON.parse('{"__proto__":{"stringValue":"bad"}}')),
  );
});
test("Firestore REST omitted empty array/map fields decode safely", () => {
  assert.deepEqual(
    api.decodeFields({
      assets: { arrayValue: {} },
      metadata: { mapValue: {} },
    }),
    { assets: [], metadata: {} },
  );
});
