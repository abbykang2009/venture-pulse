import { Env, json, verifyTelegramLogin, createSessionToken, sessionCookie, isAdmin } from '../../_lib/auth';

// POST /api/auth/telegram  — body: the object the Telegram Login Widget hands to data-onauth
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.TELEGRAM_BOT_TOKEN || !env.SESSION_SECRET) {
    return json({ error: 'Login is not configured on the server (missing secrets).' }, 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const tg = await verifyTelegramLogin(body, env.TELEGRAM_BOT_TOKEN);
  if (!tg) return json({ error: 'Telegram login could not be verified. Please try again.' }, 401);

  const now = Date.now();
  try {
    await env.DB.prepare(
      `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, created_at, last_login_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
       ON CONFLICT(telegram_id) DO UPDATE SET
         username = excluded.username,
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         photo_url = excluded.photo_url,
         last_login_at = excluded.last_login_at`
    )
      .bind(tg.id, tg.username, tg.firstName, tg.lastName, tg.photoUrl, now)
      .run();
  } catch (err: any) {
    return json({ error: `Database error: ${err?.message || 'could not save profile'}` }, 500);
  }

  const row = await env.DB.prepare('SELECT status FROM users WHERE telegram_id = ?')
    .bind(tg.id)
    .first<{ status: string }>();
  if (row?.status === 'banned') {
    return json({ error: 'This account has been banned from VenturePulse.' }, 403);
  }

  const token = await createSessionToken(tg.id, env.SESSION_SECRET);
  return json(
    { user: { ...tg, isAdmin: isAdmin(env, tg.id, tg.username), status: row?.status || 'active' } },
    200,
    { 'Set-Cookie': sessionCookie(token) }
  );
};
