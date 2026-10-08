"use client";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useFishLog } from "./provider";
import {
  summarizeSpecies,
  sortCatches,
  speciesName,
  catchTimeLabel,
} from "@/lib/fish-log";
import PixelFish from "./pixel-fish";
import Aquarium from "./aquarium";
import DeleteCatch from "./delete-catch";
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
          魚種圖鑑<span className="fl-heading-count">{species.length}</span>
        </h1>
      </div>
      <div className="fl-collection">
        {species.map((fish, index) => (
          <div className="fl-species-card" key={fish.id}>
            <span className="fl-species-number">
              {String(index + 1).padStart(2, "0")} / 已解鎖
            </span>
            <PixelFish species={fish} />
            <h2>{speciesName(fish)}</h2>
            {fish.chineseName && fish.englishName && (
              <p>{fish.englishName.toUpperCase()}</p>
            )}
            <div>
              <span>{fish.totalCaught} 次釣獲</span>
              <span>最長 {fish.bestLength ?? "—"} 厘米</span>
            </div>
          </div>
        ))}
      </div>
      {!species.length && !loading && (
        <div className="fl-empty">第一筆漁獲儲存後，魚種就會出現喺呢度。</div>
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
        <ArrowLeft size={15} /> 返回魚種圖鑑
      </Link>
      <section className="fl-species-hero">
        <div className="fl-detail-fish">
          <PixelFish species={fish} />
        </div>
        <div>
          <h1>{speciesName(fish)}</h1>
          {fish.chineseName && fish.englishName && (
            <p className="fl-latin">{fish.englishName.toUpperCase()}</p>
          )}
          <p className="fl-scientific">{fish.scientificName || "學名未記錄"}</p>
          <div className="fl-stats">
            <div>
              <b>{fish.totalCaught}</b>
              <span>釣獲次數</span>
            </div>
            <div>
              <b>
                {fish.bestLength ?? "—"}
                <small> 厘米</small>
              </b>
              <span>最長紀錄</span>
            </div>
            <div>
              <b className="fl-stat-date">{fish.firstCaughtDate}</b>
              <span>首次釣獲</span>
            </div>
          </div>
        </div>
      </section>
      <div className="fl-section-header">
        <h2>釣獲歷史</h2>
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
    ["日期", record.date],
    ["時段", catchTimeLabel(record)],
    ["地點", record.location],
    ["長度", record.length ? `${record.length} 厘米` : undefined],
    ["重量", record.weight ? `${record.weight} 克` : undefined],
    ["釣竿", record.rod],
    ["魚輪", record.reel],
    ["主線", record.line],
    ["前導線", record.leaderLine],
    ["擬餌／魚餌", record.lure],
  ];
  return (
    <>
      <Link className="fl-back" href="/#catch-log">
        <ArrowLeft size={15} /> 返回漁獲紀錄
      </Link>
      <div className="fl-detail-heading">
        <h1>{speciesName(fish)}</h1>
        <Link href={`/species/${fish.id}`}>
          {fish.chineseName && fish.englishName
            ? fish.englishName.toUpperCase()
            : "魚種資料"}{" "}
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="fl-catch-detail">
        <div>
          <div className="fl-detail-pixel">
            <PixelFish species={fish} />
          </div>
          <figure className="fl-original">
            {record.photo ? (
              <a
                href={record.photo}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="查看完整原相"
              >
                <img src={record.photo} alt={`${speciesName(fish)}原始魚相`} />
              </a>
            ) : (
              <div>未提供原始魚相</div>
            )}
            <figcaption>原始魚相</figcaption>
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
            <h2>備註</h2>
            <p>{record.note || "未記錄"}</p>
          </section>
        </div>
      </div>
      <DeleteCatch id={record.id} name={speciesName(fish)} />
    </>
  );
}
function Missing() {
  return (
    <div className="fl-empty">
      <span className="fl-eyebrow">找不到紀錄</span>
      <h1>搵唔到呢條紀錄。</h1>
      <p>紀錄可能未同步，或者呢條連結已經無效。</p>
      <Link href="/">返回漁獲紀錄 →</Link>
    </div>
  );
}
