"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Logo,
  Btn,
  BtnLink,
  Card,
  VerifiedBadge,
  Redacted,
  TrustMeter,
  RatingStars,
  Monogram,
  Field,
  Textarea,
  IconSearch,
  IconCheck,
  IconLock,
  IconFile,
  IconSparkle,
  IconShield,
  IconArrowRight,
} from "@/components/ui";
import { api, ProofConsole, RatingInput, Toggle, Reveal } from "@/components/client";
import { RequirementsPanel, AskPanel } from "@/components/panels";

interface VerifyResponse {
  found: boolean;
  viewer: "OWNER" | "EMPLOYER" | "GUEST";
  verified_at: string;
  profile: {
    employability_id: string;
    name: string;
    photo: string | null;
    headline: string | null;
    location: string | null;
    dob_display: { mode: "exact" | "range" | "hidden"; value: string | null };
    career_history: string | null;
    project_history: string | null;
    earnings_data: string | null;
    cv_url: string | null;
    trust: { score: number; label: string; count: number; avg_rating: number; loan_free_ratio: number } | null;
    remarks: {
      id: string;
      employer_name: string;
      employer_company: string;
      remark_text: string;
      performance_rating: number;
      loan_free_status: boolean;
      created_at: string;
    }[] | null;
    fields: Record<string, boolean>;
  };
  assertions: { type: string; result: boolean; detail: string }[];
}

