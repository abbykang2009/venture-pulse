import { Env, json, getSessionUser, isAdmin } from '../_lib/auth';

interface UserRow {
  telegram_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  status: string;
  postCount: number;
}

// GET /api/users — every registered user, for the platform's Users directory.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const viewer = await getSessionUser(request, env);
  if (!viewer) return json({ error: 'Login required' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT u.telegram_id, u.username, u.first_name, u.last_name, u.photo_url, u.status,
            (SELECT COUNT(*) FROM deals d WHERE d.posted_by_id = u.telegram_id) AS postCount
     FROM users u
     ORDER BY u.created_at DESC
     LIMIT 500`
  ).all<UserRow>();

  return json(
    results.map((r) => ({
      id: r.telegram_id,
      username: r.username,
      firstName: r.first_name,
      lastName: r.last_name,
      photoUrl: r.photo_url,
      status: r.status || 'active',
      isAdmin: isAdmin(env, r.telegram_id, r.username),
      postCount: r.postCount,
    }))
  );
};
