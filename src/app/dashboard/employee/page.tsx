"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Btn,
  Card,
  CardHeader,
  Field,
  Input,
  Textarea,
  TrustMeter,
  RatingStars,
  VerifiedBadge,
  IconCheck,
  IconArrowRight,
  IconUser,
} from "@/components/ui";
import { api, CopyButton, DashboardNav, FileField, Toggle } from "@/components/client";
import { DocumentsCard } from "@/components/documents";
import { defaultPrivacy, type EmployeeProfile, type PrivacySettings, type EmployerRemark } from "@/lib/db";

interface MeResponse {
  user: { id: string; name: string; email: string; role: string; profile_pic_url: string | null; onboarded: boolean } | null;
  profile: EmployeeProfile | null;
  privacy: PrivacySettings | null;
}

const FIELD_LABELS: { key: keyof PrivacySettings["visible_fields"]; label: string; desc: string }[] = [
  { key: "photo", label: "Profile photo", desc: "Your picture on verification results." },
  { key: "headline", label: "Professional headline", desc: "One-line summary under your name." },
  { key: "location", label: "Location", desc: "City and country." },
  { key: "career_history", label: "Career history", desc: "Roles, companies and tenures." },
  { key: "project_history", label: "Project history", desc: "Notable work and achievements." },
  { key: "earnings", label: "Verified earnings", desc: "Payroll-verified compensation records." },
  { key: "cv", label: "CV / résumé", desc: "Downloadable document." },
  { key: "trust", label: "Trust Score", desc: "Your aggregated reputation badge." },
  { key: "remarks", label: "Employer remarks", desc: "Structured feedback from supervisors." },
];

