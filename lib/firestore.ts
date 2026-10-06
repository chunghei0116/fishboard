import { SignJWT, importPKCS8 } from "jose";
import { settings, FishlogError } from "./fishlog-env";
import {
  encodeFields,
  decodeFields,
  safeId,
  type FirestoreValue,
} from "./fishlog-security";
let cached: { token: string; expires: number; email: string } | undefined;
async function accessToken() {
  const e = settings();
  if (
    !e.FIREBASE_CLIENT_EMAIL ||
    !e.FIREBASE_PRIVATE_KEY ||
    !e.FIREBASE_PROJECT_ID
  )
    throw new FishlogError("私人資料庫尚未設定。", 503);
  if (
    cached &&
    cached.email === e.FIREBASE_CLIENT_EMAIL &&
    cached.expires > Date.now() + 60000
  )
    return cached.token;
  const key = await importPKCS8(
    e.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    "RS256",
  );
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(e.FIREBASE_CLIENT_EMAIL)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new FishlogError("未能連接私人資料庫。", 503);
  const result = (await r.json()) as {
    access_token: string;
    expires_in: number;
  };
  cached = {
    token: result.access_token,
    expires: Date.now() + result.expires_in * 1000,
    email: e.FIREBASE_CLIENT_EMAIL,
  };
  return result.access_token;
}
export function database() {
  const project = settings().FIREBASE_PROJECT_ID;
  if (!project || !/^[\w-]+$/.test(project))
    throw new FishlogError("資料庫設定無效。", 503);
  return `projects/${project}/databases/(default)`;
}
export function documentPath(uid: string, collection: string, id: string) {
  return `${database()}/documents/users/${safeId(uid)}/${safeId(collection)}/${safeId(id)}`;
}
type FirestoreResponse = {
  fields?: Record<string, FirestoreValue>;
  updateTime?: string;
  documents?: Array<{ fields?: Record<string, FirestoreValue> }>;
  nextPageToken?: string;
  transaction?: string;
};
export async function firestore(
  path: string,
  options: RequestInit = {},
): Promise<FirestoreResponse | null> {
  const r = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (r.status === 404) return null;
  if (!r.ok)
    throw new FishlogError(
      r.status === 409
        ? "紀錄正在處理，請勿重複提交。"
        : "未能連接私人資料庫。",
      r.status === 409 ? 409 : 503,
    );
  return (await r.json()) as FirestoreResponse;
}
export async function getDocument(
  uid: string,
  collection: string,
  id: string,
  transaction?: string,
) {
  const doc = await firestore(
    documentPath(uid, collection, id) +
      (transaction ? `?transaction=${encodeURIComponent(transaction)}` : ""),
  );
  return doc
    ? {
        value: decodeFields(doc.fields || {}),
        updateTime: doc.updateTime as string,
      }
    : null;
}
export async function listDocuments(uid: string, collection: string) {
  const result: Record<string, unknown>[] = [];
  let token = "";
  do {
    const response = await firestore(
      `${database()}/documents/users/${safeId(uid)}/${safeId(collection)}?pageSize=100${token ? "&pageToken=" + encodeURIComponent(token) : ""}`,
    );
    for (const doc of response?.documents || [])
      result.push(decodeFields(doc.fields || {}));
    token = response?.nextPageToken || "";
  } while (token);
  return result;
}
export function write(
  uid: string,
  collection: string,
  id: string,
  value: Record<string, unknown>,
  createOnly = false,
) {
  return {
    update: {
      name: documentPath(uid, collection, id),
      fields: encodeFields(value),
    },
    ...(createOnly ? { currentDocument: { exists: false } } : {}),
  };
}
export async function commit(writes: unknown[], transaction?: string) {
  return firestore(`${database()}/documents:commit`, {
    method: "POST",
    body: JSON.stringify({ writes, ...(transaction ? { transaction } : {}) }),
  });
}
export async function claimRequest(
  uid: string,
  id: string,
  generation = false,
) {
  const previous = await getDocument(uid, "requests", id);
  if (previous) return previous.value;
  if (!generation) {
    try {
      await commit([
        write(
          uid,
          "requests",
          id,
          { id, status: "running", started: Date.now(), assets: [] },
          true,
        ),
      ]);
      return null;
    } catch (error) {
      if (error instanceof FishlogError && error.status === 409) {
        const existing = await getDocument(uid, "requests", id);
        if (existing) return existing.value;
      }
      throw error;
    }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const begin = await firestore(`${database()}/documents:beginTransaction`, {
      method: "POST",
      body: "{}",
    });
    const transaction = begin?.transaction;
    if (!transaction) throw new FishlogError("資料庫交易未能啟動。", 503);
    try {
      const day = new Date().toISOString().slice(0, 10);
      const quota = await getDocument(uid, "quotas", day, transaction);
      const count = Number(quota?.value.count || 0);
      if (count >= 10)
        throw new FishlogError("今日已使用 10 次 AI 生圖，請明日再試。", 429);
      await commit(
        [
          write(uid, "quotas", day, { count: count + 1 }),
          write(
            uid,
            "requests",
            id,
            { id, status: "running", started: Date.now(), assets: [] },
            true,
          ),
        ],
        transaction,
      );
      return null;
    } catch (error) {
      await firestore(`${database()}/documents:rollback`, {
        method: "POST",
        body: JSON.stringify({ transaction }),
      }).catch(() => {});
      if (error instanceof FishlogError && error.status === 409) {
        const existing = await getDocument(uid, "requests", id);
        if (existing) return existing.value;
        if (attempt < 2) continue;
      }
      throw error;
    }
  }
  throw new FishlogError("請稍後重試。", 409);
}
