import { Env, json, getSessionUser } from '../../_lib/auth';

// GET /api/auth/me — current user or { user: null }
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  return json({ user });
};
