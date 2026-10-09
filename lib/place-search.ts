import proj4 from "proj4";

export type Place = {
  id: string;
  name: string;
  englishName: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
};

// Lands Department 7P_ITRF96_HK80_V1.0; proj4 uses position-vector
// rotations, opposite to the official coordinate-frame rotation signs.
const HK_GRID =
  "+proj=tmerc +lat_0=22.3121333333333 +lon_0=114.178555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.243648,-1.158828,-1.094246 +units=m +no_defs";
export function gridToWgs84(x: number, y: number) {
  const [longitude, latitude] = proj4(HK_GRID, "EPSG:4326", [x, y]);
  return { latitude, longitude };
}
const text = (v: unknown) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, 160) : "";
export function normalizePlaces(raw: unknown): Place[] {
  if (!Array.isArray(raw)) throw new Error("Invalid place response");
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const entry of raw.slice(0, 500)) {
    if (!entry || typeof entry !== "object") continue;
    const name = text(entry.nameZH) || text(entry.nameEN);
    const { x, y } = entry;
    if (
      !name ||
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 799500 ||
      x > 867500 ||
      y < 799000 ||
      y > 848000
    )
      continue;
    const id = `${name}:${x}:${y}`;
    if (seen.has(id)) continue;
    seen.add(id);
    places.push({
      id,
      name,
      englishName: text(entry.nameEN),
      address: text(entry.addressZH) || text(entry.addressEN),
      district: text(entry.districtZH) || text(entry.districtEN),
      ...gridToWgs84(x, y),
    });
    if (places.length === 8) break;
  }
  return places;
}

export class PlaceSearchError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function placeQuery(value: string) {
  const q = value.trim().replace(/\s+/g, " ");
  if (q.length < 2 || q.length > 160)
    throw new PlaceSearchError("請輸入 2 至 160 個字搜尋地點。", 400);
  return q;
}

// These safeguards are ours, not a published government quota. All maps
// are bounded, per server instance; they are not a global distributed limit.
export function createPlaceSearch(
  fetcher: typeof fetch = fetch,
  now = Date.now,
) {
  const cache = new Map<string, { until: number; places: Place[] }>();
  const users = new Map<string, number[]>();
  const pending = new Map<string, Promise<Place[]>>();
  return async (user: string, value: string) => {
    const q = placeQuery(value),
      key = q.toLocaleLowerCase("en"),
      time = now();
    const hits = (users.get(user) || []).filter((t) => time - t < 60_000);
    if (
      hits.length >= 30 ||
      (hits.length && time - hits[hits.length - 1] < 500)
    )
      throw new PlaceSearchError("搜尋太頻密，請稍等再輸入。", 429);
    users.delete(user);
    users.set(user, [...hits, time]);
    if (users.size > 512) users.delete(users.keys().next().value!);
    const saved = cache.get(key);
    if (saved && saved.until > time) return saved.places;
    const ongoing = pending.get(key);
    if (ongoing) return ongoing;
    if (pending.size >= 16)
      throw new PlaceSearchError("地點搜尋繁忙，可直接輸入地點。", 503);
    const task = (async () => {
      try {
        const url = new URL(
          "https://www.map.gov.hk/gs/api/v1.0.0/locationSearch",
        );
        url.searchParams.set("q", q);
        const response = await fetcher(url, {
          signal: AbortSignal.timeout(6000),
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Place provider unavailable");
        const places = normalizePlaces(await response.json());
        cache.delete(key);
        cache.set(key, { until: now() + 86_400_000, places });
        if (cache.size > 256) cache.delete(cache.keys().next().value!);
        return places;
      } catch {
        throw new PlaceSearchError("暫時未能搜尋，可直接輸入地點。", 503);
      } finally {
        pending.delete(key);
      }
    })();
    pending.set(key, task);
    return task;
  };
}
