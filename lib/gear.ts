import type { GearProfile } from "@/data/types";
export const gearSlots = [
  { key: "rod", label: "ROD", name: "Fishing rod" },
  { key: "reel", label: "REEL", name: "Reel" },
  { key: "mainLine", label: "MAIN LINE", name: "Main Line" },
  { key: "leaderLine", label: "LEADER LINE", name: "Leader Line" },
  { key: "lure", label: "LURE / BAIT", name: "Lure / Bait" },
] as const;
export function validateGear(input: Record<string, unknown>): GearProfile {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 80) throw Error("請填寫 80 字以內的裝備名稱。");
  const result: GearProfile = { name };
  for (const { key, name: label } of gearSlots) {
    const value = input[key];
    if (value !== undefined && typeof value !== "string")
      throw Error(label + " 格式無效。");
    if (typeof value === "string") {
      if (value.length > 160) throw Error(label + " 請使用 160 字以內。");
      result[key] = value.trim();
    }
  }
  return result;
}
