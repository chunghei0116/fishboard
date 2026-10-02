# 釣魚日和 · Tsuri Biyori

A personal fishing catch collection: upload a fish photo, turn it into a Japanese pixel-art badge, then place the badge on your corkboard.

![Tsuri Biyori collection board preview](preview.png)

## What it does

- Upload JPG, PNG, or WebP fish photos up to 10 MB.
- Generate a pixel-art fish badge that keeps the fish's silhouette and markings.
- Drag badges around the corkboard; their positions are saved automatically.
- Keep the original catch photo beside each generated badge.
- Store each catch under the signed-in user's account. Images live in private R2 storage and catch details live in D1.
- Try the sample badge without adding it to the collection.

## Run locally

Requirements: Node.js 22.13 or later.

```sh
npm ci
cp .env.example .env.local
```

Add an OpenAI API key to `.env.local` to enable photo-to-badge generation. Image generation uses the OpenAI Images API and may incur usage charges. Keep `.env.local` private; it is ignored by Git. Sign-in is simulated by the local Sites preview. Run:

```sh
npm run dev
```

The development server prints its local URL. Use the preview's sign-in flow before opening the collection.

## Build

```sh
npm run build
```

This project uses Vinext and is set up for the Sites runtime. Production storage requires the D1 database and R2 bucket declared in `.openai/hosting.json`.
