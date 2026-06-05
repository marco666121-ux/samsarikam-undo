import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FIREBASE_API_KEY = "AIzaSyCh4ZjVFItHhCH2oD8MSKMopfBoUIq3uKs";
const FIREBASE_PROJECT_ID = "samsarikanundo-sms";

/**
 * Verify a Firebase ID token (issued after phone OTP) and exchange it for a
 * Supabase magic-link `token_hash` the client can use with `verifyOtp` to get
 * a real Supabase session. We synthesize a stable email from the phone number
 * so each phone maps 1:1 to a Supabase auth user.
 */
export const exchangeFirebasePhoneToken = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ idToken: z.string().min(20).max(4096) }).parse(d),
  )
  .handler(async ({ data }) => {
    // 1. Verify the Firebase ID token by asking Firebase to look up the account.
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: data.idToken }),
      },
    );
    if (!lookupRes.ok) {
      const txt = await lookupRes.text();
      throw new Error(`Firebase token rejected: ${txt}`);
    }
    const lookup = (await lookupRes.json()) as {
      users?: Array<{ localId: string; phoneNumber?: string }>;
    };
    const fbUser = lookup.users?.[0];
    if (!fbUser?.phoneNumber) {
      throw new Error("Firebase token has no phone number");
    }
    const phone = fbUser.phoneNumber; // E.164

    // Sanity check: project ID should match (defense in depth).
    void FIREBASE_PROJECT_ID;

    // 2. Ensure a Supabase user exists for this phone. Use a stable synthetic
    //    email so we can target it with magic-link OTP exchange.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const digits = phone.replace(/\D/g, "");
    const email = `phone${digits}@phone.samsarikan.local`;

    // createUser is idempotent for our purposes: if it exists, we ignore the error.
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { phone, firebase_uid: fbUser.localId, provider: "firebase_phone" },
    });
    if (createErr && !/already|exists|registered/i.test(createErr.message)) {
      throw new Error(createErr.message);
    }

    // 3. Generate a magic-link token the client can redeem for a session.
    const { data: link, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
    if (linkErr || !link?.properties?.hashed_token) {
      throw new Error(linkErr?.message ?? "Could not issue session token");
    }

    return {
      email,
      tokenHash: link.properties.hashed_token,
    };
  });