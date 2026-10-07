"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Camera, Sun, Moon } from "lucide-react";
import { useFishLog } from "./provider";
import {
  validateCatch,
  validateSpeciesNames,
  speciesName,
} from "@/lib/fish-log";
import { preparePhoto } from "@/lib/photo-upload";
import type { Catch, Dataset } from "@/data/types";
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
export default function AddCatch({ onClose }: { onClose?: () => void }) {
  const { data, demo, user, config, saveDemo, refresh } = useFishLog();
  const router = useRouter();
  const [speciesId, setSpeciesId] = useState(data.species[0]?.id || "new"),
    [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [preparing, setPreparing] = useState(false),
    [period, setPeriod] = useState<"morning" | "evening" | "">(""),
    [error, setError] = useState("");
  const request = useRef<string | null>(null);
  const submitting = useRef(false);
  const isNew = speciesId === "new";
  const dialog = useRef<HTMLDialogElement>(null);
  const photoSelection = useRef(0);
  const savingStatus = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (busy) savingStatus.current?.focus({ preventScroll: true });
  }, [busy]);
  useEffect(() => {
    const element = dialog.current;
    const selection = photoSelection;
    const previous = document.body.style.overflow;
    element?.showModal();
    element?.querySelector("select")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      selection.current++;
      element?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  function dismiss() {
    if (busy || preparing) return;
    dialog.current?.close();
    if (onClose) onClose();
    else router.replace("/");
  }
  async function choose(file: File | undefined) {
    const selection = ++photoSelection.current;
    request.current = null;
    setError("");
    setPhoto(null);
    setPreview("");
    if (!file) return;
    setPreparing(true);
    try {
      const optimized = await preparePhoto(file);
      const nextPreview = await dataURL(optimized);
      if (photoSelection.current !== selection) return;
      setPhoto(optimized);
      setPreview(nextPreview);
    } catch (error) {
      if (photoSelection.current === selection)
        setError((error as Error).message);
    } finally {
      if (photoSelection.current === selection) setPreparing(false);
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || preparing) return;
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
        "period",
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
        if (isNew) throw Error("新增魚種需要登入並使用生圖服務。");
        const record: Catch = {
          ...input,
          id,
          photo: photo ? await dataURL(photo) : undefined,
        };
        const next: Dataset = {
          species: data.species,
          catches: [...data.catches, record],
        };
        saveDemo(next);
        router.push(`/catches/${id}`);
        return;
      }
      if (!user) throw Error("請先登入私人帳戶");
      if (isNew) {
        if (!photo) throw Error("新魚種需要魚相，請先加入魚相。");
        if (!config?.generationReady)
          throw Error("像素魚生成暫時未能使用，請稍後再試。");
        validateSpeciesNames({
          chineseName: form.get("chineseName"),
          englishName: form.get("englishName"),
        });
      }
      form.set("speciesId", speciesId);
      form.set("requestId", id);
      if (photo) form.set("photo", photo);
      else form.delete("photo");
      if (isNew && photo) form.set("reference", await aiReference(photo));
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
    <dialog
      ref={dialog}
      className="fl-catch-dialog"
      aria-labelledby="add-catch-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="fl-dialog-handle" aria-hidden="true" />
      <header className="fl-dialog-header">
        <h2 id="add-catch-title">ADD CATCH</h2>
        <button
          type="button"
          className="fl-dialog-close"
          onClick={dismiss}
          disabled={busy || preparing}
          aria-label="關閉新增漁獲"
        >
          <X size={19} />
        </button>
      </header>
      <form
        className="fl-form"
        aria-busy={busy}
        inert={busy}
        onSubmit={(event) => void save(event)}
        onChange={() => {
          if (!busy) request.current = null;
        }}
      >
        <div className="fl-dialog-body">
          <fieldset disabled={busy || preparing} className="fl-dialog-fields">
            <div className="fl-form-grid">
              <label className="fl-wide">
                魚種
                <select
                  autoFocus
                  value={speciesId}
                  onChange={(event) => setSpeciesId(event.target.value)}
                >
                  {data.species.map((s) => (
                    <option key={s.id} value={s.id}>
                      {speciesName(s)}
                    </option>
                  ))}
                  <option value="new">＋ 新魚種</option>
                </select>
              </label>
              {isNew && (
                <>
                  <label>
                    中文魚名
                    <input
                      name="chineseName"
                      maxLength={80}
                      aria-describedby="fish-name-hint"
                    />
                  </label>
                  <label>
                    英文魚名
                    <input
                      name="englishName"
                      maxLength={100}
                      aria-describedby="fish-name-hint"
                    />
                  </label>
                  <small className="fl-wide fl-name-hint" id="fish-name-hint">
                    中文或英文，填一個即可。
                  </small>
                </>
              )}
              <label className="fl-measurement">
                長度{" "}
                <span className="fl-unit-input">
                  <input
                    name="length"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="1000"
                    inputMode="decimal"
                    placeholder="—"
                  />
                  <span>cm</span>
                </span>
              </label>
              <label className="fl-measurement">
                重量{" "}
                <span className="fl-unit-input">
                  <input
                    name="weight"
                    type="number"
                    step="1"
                    min="1"
                    max="1000000"
                    inputMode="decimal"
                    placeholder="—"
                  />
                  <span>g</span>
                </span>
              </label>
            </div>
            <section className="fl-compact-section">
              <h3>WHEN &amp; WHERE</h3>
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
                <fieldset className="fl-period-field">
                  <legend>時段</legend>
                  <div className="fl-period-switch">
                    {[
                      { value: "morning", label: "早上", Icon: Sun },
                      { value: "evening", label: "晚上", Icon: Moon },
                    ].map(({ value, label, Icon }) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="period"
                          value={value}
                          checked={period === value}
                          onChange={() =>
                            setPeriod(value as "morning" | "evening")
                          }
                        />
                        <span>
                          <Icon size={14} />
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="fl-wide">
                  地點
                  <input
                    name="location"
                    required
                    maxLength={160}
                    placeholder="例如 Cheung Sha Wan"
                  />
                </label>
              </div>
            </section>
            <label className="fl-photo-picker">
              <input
                name="photo"
                required={isNew}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void choose(event.target.files?.[0])}
              />
              {preview ? (
                <img src={preview} alt="待儲存的魚相" />
              ) : (
                <Camera size={22} />
              )}
              <span>
                <b>{preview ? "更換魚相" : "加入魚相"}</b>
                <small>
                  {preparing
                    ? "處理圖片中…"
                    : photo
                      ? `${(photo.size / 1024 / 1024).toFixed(2)} MB · 已準備上傳`
                      : "相片會自動壓縮"}
                </small>
              </span>
            </label>
            <details className="fl-optional-section">
              <summary>Catch setup</summary>
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
              </div>
            </details>
            <details className="fl-optional-section">
              <summary>Notes</summary>
              <label>
                <span className="fl-sr-only">Notes</span>
                <textarea
                  name="note"
                  maxLength={4000}
                  placeholder="補充紀錄…"
                />
              </label>
            </details>
          </fieldset>
        </div>
        {error && (
          <p className="fl-error" role="alert">
            {error}
          </p>
        )}
        <footer className="fl-dialog-footer">
          <button
            type="button"
            className="fl-cancel"
            disabled={busy || preparing}
            onClick={dismiss}
          >
            取消
          </button>
          <button className="fl-primary" disabled={busy || preparing}>
            {busy ? "儲存中…" : preparing ? "處理圖片中…" : "SAVE CATCH"}
          </button>
        </footer>
      </form>
      {busy && (
        <div className="fl-save-overlay">
          <div
            className="fl-save-popup"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            tabIndex={-1}
            ref={savingStatus}
          >
            <div className="fl-saving-water" aria-hidden="true">
              <i />
              <i />
              <i />
              <svg
                className="fl-saving-fish"
                viewBox="0 0 120 64"
                shapeRendering="crispEdges"
              >
                <path
                  d="M24 24H36V16H52V12H76V16H92V24H104V40H92V48H76V52H52V48H36V40H24L8 52V12Z"
                  fill="#278de5"
                />
                <path d="M40 36H92V44H76V48H52V44H40Z" fill="#badcef" />
                <path d="M52 12V4H76V12M52 52V60H76V52" fill="#e5c574" />
                <path d="M72 28H84V40H72Z" fill="#1673bc" />
                <rect x="88" y="24" width="8" height="8" fill="#191919" />
                <rect x="88" y="24" width="3" height="3" fill="#fcfbf8" />
              </svg>
            </div>
            <h3>{isNew ? "魚仔準備游入水箱…" : "記低今次漁獲…"}</h3>
            <p>
              {isNew
                ? "正在生成像素魚及儲存紀錄，請稍候。"
                : "魚相同紀錄儲存中，請稍候。"}
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
