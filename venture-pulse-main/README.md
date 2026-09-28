# Venture Pulse (latest version)

React + Vite frontend, Cloudflare Pages Functions backend, D1 (SQL) and R2 (images).
Login is Telegram-only via **@VenturePulseAuthBot**; every profile, post, vote and comment is tied to the verified Telegram ID.

## One-time setup

### 1. Bindings (Pages → Settings → Bindings)
| Type | Variable name | Points to |
|------|---------------|-----------|
| D1 database | `DB` | your D1 database |
| R2 bucket | `BUCKET` | your R2 bucket |

The variable names must match exactly.

### 2. Secrets / variables (Pages → Settings → Variables and Secrets → Production)
| Name | Type | Value |
|------|------|-------|
| `TELEGRAM_BOT_TOKEN` | Secret | token from @BotFather (`/mybots` → bot → API Token) |
| `SESSION_SECRET` | Secret | any long random string (`openssl rand -hex 32`) |
| `ADMIN_TELEGRAM_IDS` | Text | comma-separated numeric Telegram IDs, e.g. `123456789,987654321` |
| `ADMIN_HANDLES` | Text (optional) | fallback, comma-separated usernames without `@` |

Your numeric Telegram ID is shown under your name in the profile popup after you log in.
Prefer IDs over handles: usernames can be changed or released, IDs can't.

### 3. Database
Paste `migrations/0001_init.sql` into the D1 console (Workers & Pages → D1 → your DB → Console), or:
`npx wrangler d1 execute <DB_NAME> --remote --file=migrations/0001_init.sql`

If your `deals` table already existed, also run the statements in `migrations/0002_upgrade_existing_deals.sql` one at a time
(ignore "duplicate column name" errors).

### 4. Telegram domain
In @BotFather: `/setdomain` → pick the bot → `venture-pulse.pages.dev`. Login only works on that exact domain
(not on `*.pages.dev` preview URLs).

### 5. Deploy
Build command `npm run build`, output directory `dist`. **Redeploy after adding secrets** — they only apply to new deployments.

## How auth works
1. Telegram widget returns a signed payload to the browser.
2. `POST /api/auth/telegram` recomputes the HMAC using SHA-256(bot token) and rejects anything forged, altered or older than 15 minutes.
3. The user is upserted into `users` (keyed by Telegram ID) and an HttpOnly, Secure, SameSite=Lax session cookie is set (30 days).
4. All `/api/deals` and `/api/image` requests read identity from that cookie — never from anything the client sends.

## Local checks
`npm run typecheck` · `npm run build`
