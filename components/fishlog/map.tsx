"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { useFishLog } from "./provider";
import { CatchRows } from "./catch-log";
import { sortCatches } from "@/lib/fish-log";
import "leaflet/dist/leaflet.css";
export default function CatchMap() {
  const { data } = useFishLog();
  const host = useRef<HTMLDivElement>(null),
    map = useRef<LeafletMap | null>(null);
  const [selected, setSelected] = useState(""),
    [error, setError] = useState("");
  const locations = [
    ...new Set(
      data.catches
        .filter((c) => c.latitude !== undefined && c.longitude !== undefined)
        .map((c) => c.location),
    ),
  ];
  useEffect(() => {
    let disposed = false;
    async function initialize() {
      try {
        const L = await import("leaflet");
        if (disposed || !host.current) return;
        const instance = L.map(host.current, {
          scrollWheelZoom: false,
        }).setView([22.305, 114.195], 11);
        map.current = instance;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(instance);
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
          const marker = L.circleMarker([c.latitude!, c.longitude!], {
            radius: 8,
            color: "#278de5",
            fillColor: "#fcfbf8",
            fillOpacity: 1,
            weight: 2,
          }).addTo(instance);
          const text = document.createElement("span");
          text.textContent = `${c.location} · ${records.length} catches`;
          marker.bindTooltip(text);
          marker.on("click", () => setSelected(c.location));
        }
        if (records.length)
          instance.fitBounds(
            L.latLngBounds(records.map((c) => [c.latitude!, c.longitude!])),
            { padding: [35, 35], maxZoom: 13 },
          );
      } catch {
        if (!disposed) setError("地圖未能載入；地點紀錄仍可在下面查看。");
      }
    }
    void initialize();
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, [data.catches]);
  const records = sortCatches(
    data.catches.filter((c) => !selected || c.location === selected),
  );
  function choose(location: string) {
    setSelected(location);
    const record = data.catches.find(
      (c) => c.location === location && c.latitude !== undefined,
    );
    if (record) map.current?.panTo([record.latitude!, record.longitude!]);
  }
  return (
    <>
      <div className="fl-page-heading">
        <h1>MAP</h1>
      </div>
      {error && <p className="fl-error">{error}</p>}
      <div className="fl-map-layout">
        <div>
          <div ref={host} className="fl-map" aria-label="釣獲地點地圖" />
          <p className="fl-map-note">
            OPENSTREETMAP · 點擊藍色地點查看紀錄。未有座標的紀錄仍保留於 Catch
            Log。
          </p>
        </div>
        <div className="fl-location-list">
          <button
            className={!selected ? "is-selected" : ""}
            onClick={() => setSelected("")}
          >
            <b>All waters</b>
            <span>
              {data.catches.length} CATCHES / {locations.length} MAPPED
              LOCATIONS
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
                  {records.length} CATCHES /{" "}
                  {new Set(records.map((c) => c.speciesId)).size} SPECIES
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="fl-section-header" style={{ marginTop: 45 }}>
        <h2>{selected || "CATCH RECORDS"}</h2>
      </div>
      <CatchRows catches={records} species={data.species} />
      {!records.length && (
        <div className="fl-empty">
          未有地點紀錄。新增 Catch 時填寫座標，就會喺地圖出現。
        </div>
      )}
    </>
  );
}
