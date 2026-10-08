"use client";
import { useState } from "react";
import { useFishLog } from "./provider";
import { gearSlots, validateGear } from "@/lib/gear";
import type { GearProfile } from "@/data/types";
export function GearIcon({ slot }: { slot: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="fl-gear-icon"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinejoin="miter"
      shapeRendering="crispEdges"
    >
      {slot === "rod" ? (
        <>
          <path d="M9 40 34 8h5v26M14 33l5 4M20 26l5 4M27 17l4 4" />
          <path d="M39 34v5h-7v-4" />
        </>
      ) : slot === "reel" ? (
        <>
          <path d="M9 16h26v20H9zM5 21v10M35 26h8v8M18 16V9h11v7" />
          <path d="M18 22h11v8H18z" />
        </>
      ) : slot === "lure" ? (
        <>
          <path d="M9 22h22l8 5-8 5H9l-5-5 5-5ZM15 32v9h7v-9M29 32v9h7v-7" />
          <path d="M29 24v4M9 22l4-9h7" />
        </>
      ) : (
        <>
          <path d="M13 8h22v32H13zM9 8h30M9 40h30M13 16h22M13 23h22M13 30h22" />
          {slot === "leaderLine" && <path d="M35 16h8v18h-7" />}
        </>
      )}
    </svg>
  );
}
export default function Gear() {
  const { data, loading, demo, saveDemo, refresh, user } = useFishLog();
  const [edited, setEdited] = useState<GearProfile | null>(null);
  const draft = edited ?? data.gear ?? { name: "我的岸釣裝備" };
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const equipped = gearSlots.filter(({ key }) => draft[key]?.trim()).length;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
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
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(key: keyof GearProfile, value: string) {
    setEdited({ ...draft, [key]: value });
    setSaved(false);
  }
  return (
    <>
      <div className="fl-page-heading">
        <h1>
          GEAR<span className="fl-heading-count">{equipped}/5</span>
        </h1>
      </div>
      <form className="fl-loadout" onSubmit={(event) => void save(event)}>
        <div className="fl-loadout-profile">
          <div className="fl-player-emblem">
            <GearIcon slot="rod" />
          </div>
          <div>
            <span className="fl-gear-eyebrow">
              {user?.displayName || "ANGLER"} / LOADOUT
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
            <span className="fl-gear-progress">
              {equipped} / 5 SLOTS EQUIPPED
            </span>
          </div>
        </div>
        <div className="fl-equipment-grid">
          {gearSlots.map(({ key, label, name }) => (
            <label
              key={key}
              className={`fl-equipment-slot${draft[key]?.trim() ? " is-equipped" : ""}`}
            >
              <div className="fl-equipment-top">
                <span>{label}</span>
                <i aria-hidden="true" />
              </div>
              <GearIcon slot={key} />
              <span className="fl-sr-only">{name}</span>
              <input
                aria-label={name}
                value={draft[key] || ""}
                maxLength={160}
                placeholder="未裝備"
                disabled={busy || loading}
                onChange={(e) => edit(key, e.target.value)}
              />
              <small>{draft[key]?.trim() ? "EQUIPPED" : "EMPTY SLOT"}</small>
            </label>
          ))}
        </div>
        <div className="fl-loadout-actions">
          <span role="status">
            {saved
              ? "裝備已儲存，可於 Add Catch 套用。"
              : "套用後，工具配置會記入該次漁獲。"}
          </span>
          <button className="fl-primary" disabled={busy || loading}>
            {busy ? "儲存中…" : "SAVE LOADOUT"}
          </button>
        </div>
        {error && (
          <p className="fl-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </>
  );
}
