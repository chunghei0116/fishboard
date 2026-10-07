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
const auth = url(
  `import {FishlogError} from '${env}';export async function privateUser(){if(!globalThis.__v3.uid)throw new FishlogError('login',401);return {uid:globalThis.__v3.uid}};export function mutationOrigin(r){if(r.headers.get('origin')!=='https://fish.test')throw new FishlogError('origin',403)}`,
);
const db = url(
  `export async function listDocuments(uid,col){globalThis.__v3.calls.push(['list',uid,col]);return []};export async function getDocument(uid,col,id){globalThis.__v3.calls.push(['get',uid,col,id]);return globalThis.__v3.documents[col+'/'+id]||null};export async function claimRequest(uid,id){globalThis.__v3.calls.push(['claim',uid,id]);return globalThis.__v3.previous};export function write(uid,col,id,value){return {uid,col,id,value}};export async function commit(writes){globalThis.__v3.calls.push(['commit',writes]);if(globalThis.__v3.failCommit&&writes.some(w=>w.col==='catches'))throw Error('ambiguous commit');return {}}`,
);
const storage = url(
  `export function cloudinaryConfigured(){return true};export async function uploadImage(env,file,id){globalThis.__v3.calls.push(['upload',id]);if(globalThis.__v3.failBadge&&id.endsWith('/badge'))throw Error('upload');return 'cloudinary:test/'+id+'.png'};export async function removeImage(env,ref){globalThis.__v3.calls.push(['remove',ref])};export async function readImage(){globalThis.__v3.calls.push(['read']);return new Response('image',{headers:{'content-type':'image/png'}})}`,
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
};
async function load(path) {
  let src = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [key, value] of Object.entries(replacements))
    src = src.replaceAll(key, value);
  return import(url(src));
}
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
function request({ newSpecies = false, photo = false } = {}) {
  const f = new FormData();
  f.set("requestId", "unique-request");
  f.set("speciesId", newSpecies ? "new" : "known");
  f.set("date", "2026-10-06");
  f.set("location", "Harbour");
  if (newSpecies) {
    f.set("chineseName", "新魚");
    f.set("englishName", "New fish");
    f.set("pixel", new File(["png"], "pixel.png", { type: "image/png" }));
  }
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
