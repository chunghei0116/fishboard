import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../lib/session-queue.ts", import.meta.url),
  "utf8",
);
const { createSessionQueue } = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext },
      }).outputText,
    ).toString("base64")
);
test("logout finishes after an in-flight session POST and skips superseded accounts", async () => {
  const enqueue = createSessionQueue();
  const events = [];
  let release;
  let epoch = 1;
  const first = enqueue(async () => {
    events.push("POST A start");
    await new Promise((resolve) => {
      release = resolve;
    });
    events.push("POST A finish");
  });
  await Promise.resolve();
  const secondEpoch = ++epoch;
  const second = enqueue(async () => {
    if (secondEpoch === epoch) events.push("POST B");
  });
  ++epoch;
  const logout = enqueue(async () => {
    events.push("DELETE");
  });
  assert.deepEqual(events, ["POST A start"]);
  release();
  await Promise.all([first, second, logout]);
  assert.deepEqual(events, ["POST A start", "POST A finish", "DELETE"]);
});
test("a failed session mutation does not block the following logout", async () => {
  const enqueue = createSessionQueue();
  const failure = enqueue(async () => {
    throw Error("offline");
  });
  const next = enqueue(async () => "signed out");
  await assert.rejects(failure, /offline/);
  assert.equal(await next, "signed out");
});
