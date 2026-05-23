import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { LIVE_ROOMS, POSTS, TRENDING_TAGS } from "@/lib/mock-data";
import { Flame, Radio, Sparkles, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Samsarikan Undo? — Kerala's anonymous social home" },
      { name: "description", content: "Confessions, memes, midnight thoughts, live rooms. Kerala's Reddit, in Malayalam and Manglish." },
      { property: "og:title", content: "Samsarikan Undo? — സംസാരിക്കാൻ ഉണ്ടോ?" },
      { property: "og:description", content: "The anonymous social home for Kerala. Naatile tea, midnight thoughts, dank memes." },
    ],
  }),
  component: Index,
});

const FILTERS = [
  { key: "hot", label: "Hot", icon: Flame },
  { key: "new", label: "New", icon: Sparkles },
  { key: "trending", label: "Trending", icon: TrendingUp },
  { key: "nearby", label: "Nearby", icon: Users },
] as const;

function Index() {
  return (
    <AppShell>
      <Hero />
      <LiveStrip />
      <FilterBar />
      <TagPills />
      <div className="mt-4 space-y-3">
        {POSTS.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        <LoadMore />
      </div>
    </AppShell>
  );
}

function Hero() {
  return (
    <section className="relative mb-4 overflow-hidden rounded-3xl glass-strong p-5 md:p-7">
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> 12,420 online now
          </div>
          <h1 className="font-display text-2xl font-black leading-tight tracking-tight md:text-3xl">
            <span className="text-gradient-ember">സംസാരിക്കാൻ ഉണ്ടോ?</span>
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Kerala's late-night internet. Confessions, memes, naatile tea, midnight thoughts — all anonymous if you want.
          </p>
        </div>
        <div className="hidden md:block">
          <div className="relative grid h-20 w-20 place-items-center rounded-2xl gradient-ember glow-ember">
            <span className="text-4xl">☕</span>
            <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-background text-xs">🔥</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveStrip() {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <Radio className="h-4 w-4 animate-pulse text-primary" /> Live rooms
        </h2>
        <button className="text-xs text-ember hover:underline">See all</button>
      </div>
      <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-2 no-scrollbar md:mx-0 md:px-0">
        {LIVE_ROOMS.map((r) => (
          <div key={r.id} className={`min-w-[240px] overflow-hidden rounded-2xl bg-gradient-to-br ${r.color} p-[1px]`}>
            <div className="h-full rounded-2xl bg-background/85 p-3 backdrop-blur">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live · {r.listeners} listening
              </div>
              <div className="mt-1.5 font-display font-bold leading-tight">{r.title}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.topic}</div>
              <div className="mt-2 flex items-center gap-1">
                {r.hosts.map((h, i) => (
                  <span key={i} className="grid h-6 w-6 place-items-center rounded-full border border-background bg-surface-2 text-[10px] font-bold" style={{ marginLeft: i ? -8 : 0 }}>
                    {h.startsWith("+") ? h : h[0]}
                  </span>
                ))}
                <button className="ml-auto rounded-full gradient-ember px-2.5 py-1 text-[10px] font-bold text-primary-foreground">Join</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterBar() {
  return (
    <div className="sticky top-[68px] z-30 -mx-3 mb-3 flex gap-1 overflow-x-auto border-y border-white/5 bg-background/70 px-3 py-2 backdrop-blur-md no-scrollbar md:mx-0 md:rounded-2xl md:border-x">
      {FILTERS.map(({ key, label, icon: Icon }, i) => (
        <button
          key={key}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            i === 0 ? "gradient-ember text-primary-foreground glow-ember" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          }`}
        >
          <Icon className="h-3.5 w-3.5" /> {label}
        </button>
      ))}
      <div className="ml-auto hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
        <Link to="/communities" className="rounded-full px-3 py-1.5 hover:bg-white/5">All communities →</Link>
      </div>
    </div>
  );
}

function TagPills() {
  return (
    <div className="mb-1 flex flex-wrap gap-1.5">
      {TRENDING_TAGS.map((t) => (
        <button key={t} className="rounded-full border border-white/10 bg-surface/50 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary">
          {t}
        </button>
      ))}
    </div>
  );
}

function LoadMore() {
  return (
    <div className="py-8 text-center">
      <button className="rounded-full border border-white/10 bg-surface/50 px-6 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary">
        Load more posts
      </button>
      <p className="mt-3 text-[11px] text-muted-foreground/60">
        You scrolled to the bottom of the internet. Aano? 👀
      </p>
    </div>
  );
}
