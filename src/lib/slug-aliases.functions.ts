import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireIdentity, isAdmin } from "./session.server";

/** Resolve an old slug to its current value, if a redirect exists. */
export const resolveSlug = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ entity_type: z.string().min(1).max(40), old_slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await (supabaseAdmin as any)
      .from("slug_aliases")
      .select("new_slug")
      .eq("entity_type", data.entity_type)
      .eq("old_slug", data.old_slug)
      .maybeSingle();
    return { new_slug: (row?.new_slug as string | undefined) ?? null };
  });

/** Rename a community slug; writes the old slug to slug_aliases. Owner or admin only. */
export const renameCommunity = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    old_slug: z.string().regex(/^[a-z0-9-]+$/),
    new_slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(30),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireIdentity();
    if (data.old_slug === data.new_slug) return { ok: true };
    const { data: c } = await supabaseAdmin
      .from("communities").select("slug, created_by").eq("slug", data.old_slug).maybeSingle();
    if (!c) throw new Error("Community not found");
    if (c.created_by !== me.id && !isAdmin()) throw new Error("Not allowed");
    const { data: clash } = await supabaseAdmin
      .from("communities").select("slug").eq("slug", data.new_slug).maybeSingle();
    if (clash) throw new Error("That slug is already taken");
    await supabaseAdmin.from("communities").update({ slug: data.new_slug }).eq("slug", data.old_slug);
    await supabaseAdmin.from("posts").update({ community_slug: data.new_slug }).eq("community_slug", data.old_slug);
    await (supabaseAdmin as any).from("slug_aliases").upsert({
      entity_type: "community", old_slug: data.old_slug, new_slug: data.new_slug,
    });
    return { ok: true, new_slug: data.new_slug };
  });