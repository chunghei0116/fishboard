import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
const source = await readFile(
  new URL("../components/fishlog/pixel-fish.tsx", import.meta.url),
  "utf8",
);
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  })
  .outputText.replace(
    '"react/jsx-runtime"',
    JSON.stringify(import.meta.resolve("react/jsx-runtime")),
  );
const { default: PixelFish } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);
const species = {
  id: "fish",
  chineseName: "魚",
  englishName: "Fish",
  pixelImage: "/fish.png",
};
test("stored orientation corrects legacy images in every shared PixelFish rendering", () => {
  for (const sprite of [undefined, 0])
    for (const facing of ["left", "right"])
      for (const inverted of [false, true]) {
        const html = renderToStaticMarkup(
          createElement(PixelFish, {
            species: {
              ...species,
              sprite,
              pixelFacing: facing,
              pixelInverted: inverted,
            },
          }),
        );
        assert.ok(
          html.includes(
            `scale(${facing === "right" ? -1 : 1}, ${inverted ? -1 : 1})`,
          ),
        );
      }
});
test("normalized new images and demo sprites are not flipped again", () => {
  const html = renderToStaticMarkup(createElement(PixelFish, { species }));
  assert.ok(html.includes("scale(1, 1)"));
});
