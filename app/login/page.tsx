"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">ログイン</h1>
      {sent ? (
        <p>メールを送信しました。リンクからログインしてください。</p>
      ) : (
        <form onSubmit={onSignIn} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border px-3 py-2 w-full"
          />
          <button className="bg-black text-white px-4 py-2 rounded" type="submit">
            Magic Link を送る
          </button>
          {err && <p className="text-red-600 text-sm">{err}</p>}
        </form>
      )}
    </main>
  );
}
