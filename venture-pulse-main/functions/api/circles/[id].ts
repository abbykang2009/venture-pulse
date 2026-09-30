import { Env, json, getSessionUser } from '../../_lib/auth';
import { getMembership, memberCount, usersByIds } from '../../_lib/circles';

export const onRequestGet: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const circleId = String(params.id);
  const circle = await env.DB.prepare('SELECT id, name, creator_id, created_at FROM circles WHERE id = ?')
    .bind(circleId)
    .first<{ id: string; name: string; creator_id: string; created_at: number }>();
  if (!circle) return json({ error: 'Circle not found' }, 404);

  const { role } = await getMembership(env, circleId, user.id);
  const isCreator = circle.creator_id === user.id;
  const isMember = !!role;

  const [dealCountRow, verifiedCountRow, pendingRow] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS n FROM deals WHERE circle_id = ?').bind(circleId).first<{ n: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM deals d WHERE d.circle_id = ?
         AND (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'verify')
           - (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'dispute') >= 2`
    ).bind(circleId).first<{ n: number }>(),
    env.DB.prepare('SELECT 1 FROM circle_join_requests WHERE circle_id = ? AND telegram_id = ?').bind(circleId, user.id).first(),
  ]);

  const base = {
    id: circle.id,
    name: circle.name,
    createdAt: circle.created_at,
    isCreator,
    isMember,
    isPending: !isMember && !!pendingRow,
    memberCount: await memberCount(env, circleId),
    dealCount: dealCountRow?.n ?? 0,
    verifiedCount: verifiedCountRow?.n ?? 0,
  };

  if (!isMember) return json(base);

  const { results: memberRows } = await env.DB.prepare(
    'SELECT telegram_id, role, joined_at FROM circle_members WHERE circle_id = ? ORDER BY joined_at ASC'
  )
    .bind(circleId)
    .all<{ telegram_id: string; role: string; joined_at: number }>();

  const profiles = await usersByIds(env, memberRows.map((m) => m.telegram_id));
  const members = memberRows.map((m) => ({
    id: m.telegram_id,
    role: m.role,
    joinedAt: m.joined_at,
    username: profiles.get(m.telegram_id)?.username ?? null,
    firstName: profiles.get(m.telegram_id)?.firstName ?? 'Investor',
    photoUrl: profiles.get(m.telegram_id)?.photoUrl ?? null,
  }));

  let pendingRequests: unknown[] = [];
  if (isCreator) {
    const { results: reqRows } = await env.DB.prepare(
      'SELECT telegram_id, recommended_by, created_at FROM circle_join_requests WHERE circle_id = ? ORDER BY created_at ASC'
    )
      .bind(circleId)
      .all<{ telegram_id: string; recommended_by: string | null; created_at: number }>();
    const reqProfiles = await usersByIds(env, reqRows.map((r) => r.telegram_id).concat(reqRows.map((r) => r.recommended_by || '').filter(Boolean)));
    pendingRequests = reqRows.map((r) => ({
      id: r.telegram_id,
      username: reqProfiles.get(r.telegram_id)?.username ?? null,
      firstName: reqProfiles.get(r.telegram_id)?.firstName ?? 'Investor',
      photoUrl: reqProfiles.get(r.telegram_id)?.photoUrl ?? null,
      createdAt: r.created_at,
      recommendedByName: r.recommended_by
        ? reqProfiles.get(r.recommended_by)?.username || reqProfiles.get(r.recommended_by)?.firstName || null
        : null,
    }));
  }

  return json({ ...base, members, pendingRequests });
};

// DELETE /api/circles/:id — creator disbands the circle. Its shared deals go with it.
export const onRequestDelete: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const circleId = String(params.id);
  const circle = await env.DB.prepare('SELECT creator_id FROM circles WHERE id = ?').bind(circleId).first<{ creator_id: string }>();
  if (!circle) return json({ error: 'Circle not found' }, 404);
  if (circle.creator_id !== user.id) return json({ error: 'Only the creator can delete this circle' }, 403);

  const { results: dealRows } = await env.DB.prepare('SELECT id FROM deals WHERE circle_id = ?').bind(circleId).all<{ id: string }>();
  const dealIds = dealRows.map((d) => d.id);

  const { results: mediaRows } = dealIds.length
    ? await env.DB.prepare(`SELECT media_key FROM deal_media WHERE deal_id IN (${dealIds.map(() => '?').join(',')})`).bind(...dealIds).all<{ media_key: string }>()
    : { results: [] as { media_key: string }[] };

  await env.DB.batch([
    ...(dealIds.length
      ? [
          env.DB.prepare(`DELETE FROM votes WHERE deal_id IN (${dealIds.map(() => '?').join(',')})`).bind(...dealIds),
          env.DB.prepare(`DELETE FROM comments WHERE deal_id IN (${dealIds.map(() => '?').join(',')})`).bind(...dealIds),
          env.DB.prepare(`DELETE FROM deal_media WHERE deal_id IN (${dealIds.map(() => '?').join(',')})`).bind(...dealIds),
          env.DB.prepare(`DELETE FROM deals WHERE circle_id = ?`).bind(circleId),
        ]
      : []),
    env.DB.prepare('DELETE FROM circle_join_requests WHERE circle_id = ?').bind(circleId),
    env.DB.prepare('DELETE FROM circle_members WHERE circle_id = ?').bind(circleId),
    env.DB.prepare('DELETE FROM circles WHERE id = ?').bind(circleId),
  ]);

  if (mediaRows.length) await env.BUCKET.delete([...new Set(mediaRows.map((m) => m.media_key))]);
  return json({ ok: true });
};
