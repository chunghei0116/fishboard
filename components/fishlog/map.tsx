"use client";
import { useLoading } from "./loading-dialog";
import { useEffect, useRef, useState } from "react";
import type { Map as JournalMap, StyleSpecification } from "maplibre-gl";
import { useTheme } from "next-themes";
import { journalMapStyle } from "@/lib/map-style";
import { useFishLog } from "./provider";
import { CatchRows } from "./catch-log";
import { sortCatches } from "@/lib/fish-log";
import "maplibre-gl/dist/maplibre-gl.css";
export default function CatchMap() {
  const { data } = useFishLog();
  const { resolvedTheme } = useTheme();
  const host = useRef<HTMLDivElement>(null),
    map = useRef<JournalMap | null>(null);
  const [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [fetching, setFetching] = useState(true);
  useLoading(fetching, "載入釣獲地圖…", 0);
  const locations = [
    ...new Set(
      data.catches
        .filter((c) => c.latitude !== undefined && c.longitude !== undefined)
        .map((c) => c.location),
    ),
  ];
  useEffect(() => {
    let disposed = false;
    const abort = new AbortController();
    async function initialize() {
      try {
        setFetching(true);
        setError("");
        const [M, response] = await Promise.all([
          import("maplibre-gl"),
          fetch("https://tiles.openfreemap.org/styles/positron", {
            signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]),
          }),
        ]);
        if (!response.ok) throw Error("Map unavailable");
        const style = (await response.json()) as StyleSpecification;
        if (disposed || !host.current) return;
        M.setWorkerUrl(
          new URL(
            "maplibre-gl/dist/maplibre-gl-worker.mjs",
            import.meta.url,
          ).toString(),
        );
        const instance = new M.Map({
          container: host.current,
          style: journalMapStyle(style, resolvedTheme === "dark"),
          center: [114.195, 22.305],
          zoom: 11,
          scrollZoom: false,
          locale: {
            "Map.Title": "釣獲地點地圖",
            "NavigationControl.ZoomIn": "放大地圖",
            "NavigationControl.ZoomOut": "縮小地圖",
            "AttributionControl.ToggleAttribution": "地圖資料來源",
          },
          dragRotate: false,
        });
        map.current = instance;
        instance.touchZoomRotate.disableRotation();
        instance.addControl(
          new M.NavigationControl({ showCompass: false }),
          "top-right",
        );
        const records = data.catches.filter(
          (c) => c.latitude !== undefined && c.longitude !== undefined,
        );
        const points = new Map<string, typeof records>();
        for (const record of records) {
          const key = `${record.location}:${record.latitude}:${record.longitude}`;
          points.set(key, [...(points.get(key) || []), record]);
        }
        for (const records of points.values()) {
          const c = records[0];
          const button = document.createElement("button");
          button.type = "button";
          button.className = "fl-map-marker";
          button.textContent = String(records.length);
          button.setAttribute(
            "aria-label",
            `${c.location} · ${records.length} 筆漁獲`,
          );
          button.title = `${c.location} · ${records.length} 筆漁獲`;
          button.addEventListener("click", () => setSelected(c.location));
          new M.Marker({ element: button })
            .setLngLat([c.longitude!, c.latitude!])
            .addTo(instance);
        }
        if (records.length) {
          const bounds = new M.LngLatBounds();
          records.forEach((c) => bounds.extend([c.longitude!, c.latitude!]));
          instance.fitBounds(bounds, { padding: 35, maxZoom: 13, duration: 0 });
        }
      } catch {
        if (!disposed) setError("地圖未能載入；地點紀錄仍可在下面查看。");
      } finally {
        if (!disposed) setFetching(false);
      }
    }
    void initialize();
    return () => {
      disposed = true;
      abort.abort();
      map.current?.remove();
      map.current = null;
    };
  }, [data.catches, resolvedTheme]);
  const records = sortCatches(
    data.catches.filter((c) => !selected || c.location === selected),
  );
  function choose(location: string) {
    setSelected(location);
    const record = data.catches.find(
      (c) =>
        c.location === location &&
        c.latitude !== undefined &&
        c.longitude !== undefined,
    );
    if (record) map.current?.panTo([record.longitude!, record.latitude!]);
  }
  return (
    <>
      <div className="fl-page-heading">
        <h1>釣獲地圖</h1>
      </div>
      {error && <p className="fl-error">{error}</p>}
      <div className="fl-map-layout">
        <div>
          <div ref={host} className="fl-map" aria-label="釣獲地點地圖" />
          <p className="fl-map-note">點擊藍色地點查看紀錄。</p>
        </div>
        <div className="fl-location-list">
          <button
            className={!selected ? "is-selected" : ""}
            onClick={() => setSelected("")}
          >
            <b>所有水域</b>
            <span>
              {data.catches.length} 筆漁獲 / {locations.length} 個已標記地點
            </span>
          </button>
          {locations.map((location) => {
            const records = data.catches.filter((c) => c.location === location);
            return (
              <button
                className={selected === location ? "is-selected" : ""}
                key={location}
                onClick={() => choose(location)}
              >
                <b>{location}</b>
                <span>
                  {records.length} 筆漁獲 /{" "}
                  {new Set(records.map((c) => c.speciesId)).size} 個魚種
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="fl-section-header" style={{ marginTop: 45 }}>
        <h2>{selected || "漁獲紀錄"}</h2>
      </div>
      <CatchRows catches={records} species={data.species} />
      {!records.length && (
        <div className="fl-empty">
          未有地點紀錄。新增漁獲時填寫座標，就會喺地圖出現。
        </div>
      )}
    </>
  );
}
