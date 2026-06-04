## Heads-up before I start

Two things in your brief don't match the current codebase, so I'm flagging the interpretation before touching schema:

1. **There is no existing Google Login.** Current auth is cookie-based: users claim a `username` and the server binds it to a hashed IP (`identities` + `ip_bindings` tables, no Supabase Auth users). I'll treat "keep Google" as "add Google" using Lovable Cloud's managed Google provider.
2. **Phone OTP requires an SMS provider.** Without one, OTPs can be issued but never delivered. I'll use **Supabase Auth's built-in phone provider** rather than rolling our own SMS through Twilio — it's already wired into Lovable Cloud, supports +91, has built-in OTP expiry, hashing, and per-phone throttling. This means migrating identity from the cookie system to Supabase Auth.

If you'd rather keep the cookie-based identity and bolt phone OTP onto it, say so and I'll re-plan (you'd then need to connect Twilio yourself).

---

## Batch 5 — Phone OTP + Google via Supabase Auth

### Schema

New migration:
- `profiles` table — `id` (= `auth.users.id`), `username` (unique, copied from existing identities), `phone` (unique, nullable), `created_at`. RLS: public can read `id, username`; owner can update own row.
- Trigger on `auth.users` insert → auto-create `profiles` row.
- Keep `identities` and `ip_bindings` for legacy cookie linkage (read-only).
- Add `legacy_identity_id uuid` on `profiles` so a Supabase user can claim their old cookie identity (preserves posts/comments since `author_id` already lives on `posts`/`comments`).

### Auth surface

- Enable Supabase phone provider (configure_auth): OTP expiry 300s, channel SMS.
- Enable Google provider (configure_social_auth).
- New `/auth` route with two tabs: **Phone** (+91 only, E.164 normalisation, 30s resend cooldown via client timer + server `created_at` check) and **Google** (single button using `lovable.auth.signInWithOAuth("google", …)`).
- New server fns: `requestPhoneOtp`, `verifyPhoneOtp`, `linkLegacyIdentity` (one-time, on first login if a cookie `sk_id` is present).
- Replace `requireIdentity` server-side helper with `requireSupabaseAuth` middleware. All existing `.handler(requireIdentity)` server fns (post-actions, live, moderation, slug-aliases, admin) get rewritten to read `context.userId` and look up the profile.

### Abuse protection

`rate_limits` table already exists. I'll add `phone_otp_request` (3/hour/IP) and `phone_otp_verify` (10/hour/IP) actions to `enforceRateLimit`. Per-phone throttle is also enforced server-side (one OTP per 30s by checking `auth.users.confirmation_sent_at` semantics via the Auth API response).

### Client changes

- `StoreProvider`: replace cookie `whoami()` bootstrap with `supabase.auth.getUser()` + `onAuthStateChange` listener (already in `tanstack-supabase-integration` pattern). Posts and live queries keep working — they read public data via the same admin-scoped server fns.
- `UsernameModal` removed.
- Top bar `Sign in` → opens `/auth`. Profile menu shows username + phone (last 4) + sign out.

### What stays

- All existing posts, comments, communities, live rooms remain readable.
- Existing `author_id` values are preserved. When a returning user signs in with phone/Google and we detect their `sk_id` cookie, we copy `identities.id` → `profiles.legacy_identity_id`, and a database view/trigger maps comment ownership going forward by checking both.

### Out of scope (deferred)

- Migrating *historical* `author_id` on every post/comment to the new `auth.users.id` (would require backfill). Instead, ownership checks accept either the legacy identity id or the new profile id.

---

## Batch 6 — UI Interaction Audit (after Batch 5 lands)

Read every route + component and produce a fix list. Known sweeps:
- Bell / Settings icons in `app-shell` and `c.$slug` — currently no-op buttons. Wire to `/notifications` and a settings sheet, or remove.
- "Joined" button on community page — no toggle handler, always shows joined.
- `LeftRail` items that link to `#` — make real routes or drop.
- Search bar — confirm `⌘K` focus, debounced query, empty state.
- Profile menu — sign-out, copy profile link, settings.
- All `<button>` without `onClick` or `type` — list and fix.
- Loading skeletons on `/`, `/c/$slug`, `/u/$username`, `/communities`.
- Error states: every route with a loader needs `errorComponent` + `notFoundComponent` (audit existing).
- Mobile: 411px viewport sweep of home, post-detail, room, communities, profile. Fix overflow, tap targets, modal full-bleed.
- Toasts: convert remaining `console.log` placeholders.

I'll deliver Batch 6 as a separate turn so the auth migration can be tested in isolation before UI polish lands on top.

---

## Order of operations

1. Migration: `profiles`, trigger, grants/RLS, `legacy_identity_id`.
2. `configure_auth` (phone + OTP expiry) and `configure_social_auth` (Google).
3. Server fns rewrite to `requireSupabaseAuth`.
4. `/auth` route + UI.
5. Replace `UsernameModal` flow in `StoreProvider`.
6. Smoke test: sign in with phone, post, comment, vote.
7. (New turn) Batch 6.

Confirm "go" and I'll execute. If you'd rather keep the cookie identity system and add phone OTP as a parallel login (no Supabase Auth migration), reply "**cookie path**" and I'll re-plan.
