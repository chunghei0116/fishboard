import { decode, encode } from "fast-png";
import jpeg from "jpeg-js";
import { settings, FishlogError } from "./fishlog-env";
import { pngDimensions, removeMatte } from "./fish-image";
export function pngFile(bytes: Uint8Array, max = 1024, transparent = false) {
  pngDimensions(bytes, max);
  const png = decode(bytes);
  if (transparent) {
    if (png.channels !== 4 || png.depth !== 8)
      throw new FishlogError("Pixel Fish 請使用透明 RGBA PNG。");
    let clear = 0,
      solid = 0;
    for (let i = 3; i < png.data.length; i += 4) {
      if (png.data[i] === 0) clear++;
      else solid++;
    }
    if (clear < 20 || solid < 20)
      throw new FishlogError("Pixel Fish 需要透明背景及可見魚身。");
  }
  return png;
}
export async function generateFish(reference: File) {
  const e = settings();
  if (!e.AI || e.GENERATION_ENABLED !== "true")
    throw new FishlogError("AI 生圖尚未設定，請先上載 Pixel Fish。", 503);
  const bytes = new Uint8Array(await reference.arrayBuffer());
  pngFile(bytes, 511);
  const form = new FormData();
  form.set("input_image_0", reference);
  form.set("width", "1024");
  form.set("height", "1024");
  form.set(
    "prompt",
    "Redraw ONLY the fish in the reference photograph as crisp Japanese 16-bit pixel art. Preserve species silhouette, all fins, body markings and natural colors. Whole fish, side profile, head facing left. Restricted palette and large hard pixel blocks. Remove hands, people, rods, hooks, text and shadows. Background must be one perfectly flat solid pure magenta RGB(255,0,255), with no gradient, for chroma-key cutout. Keep all parts of fish away from the image edges.",
  );
  const response = new Response(form);
  const model = e.WORKERS_AI_MODEL || "@cf/black-forest-labs/flux-2-klein-4b";
  const result = (await e.AI.run(
    model as Parameters<Ai["run"]>[0],
    {
      multipart: {
        body: response.body!,
        contentType: response.headers.get("content-type")!,
      },
    } as never,
  )) as unknown as { image?: string };
  if (!result.image) throw new FishlogError("生圖服務未有傳回圖片。", 502);
  const raw = Uint8Array.from(atob(result.image), (c) => c.charCodeAt(0));
  if (raw.length > 10 * 1024 * 1024)
    throw new FishlogError("生圖結果過大。", 502);
  let width: number, height: number, rgba: Uint8Array;
  if (raw[0] === 137) {
    const png = pngFile(raw);
    width = png.width;
    height = png.height;
    if (png.depth !== 8 || ![3, 4].includes(png.channels))
      throw new FishlogError("生圖格式未支援。", 502);
    rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      rgba.set(png.data.slice(i * png.channels, i * png.channels + 3), i * 4);
      rgba[i * 4 + 3] = png.channels === 4 ? png.data[i * 4 + 3] : 255;
    }
  } else {
    const image = jpeg.decode(raw, {
      useTArray: true,
      maxResolutionInMP: 2,
      maxMemoryUsageInMB: 32,
    });
    width = image.width;
    height = image.height;
    rgba = new Uint8Array(image.data);
    if (width > 1024 || height > 1024)
      throw new FishlogError("生圖尺寸無效。", 502);
  }
  const cutout = removeMatte(rgba, width, height);
  let clear = 0;
  for (let i = 3; i < cutout.length; i += 4) if (cutout[i] === 0) clear++;
  if (clear < width * height * 0.1 || clear > width * height * 0.95)
    throw new FishlogError(
      "生圖去背效果未符合要求，請自行提供透明 Pixel Fish。",
      422,
    );
  const output = encode({ width, height, data: cutout, channels: 4, depth: 8 });
  return {
    image: new Blob([new Uint8Array(output)], { type: "image/png" }),
    model,
  };
}
