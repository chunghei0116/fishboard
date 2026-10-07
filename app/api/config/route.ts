import { settings, firebaseReady, generationConfigured } from "@/lib/fishlog-env";
import { cloudinaryConfigured } from "@/lib/cloudinary";
export async function GET() {
  const e = settings();
  return Response.json(
    {
      firebase: firebaseReady(e)
        ? {
            apiKey: e.FIREBASE_API_KEY,
            authDomain: e.FIREBASE_AUTH_DOMAIN,
            projectId: e.FIREBASE_PROJECT_ID,
            appId: e.FIREBASE_APP_ID,
          }
        : null,
      storageReady: cloudinaryConfigured(e),
      databaseReady: !!(e.FIREBASE_CLIENT_EMAIL && e.FIREBASE_PRIVATE_KEY),
      generationReady:
        cloudinaryConfigured(e) && generationConfigured(e),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
