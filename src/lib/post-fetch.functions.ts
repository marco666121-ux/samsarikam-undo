import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getPostMeta = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("id, title, body, type, image, community_slug, author_username, anonymous, nsfw, created_at, deleted")
      .eq("id", data.id)
      .maybeSingle();
    if (!post || post.deleted) return { post: null };
    return { post };
  });