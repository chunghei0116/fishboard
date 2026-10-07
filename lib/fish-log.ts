import type { Catch, Species, SpeciesSummary } from "@/data/types";
export function summarizeSpecies(
  species: Species[],
  catches: Catch[],
): SpeciesSummary[] {
  return species
    .map((s) => {
      const records = catches.filter((c) => c.speciesId === s.id);
      const lengths = records.flatMap((c) =>
        c.length && c.length > 0 ? [c.length] : [],
      );
      return {
        ...s,
        totalCaught: records.length,
        bestLength: lengths.length ? Math.max(...lengths) : undefined,
        firstCaughtDate: records.map((c) => c.date).sort()[0],
      };
    })
    .filter((s) => s.totalCaught > 0);
}
export function sortCatches(catches: Catch[]) {
  return [...catches].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.time || "").localeCompare(a.time || "") ||
      a.id.localeCompare(b.id),
  );
}
export function filterCatches(
  catches: Catch[],
  filters: { species?: string; location?: string; year?: string },
) {
  return sortCatches(
    catches.filter(
      (c) =>
        (!filters.species || c.speciesId === filters.species) &&
        (!filters.location || c.location === filters.location) &&
        (!filters.year || c.date.startsWith(filters.year + "-")),
    ),
  );
}
export function validateCatch(
  input: Record<string, unknown>,
): Omit<Catch, "id"> {
  const string = (key: string, max: number, required = false) => {
    const value = input[key];
    if (value === undefined || value === "") {
      if (required) throw Error("請填寫 " + key);
      return undefined;
    }
    if (typeof value !== "string" || value.length > max)
      throw Error(key + " 格式無效");
    return value.trim();
  };
  const speciesId = string("speciesId", 100, true)!,
    date = string("date", 10, true)!,
    location = string("location", 160, true)!;
  if (!/^[\w-]+$/.test(speciesId)) throw Error("魚種無效");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw Error("日期無效");
  const time = string("time", 5);
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error("時間無效");
  const period = string("period", 10);
  if (period && !["morning", "evening"].includes(period))
    throw Error("時段無效");
  const number = (key: string, min: number, max: number) => {
    const v = input[key];
    if (v === undefined || v === "") return undefined;
    if (typeof v !== "number" || !Number.isFinite(v) || v <= min || v > max)
      throw Error(key + " 數值無效");
    return v;
  };
  const length = number("length", 0, 1000),
    weight = number("weight", 0, 1000000);
  const coordinate = (key: string, limit: number) => {
    const v = input[key];
    if (v === undefined) return undefined;
    if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > limit)
      throw Error("座標無效");
    return v;
  };
  const latitude = coordinate("latitude", 90),
    longitude = coordinate("longitude", 180);
  if ((latitude === undefined) !== (longitude === undefined))
    throw Error("請同時填寫緯度及經度");
  return {
    speciesId,
    date,
    time,
    period: period as Catch["period"],
    location,
    length,
    weight,
    latitude,
    longitude,
    rod: string("rod", 160),
    reel: string("reel", 160),
    line: string("line", 160),
    lure: string("lure", 160),
    note: string("note", 4000),
  };
}

export function validateSpeciesNames(input: Record<string, unknown>) {
  const chineseName =
    typeof input.chineseName === "string" ? input.chineseName.trim() : "";
  const englishName =
    typeof input.englishName === "string" ? input.englishName.trim() : "";
  if (
    (!chineseName && !englishName) ||
    chineseName.length > 80 ||
    englishName.length > 100
  )
    throw Error("請填寫中文或英文魚名，至少一個。");
  return { chineseName, englishName };
}
export function speciesName(species: Species) {
  return species.chineseName || species.englishName;
}
export function catchTimeLabel(record: Pick<Catch, "period" | "time">) {
  return record.period === "morning"
    ? "早上"
    : record.period === "evening"
      ? "晚上"
      : record.time;
}
