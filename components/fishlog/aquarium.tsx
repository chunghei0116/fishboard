"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Pause, Play, ChevronDown } from "lucide-react";
import type { SpeciesSummary } from "@/data/types";
import SwimmingFish from "./swimming-fish";
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
        {species.map((fish, index) => (
          <SwimmingFish
            key={fish.id}
            fish={fish}
            index={index}
            stopped={!!stopped}
          />
        ))}
        {!species.length && (
          <p className="fl-tank-empty">第一尾魚，第一個故事。</p>
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
