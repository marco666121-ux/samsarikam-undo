import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Shield,
  Search,
  LogOut,
  Loader2,
  Trash2,
  RotateCcw,
  Pencil,
  Ban,
  UserCheck,
  AlertTriangle,
  Activity,
  History,
  ExternalLink,
  X,
} from "lucide-react";
import { adminLogin, adminCheck } from "@/lib/auth.functions";
import { adminStats } from "@/lib/admin.functions";
import {
  moderationSearch,
  getEntityDetail,
  softDelete,
  restoreEntity,
  editWithHistory,
  listModerationLog,
  undoModerationAction,
  adminLogout,
} from "@/lib/moderation.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Samsarikan Undo?" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

type EntityType = "post" | "comment" | "community" | "user";

function AdminPage() {
  const check = useServerFn(adminCheck);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-check"],
    queryFn: () => check({ data: {} as any }),
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data?.ok) return <AdminLoginScreen onSuccess={() => refetch()} />;
  return <AdminDashboard />;
}

function AdminLoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const login = useServerFn(adminLogin);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim() || busy) return;
    setBusy(true);
    try {
      await login({ data: { password: pw } });
      toast.success("Admin session active");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl glass-strong p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-ember">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Admin access</h1>
            <p className="text-xs text-muted-foreground">Restricted area</p>
          </div>
        </div>
        <label className="mb-1 block text-xs text-muted-foreground">Password</label>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-surface px-3 py-2.5 text-sm focus:border-primary/60 focus:outline-none"
          placeholder="Enter admin password"
        />
        <button
          type="submit"
          disabled={busy || !pw.trim()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-ember px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          Sign in
        </button>
        <Link to="/" className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back to site
        </Link>
      </form>
    </div>
  );
}

function AdminDashboard() {
  const qc = useQueryClient();
  const stats = useServerFn(adminStats);
  const logout = useServerFn(adminLogout);
  const statsQ = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => stats({ data: {} as any }),
    refetchInterval: 30_000,
  });

  const [target, setTarget] = useState<{ type: EntityType; id: string } | null>(null);

  const onLogout = async () => {
    await logout({ data: {} as any });
    qc.invalidateQueries({ queryKey: ["admin-check"] });
    toast("Signed out");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/5 glass-strong">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-bold">Admin Console</h1>
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            LIVE
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/"
              className="hidden items-center gap-1 rounded-full border border-white/10 bg-surface px-3 py-1.5 text-xs sm:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Site
            </Link>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface px-3 py-1.5 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        <StatsGrid stats={statsQ.data} loading={statsQ.isLoading} />
        <UniversalSearch onSelect={setTarget} />
        {target && <EntityPanel type={target.type} id={target.id} onClose={() => setTarget(null)} />}
        <ModerationLogPanel onOpen={setTarget} />
      </main>
    </div>
  );
}

function StatsGrid({ stats, loading }: { stats: any; loading: boolean }) {
  const cards = [
    { label: "Online", val: stats?.online, accent: "text-green-400" },
    { label: "Users", val: stats?.users },
    { label: "Posts", val: stats?.posts },
    { label: "Posts today", val: stats?.postsToday },
    { label: "Comments", val: stats?.comments },
    { label: "Communities", val: stats?.communities },
    { label: "Live rooms", val: stats?.liveRooms, accent: "text-primary" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl glass p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
          <div className={`mt-1 text-xl font-bold ${c.accent ?? ""}`}>
            {loading ? "…" : (c.val ?? 0)}
          </div>
        </div>
      ))}
    </div>
  );
}

