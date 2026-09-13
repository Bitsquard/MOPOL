"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo, Btn, Field, Input, Textarea, IconCheck, IconUpload, IconFile, IconArrowRight, IconSparkle } from "@/components/ui";
import { api, Toggle } from "@/components/client";
import type { EmployeeProfile, PrivacySettings } from "@/lib/db";

const STEPS = ["Basics", "Career", "Documents", "Privacy"];

interface DocItem {
  id: string;
  name: string;
  kind: string;
  ai_summary: string;
  skills: string[];
  has_text: boolean;
}

export default function EmployeeOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", headline: "", location: "", date_of_birth: "",
    career_history: "", project_history: "", earnings_data: "",
  });
  const [docs, setDocs] = useState<DocItem[]>([]);

  useEffect(() => {
    (async () => {
      const data = await api<{ user: any; profile: EmployeeProfile; privacy: PrivacySettings }>("/api/auth/me");
      if (!data.user) return router.replace("/login");
      if (data.user.role !== "EMPLOYEE") return router.replace("/dashboard/employer");
      setProfile(data.profile);
      setPrivacy(data.privacy);
      setForm((f) => ({ ...f, name: data.user.name }));
      setReady(true);
    })().catch(() => router.replace("/login"));
  }, [router]);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/onboarding", { method: "POST", body: JSON.stringify(form) });
      if (privacy) await api("/api/privacy", { method: "PUT", body: JSON.stringify(privacy) }).catch(() => {});
      router.push("/dashboard/employee?minted=1");
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!ready || !profile)
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
          <span className="font-mono text-xs text-ink/45">{profile.employability_id}</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        {/* progress */}
        <div className="flex items-center gap-2 pt-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <span className={`grid size-7 place-items-center rounded-full text-xs font-semibold transition-colors duration-300 ${i < step ? "bg-trust text-white" : i === step ? "border-2 border-trust text-trust" : "border border-ink/20 text-ink/35"}`}>
                  {i < step ? <IconCheck className="size-3.5" /> : i + 1}
                </span>
                <span className={`hidden text-xs font-medium sm:block ${i === step ? "text-ink" : "text-ink/40"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? "bg-trust" : "bg-ink/15"}`} />}
            </React.Fragment>
          ))}
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          {step === 0 && <>Let&apos;s set up <span className="accent-serif text-gradient-animated">you.</span></>}
          {step === 1 && <>Your <span className="accent-serif text-gradient-animated">career.</span></>}
          {step === 2 && <>Feed <span className="accent-serif text-gradient-animated">the AI.</span></>}
          {step === 3 && <>Your <span className="accent-serif text-gradient-animated">rules.</span></>}
        </h1>
        <p className="mt-2 text-sm text-ink/55">
          {step === 0 && "The essentials employers see first."}
          {step === 1 && "Roles, projects, and verified earnings. Fill what you can — edit anytime later."}
          {step === 2 && "Upload your CV and documents. The AI reads them to answer employer questions — they are never shown publicly."}
          {step === 3 && "Choose exactly what employers can see when they query your ID."}
        </p>

        <div className="mt-8 rounded-2xl border border-black/[0.06] bg-card p-6 shadow-[0_8px_30px_-12px_rgb(25_27_22/0.12)] sm:p-8">
          {error && (
            <p role="alert" className="mb-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>
          )}

          {step === 0 && (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name">
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </Field>
                <Field label="Location" hint="City, Country.">
                  <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Lagos, Nigeria" />
                </Field>
              </div>
              <Field label="Professional headline">
                <Input value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} placeholder="Senior Frontend Engineer — Fintech" />
              </Field>
              <Field label="Date of birth" hint="Stored sealed. Employers can only run yes/no proofs against it.">
                <Input type="date" value={form.date_of_birth} onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Field label="Career history" hint="One role per line: years · title · company.">
                <Textarea value={form.career_history} onChange={(e) => setForm((f) => ({ ...f, career_history: e.target.value }))} placeholder={"2023 — Now · Senior Frontend Engineer, Sterling Labs\n2020 — 2023 · Frontend Engineer, KoboPay"} />
              </Field>
              <Field label="Project history" hint="Notable projects and measurable outcomes.">
                <Textarea value={form.project_history} onChange={(e) => setForm((f) => ({ ...f, project_history: e.target.value }))} placeholder="Led checkout redesign (+18% conversion)…" />
              </Field>
              <Field label="Verified earnings" hint="Optional. e.g. 2025 · NGN 38,000,000 (payroll-verified). Hidden from employers by default.">
                <Textarea value={form.earnings_data} onChange={(e) => setForm((f) => ({ ...f, earnings_data: e.target.value }))} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <DocumentUpload onUploaded={(d) => setDocs((ds) => [d, ...ds])} docs={docs} />
          )}

          {step === 3 && privacy && (
            <div className="divide-y divide-black/[0.04]">
              <Toggle checked={privacy.hide_exact_dob} onChange={(v) => setPrivacy((p) => p && { ...p, hide_exact_dob: v, ...(v ? {} : { show_age_range_only: false }) })} label="Seal exact date of birth" description="Employers never see your real DOB — proofs still work." />
              <Toggle checked={privacy.show_age_range_only} onChange={(v) => setPrivacy((p) => p && { ...p, show_age_range_only: v, ...(v ? { hide_exact_dob: true } : {}) })} label="Share age band only" description="Show e.g. “25–29” instead of nothing." />
              {(
                [
                  ["photo", "Profile photo", "Your picture on verification results."],
                  ["headline", "Professional headline", "One-line summary under your name."],
                  ["location", "Location", "City and country."],
                  ["career_history", "Career history", "Roles, companies and tenures."],
                  ["project_history", "Project history", "Notable work and achievements."],
                  ["earnings", "Verified earnings", "Payroll-verified compensation records."],
                  ["cv", "CV / résumé", "Downloadable document."],
                  ["trust", "Trust Score", "Your aggregated reputation badge."],
                  ["remarks", "Employer remarks", "Structured feedback from supervisors."],
                ] as const
              ).map(([key, label, desc]) => (
                <Toggle
                  key={key}
                  checked={privacy.visible_fields[key]}
                  onChange={(v) => setPrivacy((p) => p && { ...p, visible_fields: { ...p.visible_fields, [key]: v } })}
                  label={label}
                  description={desc}
                />
              ))}
            </div>
          )}
        </div>

        {/* nav */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {step > 0 && (
              <Btn variant="ghost" onClick={() => setStep((s) => s - 1)}>← Back</Btn>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" disabled={busy} onClick={finish}>Skip for now</Btn>
            {step < STEPS.length - 1 ? (
              <Btn variant="trust" onClick={() => setStep((s) => s + 1)}>
                Continue <IconArrowRight className="size-4" />
              </Btn>
            ) : (
              <Btn variant="trust" disabled={busy} onClick={finish}>
                {busy ? "Finishing…" : "Finish setup"} <IconCheck className="size-4" />
              </Btn>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------------- document upload + AI parse ---------------- */

function DocumentUpload({ docs, onUploaded }: { docs: DocItem[]; onUploaded: (d: DocItem) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.txt,.md"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setNote(null);
          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", "cv");
            const res = await fetch("/api/documents", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");
            onUploaded(data.document);
            if (data.warning) setNote(data.warning);
          } catch (err: any) {
            setNote(err.message);
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = "";
          }
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-ink/20 px-6 py-10 text-center transition-all duration-200 hover:border-trust hover:bg-mint/30 disabled:opacity-50"
      >
        <span className="grid size-11 place-items-center rounded-2xl bg-mint text-trust">
          {busy ? <span className="skeleton size-5 rounded-full" /> : <IconUpload className="size-5" />}
        </span>
        <span className="text-sm font-semibold">{busy ? "Uploading + AI reading…" : "Drop your CV here, or click to browse"}</span>
        <span className="text-xs text-ink/45">PDF, TXT or MD · 8 MB max · sealed — never shown publicly</span>
      </button>

      {note && <p className="mt-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{note}</p>}

      {docs.length > 0 && (
        <div className="mt-5 space-y-3">
          {docs.map((d) => (
            <div key={d.id} className="rounded-xl border border-trust/20 bg-mint/40 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <IconFile className="size-4 text-trust" /> {d.name}
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-trust px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  <IconSparkle className="size-3" /> AI read
                </span>
              </div>
              {d.ai_summary && <p className="mt-2 text-xs leading-relaxed text-ink/65">{d.ai_summary}</p>}
              {d.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {d.skills.slice(0, 10).map((s) => (
                    <span key={s} className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-trust border border-trust/20">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
