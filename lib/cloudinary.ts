export type CloudinaryEnv = {
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
};

export function cloudinaryConfigured(env: CloudinaryEnv) {
  return !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function config(env: CloudinaryEnv) {
  if (!cloudinaryConfigured(env) || !/^[a-zA-Z0-9_-]+$/.test(env.CLOUDINARY_CLOUD_NAME!)) {
    throw new Error('Cloudinary is not configured');
  }
  return { cloud: env.CLOUDINARY_CLOUD_NAME!, key: env.CLOUDINARY_API_KEY!, secret: env.CLOUDINARY_API_SECRET! };
}

// Assets stay authenticated. Only the owner-checked image route fetches signed URLs.
export async function uploadImage(env: CloudinaryEnv, file: Blob, publicId: string) {
  const { cloud, key, secret } = config(env);
  const form = new FormData();
  form.set('file', file, 'image');
  form.set('public_id', publicId);
  form.set('type', 'authenticated');
  form.set('overwrite', 'false');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST', headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` }, body: form,
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error('Cloudinary upload failed');
  const result = await response.json() as { public_id: string; format: string; type: string };
  if (result.public_id !== publicId || result.type !== 'authenticated' || !/^(png|jpg|jpeg|webp)$/.test(result.format)) {
    throw new Error('Unexpected Cloudinary upload response');
  }
  return `cloudinary:${cloud}/${result.public_id}.${result.format}`;
}

function asset(env: CloudinaryEnv, reference: string) {
  const settings = config(env);
  const match = /^cloudinary:([\w-]+)\/(fishboard\/[\w-]+\/(?:source|badge))\.(png|jpg|jpeg|webp)$/.exec(reference);
  if (!match || match[1] !== settings.cloud) throw new Error('Invalid Cloudinary image reference');
  return { ...settings, publicId: match[2], format: match[3] };
}

export async function readImage(env: CloudinaryEnv, reference: string) {
  const { cloud, secret, publicId, format } = asset(env, reference);
  const path = `${publicId}.${format}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(path + secret));
  const signature = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').slice(0, 8);
  const response = await fetch(`https://res.cloudinary.com/${cloud}/image/authenticated/s--${signature}--/${path}`, {
    signal: AbortSignal.timeout(30000), redirect: 'error',
  });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error('Cloudinary image unavailable');
  }
  return response;
}

// Used only to roll back uploads when saving a catch fails.
export async function removeImage(env: CloudinaryEnv, reference: string) {
  const { cloud, key, secret, publicId } = asset(env, reference);
  const body = new URLSearchParams({ public_id: publicId, type: 'authenticated', invalidate: 'true' });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, {
    method: 'POST', headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` }, body,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('Cloudinary cleanup failed');
}
