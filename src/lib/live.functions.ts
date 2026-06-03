import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireIdentity, getCurrentIdentity } from "./session.server";
import { enforceRateLimit } from "./rate-limit.server";

const PostInput = z.object({
  community_slug: z.string().min(1),
  title: z.string().trim().min(1).max(280),
  body: z.string().max(8000).optional().nullable(),
  type: z.enum(["text", "image", "poll", "voice", "meme", "confession"]),
  anonymous: z.boolean().default(false),
  nsfw: z.boolean().default(false),
  tags: z.array(z.string()).max(10).default([]),
  image: z.string().max(2_000_000).optional().nullable(),
  poll: z.array(z.object({ option: z.string().min(1).max(120), votes: z.number().default(0) })).max(8).optional().nullable(),
  voice: z.object({ duration: z.number(), src: z.string().optional() }).optional().nullable(),
});

export const listFeed = createServerFn({ method: "GET" }).handler(async () => {
  const [{ data: posts }, { data: communities }, { data: rooms }, presence] = await Promise.all([
    supabaseAdmin.from("posts").select("*").eq("deleted", false).eq("auto_hidden", false).order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("communities").select("*").order("created_at"),
    supabaseAdmin.from("live_rooms").select("*").is("ended_at", null).order("created_at", { ascending: false }),
    supabaseAdmin.from("presence_pings").select("user_id", { count: "exact", head: true }).gte("last_seen", new Date(Date.now() - 60_000).toISOString()),
  ]);
  return {
    posts: posts ?? [],
    communities: communities ?? [],
    rooms: rooms ?? [],
    onlineCount: presence.count ?? 0,
  };
});

export const listComments = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ post_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("comments")
      .select("*")
      .eq("post_id", data.post_id)
      .eq("deleted", false)
      .order("created_at", { ascending: true });
    return { comments: rows ?? [] };
  });

export const createPost = createServerFn({ method: "POST" })
  .inputValidator((d) => PostInput.parse(d))
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    await enforceRateLimit("post");
    const { data: created, error } = await supabaseAdmin
      .from("posts")
      .insert({
        community_slug: data.community_slug,
        author_id: me.id,
        author_username: data.anonymous ? "Anonymous" : me.username,
        anonymous: data.anonymous,
        title: data.title,
        body: data.body ?? null,
        type: data.type,
        tags: data.tags,
        image: data.image ?? null,
        poll: (data.poll as any) ?? null,
        voice: (data.voice as any) ?? null,
        nsfw: data.nsfw,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { post: created };
  });

export const votePost = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ post_id: z.string().uuid(), dir: z.union([z.literal(1), z.literal(-1), z.literal(0)]) }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    const { data: prev } = await supabaseAdmin
      .from("votes")
      .select("dir")
      .eq("user_id", me.id)
      .eq("post_id", data.post_id)
      .maybeSingle();
    const prevDir = prev?.dir ?? 0;
    const nextDir = data.dir;
    if (nextDir === 0) {
      await supabaseAdmin.from("votes").delete().eq("user_id", me.id).eq("post_id", data.post_id);
    } else {
      await supabaseAdmin.from("votes").upsert({ user_id: me.id, post_id: data.post_id, dir: nextDir });
    }
    const delta = nextDir - prevDir;
    if (delta !== 0) {
      const { data: post } = await supabaseAdmin.from("posts").select("upvotes").eq("id", data.post_id).single();
      await supabaseAdmin.from("posts").update({ upvotes: (post?.upvotes ?? 0) + delta }).eq("id", data.post_id);
    }
    return { ok: true };
  });

