import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const url = (source) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  ).toString("base64");
const env = url(
  `export class FishlogError extends Error{constructor(message,status=400){super(message);this.status=status}};export function settings(){return globalThis.__v3.env};export function generationConfigured(e){return e.GENERATION_ENABLED==='true'&&!!(e.AI||(e.CLOUDFLARE_ACCOUNT_ID&&e.CLOUDFLARE_AI_TOKEN))};export function fail(e){return Response.json({error:e.message},{status:e.status||503})}`,
);
const security = url(
  await readFile(
    new URL("../lib/fishlog-security.ts", import.meta.url),
    "utf8",
  ),
);
const validation = url(
  await readFile(new URL("../lib/fish-log.ts", import.meta.url), "utf8"),
);
const gearValidation = url(
  await readFile(new URL("../lib/gear.ts", import.meta.url), "utf8"),
);
const apiCodec = await import(security);
const auth = url(
  `import {FishlogError} from '${env}';export async function privateUser(){if(!globalThis.__v3.uid)throw new FishlogError('login',401);return {uid:globalThis.__v3.uid}};export function mutationOrigin(r){if(r.headers.get('origin')!=='https://fish.test')throw new FishlogError('origin',403)}`,
);
const db = url(
  `export async function listDocuments(uid,col){globalThis.__v3.calls.push(['list',uid,col]);return globalThis.__v3.lists?.[col]||[]};export async function getDocument(uid,col,id){globalThis.__v3.calls.push(['get',uid,col,id]);return globalThis.__v3.documents[col+'/'+id]||null};export async function claimRequest(uid,id){globalThis.__v3.calls.push(['claim',uid,id]);return globalThis.__v3.previous};export function documentPath(uid,col,id){return 'users/'+uid+'/'+col+'/'+id};export function write(uid,col,id,value){return {uid,col,id,value}};export async function commit(writes){globalThis.__v3.calls.push(['commit',writes]);if(globalThis.__v3.failCommit&&writes.some(w=>w.col==='catches'||w.delete))throw Error('ambiguous commit');return {}}`,
);
const storage = url(
  `export function cloudinaryConfigured(){return true};export async function uploadImage(env,file,id){globalThis.__v3.calls.push(['upload',id]);if(globalThis.__v3.failBadge&&id.endsWith('/badge'))throw Error('upload');return 'cloudinary:test/'+id+'.png'};export async function removeImage(env,ref){globalThis.__v3.calls.push(['remove',ref]);if(globalThis.__v3.failRemove)throw Error('cleanup')};export async function readImage(){globalThis.__v3.calls.push(['read']);return new Response('image',{headers:{'content-type':'image/png'}})}`,
);
const generation = url(
  `export function pngFile(){};export async function generateFish(){globalThis.__v3.calls.push(['generate']);return {image:new Blob(['fish'],{type:'image/png'}),model:'model'}}`,
);
const replacements = {
  "@/lib/fishlog-env": env,
  "@/lib/firebase-auth": auth,
  "@/lib/firestore": db,
  "@/lib/cloudinary": storage,
  "@/lib/fishlog-security": security,
  "@/lib/fish-generation": generation,
  "@/lib/fish-log": validation,
  "@/lib/gear": gearValidation,
};
async function load(path) {
  let src = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [key, value] of Object.entries(replacements))
    src = src.replaceAll(key, value);
  return import(url(src));
}
const deletion = await load("../app/api/fishlog/catches/[id]/route.ts"),
  gear = await load("../app/api/gear/route.ts");
const route = await load("../app/api/fishlog/route.ts"),
  media = await load("../app/api/media/[id]/route.ts");
