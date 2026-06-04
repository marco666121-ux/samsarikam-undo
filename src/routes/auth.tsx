import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { linkSupabaseUser } from "@/lib/auth-link.functions";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Samsarikan Undo?" },
      { name: "description", content: "Sign in with phone OTP or Google." },
    ],
  }),
  component: AuthPage,
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="text-xl font-bold">Sign-in error</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary underline">Back home</Link>
      </div>
    </div>
  ),
});

function AuthPage() {
  const navigate = useNavigate();
  const { refresh } = useStore();

  // If already signed in, bounce home.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled && data.user) navigate({ to: "/", replace: true });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const finishSignIn = async () => {
    try {
      await linkSupabaseUser({ data: {} });
      await refresh();
      toast.success("Welcome to Samsarikan!");
      navigate({ to: "/", replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't link your account");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl gradient-ember glow-ember">
            <span className="text-2xl">☕</span>
          </div>
          <h1 className="font-display text-2xl font-black">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">സംസാരിക്കാൻ ഉണ്ടോ?</p>
        </div>

        <PhoneOtpCard onSignedIn={finishSignIn} />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-white/10" />
          <span>or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <GoogleButton onSignedIn={finishSignIn} />

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing you agree to our community rules. We only use your phone or
          Google account to sign you in — never for spam.
        </p>
      </div>
    </div>
  );
}

const RESEND_SECONDS = 30;

function PhoneOtpCard({ onSignedIn }: { onSignedIn: () => void | Promise<void> }) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cooldown]);

  const e164 = "+91" + phone.replace(/\D/g, "").slice(0, 10);
  const phoneValid = /^\+91[0-9]{10}$/.test(e164);

  const sendOtp = async () => {
    if (!phoneValid) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) throw error;
      setStep("otp");
      setCooldown(RESEND_SECONDS);
      toast.success(`OTP sent to ${e164}`);
    } catch (e: any) {
      const msg = e?.message ?? "Could not send OTP";
      // Friendly message when SMS provider isn't configured yet.
      if (/sms|twilio|provider/i.test(msg)) {
        toast.error("SMS provider not configured. Ask the admin to enable phone auth in backend settings.");
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: "sms" });
      if (error) throw error;
      await onSignedIn();
    } catch (e: any) {
      toast.error(e?.message ?? "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-strong rounded-2xl border border-white/10 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Phone className="h-4 w-4 text-primary" />
        Phone OTP
      </div>

      {step === "phone" ? (
        <form
          onSubmit={(e) => { e.preventDefault(); sendOtp(); }}
          className="space-y-3"
        >
          <div className="flex overflow-hidden rounded-full border border-white/10 bg-surface/70 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/30">
            <span className="grid place-items-center bg-surface-2 px-3 text-sm font-semibold text-muted-foreground">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98765 43210"
              className="w-full bg-transparent px-3 py-2.5 text-sm focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!phoneValid || busy}
            className="w-full rounded-full gradient-ember py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); verifyOtp(); }}
          className="space-y-3"
        >
          <p className="text-xs text-muted-foreground">
            6-digit code sent to <span className="font-semibold text-foreground">{e164}</span>
          </p>
          <input
            type="tel"
            inputMode="numeric"
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="w-full rounded-full border border-white/10 bg-surface/70 px-4 py-2.5 text-center text-lg font-mono tracking-[0.5em] focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={otp.length !== 6 || busy}
            className="w-full rounded-full gradient-ember py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {busy ? "Verifying..." : "Verify & continue"}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-muted-foreground hover:text-foreground"
            >
              Change number
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={sendOtp}
              className="text-primary disabled:text-muted-foreground"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
            </button>
          </div>
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> Code expires in 5 minutes
          </p>
        </form>
      )}
    </div>
  );
}

function GoogleButton({ onSignedIn }: { onSignedIn: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);

  // If the OAuth flow returns tokens inline (popup-style), finish linking.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") onSignedIn();
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) throw result.error;
      if (result.redirected) return; // browser will navigate away
      await onSignedIn();
    } catch (e: any) {
      toast.error(e?.message ?? "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-surface-2 disabled:opacity-50"
    >
      <GoogleGlyph />
      {busy ? "Opening Google..." : "Continue with Google"}
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 11v3.2h4.5c-.2 1.2-1.5 3.6-4.5 3.6-2.7 0-4.9-2.2-4.9-5s2.2-5 4.9-5c1.6 0 2.6.7 3.2 1.2l2.2-2.1C16 5.6 14.2 4.8 12 4.8 7.9 4.8 4.6 8.1 4.6 12.2S7.9 19.6 12 19.6c6.9 0 7.7-6.5 7-9.6H12z"/>
    </svg>
  );
}