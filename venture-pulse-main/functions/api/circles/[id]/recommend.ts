import { Env, json, getSessionUser } from '../../../_lib/auth';
import { MAX_CIRCLE_MEMBERS } from '../../../_lib/options';
import { getMembership, memberCount } from '../../../_lib/circles';

// POST /api/circles/:id/recommend  { username } — any member can nominate someone by their
// Telegram @username (that person must have logged into VenturePulse at least once).
export const onRequestPost: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const circleId = String(params.id);
  const { role } = await getMembership(env, circleId, user.id);
  if (!role) return json({ error: 'Only members can recommend someone' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  const username = typeof (body as any)?.username === 'string' ? (body as any).username.trim().replace(/^@/, '') : '';
  if (!username) return json({ error: 'Enter a Telegram username' }, 400);

  const target = await env.DB.prepare('SELECT telegram_id FROM users WHERE lower(username) = lower(?)')
    .bind(username)
    .first<{ telegram_id: string }>();
  if (!target) return json({ error: `No VenturePulse user found for @${username}. They need to have logged in at least once.` }, 404);

  const already = await getMembership(env, circleId, target.telegram_id);
  if (already.role) return json({ error: `@${username} is already in this circle` }, 400);

  const count = await memberCount(env, circleId);
  if (count >= MAX_CIRCLE_MEMBERS) return json({ error: `This circle is full (max ${MAX_CIRCLE_MEMBERS})` }, 400);

  await env.DB.prepare(
    `INSERT INTO circle_join_requests (circle_id, telegram_id, status, recommended_by, created_at)
     VALUES (?, ?, 'pending', ?, ?)
     ON CONFLICT(circle_id, telegram_id) DO UPDATE SET recommended_by = excluded.recommended_by`
  )
    .bind(circleId, target.telegram_id, user.id, Date.now())
    .run();

  return json({ ok: true });
};