function reset() {
  globalThis.__v3 = {
    uid: "owner-a",
    env: { AI: {}, GENERATION_ENABLED: "true" },
    documents: { "species/known": { value: { id: "known" } } },
    previous: null,
    calls: [],
  };
}
reset();
afterEach(reset);
function request({
  newSpecies = false,
  photo = false,
  chineseName = "新魚",
  englishName = "New fish",
  period,
  location = "Harbour",
  latitude,
  longitude,
} = {}) {
  const f = new FormData();
  f.set("requestId", "unique-request");
  f.set("speciesId", newSpecies ? "new" : "known");
  f.set("date", "2026-10-06");
  f.set("location", location);
  if (latitude !== undefined) f.set("latitude", String(latitude));
  if (longitude !== undefined) f.set("longitude", String(longitude));
  if (newSpecies) {
    f.set("chineseName", chineseName);
    f.set("englishName", englishName);
    f.set("pixel", new File(["png"], "pixel.png", { type: "image/png" }));
  }
  if (period) f.set("period", period);
  if (photo)
    f.set(
      "photo",
      new File(
        [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
        "photo.png",
        { type: "image/png" },
      ),
    );
  return new Request("https://fish.test/api/fishlog", {
    method: "POST",
    body: f,
    headers: { origin: "https://fish.test" },
  });
}
test("private dataset rejects anonymous users and uses authenticated uid", async () => {
  globalThis.__v3.uid = null;
  assert.equal((await route.GET()).status, 401);
  assert.equal(globalThis.__v3.calls.length, 0);
  globalThis.__v3.uid = "owner-a";
  assert.equal((await route.GET()).status, 200);
  assert.ok(globalThis.__v3.calls.every((c) => c[1] === "owner-a"));
});
test("image lookup is scoped to uid before storage and cannot read another owner", async () => {
  const response = await media.GET(
    new Request("https://fish.test/api/media/other?kind=pixel"),
    { params: Promise.resolve({ id: "other" }) },
  );
  assert.equal(response.status, 404);
  assert.deepEqual(globalThis.__v3.calls, [
    ["get", "owner-a", "species", "other"],
  ]);
});
test("known species saves catch without generating a second fish", async () => {
  assert.equal((await route.POST(request())).status, 201);
  assert.equal(
    globalThis.__v3.calls.filter((c) => c[0] === "generate").length,
    0,
  );
  const writes = globalThis.__v3.calls.find((c) => c[0] === "commit")[1];
  assert.equal(writes.filter((w) => w.col === "species").length, 0);
  assert.equal(writes[0].uid, "owner-a");
});
test("successful request replay does not upload or generate again", async () => {
  globalThis.__v3.previous = { status: "succeeded" };
  assert.equal(
    (await route.POST(request({ newSpecies: true, photo: true }))).status,
    200,
  );
  assert.ok(
    !globalThis.__v3.calls.some(
      (c) => c[0] === "upload" || c[0] === "generate",
    ),
  );
});
test("failed badge upload removes only newly uploaded original", async () => {
  globalThis.__v3.failBadge = true;
  assert.equal(
    (await route.POST(request({ newSpecies: true, photo: true }))).status,
    503,
  );
  assert.equal(
    globalThis.__v3.calls.filter((c) => c[0] === "remove").length,
    1,
  );
});
test("uncertain database commit preserves assets and records uncertain state", async () => {
  globalThis.__v3.failCommit = true;
  assert.equal(
    (await route.POST(request({ newSpecies: true, photo: true }))).status,
    503,
  );
  assert.equal(
    globalThis.__v3.calls.filter((c) => c[0] === "remove").length,
    0,
  );
  assert.ok(
    globalThis.__v3.calls.some(
      (c) =>
        c[0] === "commit" && c[1].some((w) => w.value.status === "uncertain"),
    ),
  );
});

test("new species accepts a single name and catch keeps selected period", async () => {
  assert.equal(
    (
      await route.POST(
        request({
          newSpecies: true,
          chineseName: "",
          englishName: "Seabream",
          period: "evening",
        }),
      )
    ).status,
    201,
  );
  const writes = globalThis.__v3.calls
    .filter((c) => c[0] === "commit")
    .flatMap((c) => c[1]);
  assert.equal(
    writes.find((w) => w.col === "species").value.englishName,
    "Seabream",
  );
  assert.equal(writes.find((w) => w.col === "species").value.chineseName, "");
  assert.equal(writes.find((w) => w.col === "catches").value.period, "evening");
});
test("empty fish names reject before upload or generation", async () => {
  assert.equal(
    (
      await route.POST(
        request({ newSpecies: true, chineseName: " ", englishName: "" }),
      )
    ).status,
    400,
  );
  assert.ok(
    !globalThis.__v3.calls.some((c) =>
      ["upload", "generate", "claim"].includes(c[0]),
    ),
  );
});
function deleteRequest(origin = "https://fish.test") {
  return new Request("https://fish.test/api/fishlog/catches/own", {
    method: "DELETE",
    headers: { origin },
  });
}
const deleteParams = { params: Promise.resolve({ id: "own" }) };
function ownCatch() {
  globalThis.__v3.documents["catches/own"] = {
    value: { id: "own", speciesId: "known", photo: "cloudinary:test/own.png" },
    updateTime: "revision-1",
  };
}
test("delete requires login and same origin, and does not access storage", async () => {
  globalThis.__v3.uid = null;
  assert.equal(
    (await deletion.DELETE(deleteRequest(), deleteParams)).status,
    401,
  );
  globalThis.__v3.uid = "owner-a";
  assert.equal(
    (await deletion.DELETE(deleteRequest("https://other.test"), deleteParams))
      .status,
    403,
  );
  assert.equal(globalThis.__v3.calls.length, 0);
});
test("delete cannot discover or delete another user's catch", async () => {
  assert.equal(
    (await deletion.DELETE(deleteRequest(), deleteParams)).status,
    404,
  );
  assert.ok(
    globalThis.__v3.calls.every((c) => c[0] === "get" && c[1] === "owner-a"),
  );
});
test("delete atomically removes owned catch with revision guard and keeps shared species", async () => {
  ownCatch();
  const response = await deletion.DELETE(deleteRequest(), deleteParams);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    deleted: true,
    cleanupPending: false,
  });
  const writes = globalThis.__v3.calls
    .filter((c) => c[0] === "commit")
    .flatMap((c) => c[1]);
  assert.deepEqual(writes[0], {
    delete: "users/owner-a/catches/own",
    currentDocument: { updateTime: "revision-1" },
  });
  assert.ok(!writes.some((w) => w.col === "species"));
  assert.equal(writes.at(-1).value.status, "deleted");
  assert.deepEqual(
    globalThis.__v3.calls.find((c) => c[0] === "remove"),
    ["remove", "cloudinary:test/own.png"],
  );
});
test("failed delete commit retains the original photo", async () => {
  ownCatch();
  globalThis.__v3.failCommit = true;
  assert.equal(
    (await deletion.DELETE(deleteRequest(), deleteParams)).status,
    503,
  );
  assert.ok(!globalThis.__v3.calls.some((c) => c[0] === "remove"));
});
test("photo cleanup failure retains a retryable tombstone and duplicate delete retries safely", async () => {
  ownCatch();
  globalThis.__v3.failRemove = true;
  const response = await deletion.DELETE(deleteRequest(), deleteParams);
  assert.equal((await response.json()).cleanupPending, true);
  const tombstone = globalThis.__v3.calls
    .filter((c) => c[0] === "commit")
    .at(-1)[1][0].value;
  delete globalThis.__v3.documents["catches/own"];
  globalThis.__v3.documents["requests/own"] = { value: tombstone };
  globalThis.__v3.failRemove = false;
  globalThis.__v3.calls = [];
  const replay = await deletion.DELETE(deleteRequest(), deleteParams);
  assert.deepEqual(await replay.json(), {
    deleted: true,
    cleanupPending: false,
  });
  assert.ok(
    !globalThis.__v3.calls
      .filter((c) => c[0] === "commit")
      .flatMap((c) => c[1])
      .some((w) => w.delete),
  );
});
function gearRequest(profile, origin = "https://fish.test") {
  return new Request("https://fish.test/api/gear", {
    method: "PUT",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(profile),
  });
}
test("gear saves only validated equipment under the authenticated profile", async () => {
  assert.equal(
    (
      await gear.PUT(
        gearRequest({
          name: " Shore kit ",
          rod: "Light rod",
          mainLine: "PE 0.8",
          leaderLine: "8 lb",
          uid: "other",
        }),
      )
    ).status,
    200,
  );
  assert.deepEqual(globalThis.__v3.calls[0][1][0], {
    uid: "owner-a",
    col: "profiles",
    id: "gear",
    value: {
      name: "Shore kit",
      rod: "Light rod",
      mainLine: "PE 0.8",
      leaderLine: "8 lb",
    },
  });
});
test("gear rejects anonymous, cross-origin and invalid data before writes", async () => {
  globalThis.__v3.uid = null;
  assert.equal((await gear.PUT(gearRequest({ name: "Kit" }))).status, 401);
  globalThis.__v3.uid = "owner-a";
  assert.equal(
    (await gear.PUT(gearRequest({ name: "Kit" }, "https://other.test"))).status,
    403,
  );
  assert.equal((await gear.PUT(gearRequest({ name: " " }))).status, 400);
  assert.equal(
    (await gear.PUT(gearRequest({ name: "Kit", rod: 5 }))).status,
    400,
  );
  assert.equal(
    (await gear.PUT(gearRequest({ name: "Kit", lure: "x".repeat(4100) })))
      .status,
    413,
  );
  assert.equal(globalThis.__v3.calls.length, 0);
});
test("dataset includes the personal loadout", async () => {
  globalThis.__v3.documents["profiles/gear"] = {
    value: { name: "Shore", mainLine: "PE 1" },
  };
  assert.deepEqual((await (await route.GET()).json()).gear, {
    name: "Shore",
    mainLine: "PE 1",
  });
});
test("catch stores main line, leader and loadout name as a historical snapshot", async () => {
  const source = request(),
    form = await source.formData();
  form.set("line", "PE 0.8");
  form.set("leaderLine", "8 lb");
  form.set("gearName", "Shore");
  const response = await route.POST(
    new Request(source.url, {
      method: "POST",
      headers: { origin: "https://fish.test" },
      body: form,
    }),
  );
  assert.equal(response.status, 201);
  const record = globalThis.__v3.calls
    .find((c) => c[0] === "commit")[1]
    .find((w) => w.col === "catches").value;
  assert.equal(record.line, "PE 0.8");
  assert.equal(record.leaderLine, "8 lb");
  assert.equal(record.gearName, "Shore");
});

test("selected location coordinates reach Firestore writes and return in the map dataset", async () => {
  const location = "長沙灣海濱花園",
    latitude = 22.327497,
    longitude = 114.147635;
  assert.equal(
    (await route.POST(request({ location, latitude, longitude }))).status,
    201,
  );
  const writes = globalThis.__v3.calls
    .filter((c) => c[0] === "commit")
    .flatMap((c) => c[1]);
  const saved = writes.find((w) => w.col === "catches");
  assert.equal(saved.uid, "owner-a");
  assert.equal(saved.value.location, location);
  assert.equal(saved.value.latitude, latitude);
  assert.equal(saved.value.longitude, longitude);
  const persisted = apiCodec.decodeFields(apiCodec.encodeFields(saved.value));
  globalThis.__v3.lists = { catches: [persisted] };
  const response = await route.GET();
  assert.equal(response.status, 200);
  const dataset = await response.json();
  assert.equal(dataset.catches[0].latitude, latitude);
  assert.equal(dataset.catches[0].longitude, longitude);
  assert.equal(dataset.catches[0].location, location);
});
