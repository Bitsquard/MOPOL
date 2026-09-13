"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo, Btn, IconCheck, IconCopy, IconLogout, IconStar, IconUpload } from "./ui";

/* ==================== fetch helper ==================== */

export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed (${res.status})`);
  return data as T;
}

/* ==================== Scroll reveal ==================== */

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      suppressHydrationWarning
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ==================== Toggle (iOS-style) ==================== */

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex min-h-11 w-full cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 hover:bg-ink/[0.03]"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink/45">{description}</span>}
      </span>
      <span
        className={`relative h-6.5 w-11.5 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-trust" : "bg-ink/15"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5.5 rounded-full bg-white shadow transition-all duration-200 ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/* ==================== Copy button ==================== */

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-all duration-200 active:scale-95 ${
        done
          ? "border-trust/30 bg-mint text-trust"
          : "border-white/20 bg-white/10 text-paper hover:bg-white/20"
      }`}
    >
      {done ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
      {done ? "Copied" : label}
    </button>
  );
}

/* ==================== Rating input (stars) ==================== */

export function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Performance rating">
      {Array.from({ length: 5 }).map((_, i) => {
        const v = i + 1;
        const active = (hover || value) >= v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={`${v} of 5`}
            onClick={() => onChange(v)}
            onMouseEnter={() => setHover(v)}
            onMouseLeave={() => setHover(0)}
            className="grid size-11 cursor-pointer place-items-center rounded-lg transition-all duration-150 hover:bg-white/10 active:scale-90"
          >
            <IconStar className={`size-6 transition-colors duration-150 ${active ? "text-trust-light" : "text-white/20"}`} filled={active} />
          </button>
        );
      })}
    </div>
  );
}

/* ==================== File upload ==================== */

export function FileField({
  kind,
  label,
  current,
  onUploaded,
}: {
  kind: "photo" | "cv";
  label: string;
  current?: string | null;
  onUploaded: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept={kind === "photo" ? "image/*" : ".pdf,.doc,.docx,.txt,.md"}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", kind);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");
            onUploaded(data.url);
          } catch (err: any) {
            setError(err.message);
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = "";
          }
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink/25 px-4 text-sm font-medium text-ink/60 transition-all duration-200 hover:border-trust hover:text-trust disabled:opacity-50"
        >
          <IconUpload className="size-4" />
          {busy ? "Uploading…" : label}
        </button>
        {current && (
          <a href={current} target="_blank" rel="noreferrer" className="text-xs font-semibold text-trust hover:underline underline-offset-4">
            View current ↗
          </a>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/* ==================== Zero-knowledge proof console ==================== */

interface Proof {
  proof_id: string;
  protocol: string;
  employability_id: string;
  claim: string;
  result: boolean;
  hash: string;
  proved_at: string;
  disclosure: string;
}

export function ProofConsole({
  employabilityId,
  defaultMin = 21,
  invert = false,
}: {
  employabilityId: string;
  defaultMin?: number;
  invert?: boolean;
}) {
  const [minAge, setMinAge] = useState(String(defaultMin));
  const [maxAge, setMaxAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState<Proof | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shell = invert ? "border-white/10 bg-white/[0.04] text-paper" : "border-black/[0.06] bg-card text-ink shadow-[0_1px_2px_rgb(25_27_22/0.04)]";
  const innerInput = invert
    ? "border-white/15 bg-white/5 text-paper focus:border-trust-light focus:ring-trust-light/20"
    : "border-ink/15 bg-white text-ink focus:border-trust focus:ring-trust/15";
  const muted = invert ? "text-paper/50" : "text-ink/45";

  async function run() {
    setBusy(true);
    setError(null);
    setProof(null);
    const started = Date.now();
    try {
      const data = await api<{ proof: Proof }>("/api/prove", {
        method: "POST",
        body: JSON.stringify({
          employability_id: employabilityId,
          min_age: minAge ? Number(minAge) : undefined,
          max_age: maxAge ? Number(maxAge) : undefined,
        }),
      });
      const elapsed = Date.now() - started;
      if (elapsed < 900) await new Promise((r) => setTimeout(r, 900 - elapsed));
      setProof(data.proof);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`overflow-hidden rounded-2xl border ${shell}`}>
      <div className={`flex items-center justify-between border-b px-6 py-4 ${invert ? "border-white/10" : "border-black/[0.05]"}`}>
        <span className="text-sm font-semibold">Fact-Proof Console</span>
        <span className={`inline-flex items-center gap-2 text-xs font-medium ${invert ? "text-trust-light" : "text-trust"}`}>
          <span className={`size-1.5 rounded-full animate-pulse-dot ${invert ? "bg-trust-light" : "bg-trust"}`} />
          ZK-1 · Live
        </span>
      </div>

      <div className="space-y-5 p-6">
        <p className={`text-sm leading-relaxed ${invert ? "text-paper/70" : "text-ink/60"}`}>
          Ask a yes/no question about this candidate&apos;s sealed age record. The vault answers with a
          signed receipt — the exact date of birth is never revealed.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className={`mb-1.5 block text-xs font-medium ${muted}`}>Min age</span>
            <input
              type="number"
              min={0}
              max={120}
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              aria-label="Minimum age"
              className={`w-24 rounded-xl border px-3.5 py-2.5 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-4 ${innerInput}`}
            />
          </div>
          <div>
            <span className={`mb-1.5 block text-xs font-medium ${muted}`}>Max age <span className="opacity-60">(optional)</span></span>
            <input
              type="number"
              min={0}
              max={120}
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              placeholder="—"
              aria-label="Maximum age"
              className={`w-24 rounded-xl border px-3.5 py-2.5 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-4 ${innerInput}`}
            />
          </div>
          <button
            type="button"
            onClick={run}
            disabled={busy || (!minAge && !maxAge)}
            className={`min-h-11 cursor-pointer rounded-xl px-5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-45 ${
              invert
                ? "bg-trust-light text-ink hover:bg-trust-light/85"
                : "bg-trust text-white shadow-[0_4px_14px_-4px_rgb(11_110_79/0.5)] hover:bg-trust-strong"
            }`}
          >
            {busy ? "Proving…" : "Run proof"}
          </button>
        </div>

        {/* output window */}
        <div className={`relative min-h-36 overflow-hidden rounded-xl border p-5 font-mono text-xs ${invert ? "border-white/10 bg-black/20" : "border-black/[0.06] bg-ink/[0.02]"}`}>
          {busy && (
            <div className="relative overflow-hidden" aria-live="polite">
              <div className={`scanline absolute inset-x-0 h-10 rounded ${invert ? "bg-trust-light/10" : "bg-trust/10"}`} aria-hidden />
              <div className="space-y-2.5 py-1">
                <div className="skeleton h-3 w-2/3 rounded-full" />
                <div className="skeleton h-3 w-1/2 rounded-full" />
                <div className="skeleton h-3 w-3/5 rounded-full" />
                <p className={`pt-1 ${muted}`}>evaluating sealed record<span className="animate-blink">…</span></p>
              </div>
            </div>
          )}

          {!busy && error && (
            <p role="alert" className="font-sans text-sm font-medium text-danger">{error}</p>
          )}

          {!busy && !error && !proof && (
            <p className={muted}>&gt; awaiting query<span className="animate-blink">_</span></p>
          )}

          {!busy && proof && (
            <div aria-live="polite" className="animate-fade-up">
              <span
                className={`animate-pop mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-xs font-semibold ${
                  proof.result
                    ? invert
                      ? "bg-trust-light/15 text-trust-light border border-trust-light/30"
                      : "bg-mint text-trust border border-trust/20"
                    : invert
                      ? "border border-white/20 text-paper/60"
                      : "border border-ink/15 text-ink/50"
                }`}
              >
                {proof.result ? <><IconCheck className="size-3.5" /> Proof valid</> : "Proof failed"}
              </span>
              <dl className="space-y-1.5 break-all leading-relaxed">
                <div><dt className={`inline ${muted}`}>claim&nbsp;&nbsp;&nbsp;&nbsp;·&nbsp;</dt><dd className="inline">candidate {proof.claim} → <b>{String(proof.result).toUpperCase()}</b></dd></div>
                <div><dt className={`inline ${muted}`}>subject&nbsp;&nbsp;&nbsp;·&nbsp;</dt><dd className="inline">{proof.employability_id}</dd></div>
                <div><dt className={`inline ${muted}`}>receipt&nbsp;&nbsp;&nbsp;·&nbsp;</dt><dd className="inline">{proof.hash}</dd></div>
                <div><dt className={`inline ${muted}`}>proved&nbsp;&nbsp;&nbsp;&nbsp;·&nbsp;</dt><dd className="inline">{new Date(proof.proved_at).toLocaleString()}</dd></div>
                <div><dt className={`inline ${muted}`}>disclosed&nbsp;·&nbsp;</dt><dd className="inline">{proof.disclosure}</dd></div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== Dashboard nav ==================== */

export function DashboardNav({
  name,
  role,
  right,
}: {
  name: string;
  role: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          {right}
          <div className="flex items-center gap-2.5 rounded-full border border-black/[0.06] bg-card py-1 pl-1 pr-4 shadow-sm">
            <span className="grid size-8 place-items-center rounded-full bg-mint text-xs font-semibold text-trust">{initials || "?"}</span>
            <span className="hidden sm:block">
              <span className="block text-xs font-semibold leading-tight">{name}</span>
              <span className="block text-[11px] leading-tight text-ink/45">{role}</span>
            </span>
          </div>
          <Btn
            variant="ghost"
            className="!min-h-9 !px-3"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/");
              router.refresh();
            }}
            aria-label="Log out"
          >
            <IconLogout className="size-4" />
            <span className="hidden sm:inline">{busy ? "…" : "Log out"}</span>
          </Btn>
        </div>
      </div>
    </header>
  );
}
