import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdmin } from "./session.server";

function requireAdmin() {
  if (!isAdmin()) throw new Error("Admin only");
}

type EntityType = "post" | "comment" | "community" | "user";

const ENTITY_TABLE: Record<EntityType, string> = {
  post: "posts",
  comment: "comments",
  community: "communities",
  user: "identities",
};

const ENTITY_KEY: Record<EntityType, string> = {
  post: "id",
  comment: "id",
  community: "slug",
  user: "id",
};

async function writeLog(opts: {
  action: string;
  entity_type: EntityType;
  entity_id: string;
  prev_state?: unknown;
  new_state?: unknown;
  reason?: string;
}) {
  await supabaseAdmin.from("moderation_log").insert({
    action: opts.action,
    entity_type: opts.entity_type,
    entity_id: String(opts.entity_id),
    prev_state: opts.prev_state ?? null,
    new_state: opts.new_state ?? null,
    reason: opts.reason ?? null,
  });
}

async function loadEntity(type: EntityType, id: string) {
  const { data } = await supabaseAdmin
    .from(ENTITY_TABLE[type])
    .select("*")
    .eq(ENTITY_KEY[type], id)
    .maybeSingle();
  return data;
}

// ---------- Universal search ----------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const moderationSearch = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ query: z.string().trim().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    const raw = data.query.trim();

    // Try URL extraction
    let q = raw;
    try {
      if (raw.startsWith("http")) {
        const u = new URL(raw);
        const seg = u.pathname.split("/").filter(Boolean);
        // /post/<id>, /c/<slug>, /u/<username>, /confession/<id>, /room/<id>
        if (seg[0] === "post" || seg[0] === "confession") q = seg[1] ?? raw;
        else if (seg[0] === "c") q = seg[1] ?? raw;
        else if (seg[0] === "u") q = seg[1] ?? raw;
        else if (seg[0] === "room") q = seg[1] ?? raw;
      }
    } catch {}

    const isUuid = UUID_RE.test(q);
    const results: Array<{ type: EntityType; id: string; label: string; meta?: string }> = [];

    if (isUuid) {
      const [post, comment, user, room] = await Promise.all([
        supabaseAdmin.from("posts").select("id, title, deleted").eq("id", q).maybeSingle(),
        supabaseAdmin.from("comments").select("id, body, deleted").eq("id", q).maybeSingle(),
        supabaseAdmin.from("identities").select("id, username, is_banned").eq("id", q).maybeSingle(),
        supabaseAdmin.from("live_rooms").select("id, title").eq("id", q).maybeSingle(),
      ]);
      if (post.data) results.push({ type: "post", id: post.data.id, label: post.data.title, meta: post.data.deleted ? "deleted" : "live" });
      if (comment.data) results.push({ type: "comment", id: comment.data.id, label: (comment.data.body ?? "").slice(0, 80), meta: comment.data.deleted ? "deleted" : "live" });
      if (user.data) results.push({ type: "user", id: user.data.id, label: user.data.username, meta: user.data.is_banned ? "banned" : "active" });
      if (room.data) results.push({ type: "post" as any, id: room.data.id, label: `room: ${room.data.title}` });
    }

    // Always try username (case-insensitive) + community slug + post-title text
    const cleanName = q.replace(/^@/, "").trim();
    if (cleanName) {
      const { data: ids } = await supabaseAdmin
        .from("identities")
        .select("id, username, is_banned")
        .ilike("username", `%${cleanName}%`)
        .limit(10);
      (ids ?? []).forEach((u) => {
        if (!results.find((r) => r.type === "user" && r.id === u.id))
          results.push({ type: "user", id: u.id, label: u.username, meta: u.is_banned ? "banned" : "active" });
      });

      const { data: comms } = await supabaseAdmin
        .from("communities")
        .select("slug, name")
        .or(`slug.ilike.%${cleanName}%,name.ilike.%${cleanName}%`)
        .limit(10);
      (comms ?? []).forEach((c) => results.push({ type: "community", id: c.slug, label: `c/${c.slug}`, meta: c.name }));

      // IP lookup (raw or hashed)
      const { data: bindings } = await supabaseAdmin
        .from("ip_bindings")
        .select("identity_id, raw_ip, identities(username, is_banned)")
        .or(`raw_ip.eq.${cleanName},ip_hash.eq.${cleanName}`)
        .limit(10);
      (bindings ?? []).forEach((b: any) => {
        if (b.identities && !results.find((r) => r.type === "user" && r.id === b.identity_id))
          results.push({ type: "user", id: b.identity_id, label: b.identities.username, meta: `IP ${b.raw_ip}` });
      });
    }

    // Post title text search (only when not uuid and 3+ chars)
    if (!isUuid && cleanName.length >= 3) {
      const { data: posts } = await supabaseAdmin
        .from("posts")
        .select("id, title, deleted, community_slug")
        .ilike("title", `%${cleanName}%`)
        .limit(10);
      (posts ?? []).forEach((p) =>
        results.push({ type: "post", id: p.id, label: p.title, meta: `c/${p.community_slug}${p.deleted ? " · deleted" : ""}` }),
      );
    }

    return { results };
  });

