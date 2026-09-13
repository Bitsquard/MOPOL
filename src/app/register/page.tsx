"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, Btn, Field, Input, IconUser, IconBuilding, IconCheck } from "@/components/ui";
import { api } from "@/components/client";

type Role = "EMPLOYEE" | "EMPLOYER";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ employability_id: string | null }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role, company }),
      });
      router.push(data.employability_id ? "/onboarding/employee" : "/onboarding/employer");
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
          <Link href="/login" className="text-sm font-medium text-ink/60 transition-colors hover:text-ink">
            Have an account? <span className="font-semibold text-trust">Sign in →</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="animate-fade-up w-full max-w-lg">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">
              Create your <span className="accent-serif text-gradient-animated">account.</span>
            </h1>
            <p className="mt-2 text-sm text-ink/55">Join the verification network in under a minute.</p>
          </div>

          {/* role selector */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
            {(
              [
                { r: "EMPLOYEE" as Role, icon: IconUser, t: "I'm a candidate", d: "Mint your Employability ID, host your CV, control who sees what." },
                { r: "EMPLOYER" as Role, icon: IconBuilding, t: "I'm an employer", d: "Verify candidates instantly by ID. Cut background-check costs." },
              ] as const
            ).map((opt) => {
              const active = role === opt.r;
              return (
                <button
                  key={opt.r}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRole(opt.r)}
                  className={`relative min-h-11 cursor-pointer rounded-2xl border p-5 text-left transition-all duration-200 active:scale-[0.98] ${
                    active
                      ? "border-trust bg-mint/60 ring-4 ring-trust/15"
                      : "border-black/[0.08] bg-card hover:border-ink/20"
                  }`}
                >
                  {active && (
                    <span className="absolute right-4 top-4 grid size-5 place-items-center rounded-full bg-trust text-white">
                      <IconCheck className="size-3" />
                    </span>
                  )}
                  <opt.icon className={`size-5 ${active ? "text-trust" : "text-ink/40"}`} />
                  <span className="mt-3 block text-sm font-semibold">{opt.t}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink/55">{opt.d}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-5 rounded-2xl border border-black/[0.06] bg-card p-8 shadow-[0_8px_30px_-12px_rgb(25_27_22/0.12)]">
            <Field label="Full name">
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Amara Okafor" autoComplete="name" />
            </Field>
            {role === "EMPLOYER" && (
              <Field label="Company / organisation">
                <Input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Sterling Labs" autoComplete="organization" />
              </Field>
            )}
            <Field label="Email address">
              <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="Password" hint="Minimum 8 characters.">
              <Input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>

            {error && (
              <p role="alert" className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
                {error}
              </p>
            )}

            <Btn type="submit" variant="trust" className="w-full !py-3" disabled={busy}>
              {busy ? "Creating…" : role === "EMPLOYEE" ? "Create + mint my ID" : "Create employer account"}
            </Btn>

            {role === "EMPLOYEE" && (
              <p className="text-center text-xs text-ink/45">
                Your unique Employability ID is minted instantly on registration.
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
