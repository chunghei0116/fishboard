import 'server-only';
// Next.js deployment uses server environment variables. Cloudflare builds keep
// their native bindings through vite.config.ts and never import this module.
export const env = process.env;
