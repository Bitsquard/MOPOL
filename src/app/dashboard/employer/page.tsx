"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Btn,
  Card,
  CardHeader,
  RatingStars,
  IconSearch,
  IconCheck,
  IconShield,
  IconLock,
  IconEye,
  IconFile,
  IconArrowRight,
} from "@/components/ui";
import { api, DashboardNav } from "@/components/client";
import type { EmployerRemark } from "@/lib/db";

interface MeResponse {
  user: { id: string; name: string; email: string; role: string; company: string | null } | null;
}

const SPEC: { icon: React.ComponentType<{ className?: string }>; t: string; d: string }[] = [
  { icon: IconCheck, t: "Identity + photo", d: "Confirmed against the ID on record." },
  { icon: IconShield, t: "Proven assertions", d: "Yes/no facts proven against sealed records — e.g. “above 21” without exposing the date of birth." },
  { icon: IconEye, t: "Career + projects", d: "Only the fields the candidate switched on." },
  { icon: IconLock, t: "Trust Score", d: "Aggregated from every remark past supervisors have logged." },
  { icon: IconFile, t: "Verified earnings", d: "Payroll-attested compensation, if disclosed." },
];

export default function EmployerDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [eid, setEid] = useState("");
  const [remarks, setRemarks] = useState<EmployerRemark[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await api<MeResponse>("/api/auth/me");
      if (!data.user) return router.replace("/login");
      if (data.user.role !== "EMPLOYER") return router.replace("/dashboard/employee");
      if (!(data.user as any).onboarded) return router.replace("/onboarding/employer");
      setMe(data.user);
      setChecked(true);
      const r = await api<{ remarks: EmployerRemark[] }>("/api/remarks");
      setRemarks(r.remarks);
    })().catch(() => router.replace("/login"));
  }, [router]);

  if (!checked || !me)
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="w-full max-w-md space-y-3 px-6">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </main>
    );

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (eid.trim()) router.push(`/verify?eid=${encodeURIComponent(eid.trim().toUpperCase())}`);
  }

  return (
    <main className="min-h-dvh">
      <DashboardNav name={me.name} role={me.company ?? "Employer"} />

      <div className="animate-fade-up mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Verify a <span className="accent-serif text-gradient-animated">candidate.</span>
        </h1>
        <p className="mt-1 text-sm text-ink/55">
          One ID in — a verified, privacy-filtered profile out.
        </p>

        {/* ============ SEARCH ============ */}
        <div className="relative z-0 mt-8 overflow-hidden rounded-3xl bg-ink bg-grid-dark p-7 text-paper sm:p-10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-paper/80">Employability ID lookup</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-trust-light/15 px-2.5 py-1 text-[11px] font-semibold text-trust-light">
              <span className="size-1.5 rounded-full bg-trust-light animate-pulse-dot" /> 24 / 7 / 365
            </span>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/60">
            You&apos;ll receive a verified profile filtered by the candidate&apos;s privacy settings, plus
            the ability to run zero-knowledge fact proofs and log remarks.
          </p>
          <form onSubmit={search} className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-paper/35" />
              <input
                value={eid}
                onChange={(e) => setEid(e.target.value.toUpperCase())}
                placeholder="BSQ-XXXX-XXXX"
                aria-label="Employability ID"
                className="min-h-14 w-full rounded-2xl border border-white/15 bg-white/5 pl-11 pr-4 font-mono text-base font-semibold tracking-[0.12em] text-paper placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-paper/35 transition-all duration-200 hover:border-white/25 focus:border-trust-light focus:outline-none focus:ring-4 focus:ring-trust-light/20"
              />
            </div>
            <Btn type="submit" variant="invert" disabled={!eid.trim()} className="!min-h-14 !rounded-2xl !px-7">
              Verify <IconArrowRight className="size-4" />
            </Btn>
          </form>
          <p className="mt-4 text-xs text-paper/45">
            Testing? Use the seeded candidate:&nbsp;
            <button
              type="button"
              onClick={() => router.push("/verify?eid=BSQ-D3MO-2026")}
              className="cursor-pointer font-mono font-semibold text-trust-light hover:underline underline-offset-4"
            >
              BSQ-D3MO-2026
            </button>
          </p>
        </div>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          {/* ============ WHAT A QUERY RETURNS ============ */}
          <Card>
            <CardHeader><span>What a query returns</span><span>Spec</span></CardHeader>
            <div className="divide-y divide-black/[0.05]">
              {SPEC.map((s) => (
                <div key={s.t} className="flex gap-4 p-5 transition-colors duration-200 hover:bg-mint/40">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint text-trust">
                    <s.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.t}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink/55">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ============ MY REMARKS ============ */}
          <Card>
            <CardHeader><span>Remarks you&apos;ve logged</span><span>{remarks.length}</span></CardHeader>
            <div className="divide-y divide-black/[0.05]">
              {remarks.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm leading-relaxed text-ink/55">
                    Nothing logged yet. Verify a candidate, then scroll to “Log an employer remark” on
                    their profile to start building their Trust Score.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/verify?eid=BSQ-D3MO-2026")}
                    className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-trust transition-colors hover:text-trust-strong"
                  >
                    Try it on the demo candidate <IconArrowRight className="size-4" />
                  </button>
                </div>
              ) : (
                remarks.map((r) => (
                  <article key={r.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <RatingStars value={r.performance_rating} />
                      <div className="flex items-center gap-3 text-[11px] text-ink/45">
                        {r.loan_free_status && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-0.5 font-semibold text-trust">
                            <IconCheck className="size-3" /> Loan-free
                          </span>
                        )}
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink/75">{r.remark_text}</p>
                  </article>
                ))
              )}
            </div>
          </Card>
        </div>

        <p className="mt-10 text-center text-xs text-ink/40">
          Queries are free during the MVP · candidate privacy is enforced on every lookup
        </p>
      </div>
    </main>
  );
}
