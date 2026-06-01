import { Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Share2, Bookmark, MoreHorizontal, ArrowUp, ArrowDown, Play, Pause, Pin, Link2, Flag, UserX, Trash2, Pencil, User } from "lucide-react";
import { type Post, REACTIONS, COMMUNITIES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deletePost as deletePostFn, reportPost as reportPostFn } from "@/lib/post-actions.functions";

const GRADIENTS: Record<string, string> = {
  "gradient-1": "linear-gradient(135deg, oklch(0.45 0.2 30), oklch(0.7 0.2 60))",
  "gradient-2": "linear-gradient(135deg, oklch(0.3 0.15 350), oklch(0.55 0.22 20))",
};

export function PostCard({ post, full = false }: { post: Post; full?: boolean }) {
  const community = COMMUNITIES.find((c) => c.slug === post.community);
  const reactionEntries = Object.entries(post.reactions ?? {}) as [import("@/lib/mock-data").Reaction, number][];
  const topReactions = reactionEntries.sort((a, b) => b[1] - a[1]).slice(0, 3);
  const { vote, react, toggleSave, votePoll, votes, userReactions, saved, pollVotes, identity, blockUser, isBlocked, removePostLocal } = useStore();
  const myVote = votes[post.id] ?? 0;
  const myReaction = userReactions[post.id] ?? null;
  const isSaved = !!saved[post.id];
  const myPoll = pollVotes[post.id];
  const navigate = useNavigate();
  const isOwner = !!identity.id && post.author === identity.username && !post.anonymous;
  const url = typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : `/post/${post.id}`;

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {}
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Couldn't copy"); }
  };

  const onReport = async () => {
    const reason = window.prompt("Why are you reporting this post?");
    if (!reason?.trim()) return;
    try {
      await reportPostFn({ data: { post_id: post.id, reason: reason.trim() } });
      toast.success("Reported — moderators will review");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't report");
    }
  };

  const onBlock = () => {
    if (post.anonymous) { toast("Can't block anonymous posters"); return; }
    blockUser(post.author);
    toast.success(`Blocked u/${post.author}`);
  };

  const onDelete = async () => {
    if (!window.confirm("Delete this post? This can be undone by an admin.")) return;
    try {
      await deletePostFn({ data: { post_id: post.id } });
      removePostLocal(post.id);
      toast.success("Post deleted");
      if (full) navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete");
    }
  };

  if (isBlocked(post.author) && !post.anonymous) return null;

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
          <button
            onClick={() => vote(post.id, 1)}
            className={`rounded-md p-1 transition hover:bg-primary/10 ${myVote === 1 ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            aria-label="Upvote"
          >
            <ArrowUp className="h-4 w-4" fill={myVote === 1 ? "currentColor" : "none"} />
          </button>
          <span className={`font-bold ${myVote === 1 ? "text-primary" : myVote === -1 ? "text-destructive" : "text-foreground"}`}>{formatK(post.upvotes)}</span>
          <button
            onClick={() => vote(post.id, -1)}
            className={`rounded-md p-1 transition hover:bg-white/10 ${myVote === -1 ? "text-destructive" : "text-muted-foreground"}`}
            aria-label="Downvote"
          >
            <ArrowDown className="h-4 w-4" fill={myVote === -1 ? "currentColor" : "none"} />
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-auto rounded-md p-1 hover:bg-white/5" aria-label="Post options">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {!post.anonymous && (
                  <DropdownMenuItem onSelect={() => navigate({ to: "/u/$username", params: { username: post.author } })}>
                    <User className="mr-2 h-4 w-4" /> View profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={onShare}>
                  <Share2 className="mr-2 h-4 w-4" /> Share post
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={copyLink}>
                  <Link2 className="mr-2 h-4 w-4" /> Copy link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isOwner ? (
                  <>
                    <DropdownMenuItem onSelect={() => toast("Inline edit coming in Batch 2")}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit post
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete post
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onSelect={onReport}>
                      <Flag className="mr-2 h-4 w-4" /> Report post
                    </DropdownMenuItem>
                    {!post.anonymous && (
                      <DropdownMenuItem onSelect={onBlock}>
                        <UserX className="mr-2 h-4 w-4" /> Block u/{post.author}
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title + body */}
          <Link to="/post/$id" params={{ id: post.id }} className="mt-1.5 block">
            <h3 className="font-display text-[17px] font-bold leading-snug tracking-tight text-foreground transition group-hover:text-gradient-ember">
              {post.title}
            </h3>
            {post.body && post.type !== "voice" && (
              <p className={`mt-1.5 whitespace-pre-line text-sm ${full ? "text-foreground/90 leading-relaxed" : "line-clamp-3 text-muted-foreground"}`}>
                {post.body}
              </p>
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

          {post.type === "voice" && post.voice && <VoicePlayer src={post.voice.src} duration={post.voice.duration} />}

          {post.type === "poll" && post.poll && (
            <div className="mt-3 space-y-2">
              {(() => {
                const total = Math.max(1, post.poll.reduce((s, o) => s + o.votes, 0));
                return post.poll.map((o, i) => {
                  const pct = Math.round((o.votes / total) * 100);
                  const picked = myPoll === i;
                  return (
                    <button
                      key={i}
                      onClick={(e) => { e.preventDefault(); votePoll(post.id, i); }}
                      className={`group/poll relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition ${picked ? "border-primary/60 bg-primary/10" : "border-white/10 bg-surface hover:border-primary/30"}`}
                    >
                      <div className="absolute inset-y-0 left-0 gradient-ember opacity-20" style={{ width: `${pct}%` }} />
                      <div className="relative flex items-center justify-between">
                        <span>{picked ? "✓ " : ""}{o.option}</span>
                        <span className="text-xs font-bold text-ember">{pct}%</span>
                      </div>
                    </button>
                  );
                });
              })()}
              <div className="text-[11px] text-muted-foreground">{formatK(post.poll.reduce((s, o) => s + o.votes, 0))} votes{myPoll != null ? " · you voted" : ""}</div>
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
            <button onClick={onShare} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/5">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <button
              onClick={() => { toggleSave(post.id); toast(isSaved ? "Removed from saved" : "Saved 🔖"); }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/5 ${isSaved ? "text-ember" : ""}`}
            >
              <Bookmark className="h-3.5 w-3.5" fill={isSaved ? "currentColor" : "none"} /> {isSaved ? "Saved" : "Save"}
            </button>
            <div className="ml-auto hidden gap-1 sm:flex">
              {REACTIONS.map((r) => (
                <button
                  key={r.key}
                  title={r.label}
                  onClick={() => react(post.id, r.key)}
                  className={`grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/10 hover:scale-125 active:scale-90 ${myReaction === r.key ? "bg-primary/20 ring-1 ring-primary scale-110" : ""}`}
                >
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

function VoicePlayer({ src, duration }: { src?: string; duration: number }) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const a = new Audio(src);
    audioRef.current = a;
    a.ontimeupdate = () => setPos(a.currentTime);
    a.onended = () => { setPlaying(false); setPos(0); };
    return () => { a.pause(); audioRef.current = null; };
  }, [src]);

  const toggle = () => {
    if (!src) { toast("Demo voice post — no audio attached"); return; }
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };

  const shown = src ? Math.floor(pos) : 0;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <button onClick={toggle} className="grid h-10 w-10 place-items-center rounded-full gradient-ember glow-ember active:scale-95">
        {playing ? <Pause className="h-4 w-4 text-primary-foreground" fill="currentColor" /> : <Play className="h-4 w-4 text-primary-foreground" fill="currentColor" />}
      </button>
      <Waveform active={playing} />
      <span className="text-xs font-mono text-muted-foreground">0:{String(shown || duration).padStart(2, "0")}</span>
    </div>
  );
}

function Waveform({ active = false }: { active?: boolean }) {
  const bars = [6, 12, 18, 14, 22, 10, 16, 24, 12, 20, 8, 14, 22, 18, 10, 16, 12, 20, 14, 8];
  return (
    <div className="flex h-8 flex-1 items-center gap-0.5">
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-0.5 rounded-full bg-gradient-to-t from-primary to-ember ${active ? "animate-pulse" : ""}`}
          style={{ height: `${h}px`, opacity: 0.4 + (i / bars.length) * 0.6, animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

function formatK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}
