import { useId } from "react";
import type { GearProfile } from "@/data/types";
type Slot = Exclude<keyof GearProfile, "name">;
/** An assembled spinning setup: the callouts follow the actual attachment points. */
export default function LoadoutRig({
  mobile,
  active,
}: {
  mobile?: boolean;
  active: Slot | null;
}) {
  const id = useId().replaceAll(":", "");
  const fill = (name: string) => `url(#${id}-${name})`;
  const piece = (slot: Slot) =>
    `fl-rig-piece${active === slot ? " is-active" : ""}`;
  return (
    <svg
      className={
        mobile
          ? "fl-rig-art fl-rig-art-mobile"
          : "fl-rig-art fl-rig-art-desktop"
      }
      viewBox={mobile ? "0 0 420 840" : "0 0 1000 620"}
      data-active={active || ""}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${id}-blank`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
          gradientUnits="objectBoundingBox"
        >
          <stop stopColor="#8c9eae" />
          <stop offset=".2" stopColor="#354b5f" />
          <stop offset=".6" stopColor="#172535" />
          <stop offset="1" stopColor="#587186" />
        </linearGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#eff5fa" />
          <stop offset=".2" stopColor="#9badbc" />
          <stop offset=".45" stopColor="#e1ebf3" />
          <stop offset=".7" stopColor="#596f82" />
          <stop offset="1" stopColor="#b7c9d7" />
        </linearGradient>
        <linearGradient id={`${id}-grip`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#465869" />
          <stop offset=".45" stopColor="#273645" />
          <stop offset="1" stopColor="#111c28" />
        </linearGradient>
        <linearGradient id={`${id}-lure`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#466880" />
          <stop offset=".45" stopColor="#52a5dc" />
          <stop offset=".55" stopColor="#cce6f5" />
          <stop offset="1" stopColor="#f2f7fb" />
        </linearGradient>
        <pattern
          id={`${id}-carbon`}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="m0 0 6 6M-3 3l6 6M3-3l6 6"
            stroke="#a6bbc7"
            strokeOpacity=".15"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <g className="fl-rig-leads" fill="none" strokeWidth="1">
        {Object.entries(
          mobile
            ? {
                rod: "M88 410 179 100h41",
                reel: "m113 618 60 60h47",
                mainLine: "m126 233 68 16h26",
                leaderLine: "M160 384h60",
                lure: "M165 516h55",
              }
            : {
                rod: "M458 287 285 136H215",
                reel: "M370 400H275l-28 20h-50",
                mainLine: "m644 153 84-37h46",
                leaderLine: "M775 352h44",
                lure: "m783 462-45 74h-32",
              },
        ).map(([slot, path]) => (
          <path
            key={slot}
            d={path}
            className={`fl-rig-lead${active === slot ? " is-active" : ""}`}
          />
        ))}
      </g>
      <g
        transform={
          mobile
            ? "translate(76 745) rotate(-88) scale(.97)"
            : "translate(235 445) rotate(-36)"
        }
      >
        <g className={piece("rod")}>
          <path
            d="M0-8 145-6 610-1.3v2.6L145 6 0 8Z"
            fill={fill("blank")}
            stroke="#192c3e"
            strokeWidth=".7"
          />
          <path d="M145-6 610-1.3v2.6L145 6Z" fill={fill("carbon")} />
          <path
            d="m148-4.5 454 3.6"
            stroke="#bed1de"
            strokeOpacity=".55"
            strokeWidth=".7"
          />
          <rect
            x="0"
            y="-11"
            width="61"
            height="22"
            rx="6"
            fill={fill("grip")}
            stroke="#172638"
          />
          <path
            d="M6-9v18M13-9v18M20-9v18M27-9v18M34-9v18M41-9v18M48-9v18M55-9v18"
            stroke="#7d96a9"
            strokeOpacity=".18"
          />
          <rect
            x="-3"
            y="-10"
            width="7"
            height="20"
            rx="2"
            fill={fill("metal")}
          />
          <rect
            x="75"
            y="-8"
            width="43"
            height="16"
            rx="3"
            fill={fill("grip")}
          />
          <path
            d="M78-8v16M83-8v16M110-8v16M115-8v16"
            stroke="#758b9c"
            strokeWidth="1.5"
          />
          <rect
            x="120"
            y="-8"
            width="34"
            height="16"
            rx="4"
            fill={fill("grip")}
          />
          <rect
            x="160"
            y="-5.5"
            width="16"
            height="11"
            rx="1"
            fill={fill("metal")}
          />
          <path d="M182-5v10M187-5v10" stroke="#278de5" strokeWidth="2" />
          <g fill="none" stroke={fill("metal")} strokeWidth="1.7">
            {[210, 330, 435, 525, 586].map((x, i) => (
              <g key={x}>
                <path d={`M${x - 8} ${-5 + i * 0.6}l8-10 8 10`} />
                <ellipse
                  cx={x}
                  cy={-14 + i}
                  rx={6 - i * 0.7}
                  ry={8 - i * 0.9}
                />
              </g>
            ))}
          </g>
        </g>
        <g className={piece("reel")}>
          <path
            d="M101 7h13l25 41-7 6-25-33Z"
            fill={fill("metal")}
            stroke="#667f94"
          />
          <path
            d="M114 49 99 40 86 44"
            fill="none"
            stroke="#879eaf"
            strokeWidth="5"
          />
          <rect
            x="74"
            y="38"
            width="17"
            height="13"
            rx="5"
            fill={fill("grip")}
            stroke="#7c93a5"
          />
          <path
            d="M128 36c-18 2-21 28-9 37l25 3 17-16-9-19Z"
            fill={fill("blank")}
            stroke="#869bab"
          />
          <circle
            cx="137"
            cy="56"
            r="15"
            fill={fill("grip")}
            stroke="#9eb3c3"
            strokeWidth="1.5"
          />
          <circle cx="137" cy="56" r="8" fill={fill("metal")} />
          <circle cx="137" cy="56" r="4" fill="#278de5" />
          <path d="M150 45h30v18h-30Z" fill={fill("metal")} stroke="#849dab" />
          <ellipse
            cx="180"
            cy="54"
            rx="8"
            ry="12"
            fill={fill("grip")}
            stroke="#c4d6e3"
            strokeWidth="2"
          />
          <path
            d="M150 48h23m-23 4h25m-25 4h25m-25 4h23"
            stroke="#59aaa9"
            strokeWidth="2"
          />
          <path
            d="M135 39c-6-28 38-31 50-2l2 26"
            fill="none"
            stroke="#c7d5df"
            strokeWidth="2.5"
          />
          <path d="M148 35h29" stroke="#278de5" strokeWidth="2" />
        </g>
        <path
          className={piece("mainLine")}
          d="m175 46 35-60 120 1 105 1 90 1 61 1 25 5"
          fill="none"
          stroke="#51a6a4"
          strokeWidth="1.1"
        />
      </g>
      <g className={piece("mainLine")}>
        <path
          d={mobile ? "M97 154Q147 227 160 377" : "M727 85Q775 210 777 345"}
          fill="none"
          stroke="#51a6a4"
          strokeWidth="1.2"
        />
      </g>
      <g className={piece("leaderLine")}>
        <path
          d={mobile ? "M160 384v112" : "M777 352v79"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeOpacity=".6"
        />
        <g
          transform={mobile ? "translate(160 379)" : "translate(777 347)"}
          fill="none"
          stroke="#51a6a4"
          strokeWidth="1.5"
        >
          <path d="m-3-3 6 6m-6-3 6 6m-6-3 6 6" />
        </g>
      </g>
      <g
        className={piece("lure")}
        transform={
          mobile
            ? "translate(160 499) rotate(12)"
            : "translate(777 433) rotate(12)"
        }
      >
        <circle cy="-2" r="3" fill="none" stroke="#9ab2c3" />
        <path
          d="M0 1c-14 11-14 36-7 52l7 9 7-9C14 37 14 12 0 1Z"
          fill={fill("lure")}
          stroke="#7698b0"
          strokeWidth=".8"
        />
        <path
          d="M0 12c-5 13-6 27-3 36"
          fill="none"
          stroke="#fff"
          strokeOpacity=".6"
        />
        <circle cx="3" cy="10" r="2" fill="#1b344b" />
        <path
          d="M0 62v7l-7 8m7-8 7 8M-7 77v7c0 6 7 7 7 0m7-7v7c0 6-7 7-7 0"
          fill="none"
          stroke="#8da5b6"
          strokeWidth="1.8"
        />
      </g>
      <g
        className="fl-rig-anchor"
        fill="var(--fl-surface)"
        stroke="var(--fl-blue)"
        strokeWidth="1.5"
      >
        {Object.entries(
          mobile
            ? {
                rod: [88, 410],
                reel: [113, 618],
                mainLine: [126, 233],
                leaderLine: [160, 384],
                lure: [165, 516],
              }
            : {
                rod: [458, 287],
                reel: [370, 400],
                mainLine: [644, 153],
                leaderLine: [775, 352],
                lure: [783, 462],
              },
        ).map(([slot, [x, y]]) => (
          <g
            key={slot}
            className={`fl-rig-target${active === slot ? " is-active" : ""}`}
          >
            <circle cx={x} cy={y} r="4" />
            <circle
              className="fl-rig-target-ring"
              cx={x}
              cy={y}
              r="11"
              fill="none"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
