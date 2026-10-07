import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { settings, FishlogError, firebaseReady } from "./fishlog-env";
import { validateClaims, requireOrigin } from "./fishlog-security";
const keys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);
export async function verifyToken(token: string) {
  const e = settings();
  if (!firebaseReady(e)) throw new FishlogError("私人登入尚未設定。", 503);
  try {
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ["RS256"],
      audience: e.FIREBASE_PROJECT_ID,
      issuer: `https://securetoken.google.com/${e.FIREBASE_PROJECT_ID}`,
    });
    return validateClaims(payload, e.FIREBASE_PROJECT_ID!);
  } catch (error) {
    if (error instanceof FishlogError) throw error;
    console.warn("Firebase token verification failed", error instanceof Error ? error.name : "unknown");
    throw new FishlogError("登入已過期，請重新登入。", 401);
  }
}
export async function privateUser() {
  const token = (await cookies()).get("fishboard_session")?.value;
  if (!token) throw new FishlogError("請先登入私人帳戶。", 401);
  return verifyToken(token);
}
export function mutationOrigin(request: Request) {
  const e = settings();
  const url = new URL(request.url);
  const origin =
    e.FISHBOARD_ORIGIN ||
    (url.hostname === "127.0.0.1" || url.hostname === "localhost"
      ? url.origin
      : "");
  try {
    requireOrigin(request, origin);
  } catch {
    throw new FishlogError("請由 Fish Log 網站內進行操作。", 403);
  }
}
