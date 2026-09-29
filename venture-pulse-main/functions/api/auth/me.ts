import { Env, json, getSessionUser, clearSessionCookie } from '../../_lib/auth';

// GET /api/auth/me — current user or { user: null }
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  return json({ user });
};

// DELETE /api/auth/me?scope=deals   — permanently delete every posting this user has made.
// DELETE /api/auth/me?scope=profile — permanently delete the profile itself; postings stay.
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const scope = new URL(request.url).searchParams.get('scope');

  if (scope === 'deals') {
    const { results: dealRows } = await env.DB.prepare('SELECT id, imageUrl FROM deals WHERE posted_by_id = ?')
      .bind(user.id)
      .all<{ id: string; imageUrl: string | null }>();
    const dealIds = dealRows.map((d) => d.id);
    if (dealIds.length === 0) return json({ ok: true, deleted: 0 });

    const placeholders = dealIds.map(() => '?').join(',');
    const { results: mediaRows } = await env.DB.prepare(
      `SELECT media_key FROM deal_media WHERE deal_id IN (${placeholders})`
    )
      .bind(...dealIds)
      .all<{ media_key: string }>();

    await env.DB.batch([
      env.DB.prepare(`DELETE FROM votes WHERE deal_id IN (${placeholders})`).bind(...dealIds),
      env.DB.prepare(`DELETE FROM comments WHERE deal_id IN (${placeholders})`).bind(...dealIds),
      env.DB.prepare(`DELETE FROM deal_media WHERE deal_id IN (${placeholders})`).bind(...dealIds),
      env.DB.prepare(`DELETE FROM deals WHERE posted_by_id = ?`).bind(user.id),
    ]);

    const keys = new Set(mediaRows.map((m) => m.media_key));
    dealRows.forEach((d) => {
      if (d.imageUrl?.startsWith('/api/image/')) keys.add(d.imageUrl.slice('/api/image/'.length));
    });
    if (keys.size) await env.BUCKET.delete([...keys]);

    return json({ ok: true, deleted: dealIds.length });
  }

  if (scope === 'profile') {
    // Postings, votes and comments intentionally stay — only the profile row goes.
    await env.DB.prepare('DELETE FROM users WHERE telegram_id = ?').bind(user.id).run();
    return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  }

  return json({ error: 'Missing or invalid scope. Use ?scope=deals or ?scope=profile.' }, 400);
};
