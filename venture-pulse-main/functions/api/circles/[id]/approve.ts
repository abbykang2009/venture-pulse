import { Env, json, getSessionUser } from '../../../_lib/auth';

// POST /api/circles/:id/approve  { telegramId } — creator accepts a pending request.
export const onRequestPost: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const circleId = String(params.id);
  const circle = await env.DB.prepare('SELECT creator_id FROM circles WHERE id = ?')
    .bind(circleId)
    .first<{ creator_id: string }>();
  if (!circle) return json({ error: 'Circle not found' }, 404);
  if (circle.creator_id !== user.id) return json({ error: 'Only the creator can approve requests' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  const telegramId = typeof (body as any)?.telegramId === 'string' ? (body as any).telegramId : '';
  if (!telegramId) return json({ error: 'Missing telegramId' }, 400);

  const req = await env.DB.prepare('SELECT 1 FROM circle_join_requests WHERE circle_id = ? AND telegram_id = ?')
    .bind(circleId, telegramId)
    .first();
  if (!req) return json({ error: 'No pending request for this user' }, 404);

  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM circle_members WHERE circle_id = ?')
    .bind(circleId)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= 50) return json({ error: 'This circle is full (max 50)' }, 400);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO circle_members (circle_id, telegram_id, role, joined_at) VALUES (?, ?, 'member', ?)
       ON CONFLICT(circle_id, telegram_id) DO NOTHING`
    ).bind(circleId, telegramId, Date.now()),
    env.DB.prepare('DELETE FROM circle_join_requests WHERE circle_id = ? AND telegram_id = ?').bind(circleId, telegramId),
  ]);

  return json({ ok: true });
};