function EmployeeDashboard() {
  const router = useRouter();
  const params = useSearchParams();
  const minted = params.get("minted") === "1";

  const [me, setMe] = useState<MeResponse | null>(null);
  const [remarks, setRemarks] = useState<EmployerRemark[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    headline: "",
    location: "",
    date_of_birth: "",
    career_history: "",
    project_history: "",
    earnings_data: "",
    skills: "",
    cv_url: null as string | null,
    profile_pic_url: null as string | null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [privacySaved, setPrivacySaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<MeResponse>("/api/auth/me");
        if (!data.user) return router.replace("/login");
        if (data.user.role !== "EMPLOYEE") return router.replace("/dashboard/employer");
        if (!data.user.onboarded) return router.replace("/onboarding/employee");
        setMe(data);
        setForm({
          name: data.user.name,
          headline: data.profile?.headline ?? "",
          location: data.profile?.location ?? "",
          date_of_birth: data.profile?.date_of_birth ?? "",
          career_history: data.profile?.career_history ?? "",
          project_history: data.profile?.project_history ?? "",
          earnings_data: data.profile?.earnings_data ?? "",
          skills: (data.profile?.skills ?? []).join(", "),
          cv_url: data.profile?.cv_url ?? null,
          profile_pic_url: data.user.profile_pic_url,
        });
        const r = await api<{ remarks: EmployerRemark[] }>("/api/remarks");
        setRemarks(r.remarks);
      } catch (err: any) {
        setLoadError(err.message);
      }
    })();
  }, [router]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updatePrivacy(patch: Record<string, unknown>) {
    if (!me?.user) return;
    const currentPrivacy = me.privacy || defaultPrivacy(me.user.id);
    const next: PrivacySettings = {
      ...currentPrivacy,
      ...(patch.hide_exact_dob !== undefined ? { hide_exact_dob: !!patch.hide_exact_dob } : {}),
      ...(patch.show_age_range_only !== undefined ? { show_age_range_only: !!patch.show_age_range_only } : {}),
      visible_fields: patch.visible_fields
        ? { ...currentPrivacy.visible_fields, ...(patch.visible_fields as object) }
        : currentPrivacy.visible_fields,
    };
    setMe({ ...me, privacy: next });
    setPrivacySaved(false);
    const res = await api<{ ok: boolean; privacy: PrivacySettings }>("/api/privacy", {
      method: "PUT",
      body: JSON.stringify(patch),
    }).catch(() => null);
    if (res?.privacy) {
      setMe((prev) => (prev ? { ...prev, privacy: res.privacy } : prev));
    }
    setPrivacySaved(true);
    setTimeout(() => setPrivacySaved(false), 1500);
  }

  if (loadError)
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="rounded-xl border border-danger/20 bg-danger-soft px-5 py-3 text-sm font-medium text-danger">{loadError}</p>
      </main>
    );
  if (!me?.user || !me.profile)
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="w-full max-w-md space-y-3 px-6">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </main>
    );

  const { user, profile, privacy } = me;
  const filled = [
    form.headline,
    form.date_of_birth,
    form.career_history,
    form.project_history,
    form.earnings_data,
    form.cv_url,
    form.profile_pic_url,
  ].filter(Boolean).length;
  const completeness = Math.round((filled / 7) * 100);

  return (
    <main className="min-h-dvh">
      <DashboardNav name={user.name} role="Employee vault" />

      {minted && (
        <div className="bg-trust px-4 py-3.5 text-center text-white">
          <p className="animate-fade-up flex items-center justify-center gap-2 text-sm font-medium">
            <IconCheck className="size-4" />
            Welcome to Mopol — your Employability ID has been minted below. Guard it like a BVN.
          </p>
        </div>
      )}

      <div className="animate-fade-up mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Your <span className="accent-serif text-gradient-animated">vault.</span>
            </h1>
            <p className="mt-1 text-sm text-ink/55">Everything an employer can verify — and everything they can&apos;t.</p>
          </div>
          <Link
            href={`/verify?eid=${profile.employability_id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-trust transition-colors hover:text-trust-strong"
          >
            Preview what employers see <IconArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-5">
          {/* ============ ID CARD ============ */}
          <div className="relative z-0 overflow-hidden rounded-3xl bg-ink bg-grid-dark p-7 text-paper sm:p-8 lg:col-span-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-paper/80">Employability ID</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-trust-light/15 px-2.5 py-1 text-[11px] font-semibold text-trust-light">
                <span className="size-1.5 rounded-full bg-trust-light animate-pulse-dot" /> Active
              </span>
            </div>
            <p className="mt-8 break-all font-mono text-4xl font-semibold tracking-[0.08em] sm:text-5xl">
              {profile.employability_id}
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <CopyButton text={profile.employability_id} label="Copy ID" />
              <CopyButton
                text={`${typeof window !== "undefined" ? window.location.origin : ""}/verify?eid=${profile.employability_id}`}
                label="Copy share link"
              />
            </div>
            <p className="mt-7 max-w-md text-xs leading-relaxed text-paper/50">
              Share this ID with any employer. They see only the fields you switch on below —
              everything else stays sealed in the vault.
            </p>
          </div>

          {/* ============ TRUST ============ */}
          <Card className="lg:col-span-2">
            <CardHeader><span>Trust Score</span><span>{remarks.length} remarks</span></CardHeader>
            <div className="p-6 sm:p-7">
              {profile.trust_score !== null && remarks.length > 0 ? (
                <TrustMeter score={profile.trust_score} label={trustLabel(profile.trust_score)} count={remarks.length} />
              ) : (
                <div className="py-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold text-ink/50">
                    Unrated
                  </span>
                  <p className="mt-4 text-sm leading-relaxed text-ink/55">
                    No employer remarks yet. Once a supervisor logs feedback, your Trust Score appears
                    here and follows you across your career.
                  </p>
                </div>
              )}
              <div className="mt-6 border-t border-black/[0.05] pt-5">
                <p className="mb-2 flex justify-between text-xs text-ink/50">
                  <span>Profile completeness</span><span className="font-semibold text-ink">{completeness}%</span>
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-ink/[0.07]">
                  <div className="h-full rounded-full bg-trust transition-all duration-700" style={{ width: `${completeness}%` }} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          {/* ============ PROFILE FORM ============ */}
          <Card>
            <CardHeader>
              <span>Profile records</span>
              <span className={saved ? "!text-trust font-semibold" : ""}>{saved ? "✓ Saved" : "Edit + save"}</span>
            </CardHeader>
            <form onSubmit={saveProfile} className="space-y-5 p-6 sm:p-8">
              <div className="flex items-center gap-5">
                {form.profile_pic_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.profile_pic_url} alt="Profile" className="size-16 rounded-full object-cover ring-4 ring-mint" />
                ) : (
                  <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-ink/15 text-ink/30">
                    <IconUser className="size-5" />
                  </span>
                )}
                <FileField kind="photo" label="Upload photo" current={form.profile_pic_url} onUploaded={(url) => setForm((f) => ({ ...f, profile_pic_url: url }))} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name">
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </Field>
                <Field label="Date of birth" hint="Stored sealed. Only you decide what it proves.">
                  <Input type="date" value={form.date_of_birth} onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))} />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Professional headline">
                  <Input value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} placeholder="Senior Frontend Engineer — Fintech" />
                </Field>
                <Field label="Location">
                  <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Lagos, Nigeria" />
                </Field>
              </div>

              <Field label="Skills" hint="Comma-separated. Uploading a CV also fills this automatically.">
                <Input value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))} placeholder="React, TypeScript, Next.js" />
              </Field>

              <Field label="Career history" hint="One role per line: years · title · company.">
                <Textarea value={form.career_history} onChange={(e) => setForm((f) => ({ ...f, career_history: e.target.value }))} />
              </Field>

              <Field label="Project history" hint="Notable projects and measurable outcomes.">
                <Textarea value={form.project_history} onChange={(e) => setForm((f) => ({ ...f, project_history: e.target.value }))} />
              </Field>

              <Field label="Verified earnings" hint="e.g. 2025 · NGN 38,000,000 (payroll-verified).">
                <Textarea value={form.earnings_data} onChange={(e) => setForm((f) => ({ ...f, earnings_data: e.target.value }))} />
              </Field>

              <Field label="CV / résumé">
                <FileField kind="cv" label="Upload CV" current={form.cv_url} onUploaded={(url) => setForm((f) => ({ ...f, cv_url: url }))} />
              </Field>

              {saveError && (
                <p role="alert" className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
                  {saveError}
                </p>
              )}
              <Btn type="submit" variant="trust" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Saving…" : saved ? "✓ Saved" : "Save profile"}
              </Btn>
            </form>
          </Card>

          <div className="space-y-5">
            {/* ============ SEALED DOCUMENTS ============ */}
            <DocumentsCard />

            {/* ============ PRIVACY ============ */}
            <Card>
              <CardHeader>
                <span>Privacy switches</span>
                <span className={privacySaved ? "!text-trust font-semibold" : ""}>{privacySaved ? "✓ Saved" : "Instant"}</span>
              </CardHeader>
              <div className="p-4 sm:p-5">
                <p className="px-3 pb-2 text-sm leading-relaxed text-ink/55">
                  You hold the keys. Fields switched off appear as sealed blocks to any employer who
                  queries your ID.
                </p>
                {privacy && (
                  <div className="divide-y divide-black/[0.04]">
                    <Toggle
                      checked={privacy.hide_exact_dob}
                      onChange={(v) => updatePrivacy({ hide_exact_dob: v, ...(v ? {} : { show_age_range_only: false }) })}
                      label="Seal exact date of birth"
                      description="Employers never see your real DOB."
                    />
                    <Toggle
                      checked={privacy.show_age_range_only}
                      onChange={(v) => updatePrivacy({ show_age_range_only: v, ...(v ? { hide_exact_dob: true } : {}) })}
                      label="Share age band only"
                      description="Show e.g. “25–29” instead of nothing. Fact proofs still work."
                    />
                    {FIELD_LABELS.map((f) => (
                      <Toggle
                        key={f.key}
                        checked={privacy.visible_fields[f.key]}
                        onChange={(v) => updatePrivacy({ visible_fields: { [f.key]: v } })}
                        label={f.label}
                        description={f.desc}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* ============ REMARKS ============ */}
            <Card>
              <CardHeader><span>Employer remarks</span><span>{remarks.length} on file</span></CardHeader>
              <div className="divide-y divide-black/[0.05]">
                {remarks.length === 0 ? (
                  <p className="p-6 text-sm text-ink/45">
                    No remarks yet. Share your ID with a past supervisor to start building your Trust Score.
                  </p>
                ) : (
                  remarks.map((r) => (
                    <article key={r.id} className="p-6">
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
                      <p className="mt-3 text-xs font-medium text-ink/45">— {r.employer_name} · {r.employer_company}</p>
                    </article>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function trustLabel(score: number): string {
  if (score >= 90) return "EXCEPTIONAL";
  if (score >= 75) return "STRONG";
  if (score >= 60) return "SOLID";
  if (score >= 40) return "DEVELOPING";
  return "AT RISK";
}

export default function EmployeePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center">
          <div className="skeleton h-8 w-48 rounded-full" />
        </main>
      }
    >
      <EmployeeDashboard />
    </Suspense>
  );
}
