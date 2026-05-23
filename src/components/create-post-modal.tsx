import { useState } from "react";
import { X, Image as ImageIcon, Mic, BarChart3, Smile, Hash, EyeOff, Sparkles, Send } from "lucide-react";
import { COMMUNITIES } from "@/lib/mock-data";

type Tab = "text" | "image" | "poll" | "voice";

export function CreatePostModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tab, setTab] = useState<Tab>("text");
  const [anon, setAnon] = useState(true);
  const [nsfw, setNsfw] = useState(false);
  const [community, setCommunity] = useState(COMMUNITIES[0].slug);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md md:items-center md:p-6 animate-float-up">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-t-3xl glass-strong shadow-card md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-48" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <div className="font-display text-lg font-bold">Drop a thought</div>
            <div className="text-xs text-muted-foreground">Posting to <span className="text-primary">r/{community}</span></div>
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative px-5 pt-3">
          <select
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-surface px-3 py-2.5 text-sm focus:border-primary/60 focus:outline-none"
          >
            {COMMUNITIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.icon}  r/{c.slug} · {c.malayalam}</option>
            ))}
          </select>
        </div>

        <div className="relative flex gap-1 px-5 pt-4">
          {([
            ["text", "Text", Hash],
            ["image", "Image", ImageIcon],
            ["poll", "Poll", BarChart3],
            ["voice", "Voice", Mic],
          ] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                tab === k ? "gradient-ember text-primary-foreground glow-ember" : "bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="relative px-5 py-4">
          <input
            placeholder="Title — ask, confess, vent, mass adi…"
            className="w-full rounded-xl border border-white/10 bg-surface/70 px-4 py-3 text-base font-semibold placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none"
          />
          {tab === "text" && (
            <textarea
              rows={5}
              placeholder="Type away… markdown supported. Late night thoughts welcome."
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-surface/70 px-4 py-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none"
            />
          )}
          {tab === "image" && (
            <div className="mt-3 grid h-44 place-items-center rounded-xl border border-dashed border-white/15 bg-surface/40 text-center text-sm text-muted-foreground">
              <div>
                <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-60" />
                Drop image / GIF / meme<br />
                <span className="text-xs">PNG, JPG, GIF up to 10MB</span>
              </div>
            </div>
          )}
          {tab === "poll" && (
            <div className="mt-3 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <input key={i} placeholder={`Option ${i}`} className="w-full rounded-xl border border-white/10 bg-surface/70 px-4 py-2.5 text-sm focus:border-primary/60 focus:outline-none" />
              ))}
            </div>
          )}
          {tab === "voice" && (
            <div className="mt-3 grid h-44 place-items-center rounded-xl border border-white/10 bg-surface/40">
              <button className="grid h-20 w-20 place-items-center rounded-full gradient-ember glow-ember animate-pulse-glow">
                <Mic className="h-8 w-8 text-primary-foreground" />
              </button>
              <div className="mt-3 text-xs text-muted-foreground">Tap to record · max 2 min</div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <button className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 hover:bg-white/5">
              <Smile className="h-3.5 w-3.5" /> Emoji
            </button>
            <button className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 hover:bg-white/5">
              <Hash className="h-3.5 w-3.5" /> Tags
            </button>
            <button className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-ember hover:bg-white/5">
              <Sparkles className="h-3.5 w-3.5" /> AI title
            </button>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-black/30 px-5 py-3">
          <div className="flex items-center gap-3 text-xs">
            <label className="flex cursor-pointer items-center gap-2">
              <span className={`grid h-5 w-9 place-content-center rounded-full p-0.5 transition ${anon ? "bg-primary/80" : "bg-white/10"}`}>
                <span className={`h-4 w-4 rounded-full bg-white transition ${anon ? "translate-x-2" : "-translate-x-2"}`} />
              </span>
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="hidden" />
              <EyeOff className="h-3.5 w-3.5" /> Anonymous
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
              <span className={`grid h-5 w-9 place-content-center rounded-full p-0.5 transition ${nsfw ? "bg-destructive/80" : "bg-white/10"}`}>
                <span className={`h-4 w-4 rounded-full bg-white transition ${nsfw ? "translate-x-2" : "-translate-x-2"}`} />
              </span>
              <input type="checkbox" checked={nsfw} onChange={(e) => setNsfw(e.target.checked)} className="hidden" />
              NSFW
            </label>
          </div>
          <button className="flex items-center gap-2 rounded-full gradient-ember px-5 py-2 text-sm font-bold text-primary-foreground glow-ember active:scale-95">
            Post <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
