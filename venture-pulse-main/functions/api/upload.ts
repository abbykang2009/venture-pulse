import { Env, json, getSessionUser } from '../_lib/auth';
import { IMAGE_TYPES, VIDEO_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '../_lib/options';

// POST /api/upload — the raw file is the request body (streamed straight into R2, so big videos don't eat memory).
// Headers: Content-Type = the file's MIME type. Returns { key, kind, url }.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const length = Number(request.headers.get('Content-Length') || 0);

  let ext = IMAGE_TYPES[type];
  let kind: 'image' | 'video' = 'image';
  let max = MAX_IMAGE_BYTES;
  if (!ext) {
    ext = VIDEO_TYPES[type];
    kind = 'video';
    max = MAX_VIDEO_BYTES;
  }
  if (!ext) return json({ error: 'Unsupported file type. Use JPG, PNG, WEBP, GIF, MP4, WEBM or MOV.' }, 400);
  if (!request.body || !length) return json({ error: 'Empty upload' }, 400);
  if (length > max) {
    return json({ error: `${kind === 'image' ? 'Photos' : 'Videos'} must be under ${max / 1024 / 1024} MB` }, 413);
  }

  const key = `${crypto.randomUUID()}.${ext}`;
  await env.BUCKET.put(key, request.body, {
    httpMetadata: { contentType: type },
    customMetadata: { owner: user.id },
  });
  return json({ key, kind, url: `/api/image/${key}` }, 201);
};
