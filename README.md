# 釣魚日和 · Tsuri Biyori

A personal fishing catch collection: upload a fish photo, turn it into a Japanese pixel-art badge, then welcome the fish into your own 2D aquarium with a shared Three.js water background.

## What it does

- Upload JPG, PNG, or WebP fish photos up to 10 MB.
- Generate a pixel-art fish badge that keeps the fish's silhouette and markings.
- Each saved catch becomes one pixel fish arranged left to right, top to bottom inside a white frame, with a gentle idle wobble; a single water shader continues across the page and frame.
- Click a fish or its keyboard-accessible label to open the catch record; browse all catches in the journal.
- Preview the new fish before releasing it into the aquarium. Two demo fish appear by default (marked as demos in their accessible names and details), without uploading or generating anything; they are not saved or counted and can be removed together.
- Pause the idle animation and water at any time. Reduced-motion preferences freeze the scene automatically; unsupported WebGL uses the static water colour; the 2D fish remain usable.
- Keep the original catch photo beside each generated badge.
- Store each catch under the signed-in user's account. New images live in authenticated Cloudinary storage and catch details live in D1. The image endpoint checks ownership before fetching an image; existing R2 images remain supported.

## Run locally

Requirements: Node.js 22.13 or later.

```sh
npm ci
cp .env.example .dev.vars
```

Add the three Cloudinary credentials and an OpenAI API key to `.dev.vars` to enable photo-to-badge generation. Image generation uses the OpenAI Images API and may incur usage charges. Keep `.dev.vars` private; it is ignored by Git. Sign-in is simulated by the local Sites preview. Run:

```sh
npm run dev
```

The development server prints its local URL. Use the preview's sign-in flow before opening the collection.

## Build

```sh
npm run build
```

This project uses Vinext and is set up for the Sites runtime. Production requires the D1 database and server-side `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `OPENAI_API_KEY` secrets. Configure them in the hosting environment, never as `NEXT_PUBLIC_` values. The declared R2 binding is only used as a legacy fallback; no new R2 bucket is needed when Cloudinary is configured. No database migration is needed: Cloudinary references use the existing `source` and `image` columns. Existing R2 objects are not moved or deleted.

Cloudinary uploads use the authenticated delivery type with overwrite disabled. Failed saves roll back newly uploaded images. No unsigned upload preset, public image URL, paid add-on, or AI-generated test request is required.

## Verification

`npm test` runs storage authorization/rollback checks and checks storage ownership and failure recovery. Use `npm run build` and `npx tsc --noEmit` for build and type checks.

## FISH LOG v0.3 journal

The journal uses a cool white and pale-gray palette, with a persistent dark theme toggled by the small light beside FISH LOG. A floating glass navigation bar links Home, Collection, Map and Gear. The Map uses OpenFreeMap vector tiles with blue water and gray land in both themes. Catch detail previews original photos at a cropped 16:9 ratio; opening the image shows the full original. Deleting a catch requires confirmation, removes its private original photo, and recalculates the aquarium and statistics while preserving shared species sprites.

The Gear page stores a private loadout containing Rod, Reel, Main Line, Leader Line and Lure/Bait. Apply it in the Add Catch sheet to save a snapshot with that catch; subsequent loadout edits do not change past records. Signed-out visitors see the seaside Google login screen. Species and catches are separate; repeated catches share one aquarium fish.

The new backend uses Firebase Auth / Firestore, Cloudinary and Cloudflare Workers AI. The older OpenAI/D1 collection described above is preserved as legacy code and is no longer the homepage. See [setup and validation](docs/service-setup.md) for the new configuration, standalone Worker deployment and the boundary between local tests and unverified live services. No account migration or deployment has been performed.
