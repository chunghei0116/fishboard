import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../lib/photo-upload.ts", import.meta.url),
  "utf8",
);
const { preparePhoto } = await import(
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
afterEach(() => {
  delete globalThis.createImageBitmap;
  delete globalThis.document;
});
test("small photos retain original bytes and decoder resources close", async () => {
  let closed = false;
  globalThis.createImageBitmap = async () => ({
    width: 800,
    height: 600,
    close() {
      closed = true;
    },
  });
  const input = new File(["photo"], "small.jpg", { type: "image/jpeg" });
  assert.equal(await preparePhoto(input), input);
  assert.equal(closed, true);
});
test("large photo scales without cropping and lowers quality to stay below upload budget", async () => {
  let closed = false;
  const qualities = [];
  globalThis.createImageBitmap = async () => ({
    width: 5000,
    height: 3000,
    close() {
      closed = true;
    },
  });
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        fillRect() {},
        drawImage(_image, x, y, w, h) {
          assert.equal(w, 2560);
          assert.equal(h, 1536);
          assert.equal(x, 0);
          assert.equal(y, 0);
        },
      };
    },
    toBlob(callback, type, quality) {
      qualities.push(quality);
      callback(
        new Blob([new Uint8Array(quality > 0.8 ? 3 * 1024 * 1024 : 1024)], {
          type,
        }),
      );
    },
  };
  globalThis.document = {
    createElement() {
      return canvas;
    },
  };
  const input = new File([new Uint8Array(4 * 1024 * 1024)], "large.png", {
    type: "image/png",
  });
  const output = await preparePhoto(input);
  assert.equal(output.type, "image/jpeg");
  assert.equal(output.name, "large.jpg");
  assert.ok(output.size <= 2 * 1024 * 1024);
  assert.deepEqual(qualities, [0.88, 0.76]);
  assert.equal(closed, true);
});
test("unsupported and oversized inputs fail before decoding", async () => {
  globalThis.createImageBitmap = () => {
    throw Error("should not decode");
  };
  await assert.rejects(
    preparePhoto(new File(["pdf"], "file.pdf", { type: "application/pdf" })),
    /JPG/,
  );
  await assert.rejects(
    preparePhoto(
      new File([new Uint8Array(21 * 1024 * 1024)], "large.jpg", {
        type: "image/jpeg",
      }),
    ),
    /20 MB/,
  );
});
test("encoding failures close image resources and report an actionable error", async () => {
  let closed = false;
  globalThis.createImageBitmap = async () => ({
    width: 4000,
    height: 3000,
    close() {
      closed = true;
    },
  });
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({ fillRect() {}, drawImage() {} }),
      toBlob: (cb) => cb(null),
    }),
  };
  await assert.rejects(
    preparePhoto(new File(["photo"], "large.jpg", { type: "image/jpeg" })),
    /壓縮/,
  );
  assert.equal(closed, true);
});
