import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  '<!doctype html><body><form id="form"><div id="root"></div><button id="outside" type="button">outside</button></form></body>',
  { url: "https://fish.test" },
);
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const moduleURL = (src) =>
  "data:text/javascript;base64," + Buffer.from(src).toString("base64");
let src = ts.transpileModule(
  await readFile(
    new URL("../components/fishlog/location-input.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;
for (const name of ["react/jsx-runtime", "react", "lucide-react"])
  src = src.replaceAll(`from "${name}"`, `from "${import.meta.resolve(name)}"`);
const { LocationInput } = await import(moduleURL(src));
const place = {
  id: "test",
  name: "富昌邨",
  district: "深水埗區",
  address: "",
  englishName: "FU CHEONG ESTATE",
  latitude: 22.328,
  longitude: 114.154,
};
const nativeValue = Object.getOwnPropertyDescriptor(
  dom.window.HTMLInputElement.prototype,
  "value",
).set;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const originalFetch = globalThis.fetch;

async function type(input, value) {
  await act(async () => {
    nativeValue.call(input, value);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}
test("touch blur cannot remove a suggestion before click; selection submits coordinates and editing clears them", async () => {
  globalThis.fetch = async () => Response.json({ places: [place] });
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(LocationInput)));
    const input = document.querySelector('[name="location"]');
    await act(async () => input.focus());
    await type(input, "富昌");
    await act(async () => await pause(650));
    const option = document.querySelector('[role="option"]');
    assert.ok(option, "search produces a selectable suggestion");
    // Mobile Safari can blur the input with null relatedTarget while tapping
    // a button that does not take focus. Click is delivered after this blur.
    await act(async () => input.blur());
    assert.ok(
      document.body.contains(option),
      "option remains mounted between touch blur and click",
    );
    await act(async () => option.click());
    let form = new dom.window.FormData(document.getElementById("form"));
    assert.equal(form.get("location"), place.name);
    assert.equal(Number(form.get("latitude")), place.latitude);
    assert.equal(Number(form.get("longitude")), place.longitude);
    assert.equal(document.querySelector('[role="listbox"]'), null);
    await type(input, "另一個地點");
    form = new dom.window.FormData(document.getElementById("form"));
    assert.equal(form.get("latitude"), "");
    assert.equal(form.get("longitude"), "");
    await act(async () => await pause(650));
    await act(async () => document.getElementById("outside").focus());
    assert.equal(
      document.querySelector('[role="listbox"]'),
      null,
      "moving keyboard focus outside closes suggestions",
    );
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
  }
});

function pointer(target, type, x = 20, y = 20) {
  const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerId: 1,
    pointerType: "touch",
    button: 0,
    clientX: x,
    clientY: y,
  });
  target.dispatchEvent(event);
}
test("a touch tap writes the full returned place name before any compatibility click", async () => {
  const chosen = { ...place, name: "長沙灣海濱" };
  globalThis.fetch = async () => Response.json({ places: [chosen] });
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(LocationInput)));
    const input = document.querySelector('[name="location"]');
    await act(async () => input.focus());
    await type(input, "長沙灣海");
    await act(async () => await pause(650));
    const option = document.querySelector('[role="option"]');
    assert.ok(option);
    await act(async () => pointer(option, "pointerdown"));
    await act(async () => input.blur());
    await act(async () => pointer(option, "pointerup"));
    assert.equal(input.value, "長沙灣海濱");
    const form = new dom.window.FormData(document.getElementById("form"));
    assert.equal(form.get("location"), "長沙灣海濱");
    assert.equal(Number(form.get("latitude")), chosen.latitude);
    assert.equal(Number(form.get("longitude")), chosen.longitude);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
  }
});

test("scrolling or cancelling a touch does not choose a place, while keyboard Enter does", async () => {
  globalThis.fetch = async () => Response.json({ places: [place] });
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => root.render(createElement(LocationInput)));
    const input = document.querySelector('[name="location"]');
    await act(async () => input.focus());
    await type(input, "富昌");
    await act(async () => await pause(650));
    const option = document.querySelector('[role="option"]');
    await act(async () => {
      pointer(option, "pointerdown");
      pointer(option, "pointermove", 20, 60);
      pointer(option, "pointerup", 20, 60);
    });
    assert.equal(input.value, "富昌");
    assert.equal(
      new dom.window.FormData(document.getElementById("form")).get("latitude"),
      "",
    );
    await act(async () => {
      pointer(option, "pointerdown");
      pointer(option, "pointercancel");
      pointer(option, "pointerup");
    });
    assert.equal(input.value, "富昌");
    await act(async () =>
      input.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "ArrowDown",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    await act(async () =>
      input.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    assert.equal(input.value, place.name);
    assert.equal(
      new dom.window.FormData(document.getElementById("form")).get("location"),
      place.name,
    );
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
  }
});