// ---------- Entity detail (admin only — exposes IPs, etc.) ----------

export const getEntityDetail = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ type: z.enum(["post", "comment", "community", "user"]), id: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const entity = await loadEntity(data.type, data.id);
    if (!entity) return { entity: null, history: [], log: [], extra: null };

    const [{ data: history }, { data: log }] = await Promise.all([
      supabaseAdmin
        .from("edit_history")
        .select("*")
        .eq("entity_type", data.type)
        .eq("entity_id", String(data.id))
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("moderation_log")
        .select("*")
        .eq("entity_type", data.type)
        .eq("entity_id", String(data.id))
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    let extra: any = null;
    if (data.type === "user") {
      const { data: ips } = await supabaseAdmin
        .from("ip_bindings")
        .select("raw_ip, user_agent, first_seen, last_seen")
        .eq("identity_id", data.id);
      const [{ count: postCount }, { count: commentCount }] = await Promise.all([
        supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).eq("author_id", data.id),
        supabaseAdmin.from("comments").select("id", { count: "exact", head: true }).eq("author_id", data.id),
      ]);
      extra = { ips: ips ?? [], postCount: postCount ?? 0, commentCount: commentCount ?? 0 };
    }
    if (data.type === "post") {
      let authorIps: any[] = [];
      const authorId = (entity as any).author_id;
      if (authorId) {
        const { data: ips } = await supabaseAdmin
          .from("ip_bindings")
          .select("raw_ip, user_agent, last_seen")
          .eq("identity_id", authorId);
        authorIps = ips ?? [];
      }
      extra = { authorIps };
    }

    return { entity, history: history ?? [], log: log ?? [], extra };
  });

// ---------- Soft delete / restore ----------

export const softDelete = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        type: z.enum(["post", "comment", "community", "user"]),
        id: z.string().min(1),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const prev = await loadEntity(data.type, data.id);
    if (!prev) throw new Error("Not found");
    const patch: Record<string, unknown> = { deleted_at: new Date().toISOString(), restored_at: null };
    if (data.type === "post" || data.type === "comment") patch.deleted = true;
    if (data.type === "user") patch.is_banned = true;
    await supabaseAdmin.from(ENTITY_TABLE[data.type]).update(patch).eq(ENTITY_KEY[data.type], data.id);
    await writeLog({
      action: data.type === "user" ? "ban" : "soft_delete",
      entity_type: data.type,
      entity_id: String(data.id),
      prev_state: prev,
      new_state: { ...prev, ...patch },
      reason: data.reason,
    });
    return { ok: true };
  });

export const restoreEntity = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ type: z.enum(["post", "comment", "community", "user"]), id: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const prev = await loadEntity(data.type, data.id);
    if (!prev) throw new Error("Not found");
    const patch: Record<string, unknown> = { deleted_at: null, restored_at: new Date().toISOString() };
    if (data.type === "post" || data.type === "comment") patch.deleted = false;
    if (data.type === "user") patch.is_banned = false;
    await supabaseAdmin.from(ENTITY_TABLE[data.type]).update(patch).eq(ENTITY_KEY[data.type], data.id);
    await writeLog({
      action: data.type === "user" ? "unban" : "restore",
      entity_type: data.type,
      entity_id: String(data.id),
      prev_state: prev,
      new_state: { ...prev, ...patch },
    });
    return { ok: true };
  });

// ---------- Edit with history ----------

