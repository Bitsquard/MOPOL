"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo, Btn, Field, Input, IconCheck, IconArrowRight, IconSearch, IconShield, IconSparkle } from "@/components/ui";
import { api } from "@/components/client";

const INDUSTRIES = ["Fintech", "Banking & Finance", "Technology", "Healthcare", "Education", "Logistics", "Oil & Gas", "Telecoms", "Retail & E-commerce", "Government", "Other"];
const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

export default function EmployerOnboarding() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ company: "", industry: "Fintech", company_size: "11-50" });

  useEffect(() => {
    (async () => {
      const data = await api<{ user: any }>("/api/auth/me");
      if (!data.user) return router.replace("/login");
      if (data.user.role !== "EMPLOYER") return router.replace("/dashboard/employee");
      setForm((f) => ({ ...f, company: data.user.company ?? "" }));
      setReady(true);
    })().catch(() => router.replace("/login"));
  }, [router]);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/onboarding", { method: "POST", body: JSON.stringify(form) });
      router.push("/dashboard/employer");
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!ready)
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="skeleton h-8 w-48 rounded-full" />
      </main>
    );

  return (
    <main className="flex min-h-dvh flex-col">
      <header>
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="text-xs font-medium text-ink/45">Employer setup</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          Set up <span className="accent-serif text-gradient-animated">your company.</span>
        </h1>
        <p className="mt-2 text-sm text-ink/55">
          One minute of setup, then you can verify any candidate by their Employability ID.
        </p>

        <div className="mt-8 rounded-2xl border border-black/[0.06] bg-card p-6 shadow-[0_8px_30px_-12px_rgb(25_27_22/0.12)] sm:p-8">
          {error && (
            <p role="alert" className="mb-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>
          )}
          <div className="space-y-5">
            <Field label="Company / organisation">
              <Input required value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Sterling Labs" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Industry">
                <select
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  className="w-full cursor-pointer rounded-xl border border-ink/15 bg-card px-4 py-3 text-sm transition-all duration-200 focus:border-trust focus:outline-none focus:ring-4 focus:ring-trust/15"
                >
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Company size">
                <select
                  value={form.company_size}
                  onChange={(e) => setForm((f) => ({ ...f, company_size: e.target.value }))}
                  className="w-full cursor-pointer rounded-xl border border-ink/15 bg-card px-4 py-3 text-sm transition-all duration-200 focus:border-trust focus:outline-none focus:ring-4 focus:ring-trust/15"
                >
                  {SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* what you get */}
          <div className="mt-8 grid gap-3 border-t border-black/[0.05] pt-6 sm:grid-cols-3">
            {[
              { icon: IconSearch, t: "Instant lookups", d: "Paste an Employability ID, get a verified profile in seconds." },
              { icon: IconShield, t: "50-point screening", d: "Tick requirements — proven against sealed records, never raw data." },
              { icon: IconSparkle, t: "AI answers", d: "Ask anything about a candidate; the AI reads their sealed documents." },
            ].map((f) => (
              <div key={f.t} className="rounded-xl border border-black/[0.06] bg-white p-4">
                <f.icon className="size-4 text-trust" />
                <p className="mt-2 text-sm font-semibold">{f.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/55">{f.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Btn variant="ghost" disabled={busy} onClick={finish}>Skip for now</Btn>
          <Btn variant="trust" disabled={busy || form.company.trim().length < 2} onClick={finish}>
            {busy ? "Finishing…" : "Finish setup"} <IconArrowRight className="size-4" />
          </Btn>
        </div>
      </div>
    </main>
  );
}
