"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Btn,
  Card,
  CardHeader,
  IconCheck,
  IconShield,
  IconLock,
  IconSparkle,
  IconSearch,
  IconArrowRight,
  IconCopy,
  IconUser,
} from "@/components/ui";
import { api, DashboardNav } from "@/components/client";

interface MeResponse {
  user: { id: string; name: string; email: string; role: string; company: string | null } | null;
}

interface CandidateRecommendation {
  employability_id: string;
  user_id: string;
  name: string;
  headline: string;
  location: string;
  profile_pic_url: string;
  age_range: string;
  age_verified: boolean;
  trust_score: number;
  trust_label: string;
  loan_free: boolean;
  match_score: number;
  matched_tags: string[];
  unmatched_tags: string[];
  skills: string[];
  key_highlights: string[];
  ai_fit_rationale: string;
  meets_criteria: boolean;
}

const PRESETS = [
  {
    title: "🛡️ Staff DevSecOps & Cloud Security Architect",
    text: "Seeking a senior security architect with 7+ years experience in Zero-Trust PAM pipelines, Kubernetes hardening, AWS cloud architecture, and CI/CD DevSecOps tooling. Must be based in Lagos or hybrid, age 21 or above, with verified loan-free history.",
    tags: ["Zero-Trust", "Kubernetes", "AWS", "DevSecOps", "Python"],
    location: "Lagos",
    minAge: 21,
    minTrust: 90,
  },
  {
    title: "⚡ Lead FinTech & Systems Engineer",
    text: "Looking for an experienced technical lead specializing in high-throughput payment systems, modern React, TypeScript, and microservices. Minimum 5 years experience, clean background records, based in Nigeria with remote flexibility.",
    tags: ["React", "TypeScript", "Next.js", "Team Leadership"],
    location: "Lagos",
    minAge: 21,
    minTrust: 85,
  },
  {
    title: "🔍 Cyber Threat Intelligence & SIEM Specialist",
    text: "Requires an analytical cybersecurity specialist for enterprise SIEM threat hunting, active penetration testing, SOC 2 compliance, and Python automation. Age 21+, certified loan-free record.",
    tags: ["SIEM", "Penetration Testing", "Python", "Cloud Security"],
    location: "All",
    minAge: 21,
    minTrust: 80,
  },
];

const DEFAULT_TAGS = [
  "Zero-Trust",
  "Kubernetes",
  "AWS",
  "DevSecOps",
  "Python",
  "Docker",
  "SIEM",
  "TypeScript",
  "React",
  "Penetration Testing",
  "SOC 2 Compliance",
  "CISSP Certified",
];

