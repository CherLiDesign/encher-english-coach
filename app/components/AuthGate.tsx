"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { isCloudConfigured, supabase } from "../lib/supabase";

export function AuthGate({ children }: { children: (user: User, signOut: () => Promise<void>) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(Boolean(supabase));
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setChecking(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setBusy(true); setMessage("");
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
      setMessage(error ? error.message : "Check your email for a secure reset link.");
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.href } });
      setMessage(error ? error.message : "Account created. Check your email to confirm, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    }
    setBusy(false);
  };

  if (checking) return <div className="auth-loading"><span className="brand-mark">e</span><p>Opening your learning space…</p></div>;
  if (!isCloudConfigured) return <div className="auth-page"><div className="auth-panel"><span className="brand-mark large">e</span><h1>Your private learning space is almost ready.</h1><p>The account interface is installed. Connect the project’s cloud credentials to enable secure sign-in and synchronization.</p><div className="auth-security"><b>Designed for private workplace learning</b><span>Encrypted authentication · per-user data isolation · no passwords stored by Encher</span></div></div></div>;
  if (user) return <>{children(user, async () => { await supabase!.auth.signOut(); })}</>;

  return <div className="auth-page">
    <section className="auth-story"><button className="brand static"><span className="brand-mark">e</span><span>Encher</span></button><div><span className="eyebrow">YOUR ENGLISH, REMEMBERED</span><h1>Pick up exactly where you left off.</h1><p>Your vocabulary, meeting context, practice history, and mastery profile stay with your account—on phone and desktop.</p></div><small>Private by default. Your workplace material belongs to you.</small></section>
    <section className="auth-form-wrap"><form className="auth-form" onSubmit={submit}>
      <span className="auth-step">{mode === "signin" ? "WELCOME BACK" : mode === "signup" ? "CREATE YOUR SPACE" : "ACCOUNT RECOVERY"}</span>
      <h2>{mode === "signin" ? "Sign in to continue" : mode === "signup" ? "Create your account" : "Reset your password"}</h2>
      <p>{mode === "signin" ? "Your personalized practice is waiting." : mode === "signup" ? "Start building a learner model from your real work." : "We’ll email you a secure reset link."}</p>
      <label>Email<input name="email" type="email" inputMode="email" autoComplete="email" required placeholder="you@company.com" /></label>
      {mode !== "reset" && <label>Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required placeholder="At least 8 characters" /></label>}
      {message && <div className="auth-message" role="status">{message}</div>}
      <button className="auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</button>
      <div className="auth-switch">{mode === "signin" ? <><button type="button" onClick={() => setMode("reset")}>Forgot password?</button><span>New to Encher? <button type="button" onClick={() => setMode("signup")}>Create account</button></span></> : <button type="button" onClick={() => setMode("signin")}>← Back to sign in</button>}</div>
    </form></section>
  </div>;
}