function VerifyInner() {
  const params = useSearchParams();
  const [eid, setEid] = useState(params.get("eid") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ user: unknown }>("/api/auth/me").then((d) => setLoggedIn(!!d.user)).catch(() => setLoggedIn(false));
  }, []);

  const run = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = await api<VerifyResponse>("/api/verify", {
        method: "POST",
        body: JSON.stringify({ employability_id: id }),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const preset = params.get("eid");
    if (preset) run(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = result?.profile;

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            {loggedIn === false && (
              <>
                <span className="hidden text-xs font-medium text-ink/45 sm:inline">Guest mode</span>
                <BtnLink href="/register" variant="trust" className="!min-h-9 !px-4 !py-1.5">Full access</BtnLink>
              </>
            )}
            {loggedIn && (
              <BtnLink href="/" variant="ghost" className="!min-h-9">← Home</BtnLink>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Verify a <span className="accent-serif text-gradient-animated">candidate.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/55">
            Enter an Employability ID to receive a verified profile — filtered live by the
            candidate&apos;s own privacy settings.
          </p>
        </div>

        {/* search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(eid);
          }}
          className="mx-auto mt-8 flex max-w-2xl flex-col gap-2.5 sm:flex-row"
        >
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-ink/35" />
            <input
              value={eid}
              onChange={(e) => setEid(e.target.value.toUpperCase())}
              placeholder="BSQ-XXXX-XXXX"
              aria-label="Employability ID"
              className="min-h-14 w-full rounded-2xl border border-ink/15 bg-card pl-11 pr-4 font-mono text-base font-semibold tracking-[0.12em] placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-ink/35 transition-all duration-200 hover:border-ink/25 focus:border-trust focus:outline-none focus:ring-4 focus:ring-trust/15"
            />
          </div>
          <Btn type="submit" variant="trust" disabled={busy || !eid.trim()} className="!min-h-14 !rounded-2xl !px-7">
            {busy ? "Verifying…" : "Verify"}
          </Btn>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium text-ink/50">Demo Candidates:</span>
          <button
            type="button"
            onClick={() => { setEid("BSQ-CYBR-2026"); run("BSQ-CYBR-2026"); }}
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold transition-all ${
              eid === "BSQ-CYBR-2026"
                ? "bg-trust text-white shadow-xs"
                : "border border-trust/30 bg-mint/50 text-trust hover:bg-mint"
            }`}
          >
            🛡️ Elena Vance (DevSecOps) · BSQ-CYBR-2026
          </button>
          <button
            type="button"
            onClick={() => { setEid("BSQ-D3MO-2026"); run("BSQ-D3MO-2026"); }}
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold transition-all ${
              eid === "BSQ-D3MO-2026"
                ? "bg-trust text-white shadow-xs"
                : "border border-ink/15 bg-card text-ink/75 hover:bg-paper"
            }`}
          >
            ⚡ Amara Okafor (Payments) · BSQ-D3MO-2026
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-auto mt-6 max-w-2xl rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        {/* skeleton while searching */}
        {busy && (
          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            <div className="skeleton h-40 rounded-2xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="skeleton h-32 rounded-2xl" />
              <div className="skeleton h-32 rounded-2xl" />
            </div>
          </div>
        )}

        {/* ============ RESULT ============ */}
        {result && p && !busy && (
          <div className="mt-12 space-y-5">
            {result.viewer === "GUEST" && (
              <Reveal>
                <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-ink px-6 py-5 text-paper sm:flex-row sm:items-center">
                  <p className="flex items-center gap-2.5 text-sm">
                    <IconLock className="size-4 shrink-0 text-trust-light" />
                    Guest preview — restricted fields are hidden.
                  </p>
                  <BtnLink href="/register" variant="invert" className="!min-h-9 !px-4 !py-1.5 !text-xs">
                    Register as an employer for full access
                  </BtnLink>
                </div>
              </Reveal>
            )}
            {result.viewer === "OWNER" && (
              <Reveal>
                <div className="flex items-center gap-2.5 rounded-2xl border border-trust/20 bg-mint px-6 py-4 text-sm font-medium text-trust">
                  <IconSparkle className="size-4" />
                  Owner view — this is your own record, shown in full.
                </div>
              </Reveal>
            )}

            {/* identity card */}
            <Reveal>
              <Card className="glow-ring p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-5">
                    {p.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo} alt={`${p.name}'s photo`} className="size-24 shrink-0 rounded-full object-cover ring-4 ring-mint" />
                    ) : p.fields.photo ? (
                      <Monogram name={p.name} size="lg" />
                    ) : (
                      <span className="grid size-24 shrink-0 place-items-center rounded-full border-2 border-dashed border-ink/15">
                        <IconLock className="size-5 text-ink/30" />
                      </span>
                    )}
                    <div>
                      <p className="font-mono text-xs text-ink/45">{p.employability_id}</p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{p.name}</h2>
                      {p.headline !== null ? (
                        <p className="mt-0.5 text-sm text-ink/55">{p.headline || "—"}</p>
                      ) : (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink/40"><IconLock className="size-3" /> headline hidden</p>
                      )}
                      {p.location && <p className="mt-0.5 text-xs text-ink/50">{p.location}</p>}
                      <p className="mt-2.5 text-xs text-ink/50">
                        {p.dob_display.mode === "exact" && <>Date of birth: <b className="text-ink">{p.dob_display.value}</b> <span className="text-ink/40">(candidate disclosed)</span></>}
                        {p.dob_display.mode === "range" && <>Age band: <b className="text-ink">{p.dob_display.value}</b> <span className="text-ink/40">— exact DOB sealed</span></>}
                        {p.dob_display.mode === "hidden" && <span className="flex items-center gap-1.5"><IconLock className="size-3" /> Age hidden by candidate</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <VerifiedBadge />
                    <p className="text-[11px] text-ink/40">{new Date(result.verified_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* assertions */}
                <div className="mt-7 border-t border-black/[0.05] pt-6">
                  <p className="mb-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">Proven assertions</p>
                  <div className="flex flex-wrap gap-2">
                    {result.assertions.map((a) => (
                      <span
                        key={a.type}
                        title={a.detail}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                          a.result
                            ? "bg-mint text-trust"
                            : "border border-ink/15 text-ink/45"
                        }`}
                      >
                        <IconCheck className="size-3" />
                        {a.type.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </Reveal>

            {/* records grid */}
            <div className="grid gap-5 lg:grid-cols-2">
              {(
                [
                  { title: "Career history", value: p.career_history, visible: p.fields.career_history, mono: false },
                  { title: "Project history", value: p.project_history, visible: p.fields.project_history, mono: false },
                  { title: "Verified earnings", value: p.earnings_data, visible: p.fields.earnings, mono: true },
                ] as const
              ).map((s) => (
                <Reveal key={s.title}>
                  <Card className="h-full">
                    <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-4">
                      <span className="text-sm font-semibold">{s.title}</span>
                      <span className={`text-[11px] font-medium ${s.visible ? "text-trust" : "text-ink/35"}`}>
                        {s.visible ? "Visible" : "Sealed"}
                      </span>
                    </div>
                    <div className="p-6">
                      {s.value !== null ? (
                        <pre className={`whitespace-pre-wrap text-sm leading-relaxed text-ink/75 ${s.mono ? "font-mono" : "font-sans"}`}>{s.value || "—"}</pre>
                      ) : (
                        <Redacted label={`${s.title} sealed by candidate`} />
                      )}
                    </div>
                  </Card>
                </Reveal>
              ))}
              <Reveal>
                <Card className="h-full">
                  <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-4">
                    <span className="text-sm font-semibold">CV / Résumé</span>
                    <span className={`text-[11px] font-medium ${p.fields.cv ? "text-trust" : "text-ink/35"}`}>
                      {p.fields.cv ? "Visible" : "Sealed"}
                    </span>
                  </div>
                  <div className="p-6">
                    {p.cv_url ? (
                      <a href={p.cv_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink/15 px-5 text-sm font-semibold transition-all duration-200 hover:border-trust hover:text-trust">
                        <IconFile className="size-4" /> Open CV ↗
                      </a>
                    ) : p.fields.cv ? (
                      <p className="text-sm text-ink/45">No CV uploaded.</p>
                    ) : (
                      <Redacted label="CV sealed by candidate" />
                    )}
                  </div>
                </Card>
              </Reveal>
            </div>

            {/* trust */}
            <Reveal>
              <Card>
                <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-4">
                  <span className="text-sm font-semibold">Trust Score</span>
                  <span className="text-[11px] font-medium text-ink/35">Aggregated from employer remarks</span>
                </div>
                <div className="p-6 sm:p-8">
                  {p.trust ? (
                    <div className="grid items-center gap-8 md:grid-cols-2">
                      <TrustMeter score={p.trust.score} label={p.trust.label} count={p.trust.count} />
                      <div className="space-y-3 text-sm text-ink/60">
                        <p className="flex items-center justify-between border-b border-black/[0.05] pb-3">Mean performance rating <b className="text-ink">{p.trust.avg_rating} / 5</b></p>
                        <p className="flex items-center justify-between border-b border-black/[0.05] pb-3">Loan-free tenures <b className="text-trust">{Math.round(p.trust.loan_free_ratio * 100)}%</b></p>
                        <p className="flex items-center justify-between">Remarks on file <b className="text-ink">{p.trust.count}</b></p>
                      </div>
                    </div>
                  ) : p.fields.trust ? (
                    <p className="text-sm text-ink/45">Unrated — no employer remarks yet.</p>
                  ) : (
                    <Redacted label="Trust Score sealed by candidate" />
                  )}
                </div>
              </Card>
            </Reveal>

            {/* remarks */}
            <Reveal>
              <Card>
                <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-4">
                  <span className="text-sm font-semibold">Employer remarks</span>
                  <span className="text-[11px] font-medium text-ink/35">{p.fields.remarks ? `${p.remarks?.length ?? 0} on file` : "Sealed"}</span>
                </div>
                <div className="divide-y divide-black/[0.05]">
                  {p.remarks === null ? (
                    <div className="p-6"><Redacted label="Remarks sealed by candidate" /></div>
                  ) : p.remarks.length === 0 ? (
                    <p className="p-6 text-sm text-ink/45">No remarks on file yet.</p>
                  ) : (
                    p.remarks.map((r) => (
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
            </Reveal>

            {/* proof console */}
            <Reveal>
              <ProofConsole employabilityId={p.employability_id} defaultMin={21} />
            </Reveal>

            {/* guest preview upgrade teaser */}
            {result.viewer === "GUEST" && (
              <Reveal>
                <Card className="border border-trust/20 bg-card p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-trust text-white shadow-xs">
                      <IconShield className="size-4.5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-ink">Locked Employer Verification Tools</h3>
                      <p className="text-xs text-ink/60">Registered employers have verified access to run active fact screening over this candidate:</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-black/[0.06] bg-paper/60 p-4">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink"><IconLock className="size-3 text-trust" /> ZK Age Proofs</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink/55">Cryptographically prove 21+, 25+, or 30+ without revealing date of birth.</p>
                    </div>
                    <div className="rounded-2xl border border-black/[0.06] bg-paper/60 p-4">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink"><IconCheck className="size-3 text-trust" /> 50-Point Screening</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink/55">Instant automated checks across identity, certifications, and experience.</p>
                    </div>
                    <div className="rounded-2xl border border-black/[0.06] bg-paper/60 p-4">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink"><IconSparkle className="size-3 text-trust" /> AI Vault Q&A</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink/55">Query sealed candidate documents with active OWASP Prompt Firewall.</p>
                    </div>
                    <div className="rounded-2xl border border-black/[0.06] bg-paper/60 p-4">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink"><IconFile className="size-3 text-trust" /> Trust Remarks</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink/55">Read supervisor performance ratings and certified loan-free tenures.</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-black/[0.06] pt-4 sm:flex-row sm:items-center">
                    <span className="text-xs text-ink/60">Log in with an employer account (e.g. <b className="font-mono text-ink">hr@demo.io</b>) to unlock full screening.</span>
                    <BtnLink href="/login" variant="trust" className="!min-h-9 !px-4 !py-1.5 !text-xs">
                      Sign In as Employer <IconArrowRight className="size-3.5" />
                    </BtnLink>
                  </div>
                </Card>
              </Reveal>
            )}

            {/* employer power tools: 50-point screening + AI Q&A + remarks */}
            {result.viewer === "EMPLOYER" && (
              <>
                <Reveal>
                  <RequirementsPanel employabilityId={p.employability_id} />
                </Reveal>
                <Reveal>
                  <AskPanel employabilityId={p.employability_id} />
                </Reveal>
                <Reveal>
                  <RemarkForm employabilityId={p.employability_id} onDone={() => run(p.employability_id)} />
                </Reveal>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function RemarkForm({ employabilityId, onDone }: { employabilityId: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [loanFree, setLoanFree] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl bg-ink bg-grid-dark text-paper">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <span className="text-sm font-semibold">Log an employer remark</span>
        <span className="text-xs text-paper/50">Feeds the Trust Score</span>
      </div>
      <form
        className="space-y-6 p-6 sm:p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          setOk(false);
          try {
            await api("/api/remarks", {
              method: "POST",
              body: JSON.stringify({
                employability_id: employabilityId,
                remark_text: text,
                performance_rating: rating,
                loan_free_status: loanFree,
              }),
            });
            setText("");
            setOk(true);
            onDone();
          } catch (err: any) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-paper/70">Performance rating</span>
            <RatingInput value={rating} onChange={setRating} />
          </div>
          <div>
            <Toggle
              checked={loanFree}
              onChange={setLoanFree}
              label="Loan-free tenure"
              description="Certify this worker completed their tenure with no outstanding obligations."
            />
          </div>
        </div>
        <Field label="Structured remark" hint="Word-keeping, reliability, delivery. Minimum 10 characters.">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="!border-white/15 !bg-white/5 !text-paper placeholder:!text-paper/30 hover:!border-white/25 focus:!border-trust-light focus:!ring-trust-light/20"
            placeholder="Delivered every commitment on time; repaid equipment loan early…"
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        {ok && (
          <p className="flex items-center gap-2 rounded-xl border border-trust-light/30 bg-trust-light/10 px-4 py-3 text-sm font-medium text-trust-light">
            <IconCheck className="size-4" /> Remark logged — Trust Score recomputed.
          </p>
        )}
        <Btn type="submit" variant="invert" disabled={busy || text.trim().length < 10}>
          {busy ? "Logging…" : "Log remark"}
        </Btn>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center">
          <div className="skeleton h-8 w-48 rounded-full" />
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
