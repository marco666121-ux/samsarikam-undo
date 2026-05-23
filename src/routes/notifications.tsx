import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { NOTIFICATIONS } from "@/lib/mock-data";
import { AtSign, Heart, MessageCircle, TrendingUp, UserPlus } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Samsarikan Undo?" },
      { name: "description", content: "Your mentions, replies, reactions and trending alerts." },
    ],
  }),
  component: Notifications,
});

const ICONS = {
  reply: MessageCircle,
  reaction: Heart,
  mention: AtSign,
  follow: UserPlus,
  trending: TrendingUp,
} as const;

function Notifications() {
  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight md:text-3xl">Inbox</h1>
          <p className="text-sm text-muted-foreground">Naattuvarthamaanam, all in one place.</p>
        </div>
        <button className="text-xs text-primary hover:underline">Mark all read</button>
      </div>
      <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto no-scrollbar">
        {["All", "Mentions", "Replies", "Reactions", "Follows"].map((t, i) => (
          <button key={t} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${i === 0 ? "gradient-ember text-primary-foreground glow-ember" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </div>
      <div className="space-y-2">
        {NOTIFICATIONS.map((n) => {
          const Icon = ICONS[n.type];
          return (
            <div key={n.id} className={`flex items-start gap-3 rounded-2xl glass p-3 transition hover:border-primary/30 ${n.unread ? "border-primary/20 bg-primary/5" : ""}`}>
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${n.unread ? "gradient-ember" : "bg-surface-2"}`}>
                <Icon className={`h-4 w-4 ${n.unread ? "text-primary-foreground" : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug"><span className="font-semibold">{n.actor}</span> <span className="text-muted-foreground">{n.text}</span></p>
                <span className="text-[11px] text-muted-foreground">{n.age}</span>
              </div>
              {n.unread && <span className="mt-2 h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}