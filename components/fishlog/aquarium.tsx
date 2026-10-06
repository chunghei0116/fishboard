"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play, ChevronDown } from "lucide-react";
import type { SpeciesSummary } from "@/data/types";
import PixelFish from "./pixel-fish";
function seed(id: string) {
  return [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
}
export default function Aquarium({
  species,
  total,
}: {
  species: SpeciesSummary[];
  total: number;
}) {
  const [paused, setPaused] = useState(false),
    [hidden, setHidden] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const listener = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  }, []);
  const stopped = paused || hidden || reduced;
  return (
    <>
      <section className="fl-aquarium" aria-label="已釣魚種水族箱">
        <div className="fl-tank-count">
          {total} CAUGHT <span>/ {species.length} SPECIES</span>
        </div>
        <div className="fl-tank-water" aria-hidden="true">
          <span className="fl-sun" />
          <span className="fl-surface-lines" />
          <svg className="fl-coral" viewBox="0 0 170 100">
            <path
              d="M0 100V86h10V73h12V57h9V40h7V18h8V9h8v20h8v15h-8v15h-7v17h17v-9h17v-7h16v9h10v12h15V57h-6V43h6v9h9V28h6v31h9V42h7v31h-9v12h21v15z"
              fill="currentColor"
            />
          </svg>
          {[12, 31, 46, 60, 91].map((left, i) => (
            <span
              className="fl-bubbles"
              key={left}
              style={{
                left: `${left}%`,
                top: `${30 + (i % 3) * 22}%`,
              }}
            >
              <i />
              <i />
            </span>
          ))}
        </div>
        {species.map((fish, index) => {
          const n = seed(fish.id),
            positions: Record<string, [number, number]> = {
              "black-seabream": [17, 27],
              "yellowfin-seabream": [48, 40],
              "red-scorpionfish": [73, 40],
              "japanese-seabass": [84, 64],
              "jack-mackerel": [71, 80],
              rabbitfish: [49, 73],
            },
            [left, top] = positions[fish.id] || [
              15 + (index % 3) * 30,
              25 + Math.floor(index / 3) * 27,
            ];
          return (
            <motion.div
              key={fish.id}
              className="fl-swimmer"
              style={
                {
                  "--fish-left": `${left}%`,
                  top: `${Math.min(top, 78)}%`,
                } as React.CSSProperties
              }
              animate={
                stopped
                  ? { x: 0, y: 0 }
                  : { x: ["-12%", "12%", "-12%"], y: [0, (n % 11) - 5, 0] }
              }
              transition={{
                duration: 20 + (n % 41),
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Link
                href={`/species/${fish.id}`}
                className="fl-fish-link"
                aria-label={`${fish.chineseName}，${fish.totalCaught} 次釣獲，查看魚種詳情`}
              >
                <motion.span
                  className="fl-swimmer-image"
                  animate={{ scaleX: stopped ? 1 : [1, 1, -1, -1, 1] }}
                  transition={{
                    duration: 20 + (n % 41),
                    repeat: Infinity,
                    times: [0, 0.48, 0.5, 0.98, 1],
                    ease: "linear",
                  }}
                >
                  <PixelFish species={fish} />
                </motion.span>
                <span className="fl-fish-tooltip">
                  <b>{fish.chineseName}</b>
                  <span>{fish.englishName}</span>
                  <small>
                    {fish.totalCaught} catches · Best{" "}
                    {fish.bestLength ? `${fish.bestLength} cm` : "—"}
                  </small>
                </span>
              </Link>
            </motion.div>
          );
        })}
        {!species.length && (
          <p className="fl-tank-empty">
            第一尾魚，第一個故事。<Link href="/add">新增釣獲紀錄 →</Link>
          </p>
        )}
        <div className="fl-tank-sign">
          DIFFERENT WATERS
          <br />
          SAME OBSESSION.
        </div>
        <button
          className="fl-pause"
          onClick={() => setPaused((v) => !v)}
          aria-label={paused ? "繼續游魚" : "暫停游魚"}
          aria-pressed={paused}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
      </section>
      <a className="fl-scroll" href="#catch-log">
        <ChevronDown size={20} />
        <span>SCROLL FOR CATCH LOG</span>
      </a>
    </>
  );
}
