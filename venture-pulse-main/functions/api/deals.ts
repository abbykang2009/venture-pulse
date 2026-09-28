import { Env, SessionUser, json, getSessionUser } from '../_lib/auth';

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Others'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const LIMITS = { name: 120, rate: 80, city: 80, description: 3000, comment: 1000 };

interface DealRow {
  id: string;
  name: string;
  stage: string;
  rate: string;
  originCity: string;
  hqCity: string;
  description: string;
  imageUrl: string | null;
  postedBy: string | null; // legacy
  posted_by_id: string | null;
  listingType: string | null;
  createdAt: number;
  verifications: number;
  disputes: number;
  myVote: string | null;
}

const DEAL_SELECT = `
  SELECT d.id, d.name, d.stage, d.rate, d.originCity, d.hqCity, d.description, d.imageUrl,
         d.postedBy, d.posted_by_id, d.listingType, d.createdAt,
         (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'verify')  AS verifications,
         (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'dispute') AS disputes,
         (SELECT v.vote_type FROM votes v WHERE v.deal_id = d.id AND v.telegram_id = ?1)   AS myVote
  FROM deals d`;

/** Owner check. Old rows (before login existed) only have a username string, so match on that. */
function ownsDeal(row: { posted_by_id: string | null; postedBy: string | null }, user: SessionUser): boolean {
  if (row.posted_by_id) return row.posted_by_id === user.id;
  return !!user.username && row.postedBy === user.username;
}

/** Listings are anonymous: never expose who posted a deal, only whether it's yours. */
function publicDeal(row: DealRow, user: SessionUser) {
  return {
    id: row.id,
    name: row.name,
    stage: row.stage,
    rate: row.rate,
    originCity: row.originCity,
    hqCity: row.hqCity,
    description: row.description,
    imageUrl: row.imageUrl || '',
    listingType: row.listingType === 'VC' ? 'VC' : 'Business',
    createdAt: row.createdAt,
    verifications: row.verifications,
    disputes: row.disputes,
    myVote: row.myVote,
    isMine: ownsDeal(row, user),
  };
}

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

/* ------------------------------- GET ------------------------------- */

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    const row = await env.DB.prepare(`${DEAL_SELECT} WHERE d.id = ?2`).bind(user.id, id).first<DealRow>();
    if (!row) return json({ error: 'Deal not found' }, 404);

    const { results } = await env.DB.prepare(
      `SELECT id, author, text, created_at AS createdAt
       FROM comments WHERE deal_id = ? ORDER BY created_at ASC LIMIT 300`
    )
      .bind(id)
      .all();

    return json({ ...publicDeal(row, user), comments: results });
  }

  const { results } = await env.DB.prepare(`${DEAL_SELECT} ORDER BY d.createdAt DESC LIMIT 200`)
    .bind(user.id)
    .all<DealRow>();

  return json(results.map((r) => publicDeal(r, user)));
};

/* ------------------------------- POST ------------------------------- */

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const action = new URL(request.url).searchParams.get('action');
  if (action === 'vote') return handleVote(request, env, user);
  if (action === 'comment') return handleComment(request, env, user);
  return handleCreate(request, env, user);
};

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function handleVote(request: Request, env: Env, user: SessionUser) {
  const body = await readJson(request);
  const dealId = typeof body?.dealId === 'string' ? body.dealId : '';
  const voteType = body?.voteType;
  if (!dealId || (voteType !== 'verify' && voteType !== 'dispute')) {
    return json({ error: 'Invalid vote' }, 400);
  }

  const deal = await env.DB.prepare('SELECT id, posted_by_id, postedBy FROM deals WHERE id = ?')
    .bind(dealId)
    .first<{ id: string; posted_by_id: string | null; postedBy: string | null }>();
  if (!deal) return json({ error: 'Deal not found' }, 404);
  if (ownsDeal(deal, user)) return json({ error: "You can't vote on your own listing." }, 403);

  const existing = await env.DB.prepare('SELECT vote_type FROM votes WHERE deal_id = ? AND telegram_id = ?')
    .bind(dealId, user.id)
    .first<{ vote_type: string }>();

  if (existing?.vote_type === voteType) {
    // clicking the same vote again withdraws it
    await env.DB.prepare('DELETE FROM votes WHERE deal_id = ? AND telegram_id = ?').bind(dealId, user.id).run();
    return json({ ok: true, myVote: null });
  }

  await env.DB.prepare(
    `INSERT INTO votes (deal_id, telegram_id, vote_type, created_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(deal_id, telegram_id) DO UPDATE SET vote_type = excluded.vote_type, created_at = excluded.created_at`
  )
    .bind(dealId, user.id, voteType, Date.now())
    .run();
  return json({ ok: true, myVote: voteType });
}

