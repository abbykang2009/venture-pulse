import { Env, json, getSessionUser } from '../_lib/auth';

// GET /api/circles — browse all circles (MLBB-style list). Shows each circle's size,
// how many opportunities have been shared in it, and how many of those are verified.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, c.creator_id, c.created_at,
            (SELECT COUNT(*) FROM circle_members m WHERE m.circle_id = c.id) AS memberCount,
            (SELECT COUNT(*) FROM deals d WHERE d.circle_id = c.id) AS dealCount,
            (SELECT COUNT(*) FROM deals d WHERE d.circle_id = c.id
               AND (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'verify')
                 - (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'dispute') >= 2
            ) AS verifiedCount,
            (SELECT 1 FROM circle_members m WHERE m.circle_id = c.id AND m.telegram_id = ?1) AS isMember,
            (SELECT 1 FROM circle_join_requests r WHERE r.circle_id = c.id AND r.telegram_id = ?1) AS isPending
     FROM circles c
     ORDER BY c.created_at DESC
     LIMIT 100`
  )
    .bind(user.id)
    .all<{
      id: string; name: string; creator_id: string; created_at: number;
      memberCount: number; dealCount: number; verifiedCount: number;
      isMember: number | null; isPending: number | null;
    }>();

  return json(
    results.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.created_at,
      memberCount: c.memberCount,
      dealCount: c.dealCount,
      verifiedCount: c.verifiedCount,
      isCreator: c.creator_id === user.id,
      isMember: !!c.isMember,
      isPending: !!c.isPending,
    }))
  );
};

// POST /api/circles — create a new circle. The creator becomes its only admin-like member.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  const name = typeof (body as any)?.name === 'string' ? (body as any).name.trim().slice(0, 80) : '';
  if (!name) return json({ error: 'Circle name is required' }, 400);

  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO circles (id, name, creator_id, created_at) VALUES (?, ?, ?, ?)').bind(id, name, user.id, now),
    env.DB.prepare('INSERT INTO circle_members (circle_id, telegram_id, role, joined_at) VALUES (?, ?, ?, ?)').bind(id, user.id, 'creator', now),
  ]);

  return json({ id, name, createdAt: now, memberCount: 1, dealCount: 0, verifiedCount: 0, isCreator: true, isMember: true, isPending: false }, 201);
};
