import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { ME, POSTS } from "@/lib/mock-data";
import { Flame, Settings, Share2 } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: `u/TeaConnoisseur — Samsarikan Undo?` },
      { name: "description", content: "Karma, badges, posts, streaks and ranks." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const myPosts = POSTS.slice(0, 3);
  const xpPct = Math.round((ME.xp / ME.xpToNext) * 100);
  return (
    <AppShell>
      <div className="relative mb-4 overflow-hidden rounded-3xl">
        <div className="h-32 gradient-ember md:h-44" />
        <div className="glass-strong -mt-10 mx-3 rounded-2xl p-4 md:mx-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl gradient-ember text-3xl font-black text-primary-foreground shadow-glow ring-4 ring-background">
                T
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-black tracking-tight">u/{ME.username}</h1>
                  <span className="rounded-full gradient-ember px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{ME.rank}</span>
                </div>
                <div className="text-xs text-muted-foreground">{ME.malayalam}</div>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">{ME.bio}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-full p-2 hover:bg-white/10"><Share2 className="h-4 w-4" /></button>
              <button className="rounded-full p-2 hover:bg-white/10"><Settings className="h-4 w-4" /></button>
              <button className="rounded-full gradient-ember px-4 py-1.5 text-xs font-bold text-primary-foreground glow-ember">Edit</button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Karma" value={ME.karma.toLocaleString()} />
            <Stat label="Streak" value={`${ME.streak} 🔥`} />
            <Stat label="Badges" value={ME.badges.length.toString()} />
            <Stat label="Joined" value={`${ME.joined.length} clubs`} />
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Progress to <span className="text-ember">Meme Lord</span></span>
              <span className="text-muted-foreground">{ME.xp.toLocaleString()} / {ME.xpToNext.toLocaleString()} XP</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full gradient-ember" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {ME.badges.map((b) => (
          <span key={b} className="rounded-full border border-white/10 bg-surface/60 px-3 py-1 text-xs">{b}</span>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Communities</h2>
        <div className="flex flex-wrap gap-2">
          {ME.joined.map((c) => (
            <div key={c.slug} className={`flex items-center gap-2 rounded-2xl bg-gradient-to-br ${c.color} p-[1px]`}>
              <div className="flex items-center gap-2 rounded-2xl bg-background/85 px-3 py-1.5 backdrop-blur">
                <span>{c.icon}</span>
                <span className="text-xs font-semibold">r/{c.slug}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <Flame className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Top posts</h2>
      </div>
      <div className="space-y-3">
        {myPosts.map((p) => <PostCard key={p.id} post={p} />)}
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