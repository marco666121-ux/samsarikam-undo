import { createHash } from "crypto";
import { getRequest, getCookie, setCookie } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const SESSION_COOKIE = "sk_id";
export const ADMIN_COOKIE = "sk_admin";

export function getClientIp(): string {
  const req = getRequest();
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}

export function hashIp(ip: string): string {
  return createHash("sha256").update("samsarikan:" + ip).digest("hex");
}

export function setSessionCookie(identityId: string) {
  setCookie(SESSION_COOKIE, identityId, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function setAdminCookie() {
  setCookie(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function isAdmin(): boolean {
  return getCookie(ADMIN_COOKIE) === "1";
}

export async function getCurrentIdentity(): Promise<{ id: string; username: string } | null> {
  const id = getCookie(SESSION_COOKIE);
  if (!id) return null;
  const { data } = await supabaseAdmin
    .from("identities")
    .select("id, username, is_banned")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.is_banned) return null;
  // Touch presence
  await supabaseAdmin.from("presence_pings").upsert({ user_id: data.id, last_seen: new Date().toISOString() });
  return { id: data.id, username: data.username };
}

export async function requireIdentity(): Promise<{ id: string; username: string }> {
  const me = await getCurrentIdentity();
  if (!me) throw new Error("Not authenticated. Pick a username first.");
  return me;
}