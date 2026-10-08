import type { GearProfile } from "@/data/types";
export const gearSlots = [
  { key: "rod", label: "釣竿", name: "釣竿" },
  { key: "reel", label: "魚輪", name: "魚輪" },
  { key: "mainLine", label: "主線", name: "主線" },
  { key: "leaderLine", label: "前導線", name: "前導線" },
  { key: "lure", label: "擬餌／魚餌", name: "擬餌／魚餌" },
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

/** Compare values as they are stored: absent slots and whitespace are not changes. */
export function gearChanged(draft: GearProfile, saved: GearProfile): boolean {
  return ["name", ...gearSlots.map((slot) => slot.key)].some(
    (key) =>
      (draft[key as keyof GearProfile] || "").trim() !==
      (saved[key as keyof GearProfile] || "").trim(),
  );
}
