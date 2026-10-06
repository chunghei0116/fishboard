"use client";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useFishLog } from "./provider";
import { summarizeSpecies, sortCatches } from "@/lib/fish-log";
import PixelFish from "./pixel-fish";
import Aquarium from "./aquarium";
import CatchLog, { CatchRows } from "./catch-log";
export function Home() {
  const { data, loading } = useFishLog();
  return (
    <>
      <Aquarium
        species={summarizeSpecies(data.species, data.catches)}
        total={data.catches.length}
      />
      {loading ? (
        <p className="fl-loading">讀取紀錄中…</p>
      ) : (
        <CatchLog {...data} />
      )}
    </>
  );
}
export function Collection() {
  const { data, loading } = useFishLog();
  const species = summarizeSpecies(data.species, data.catches);
  return (
    <>
      <div className="fl-page-heading">
        <h1>
          COLLECTION<span className="fl-heading-count">{species.length}</span>
        </h1>
      </div>
      <div className="fl-collection">
        {species.map((fish, index) => (
          <Link
            className="fl-species-card"
            href={`/species/${fish.id}`}
            key={fish.id}
          >
            <span className="fl-species-number">
              {String(index + 1).padStart(2, "0")} / UNLOCKED
            </span>
            <PixelFish species={fish} />
            <h2>{fish.chineseName}</h2>
            <p>{fish.englishName.toUpperCase()}</p>
            <div>
              <span>{fish.totalCaught} CATCHES</span>
              <span>
                BEST {fish.bestLength ?? "—"} cm <ArrowUpRight size={13} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!species.length && !loading && (
        <div className="fl-empty">
          第一條 Catch 保存後，魚種就會出現喺呢度。
        </div>
      )}
    </>
  );
}
export function SpeciesDetail({ id }: { id: string }) {
  const { data, loading } = useFishLog();
  const fish = summarizeSpecies(data.species, data.catches).find(
    (s) => s.id === id,
  );
  if (loading) return <p className="fl-loading">讀取魚種中…</p>;
  if (!fish) return <Missing />;
  return (
    <>
      <Link className="fl-back" href="/collection">
        <ArrowLeft size={15} /> BACK TO COLLECTION
      </Link>
      <section className="fl-species-hero">
        <div className="fl-detail-fish">
          <PixelFish species={fish} />
        </div>
        <div>
          <h1>{fish.chineseName}</h1>
          <p className="fl-latin">{fish.englishName.toUpperCase()}</p>
          <p className="fl-scientific">{fish.scientificName || "學名未記錄"}</p>
          <div className="fl-stats">
            <div>
              <b>{fish.totalCaught}</b>
              <span>CATCHES</span>
            </div>
            <div>
              <b>
                {fish.bestLength ?? "—"}
                <small> cm</small>
              </b>
              <span>BEST LENGTH</span>
            </div>
            <div>
              <b className="fl-stat-date">{fish.firstCaughtDate}</b>
              <span>FIRST CAUGHT</span>
            </div>
          </div>
        </div>
      </section>
      <div className="fl-section-header">
        <h2>CATCH HISTORY</h2>
      </div>
      <CatchRows
        catches={sortCatches(data.catches.filter((c) => c.speciesId === id))}
        species={data.species}
      />
    </>
  );
}
export function CatchDetail({ id }: { id: string }) {
  const { data, loading } = useFishLog();
  const record = data.catches.find((c) => c.id === id),
    fish = data.species.find((s) => s.id === record?.speciesId);
  if (loading) return <p className="fl-loading">讀取紀錄中…</p>;
  if (!record || !fish) return <Missing />;
  const fields = [
    ["DATE", record.date],
    ["TIME", record.time],
    ["LOCATION", record.location],
    ["LENGTH", record.length ? `${record.length} cm` : undefined],
    ["WEIGHT", record.weight ? `${record.weight} g` : undefined],
    ["ROD", record.rod],
    ["REEL", record.reel],
    ["LINE", record.line],
    ["LURE / BAIT", record.lure],
  ];
  return (
    <>
      <Link className="fl-back" href="/#catch-log">
        <ArrowLeft size={15} /> BACK TO CATCH LOG
      </Link>
      <div className="fl-detail-heading">
        <h1>{fish.chineseName}</h1>
        <Link href={`/species/${fish.id}`}>
          {fish.englishName.toUpperCase()} <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="fl-catch-detail">
        <div>
          <div className="fl-detail-pixel">
            <PixelFish species={fish} />
          </div>
          <figure className="fl-original">
            {record.photo ? (
              <img src={record.photo} alt={`${fish.chineseName}原始魚相`} />
            ) : (
              <div>未提供原始魚相</div>
            )}
            <figcaption>ORIGINAL CATCH PHOTO</figcaption>
          </figure>
        </div>
        <div>
          <dl className="fl-field-list">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "未記錄"}</dd>
              </div>
            ))}
          </dl>
          <section className="fl-notes">
            <h2>NOTES</h2>
            <p>{record.note || "未記錄"}</p>
          </section>
        </div>
      </div>
    </>
  );
}
function Missing() {
  return (
    <div className="fl-empty">
      <span className="fl-eyebrow">RECORD NOT FOUND</span>
      <h1>搵唔到呢條紀錄。</h1>
      <p>紀錄可能未同步，或者呢條連結已經無效。</p>
      <Link href="/">返回 Catch Log →</Link>
    </div>
  );
}
