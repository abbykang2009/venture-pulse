import { json, clearSessionCookie } from '../../_lib/auth';

// POST /api/auth/logout
export const onRequestPost: PagesFunction = async () => {
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
};