async function handleComment(request: Request, env: Env, user: SessionUser) {
  const body = await readJson(request);
  const dealId = typeof body?.dealId === 'string' ? body.dealId : '';
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, LIMITS.comment) : '';
  if (!dealId || !text) return json({ error: 'Comment cannot be empty' }, 400);

  const deal = await env.DB.prepare('SELECT id FROM deals WHERE id = ?').bind(dealId).first();
  if (!deal) return json({ error: 'Deal not found' }, 404);

  const comment = {
    id: crypto.randomUUID(),
    author: user.username ? `@${user.username}` : user.firstName || 'Investor',
    text,
    createdAt: Date.now(),
  };
  await env.DB.prepare(
    'INSERT INTO comments (id, deal_id, telegram_id, author, text, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(comment.id, dealId, user.id, comment.author, comment.text, comment.createdAt)
    .run();

  return json(comment, 201);
}

async function handleCreate(request: Request, env: Env, user: SessionUser) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Invalid form data' }, 400);
  }

  const name = clean(form.get('name'), LIMITS.name);
  const rate = clean(form.get('rate'), LIMITS.rate);
  const originCity = clean(form.get('originCity'), LIMITS.city);
  const hqCity = clean(form.get('hqCity'), LIMITS.city);
  const description = clean(form.get('description'), LIMITS.description);
  const stageRaw = clean(form.get('stage'), 40);
  const stage = STAGES.includes(stageRaw) ? stageRaw : 'Others';

  if (!name || !rate || !originCity || !hqCity || !description) {
    return json({ error: 'Missing required deal fields' }, 400);
  }

  // Only admins may create VC listings; the client flag is ignored for everyone else.
  const listingType = user.isAdmin && form.get('listingType') === 'VC' ? 'VC' : 'Business';

  let imageUrl = '';
  let imageKey: string | null = null;
  const file = form.get('file') as unknown as File | string | null;
  if (file && typeof file !== 'string' && file.size > 0) {
    const ext = IMAGE_EXT[file.type];
    if (!ext) return json({ error: 'Image must be JPG, PNG, WEBP or GIF' }, 400);
    if (file.size > MAX_IMAGE_BYTES) return json({ error: 'Image must be under 5 MB' }, 400);

    imageKey = `${crypto.randomUUID()}.${ext}`;
    await env.BUCKET.put(imageKey, file.stream(), { httpMetadata: { contentType: file.type } });
    imageUrl = `/api/image/${imageKey}`;
  }

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  try {
    await env.DB.prepare(
      `INSERT INTO deals (id, name, stage, rate, originCity, hqCity, description, imageUrl, postedBy, listingType, posted_by_id, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, name, stage, rate, originCity, hqCity, description, imageUrl, user.username || user.firstName, listingType, user.id, createdAt)
      .run();
  } catch (err) {
    if (imageKey) await env.BUCKET.delete(imageKey); // don't leave orphaned uploads
    throw err;
  }

  return json(
    { id, name, stage, rate, originCity, hqCity, description, imageUrl, listingType, createdAt,
      verifications: 0, disputes: 0, myVote: null, isMine: true },
    201
  );
}

/* ------------------------------ DELETE ------------------------------ */

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);

  const deal = await env.DB.prepare('SELECT id, imageUrl, posted_by_id, postedBy FROM deals WHERE id = ?')
    .bind(id)
    .first<{ id: string; imageUrl: string | null; posted_by_id: string | null; postedBy: string | null }>();
  if (!deal) return json({ error: 'Deal not found' }, 404);
  if (!user.isAdmin && !ownsDeal(deal, user)) return json({ error: 'Not allowed' }, 403);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM votes WHERE deal_id = ?').bind(id),
    env.DB.prepare('DELETE FROM comments WHERE deal_id = ?').bind(id),
    env.DB.prepare('DELETE FROM deals WHERE id = ?').bind(id),
  ]);

  if (deal.imageUrl?.startsWith('/api/image/')) {
    await env.BUCKET.delete(deal.imageUrl.slice('/api/image/'.length));
  }
  return json({ ok: true });
};
