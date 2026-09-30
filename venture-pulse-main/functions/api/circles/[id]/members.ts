import { Env, json, getSessionUser } from '../../../_lib/auth';

// DELETE /api/circles/:id/members  { telegramId } — creator removes a member (not themselves).
export const onRequestDelete: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const circleId = String(params.id);
  const circle = await env.DB.prepare('SELECT creator_id FROM circles WHERE id = ?')
    .bind(circleId)
    .first<{ creator_id: string }>();
  if (!circle) return json({ error: 'Circle not found' }, 404);
  if (circle.creator_id !== user.id) return json({ error: 'Only the creator can remove members' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  const telegramId = typeof (body as any)?.telegramId === 'string' ? (body as any).telegramId : '';
  if (!telegramId) return json({ error: 'Missing telegramId' }, 400);
  if (telegramId === user.id) return json({ error: "The creator can't remove themselves. Delete the circle instead." }, 400);

  await env.DB.prepare('DELETE FROM circle_members WHERE circle_id = ? AND telegram_id = ?').bind(circleId, telegramId).run();
  return json({ ok: true });
};
