import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { COMMENTS, POSTS, type Comment } from "@/lib/mock-data";
import { ArrowLeft, MessageCircle, Pin, Send, Smile } from "lucide-react";

export const Route = createFileRoute("/post/$id")({
  head: ({ params }) => {
    const p = POSTS.find((x) => x.id === params.id);
    return {
      meta: [
        { title: `${p?.title ?? "Post"} — Samsarikan Undo?` },
        { name: "description", content: p?.body?.slice(0, 150) ?? p?.title ?? "" },
        { property: "og:title", content: p?.title ?? "Samsarikan Undo?" },
        { property: "og:description", content: (p?.body ?? "Read the conversation").slice(0, 200) },
      ],
    };
  },
  loader: ({ params }) => {
    const p = POSTS.find((x) => x.id === params.id);
    if (!p) throw notFound();
    return p;
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
  const post = Route.useLoaderData();
  return (
    <AppShell>
      <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
      </Link>
      <PostCard post={post} />

      <div className="mt-4 glass rounded-2xl p-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-ember text-sm font-bold text-primary-foreground">T</div>
          <div className="flex-1">
            <textarea
              rows={2}
              placeholder="Add to the conversation… (markdown, GIF, voice)"
              className="w-full resize-none rounded-xl border border-white/10 bg-surface/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-1 text-muted-foreground">
                <button className="rounded-full p-1.5 hover:bg-white/10"><Smile className="h-4 w-4" /></button>
                <button className="rounded-full p-1.5 text-[11px] font-bold hover:bg-white/10">GIF</button>
                <button className="rounded-full p-1.5 text-[11px] font-bold hover:bg-white/10">🎙️</button>
              </div>
              <button className="flex items-center gap-1.5 rounded-full gradient-ember px-4 py-1.5 text-xs font-bold text-primary-foreground glow-ember">
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
        {COMMENTS.map((c) => <CommentNode key={c.id} comment={c} depth={0} />)}
      </div>
    </AppShell>
  );
}

function CommentNode({ comment, depth }: { comment: Comment; depth: number }) {
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
            <button className="rounded p-1 hover:bg-white/10 hover:text-primary">▲</button>
            <span className="font-semibold">{comment.upvotes.toLocaleString()}</span>
            <button className="rounded p-1 hover:bg-white/10">▼</button>
            <button className="ml-2 rounded-full px-2 py-0.5 hover:bg-white/5">Reply</button>
            <button className="rounded-full px-2 py-0.5 hover:bg-white/5">🔥</button>
            <button className="rounded-full px-2 py-0.5 hover:bg-white/5">💀</button>
            <button className="rounded-full px-2 py-0.5 hover:bg-white/5">🫂</button>
          </div>
          {comment.replies && comment.replies.length > 0 && (
            <div className={`mt-2 space-y-2 border-l-2 pl-3 ${lineColors[depth % lineColors.length]}`}>
              {comment.replies.map((r) => <CommentNode key={r.id} comment={r} depth={depth + 1} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}