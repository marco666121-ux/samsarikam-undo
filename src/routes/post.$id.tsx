import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { type Comment } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Pin, Send, Smile } from "lucide-react";
import { getPostMeta } from "@/lib/post-fetch.functions";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/post/$id")({
  head: (ctx: any) => {
    const params = ctx.params as { id: string };
    const p = ctx.loaderData?.post as { title: string; body: string | null; image: string | null } | undefined;
    const url = `${SITE_URL}/post/${params.id}`;
    const title = p?.title ? `${p.title} — Samsarikan Undo?` : "Post — Samsarikan Undo?";
    const desc = (p?.body?.slice(0, 200) ?? p?.title ?? "Read the conversation on Samsarikan Undo?");
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: p?.title ?? "Samsarikan Undo?" },
      { property: "og:description", content: desc },
      { property: "og:url", content: url },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: p?.image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: p?.title ?? "Samsarikan Undo?" },
      { name: "twitter:description", content: desc },
    ];
    if (p?.image) {
      meta.push({ property: "og:image", content: p.image });
      meta.push({ name: "twitter:image", content: p.image });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
    };
  },
  loader: async ({ params }) => {
    const r = await getPostMeta({ data: { id: params.id } }).catch(() => ({ post: null }));
    return { id: params.id, post: r.post };
  },
  component: PostPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="py-20 text-center">
        <div className="text-5xl">🫠</div>
        <h2 className="mt-4 font-display text-xl font-bold">Post not found</h2>
        <Link to="/" className="mt-3 inline-block text-sm text-primary hover:underline">Back to feed →</Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="py-20 text-center text-sm text-muted-foreground">Something broke: {error.message}</div>
    </AppShell>
  ),
});

function PostPage() {
  const { id } = Route.useLoaderData();
  const { posts, comments, addComment, voteComment, commentVotes, loadComments } = useStore();
  const post = posts.find((p) => p.id === id);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  useEffect(() => { loadComments(id); }, [id, loadComments]);

  if (!post) {
    // user-created post not hydrated yet OR truly missing
    return (
      <AppShell>
        <div className="py-20 text-center">
          <div className="text-5xl">🫠</div>
          <h2 className="mt-4 font-display text-xl font-bold">Post not found</h2>
          <Link to="/" className="mt-3 inline-block text-sm text-primary hover:underline">Back to feed →</Link>
        </div>
      </AppShell>
    );
  }

  const list = comments[post.id] ?? [];

  const submitComment = () => {
    if (!draft.trim()) return;
    addComment(post.id, draft.trim(), replyTo ?? undefined);
    toast.success(replyTo ? "Reply posted" : "Comment posted");
    setDraft(""); setReplyTo(null);
  };

  return (
    <AppShell>
      <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
      </Link>
      <PostCard post={post} full />

      <div className="mt-4 glass rounded-2xl p-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-ember text-sm font-bold text-primary-foreground">T</div>
          <div className="flex-1">
            {replyTo && (
              <div className="mb-1.5 text-[11px] text-muted-foreground">
                Replying… <button onClick={() => setReplyTo(null)} className="text-primary hover:underline">cancel</button>
              </div>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Add to the conversation… (markdown, GIF, voice)"
              className="w-full resize-none rounded-xl border border-white/10 bg-surface/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-1 text-muted-foreground">
                <button onClick={() => setDraft((d) => d + " 😂")} className="rounded-full p-1.5 hover:bg-white/10"><Smile className="h-4 w-4" /></button>
                <button onClick={() => setDraft((d) => d + " [GIF]")} className="rounded-full p-1.5 text-[11px] font-bold hover:bg-white/10">GIF</button>
                <button onClick={() => toast("Voice comments coming soon 🎙️")} className="rounded-full p-1.5 text-[11px] font-bold hover:bg-white/10">🎙️</button>
              </div>
              <button onClick={submitComment} className="flex items-center gap-1.5 rounded-full gradient-ember px-4 py-1.5 text-xs font-bold text-primary-foreground glow-ember active:scale-95">
                Comment <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <MessageCircle className="h-4 w-4" /> {post.comments.toLocaleString()} comments
        </h3>
        <select className="rounded-full border border-white/10 bg-surface px-3 py-1 text-xs focus:outline-none">
          <option>Top</option>
          <option>New</option>
          <option>Controversial</option>
          <option>Old</option>
        </select>
      </div>

      <div className="space-y-2">
        {list.length === 0 && (
          <div className="rounded-2xl glass p-6 text-center text-sm text-muted-foreground">Be the first to comment 👻</div>
        )}
        {list.map((c) => <CommentNode key={c.id} comment={c} depth={0} onReply={setReplyTo} voteComment={voteComment} commentVotes={commentVotes} />)}
      </div>
    </AppShell>
  );
}

function CommentNode({ comment, depth, onReply, voteComment, commentVotes }: { comment: Comment; depth: number; onReply: (id: string) => void; voteComment: (id: string, dir: 1 | -1) => void; commentVotes: Record<string, 1 | -1 | 0> }) {
  const myVote = commentVotes[comment.id] ?? 0;
  const lineColors = ["border-primary/40", "border-ember/40", "border-rose-400/30", "border-amber-400/30"];
  return (
    <div className={`glass rounded-2xl p-3 ${comment.pinned ? "border-ember/30 bg-ember/5" : ""} animate-float-up`}>
      <div className="flex items-start gap-2.5">
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${comment.anonymous ? "bg-surface-2 text-muted-foreground" : "gradient-ember text-primary-foreground"}`}>
          {comment.anonymous ? "👻" : comment.author[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold">{comment.anonymous ? "Ghost" : "u/" + comment.author}</span>
            <span className="text-muted-foreground">· {comment.age}</span>
            {comment.pinned && <span className="flex items-center gap-1 rounded-md bg-ember/20 px-1.5 py-0.5 text-[10px] font-bold text-ember"><Pin className="h-2.5 w-2.5" /> Pinned</span>}
          </div>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/95">{comment.body}</p>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <button onClick={() => voteComment(comment.id, 1)} className={`rounded p-1 hover:bg-white/10 hover:text-primary ${myVote === 1 ? "text-primary" : ""}`}>▲</button>
            <span className={`font-semibold ${myVote === 1 ? "text-primary" : myVote === -1 ? "text-destructive" : ""}`}>{(comment.upvotes + myVote).toLocaleString()}</span>
            <button onClick={() => voteComment(comment.id, -1)} className={`rounded p-1 hover:bg-white/10 ${myVote === -1 ? "text-destructive" : ""}`}>▼</button>
            <button onClick={() => onReply(comment.id)} className="ml-2 rounded-full px-2 py-0.5 hover:bg-white/5">Reply</button>
            <button className="rounded-full px-2 py-0.5 hover:bg-white/5">🔥</button>
            <button className="rounded-full px-2 py-0.5 hover:bg-white/5">💀</button>
            <button className="rounded-full px-2 py-0.5 hover:bg-white/5">🫂</button>
          </div>
          {comment.replies && comment.replies.length > 0 && (
            <div className={`mt-2 space-y-2 border-l-2 pl-3 ${lineColors[depth % lineColors.length]}`}>
              {comment.replies.map((r) => <CommentNode key={r.id} comment={r} depth={depth + 1} onReply={onReply} voteComment={voteComment} commentVotes={commentVotes} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}