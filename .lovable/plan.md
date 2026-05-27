## Stack stays the same
TanStack Start + Cloudflare Workers + Supabase (Lovable Cloud). No Next.js, no rewrite. All new work lives in `src/routes/`, `src/lib/*.functions.ts`, and Supabase migrations.

---

## Phase 1 — Shareable URLs + Social Previews (ship first)

**New / updated routes (deep-linkable, refresh-safe, OG previews):**
- `/u/$username` — public user profile (replaces "me-only" `/profile`)
- `/post/$id` — already exists; add full `head()` with OG title/description/image
- `/c/$slug` — already exists; add OG metadata + slug-redirect support
- `/room/$id` — live room page
- `/confession/$id` — alias route for confession-type posts
- `/post/$id/comment/$cid` — deep-link to a comment, scrolls + highlights

**Sharing UX:**
- `<ShareButton/>` component on every post/comment/community/room — uses `navigator.share` on mobile, copies link on desktop, shows toast
- Native share sheet payload includes title + URL

**OG previews (per-route `head()`):**
- Dynamic `title`, `description`, `og:image`, `twitter:card` derived from loader data
- Absolute URLs built via a `getRequestOrigin()` server fn (required for crawlers)

---

## Phase 2 — Soft delete + Edit history + Moderation log

**DB migration:**
- Add `deleted_at`, `deleted_by`, `restored_at` columns on `posts`, `comments`, `communities`, `identities`
- New table `edit_history` — `entity_type`, `entity_id`, `prev_state` (jsonb), `new_state` (jsonb), `editor_id`, `created_at`
- New table `moderation_log` — `admin_id`, `action`, `entity_type`, `entity_id`, `prev_state`, `new_state`, `reason`, `created_at`
- New table `reports` — `reporter_id`, `entity_type`, `entity_id`, `reason`, `status`, `created_at`

**Behavior:**
- All deletes flip `deleted=true` + write `moderation_log` row (already partially there)
- All edits snapshot `prev_state` into `edit_history` before writing
- Server fn `undoLastAction({ logId })` reverses by reading `prev_state`

---

## Phase 3 — Admin upgrade

**Universal moderation search bar** (top of `/admin`):
- Single input — paste URL / username / UUID / IP
- Auto-detect → route to the right mod panel (post, user, comment, community, IP)

**Per-entity mod panels:**
- Post panel: content, media, author + IP, reports, edit history, pin/feature/NSFW/archive/delete/restore
- User panel: identity row, all IPs, post count, comment count, ban toggle, undo ban
- Community panel: edit name/description/icon, delete/restore, member list
- Realtime: subscribe to `reports`, `posts`, `moderation_log` for live counters

**Moderation log viewer** with undo button per row.

---

## Phase 4 — Community invites

- New table `community_invites` — `code`, `community_slug`, `created_by`, `expires_at` (nullable = permanent), `max_uses`, `uses`
- Route `/invite/$slug/$code` — validates, joins user to community, redirects to `/c/$slug`
- Community settings: "Generate invite" → permanent / 24h / 7d, copy link, QR code (uses `qrcode` npm package)

---

## Phase 5 — Slug redirects + rename safety

- New table `slug_aliases` — `old_slug`, `new_slug`, `entity_type`, `created_at`
- When a community/post is renamed, write the old slug to `slug_aliases`
- Route loaders check `slug_aliases` on 404 and 301-redirect to the current slug

---

## Phase 6 — Anti-abuse hardening

- Rate limiting per IP via a `rate_limits` table (post: 5/min, comment: 20/min, report: 10/hour)
- Suspicious IP score on `ip_bindings` (multiple usernames, rapid posting → flag)
- Auto-hide posts that hit N reports until admin review
- Honeypot field on post form for bot detection

---

## What's NOT in scope
- Switching frameworks (you confirmed: stay on TanStack Start)
- Building a real-time WebRTC voice room (the room route exists as text/metadata only for now)
- Email/SMS — IP-claim auth stays as-is

---

## My recommendation
Ship **Phase 1** now (biggest user-visible win, no schema risk), then **Phase 2 + 3** together (admin gets real teeth), then 4/5/6 based on what you see in production.

Reply with the phase number(s) to build first, or "all" if you accept the bug risk of a single mega-batch.