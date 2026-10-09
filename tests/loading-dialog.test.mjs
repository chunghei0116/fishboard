import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { JSDOM } from "jsdom";
const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', {
  url: "https://fish.test",
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
let source = ts.transpileModule(
  await readFile(
    new URL("../components/fishlog/loading-dialog.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;
for (const name of ["react", "react/jsx-runtime"])
  source = source.replaceAll(
    `from "${name}"`,
    `from "${import.meta.resolve(name)}"`,
  );
const { LoadingProvider, useLoading } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
let opens = 0;
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
  opens++;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
function Operation({ active, message, priority }) {
  useLoading(active, message, priority);
  return null;
}
function App({ read = true, save = false, remove = false }) {
  return createElement(
    LoadingProvider,
    null,
    createElement(Operation, {
      active: read,
      message: "讀取紀錄…",
      priority: 0,
    }),
    createElement(Operation, {
      active: save,
      message: "儲存漁獲…",
      priority: 2,
    }),
    createElement(Operation, {
      active: remove,
      message: "刪除漁獲…",
      priority: 2,
    }),
  );
}
test("all operations share one modal; refresh cannot dismiss a pending save or delete", async () => {
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(App, {})));
    const dialog = document.querySelector("dialog");
    assert.equal(document.querySelectorAll("dialog").length, 1);
    assert.ok(dialog.open);
    assert.equal(dialog.querySelector("h3").textContent, "讀取紀錄…");
    await act(async () =>
      root.render(createElement(App, { read: true, save: true })),
    );
    assert.equal(dialog.querySelector("h3").textContent, "儲存漁獲…");
    await act(async () =>
      root.render(createElement(App, { read: false, save: true })),
    );
    assert.ok(dialog.open);
    assert.equal(document.querySelector("dialog"), dialog);
    const cancel = new dom.window.Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancel);
    assert.ok(cancel.defaultPrevented);
    await act(async () =>
      root.render(
        createElement(App, { read: false, save: false, remove: true }),
      ),
    );
    assert.equal(dialog.querySelector("h3").textContent, "刪除漁獲…");
    assert.equal(opens, 1, "changing operations keeps the same modal open");
    await act(async () =>
      root.render(
        createElement(App, { read: false, save: false, remove: false }),
      ),
    );
    assert.equal(dialog.open, false);
  } finally {
    await act(async () => root.unmount());
  }
});
test("unmounting a pending operation releases loading, so failures/navigation cannot leave a blocker", async () => {
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () =>
      root.render(
        createElement(
          LoadingProvider,
          null,
          createElement(Operation, {
            active: true,
            message: "編輯儲存…",
            priority: 2,
          }),
        ),
      ),
    );
    const dialog = document.querySelector("dialog");
    assert.ok(dialog.open);
    await act(async () => root.render(createElement(LoadingProvider, null)));
    assert.equal(dialog.open, false);
  } finally {
    await act(async () => root.unmount());
  }
});
