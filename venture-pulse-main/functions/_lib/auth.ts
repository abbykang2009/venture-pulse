export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  /** Bot token from @BotFather. Secret. */
  TELEGRAM_BOT_TOKEN: string;
  /** Long random string used to sign session cookies. Secret. */
  SESSION_SECRET: string;
  /** Comma-separated numeric Telegram IDs that are admins (preferred). */
  ADMIN_TELEGRAM_IDS?: string;
  /** Comma-separated Telegram usernames that are admins (fallback; usernames can change hands). */
  ADMIN_HANDLES?: string;
}

export interface TelegramUser {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
}

export type AccountStatus = 'active' | 'restricted' | 'banned';

export interface SessionUser extends TelegramUser {
  isAdmin: boolean;
  status: AccountStatus;
}

export const SESSION_COOKIE = 'vp_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const LOGIN_MAX_AGE_SECONDS = 15 * 60; // Telegram payload must be this fresh

const enc = new TextEncoder();

/* ---------- small utils ---------- */

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function toB64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hmacKey(raw: BufferSource, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

/* ---------- Telegram Login Widget verification ---------- */
/* https://core.telegram.org/widgets/login#checking-authorization */

export async function verifyTelegramLogin(
  payload: unknown,
  botToken: string
): Promise<TelegramUser | null> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const { hash, ...rest } = payload as Record<string, unknown>;

  if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/i.test(hash)) return null;

  const entries: [string, string][] = [];
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined || v === null) continue;
    if (typeof v !== 'string' && typeof v !== 'number') return null;
    entries.push([k, String(v)]);
  }
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  // secret key = SHA256(bot_token); signature = HMAC_SHA256(secret, data_check_string)
  const secret = await crypto.subtle.digest('SHA-256', enc.encode(botToken));
  const key = await hmacKey(secret, 'verify');
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    fromHex(hash.toLowerCase()),
    enc.encode(dataCheckString)
  );
  if (!valid) return null;

  const fields = Object.fromEntries(entries);
  const authDate = Number(fields.auth_date);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate) || now - authDate > LOGIN_MAX_AGE_SECONDS || authDate - now > 60) {
    return null;
  }
  if (!/^\d+$/.test(fields.id ?? '')) return null;

  return {
    id: fields.id,
    username: fields.username || null,
    firstName: fields.first_name || '',
    lastName: fields.last_name || null,
    photoUrl: fields.photo_url || null,
  };
}

/* ---------- Signed session cookie (stateless) ---------- */

export async function createSessionToken(telegramId: string, secret: string): Promise<string> {
  const payload = toB64Url(
    enc.encode(JSON.stringify({ sub: telegramId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }))
  );
  const key = await hmacKey(enc.encode(secret), 'sign');
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return `${payload}.${toB64Url(sig)}`;
}

async function readSessionToken(token: string, secret: string): Promise<string | null> {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const key = await hmacKey(enc.encode(secret), 'verify');
    const ok = await crypto.subtle.verify('HMAC', key, fromB64Url(sig), enc.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64Url(payload)));
    if (typeof data.sub !== 'string' || typeof data.exp !== 'number') return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.sub;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

/* ---------- Admin + current user ---------- */

function csv(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((s) => s.trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean);
}

export function isAdmin(env: Env, telegramId: string, username: string | null): boolean {
  if (csv(env.ADMIN_TELEGRAM_IDS).includes(telegramId)) return true;
  return !!username && csv(env.ADMIN_HANDLES).includes(username.toLowerCase());
}

/** Returns the logged-in user (from a valid signed cookie + existing DB row), or null. */
export async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  if (!env.SESSION_SECRET) return null;
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const telegramId = await readSessionToken(token, env.SESSION_SECRET);
  if (!telegramId) return null;

  const row = await env.DB.prepare(
    'SELECT telegram_id, username, first_name, last_name, photo_url, status FROM users WHERE telegram_id = ?'
  )
    .bind(telegramId)
    .first<{
      telegram_id: string;
      username: string | null;
      first_name: string;
      last_name: string | null;
      photo_url: string | null;
      status: AccountStatus;
    }>();
  if (!row) return null;
  // A banned account is logged out immediately, even with a still-valid cookie.
  if (row.status === 'banned') return null;

  return {
    id: row.telegram_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    isAdmin: isAdmin(env, row.telegram_id, row.username),
    status: row.status || 'active',
  };
}
