import { Env, json, getSessionUser, isAdmin } from '../../_lib/auth';

interface DealRow {
  id: string;
  name: string;
  stage: string | null;
  budget: number | null;
  currency: string | null;
  rate: string | null;
  listingType: string | null;
  createdAt: number;
  verifications: number;
  disputes: number;
  coverKey: string | null;
  coverKind: string | null;
}

// GET /api/users/:id — a public profile: identity + every opportunity they've posted
// that's visible in the global feed (deals kept private to a circle are never shown here).
export const onRequestGet: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const viewer = await getSessionUser(request, env);
  if (!viewer) return json({ error: 'Login required' }, 401);

  const telegramId = String(params.id);
  if (!/^\d+$/.test(telegramId)) return json({ error: 'Profile not found' }, 404);

  const profile = await env.DB.prepare(
    'SELECT telegram_id, username, first_name, last_name, photo_url, status FROM users WHERE telegram_id = ?'
  )
    .bind(telegramId)
    .first<{ telegram_id: string; username: string | null; first_name: string; last_name: string | null; photo_url: string | null; status: string }>();
  if (!profile) return json({ error: 'Profile not found' }, 404);

  const [dealsRes, aggRes, givenRes] = await env.DB.batch([
    env.DB.prepare(
      `SELECT d.id, d.name, d.stage, d.budget, d.currency, d.rate, d.listingType, d.createdAt,
              (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'verify')  AS verifications,
              (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'dispute') AS disputes,
              (SELECT m.media_key FROM deal_media m WHERE m.deal_id = d.id ORDER BY m.position LIMIT 1) AS coverKey,
              (SELECT m.kind      FROM deal_media m WHERE m.deal_id = d.id ORDER BY m.position LIMIT 1) AS coverKind
       FROM deals d
       WHERE d.posted_by_id = ?1 AND (d.circle_id IS NULL OR d.also_global = 1)
       ORDER BY d.createdAt DESC
       LIMIT 200`
    ).bind(telegramId),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM votes v JOIN deals d ON d.id = v.deal_id
       WHERE d.posted_by_id = ?1 AND v.vote_type = 'verify'`
    ).bind(telegramId),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM votes WHERE telegram_id = ?1 AND vote_type = 'verify'`).bind(telegramId),
  ]);

  return json({
    id: profile.telegram_id,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    photoUrl: profile.photo_url,
    status: profile.status || 'active',
    isAdmin: isAdmin(env, profile.telegram_id, profile.username),
    isSelf: profile.telegram_id === viewer.id,
    verificationsReceived: (aggRes.results[0] as any)?.n || 0,
    verificationsGiven: (givenRes.results[0] as any)?.n || 0,
    deals: (dealsRes.results as DealRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      stage: r.stage || '',
      budget: r.budget,
      currency: r.currency,
      rate: r.rate || '',
      tag: r.listingType === 'Business' || r.listingType === 'VC' ? r.listingType : '',
      createdAt: r.createdAt,
      verifications: r.verifications,
      disputes: r.disputes,
      cover: r.coverKey ? { url: `/api/image/${r.coverKey}`, kind: r.coverKind === 'video' ? 'video' : 'image' } : null,
    })),
  });
};

// PATCH /api/users/:id  { status: 'active' | 'restricted' | 'banned' } — admin only.
// Banning also deletes that user's not-yet-verified postings; verified ones stay.
export const onRequestPatch: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const admin = await getSessionUser(request, env);
  if (!admin) return json({ error: 'Login required' }, 401);
  if (!admin.isAdmin) return json({ error: 'Admin access required' }, 403);

  const telegramId = String(params.id);
  if (telegramId === admin.id) return json({ error: "You can't restrict or ban your own account." }, 400);

  const target = await env.DB.prepare('SELECT telegram_id, username FROM users WHERE telegram_id = ?')
    .bind(telegramId)
    .first<{ telegram_id: string; username: string | null }>();
  if (!target) return json({ error: 'User not found' }, 404);
  if (isAdmin(env, target.telegram_id, target.username)) {
    return json({ error: 'Admins cannot be restricted or banned.' }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  const status = (body as any)?.status;
  if (status !== 'active' && status !== 'restricted' && status !== 'banned') {
    return json({ error: "status must be 'active', 'restricted' or 'banned'" }, 400);
  }

  if (status === 'banned') {
    const { results: dealRows } = await env.DB.prepare(
      `SELECT d.id, d.imageUrl,
              (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'verify')  AS verifications,
              (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'dispute') AS disputes
       FROM deals d WHERE d.posted_by_id = ?`
    )
      .bind(telegramId)
      .all<{ id: string; imageUrl: string | null; verifications: number; disputes: number }>();

    const unverified = dealRows.filter((d) => d.verifications - d.disputes < 2);
    const dealIds = unverified.map((d) => d.id);

    if (dealIds.length) {
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
        env.DB.prepare(`DELETE FROM deals WHERE id IN (${placeholders})`).bind(...dealIds),
      ]);

      const keys = new Set(mediaRows.map((m) => m.media_key));
      unverified.forEach((d) => {
        if (d.imageUrl?.startsWith('/api/image/')) keys.add(d.imageUrl.slice('/api/image/'.length));
      });
      if (keys.size) await env.BUCKET.delete([...keys]);
    }
  }

  await env.DB.prepare('UPDATE users SET status = ? WHERE telegram_id = ?').bind(status, telegramId).run();
  return json({ ok: true, status });
};
