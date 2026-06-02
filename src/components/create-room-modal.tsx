import { useState } from "react";
import { X, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { createRoom } from "@/lib/live.functions";
import { useStore } from "@/lib/store";

const COLORS = [
  "from-purple-600 to-rose-500",
  "from-rose-500 to-red-500",
  "from-orange-500 to-red-600",
  "from-amber-400 to-red-500",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
];

export function CreateRoomModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { refresh } = useStore();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const close = () => {
    onOpenChange(false);
    setTitle(""); setTopic(""); setColor(COLORS[0]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return toast.error("Title required");
    setBusy(true);
    try {
      const { room } = await createRoom({
        data: { title: title.trim(), topic: topic.trim() || null, color },
      });
      toast.success("Room started 🎙️");
      await refresh();
      close();
      if (room?.id) navigate({ to: "/room/$id", params: { id: room.id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't start room");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md md:items-center md:p-6 animate-float-up" onClick={close}>
      <form
        onSubmit={submit}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl glass-strong shadow-card md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 animate-pulse text-primary" />
            <div>
              <div className="font-display text-lg font-bold">Start a live room</div>
              <div className="text-xs text-muted-foreground">Text room for now — voice coming soon</div>
            </div>
          </div>
          <button type="button" onClick={close} className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Late Night Talks"
              maxLength={80}
              className="w-full rounded-xl border border-white/10 bg-surface/70 px-3 py-2.5 text-sm focus:border-primary/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Topic <span className="text-muted-foreground/60">(optional)</span></label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="What are we talking about?"
              className="w-full resize-none rounded-xl border border-white/10 bg-surface/70 px-3 py-2.5 text-sm focus:border-primary/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-12 rounded-lg bg-gradient-to-br ${c} ${color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/5 bg-black/30 px-5 py-3">
          <button type="button" onClick={close} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-full gradient-ember px-5 py-2 text-sm font-bold text-primary-foreground glow-ember disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
            Go live
          </button>
        </div>
      </form>
    </div>
  );
}