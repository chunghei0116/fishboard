import ts from "typescript";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
const source = ts
  .transpileModule(
    await readFile(
      new URL("../lib/fishing-rig-model.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  )
  .outputText.replace('from "three"', `from "${import.meta.resolve("three")}"`);
const { createFishingRig } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
// GLTFExporter uses the browser FileReader interface for its binary buffer.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const rig = createFishingRig();
const binary = await new GLTFExporter().parseAsync(rig, { binary: true });
await mkdir(new URL("../public/models/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../public/models/fishing-rig.glb", import.meta.url),
  Buffer.from(binary),
);
console.log(
  `Generated fishing-rig.glb (${Math.round(binary.byteLength / 1024)} KB)`,
);
