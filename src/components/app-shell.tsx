import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Compass, Plus, Bell, User, Search, Flame, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CreatePostModal } from "./create-post-modal";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { COMMUNITIES } from "@/lib/mock-data";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/communities", label: "Discover", icon: Compass },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen text-foreground">
      <TopBar onCompose={() => setOpen(true)} />
      <div className="mx-auto flex max-w-[1400px] gap-6 px-3 pb-28 pt-4 md:px-6 md:pb-10 md:pt-6">
        <LeftRail path={path} />
        <main className="min-w-0 flex-1">{children}</main>
        <RightRail />
      </div>
      <BottomNav path={path} onCompose={() => setOpen(true)} />
      <CreatePostModal open={open} onOpenChange={setOpen} />
    </div>
  );
}

function TopBar({ onCompose }: { onCompose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { identity } = useStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim().toLowerCase();
    if (!term) return;
    const match = COMMUNITIES.find((c) => c.slug.includes(term) || c.name.toLowerCase().includes(term));
    if (match) navigate({ to: "/c/$slug", params: { slug: match.slug } });
    else { toast(`No community matches "${q}" — try /communities`); navigate({ to: "/communities" }); }
  };
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 glass-strong">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl gradient-ember glow-ember">
            <span className="text-lg">☕</span>
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse-glow rounded-full bg-primary" />
          </div>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="font-display text-base font-bold tracking-tight">Samsarikan Undo?</span>
            <span className="text-[10px] text-muted-foreground">സംസാരിക്കാൻ ഉണ്ടോ?</span>
          </div>
        </Link>
        <form onSubmit={onSearch} className="relative ml-2 flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posts, communities, vibes..."
            className="w-full rounded-full border border-white/10 bg-surface/70 px-10 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground md:block">⌘ K</kbd>
        </form>
        <button
          onClick={onCompose}
          className="hidden items-center gap-2 rounded-full gradient-ember px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105 active:scale-95 md:inline-flex"
        >
          <Plus className="h-4 w-4" />
          Post
        </button>
        {identity.ghost || !identity.id ? (
          <Link
            to="/profile"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-surface text-sm font-bold"
            title="Profile"
          >
            👻
          </Link>
        ) : (
          <Link
            to="/u/$username"
            params={{ username: identity.username }}
            className="grid h-9 w-9 place-items-center rounded-full gradient-ember text-sm font-bold text-primary-foreground"
            title={`u/${identity.username}`}
          >
            {identity.username[0]?.toUpperCase()}
          </Link>
        )}
      </div>
    </header>
  );
}

function LeftRail({ path }: { path: string }) {
  const { rooms } = useStore();
  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-56 shrink-0 flex-col gap-1 overflow-y-auto no-scrollbar md:flex">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = path === to || (to !== "/" && path.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-primary/15 text-foreground glow-ring"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
            {label}
          </Link>
        );
      })}
      {rooms.length > 0 && (
        <>
          <div className="mt-4 px-3 text-[11px] uppercase tracking-wider text-muted-foreground">Live now</div>
          {rooms.slice(0, 5).map((r: any) => (
            <Link
              key={r.id}
              to="/room/$id"
              params={{ id: r.id }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <Radio className="h-4 w-4 animate-pulse text-primary" />
              <span className="truncate">{r.title}</span>
            </Link>
          ))}
        </>
      )}
    </aside>
  );
}

function RightRail() {
  const { identity, setIdentity } = useStore();
  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-72 shrink-0 flex-col gap-4 overflow-y-auto no-scrollbar xl:flex">
      <div className="glass rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Flame className="h-4 w-4 text-primary" /> Trending in Kerala
        </div>
        <ol className="space-y-2 text-sm">
          {["Naatile tea aunty plot twist", "Munnar flash floods update", "BGMI tournament Kochi", "KSRTC fare hike memes", "Tech layoffs in Infopark"].map((t, i) => (
            <li key={t} className="flex items-start gap-2 rounded-lg p-1.5 hover:bg-white/5">
              <span className="grid h-5 w-5 place-items-center rounded text-xs font-bold text-ember">{i + 1}</span>
              <span className="leading-tight">{t}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="mb-3 text-sm font-semibold">Join the conversation</div>
        <p className="mb-3 text-xs text-muted-foreground">
          Anonymous mode is on by default. Be kind. Be unhinged. Be naadan.
        </p>
        <button
          onClick={() => {
            setIdentity({ username: identity.ghost ? "TeaConnoisseur" : "Ghost", ghost: !identity.ghost });
            toast.success(identity.ghost ? "Welcome, TeaConnoisseur ☕" : "Now browsing as Ghost 👻");
          }}
          className="w-full rounded-xl gradient-ember py-2 text-sm font-semibold text-primary-foreground glow-ember"
        >
          {identity.ghost ? "Continue as Ghost 👻" : "Switch back to Ghost 👻"}
        </button>
      </div>
    </aside>
  );
}

function BottomNav({ path, onCompose }: { path: string; onCompose: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="mx-auto max-w-md px-3 pb-3">
        <div className="flex items-center justify-around rounded-2xl glass-strong p-2 shadow-card">
          {NAV.slice(0, 2).map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== "/" && path.startsWith(to));
            return (
              <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
          <button
            onClick={onCompose}
            className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl gradient-ember shadow-glow active:scale-95"
            aria-label="Create"
          >
            <Plus className="h-7 w-7 text-primary-foreground" />
          </button>
          {NAV.slice(2).map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== "/" && path.startsWith(to));
            return (
              <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
