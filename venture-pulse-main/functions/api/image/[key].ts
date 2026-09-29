import { Env, json, getSessionUser } from '../../_lib/auth';

// GET /api/image/:key — serves R2 photos/videos to logged-in users only (supports Range so videos can seek/play on iPhone)
export const onRequestGet: PagesFunction<Env, 'key'> = async ({ request, params, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const key = String(params.key || '');
  if (!/^[A-Za-z0-9._-]+$/.test(key)) return new Response('Not found', { status: 404 });

  const object = await env.BUCKET.get(key, { range: request.headers });
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  const type = headers.get('Content-Type') || '';
  if (!type.startsWith('image/') && !type.startsWith('video/')) return new Response('Not found', { status: 404 });

  headers.set('etag', object.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');

  let status = 200;
  const r = (object as any).range as { offset?: number; length?: number; suffix?: number } | undefined;
  if (r && request.headers.has('Range')) {
    let start: number;
    let end: number;
    if (r.suffix !== undefined) {
      start = Math.max(0, object.size - r.suffix);
      end = object.size - 1;
    } else {
      start = r.offset ?? 0;
      end = start + (r.length ?? object.size - start) - 1;
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
    headers.set('Content-Length', String(end - start + 1));
    status = 206;
  }
  return new Response(object.body, { status, headers });
};
