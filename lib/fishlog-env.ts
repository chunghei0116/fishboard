import { env } from "cloudflare:workers";
import type { CloudinaryEnv } from "./cloudinary";
export type FishlogEnv = CloudinaryEnv & {
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_AUTH_DOMAIN?: string;
  FIREBASE_APP_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  FISHBOARD_ORIGIN?: string;
  GENERATION_ENABLED?: string;
  WORKERS_AI_MODEL?: string;
  AI?: Ai;
};
export function settings() {
  return env as unknown as FishlogEnv;
}
export function firebaseReady(e: FishlogEnv) {
  return !!(
    e.FIREBASE_PROJECT_ID &&
    e.FIREBASE_API_KEY &&
    e.FIREBASE_AUTH_DOMAIN &&
    e.FIREBASE_APP_ID &&
    e.FIREBASE_CLIENT_EMAIL &&
    e.FIREBASE_PRIVATE_KEY
  );
}
export class FishlogError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function fail(error: unknown) {
  if (error instanceof FishlogError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error(
    "Fishlog operation failed",
    error instanceof Error ? error.name : "unknown",
  );
  return Response.json(
    { error: "服務暫時未能完成操作，請稍後再試。" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
