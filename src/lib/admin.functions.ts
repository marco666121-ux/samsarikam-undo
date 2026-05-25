import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdmin } from "./session.server";

function requireAdmin() {
  if (!isAdmin()) throw new Error("Admin only");
}

export const adminStats = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const since60s = new Date(Date.now() - 60_000).toISOString();
  const today = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [users, posts, postsToday, comments, commentsToday, communities, rooms, online] = await Promise.all([
    supabaseAdmin.from("identities").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).eq("deleted", false),
    supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabaseAdmin.from("comments").select("id", { count: "exact", head: true }).eq("deleted", false),
    supabaseAdmin.from("comments").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabaseAdmin.from("communities").select("slug", { count: "exact", head: true }),
    supabaseAdmin.from("live_rooms").select("id", { count: "exact", head: true }).is("ended_at", null),
    supabaseAdmin.from("presence_pings").select("user_id", { count: "exact", head: true }).gte("last_seen", since60s),
  ]);
  return {
    users: users.count ?? 0,
    posts: posts.count ?? 0,
    postsToday: postsToday.count ?? 0,
    comments: comments.count ?? 0,
    commentsToday: commentsToday.count ?? 0,
    communities: communities.count ?? 0,
    liveRooms: rooms.count ?? 0,
    online: online.count ?? 0,
  };
});

export const adminListUsers = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { data: ids } = await supabaseAdmin.from("identities").select("*").order("created_at", { ascending: false }).limit(500);
  const idList = (ids ?? []).map((i) => i.id);
  const { data: bindings } = await supabaseAdmin.from("ip_bindings").select("*").in("identity_id", idList.length ? idList : ["00000000-0000-0000-0000-000000000000"]);
  const byId = new Map<string, any[]>();
  (bindings ?? []).forEach((b) => {
    const arr = byId.get(b.identity_id) ?? [];
    arr.push(b);
    byId.set(b.identity_id, arr);
  });
  return {
    users: (ids ?? []).map((u) => ({
      ...u,
      ips: (byId.get(u.id) ?? []).map((b) => ({ raw_ip: b.raw_ip, ua: b.user_agent, first_seen: b.first_seen, last_seen: b.last_seen })),
    })),
  };
});

export const adminListPosts = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { data } = await supabaseAdmin.from("posts").select("*").order("created_at", { ascending: false }).limit(500);
  return { posts: data ?? [] };
});

export const adminListComments = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { data } = await supabaseAdmin.from("comments").select("*").order("created_at", { ascending: false }).limit(500);
  return { comments: data ?? [] };
});

export const adminListCommunities = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { data } = await supabaseAdmin.from("communities").select("*").order("created_at");
  return { communities: data ?? [] };
});

export const adminDeletePost = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    await supabaseAdmin.from("posts").update({ deleted: true }).eq("id", data.id);
    return { ok: true };
  });

export const adminEditPost = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), title: z.string().min(1).max(280).optional(), body: z.string().max(8000).nullable().optional() }).parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    const patch: { title?: string; body?: string | null } = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.body !== undefined) patch.body = data.body;
    await supabaseAdmin.from("posts").update(patch).eq("id", data.id);
    return { ok: true };
  });

export const adminDeleteComment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    await supabaseAdmin.from("comments").update({ deleted: true }).eq("id", data.id);
    return { ok: true };
  });

export const adminDeleteCommunity = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    await supabaseAdmin.from("communities").delete().eq("slug", data.slug);
    return { ok: true };
  });

export const adminBanUser = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), banned: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    await supabaseAdmin.from("identities").update({ is_banned: data.banned }).eq("id", data.id);
    return { ok: true };
  });

export const adminEndRoom = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    await supabaseAdmin.from("live_rooms").update({ ended_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });