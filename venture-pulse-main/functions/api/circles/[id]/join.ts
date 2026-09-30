import { Env, json, getSessionUser } from '../../../_lib/auth';
import { MAX_CIRCLE_MEMBERS } from '../../../_lib/options';
import { getMembership, memberCount } from '../../../_lib/circles';

// POST /api/circles/:id/join — request to join. Instant for nobody; the creator must approve.
export const onRequestPost: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const circleId = String(params.id);
  const circle = await env.DB.prepare('SELECT id FROM circles WHERE id = ?').bind(circleId).first();
  if (!circle) return json({ error: 'Circle not found' }, 404);

  const { role } = await getMembership(env, circleId, user.id);
  if (role) return json({ error: 'You are already in this circle' }, 400);

  const count = await memberCount(env, circleId);
  if (count >= MAX_CIRCLE_MEMBERS) return json({ error: `This circle is full (max ${MAX_CIRCLE_MEMBERS})` }, 400);

  await env.DB.prepare(
    `INSERT INTO circle_join_requests (circle_id, telegram_id, status, recommended_by, created_at)
     VALUES (?, ?, 'pending', NULL, ?)
     ON CONFLICT(circle_id, telegram_id) DO NOTHING`
  )
    .bind(circleId, user.id, Date.now())
    .run();

  return json({ ok: true, isPending: true });
};

// DELETE /api/circles/:id/join — withdraw my own pending request, or leave if I'm already a member.
// The creator can pass ?telegramId=xxx to reject someone else's pending request instead.
export const onRequestDelete: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const circleId = String(params.id);
  const circle = await env.DB.prepare('SELECT creator_id FROM circles WHERE id = ?').bind(circleId).first<{ creator_id: string }>();
  if (!circle) return json({ error: 'Circle not found' }, 404);

  const targetParam = new URL(request.url).searchParams.get('telegramId');
  if (targetParam && targetParam !== user.id) {
    if (circle.creator_id !== user.id) return json({ error: 'Only the creator can reject another request' }, 403);
    await env.DB.prepare('DELETE FROM circle_join_requests WHERE circle_id = ? AND telegram_id = ?').bind(circleId, targetParam).run();
    return json({ ok: true });
  }

  const { role } = await getMembership(env, circleId, user.id);
  if (role === 'creator') {
    return json({ error: 'The creator cannot leave. Delete the circle instead.' }, 400);
  }
  if (role === 'member') {
    await env.DB.prepare('DELETE FROM circle_members WHERE circle_id = ? AND telegram_id = ?').bind(circleId, user.id).run();
    return json({ ok: true });
  }

  await env.DB.prepare('DELETE FROM circle_join_requests WHERE circle_id = ? AND telegram_id = ?').bind(circleId, user.id).run();
  return json({ ok: true });
};