export default function EmployerRecommendationsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [checked, setChecked] = useState(false);

  // Filter Form State
  const [reqText, setReqText] = useState(PRESETS[0].text);
  const [location, setLocation] = useState(PRESETS[0].location);
  const [minAge, setMinAge] = useState<number>(21);
  const [minTrust, setMinTrust] = useState<number>(90);
  const [requireLoanFree, setRequireLoanFree] = useState(true);

  // Dynamic tags
  const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_TAGS);
  const [selectedTags, setSelectedTags] = useState<string[]>(PRESETS[0].tags);
  const [customTagInput, setCustomTagInput] = useState("");

  // Results State
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<CandidateRecommendation[] | null>(null);
  const [totalScanned, setTotalScanned] = useState(0);
  const [copiedEid, setCopiedEid] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await api<MeResponse>("/api/auth/me");
      if (!data.user) return router.replace("/login");
      if (data.user.role !== "EMPLOYER") return router.replace("/dashboard/employee");
      setMe(data.user);
      setChecked(true);
      // Run initial search with preset 0
      runRecommendationScan({
        text: PRESETS[0].text,
        loc: PRESETS[0].location,
        age: PRESETS[0].minAge,
        trust: PRESETS[0].minTrust,
        tags: PRESETS[0].tags,
        loanFree: true,
      });
    })().catch(() => router.replace("/login"));
  }, [router]);

  async function runRecommendationScan(override?: {
    text: string;
    loc: string;
    age: number;
    trust: number;
    tags: string[];
    loanFree: boolean;
  }) {
    setScanning(true);
    try {
      const res = await api<{
        ok: boolean;
        total_scanned: number;
        matched_count: number;
        recommendations: CandidateRecommendation[];
      }>("/api/recommendations", {
        method: "POST",
        body: JSON.stringify({
          requirements_text: override?.text ?? reqText,
          location: override?.loc ?? location,
          min_age: override?.age ?? minAge,
          min_trust_score: override?.trust ?? minTrust,
          required_tags: override?.tags ?? selectedTags,
          require_loan_free: override?.loanFree ?? requireLoanFree,
        }),
      });
      setResults(res.recommendations);
      setTotalScanned(res.total_scanned);
    } catch (e: any) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  }

  function applyPreset(p: typeof PRESETS[0]) {
    setReqText(p.text);
    setLocation(p.location);
    setMinAge(p.minAge);
    setMinTrust(p.minTrust);
    setSelectedTags(p.tags);
    runRecommendationScan({
      text: p.text,
      loc: p.location,
      age: p.minAge,
      trust: p.minTrust,
      tags: p.tags,
      loanFree: true,
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function addCustomTag() {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    if (!availableTags.includes(trimmed)) {
      setAvailableTags((prev) => [...prev, trimmed]);
    }
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setCustomTagInput("");
  }

  function copyToClipboard(eid: string) {
    navigator.clipboard.writeText(eid);
    setCopiedEid(eid);
    setTimeout(() => setCopiedEid(null), 2000);
  }

  if (!checked || !me) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="w-full max-w-md space-y-3 px-6">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-20">
      <DashboardNav
        name={me.name}
        role={me.company ?? "Employer"}
        right={
          <Link
            href="/dashboard/employer"
            className="hidden text-xs font-semibold text-trust hover:underline sm:inline-flex items-center gap-1"
          >
            ← Single ID Lookup
          </Link>
        }
      />

      <div className="animate-fade-up mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* ============ BREADCRUMB & HEADER ============ */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-ink/40">
              <Link href="/dashboard/employer" className="hover:text-ink">
                Employer Dashboard
              </Link>
              <span>/</span>
              <span className="font-medium text-trust">Candidate Recommendations</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Get Recommended <span className="accent-serif text-gradient-animated">Candidates.</span>
            </h1>
            <p className="mt-1 text-sm text-ink/55">
              Paste your raw job requirements, set Zero-Knowledge criteria, and let Mopol scan verified candidate vaults.
            </p>
          </div>

          <Link
            href="/dashboard/employer"
            className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-card px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-ink/[0.04]"
          >
            <IconSearch className="size-3.5 text-trust" /> Look up Single ID
          </Link>
        </div>

        {/* ============ PRESET PILLS ============ */}
        <div className="mt-6 rounded-2xl border border-trust/20 bg-mint/30 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-trust">
            <IconSparkle className="size-4" /> 1-Click Test Scenarios:
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="cursor-pointer rounded-xl border border-trust/25 bg-card px-3.5 py-1.5 text-xs font-medium text-ink transition-all duration-150 hover:border-trust hover:bg-mint hover:text-trust"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* ============ REQUIREMENTS FORM ============ */}
        <div className="mt-6 rounded-3xl border border-black/[0.06] bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <label htmlFor="req-text" className="text-sm font-semibold text-ink">
              Job Requirements or Role Description
            </label>
            <span className="text-xs text-ink/40">Natural language parsed</span>
          </div>

          <textarea
            id="req-text"
            rows={4}
            value={reqText}
            onChange={(e) => setReqText(e.target.value)}
            placeholder="Paste your job description, required technical stack, experience expectations, or certifications here..."
            className="mt-2.5 w-full rounded-2xl border border-ink/15 bg-paper/50 p-4 text-sm leading-relaxed text-ink placeholder:text-ink/35 transition-all duration-200 focus:border-trust focus:bg-card focus:outline-none focus:ring-4 focus:ring-trust/15"
          />

          {/* ============ FILTERS ROW ============ */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Location */}
            <div>
              <label className="text-xs font-semibold text-ink/70">Location Filter</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink/15 bg-card px-3.5 py-2.5 text-sm font-medium text-ink transition-all focus:border-trust focus:outline-none focus:ring-2 focus:ring-trust/20"
              >
                <option value="Lagos">Lagos, Nigeria</option>
                <option value="Abuja">Abuja, Nigeria</option>
                <option value="Remote">Remote / Hybrid</option>
                <option value="All">All Locations</option>
              </select>
            </div>

            {/* Minimum Age (Zero Knowledge) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink/70">Minimum Age</label>
                <span className="text-[10px] font-semibold text-trust">ZK Sealed</span>
              </div>
              <select
                value={minAge}
                onChange={(e) => setMinAge(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-ink/15 bg-card px-3.5 py-2.5 text-sm font-medium text-ink transition-all focus:border-trust focus:outline-none focus:ring-2 focus:ring-trust/20"
              >
                <option value={18}>Age 18+ (Adult Compliance)</option>
                <option value={21}>Age 21+ (Fintech / Enterprise)</option>
                <option value={25}>Age 25+ (Senior Track)</option>
              </select>
            </div>

            {/* Minimum Trust Score */}
            <div>
              <label className="text-xs font-semibold text-ink/70">Minimum Trust Score</label>
              <select
                value={minTrust}
                onChange={(e) => setMinTrust(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-ink/15 bg-card px-3.5 py-2.5 text-sm font-medium text-ink transition-all focus:border-trust focus:outline-none focus:ring-2 focus:ring-trust/20"
              >
                <option value={70}>70+ / 100 (Acceptable)</option>
                <option value={80}>80+ / 100 (Strong)</option>
                <option value={90}>90+ / 100 (Exceptional)</option>
                <option value={95}>95+ / 100 (Top 1%)</option>
              </select>
            </div>

            {/* Loan Free Toggle */}
            <div className="flex flex-col justify-end">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-ink/10 bg-paper/60 p-2.5 transition-all hover:bg-paper">
                <input
                  type="checkbox"
                  checked={requireLoanFree}
                  onChange={(e) => setRequireLoanFree(e.target.checked)}
                  className="size-4 rounded text-trust focus:ring-trust"
                />
                <div>
                  <span className="block text-xs font-semibold text-ink">100% Loan-Free</span>
                  <span className="block text-[10px] text-ink/50">Zero unpaid employer debts</span>
                </div>
              </label>
            </div>
          </div>

          {/* ============ REQUIREMENT TAGS MATRIX ============ */}
          <div className="mt-6 border-t border-black/[0.06] pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink/70">
                Target Requirements & Skill Tags ({selectedTags.length} active)
              </span>
              <span className="text-[11px] text-ink/40">Click to toggle requirements</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ${
                      isSelected
                        ? "border border-trust bg-trust text-white shadow-sm"
                        : "border border-ink/15 bg-card text-ink/75 hover:border-ink/30 hover:bg-ink/[0.03]"
                    }`}
                  >
                    {isSelected && <IconCheck className="size-3" />}
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Creator */}
            <div className="mt-4 flex max-w-md items-center gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="Add custom requirement tag (e.g. Terraform, ISO 27001)..."
                className="w-full rounded-xl border border-ink/15 bg-card px-3.5 py-1.5 text-xs text-ink placeholder:text-ink/40 focus:border-trust focus:outline-none focus:ring-2 focus:ring-trust/15"
              />
              <Btn type="button" variant="outline" onClick={addCustomTag} className="!min-h-8 !px-3 !text-xs">
                + Add Tag
              </Btn>
            </div>
          </div>

          {/* Scan CTA */}
          <div className="mt-6 flex justify-end">
            <Btn
              variant="trust"
              disabled={scanning}
              onClick={() => runRecommendationScan()}
              className="!min-h-12 !px-8 !text-sm"
            >
              {scanning ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Scanning Candidate Vaults…
                </>
              ) : (
                <>
                  <IconSparkle className="size-4" /> Scan Vaults & Recommend Candidates
                </>
              )}
            </Btn>
          </div>
        </div>

        {/* ============ RESULTS SECTION ============ */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              Recommended Candidates
              {results && (
                <span className="ml-2.5 rounded-full bg-trust/10 px-2.5 py-0.5 text-xs font-semibold text-trust">
                  {results.length} Found ({totalScanned} Scanned)
                </span>
              )}
            </h2>
            <span className="text-xs text-ink/40">Ranked by cryptographic match score</span>
          </div>

          {scanning && (
            <div className="mt-6 space-y-4">
              <div className="skeleton h-36 rounded-3xl" />
              <div className="skeleton h-36 rounded-3xl" />
            </div>
          )}

          {!scanning && results && results.length === 0 && (
            <Card className="mt-6 p-8 text-center">
              <p className="text-base font-semibold text-ink">No candidates matched your exact criteria</p>
              <p className="mt-1 text-sm text-ink/50">
                Try loosening the location filter to &ldquo;All Locations&rdquo; or lowering the minimum trust score.
              </p>
            </Card>
          )}

          {!scanning && results && results.length > 0 && (
            <div className="mt-6 space-y-5">
              {results.map((c) => {
                const isTopMatch = c.match_score >= 90;
                return (
                  <article
                    key={c.employability_id}
                    className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md sm:p-8"
                  >
                    {/* Top match glow bar */}
                    {isTopMatch && (
                      <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-trust via-trust-light to-emerald-400" />
                    )}

                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      {/* Left: Avatar + Identity */}
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          {c.profile_pic_url ? (
                            <img
                              src={c.profile_pic_url}
                              alt={c.name}
                              className="size-16 rounded-2xl object-cover ring-2 ring-trust/20 sm:size-20"
                            />
                          ) : (
                            <div className="grid size-16 place-items-center rounded-2xl bg-mint text-trust sm:size-20">
                              <IconUser className="size-8" />
                            </div>
                          )}
                          <span
                            className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-trust text-white shadow-sm ring-2 ring-card"
                            title="Verified Identity"
                          >
                            <IconCheck className="size-3" />
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-ink">{c.name}</h3>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(c.employability_id)}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-ink/15 bg-paper/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink/75 transition-colors hover:bg-paper"
                              title="Copy Employability ID"
                            >
                              <IconCopy className="size-3" />
                              {c.employability_id}
                              {copiedEid === c.employability_id && (
                                <span className="text-trust font-sans text-[10px]">Copied!</span>
                              )}
                            </button>
                          </div>

                          <p className="mt-1 text-sm font-medium text-ink/80">{c.headline}</p>
                          <p className="mt-0.5 text-xs text-ink/50">{c.location}</p>

                          {/* Highlights pills */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {c.key_highlights.map((h, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-full bg-mint/60 px-2.5 py-0.5 text-[11px] font-medium text-trust"
                              >
                                <IconCheck className="size-3" /> {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Match Score badge & Actions */}
                      <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold tracking-tight text-ink tabular-nums">
                            {c.match_score}%
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isTopMatch ? "bg-trust text-white" : "bg-ink/10 text-ink/75"
                            }`}
                          >
                            {isTopMatch ? "Best Match" : "Qualified"}
                          </span>
                        </div>

                        {/* Match Progress Bar */}
                        <div className="h-2 w-36 overflow-hidden rounded-full bg-ink/[0.08]">
                          <div
                            className={`h-full rounded-full ${
                              isTopMatch
                                ? "bg-gradient-to-r from-trust to-trust-light"
                                : "bg-ink/40"
                            }`}
                            style={{ width: `${c.match_score}%` }}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-2 flex items-center gap-2">
                          <Link
                            href={`/verify?eid=${encodeURIComponent(c.employability_id)}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-trust bg-mint px-3.5 py-2 text-xs font-semibold text-trust transition-all hover:bg-trust hover:text-white"
                          >
                            Verify Profile <IconArrowRight className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* AI Fit Rationale */}
                    <div className="mt-5 rounded-2xl border border-trust/15 bg-paper/40 p-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-trust">
                        <IconSparkle className="size-3.5" /> AI Match Rationale:
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink/70">
                        {c.ai_fit_rationale}
                      </p>
                    </div>

                    {/* Matched Tags Bar */}
                    <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
                      <span className="font-semibold text-ink/50">Verified Skills:</span>
                      {c.matched_tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                        >
                          ✓ {t}
                        </span>
                      ))}
                      {c.unmatched_tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-lg border border-ink/10 bg-paper/60 px-2 py-0.5 text-[11px] text-ink/40 line-through"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