function UniversalSearch({ onSelect }: { onSelect: (t: { type: EntityType; id: string }) => void }) {
  const search = useServerFn(moderationSearch);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim() || busy) return;
    setBusy(true);
    try {
      const r = await search({ data: { query: q } });
      setResults(r.results);
      if (r.results.length === 0) toast("No matches");
    } catch (err: any) {
      toast.error(err?.message ?? "Search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl glass p-4">
      <div className="mb-2 flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Universal moderation search</h2>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Paste URL, username, post id, community slug, or IP..."
          className="flex-1 rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm focus:border-primary/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="inline-flex items-center gap-1 rounded-xl gradient-ember px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </form>
      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
          {results.map((r, i) => (
            <li key={`${r.type}-${r.id}-${i}`}>
              <button
                onClick={() => onSelect({ type: r.type, id: r.id })}
                className="flex w-full items-center gap-3 bg-surface/40 px-3 py-2 text-left text-sm hover:bg-surface"
              >
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                  {r.type}
                </span>
                <span className="flex-1 truncate">{r.label}</span>
                {r.meta && <span className="text-[11px] text-muted-foreground">{r.meta}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EntityPanel({ type, id, onClose }: { type: EntityType; id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const detailFn = useServerFn(getEntityDetail);
  const softDelFn = useServerFn(softDelete);
  const restoreFn = useServerFn(restoreEntity);
  const editFn = useServerFn(editWithHistory);

  const detailQ = useQuery({
    queryKey: ["admin-entity", type, id],
    queryFn: () => detailFn({ data: { type, id } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-entity", type, id] });
    qc.invalidateQueries({ queryKey: ["admin-log"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const delMut = useMutation({
    mutationFn: (reason?: string) => softDelFn({ data: { type, id, reason } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const restoreMut = useMutation({
    mutationFn: () => restoreFn({ data: { type, id } }),
    onSuccess: () => { toast.success("Restored"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const editMut = useMutation({
    mutationFn: (patch: Record<string, unknown>) => editFn({ data: { type: type as any, id, patch } }),
    onSuccess: () => { toast.success("Saved"); setEditing(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const [editing, setEditing] = useState(false);

  if (detailQ.isLoading) {
    return (
      <div className="rounded-2xl glass p-6 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const entity = detailQ.data?.entity as any;
  if (!entity) {
    return (
      <div className="rounded-2xl glass p-4 text-sm text-muted-foreground">
        Not found.
        <button onClick={onClose} className="ml-2 underline">Close</button>
      </div>
    );
  }
  const isDeleted = !!entity.deleted || !!entity.deleted_at || !!entity.is_banned;
  const extra = detailQ.data?.extra as any;

  return (
    <div className="rounded-2xl glass-strong p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
          {type}
        </span>
        <h3 className="truncate text-sm font-semibold">
          {type === "post" && entity.title}
          {type === "comment" && (entity.body ?? "").slice(0, 80)}
          {type === "community" && `c/${entity.slug} — ${entity.name}`}
          {type === "user" && `@${entity.username}`}
        </h3>
        {isDeleted && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
            {type === "user" ? "BANNED" : "DELETED"}
          </span>
        )}
        <button onClick={onClose} className="ml-auto rounded-full p-1.5 hover:bg-white/5" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {!isDeleted ? (
          <button
            onClick={() => {
              if (confirm(`${type === "user" ? "Ban" : "Delete"} this ${type}?`)) delMut.mutate(undefined);
            }}
            disabled={delMut.isPending}
            className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
          >
            {type === "user" ? <Ban className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
            {type === "user" ? "Ban user" : "Delete"}
          </button>
        ) : (
          <button
            onClick={() => restoreMut.mutate()}
            disabled={restoreMut.isPending}
            className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-500/25 disabled:opacity-50"
          >
            {type === "user" ? <UserCheck className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
            {type === "user" ? "Unban" : "Restore"}
          </button>
        )}
        {type !== "user" && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface px-3 py-1.5 text-xs hover:bg-surface-2"
          >
            <Pencil className="h-3.5 w-3.5" /> {editing ? "Cancel edit" : "Edit"}
          </button>
        )}
        {type === "post" && (
          <Link
            to="/post/$id"
            params={{ id: entity.id }}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface px-3 py-1.5 text-xs hover:bg-surface-2"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </Link>
        )}
        {type === "community" && (
          <Link
            to="/c/$slug"
            params={{ slug: entity.slug }}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface px-3 py-1.5 text-xs hover:bg-surface-2"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </Link>
        )}
      </div>

      {editing && type !== "user" && (
        <EditForm type={type as any} entity={entity} onSubmit={(p) => editMut.mutate(p)} pending={editMut.isPending} />
      )}

      {/* Body */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-surface/40 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">Content</div>
          {type === "post" && (
            <>
              <p className="font-semibold">{entity.title}</p>
              {entity.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{entity.body}</p>}
              <div className="mt-2 text-[11px] text-muted-foreground">
                by @{entity.author_username} {entity.anonymous && "· anon"} · c/{entity.community_slug} ·{" "}
                {new Date(entity.created_at).toLocaleString()}
              </div>
            </>
          )}
          {type === "comment" && (
            <>
              <p className="whitespace-pre-wrap text-sm">{entity.body}</p>
              <div className="mt-2 text-[11px] text-muted-foreground">
                by @{entity.author_username} · post {entity.post_id?.slice(0, 8)}…
              </div>
            </>
          )}
          {type === "community" && (
            <>
              <p className="font-semibold">{entity.name}</p>
              <p className="text-sm text-muted-foreground">{entity.description}</p>
            </>
          )}
          {type === "user" && (
            <>
              <p className="font-semibold">@{entity.username}</p>
              <p className="text-xs text-muted-foreground">Joined {new Date(entity.created_at).toLocaleString()}</p>
              {extra && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {extra.postCount} posts · {extra.commentCount} comments
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border border-white/5 bg-surface/40 p-3">
          <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase text-amber-300">
            <AlertTriangle className="h-3 w-3" /> Admin-only data
          </div>
          {type === "user" && extra?.ips && (
            <div className="space-y-1.5">
              {extra.ips.length === 0 && <p className="text-xs text-muted-foreground">No IPs recorded</p>}
              {extra.ips.map((ip: any, i: number) => (
                <div key={i} className="rounded-lg bg-surface px-2 py-1.5 text-[11px]">
                  <div className="font-mono text-amber-200">{ip.raw_ip}</div>
                  <div className="truncate text-muted-foreground">{ip.user_agent}</div>
                  <div className="text-muted-foreground">last seen {new Date(ip.last_seen).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          {type === "post" && extra?.authorIps && (
            <div className="space-y-1.5">
              <div className="text-[11px] text-muted-foreground">Author ID: <span className="font-mono">{entity.author_id ?? "—"}</span></div>
              {extra.authorIps.length === 0 && <p className="text-xs text-muted-foreground">No author IPs</p>}
              {extra.authorIps.map((ip: any, i: number) => (
                <div key={i} className="rounded-lg bg-surface px-2 py-1.5 text-[11px]">
                  <div className="font-mono text-amber-200">{ip.raw_ip}</div>
                  <div className="truncate text-muted-foreground">{ip.user_agent}</div>
                </div>
              ))}
            </div>
          )}
          {(type === "comment" || type === "community") && (
            <p className="text-xs text-muted-foreground">
              Entity ID: <span className="font-mono">{type === "community" ? entity.slug : entity.id}</span>
            </p>
          )}
        </div>
      </div>

      {/* Edit history */}
      {detailQ.data?.history && detailQ.data.history.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/5 bg-surface/40 p-3">
          <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <History className="h-3 w-3" /> Edit history
          </div>
          <ul className="space-y-1.5">
            {detailQ.data.history.map((h: any) => (
              <li key={h.id} className="rounded-lg bg-surface px-2 py-1.5 text-[11px]">
                <div className="text-muted-foreground">
                  {new Date(h.created_at).toLocaleString()} · {h.editor_label}
                </div>
                <div className="mt-1 text-foreground/80">
                  {Object.keys(h.new_state ?? {}).join(", ")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action log for this entity */}
      {detailQ.data?.log && detailQ.data.log.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/5 bg-surface/40 p-3">
          <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <Activity className="h-3 w-3" /> Action history
          </div>
          <ul className="space-y-1">
            {detailQ.data.log.slice(0, 10).map((l: any) => (
              <li key={l.id} className="text-[11px] text-muted-foreground">
                {new Date(l.created_at).toLocaleString()} · <span className="text-foreground">{l.action}</span>{" "}
                {l.undone_at && <span className="text-amber-300">(undone)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EditForm({
  type,
  entity,
  onSubmit,
  pending,
}: {
  type: "post" | "comment" | "community";
  entity: any;
  onSubmit: (patch: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState(entity.title ?? "");
  const [body, setBody] = useState(entity.body ?? "");
  const [name, setName] = useState(entity.name ?? "");
  const [desc, setDesc] = useState(entity.description ?? "");
  const [nsfw, setNsfw] = useState(!!entity.nsfw);
  const [pinned, setPinned] = useState(!!entity.pinned);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "post") onSubmit({ title, body, nsfw, pinned });
    else if (type === "comment") onSubmit({ body });
    else onSubmit({ name, description: desc });
  };

  return (
    <form onSubmit={submit} className="mb-4 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      {type === "post" && (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            placeholder="Title"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            placeholder="Body"
          />
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={nsfw} onChange={(e) => setNsfw(e.target.checked)} /> NSFW
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pinned
            </label>
          </div>
        </>
      )}
      {type === "comment" && (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
        />
      )}
      {type === "community" && (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            placeholder="Name"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm"
            placeholder="Description"
          />
        </>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-full gradient-ember px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />} Save
      </button>
    </form>
  );
}

function ModerationLogPanel({ onOpen }: { onOpen: (t: { type: EntityType; id: string }) => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listModerationLog);
  const undoFn = useServerFn(undoModerationAction);
  const logQ = useQuery({
    queryKey: ["admin-log"],
    queryFn: () => listFn({ data: { limit: 100 } }),
    refetchInterval: 30_000,
  });

  const undoMut = useMutation({
    mutationFn: (logId: string) => undoFn({ data: { logId } }),
    onSuccess: () => {
      toast.success("Action reverted");
      qc.invalidateQueries({ queryKey: ["admin-log"] });
      qc.invalidateQueries({ queryKey: ["admin-entity"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Undo failed"),
  });

  const log: any[] = logQ.data?.log ?? [];
  const undoable = useMemo(
    () => new Set(["soft_delete", "ban", "restore", "unban", "edit"]),
    [],
  );

  return (
    <div className="rounded-2xl glass p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Moderation log</h2>
        <span className="text-[11px] text-muted-foreground">last 100</span>
      </div>
      {logQ.isLoading ? (
        <div className="py-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : log.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No moderation actions yet.</p>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
          {log.map((l) => (
            <li key={l.id} className="flex items-center gap-3 bg-surface/40 px-3 py-2 text-xs">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                {l.action}
              </span>
              <button
                onClick={() => onOpen({ type: l.entity_type, id: l.entity_id })}
                className="flex-1 truncate text-left hover:underline"
              >
                <span className="text-muted-foreground">{l.entity_type}</span>{" "}
                <span className="font-mono text-foreground">{String(l.entity_id).slice(0, 8)}…</span>
              </button>
              <span className="hidden text-[10px] text-muted-foreground sm:inline">
                {new Date(l.created_at).toLocaleString()}
              </span>
              {l.undone_at ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">undone</span>
              ) : undoable.has(l.action) ? (
                <button
                  onClick={() => undoMut.mutate(l.id)}
                  disabled={undoMut.isPending}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface px-2 py-0.5 text-[10px] hover:bg-surface-2 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" /> Undo
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}