import { Env } from './auth';

export interface Membership {
  role: 'creator' | 'member' | null;
}

export async function getMembership(env: Env, circleId: string, telegramId: string): Promise<Membership> {
  const row = await env.DB.prepare('SELECT role FROM circle_members WHERE circle_id = ? AND telegram_id = ?')
    .bind(circleId, telegramId)
    .first<{ role: 'creator' | 'member' }>();
  return { role: row?.role ?? null };
}

export async function memberCount(env: Env, circleId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM circle_members WHERE circle_id = ?')
    .bind(circleId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Basic public info for a set of Telegram IDs, keyed by id. Missing/deleted users are simply absent. */
export async function usersByIds(env: Env, ids: string[]): Promise<Map<string, { username: string | null; firstName: string; photoUrl: string | null }>> {
  const map = new Map<string, { username: string | null; firstName: string; photoUrl: string | null }>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return map;
  const placeholders = unique.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT telegram_id, username, first_name, photo_url FROM users WHERE telegram_id IN (${placeholders})`
  )
    .bind(...unique)
    .all<{ telegram_id: string; username: string | null; first_name: string; photo_url: string | null }>();
  for (const r of results) {
    map.set(r.telegram_id, { username: r.username, firstName: r.first_name, photoUrl: r.photo_url });
  }
  return map;
}
