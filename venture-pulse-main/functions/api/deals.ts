import { Env, SessionUser, json, getSessionUser } from '../_lib/auth';
import {
  STAGES, ORIGINS, LOCATIONS, CURRENCIES, ADMIN_TAGS, MAX_MEDIA, MAX_BUDGET, IMAGE_TYPES, VIDEO_TYPES,
} from '../_lib/options';
import { getMembership } from '../_lib/circles';

const LIMITS = { name: 120, description: 3000, comment: 1000, contact: 200, social: 300 };

interface DealRow {
  id: string;
  name: string;
  stage: string | null;
  rate: string | null;
  budget: number | null;
  currency: string | null;
  originCity: string | null; // holds "Origin"
  hqCity: string | null; // holds "Current Location"
  description: string | null;
  imageUrl: string | null; // legacy single image
  postedBy: string | null; // legacy
  posted_by_id: string | null;
  listingType: string | null;
  createdAt: number;
  verifications: number;
  disputes: number;
  myVote: string | null;
  circle_id: string | null;
  also_global: number;
  contact_info: string | null;
  social_link: string | null;
  contact_public: number;
  coverKey: string | null;
  coverKind: string | null;
  mediaCount: number;
}

// NOTE: column originCity stores "Origin" and hqCity stores "Current Location" (kept to avoid a risky table migration).
const DEAL_SELECT = `
  SELECT d.id, d.name, d.stage, d.rate, d.budget, d.currency, d.originCity, d.hqCity, d.description, d.imageUrl,
         d.postedBy, d.posted_by_id, d.listingType, d.circle_id, d.also_global, d.contact_info, d.social_link, d.contact_public, d.createdAt,
         (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'verify')  AS verifications,
         (SELECT COUNT(*) FROM votes v WHERE v.deal_id = d.id AND v.vote_type = 'dispute') AS disputes,
         (SELECT v.vote_type FROM votes v WHERE v.deal_id = d.id AND v.telegram_id = ?1)   AS myVote,
         (SELECT m.media_key FROM deal_media m WHERE m.deal_id = d.id ORDER BY m.position LIMIT 1) AS coverKey,
         (SELECT m.kind      FROM deal_media m WHERE m.deal_id = d.id ORDER BY m.position LIMIT 1) AS coverKind,
         (SELECT COUNT(*)    FROM deal_media m WHERE m.deal_id = d.id) AS mediaCount
  FROM deals d`;

/** Owner check. Old rows (before login existed) only have a username string, so match on that. */
function ownsDeal(row: { posted_by_id: string | null; postedBy: string | null }, user: SessionUser): boolean {
  if (row.posted_by_id) return row.posted_by_id === user.id;
  return !!user.username && row.postedBy === user.username;
}

/** Only admin posts carry a tag; everyone else gets '' (no ribbon). */
function tagOf(row: DealRow): '' | 'Business' | 'VC' {
  if (row.listingType === 'Business') return 'Business';
  if (row.listingType === 'VC') return 'VC';
  return '';
}

/** The poster's Telegram ID is exposed (task: clickable link to their public profile); their name/username is not. */
function publicDeal(row: DealRow, user: SessionUser) {
  const cover = row.coverKey
    ? { url: `/api/image/${row.coverKey}`, kind: row.coverKind === 'video' ? 'video' : 'image' }
    : row.imageUrl
      ? { url: row.imageUrl, kind: 'image' }
      : null;
  const isMine = ownsDeal(row, user);
  // Contact details are hidden unless the poster made them public, or you're the poster/an admin.
  const showContact = !!row.contact_public || isMine || user.isAdmin;
  const hasContact = !!(row.contact_info || row.social_link);
  return {
    id: row.id,
    name: row.name,
    postedById: row.posted_by_id || null,
    circleId: row.circle_id || null,
    alsoGlobal: !!row.also_global,
    contact: hasContact && showContact ? { info: row.contact_info || '', social: row.social_link || '', public: !!row.contact_public } : null,
    stage: row.stage || '',
    origin: row.originCity || '',
    location: row.hqCity || '',
    budget: row.budget,
    currency: row.currency,
    rate: row.rate || '', // legacy free-text price, shown only when there's no budget
    description: row.description || '',
    tag: tagOf(row),
    createdAt: row.createdAt,
    verifications: row.verifications,
    disputes: row.disputes,
    myVote: row.myVote,
    isMine,
    cover,
    mediaCount: row.mediaCount || (cover ? 1 : 0),
  };
}

