import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getClientIp,
  hashIp,
  setSessionCookie,
  setAdminCookie,
  isAdmin,
  getCurrentIdentity,
} from "./session.server";
import { getRequest } from "@tanstack/react-start/server";

export const whoami = createServerFn({ method: "POST" }).handler(async () => {
  const ip = getClientIp();
  const ipHash = hashIp(ip);
  const ua = getRequest().headers.get("user-agent") ?? "";

  // Existing cookie? validate.
  const existing = await getCurrentIdentity();

  // Look up IP binding regardless — if cookie missing but IP known, auto-bind.
  const { data: binding } = await supabaseAdmin
    .from("ip_bindings")
    .select("identity_id, identities(id, username, is_banned)")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  // Update last_seen + ua
  if (binding) {
    await supabaseAdmin
      .from("ip_bindings")
      .update({ last_seen: new Date().toISOString(), raw_ip: ip, user_agent: ua })
      .eq("ip_hash", ipHash);
  }

  if (existing) {
    return { authenticated: true, identity: existing };
  }

  if (binding && binding.identities && !(binding.identities as any).is_banned) {
    const id = (binding.identities as any).id as string;
    const username = (binding.identities as any).username as string;
    setSessionCookie(id);
    return { authenticated: true, identity: { id, username } };
  }

  return { authenticated: false, identity: null };
});

export const claimUsername = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, _") }).parse(d))
  .handler(async ({ data }) => {
    const username = data.username;
    const ip = getClientIp();
    const ipHash = hashIp(ip);
    const ua = getRequest().headers.get("user-agent") ?? "";

    // Reject if username taken
    const { data: existing } = await supabaseAdmin
      .from("identities")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (existing) throw new Error("Username already taken — pick another");

    // Reject if IP already bound (force the user to use that existing account)
    const { data: bound } = await supabaseAdmin
      .from("ip_bindings")
      .select("identity_id, identities(username)")
      .eq("ip_hash", ipHash)
      .maybeSingle();
    if (bound) {
      const u = (bound.identities as any)?.username;
      throw new Error(`This network is already logged in as ${u}`);
    }

    const { data: created, error } = await supabaseAdmin
      .from("identities")
      .insert({ username })
      .select("id, username")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create");

    await supabaseAdmin.from("ip_bindings").insert({
      ip_hash: ipHash,
      identity_id: created.id,
      raw_ip: ip,
      user_agent: ua,
    });

    setSessionCookie(created.id);
    return { identity: { id: created.id, username: created.username } };
  });

export const ping = createServerFn({ method: "POST" }).handler(async () => {
  const me = await getCurrentIdentity();
  if (!me) return { ok: false };
  return { ok: true };
});

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("Admin password not configured");
    if (data.password !== expected) throw new Error("Wrong password");
    setAdminCookie();
    return { ok: true };
  });

export const adminCheck = createServerFn({ method: "POST" }).handler(async () => {
  return { ok: isAdmin() };
});