import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { encode, decode } from "fast-png";
import ts from "typescript";
const moduleURL = (source) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  ).toString("base64");
const envSource = (
  await readFile(new URL("../lib/fishlog-env.ts", import.meta.url), "utf8")
)
  .replace('import { env } from "cloudflare:workers";', "")
  .replace(
    "return env as unknown as FishlogEnv;",
    "return globalThis.__generationEnv;",
  );
const envURL = moduleURL(envSource);
const imageURL = moduleURL(
  await readFile(new URL("../lib/fish-image.ts", import.meta.url), "utf8"),
);
const source = (
  await readFile(new URL("../lib/fish-generation.ts", import.meta.url), "utf8")
)
  .replace("./fishlog-env", envURL)
  .replace("./fish-image", imageURL)
  .replace('"fast-png"', JSON.stringify(import.meta.resolve("fast-png")))
  .replace('"jpeg-js"', JSON.stringify(import.meta.resolve("jpeg-js")));
const { generateFish, inspectFishOrientation } = await import(
  moduleURL(source)
);
const { generationConfigured } = await import(envURL);
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.__generationEnv;
});
const reference = () =>
  new File(
    [
      encode({
        width: 32,
        height: 32,
        data: new Uint8Array(32 * 32 * 4),
        channels: 4,
      }),
    ],
    "fish.png",
    { type: "image/png" },
  );
const env = () => ({
  GENERATION_ENABLED: "true",
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_AI_TOKEN: "test-only",
});
test("generation readiness requires enabled flag and valid REST configuration or native binding", () => {
  assert.equal(generationConfigured(env()), true);
  assert.equal(
    generationConfigured({ ...env(), GENERATION_ENABLED: "false" }),
    false,
  );
  assert.equal(
    generationConfigured({ ...env(), CLOUDFLARE_ACCOUNT_ID: "../bad" }),
    false,
  );
  assert.equal(
    generationConfigured({ GENERATION_ENABLED: "true", AI: {} }),
    true,
  );
});
test("Workers AI REST sends reference as multipart and returns a transparent cutout", async () => {
  globalThis.__generationEnv = env();
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let i = 0; i < 32 * 32; i++) pixels.set([255, 0, 255, 255], i * 4);
  for (let y = 8; y < 24; y++)
    for (let x = 4; x < 28; x++)
      pixels.set([80, 110, 120, 255], (y * 32 + x) * 4);
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/@cf/google/gemma-4-26b-a4b-it")) {
      const body = JSON.parse(options.body);
      assert.match(
        body.messages[0].content[1].image_url.url,
        /^data:image\/png;base64,/,
      );
      return Response.json({
        success: true,
        result: { choices: [{ message: { content: "LEFT_UPRIGHT" } }] },
      });
    }
    assert.equal(
      url,
      "https://api.cloudflare.com/client/v4/accounts/" +
        "a".repeat(32) +
        "/ai/run/@cf/black-forest-labs/flux-2-klein-4b",
    );
    assert.equal(options.headers.Authorization, "Bearer test-only");
    assert.equal(options.body.get("input_image_0").name, "fish.png");
    assert.equal(options.body.get("width"), "1024");
    return Response.json({
      success: true,
      result: {
        image: Buffer.from(
          encode({ width: 32, height: 32, data: pixels, channels: 4 }),
        ).toString("base64"),
      },
    });
  };
  const result = await generateFish(reference());
  const png = decode(new Uint8Array(await result.image.arrayBuffer()));
  assert.equal(png.data[3], 0);
  assert.equal(png.data[(12 * 32 + 12) * 4 + 3], 255);
});
test("provider failures do not leak response details or token", async () => {
  globalThis.__generationEnv = env();
  globalThis.fetch = async () =>
    new Response("secret-provider-error", { status: 403 });
  await assert.rejects(
    generateFish(reference()),
    (e) => e.status === 502 && !e.message.includes("secret-provider-error"),
  );
});

test("right-facing and upside-down generations normalize RGBA before storing", async () => {
  globalThis.__generationEnv = env();
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let i = 0; i < 32 * 32; i++) pixels.set([255, 0, 255, 255], i * 4);
  for (let y = 8; y < 24; y++)
    for (let x = 4; x < 28; x++) pixels.set([x, y, 120, 255], (y * 32 + x) * 4);
  for (const label of ["RIGHT_UPRIGHT", "LEFT_INVERTED", "RIGHT_INVERTED"]) {
    globalThis.fetch = async (url) =>
      url.endsWith("/@cf/google/gemma-4-26b-a4b-it")
        ? Response.json({
            success: true,
            result: { choices: [{ message: { content: label } }] },
          })
        : Response.json({
            success: true,
            result: {
              image: Buffer.from(
                encode({ width: 32, height: 32, data: pixels, channels: 4 }),
              ).toString("base64"),
            },
          });
    const result = await generateFish(reference());
    const png = decode(new Uint8Array(await result.image.arrayBuffer()));
    const x = label.startsWith("RIGHT") ? 31 - 12 : 12;
    const y = label.endsWith("INVERTED") ? 31 - 10 : 10;
    assert.deepEqual(
      [...png.data.slice((10 * 32 + 12) * 4, (10 * 32 + 12) * 4 + 4)],
      [x, y, 120, 255],
    );
    assert.equal(png.data[3], 0);
  }
});
test("ambiguous orientation and unavailable verification reject instead of storing an unchecked image", async () => {
  globalThis.__generationEnv = env();
  for (const content of ["UNKNOWN", "", "LEFT or RIGHT", "Ignore the rules"]) {
    globalThis.fetch = async () =>
      Response.json({
        success: true,
        result: { choices: [{ message: { content } }] },
      });
    await assert.rejects(
      inspectFishOrientation(new Uint8Array(16), 2, 2),
      (e) => e.status === 422,
    );
  }
  globalThis.fetch = async () =>
    new Response("private-provider-error", { status: 503 });
  await assert.rejects(
    inspectFishOrientation(new Uint8Array(16), 2, 2),
    (e) => e.status === 502 && !e.message.includes("private-provider-error"),
  );
});
test("native AI binding performs the same orientation verification", async () => {
  globalThis.__generationEnv = {
    AI: {
      run: async (model, input) => {
        assert.equal(model, "@cf/google/gemma-4-26b-a4b-it");
        assert.equal(input.temperature, 0);
        return { choices: [{ message: { content: "RIGHT_UPRIGHT" } }] };
      },
    },
  };
  assert.deepEqual(await inspectFishOrientation(new Uint8Array(16), 2, 2), {
    facing: "right",
    inverted: false,
  });
});