/* ------------------------------- GET ------------------------------- */

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  const circleId = params.get('circleId');

  if (id) {
    const row = await env.DB.prepare(`${DEAL_SELECT} WHERE d.id = ?2`).bind(user.id, id).first<DealRow>();
    if (!row) return json({ error: 'Deal not found' }, 404);

    if (row.circle_id && !row.also_global) {
      const { role } = await getMembership(env, row.circle_id, user.id);
      if (!role && !user.isAdmin) return json({ error: 'Deal not found' }, 404);
    }

    const [mediaRes, commentRes] = await env.DB.batch([
      env.DB.prepare('SELECT media_key, kind FROM deal_media WHERE deal_id = ? ORDER BY position').bind(id),
      env.DB.prepare(
        `SELECT id, author, text, created_at AS createdAt FROM comments
         WHERE deal_id = ? ORDER BY created_at ASC LIMIT 300`
      ).bind(id),
    ]);

    let media = (mediaRes.results as { media_key: string; kind: string }[]).map((m) => ({
      url: `/api/image/${m.media_key}`,
      kind: m.kind === 'video' ? 'video' : 'image',
    }));
    if (media.length === 0 && row.imageUrl) media = [{ url: row.imageUrl, kind: 'image' }];

    return json({ ...publicDeal(row, user), media, comments: commentRes.results });
  }

  if (circleId) {
    const { role } = await getMembership(env, circleId, user.id);
    if (!role && !user.isAdmin) return json({ error: 'Login required' }, 401);
    const { results } = await env.DB.prepare(`${DEAL_SELECT} WHERE d.circle_id = ?2 ORDER BY d.createdAt DESC LIMIT 200`)
      .bind(user.id, circleId)
      .all<DealRow>();
    return json(results.map((r) => publicDeal(r, user)));
  }

  // Global feed never includes deals shared privately inside a circle.
  const { results } = await env.DB.prepare(`${DEAL_SELECT} WHERE (d.circle_id IS NULL OR d.also_global = 1) ORDER BY d.createdAt DESC LIMIT 200`)
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

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function handleCreate(request: Request, env: Env, user: SessionUser) {
  if (user.status === 'restricted') {
    return json({ error: 'Your account is restricted and cannot post new opportunities.' }, 403);
  }

  const body = await readJson(request);
  if (!body) return json({ error: 'Invalid request' }, 400);

  const name = str(body.name, LIMITS.name);
  const stage = str(body.stage, 40);
  const origin = str(body.origin, 40);
  const location = str(body.location, 40);
  const currency = str(body.currency, 10);
  const description = str(body.description, LIMITS.description); // optional
  const budgetNum = typeof body.budget === 'string' && body.budget.trim() !== '' ? Number(body.budget) : body.budget;

  if (!name) return json({ error: 'Name is required' }, 400);
  if (!STAGES.includes(stage)) return json({ error: 'Please choose a Stage' }, 400);
  if (!ORIGINS.includes(origin)) return json({ error: 'Please choose an Origin' }, 400);
  if (!LOCATIONS.includes(location)) return json({ error: 'Please choose a Current Location' }, 400);
  if (!CURRENCIES.includes(currency)) return json({ error: 'Please choose a Currency' }, 400);
  if (typeof budgetNum !== 'number' || !Number.isInteger(budgetNum) || budgetNum < 0 || budgetNum > MAX_BUDGET) {
    return json({ error: `Budget must be a whole number from 0 to ${MAX_BUDGET}` }, 400);
  }

  // Only admins can tag a post as Business/VC; for everyone else the tag is ignored.
  const wanted = str(body.listingType, 20);
  const listingType = user.isAdmin && ADMIN_TAGS.includes(wanted) ? wanted : '';

  // Optional: share into a Private Circle. Must be a member. Can ALSO be shown in the global feed.
  const circleId = str(body.circleId, 40);
  if (circleId) {
    const { role } = await getMembership(env, circleId, user.id);
    if (!role) return json({ error: 'You must be a member of that circle to post there' }, 403);
  }
  const alsoGlobal = circleId ? !!body.alsoGlobal : true;

  // Optional contact/social details; hidden from other viewers unless contactPublic is set.
  const contactInfo = str(body.contactInfo, LIMITS.contact);
  const socialLink = str(body.socialLink, LIMITS.social);
  const contactPublic = !!body.contactPublic;

  // Media: keys returned by /api/upload. Each must exist, belong to this user and not be used already.
  const rawKeys = Array.isArray(body.mediaKeys) ? body.mediaKeys : [];
  if (rawKeys.length > MAX_MEDIA) return json({ error: `You can add up to ${MAX_MEDIA} photos/videos` }, 400);
  const keys: { key: string; kind: 'image' | 'video' }[] = [];
  for (const k of rawKeys) {
    if (typeof k !== 'string' || !/^[0-9a-f-]{36}\.[a-z0-9]{3,4}$/.test(k) || keys.some((x) => x.key === k)) {
      return json({ error: 'Invalid media' }, 400);
    }
    const ext = k.split('.')[1];
    const kind = Object.values(VIDEO_TYPES).includes(ext) ? 'video' : Object.values(IMAGE_TYPES).includes(ext) ? 'image' : null;
    if (!kind) return json({ error: 'Invalid media' }, 400);

    const head = await env.BUCKET.head(k);
    if (!head || head.customMetadata?.owner !== user.id) return json({ error: 'Media upload not found' }, 400);
    const used = await env.DB.prepare('SELECT 1 FROM deal_media WHERE media_key = ?').bind(k).first();
    if (used) return json({ error: 'Media already in use' }, 400);
    keys.push({ key: k, kind });
  }

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const rate = `${currency} ${budgetNum}`; // legacy text column kept filled for older code/rows
  const coverUrl = keys.length ? `/api/image/${keys[0].key}` : '';

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO deals (id, name, stage, rate, budget, currency, originCity, hqCity, description, imageUrl, postedBy, listingType, posted_by_id, circle_id, also_global, contact_info, social_link, contact_public, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, name, stage, rate, budgetNum, currency, origin, location, description, coverUrl, user.username || user.firstName, listingType, user.id, circleId || null, alsoGlobal ? 1 : 0, contactInfo || null, socialLink || null, contactPublic ? 1 : 0, createdAt),
    ...keys.map((m, i) =>
      env.DB.prepare('INSERT INTO deal_media (deal_id, position, media_key, kind) VALUES (?, ?, ?, ?)').bind(id, i, m.key, m.kind)
    ),
  ]);

  return json({ id, createdAt, circleId: circleId || null }, 201);
}

