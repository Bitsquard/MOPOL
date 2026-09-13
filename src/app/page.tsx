import Link from "next/link";
import {
  Logo,
  Eyebrow,
  BtnLink,
  Card,
  TrustMeter,
  IconShield,
  IconLock,
  IconEye,
  IconBolt,
  IconCheck,
  IconArrowRight,
  RatingStars,
} from "@/components/ui";
import { ProofConsole, Reveal } from "@/components/client";
import AuraSphere from "@/components/AuraSphere";
import AssembleCube from "@/components/AssembleCube";
import { DEMO_EMPLOYABILITY_ID } from "@/lib/db";

const MARQUEE = [
  "Verification as a Service",
  "Employability ID",
  "Zero-knowledge fact proving",
  "Candidate-owned data",
  "Trust Scores",
  "Loan-free attestation",
  "Instant background checks",
];

export default function Landing() {
  return (
    <main className="min-h-dvh">
      {/* ================= NAV ================= */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink/60 md:flex">
            <a href="#how" className="transition-colors hover:text-ink">How it works</a>
            <a href="#proof" className="transition-colors hover:text-ink">Fact proving</a>
            <a href="#trust" className="transition-colors hover:text-ink">Trust engine</a>
          </nav>
          <div className="flex items-center gap-2">
            <BtnLink href="/login" variant="ghost">Sign in</BtnLink>
            <BtnLink href="/register" variant="trust">Get started</BtnLink>
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative z-0 overflow-hidden">
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <div className="animate-fade-up">
              <Eyebrow>Verification as a Service — by Mopol</Eyebrow>
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">
              <span className="animate-fade-up d1 block">Prove everything.</span>
              <span className="animate-fade-up d2 accent-serif text-gradient-animated block pr-2">
                Reveal nothing.
              </span>
            </h1>
            <p className="animate-fade-up d3 mt-6 max-w-xl text-base leading-relaxed text-ink/60 sm:text-lg">
              The Employability ID is a private, candidate-owned identity for work — a BVN for employment.
              Employers verify facts in seconds instead of weeks. Candidates decide exactly what the world can see.
            </p>
            <div className="animate-fade-up d4 mt-9 flex flex-wrap items-center gap-3">
              <BtnLink href="/register" variant="trust" className="!px-7 !py-3 !text-[15px]">
                Get your Employability ID <IconArrowRight />
              </BtnLink>
              <BtnLink href="/verify" variant="outline" className="!px-7 !py-3 !text-[15px]">
                Run a live verification
              </BtnLink>
            </div>
            <p className="animate-fade-up d4 mt-5 text-xs text-ink/45">
              demo id&nbsp;·&nbsp;<span className="font-mono font-semibold text-trust">{DEMO_EMPLOYABILITY_ID}</span>
            </p>
          </div>

          {/* ---- the aura sphere ---- */}
          <div className="animate-fade-up d3 relative mx-auto w-full max-w-[560px]">
            <AuraSphere />
          </div>
        </div>

        {/* marquee */}
        <div className="border-y border-black/[0.06] bg-card py-3.5" aria-hidden>
          <div className="marquee-track text-xs font-medium uppercase tracking-[0.2em] text-ink/40">
            {[0, 1].map((n) => (
              <span key={n} className="flex shrink-0">
                {MARQUEE.map((m) => (
                  <span key={`${n}-${m}`} className="mx-7 flex items-center gap-7 whitespace-nowrap">
                    {m} <span className="size-1 rounded-full bg-trust/50" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ["< 60s", "average verification time"],
              ["90%", "cheaper than manual checks"],
              ["0", "raw records ever exposed"],
              ["1", "ID — yours for life"],
            ].map(([n, l], i) => (
              <Reveal key={l} delay={i * 80}>
                <div className="rounded-2xl border border-black/[0.06] bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgb(25_27_22/0.15)]">
                  <p className="text-4xl font-semibold tracking-tight text-trust">{n}</p>
                  <p className="mt-1.5 text-sm text-ink/55">{l}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="border-t border-black/[0.06]">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Three steps. Zero friction.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Mint your ID",
                d: "A candidate registers once and receives a unique Employability ID — a permanent, private key to their working identity. CV, career history, projects and verified earnings live behind it.",
              },
              {
                n: "02",
                t: "Set the rules",
                d: "Granular privacy switches let the candidate choose exactly which fields employers can see. Zero-knowledge fact proving answers yes/no questions without exposing the raw record.",
              },
              {
                n: "03",
                t: "Verify instantly",
                d: "An employer enters the ID and gets a clean verification profile — identity, career history, proven assertions and an aggregated Trust Score. No calls. No emails. No waiting.",
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="group h-full rounded-2xl border border-black/[0.06] bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-trust/30 hover:shadow-[0_16px_40px_-16px_rgb(11_110_79/0.2)]">
                  <span className="grid size-10 place-items-center rounded-xl bg-mint font-mono text-sm font-semibold text-trust transition-transform duration-300 group-hover:scale-110">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/60">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FACT PROVING ================= */}
      <section id="proof" className="invert-zone px-4 sm:px-6">
        <Reveal>
          <div className="relative z-0 mx-auto max-w-6xl overflow-hidden rounded-3xl bg-ink bg-grid-dark px-6 py-16 text-paper sm:px-12 sm:py-20">
            <div className="relative grid items-center gap-12 lg:grid-cols-2">
              <div>
                <Eyebrow dark>Zero-knowledge fact proving</Eyebrow>
                <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                  Ask.<br /><span className="accent-serif text-trust-light">Don&apos;t extract.</span>
                </h2>
                <p className="mt-5 max-w-md text-base leading-relaxed text-paper/65">
                  Traditional background checks hand over entire dossiers. Mopol answers the actual
                  question instead. <b className="text-paper">“Is this candidate above 21?”</b> — proven
                  against the sealed record, with a signed receipt. The exact date of birth never leaves
                  the vault.
                </p>
                <ul className="mt-8 space-y-3.5 text-sm text-paper/70">
                  {[
                    "Claim evaluated inside the vault",
                    "Boolean + signed receipt returned",
                    "Raw date of birth never transmitted",
                    "Candidate sets what is provable",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="grid size-5 place-items-center rounded-full bg-trust-light/15 text-trust-light">
                        <IconCheck className="size-3" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <ProofConsole employabilityId={DEMO_EMPLOYABILITY_ID} defaultMin={21} invert />
                <p className="mt-3 text-center text-xs text-paper/40">
                  live demo against candidate {DEMO_EMPLOYABILITY_ID} — try min age 30 to see a failed proof
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= TRUST ENGINE ================= */}
      <section id="trust">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>The trust engine</Eyebrow>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Trust, <span className="accent-serif text-gradient-animated">compounded.</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-ink/60">
                Past and current supervisors log structured remarks — performance ratings, word-keeping
                reliability, loan-free tenure confirmations. Mopol aggregates them into a single{" "}
                <b className="text-ink">Trust Score</b> that follows the candidate across their career.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "80% — mean performance rating across tenures",
                  "20% — share of tenures certified loan-free",
                ].map((t) => (
                  <p key={t} className="flex items-center gap-3 text-sm text-ink/60">
                    <span className="grid size-5 place-items-center rounded-full bg-mint text-trust"><IconBolt className="size-3" /></span>
                    {t}
                  </p>
                ))}
              </div>
            </Reveal>
            <Reveal delay={120}>
              <Card className="p-8 transition-all duration-300 hover:shadow-[0_16px_40px_-16px_rgb(25_27_22/0.15)]">
                <p className="mb-6 text-xs font-medium text-ink/45">Live example — {DEMO_EMPLOYABILITY_ID}</p>
                <TrustMeter score={92} label="EXCEPTIONAL" count={2} />
                <blockquote className="mt-7 border-t border-black/[0.05] pt-6 text-sm leading-relaxed text-ink/65">
                  “Amara repaid her equipment loan 4 months ahead of schedule. Impeccable word-keeping —
                  every commitment delivered on or before deadline.”
                  <footer className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-ink/50">Tunde Bello · Sterling Labs</span>
                    <RatingStars value={5} />
                  </footer>
                </blockquote>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= PRIVACY ================= */}
      <section className="border-t border-black/[0.06] bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <Reveal className="text-center">
            <Eyebrow>Candidate-owned privacy</Eyebrow>
            <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              The candidate holds <span className="accent-serif text-gradient-animated">the keys.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: IconEye, t: "Field-level switches", d: "Photo, headline, career, projects, earnings, CV, trust, remarks — each individually visible or sealed." },
              { icon: IconLock, t: "Sealed by default", d: "Exact date of birth and earnings start hidden. Facts are proven without exposure." },
              { icon: IconShield, t: "Proofs, not copies", d: "Employers receive signed assertions they can trust — never raw documents they must protect." },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 100}>
                <div className="h-full rounded-2xl border border-black/[0.06] bg-card p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgb(25_27_22/0.15)]">
                  <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-mint text-trust">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/60">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ROLES ================= */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-3xl border border-trust/15 bg-card p-10 transition-all duration-300 hover:shadow-[0_20px_50px_-20px_rgb(11_110_79/0.3)]">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-trust">For candidates</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">Own your <span className="accent-serif text-trust">story.</span></h3>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/65">
                  One ID for life. Host your CV, projects and verified earnings. Flip the switches on who
                  sees what. Collect Trust Score from every employer you impress.
                </p>
                <BtnLink href="/register" variant="trust" className="mt-8">
                  Create employee account <IconArrowRight />
                </BtnLink>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="relative z-0 h-full overflow-hidden rounded-3xl bg-ink bg-grid-dark p-10 text-paper transition-all duration-300 hover:shadow-[0_20px_50px_-20px_rgb(25_27_22/0.5)]">
                <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-trust-light">For employers</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">Stop screening. Start <span className="accent-serif text-trust-light">verifying.</span></h3>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/65">
                  Enter an Employability ID. Get a verified profile, proven assertions and a Trust Score in
                  under a minute — at a fraction of the cost of a manual background check.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <BtnLink href="/register" variant="invert">Create employer account</BtnLink>
                  <BtnLink href="/verify" variant="ghost" className="!text-paper/70 hover:!bg-white/10 hover:!text-paper">
                    Try as guest
                  </BtnLink>
                </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="relative z-0 mx-auto max-w-6xl overflow-hidden rounded-3xl border border-trust/15 bg-card px-6 py-16 text-center sm:px-12">
            <div className="relative">
            <AssembleCube className="mx-auto" />
            <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              The background check is <span className="accent-serif text-gradient-animated">dead.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-ink/65">
              Join the verification network that respects privacy and kills paperwork.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <BtnLink href="/register" variant="trust" className="!px-7 !py-3 !text-[15px]">
                Get started — free <IconArrowRight />
              </BtnLink>
              <BtnLink href="/verify" variant="outline" className="!px-7 !py-3 !text-[15px] !bg-transparent">
                Verify a candidate now
              </BtnLink>
            </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-black/[0.06] bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <Logo />
          <nav className="flex flex-wrap gap-6 text-sm text-ink/50">
            <Link href="/verify" className="transition-colors hover:text-ink">Verify</Link>
            <Link href="/login" className="transition-colors hover:text-ink">Sign in</Link>
            <Link href="/register" className="transition-colors hover:text-ink">Register</Link>
          </nav>
          <p className="text-xs text-ink/40">© 2026 Mopol · Verification as a Service</p>
        </div>
      </footer>
    </main>
  );
}
