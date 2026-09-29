import { Env, json, getSessionUser } from '../../_lib/auth';

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

// GET /api/users/:id — a public profile: basic identity + every opportunity they've posted
// to the global feed (deals shared privately inside a circle are never shown here).
export const onRequestGet: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const viewer = await getSessionUser(request, env);
  if (!viewer) return json({ error: 'Login required' }, 401);

  const telegramId = String(params.id);
  if (!/^\d+$/.test(telegramId)) return json({ error: 'Profile not found' }, 404);

  const profile = await env.DB.prepare(
    'SELECT telegram_id, username, first_name, last_name, photo_url FROM users WHERE telegram_id = ?'
  )
    .bind(telegramId)
    .first<{ telegram_id: string; username: string | null; first_name: string; last_name: string | null; photo_url: string | null }>();
  if (!profile) return json({ error: 'Profile not found' }, 404);

  const { results } = await env.DB.prepare(
    `SELECT d.id, d.name, d.stage, d.budget, d.currency, d.rate, d.listingType, d.createdAt,
            (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'verify')  AS verifications,
            (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'dispute') AS disputes,
            (SELECT m.media_key FROM deal_media m WHERE m.deal_id = d.id ORDER BY m.position LIMIT 1) AS coverKey,
            (SELECT m.kind      FROM deal_media m WHERE m.deal_id = d.id ORDER BY m.position LIMIT 1) AS coverKind
     FROM deals d
     WHERE d.posted_by_id = ? AND d.circle_id IS NULL
     ORDER BY d.createdAt DESC
     LIMIT 200`
  )
    .bind(telegramId)
    .all<DealRow>();

  return json({
    id: profile.telegram_id,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    photoUrl: profile.photo_url,
    isSelf: profile.telegram_id === viewer.id,
    deals: results.map((r) => ({
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
