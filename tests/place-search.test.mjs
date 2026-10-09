import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = ts
  .transpileModule(
    await readFile(new URL("../lib/place-search.ts", import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    },
  )
  .outputText.replace('from "proj4"', `from "${import.meta.resolve("proj4")}"`);
const { gridToWgs84, normalizePlaces, placeQuery, createPlaceSearch } =
  await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
const row = {
  nameZH: "香港文化中心",
  nameEN: "HONG KONG CULTURAL CENTRE",
  addressZH: "梳士巴利道  10號",
  districtZH: "油尖旺區",
  x: 835599,
  y: 817190,
};
test("HK grid conversion agrees with the official transformation manual example", () => {
  const point = gridToWgs84(832591.32, 820359.389);
  assert.ok(Math.abs(point.latitude - 22.322244329) < 0.000001);
  assert.ok(Math.abs(point.longitude - 114.141187898) < 0.000001);
});
test("suggestions reject malformed coordinates, deduplicate and retain bilingual places", () => {
  const places = normalizePlaces([
    null,
    {},
    row,
    row,
    { ...row, x: NaN },
    { ...row, y: 22.3 },
    { ...row, nameZH: "", nameEN: "Pier" },
  ]);
  assert.equal(places.length, 2);
  assert.equal(places[0].address, "梳士巴利道 10號");
  assert.equal(places[1].name, "Pier");
  assert.ok(places[0].latitude > 22 && places[0].latitude < 23);
  assert.ok(places[0].longitude > 113 && places[0].longitude < 115);
  assert.equal(
    normalizePlaces(
      Array.from({ length: 20 }, (_, n) => ({ ...row, nameZH: `地點${n}` })),
    ).length,
    8,
  );
  assert.throws(() => normalizePlaces({ results: [] }));
});
test("query normalization bounds input and preserves Chinese", () => {
  assert.equal(placeQuery(" 長沙灣  碼頭 "), "長沙灣 碼頭");
  assert.throws(() => placeQuery("a"), { status: 400 });
  assert.throws(() => placeQuery("a".repeat(161)), { status: 400 });
});
test("shared cache and in-flight requests avoid repeated upstream calls and expire", async () => {
  let calls = 0,
    time = 1000,
    release;
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  const search = createPlaceSearch(
    async (url) => {
      calls++;
      assert.equal(url.hostname, "www.map.gov.hk");
      await wait;
      return Response.json([row]);
    },
    () => time,
  );
  const a = search("a", " 長沙灣 "),
    b = search("b", "長沙灣");
  release();
  assert.deepEqual(await a, await b);
  assert.equal(calls, 1);
  time += 1000;
  await search("a", "長沙灣");
  assert.equal(calls, 1);
  time += 86_400_001;
  await search("a", "長沙灣");
  assert.equal(calls, 2);
});
test("app throttling is per user and resets after a minute", async () => {
  let time = 1000;
  const search = createPlaceSearch(
    async () => Response.json([row]),
    () => time,
  );
  await search("a", "長沙灣");
  await assert.rejects(search("a", "石澳"), { status: 429 });
  await search("b", "石澳");
  for (let n = 1; n < 30; n++) {
    time += 600;
    await search("a", "長沙灣");
  }
  time += 600;
  await assert.rejects(search("a", "長沙灣"), { status: 429 });
  time += 60_001;
  await search("a", "長沙灣");
});
test("provider failures and malformed payloads do not poison the cache", async () => {
  let calls = 0,
    time = 1000;
  const search = createPlaceSearch(
    async () => {
      calls++;
      return calls === 1
        ? Response.json({}, { status: 500 })
        : calls === 2
          ? Response.json({})
          : Response.json([row]);
    },
    () => time,
  );
  await assert.rejects(search("a", "長沙灣"), { status: 503 });
  time += 1000;
  await assert.rejects(search("a", "長沙灣"), { status: 503 });
  time += 1000;
  assert.equal((await search("a", "長沙灣")).length, 1);
  assert.equal(calls, 3);
});

const asModule = (src) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  ).toString("base64");
const authModule = asModule(
  `export async function privateUser(){if(!globalThis.placeTestUser)throw {status:401};return {uid:globalThis.placeTestUser}}`,
);
const failModule = asModule(
  `export function fail(e){return Response.json({error:'login'},{status:e.status||503})}`,
);
const serviceModule = asModule(
  `export class PlaceSearchError extends Error {constructor(message,status){super(message);this.status=status}};export function createPlaceSearch(){return async(uid,q)=>{globalThis.placeTestCalls.push({uid,q});if(q==='bad')throw new PlaceSearchError('bad query',400);if(q==='fast')throw new PlaceSearchError('slow down',429);return []}}`,
);
const routeSource = (
  await readFile(new URL("../app/api/places/route.ts", import.meta.url), "utf8")
)
  .replace("@/lib/firebase-auth", authModule)
  .replace("@/lib/fishlog-env", failModule)
  .replace("@/lib/place-search", serviceModule);
const { GET } = await import(asModule(routeSource));
test("place endpoint requires login before any upstream search and uses verified identity", async () => {
  globalThis.placeTestCalls = [];
  globalThis.placeTestUser = null;
  const anonymous = await GET(
    new Request("https://fish.test/api/places?q=石澳&uid=forged"),
  );
  assert.equal(anonymous.status, 401);
  assert.equal(globalThis.placeTestCalls.length, 0);
  globalThis.placeTestUser = "verified-owner";
  const response = await GET(
    new Request("https://fish.test/api/places?q=石澳&uid=forged"),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(globalThis.placeTestCalls, [
    { uid: "verified-owner", q: "石澳" },
  ]);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
test("place endpoint exposes bounded validation and retry statuses", async () => {
  globalThis.placeTestUser = "verified-owner";
  const bad = await GET(new Request("https://fish.test/api/places?q=bad"));
  assert.equal(bad.status, 400);
  const fast = await GET(new Request("https://fish.test/api/places?q=fast"));
  assert.equal(fast.status, 429);
  assert.equal(fast.headers.get("retry-after"), "60");
});
