# FISH LOG v0.3 setup and verification

## What works locally

Home Aquarium, timeline, combined filters, Collection, Species Detail, Catch Detail, Map, Add Catch, Settings, local demo persistence and JSON export. Demo data is explicitly labeled and is never imported into a private account. Existing personal Cloudinary credentials are preserved in ignored files.

The server integration uses Firebase Google Auth, Firestore REST through a service account, authenticated Cloudinary uploads, and Workers AI reference-image editing. At delivery, Firebase settings and Workers AI credentials/binding are absent locally: live Google sign-in, Firestore persistence, provider inference, private Cloudinary delivery and production deployment must be tested after setup. This is not a claim of a fully deployed v0.3.

## Firebase

1. Create/select a Firebase project and register a web app. Enable Google Authentication; authorize localhost and the final hostname.
2. Create Firestore in the desired region. Apply `firestore.rules` (all direct browser access denied) and `firestore.indexes.json`. This journal reads through the Worker rather than the Web Firestore SDK.
3. Give a server service account the minimum data access needed (`roles/datastore.user`, not project Owner). Provision its key through your secrets workflow; do not paste it into chat or commit it.
4. Set all six `FIREBASE_*` entries in `.dev.vars` and the production Worker secret configuration. `FIREBASE_API_KEY` is public web-app config; the private key is a server secret. Private-key literal `\n` sequences are normalized server-side.
5. Set `FISHBOARD_ORIGIN` to the exact scheme/host/port. Production mutations fail closed without it. Origins are mandatory, including session logout.
6. `/api/config` returns only public Firebase configuration and capability flags. Sign-in creates a short-lived HttpOnly token cookie; each private operation verifies RS256, project, expiry and uid. Logout clears the cookie, but copied tokens remain valid until expiry: no global token revocation feature is claimed.

Firestore data lives below `users/{uid}/species/{id}`, `users/{uid}/catches/{id}`, `users/{uid}/requests/{requestId}` and `users/{uid}/quotas/{day}`. Service-account IAM bypasses Rules, so owner-scoped document paths are essential. Test with two separate accounts before release.

## Cloudinary

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. New original photos and new species sprites are uploaded with `type=authenticated`, `overwrite=false`, under `fishboard/{requestId}/source` and `fishboard/{requestId}/badge`. The image API checks the Firebase uid and streams bytes with `private, no-store`. Signed asset URLs are not exposed to browsers.

Existing species reuse their pixel image; adding another catch does not call AI or create another Aquarium fish. For new species, upload a transparent RGBA PNG (max 2 MiB, 1024×1024) or use Workers AI from an original photo. Original photos may be JPG/PNG/WebP up to 10 MiB. No paid Cloudinary background-removal add-on is enabled.

## Workers AI

Production uses `wrangler.fishlog.jsonc` with an AI binding, independent of Sites' ChatGPT authentication. Build with `npm run build`; publish only when instructed using `npx wrangler deploy --config wrangler.fishlog.jsonc`. No production deployment has been performed.

For live inference during development, launch with `FISHBOARD_ENABLE_AI_BINDING=true npm run dev` after authenticating Wrangler to the intended Cloudflare account. Local inference is remote and may incur fees. Set `GENERATION_ENABLED=true` only after the output pipeline passes your fish-photo acceptance checks. The default is disabled.

Model: `@cf/black-forest-labs/flux-2-klein-4b`. The client supplies a PNG reference with its longest edge at most 511px, retaining the full original separately. Workers AI receives multipart input_image_0. The prompt asks for pixel fish on flat magenta; server edge-connected chroma removal creates alpha. Fish-shape fidelity and clean fins must be checked with real reference photos: alpha validation alone does not prove visual quality. Rejected backgrounds yield an error, never a fabricated fish. JPEG and PNG provider outputs are decoded under bounded dimensions.

The atomic request record prevents reusing a requestId from generating again. Daily quota uses a UTC date and a per-owner transaction; generation is limited to 10 attempts/day. Costs are also affected by storage, delivery and database operations. Notifications are not hard billing caps. Provider timeouts and unknown commits cannot prove no charge occurred.

## Failure recovery

Requests record newly uploaded asset refs. Failures before a catch commit attempt clean only those assets; cleanup failures set cleanupPending. An ambiguous final commit preserves assets and marks the request uncertain; it never deletes an image that could already belong to a committed catch.

Inspect stale running/uncertain/cleanupPending requests in Firestore. Use `scripts/reconcile-fishlog.mjs --uid <uid> --dry-run` with environment variables loaded through your secrets workflow. It checks catch existence first and completes successful request status or cleans unused assets. Use `--apply` only after inspecting the dry-run report. Never automatically rerun AI for an uncertain request.

## Legacy migration

Existing D1/R2/Cloudinary collections have not been moved, overwritten or deleted. Old catches lack the Species relation, time, location and gear; these fields cannot be invented. Export D1, establish trusted old-owner → Firebase uid mapping, classify catches into species with the owner's input, and use create-only writes. Do not treat demo fixtures or user-submitted old owner identifiers as migration authority. Keep backups and reconcile new writes before any rollback. The old endpoints remain isolated legacy functionality; the new frontend only uses `/api/fishlog` and `/api/media`.

## Checks

- `npm test`: model invariants, input validation, claims/origin checks, owner-scoped endpoints, idempotency, upload cleanup, uncertain commit preservation and matte processing.
- `npx tsc --noEmit`, `npm run build`, `npm run lint`.
- Browser: home → catch → back; species tooltip → species history; Collection; filter intersections; mapped location → records; demo Add Catch → refresh; mobile no-overflow.
- After configuration: real Google login/refresh/logout/account switch, two-account read isolation, actual Firestore round trip, actual authenticated photo/sprite retrieval, five real photos through Workers AI, fault injection and production-domain verification.

Backend tests use mock service responses; they do not prove that Firebase Rules have been deployed or provider accounts are active.

## Official references

- [Firebase token validation](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firestore REST and IAM](https://firebase.google.com/docs/firestore/use-rest-api)
- [Workers AI image-editing input](https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/)
- [Cloudinary private media](https://cloudinary.com/documentation/control_access_to_media)

## Local verification recorded on 2026-10-06

22 tests passed; TypeScript and production build passed. Lint completed with zero errors and 11 warnings (image optimization advice and an epoch-ref cleanup warning). Worker deployment dry-run passed; nothing was uploaded. Browser confirmed catch creation/reload, details/species history, location filtering and 390px layout without horizontal overflow. Temporary demo verification catch was restored to the eight fixtures. AI currently runs during save; a separate generate-preview-confirm step remains pending.

## Vercel deployment

Vercel uses `vercel.json` → `npm run build:vercel` (`next build --webpack`) to produce `.next`. `next.config.ts` maps the server Cloudflare environment import to `lib/vercel-env.ts`, which reads server-only environment variables. Local Vinext and Cloudflare builds retain their original bindings. Legacy D1 routes are unavailable on Vercel and reject before storage mutations. Firebase/Firestore/Cloudinary use the same configured server variables; Workers AI's native binding still requires Cloudflare hosting (a Vercel-to-Worker bridge is not configured).
