import { useState } from "react";
import { X, Loader2, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

const ICONS = ["💬", "☕", "🌙", "💀", "🎓", "🗳️", "🏍️", "💻", "🎮", "💔", "🌆", "🔥", "🎙️", "🎬", "📚", "🍛"];
const COLORS = [
  "from-amber-500 to-red-500",
  "from-rose-500 to-purple-500",
  "from-red-500 to-amber-400",
  "from-pink-500 to-red-500",
  "from-orange-500 to-red-600",
  "from-yellow-500 to-red-500",
  "from-red-600 to-pink-500",
  "from-rose-400 to-red-500",
];

export function CreateCommunityModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { createCommunity } = useStore();
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [malayalam, setMalayalam] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const close = () => {
    onOpenChange(false);
    setSlug(""); setName(""); setMalayalam(""); setDescription("");
    setIcon(ICONS[0]); setColor(COLORS[0]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (s.length < 3) return toast.error("Slug must be 3+ chars (a-z, 0-9, -)");
    if (name.trim().length < 2) return toast.error("Name required");
    setBusy(true);
    try {
      await createCommunity({
        slug: s,
        name: name.trim(),
        malayalam: malayalam.trim() || undefined,
        description: description.trim() || undefined,
        icon,
        color,
      });
      toast.success(`r/${s} created 🎉`);
      close();
      navigate({ to: "/c/$slug", params: { slug: s } });
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't create community");
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
          <div>
            <div className="font-display text-lg font-bold">Start a community</div>
            <div className="text-xs text-muted-foreground">Your corner of Samsarikan Undo?</div>
          </div>
          <button type="button" onClick={close} className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Slug · r/</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="naatile-tea"
              maxLength={30}
              className="w-full rounded-xl border border-white/10 bg-surface/70 px-3 py-2.5 text-sm font-mono focus:border-primary/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Naatile Tea"
              maxLength={40}
              className="w-full rounded-xl border border-white/10 bg-surface/70 px-3 py-2.5 text-sm focus:border-primary/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Malayalam name <span className="text-muted-foreground/60">(optional)</span></label>
            <input
              value={malayalam}
              onChange={(e) => setMalayalam(e.target.value)}
              placeholder="നാട്ടിലെ ചായ"
              maxLength={40}
              className="w-full rounded-xl border border-white/10 bg-surface/70 px-3 py-2.5 text-sm focus:border-primary/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="What's this community about?"
              className="w-full resize-none rounded-xl border border-white/10 bg-surface/70 px-3 py-2.5 text-sm focus:border-primary/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`grid h-9 w-9 place-items-center rounded-xl text-lg transition ${icon === i ? "gradient-ember glow-ember" : "bg-surface hover:bg-white/10"}`}
                >{i}</button>
              ))}
            </div>
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
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Create
          </button>
        </div>
      </form>
    </div>
  );
}