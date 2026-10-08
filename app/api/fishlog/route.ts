import type { Catch, Species } from "@/data/types";
import { validateCatch, validateSpeciesNames } from "@/lib/fish-log";
import { privateUser, mutationOrigin } from "@/lib/firebase-auth";
import {
  settings,
  fail,
  FishlogError,
  generationConfigured,
} from "@/lib/fishlog-env";
export const maxDuration = 180;
import { safeId } from "@/lib/fishlog-security";
import {
  listDocuments,
  getDocument,
  claimRequest,
  commit,
  write,
} from "@/lib/firestore";
import {
  cloudinaryConfigured,
  uploadImage,
  removeImage,
} from "@/lib/cloudinary";
import { generateFish, pngFile } from "@/lib/fish-generation";
function publicData(catches: Catch[], species: Species[]) {
  return {
    catches: catches.map((c) => ({
      ...c,
      photo: c.photo ? `/api/media/${c.id}?kind=photo` : undefined,
    })),
    species: species.map((s) => ({
      ...s,
      pixelImage: `/api/media/${s.id}?kind=pixel`,
    })),
  };
}
export async function GET() {
  try {
    const { uid } = await privateUser();
    const [catches, species] = await Promise.all([
      listDocuments(uid, "catches"),
      listDocuments(uid, "species"),
    ]);
    return Response.json(publicData(catches as Catch[], species as Species[]), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
async function boundedForm(request: Request) {
  if (!request.body) throw new FishlogError("請提供紀錄。");
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 13 * 1024 * 1024) {
      await reader.cancel();
      throw new FishlogError("圖片及資料總大小超過上限。", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": request.headers.get("content-type") || "" },
    body: bytes,
  }).formData();
}
function file(form: FormData, key: string, max: number) {
  const v = form.get(key);
  if (!(v instanceof File) || !v.size) return null;
  if (v.size > max) throw new FishlogError("圖片超過上限。", 413);
  return v;
}
export async function POST(request: Request) {
  let uid = "",
    id = "",
    claimed = false,
    committing = false;
  const assets: string[] = [];
  try {
    mutationOrigin(request);
    uid = (await privateUser()).uid;
    const form = await boundedForm(request);
    id = safeId(String(form.get("requestId") || ""));
    const newSpecies = form.get("speciesId") === "new",
      speciesId = newSpecies ? id : safeId(String(form.get("speciesId") || ""));
    const raw: Record<string, unknown> = { speciesId };
    for (const key of [
      "date",
      "time",
      "period",
      "location",
      "rod",
      "reel",
      "line",
      "lure",
      "note",
    ])
      raw[key] = form.get(key) || undefined;
    for (const key of ["length", "weight", "latitude", "longitude"]) {
      const value = form.get(key);
      if (value !== null && value !== "") raw[key] = Number(value);
    }
    let input: Omit<Catch, "id">;
    try {
      input = validateCatch(raw);
    } catch (e) {
      throw new FishlogError((e as Error).message);
    }
    const e = settings(),
      photo = file(form, "photo", 3 * 1024 * 1024),
      pixel = file(form, "pixel", 1024 * 1024),
      reference = file(form, "reference", 1024 * 1024);
    if (photo) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type))
        throw new FishlogError("原相格式無效。");
      const header = new Uint8Array(await photo.slice(0, 16).arrayBuffer());
      const valid =
        photo.type === "image/png"
          ? header[0] === 137 && header[1] === 80
          : photo.type === "image/jpeg"
            ? header[0] === 255 && header[1] === 216
            : new TextDecoder().decode(header.slice(0, 4)) === "RIFF" &&
              new TextDecoder().decode(header.slice(8, 12)) === "WEBP";
      if (!valid) throw new FishlogError("原相內容與格式不符。");
    }
    if ((photo || pixel || newSpecies) && !cloudinaryConfigured(e))
      throw new FishlogError("圖片儲存尚未設定。", 503);
    let species: Species | undefined;
    const existing = newSpecies
      ? null
      : await getDocument(uid, "species", speciesId);
    if (!newSpecies && !existing) throw new FishlogError("魚種不存在。", 404);
    if (newSpecies) {
      let names: ReturnType<typeof validateSpeciesNames>;
      try {
        names = validateSpeciesNames({
          chineseName: form.get("chineseName"),
          englishName: form.get("englishName"),
        });
      } catch (error) {
        throw new FishlogError((error as Error).message);
      }
      const { chineseName, englishName } = names;
      const scientificName = String(form.get("scientificName") || "").trim();
      if (scientificName.length > 120) throw new FishlogError("學名過長。");
      if (pixel) {
        if (pixel.type !== "image/png")
          throw new FishlogError("Pixel Fish 必須係 PNG。");
        pngFile(new Uint8Array(await pixel.arrayBuffer()), 1024, true);
      } else if (!reference || !photo || !generationConfigured(e))
        throw new FishlogError(
          "請提供透明 Pixel Fish；使用 AI 生圖需要原相及已設定的生圖服務。",
          503,
        );
      species = {
        id: speciesId,
        chineseName,
        englishName,
        scientificName: scientificName || undefined,
        pixelImage: "",
      };
    }
    const previous = await claimRequest(uid, id, newSpecies && !pixel);
    if (previous) {
      if (previous.status === "succeeded")
        return Response.json(
          { id },
          { headers: { "Cache-Control": "no-store" } },
        );
      throw new FishlogError(
        "呢條紀錄已提交。請先重新讀取紀錄，避免重複生圖。",
        409,
      );
    }
    claimed = true;
    async function recordAsset(ref: string) {
      assets.push(ref);
      await commit([
        write(uid, "requests", id, {
          id,
          status: "running",
          started: Date.now(),
          assets,
        }),
      ]);
    }
    let photoRef: string | undefined;
    if (photo) {
      photoRef = await uploadImage(e, photo, `fishboard/${id}/source`);
      await recordAsset(photoRef);
    }
    let model: string | undefined;
    if (newSpecies && species) {
      let badge: Blob = pixel!;
      if (!pixel) {
        const generated = await generateFish(reference!);
        badge = generated.image;
        model = generated.model;
      }
      species.pixelImage = await uploadImage(e, badge, `fishboard/${id}/badge`);
      await recordAsset(species.pixelImage);
    }
    const value = {
      ...input,
      id,
      photo: photoRef,
      created: new Date().toISOString(),
      model,
    };
    committing = true;
    await commit([
      write(uid, "catches", id, value, true),
      ...(species
        ? [write(uid, "species", speciesId, { ...species }, true)]
        : []),
      write(uid, "requests", id, {
        id,
        status: "succeeded",
        assets,
        completed: Date.now(),
      }),
    ]);
    return Response.json(
      { id },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (claimed) {
      if (committing) {
        await commit([
          write(uid, "requests", id, {
            id,
            status: "uncertain",
            assets,
            updated: Date.now(),
          }),
        ]).catch(() => {});
      } else {
        const cleanup = await Promise.allSettled(
          assets.map((ref) => removeImage(settings(), ref)),
        );
        await commit([
          write(uid, "requests", id, {
            id,
            status: "failed",
            assets,
            cleanupPending: cleanup.some((r) => r.status === "rejected"),
            updated: Date.now(),
          }),
        ]).catch(() => {});
      }
    }
    return fail(error);
  }
}
