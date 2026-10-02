import { Env, json, getSessionUser } from '../../_lib/auth';
import { STAGES, ORIGINS, LOCATIONS, CURRENCIES, ADMIN_TAGS, MAX_BUDGET } from '../../_lib/options';

interface RawRow {
  name?: string;
  stage?: string;
  origin?: string;
  location?: string;
  budget?: string | number;
  currency?: string;
  description?: string;
  contactInfo?: string;
  socialLink?: string;
  contactPublic?: boolean;
  listingType?: string;
  circleName?: string;
  alsoGlobal?: boolean;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// POST /api/deals/bulk  { rows: RawRow[] } — admin only. Creates listings with no media;
// admins attach photos afterward through the normal edit flow.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Login required' }, 401);
  if (!user.isAdmin) return json({ error: 'Admin access required' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  const rows = Array.isArray((body as any)?.rows) ? ((body as any).rows as RawRow[]) : null;
  if (!rows || rows.length === 0) return json({ error: 'No rows to import' }, 400);
  if (rows.length > 200) return json({ error: 'Import is limited to 200 rows at a time' }, 400);

  // Resolve circle names the admin is actually a member of, once, up front.
  const { results: myCircles } = await env.DB.prepare(
    `SELECT c.id, c.name FROM circles c JOIN circle_members m ON m.circle_id = c.id WHERE m.telegram_id = ?`
  )
    .bind(user.id)
    .all<{ id: string; name: string }>();
  const circleByName = new Map(myCircles.map((c) => [c.name.trim().toLowerCase(), c.id]));

  const created: { row: number; id: string; name: string }[] = [];
  const errors: { row: number; error: string }[] = [];
  const inserts: unknown[] = [];
  const now = Date.now();

  rows.forEach((raw, i) => {
    const rowNum = i + 1;
    const name = str(raw.name, 120);
    const stage = str(raw.stage, 40);
    const origin = str(raw.origin, 40);
    const location = str(raw.location, 40);
    const currency = str(raw.currency, 10);
    const description = str(raw.description, 3000);
    const contactInfo = str(raw.contactInfo, 200);
    const socialLink = str(raw.socialLink, 300);
    const budgetNum = typeof raw.budget === 'string' ? Number(raw.budget.replace(/[^0-9.-]/g, '')) : raw.budget;

    if (!name) return errors.push({ row: rowNum, error: 'Name is required' });
    if (!STAGES.includes(stage)) return errors.push({ row: rowNum, error: `Stage "${raw.stage || ''}" is not a valid option` });
    if (!ORIGINS.includes(origin)) return errors.push({ row: rowNum, error: `Origin "${raw.origin || ''}" is not a valid option` });
    if (!LOCATIONS.includes(location)) return errors.push({ row: rowNum, error: `Location "${raw.location || ''}" is not a valid option` });
    if (!CURRENCIES.includes(currency)) return errors.push({ row: rowNum, error: `Currency "${raw.currency || ''}" is not a valid option` });
    if (typeof budgetNum !== 'number' || !Number.isFinite(budgetNum) || !Number.isInteger(budgetNum) || budgetNum < 0 || budgetNum > MAX_BUDGET) {
      return errors.push({ row: rowNum, error: `Budget must be a whole number from 0 to ${MAX_BUDGET}` });
    }

    let circleId: string | null = null;
    const circleName = str(raw.circleName, 80);
    if (circleName) {
      const match = circleByName.get(circleName.toLowerCase());
      if (!match) return errors.push({ row: rowNum, error: `You're not a member of a circle named "${raw.circleName}"` });
      circleId = match;
    }
    const alsoGlobal = circleId ? !!raw.alsoGlobal : true;

    const wanted = str(raw.listingType, 20);
    const listingType = ADMIN_TAGS.includes(wanted) ? wanted : '';
    const contactPublic = !!raw.contactPublic;

    const id = crypto.randomUUID();
    const rate = `${currency} ${budgetNum}`;
    inserts.push(
      env.DB.prepare(
        `INSERT INTO deals (id, name, stage, rate, budget, currency, originCity, hqCity, description, imageUrl, postedBy, listingType, posted_by_id, circle_id, also_global, contact_info, social_link, contact_public, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, name, stage, rate, budgetNum, currency, origin, location, description,
        user.username || user.firstName, listingType, user.id, circleId, alsoGlobal ? 1 : 0,
        contactInfo || null, socialLink || null, contactPublic ? 1 : 0, now + i
      )
    );
    created.push({ row: rowNum, id, name });
  });

  if (inserts.length) await env.DB.batch(inserts as any);

  return json({ created, errors }, created.length ? 201 : 400);
};
