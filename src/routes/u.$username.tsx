import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { useStore } from "@/lib/store";
import { SITE_URL } from "@/lib/site";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ username: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { data: identity } = await supabaseAdmin
      .from("identities")
      .select("id, username, created_at, is_banned")
      .ilike("username", data.username)
      .maybeSingle();
    if (!identity) return { identity: null, postCount: 0, commentCount: 0 };
    const [{ count: postCount }, { count: commentCount }] = await Promise.all([
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).eq("author_id", identity.id).eq("deleted", false),
      supabaseAdmin.from("comments").select("id", { count: "exact", head: true }).eq("author_id", identity.id).eq("deleted", false),
    ]);
    return { identity, postCount: postCount ?? 0, commentCount: commentCount ?? 0 };
  });

export const Route = createFileRoute("/u/$username")({
  loader: async ({ params }) => {
    const r = await getPublicProfile({ data: { username: params.username } });
    if (!r.identity) throw notFound();
    return r;
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/u/${params.username}`;
    const title = `u/${loaderData?.identity?.username ?? params.username} — Samsarikan Undo?`;
    const desc = `${loaderData?.postCount ?? 0} posts · ${loaderData?.commentCount ?? 0} comments on Samsarikan Undo?`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: UserProfile,
  notFoundComponent: () => (
    <AppShell>
      <div className="py-20 text-center">
        <div className="text-5xl">👻</div>
        <h2 className="mt-4 font-display text-xl font-bold">User not found</h2>
        <Link to="/" className="mt-3 inline-block text-sm text-primary hover:underline">Back to feed →</Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell><div className="py-20 text-center text-sm text-muted-foreground">Couldn't load profile: {error.message}</div></AppShell>
  ),
});

function UserProfile() {
  const { identity, postCount, commentCount } = Route.useLoaderData();
  const { username } = Route.useParams();
  const { posts } = useStore();
  const userPosts = posts.filter((p) => !p.anonymous && p.author?.toLowerCase() === identity!.username.toLowerCase());
  const onShare = async () => {
    const url = `${window.location.origin}/u/${identity!.username}`;
    try {
      if (navigator.share) await navigator.share({ title: `u/${identity!.username}`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Profile link copied"); }
    } catch {}
  };
  return (
    <AppShell>
      <div className="relative mb-4 overflow-hidden rounded-3xl">
        <div className="h-28 gradient-ember md:h-36" />
        <div className="glass-strong -mt-10 mx-3 rounded-2xl p-4 md:mx-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl gradient-ember text-3xl font-black text-primary-foreground shadow-glow ring-4 ring-background">
                {identity!.username[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="font-display text-2xl font-black tracking-tight">u/{identity!.username}</h1>
                <div className="mt-1 text-xs text-muted-foreground">
                  Joined {new Date(identity!.created_at).toLocaleDateString()}
                  {identity!.is_banned && <span className="ml-2 rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-bold text-destructive">Banned</span>}
                </div>
              </div>
            </div>
            <button onClick={onShare} className="rounded-full p-2 hover:bg-white/10" aria-label="Share profile">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Posts" value={postCount.toString()} />
            <Stat label="Comments" value={commentCount.toString()} />
          </div>
        </div>
      </div>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent posts</h2>
      <div className="space-y-3">
        {userPosts.length === 0 && (
          <div className="rounded-2xl glass p-6 text-center text-sm text-muted-foreground">No public posts from u/{username} yet.</div>
        )}
        {userPosts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface/50 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-black text-foreground">{value}</div>
    </div>
  );
}