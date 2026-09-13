"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, Btn, Field, Input, IconUser, IconBuilding } from "@/components/ui";
import { api } from "@/components/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: { role: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(data.user.role === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/employee");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href="/register" className="text-sm font-medium text-ink/60 transition-colors hover:text-ink">
            No account? <span className="font-semibold text-trust">Register →</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="animate-fade-up w-full max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">
              Welcome <span className="accent-serif text-gradient-animated">back.</span>
            </h1>
            <p className="mt-2 text-sm text-ink/55">Sign in to your Mopol account.</p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-black/[0.06] bg-card p-8 shadow-[0_8px_30px_-12px_rgb(25_27_22/0.12)]">
            <Field label="Email address">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-semibold text-ink/40 transition-colors hover:text-ink"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            {error && (
              <p role="alert" className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
                {error}
              </p>
            )}

            <Btn type="submit" variant="trust" className="w-full !py-3" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Btn>
          </form>

          {/* demo credentials */}
          <div className="mt-5 rounded-2xl border border-dashed border-ink/20 p-5">
            <p className="text-center text-xs font-medium text-ink/45">Demo accounts — click to fill</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setEmail("amara@demo.io"); setPassword("demo1234"); }}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-black/[0.06] bg-card px-3.5 py-2.5 text-left transition-all duration-200 hover:border-trust/40 hover:bg-mint/50"
              >
                <IconUser className="size-4 shrink-0 text-trust" />
                <span>
                  <span className="block text-[11px] text-ink/45">Employee</span>
                  <span className="block text-xs font-semibold">amara@demo.io</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail("hr@demo.io"); setPassword("demo1234"); }}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-black/[0.06] bg-card px-3.5 py-2.5 text-left transition-all duration-200 hover:border-trust/40 hover:bg-mint/50"
              >
                <IconBuilding className="size-4 shrink-0 text-trust" />
                <span>
                  <span className="block text-[11px] text-ink/45">Employer</span>
                  <span className="block text-xs font-semibold">hr@demo.io</span>
                </span>
              </button>
            </div>
            <p className="mt-2.5 text-center text-[11px] text-ink/40">password for both: demo1234</p>
          </div>
        </div>
      </div>
    </main>
  );
}
