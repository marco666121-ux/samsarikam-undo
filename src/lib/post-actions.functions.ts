import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireIdentity, isAdmin } from "./session.server";

export const deletePost = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ post_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    const { data: post } = await supabaseAdmin
      .from("posts").select("author_id").eq("id", data.post_id).maybeSingle();
    if (!post) throw new Error("Post not found");
    if (post.author_id !== me.id && !isAdmin()) throw new Error("Not allowed");
    await supabaseAdmin
      .from("posts")
      .update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: me.id })
      .eq("id", data.post_id);
    return { ok: true };
  });

export const editPost = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      post_id: z.string().uuid(),
      title: z.string().trim().min(1).max(300).optional(),
      body: z.string().max(20000).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    const { data: post } = await supabaseAdmin
      .from("posts").select("author_id, title, body").eq("id", data.post_id).maybeSingle();
    if (!post) throw new Error("Post not found");
    if (post.author_id !== me.id && !isAdmin()) throw new Error("Not allowed");
    const patch: Record<string, unknown> = { edited_at: new Date().toISOString() };
    if (data.title !== undefined) patch.title = data.title;
    if (data.body !== undefined) patch.body = data.body;
    await (supabaseAdmin as any).from("edit_history").insert({
      entity_type: "post",
      entity_id: data.post_id,
      prev_state: { title: post.title, body: post.body },
      new_state: patch,
      editor_id: me.id,
      editor_label: me.username,
    });
    await (supabaseAdmin as any).from("posts").update(patch).eq("id", data.post_id);
    return { ok: true };
  });

export const reportPost = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      post_id: z.string().uuid(),
      reason: z.string().trim().min(1).max(500),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    await (supabaseAdmin as any).from("moderation_log").insert({
      action: "report",
      entity_type: "post",
      entity_id: data.post_id,
      reason: data.reason,
      admin_label: `report:${me.username}`,
      new_state: { reporter_id: me.id },
    });
    return { ok: true };
  });