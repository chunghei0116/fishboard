"use client";
import { useEffect, useMemo, useRef } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import type { SpeciesSummary } from "@/data/types";
import { swimPosition, swimProfile } from "@/lib/fish-swimming";
import { speciesName } from "@/lib/fish-log";
import PixelFish from "./pixel-fish";
export default function SwimmingFish({
  fish,
  index,
  stopped,
  selected,
  onSelect,
}: {
  fish: SpeciesSummary;
  index: number;
  stopped: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const clock = useRef(0);
  const bounds = useRef({
    width: 0,
    height: 0,
    fishWidth: 130,
    fishHeight: 84,
  });
  const profile = useMemo(() => swimProfile(fish.id, index), [fish.id, index]);
  const x = useMotionValue(0),
    y = useMotionValue(0);
  useEffect(() => {
    const node = host.current,
      tank = node?.parentElement;
    if (!node || !tank) return;
    const measure = () => {
      bounds.current = {
        width: tank.clientWidth,
        height: tank.clientHeight,
        fishWidth: node.offsetWidth,
        fishHeight: node.offsetHeight,
      };
      const b = bounds.current,
        position = swimPosition(
          profile,
          clock.current,
          b.width,
          b.height,
          b.fishWidth,
          b.fishHeight,
        );
      x.set(position.x);
      y.set(position.y);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(tank);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [profile, x, y]);
  useAnimationFrame((_, delta) => {
    if (stopped || !bounds.current.width) return;
    clock.current += Math.min(delta, 64) / 1000;
    const b = bounds.current,
      position = swimPosition(
        profile,
        clock.current,
        b.width,
        b.height,
        b.fishWidth,
        b.fishHeight,
      );
    x.set(position.x);
    y.set(position.y);
  });
  return (
    <motion.div ref={host} className="fl-swimmer" style={{ x, y }}>
      <button
        type="button"
        className={`fl-fish-link${selected ? " is-selected" : ""}`}
        aria-label={`${speciesName(fish)}，${fish.totalCaught} 次釣獲`}
        aria-expanded={selected}
        aria-describedby={selected ? `fish-tooltip-${fish.id}` : undefined}
        onClick={onSelect}
      >
        <span className="fl-swimmer-image">
          <PixelFish species={fish} />
        </span>
        <span
          className="fl-fish-tooltip"
          id={`fish-tooltip-${fish.id}`}
          role="tooltip"
          hidden={!selected}
        >
          <b>{speciesName(fish)}</b>
          {fish.chineseName && fish.englishName && (
            <span>{fish.englishName}</span>
          )}
          <small>
            {fish.totalCaught} 次釣獲 · 最長{" "}
            {fish.bestLength ? `${fish.bestLength} 厘米` : "—"}
          </small>
        </span>
      </button>
    </motion.div>
  );
}
