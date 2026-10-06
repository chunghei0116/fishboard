import { SignJWT, importPKCS8 } from "jose";
const args = process.argv.slice(2),
  uid = args[args.indexOf("--uid") + 1],
  apply = args.includes("--apply");
if (
  !args.includes("--uid") ||
  !/^[\w-]{1,128}$/.test(uid) ||
  (!apply && !args.includes("--dry-run"))
)
  throw Error("Usage: --uid <uid> --dry-run | --apply");
const {
  FIREBASE_PROJECT_ID: project,
  FIREBASE_CLIENT_EMAIL: email,
  FIREBASE_PRIVATE_KEY: privateKey,
  CLOUDINARY_CLOUD_NAME: cloud,
  CLOUDINARY_API_KEY: apiKey,
  CLOUDINARY_API_SECRET: apiSecret,
} = process.env;
if (!project || !email || !privateKey)
  throw Error("Firebase server configuration missing");
const assertion = await new SignJWT({
  scope: "https://www.googleapis.com/auth/datastore",
})
  .setProtectedHeader({ alg: "RS256" })
  .setIssuer(email)
  .setAudience("https://oauth2.googleapis.com/token")
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(await importPKCS8(privateKey.replace(/\\n/g, "\n"), "RS256"));
const auth = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  body: new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  }),
});
if (!auth.ok) throw Error("Server authentication failed");
const { access_token: token } = await auth.json();
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users/${uid}`;
async function call(path, options = {}) {
  const r = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw Error(`Firestore operation failed (${r.status})`);
  return r.json();
}
const value = (v) =>
  v?.stringValue ??
  (v?.integerValue ? Number(v.integerValue) : (v?.booleanValue ?? null));
let pageToken = "";
do {
  const page = await call(
    root +
      "/requests?pageSize=100" +
      (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : ""),
  );
  for (const request of page?.documents || []) {
    const f = request.fields || {},
      id = value(f.id),
      status = value(f.status),
      started = value(f.started) || value(f.updated) || 0;
    if (!id || !/^[\w-]{1,150}$/.test(id) || status === "succeeded") continue;
    if (status === "running" && Date.now() - started < 30 * 60 * 1000) continue;
    const catchDoc = await call(root + "/catches/" + id);
    const assets = (f.assets?.arrayValue?.values || [])
      .map(value)
      .filter((v) => typeof v === "string");
    const action = catchDoc
      ? "mark succeeded"
      : assets.length
        ? "clean unused assets"
        : "mark failed";
    console.log(
      JSON.stringify({
        request: id,
        status,
        action,
        assets: assets.length,
        apply,
      }),
    );
    if (!apply) continue;
    if (!catchDoc) {
      if (assets.length && (!cloud || !apiKey || !apiSecret))
        throw Error("Cloudinary configuration missing");
      for (const ref of assets) {
        const escapedCloud = cloud.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const match = new RegExp(
          "^cloudinary:" +
            escapedCloud +
            "/(fishboard/[\\w-]+/(?:source|badge))\\.(?:png|jpg|jpeg|webp)$",
        ).exec(ref);
        if (!match) throw Error("Unsafe asset reference");
        const r = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud}/image/destroy`,
          {
            method: "POST",
            headers: {
              Authorization:
                "Basic " +
                Buffer.from(apiKey + ":" + apiSecret).toString("base64"),
            },
            body: new URLSearchParams({
              public_id: match[1],
              type: "authenticated",
              invalidate: "true",
            }),
          },
        );
        if (!r.ok || !["ok", "not found"].includes((await r.json()).result))
          throw Error("Asset cleanup failed");
      }
    }
    await call(
      root +
        "/requests/" +
        id +
        "?currentDocument.updateTime=" +
        encodeURIComponent(request.updateTime),
      {
        method: "PATCH",
        body: JSON.stringify({
          fields: {
            ...f,
            status: { stringValue: catchDoc ? "succeeded" : "failed" },
            cleanupPending: { booleanValue: false },
            reconciled: { integerValue: String(Date.now()) },
          },
        }),
      },
    );
  }
  pageToken = page?.nextPageToken || "";
} while (pageToken);
