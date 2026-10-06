"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useFishLog } from "./provider";
import { validateCatch } from "@/lib/fish-log";
import type { Catch, Dataset, Species } from "@/data/types";
function dataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error("圖片讀取失敗"));
    reader.readAsDataURL(file);
  });
}
async function aiReference(file: File) {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 511 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(image.width * scale));
  canvas.height = Math.max(1, Math.floor(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw Error("未能準備生圖參考相");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("未能縮小參考相"))),
      "image/png",
    ),
  );
  return new File([blob], "reference.png", { type: "image/png" });
}
export default function AddCatch() {
  const { data, demo, user, config, saveDemo, refresh } = useFishLog();
  const router = useRouter();
  const [speciesId, setSpeciesId] = useState(data.species[0]?.id || "new"),
    [photo, setPhoto] = useState<File | null>(null),
    [pixel, setPixel] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef<string | null>(null);
  const submitting = useRef(false);
  const isNew = speciesId === "new";
  async function choose(file: File | undefined) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("請選擇 10 MB 以下 JPG、PNG 或 WebP。");
      setPhoto(null);
      setPreview("");
      return;
    }
    setPhoto(file);
    setPreview(await dataURL(file));
    request.current = null;
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const id = request.current || crypto.randomUUID();
      request.current = id;
      const nextSpeciesId = isNew ? id : speciesId;
      const raw: Record<string, unknown> = {};
      for (const key of [
        "date",
        "time",
        "location",
        "rod",
        "reel",
        "line",
        "lure",
        "note",
      ])
        raw[key] = form.get(key) || undefined;
      raw.speciesId = nextSpeciesId;
      for (const key of ["length", "weight", "latitude", "longitude"]) {
        const value = form.get(key);
        if (value !== null && value !== "") raw[key] = Number(value);
      }
      const input = validateCatch(raw);
      if (demo) {
        let species: Species | undefined;
        if (isNew) {
          const chineseName = String(form.get("chineseName") || "").trim(),
            englishName = String(form.get("englishName") || "").trim();
          if (!chineseName || !englishName)
            throw Error("請填寫魚種中文及英文名");
          if (!pixel)
            throw Error(
              "示範模式新增魚種需要上載透明 PNG 像素魚；AI 生圖需要私人帳戶。",
            );
          species = {
            id: nextSpeciesId,
            chineseName,
            englishName,
            scientificName:
              String(form.get("scientificName") || "") || undefined,
            pixelImage: await dataURL(pixel),
          };
        }
        const record: Catch = {
          ...input,
          id,
          photo: photo ? await dataURL(photo) : undefined,
        };
        const next: Dataset = {
          species: species ? [...data.species, species] : data.species,
          catches: [...data.catches, record],
        };
        saveDemo(next);
        router.push(`/catches/${id}`);
        return;
      }
      if (!user) throw Error("請先登入私人帳戶");
      form.set("speciesId", speciesId);
      form.set("requestId", id);
      if (photo) form.set("photo", photo);
      else form.delete("photo");
      if (pixel) form.set("pixel", pixel);
      else form.delete("pixel");
      if (isNew && !pixel && photo)
        form.set("reference", await aiReference(photo));
      const r = await fetch("/api/fishlog", { method: "POST", body: form });
      const response = (await r.json()) as { id: string; error?: string };
      if (!r.ok) throw Error(response.error || "未能儲存，請再試");
      await refresh();
      router.push(`/catches/${response.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }
  return (
    <>
      <Link href="/" className="fl-back">
        <ArrowLeft size={14} /> BACK TO CATCH LOG
      </Link>
      <div className="fl-form">
        <div className="fl-page-heading">
          <h1>ADD CATCH</h1>
        </div>
        <form
          onSubmit={(e) => void save(e)}
          onChange={() => {
            if (!busy) request.current = null;
          }}
        >
          <fieldset
            disabled={busy}
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <section className="fl-form-section">
              <h2>01 / THE FISH</h2>
              <div className="fl-form-grid">
                <label className="fl-wide">
                  魚種
                  <select
                    value={speciesId}
                    onChange={(e) => setSpeciesId(e.target.value)}
                  >
                    {data.species.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.chineseName} / {s.englishName}
                      </option>
                    ))}
                    <option value="new">＋ 新魚種</option>
                  </select>
                </label>
                {isNew && (
                  <>
                    <label>
                      中文魚名
                      <input name="chineseName" required maxLength={80} />
                    </label>
                    <label>
                      英文魚名
                      <input name="englishName" required maxLength={100} />
                    </label>
                    <label className="fl-wide">
                      學名（選填）
                      <input name="scientificName" maxLength={120} />
                    </label>
                  </>
                )}
                <label className="fl-file fl-wide">
                  原始魚相（選填）
                  <input
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => void choose(e.target.files?.[0])}
                  />
                  {preview && <img src={preview} alt="待儲存的魚相" />}
                  <small>JPG、PNG、WebP · 最大 10 MB</small>
                </label>
                {isNew && (
                  <label className="fl-file fl-wide">
                    Pixel Fish
                    <input
                      name="pixel"
                      type="file"
                      accept="image/png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (
                          f &&
                          (f.type !== "image/png" || f.size > 2 * 1024 * 1024)
                        ) {
                          setError("Pixel Fish 請使用 2 MB 以下透明 PNG");
                          setPixel(null);
                        } else setPixel(f || null);
                      }}
                    />
                    <small>
                      {demo
                        ? "示範模式請提供透明 PNG 像素魚。"
                        : config?.generationReady
                          ? "可以自行上載透明 PNG；留空會用原始魚相生成。"
                          : "AI 生圖尚未設定，請自行上載透明 PNG 像素魚。"}
                    </small>
                  </label>
                )}
              </div>
            </section>
            <section className="fl-form-section">
              <h2>02 / WHEN & WHERE</h2>
              <div className="fl-form-grid">
                <label>
                  日期
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toLocaleDateString("en-CA", {
                      timeZone: "Asia/Hong_Kong",
                    })}
                  />
                </label>
                <label>
                  時間
                  <input name="time" type="time" />
                </label>
                <label className="fl-wide">
                  地點
                  <input
                    name="location"
                    required
                    maxLength={160}
                    placeholder="例如 Cheung Sha Wan"
                  />
                </label>
                <label>
                  緯度（選填）
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    placeholder="22.332"
                  />
                </label>
                <label>
                  經度（選填）
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    placeholder="114.145"
                  />
                </label>
                <label>
                  長度 · cm
                  <input
                    name="length"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="1000"
                  />
                </label>
                <label>
                  重量 · g
                  <input
                    name="weight"
                    type="number"
                    step="1"
                    min="1"
                    max="1000000"
                  />
                </label>
              </div>
            </section>
            <section className="fl-form-section">
              <h2>03 / THE SETUP</h2>
              <div className="fl-form-grid">
                {[
                  ["rod", "Rod"],
                  ["reel", "Reel"],
                  ["line", "Line"],
                  ["lure", "Lure / Bait"],
                ].map(([name, label]) => (
                  <label key={name}>
                    {label}
                    <input name={name} maxLength={160} />
                  </label>
                ))}
                <label className="fl-wide">
                  Notes
                  <textarea
                    name="note"
                    maxLength={4000}
                    placeholder="水色、潮汐、嗰一啖魚訊…"
                  />
                </label>
              </div>
            </section>
          </fieldset>
          {error && (
            <p className="fl-error" role="alert">
              {error}
            </p>
          )}
          <div className="fl-save-row">
            <p>
              {isNew
                ? "新魚種會解鎖一條 Pixel Fish。保存成功後先會加入 Aquarium。"
                : "重用魚種嘅 Pixel Fish，唔會再生成或增加重複游魚。"}
            </p>
            <button className="fl-primary" disabled={busy}>
              {busy ? "儲存中…" : "SAVE CATCH →"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
