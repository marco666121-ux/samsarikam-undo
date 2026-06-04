import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { setSessionCookie, getClientIp, hashIp } from "./session.server";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Called from the client after a successful Supabase Auth sign-in (phone OTP or
 * Google). Ensures there is a row in `public.identities` linked to the auth user
 * and sets the legacy `sk_id` cookie so every existing server fn keeps working.
 *
 * If `username` is provided and the identity is new, that name is used.
 * Otherwise a deterministic name is generated from the phone or email.
 */
export const linkSupabaseUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        username: z
          .string()
          .trim()
          .min(3)
          .max(20)
          .regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, _")
          .optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
    const phone: string | null = claims?.phone ?? null;
    const email: string | null = claims?.email ?? null;

    // Already linked?
    const { data: existing } = await supabaseAdmin
      .from("identities")
      .select("id, username, is_banned, phone")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (existing) {
      if (existing.is_banned) throw new Error("This account is banned.");
      // Sync phone if it changed
      if (phone && existing.phone !== phone) {
        await supabaseAdmin.from("identities").update({ phone }).eq("id", existing.id);
      }
      setSessionCookie(existing.id);
      // Touch IP binding
      const ip = getClientIp();
      await supabaseAdmin
        .from("ip_bindings")
        .upsert(
          {
            ip_hash: hashIp(ip),
            identity_id: existing.id,
            raw_ip: ip,
            user_agent: getRequest().headers.get("user-agent") ?? "",
            last_seen: new Date().toISOString(),
          },
          { onConflict: "ip_hash" },
        );
      return { identity: { id: existing.id, username: existing.username } };
    }

    // If the phone is already bound to a legacy identity, claim it.
    if (phone) {
      const { data: byPhone } = await supabaseAdmin
        .from("identities")
        .select("id, username, is_banned")
        .eq("phone", phone)
        .maybeSingle();
      if (byPhone) {
        if (byPhone.is_banned) throw new Error("This account is banned.");
        await supabaseAdmin
          .from("identities")
          .update({ auth_user_id: userId })
          .eq("id", byPhone.id);
        setSessionCookie(byPhone.id);
        return { identity: { id: byPhone.id, username: byPhone.username } };
      }
    }

    // Need to create a new identity. Pick a username.
    let username = data.username ?? "";
    if (!username) {
      const seed = phone ? phone.replace(/\D/g, "").slice(-4) : (email ?? "").split("@")[0] ?? "user";
      username = (seed.replace(/[^a-zA-Z0-9_]/g, "") || "user") + Math.floor(1000 + Math.random() * 9000);
    }

    // Username collision: append random suffix until free (max 5 tries)
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabaseAdmin
        .from("identities")
        .select("id")
        .ilike("username", username)
        .maybeSingle();
      if (!clash) break;
      username = (data.username ?? "user") + Math.floor(1000 + Math.random() * 9000);
    }

    const { data: created, error } = await supabaseAdmin
      .from("identities")
      .insert({ username, auth_user_id: userId, phone })
      .select("id, username")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create identity");

    const ip = getClientIp();
    await supabaseAdmin.from("ip_bindings").upsert(
      {
        ip_hash: hashIp(ip),
        identity_id: created.id,
        raw_ip: ip,
        user_agent: getRequest().headers.get("user-agent") ?? "",
        last_seen: new Date().toISOString(),
      },
      { onConflict: "ip_hash" },
    );

    setSessionCookie(created.id);
    return { identity: { id: created.id, username: created.username } };
  });

/**
 * Check whether a phone number is already taken by another account.
 * Useful for the auth UI to show a friendly hint before requesting OTP.
 */
export const checkPhoneAvailability = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ phone: z.string().regex(/^\+91[0-9]{10}$/, "Indian phone in E.164 (e.g. +919876543210)") })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("identities")
      .select("id, auth_user_id")
      .eq("phone", data.phone)
      .maybeSingle();
    return {
      taken: !!row && !!row.auth_user_id,
      claimable: !!row && !row.auth_user_id, // legacy account waiting to be claimed
    };
  });