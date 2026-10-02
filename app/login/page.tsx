"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    setMessage(error ? error.message : "Check your email for your Exito sign-in link.");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">e</div>
        <span className="eyebrow">EXITO</span>
        <h1>Welcome back.</h1>
        <p>Sign in to your business operating system.</p>
        <form onSubmit={submit}>
          <label>Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <button className="primary-button" disabled={loading}>
            {loading ? "Sending link…" : "Continue"}
          </button>
        </form>
        {message && <div className="auth-message">{message}</div>}
      </section>
    </main>
  );
}
