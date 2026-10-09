"use client";
import { useLoading } from "./loading-dialog";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Camera, Sun, Moon } from "lucide-react";
import { useFishLog } from "./provider";
import { LocationInput } from "./location-input";
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
export default function AddCatch({
  onClose,
  record,
}: {
  onClose?: () => void;
  record?: Catch;
}) {
  const { data, demo, user, config, saveDemo, refresh } = useFishLog();
  const router = useRouter();
  const [speciesId, setSpeciesId] = useState(
      record?.speciesId || data.species[0]?.id || "new",
    ),
    [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [preparing, setPreparing] = useState(false),
    [period, setPeriod] = useState<"morning" | "evening" | "">(
      record?.period || "",
    ),
    [error, setError] = useState("");
  const [setup, setSetup] = useState({
    rod: record?.rod || "",
    reel: record?.reel || "",
    line: record?.line || "",
    leaderLine: record?.leaderLine || "",
    lure: record?.lure || "",
  });
  const [gearName, setGearName] = useState(record?.gearName || "");
  const request = useRef<string | null>(null);
  const submitting = useRef(false);
  const isNew = speciesId === "new";
  const dialog = useRef<HTMLDialogElement>(null);
  useLoading(
    busy || preparing,
    preparing
      ? "準備魚相…"
      : record
        ? "更新漁獲…"
        : isNew
          ? "生成像素魚並儲存…"
          : "儲存漁獲…",
    2,
  );
  const photoSelection = useRef(0);
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
  function dismissAfterSave() {
    dialog.current?.close();
    onClose?.();
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
      const id = record?.id || request.current || crypto.randomUUID();
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
        "leaderLine",
        "lure",
        "note",
      ])
        raw[key] = form.get(key) || undefined;
      raw.gearName = gearName || undefined;
      form.set("gearName", gearName);
      raw.speciesId = nextSpeciesId;
      if (record?.time) raw.time = record.time;
      for (const key of ["length", "weight", "latitude", "longitude"]) {
        const value = form.get(key);
        if (value !== null && value !== "") raw[key] = Number(value);
      }
      const input = validateCatch(raw);
      if (record) {
        if (demo) {
          saveDemo({
            ...data,
            catches: data.catches.map((c) =>
              c.id === record.id ? { ...c, ...input } : c,
            ),
          });
        } else {
          if (!user) throw Error("請先登入私人帳戶");
          const response = await fetch(
            `/api/fishlog/catches/${encodeURIComponent(record.id)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...input,
                expectedUpdatedAt: record.updatedAt || record.created || null,
              }),
            },
          );
          const result = (await response.json()) as { error?: string };
          if (!response.ok)
            throw Error(result.error || "未能更新紀錄，請重試。");
          await refresh();
        }
        dismissAfterSave();
        return;
      }
      if (demo) {
        if (isNew) throw Error("新增魚種需要登入並使用生圖服務。");
        const record: Catch = {
          ...input,
          id,
          photo: photo ? await dataURL(photo) : undefined,
        };
        const next: Dataset = {
          ...data,
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
        <h2 id="add-catch-title">{record ? "編輯漁獲" : "新增漁獲"}</h2>
        <button
          type="button"
          className="fl-dialog-close"
          onClick={dismiss}
          disabled={busy || preparing}
          aria-label={record ? "關閉編輯漁獲" : "關閉新增漁獲"}
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
                  {!record && <option value="new">＋ 新魚種</option>}
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
                    defaultValue={record?.length ?? ""}
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="1000"
                    inputMode="decimal"
                    placeholder="—"
                  />
                  <span>厘米</span>
                </span>
              </label>
              <label className="fl-measurement">
                重量{" "}
                <span className="fl-unit-input">
                  <input
                    name="weight"
                    defaultValue={record?.weight ?? ""}
                    type="number"
                    step="1"
                    min="1"
                    max="1000000"
                    inputMode="decimal"
                    placeholder="—"
                  />
                  <span>克</span>
                </span>
              </label>
            </div>
            <section className="fl-compact-section">
              <h3>時間與地點</h3>
              <div className="fl-form-grid">
                <label>
                  日期
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={
                      record?.date ||
                      new Date().toLocaleDateString("en-CA", {
                        timeZone: "Asia/Hong_Kong",
                      })
                    }
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
                <LocationInput initial={record} />
              </div>
            </section>
            {!record && (
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
            )}
            <details className="fl-optional-section">
              <summary>釣組裝備</summary>
              {data.gear && (
                <button
                  type="button"
                  className="fl-apply-gear"
                  onClick={() => {
                    setSetup({
                      rod: data.gear?.rod || "",
                      reel: data.gear?.reel || "",
                      line: data.gear?.mainLine || "",
                      leaderLine: data.gear?.leaderLine || "",
                      lure: data.gear?.lure || "",
                    });
                    setGearName(data.gear?.name || "");
                  }}
                >
                  套用裝備 · {data.gear.name}
                </button>
              )}
              <div className="fl-form-grid">
                {[
                  ["rod", "釣竿"],
                  ["reel", "魚輪"],
                  ["line", "主線"],
                  ["leaderLine", "前導線"],
                  ["lure", "擬餌／魚餌"],
                ].map(([name, label]) => (
                  <label key={name}>
                    {label}
                    <input
                      name={name}
                      maxLength={160}
                      value={setup[name as keyof typeof setup]}
                      onChange={(e) => {
                        setSetup((prev) => ({
                          ...prev,
                          [name]: e.target.value,
                        }));
                        setGearName("");
                      }}
                    />
                  </label>
                ))}
              </div>
            </details>
            <details className="fl-optional-section">
              <summary>備註</summary>
              <label>
                <span className="fl-sr-only">備註</span>
                <textarea
                  name="note"
                  defaultValue={record?.note || ""}
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
            {busy
              ? "儲存中…"
              : preparing
                ? "處理圖片中…"
                : record
                  ? "儲存修改"
                  : "儲存漁獲"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
