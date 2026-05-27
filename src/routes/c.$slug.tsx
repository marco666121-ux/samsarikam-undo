import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { COMMUNITIES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { Bell, Settings, Users, Share2 } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$slug")({
  head: ({ params }) => {
    const c = COMMUNITIES.find((x) => x.slug === params.slug);
    const url = `${SITE_URL}/c/${params.slug}`;
    const title = `r/${params.slug} · ${c?.malayalam ?? c?.name ?? ""} — Samsarikan Undo?`;
    const desc = c?.description ?? "Community on Samsarikan Undo?";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  loader: ({ params }) => {
    const c = COMMUNITIES.find((x) => x.slug === params.slug);
    if (!c) throw notFound();
    return c;
  },
  component: CommunityPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="py-20 text-center">
        <div className="text-5xl">🫥</div>
        <h2 className="mt-4 font-display text-xl font-bold">Community not found</h2>
        <Link to="/communities" className="mt-3 inline-block text-sm text-primary hover:underline">Browse all communities →</Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="py-20 text-center text-sm text-muted-foreground">Something broke: {error.message}</div>
    </AppShell>
  ),
});

function CommunityPage() {
  const c = Route.useLoaderData();
  const { posts: all } = useStore();
  const posts = all.filter((p) => p.community === c.slug);
  const onShare = async () => {
    const url = `${window.location.origin}/c/${c.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: `r/${c.slug}`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Community link copied"); }
    } catch {}
  };
  return (
    <AppShell>
      <div className="relative mb-4 overflow-hidden rounded-3xl">
        <div className={`h-32 bg-gradient-to-br ${c.color} md:h-40`} />
        <div className="glass-strong -mt-8 mx-3 rounded-2xl p-4 md:mx-6">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c.color} text-3xl shadow-glow ring-4 ring-background`}>{c.icon}</div>
              <div>
                <h1 className="font-display text-xl font-black tracking-tight md:text-2xl">r/{c.slug}</h1>
                <div className="text-xs text-muted-foreground">{c.malayalam} · {(c.members / 1000).toFixed(1)}k members · <span className="text-primary">{c.online} online</span></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onShare} className="rounded-full p-2 hover:bg-white/10" aria-label="Share community"><Share2 className="h-4 w-4" /></button>
              <button className="rounded-full p-2 hover:bg-white/10"><Bell className="h-4 w-4" /></button>
              <button className="rounded-full p-2 hover:bg-white/10"><Settings className="h-4 w-4" /></button>
              <button className="rounded-full gradient-ember px-4 py-1.5 text-xs font-bold text-primary-foreground glow-ember">Joined</button>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {posts.length === 0 && (
          <div className="rounded-2xl glass p-8 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-2 h-6 w-6 opacity-50" />
            No posts yet. Be the first to start the conversation.
          </div>
        )}
        {posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </AppShell>
  );
}