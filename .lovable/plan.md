## Goal

Turn Samsarikan Undo? into a real multi-user live platform with:
1. **IP-based "username claim" auth** (no email/OTP)
2. **Admin panel** at `/admin` gated by password `2689`
3. **Live realtime sync** of posts, comments, votes, communities, rooms across all users

To do this we must enable **Lovable Cloud** (managed Postgres + Realtime + server functions). Right now everything lives in `localStorage`, so nothing is shared between users.

---

## 1. Enable Lovable Cloud

Provision the backend. This gives us Postgres, Realtime channels, server functions, and a service-role admin client — no Gmail/OAuth involved.

## 2. Database schema (migration)

Tables:
- `identities` — `id`, `username` (unique, citext), `created_at`, `is_banned`
- `ip_bindings` — `ip_hash` (PK), `identity_id` (FK), `first_seen`, `last_seen`, `raw_ip` (admin-only)
- `communities` — `slug` (PK), `name`, `malayalam`, `description`, `icon`, `color`, `created_by`, `created_at`
- `posts` — `id`, `community_slug`, `author_id`, `anonymous`, `title`, `body`, `type`, `image`, `poll` (jsonb), `voice` (jsonb), `tags` (text[]), `nsfw`, `upvotes`, `created_at`, `deleted`
- `comments` — `id`, `post_id`, `parent_id`, `author_id`, `anonymous`, `body`, `upvotes`, `created_at`, `deleted`
- `votes` — (`user_id`, `post_id`) unique, `dir` (-1/1)
- `reactions` — (`user_id`, `post_id`) unique, `reaction` text
- `live_rooms` — `id`, `title`, `topic`, `host_id`, `color`, `created_at`, `ended_at`
- `room_listeners` — (`room_id`, `user_id`) unique, `joined_at`

RLS: public read on posts/comments/communities/rooms; writes require a valid `identity_id` cookie. Service role bypasses for admin.

## 3. IP-claim authentication

No Supabase Auth. Custom flow via server functions:

- `POST /api/auth/whoami` — reads client IP from request headers (`cf-connecting-ip` / `x-forwarded-for`), hashes it with a server secret, looks up `ip_bindings`.
  - If found → returns the bound `identity` and sets an httpOnly cookie `sk_id=<identity_id>` (1 year).
  - If not found → returns `{ needsUsername: true }`.
- `POST /api/auth/claim` — body `{ username }`. Validates (3–20 chars, `[a-zA-Z0-9_]`), checks uniqueness, creates `identity`, creates `ip_binding`, sets cookie.
- Client-side `AuthGate` shown on first visit if `needsUsername`: a single-input modal "Choose your username (locked to this device's network)".
- On subsequent visits from the same IP, user is auto-logged-in. From a new IP, the same username is **not** auto-recovered (per the user's spec: new IP → new username prompt). If they type a username that's already claimed by a different IP, we reject — they must pick another.

## 4. Replace localStorage store with realtime store

- Refactor `src/lib/store.tsx` to fetch from Lovable Cloud and subscribe to Realtime on `posts`, `comments`, `votes`, `reactions`, `live_rooms`.
- All mutations (`addPost`, `addComment`, `vote`, `react`, `votePoll`, create community, join room) become server functions writing to the DB.
- Realtime broadcasts update every connected client within ~200ms — when one user posts, everyone sees it instantly. Same for new communities and rooms.
- Seed the DB on first boot with the existing `COMMUNITIES` and `POSTS` mock data so the app isn't empty.

## 5. Admin panel `/admin`

- Route `src/routes/admin.tsx` — password gate (input → check against `2689` client-side, then store an `admin_session` cookie that the server route verifies against `ADMIN_PASSWORD` env secret).
- Server functions guarded by admin cookie:
  - `listUsersWithIps()` — identities + their IPs + post/comment counts
  - `listAllPosts()` / `deletePost(id)` / `editPost(id, patch)`
  - `listAllComments()` / `deleteComment(id)`
  - `listCommunities()` / `deleteCommunity(slug)`
  - `getLiveStats()` — counts of online users (last 60s heartbeat), live rooms, listeners, communities, posts today, comments today
- Admin UI tabs: **Live Stats**, **Users (IPs)**, **Posts**, **Comments**, **Communities**, **Rooms**. Each row has edit/delete. Stats panel uses Realtime + a 5s polling refresh.

## 6. Presence / live counters

- `presence_pings` table: `(user_id, last_seen)`. Client sends a heartbeat every 30s. "Online" = last_seen within 60s.
- Exposed via `getLiveStats` for admin and a small "X online" badge in the app shell.

---

## Technical notes

- Cookies are httpOnly + sameSite=lax. `sk_id` is the only auth token; the server resolves the identity from it on every server function call.
- IP hashing uses HMAC-SHA256 with a server secret so raw IPs are never stored in `ip_hash`; raw IP is stored separately in `raw_ip` and only returned to admin queries.
- For Cloudflare Worker SSR, IP comes from `cf-connecting-ip` header (falls back to `x-forwarded-for`).
- Admin password `2689` is stored as `ADMIN_PASSWORD` secret, not hardcoded in client bundle.
- The first user to visit becomes the bootstrap seeder via an idempotent server function call.

---

## What you'll see when this ships

1. Open the site on a new device → modal "Pick your username" → type it → you're in, forever, on that network.
2. Post something → every other open browser sees it appear without refresh.
3. Visit `/admin` → enter `2689` → see live counters, every user's username + IP, and delete/edit controls on everything.

Approving this will enable Lovable Cloud (one-time backend provisioning) and migrate the app off localStorage onto the live database.