export const reactToPost = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ post_id: z.string().uuid(), reaction: z.enum(["mass", "ayyo", "tea", "dead", "flag", "support"]).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    const { data: prev } = await supabaseAdmin
      .from("reactions")
      .select("reaction")
      .eq("user_id", me.id)
      .eq("post_id", data.post_id)
      .maybeSingle();
    const { data: post } = await supabaseAdmin.from("posts").select("reactions").eq("id", data.post_id).single();
    const counts: Record<string, number> = { ...((post?.reactions as any) ?? {}) };
    if (prev?.reaction) counts[prev.reaction] = Math.max(0, (counts[prev.reaction] ?? 1) - 1);
    if (data.reaction) counts[data.reaction] = (counts[data.reaction] ?? 0) + 1;

    if (!data.reaction) {
      await supabaseAdmin.from("reactions").delete().eq("user_id", me.id).eq("post_id", data.post_id);
    } else {
      await supabaseAdmin.from("reactions").upsert({ user_id: me.id, post_id: data.post_id, reaction: data.reaction });
    }
    await supabaseAdmin.from("posts").update({ reactions: counts }).eq("id", data.post_id);
    return { ok: true, reactions: counts };
  });

export const votePoll = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ post_id: z.string().uuid(), option_index: z.number().int().min(0).max(7) }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    const { data: post } = await supabaseAdmin.from("posts").select("poll").eq("id", data.post_id).single();
    if (!post?.poll) throw new Error("Not a poll");
    const poll = post.poll as { option: string; votes: number }[];

    const { data: prev } = await supabaseAdmin
      .from("poll_votes")
      .select("option_index")
      .eq("user_id", me.id)
      .eq("post_id", data.post_id)
      .maybeSingle();
    if (prev?.option_index === data.option_index) return { ok: true };

    const next = poll.map((o, i) => {
      let v = o.votes;
      if (prev?.option_index === i) v = Math.max(0, v - 1);
      if (i === data.option_index) v += 1;
      return { ...o, votes: v };
    });
    await supabaseAdmin.from("poll_votes").upsert({ user_id: me.id, post_id: data.post_id, option_index: data.option_index });
    await supabaseAdmin.from("posts").update({ poll: next as any }).eq("id", data.post_id);
    return { ok: true };
  });

export const addComment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ post_id: z.string().uuid(), body: z.string().trim().min(1).max(4000), parent_id: z.string().uuid().nullable().optional(), anonymous: z.boolean().default(false) }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    await enforceRateLimit("comment");
    const { data: created, error } = await supabaseAdmin
      .from("comments")
      .insert({
        post_id: data.post_id,
        parent_id: data.parent_id ?? null,
        author_id: me.id,
        author_username: data.anonymous ? "Anonymous" : me.username,
        anonymous: data.anonymous,
        body: data.body,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const { data: cur } = await supabaseAdmin.from("posts").select("comments_count").eq("id", data.post_id).single();
    await supabaseAdmin.from("posts").update({ comments_count: (cur?.comments_count ?? 0) + 1 }).eq("id", data.post_id);
    return { comment: created };
  });

export const createCommunity = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(30),
    name: z.string().min(2).max(40),
    malayalam: z.string().max(40).optional().nullable(),
    description: z.string().max(280).optional().nullable(),
    icon: z.string().max(8).optional().nullable(),
    color: z.string().max(80).optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    await enforceRateLimit("community");
    const { data: created, error } = await supabaseAdmin
      .from("communities")
      .insert({
        slug: data.slug,
        name: data.name,
        malayalam: data.malayalam ?? null,
        description: data.description ?? null,
        icon: data.icon ?? "💬",
        color: data.color ?? "from-red-500 to-amber-500",
        created_by: me.id,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { community: created };
  });

export const createRoom = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ title: z.string().min(2).max(80), topic: z.string().max(200).optional().nullable(), color: z.string().max(80).optional().nullable() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    await enforceRateLimit("room");
    const { data: created, error } = await supabaseAdmin
      .from("live_rooms")
      .insert({
        title: data.title,
        topic: data.topic ?? null,
        host_id: me.id,
        host_username: me.username,
        color: data.color ?? "from-rose-500 to-red-500",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { room: created };
  });

export const getOnlineCount = createServerFn({ method: "GET" }).handler(async () => {
  const { count } = await supabaseAdmin
    .from("presence_pings")
    .select("user_id", { count: "exact", head: true })
    .gte("last_seen", new Date(Date.now() - 60_000).toISOString());
  // touch self
  const me = await getCurrentIdentity();
  return { count: count ?? 0, meId: me?.id ?? null };
});