export const editWithHistory = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        type: z.enum(["post", "comment", "community"]),
        id: z.string().min(1),
        patch: z.record(z.string(), z.any()),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const prev = await loadEntity(data.type, data.id);
    if (!prev) throw new Error("Not found");

    // Whitelist editable keys per type to prevent privilege escalation via this fn
    const allowed: Record<string, string[]> = {
      post: ["title", "body", "nsfw", "pinned", "tags"],
      comment: ["body"],
      community: ["name", "description", "icon", "color", "malayalam"],
    };
    const clean: Record<string, unknown> = {};
    const prevSnap: Record<string, unknown> = {};
    Object.entries(data.patch).forEach(([k, v]) => {
      if (allowed[data.type].includes(k)) {
        clean[k] = v;
        prevSnap[k] = (prev as any)[k];
      }
    });
    if (Object.keys(clean).length === 0) throw new Error("Nothing to update");
    if (data.type === "post" || data.type === "comment") (clean as any).edited_at = new Date().toISOString();

    await supabaseAdmin.from(ENTITY_TABLE[data.type]).update(clean).eq(ENTITY_KEY[data.type], data.id);

    await supabaseAdmin.from("edit_history").insert({
      entity_type: data.type,
      entity_id: String(data.id),
      prev_state: prevSnap,
      new_state: clean,
      editor_label: "admin",
    });
    await writeLog({
      action: "edit",
      entity_type: data.type,
      entity_id: String(data.id),
      prev_state: prevSnap,
      new_state: clean,
      reason: data.reason,
    });
    return { ok: true };
  });

// ---------- Moderation log + undo ----------

export const listModerationLog = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ limit: z.number().min(1).max(200).default(100) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const { data: rows } = await supabaseAdmin
      .from("moderation_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    return { log: rows ?? [] };
  });

export const undoModerationAction = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ logId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    const { data: entry } = await supabaseAdmin
      .from("moderation_log")
      .select("*")
      .eq("id", data.logId)
      .maybeSingle();
    if (!entry) throw new Error("Log entry not found");
    if (entry.undone_at) throw new Error("Already undone");

    const type = entry.entity_type as EntityType;
    const id = entry.entity_id as string;
    const prev = (entry.prev_state ?? {}) as Record<string, unknown>;

    if (entry.action === "soft_delete" || entry.action === "ban") {
      const patch: Record<string, unknown> = { deleted_at: null, restored_at: new Date().toISOString() };
      if (type === "post" || type === "comment") patch.deleted = false;
      if (type === "user") patch.is_banned = false;
      await supabaseAdmin.from(ENTITY_TABLE[type]).update(patch).eq(ENTITY_KEY[type], id);
    } else if (entry.action === "restore" || entry.action === "unban") {
      const patch: Record<string, unknown> = { deleted_at: new Date().toISOString() };
      if (type === "post" || type === "comment") patch.deleted = true;
      if (type === "user") patch.is_banned = true;
      await supabaseAdmin.from(ENTITY_TABLE[type]).update(patch).eq(ENTITY_KEY[type], id);
    } else if (entry.action === "edit") {
      // restore prev_state fields
      const clean: Record<string, unknown> = {};
      const allowed: Record<string, string[]> = {
        post: ["title", "body", "nsfw", "pinned", "tags"],
        comment: ["body"],
        community: ["name", "description", "icon", "color", "malayalam"],
      };
      Object.entries(prev).forEach(([k, v]) => {
        if (allowed[type]?.includes(k)) clean[k] = v;
      });
      if (Object.keys(clean).length === 0) throw new Error("Nothing to revert");
      await supabaseAdmin.from(ENTITY_TABLE[type]).update(clean).eq(ENTITY_KEY[type], id);
    } else {
      throw new Error(`Cannot undo action: ${entry.action}`);
    }

    await supabaseAdmin.from("moderation_log").update({ undone_at: new Date().toISOString() }).eq("id", data.logId);
    await writeLog({
      action: `undo:${entry.action}`,
      entity_type: type,
      entity_id: id,
      prev_state: { logId: data.logId },
      new_state: prev,
    });
    return { ok: true };
  });

// ---------- Admin logout ----------

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { deleteCookie } = await import("@tanstack/react-start/server");
  deleteCookie("sk_admin", { path: "/" });
  return { ok: true };
});