import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AppShell } from "@/components/app-shell";
import { SITE_URL } from "@/lib/site";
import { Share2, Radio, Users } from "lucide-react";
import { toast } from "sonner";

export const getRoom = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { data: room } = await supabaseAdmin
      .from("live_rooms")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    return { room };
  });

export const Route = createFileRoute("/room/$id")({
  loader: async ({ params }) => {
    const r = await getRoom({ data: { id: params.id } });
    if (!r.room) throw notFound();
    return r.room;
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/room/${params.id}`;
    const title = `🔴 ${loaderData?.title ?? "Live room"} — Samsarikan Undo?`;
    const desc = loaderData?.topic ?? `Hosted by u/${loaderData?.host_username ?? "ghost"} · ${loaderData?.listeners ?? 0} listening`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: RoomPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="py-20 text-center">
        <div className="text-5xl">🎙️</div>
        <h2 className="mt-4 font-display text-xl font-bold">Room ended or not found</h2>
        <Link to="/" className="mt-3 inline-block text-sm text-primary hover:underline">Back to feed →</Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell><div className="py-20 text-center text-sm text-muted-foreground">Couldn't load room: {error.message}</div></AppShell>
  ),
});

function RoomPage() {
  const room = Route.useLoaderData();
  const onShare = async () => {
    const url = `${window.location.origin}/room/${room.id}`;
    try {
      if (navigator.share) await navigator.share({ title: room.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Room link copied"); }
    } catch {}
  };
  const ended = !!room.ended_at;
  return (
    <AppShell>
      <Link to="/" className="mb-3 inline-block text-xs text-muted-foreground hover:text-foreground">← Back to feed</Link>
      <div className={`relative overflow-hidden rounded-3xl ${room.color ?? "gradient-ember"}`}>
        <div className="p-6 text-primary-foreground">
          <div className="mb-2 flex items-center gap-2">
            <Radio className={`h-4 w-4 ${ended ? "" : "animate-pulse"}`} />
            <span className="text-xs font-bold uppercase tracking-wider">{ended ? "Ended" : "Live"}</span>
          </div>
          <h1 className="font-display text-2xl font-black md:text-3xl">{room.title}</h1>
          {room.topic && <p className="mt-2 text-sm opacity-90">{room.topic}</p>}
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span>Hosted by u/{room.host_username}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {room.listeners} listening</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onShare} className="flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-semibold hover:bg-white/10">
          <Share2 className="h-4 w-4" /> Share room
        </button>
        {!ended && (
          <button className="flex items-center gap-2 rounded-full gradient-ember px-4 py-2 text-sm font-bold text-primary-foreground glow-ember">
            <Radio className="h-4 w-4" /> Join (voice coming soon)
          </button>
        )}
      </div>
    </AppShell>
  );
}