/* -------------------------------- PUT -------------------------------- */

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);

  const existing = await env.DB.prepare(
    'SELECT posted_by_id, postedBy, listingType, circle_id FROM deals WHERE id = ?'
  )
    .bind(id)
    .first<{ posted_by_id: string | null; postedBy: string | null; listingType: string | null; circle_id: string | null }>();
  if (!existing) return json({ error: 'Deal not found' }, 404);
  if (!user.isAdmin && !ownsDeal(existing, user)) return json({ error: 'Not allowed' }, 403);

  const body = await readJson(request);
  if (!body) return json({ error: 'Invalid request' }, 400);

  const name = str(body.name, LIMITS.name);
  const stage = str(body.stage, 40);
  const origin = str(body.origin, 40);
  const location = str(body.location, 40);
  const currency = str(body.currency, 10);
  const description = str(body.description, LIMITS.description); // optional
  const budgetNum = typeof body.budget === 'string' && body.budget.trim() !== '' ? Number(body.budget) : body.budget;

  if (!name) return json({ error: 'Name is required' }, 400);
  if (!STAGES.includes(stage)) return json({ error: 'Please choose a Stage' }, 400);
  if (!ORIGINS.includes(origin)) return json({ error: 'Please choose an Origin' }, 400);
  if (!LOCATIONS.includes(location)) return json({ error: 'Please choose a Current Location' }, 400);
  if (!CURRENCIES.includes(currency)) return json({ error: 'Please choose a Currency' }, 400);
  if (typeof budgetNum !== 'number' || !Number.isInteger(budgetNum) || budgetNum < 0 || budgetNum > MAX_BUDGET) {
    return json({ error: `Budget must be a whole number from 0 to ${MAX_BUDGET}` }, 400);
  }

  // Only admins can change the Business/VC tag; anyone else keeps whatever it already was.
  const wanted = str(body.listingType, 20);
  const listingType = user.isAdmin ? (ADMIN_TAGS.includes(wanted) ? wanted : '') : existing.listingType || '';

  // Only meaningful if the deal actually belongs to a circle; otherwise it's always in the global feed.
  const alsoGlobal = existing.circle_id ? !!body.alsoGlobal : true;
  const contactInfo = str(body.contactInfo, LIMITS.contact);
  const socialLink = str(body.socialLink, LIMITS.social);
  const contactPublic = !!body.contactPublic;

  const { results: oldMediaRows } = await env.DB.prepare('SELECT media_key FROM deal_media WHERE deal_id = ?')
    .bind(id)
    .all<{ media_key: string }>();
  const oldKeys = new Set(oldMediaRows.map((r) => r.media_key));

  const rawKeys = Array.isArray(body.mediaKeys) ? body.mediaKeys : [];
  if (rawKeys.length > MAX_MEDIA) return json({ error: `You can add up to ${MAX_MEDIA} photos/videos` }, 400);
  const keys: { key: string; kind: 'image' | 'video' }[] = [];
  for (const k of rawKeys) {
    if (typeof k !== 'string' || !/^[0-9a-f-]{36}\.[a-z0-9]{3,4}$/.test(k) || keys.some((x) => x.key === k)) {
      return json({ error: 'Invalid media' }, 400);
    }
    const ext = k.split('.')[1];
    const kind = Object.values(VIDEO_TYPES).includes(ext) ? 'video' : Object.values(IMAGE_TYPES).includes(ext) ? 'image' : null;
    if (!kind) return json({ error: 'Invalid media' }, 400);

    const head = await env.BUCKET.head(k);
    if (!head || head.customMetadata?.owner !== user.id) return json({ error: 'Media upload not found' }, 400);
    if (!oldKeys.has(k)) {
      const used = await env.DB.prepare('SELECT 1 FROM deal_media WHERE media_key = ?').bind(k).first();
      if (used) return json({ error: 'Media already in use' }, 400);
    }
    keys.push({ key: k, kind });
  }

  const removedKeys = [...oldKeys].filter((k) => !keys.some((x) => x.key === k));
  const rate = `${currency} ${budgetNum}`; // legacy text column kept filled for older code/rows
  const coverUrl = keys.length ? `/api/image/${keys[0].key}` : '';

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE deals SET name = ?, stage = ?, rate = ?, budget = ?, currency = ?, originCity = ?, hqCity = ?, description = ?, imageUrl = ?, listingType = ?, also_global = ?, contact_info = ?, social_link = ?, contact_public = ? WHERE id = ?`
    ).bind(name, stage, rate, budgetNum, currency, origin, location, description, coverUrl, listingType, alsoGlobal ? 1 : 0, contactInfo || null, socialLink || null, contactPublic ? 1 : 0, id),
    env.DB.prepare('DELETE FROM deal_media WHERE deal_id = ?').bind(id),
    ...keys.map((m, i) =>
      env.DB.prepare('INSERT INTO deal_media (deal_id, position, media_key, kind) VALUES (?, ?, ?, ?)').bind(id, i, m.key, m.kind)
    ),
  ]);

  if (removedKeys.length) await env.BUCKET.delete(removedKeys);

  return json({ ok: true });
};

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

  const { results } = await env.DB.prepare('SELECT media_key FROM deal_media WHERE deal_id = ?')
    .bind(id)
    .all<{ media_key: string }>();
  const mediaKeys = results.map((r) => r.media_key);
  if (deal.imageUrl?.startsWith('/api/image/')) mediaKeys.push(deal.imageUrl.slice('/api/image/'.length));

  await env.DB.batch([
    env.DB.prepare('DELETE FROM votes WHERE deal_id = ?').bind(id),
    env.DB.prepare('DELETE FROM comments WHERE deal_id = ?').bind(id),
    env.DB.prepare('DELETE FROM deal_media WHERE deal_id = ?').bind(id),
    env.DB.prepare('DELETE FROM deals WHERE id = ?').bind(id),
  ]);

  if (mediaKeys.length) await env.BUCKET.delete([...new Set(mediaKeys)]);
  return json({ ok: true });
};
