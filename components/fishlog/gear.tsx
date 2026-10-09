"use client";
import { useRef, useState } from "react";
import { useFishLog } from "./provider";
import { gearSlots, validateGear, gearChanged } from "@/lib/gear";
import dynamic from "next/dynamic";
import { Check, LoaderCircle, Save } from "lucide-react";
import type { GearProfile } from "@/data/types";
type Slot = Exclude<keyof GearProfile, "name">;
const emptyLoadout: GearProfile = { name: "我的岸釣裝備" };
const LoadoutRig = dynamic(() => import("./loadout-rig"), { ssr: false });
export default function Gear({ embedded = false }: { embedded?: boolean }) {
  const { data, loading, demo, saveDemo, refresh, user } = useFishLog();
  const [edited, setEdited] = useState<GearProfile | null>(null);
  const baseline = data.gear ?? emptyLoadout;
  const draft = edited ?? baseline;
  const dirty = gearChanged(draft, baseline);
  const [active, setActive] = useState<Slot | null>(null);
  const [hovered, setHovered] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const equipped = gearSlots.filter(({ key }) => draft[key]?.trim()).length;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || loading || !dirty) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const gear = validateGear({ ...draft });
      if (demo) saveDemo({ ...data, gear });
      else {
        const response = await fetch("/api/gear", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gear),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw Error(result.error || "未能儲存裝備。");
        await refresh();
      }
      setEdited(null);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function edit(key: keyof GearProfile, value: string) {
    setEdited({ ...draft, [key]: value });
    setSaved(false);
    setError("");
  }
  return (
    <>
      <div className="fl-page-heading">
        {embedded ? (
          <h2>
            裝備配置<span className="fl-heading-count">{equipped}/5</span>
          </h2>
        ) : (
          <h1>
            裝備配置<span className="fl-heading-count">{equipped}/5</span>
          </h1>
        )}
      </div>
      <form className="fl-loadout" onSubmit={(event) => void save(event)}>
        <header className="fl-loadout-profile">
          <div>
            <span className="fl-gear-eyebrow">
              {user?.displayName || "釣手"}
            </span>
            <label className="fl-loadout-name">
              <span className="fl-sr-only">裝備名稱</span>
              <input
                aria-label="裝備名稱"
                required
                maxLength={80}
                value={draft.name}
                onChange={(e) => edit("name", e.target.value)}
                disabled={busy || loading}
              />
            </label>
          </div>
          <span className="fl-gear-progress">
            {equipped} / 5<span> 已裝備</span>
          </span>
        </header>
        <div className="fl-rig-stage" aria-label="釣竿及配件配置">
          <span className="fl-rig-stage-label">紡車式釣組</span>
          <LoadoutRig
            active={hovered ?? active}
            selected={active}
            onSelect={setActive}
          />
          {gearSlots.map(({ key, label, name }) => (
            <div
              key={key}
              className={`fl-rig-slot fl-rig-slot-${key}${active === key ? " is-active" : ""}${draft[key]?.trim() ? " is-equipped" : ""}`}
            >
              <button
                type="button"
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(key)}
                onBlur={() => setHovered(null)}
                aria-label={`編輯 ${name}`}
                aria-expanded={active === key}
                aria-controls={active === key ? `gear-${key}` : undefined}
                disabled={busy || loading}
                onClick={() => setActive(active === key ? null : key)}
              >
                <span className="fl-rig-slot-label">
                  <i aria-hidden="true" />
                  {label}
                  <span aria-hidden="true">{active === key ? "−" : "+"}</span>
                </span>
                {active !== key && (
                  <span className="fl-rig-slot-value">
                    {draft[key]?.trim() || "選擇裝備"}
                  </span>
                )}
              </button>
              {active === key && (
                <input
                  id={`gear-${key}`}
                  aria-label={name}
                  autoFocus
                  value={draft[key] || ""}
                  maxLength={160}
                  placeholder="輸入型號或規格"
                  disabled={busy || loading}
                  onChange={(e) => edit(key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setActive(null);
                    }
                  }}
                />
              )}
            </div>
          ))}
          <span className="fl-rig-stage-note">拖動旋轉 · 雙指縮放</span>
        </div>
        <div className="fl-loadout-feedback" role="status">
          {saved && (
            <>
              <Check size={14} />
              裝備已儲存
            </>
          )}
        </div>
        {error && (
          <p className="fl-error" role="alert">
            {error}
          </p>
        )}
        {dirty && (
          <div className="fl-gear-save-dock">
            <span>未儲存的更改</span>
            <button type="submit" disabled={busy || loading}>
              {busy ? (
                <LoaderCircle size={15} className="fl-gear-saving" />
              ) : (
                <Save size={15} />
              )}
              {busy ? "儲存中…" : "儲存裝備"}
            </button>
          </div>
        )}
      </form>
    </>
  );
}
