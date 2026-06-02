import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CreateCommunityModal } from "@/components/create-community-modal";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Users } from "lucide-react";

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { title: "Discover communities — Samsarikan Undo?" },
      { name: "description", content: "Browse Kerala's loudest, weirdest, coziest communities. Naatile tea, malayalam memes, midnight thoughts and more." },
      { property: "og:title", content: "Discover communities — Samsarikan Undo?" },
      { property: "og:description", content: "Find your people. Anonymous communities for Kerala." },
    ],
  }),
  component: Communities,
});

function Communities() {
  const { communities } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return communities;
    return communities.filter(
      (c) =>
        c.slug.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term) ||
        (c.malayalam ?? "").toLowerCase().includes(term),
    );
  }, [communities, q]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-black tracking-tight md:text-3xl">Find your people</h1>
        <p className="mt-1 text-sm text-muted-foreground">Anonymous communities. Real conversations. Pure chaos.</p>
      </div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search communities..."
          className="w-full rounded-2xl border border-white/10 bg-surface/70 px-10 py-3 text-sm focus:border-primary/60 focus:outline-none"
        />
      </div>

      <button
        onClick={() => setOpen(true)}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-4 text-sm font-semibold text-primary hover:bg-primary/10"
      >
        <Plus className="h-4 w-4" /> Create your own community
      </button>

      <div className="grid gap-3 md:grid-cols-2">
        {list.length === 0 && (
          <div className="col-span-full rounded-2xl glass p-8 text-center text-sm text-muted-foreground">
            No communities match "{q}".
          </div>
        )}
        {list.map((c) => (
          <Link
            key={c.slug}
            to="/c/$slug"
            params={{ slug: c.slug }}
            className="group relative overflow-hidden rounded-2xl glass p-4 transition hover:border-primary/30 hover:shadow-card"
          >
            <div className="flex items-start gap-3">
              <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c.color ?? "from-amber-500 to-red-500"} text-2xl shadow-glow`}>{c.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-display font-bold leading-tight">r/{c.slug}</div>
                    <div className="text-xs text-muted-foreground">{c.malayalam}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const isJoined = !!joined[c.slug];
                      setJoined((j) => ({ ...j, [c.slug]: !isJoined }));
                      toast.success(isJoined ? `Left r/${c.slug}` : `Joined r/${c.slug} ✨`);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${joined[c.slug] ? "gradient-ember text-primary-foreground glow-ember" : "border border-primary/40 bg-primary/10 text-primary hover:gradient-ember hover:text-primary-foreground"}`}
                  >
                    {joined[c.slug] ? "Joined" : "Join"}
                  </button>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> r/{c.slug}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <CreateCommunityModal open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}