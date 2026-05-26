import { useState } from "react";
import { X, Image as ImageIcon, Mic, Square, BarChart3, Smile, Hash, EyeOff, Sparkles, Send, RotateCcw, Play, Pause } from "lucide-react";
import { COMMUNITIES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type Tab = "text" | "image" | "poll" | "voice";

export function CreatePostModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tab, setTab] = useState<Tab>("text");
  const [anon, setAnon] = useState(true);
  const [nsfw, setNsfw] = useState(false);
  const [community, setCommunity] = useState(COMMUNITIES[0].slug);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [pollOptions, setPollOptions] = useState(["", "", "", ""]);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewRef = useState<HTMLAudioElement | null>(null);
  const { addPost } = useStore();
  const navigate = useNavigate();
  const rec = useVoiceRecorder(120);

  if (!open) return null;

  const reset = () => {
    setTitle(""); setBody(""); setTags(""); setImageData(null);
    setPollOptions(["", "", "", ""]); setTab("text"); rec.reset();
  };

  const close = () => { onOpenChange(false); reset(); };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error("Max 8MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    const tagList = tags.split(/[,\s]+/).map((t) => t.replace(/^#/, "")).filter(Boolean);
    let voice: { duration: number; src?: string } | undefined;
    let poll: { option: string; votes: number }[] | undefined;
    let image: string | undefined;
    if (tab === "voice") {
      if (!rec.audioUrl) { toast.error("Record something first"); return; }
      voice = { duration: rec.seconds, src: rec.audioUrl };
    }
    if (tab === "poll") {
      const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) { toast.error("Need at least 2 options"); return; }
      poll = opts.map((o) => ({ option: o, votes: 0 }));
    }
    if (tab === "image") {
      if (!imageData) { toast.error("Pick an image"); return; }
      image = imageData;
    }
    const type = tab === "image" ? "meme" : tab === "voice" ? "voice" : tab === "poll" ? "poll" : "text";
    const post = await addPost({
      community, title: title.trim(), body: body.trim() || undefined, type,
      anonymous: anon, nsfw, tags: tagList.length ? tagList : undefined,
      voice, poll, image,
    });
    toast.success("Posted! 🔥");
    onOpenChange(false);
    reset();
    navigate({ to: "/post/$id", params: { id: post.id } });
  };

  const togglePreview = () => {
    if (!rec.audioUrl) return;
    if (!previewRef[0]) {
      const a = new Audio(rec.audioUrl);
      a.onended = () => setPreviewPlaying(false);
      previewRef[1](a);
      a.play(); setPreviewPlaying(true);
    } else {
      const a = previewRef[0];
      if (a.paused) { a.play(); setPreviewPlaying(true); } else { a.pause(); setPreviewPlaying(false); }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md md:items-center md:p-6 animate-float-up" onClick={close}>
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl glass-strong shadow-card md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-48" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <div className="font-display text-lg font-bold">Drop a thought</div>
            <div className="text-xs text-muted-foreground">Posting to <span className="text-primary">r/{community}</span></div>
          </div>
          <button onClick={close} className="rounded-full p-2 hover:bg-white/10">
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={280}
            placeholder="Title — ask, confess, vent, mass adi…"
            className="w-full rounded-xl border border-white/10 bg-surface/70 px-4 py-3 text-base font-semibold placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none"
          />
          {tab === "text" && (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Type away… markdown supported. Late night thoughts welcome."
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-surface/70 px-4 py-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none"
            />
          )}
          {tab === "image" && (
            <label className="mt-3 block cursor-pointer">
              {imageData ? (
                <img src={imageData} alt="preview" className="max-h-72 w-full rounded-xl object-cover" />
              ) : (
                <div className="grid h-44 place-items-center rounded-xl border border-dashed border-white/15 bg-surface/40 text-center text-sm text-muted-foreground hover:border-primary/40">
                  <div>
                    <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-60" />
                    Tap to upload image / GIF / meme<br />
                    <span className="text-xs">PNG, JPG, GIF up to 8MB</span>
                  </div>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
          )}
          {tab === "poll" && (
            <div className="mt-3 space-y-2">
              {pollOptions.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={(e) => setPollOptions((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`Option ${i + 1}`}
                  className="w-full rounded-xl border border-white/10 bg-surface/70 px-4 py-2.5 text-sm focus:border-primary/60 focus:outline-none"
                />
              ))}
            </div>
          )}
          {tab === "voice" && (
            <div className="mt-3 flex h-52 flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-surface/40">
              {rec.state === "recording" ? (
                <button onClick={rec.stop} className="grid h-20 w-20 place-items-center rounded-full bg-destructive shadow-glow animate-pulse-glow">
                  <Square className="h-8 w-8 text-primary-foreground" fill="currentColor" />
                </button>
              ) : rec.audioUrl ? (
                <div className="flex items-center gap-3">
                  <button onClick={togglePreview} className="grid h-14 w-14 place-items-center rounded-full gradient-ember glow-ember">
                    {previewPlaying ? <Pause className="h-6 w-6 text-primary-foreground" fill="currentColor" /> : <Play className="h-6 w-6 text-primary-foreground" fill="currentColor" />}
                  </button>
                  <button onClick={() => { setPreviewPlaying(false); previewRef[1](null); rec.reset(); }} className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-muted-foreground hover:bg-white/10">
                    <RotateCcw className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button onClick={rec.start} className="grid h-20 w-20 place-items-center rounded-full gradient-ember glow-ember animate-pulse-glow">
                  <Mic className="h-8 w-8 text-primary-foreground" />
                </button>
              )}
              <div className="text-xs text-muted-foreground">
                {rec.state === "recording" && <>Recording · 0:{String(rec.seconds).padStart(2, "0")} / 2:00 — tap to stop</>}
                {rec.state === "idle" && <>Tap mic to record · max 2 min</>}
                {rec.state === "stopped" && <>Recorded {rec.seconds}s · tap mic to re-record</>}
                {rec.state === "error" && <span className="text-destructive">{rec.error}</span>}
              </div>
            </div>
          )}

          <div className="mt-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface/40 px-3 py-1.5 text-xs">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="add tags (comma separated)…"
                className="flex-1 bg-transparent placeholder:text-muted-foreground/70 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!title) return toast("Type a title first");
                  setTitle(title + " 🔥");
                }}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-ember hover:bg-white/5"
              >
                <Sparkles className="h-3 w-3" /> spice
              </button>
            </div>
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
          <button onClick={submit} className="flex items-center gap-2 rounded-full gradient-ember px-5 py-2 text-sm font-bold text-primary-foreground glow-ember active:scale-95">
            Post <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
