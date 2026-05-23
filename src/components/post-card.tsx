import { Link } from "@tanstack/react-router";
import { MessageCircle, Share2, Bookmark, MoreHorizontal, ArrowUp, ArrowDown, Play, Pin } from "lucide-react";
import { type Post, REACTIONS, COMMUNITIES } from "@/lib/mock-data";

const GRADIENTS: Record<string, string> = {
  "gradient-1": "linear-gradient(135deg, oklch(0.45 0.2 30), oklch(0.7 0.2 60))",
  "gradient-2": "linear-gradient(135deg, oklch(0.3 0.15 350), oklch(0.55 0.22 20))",
};

export function PostCard({ post }: { post: Post }) {
  const community = COMMUNITIES.find((c) => c.slug === post.community);
  const reactionEntries = Object.entries(post.reactions ?? {}) as [import("@/lib/mock-data").Reaction, number][];
  const topReactions = reactionEntries.sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <article className="group relative overflow-hidden rounded-2xl glass transition hover:border-primary/30 hover:shadow-card animate-float-up">
      {post.pinned && (
        <div className="flex items-center gap-1.5 border-b border-white/5 bg-ember/10 px-4 py-1.5 text-[11px] font-semibold text-ember">
          <Pin className="h-3 w-3" /> Pinned by community
        </div>
      )}
      <div className="flex gap-3 p-4">
        {/* Vote rail */}
        <div className="flex flex-col items-center gap-1 text-xs">
          <button className="rounded-md p-1 text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
            <ArrowUp className="h-4 w-4" />
          </button>
          <span className="font-bold text-foreground">{formatK(post.upvotes)}</span>
          <button className="rounded-md p-1 text-muted-foreground transition hover:bg-white/10">
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {community && (
              <Link to="/c/$slug" params={{ slug: community.slug }} className="flex items-center gap-1.5 font-semibold text-foreground hover:underline">
                <span className={`grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br ${community.color} text-[10px]`}>{community.icon}</span>
                r/{community.slug}
              </Link>
            )}
            <span>·</span>
            <span>{post.anonymous ? "👻 Ghost" : "u/" + post.author}</span>
            <span>·</span>
            <span>{post.age}</span>
            {post.nsfw && <span className="rounded-md bg-destructive/20 px-1.5 py-0.5 text-[10px] font-bold text-destructive">NSFW</span>}
            <button className="ml-auto rounded-md p-1 hover:bg-white/5"><MoreHorizontal className="h-4 w-4" /></button>
          </div>

          {/* Title + body */}
          <Link to="/post/$id" params={{ id: post.id }} className="mt-1.5 block">
            <h3 className="font-display text-[17px] font-bold leading-snug tracking-tight text-foreground transition group-hover:text-gradient-ember">
              {post.title}
            </h3>
            {post.body && post.type !== "voice" && (
              <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{post.body}</p>
            )}
          </Link>

          {/* Media */}
          {post.type === "meme" && post.image && (
            <div
              className="mt-3 grid aspect-[16/10] place-items-center overflow-hidden rounded-xl text-center font-display text-2xl font-black text-white/90"
              style={{ background: GRADIENTS[post.image] ?? "linear-gradient(135deg, #7f1d1d, #f59e0b)" }}
            >
              <div className="px-6 [text-shadow:0_4px_12px_rgba(0,0,0,.5)]">{post.title}</div>
            </div>
          )}

          {post.type === "voice" && post.voice && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <button className="grid h-10 w-10 place-items-center rounded-full gradient-ember glow-ember">
                <Play className="h-4 w-4 text-primary-foreground" fill="currentColor" />
              </button>
              <Waveform />
              <span className="text-xs font-mono text-muted-foreground">0:{String(post.voice.duration).padStart(2, "0")}</span>
            </div>
          )}

          {post.type === "poll" && post.poll && (
            <div className="mt-3 space-y-2">
              {(() => {
                const total = post.poll.reduce((s, o) => s + o.votes, 0);
                return post.poll.map((o, i) => {
                  const pct = Math.round((o.votes / total) * 100);
                  return (
                    <button key={i} className="group/poll relative w-full overflow-hidden rounded-lg border border-white/10 bg-surface px-3 py-2 text-left text-sm">
                      <div className="absolute inset-y-0 left-0 gradient-ember opacity-20" style={{ width: `${pct}%` }} />
                      <div className="relative flex items-center justify-between">
                        <span>{o.option}</span>
                        <span className="text-xs font-bold text-ember">{pct}%</span>
                      </div>
                    </button>
                  );
                });
              })()}
              <div className="text-[11px] text-muted-foreground">{formatK(post.poll.reduce((s, o) => s + o.votes, 0))} votes</div>
            </div>
          )}

          {post.tags && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {topReactions.length > 0 && (
              <div className="mr-2 flex items-center -space-x-1.5">
                {topReactions.map(([key, count]) => {
                  const r = REACTIONS.find((x) => x.key === key)!;
                  return (
                    <span key={key} className="grid h-6 w-6 place-items-center rounded-full border border-background bg-surface-2 text-xs" title={`${r.label}: ${count}`}>
                      {r.emoji}
                    </span>
                  );
                })}
                <span className="ml-2 text-xs text-muted-foreground">{formatK(reactionEntries.reduce((s, [, n]) => s + n, 0))}</span>
              </div>
            )}
            <Link to="/post/$id" params={{ id: post.id }} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/5">
              <MessageCircle className="h-3.5 w-3.5" /> {formatK(post.comments)}
            </Link>
            <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/5">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/5">
              <Bookmark className="h-3.5 w-3.5" /> Save
            </button>
            <div className="ml-auto hidden gap-1 sm:flex">
              {REACTIONS.map((r) => (
                <button key={r.key} title={r.label} className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/10 hover:scale-125 active:scale-90">
                  <span>{r.emoji}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Waveform() {
  const bars = [6, 12, 18, 14, 22, 10, 16, 24, 12, 20, 8, 14, 22, 18, 10, 16, 12, 20, 14, 8];
  return (
    <div className="flex h-8 flex-1 items-center gap-0.5">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-gradient-to-t from-primary to-ember"
          style={{ height: `${h}px`, opacity: 0.4 + (i / bars.length) * 0.6 }}
        />
      ))}
    </div>
  );
}

function formatK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}
