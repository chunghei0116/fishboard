"use client";
import Link from "next/link";
import { useState } from "react";
import { Clock3, MapPin, ArrowRight, Plus } from "lucide-react";
import type { Catch, Species } from "@/data/types";
import AddCatch from "./add-catch";
import { filterCatches, speciesName, catchTimeLabel } from "@/lib/fish-log";
import PixelFish from "./pixel-fish";
export function CatchRows({
  catches,
  species,
}: {
  catches: Catch[];
  species: Species[];
}) {
  const dates = [...new Set(catches.map((c) => c.date))];
  return (
    <div className="fl-timeline">
      {dates.map((date) => {
        const day = new Date(date + "T12:00:00Z");
        return (
          <section className="fl-day" key={date}>
            <div className="fl-date">
              <b>{date.slice(8)}</b>
              <span>
                {day
                  .toLocaleDateString("en", { month: "short", timeZone: "UTC" })
                  .toUpperCase()}
              </span>
              <span>{date.slice(0, 4)}</span>
              <i />
            </div>
            <div className="fl-day-records">
              {catches
                .filter((c) => c.date === date)
                .map((c) => {
                  const fish = species.find((s) => s.id === c.speciesId);
                  if (!fish) return null;
                  return (
                    <Link
                      href={`/catches/${c.id}`}
                      className="fl-catch-row"
                      key={c.id}
                    >
                      <PixelFish species={fish} />
                      <div className="fl-catch-name">
                        <b>{speciesName(fish)}</b>
                        {fish.chineseName && fish.englishName && (
                          <span>{fish.englishName.toUpperCase()}</span>
                        )}
                      </div>
                      <span className="fl-catch-time">
                        <Clock3 size={14} />
                        {catchTimeLabel(c) || "—"}
                      </span>
                      <span className="fl-catch-location">
                        <MapPin size={14} />
                        {c.location}
                      </span>
                      <span className="fl-catch-length">
                        {c.length ?? "—"} <small>cm</small>
                      </span>
                      <ArrowRight className="fl-card-arrow" size={17} />
                    </Link>
                  );
                })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
export default function CatchLog({
  catches,
  species,
}: {
  catches: Catch[];
  species: Species[];
}) {
  const [adding, setAdding] = useState(false);
  const [selectedSpecies, setSpecies] = useState(""),
    [location, setLocation] = useState(""),
    [year, setYear] = useState("");
  const filtered = filterCatches(catches, {
    species: selectedSpecies,
    location,
    year,
  });
  return (
    <section id="catch-log" className="fl-log">
      <div className="fl-section-header fl-log-header">
        <div className="fl-log-heading">
          <h1>CATCH LOG</h1>
          <button
            type="button"
            className="fl-add-catch"
            onClick={() => setAdding(true)}
          >
            <Plus size={14} /> ADD CATCH
          </button>
        </div>
        <div className="fl-filters">
          <button
            className={
              !selectedSpecies && !location && !year ? "is-active" : ""
            }
            onClick={() => {
              setSpecies("");
              setLocation("");
              setYear("");
            }}
          >
            ALL
          </button>
          <select
            aria-label="Filter by species"
            value={selectedSpecies}
            onChange={(e) => setSpecies(e.target.value)}
          >
            <option value="">SPECIES</option>
            {species
              .filter((s) => catches.some((c) => c.speciesId === s.id))
              .map((s) => (
                <option value={s.id} key={s.id}>
                  {speciesName(s)}
                </option>
              ))}
          </select>
          <select
            aria-label="Filter by location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">LOCATION</option>
            {[...new Set(catches.map((c) => c.location))].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select
            aria-label="Filter by year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">YEAR</option>
            {[...new Set(catches.map((c) => c.date.slice(0, 4)))]
              .sort()
              .reverse()
              .map((y) => (
                <option key={y}>{y}</option>
              ))}
          </select>
        </div>
      </div>
      {adding && <AddCatch onClose={() => setAdding(false)} />}
      <CatchRows catches={filtered} species={species} />
      {!filtered.length && (
        <div className="fl-empty">
          <h2>
            {catches.length
              ? "呢個篩選未有紀錄。"
              : "水邊嘅故事，由第一尾開始。"}
          </h2>
          <p>
            {catches.length
              ? "試下其他魚種、地點或年份。"
              : "新增漁獲，收藏會隨每次釣魚慢慢成長。"}
          </p>
        </div>
      )}
    </section>
  );
}
