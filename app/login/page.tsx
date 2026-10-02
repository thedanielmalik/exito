"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

const COOLDOWN_SECONDS = 60;

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading || cooldown > 0) return;

    setLoading(true);
    setMessage("");
    setSent(false);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: new URL("/auth/callback", window.location.origin).toString(),
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSent(true);
    setCooldown(COOLDOWN_SECONDS);
    setMessage("Your login link has been sent. Open the newest Exito email and click the sign-in link once.");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">e</div>
        <span className="eyebrow">EXITO BUSINESS OS</span>
        <h1>Sign in to Exito.</h1>
        <p>Use your email to receive a secure sign-in link. No password required.</p>

        <form onSubmit={submit}>
          <label htmlFor="exito-email">Work email</label>
          <input
            id="exito-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (sent) setSent(false);
            }}
            placeholder="you@company.com"
            disabled={loading}
          />

          <button
            className="primary-button"
            type="submit"
            disabled={loading || cooldown > 0}
          >
            {loading
              ? "Sending secure link…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : sent
                  ? "Send another login link"
                  : "Send me a login link"}
          </button>
        </form>

        {sent && (
          <div className="auth-success">
            <strong>Check your email</strong>
            <span>
              We sent a secure Exito sign-in link to <b>{email.trim()}</b>.
            </span>
          </div>
        )}

        {message && !sent && <div className="auth-message">{message}</div>}

        <div className="auth-help">
          <span>Already clicked your link?</span>
          <span>It should take you directly into your Exito workspace.</span>
        </div>
      </section>
    </main>
  );
}
