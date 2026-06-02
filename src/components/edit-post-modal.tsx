import { useEffect, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { editPost } from "@/lib/post-actions.functions";
import { useStore } from "@/lib/store";
import type { Post } from "@/lib/mock-data";

export function EditPostModal({ post, open, onOpenChange }: { post: Post; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { refresh } = useStore();
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setTitle(post.title); setBody(post.body ?? ""); }
  }, [open, post.id, post.title, post.body]);

  if (!open) return null;

  const close = () => onOpenChange(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 1) return toast.error("Title required");
    setBusy(true);
    try {
      await editPost({ data: { post_id: post.id, title: title.trim(), body: body.trim() } });
      toast.success("Post updated");
      await refresh();
      close();
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md md:items-center md:p-6 animate-float-up" onClick={close}>
      <form
        onSubmit={submit}
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl glass-strong shadow-card md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <div className="font-display text-lg font-bold">Edit post</div>
            <div className="text-xs text-muted-foreground">Previous version saved to edit history</div>
          </div>
          <button type="button" onClick={close} className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            className="w-full rounded-xl border border-white/10 bg-surface/70 px-4 py-3 text-base font-semibold focus:border-primary/60 focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            maxLength={20000}
            placeholder="Body…"
            className="w-full resize-none rounded-xl border border-white/10 bg-surface/70 px-4 py-3 text-sm focus:border-primary/60 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/5 bg-black/30 px-5 py-3">
          <button type="button" onClick={close} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-full gradient-ember px-5 py-2 text-sm font-bold text-primary-foreground glow-ember disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}