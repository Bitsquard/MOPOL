"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Btn, Card, CardHeader, IconCheck, IconLock, IconSparkle, IconShield, IconArrowRight } from "./ui";
import { api } from "./client";

/* ==================== 50-point requirements screening ==================== */

interface CatalogItem {
  id: string;
  label: string;
  cat: string;
}

interface CheckResult {
  id: string;
  label: string;
  cat: string;
  status: "met" | "not_met" | "unknown" | "sealed";
  evidence: string;
}

function StatusChip({ status }: { status: CheckResult["status"] }) {
  if (status === "met")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-trust px-2.5 py-0.5 text-[11px] font-semibold text-white">
        <IconCheck className="size-3" /> Met
      </span>
    );
  if (status === "not_met")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-danger/30 bg-danger-soft px-2.5 py-0.5 text-[11px] font-semibold text-danger">
        Not met
      </span>
    );
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-ink/25 px-2.5 py-0.5 text-[11px] font-medium text-ink/45">
      <IconLock className="size-3" /> Not evidenced
    </span>
  );
}

export function RequirementsPanel({ employabilityId }: { employabilityId: string }) {
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{
    results: CheckResult[];
    custom_result: { answer: string; backend: string } | null;
    summary: { total: number; met: number; not_met: number; unknown: number };
  } | null>(null);

  useEffect(() => {
    api<{ requirements: CatalogItem[] }>("/api/requirements")
      .then((d) => setCatalog(d.requirements))
      .catch((e) => setError(e.message));
  }, []);

  const cats = useMemo(() => {
    const m = new Map<string, CatalogItem[]>();
    for (const r of catalog ?? []) {
      if (!m.has(r.cat)) m.set(r.cat, []);
      m.get(r.cat)!.push(r);
    }
    return [...m.entries()];
  }, [catalog]);

  function toggle(id: string) {
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleCat(items: CatalogItem[]) {
    setChecked((s) => {
      const n = new Set(s);
      const allOn = items.every((i) => n.has(i.id));
      for (const i of items) {
        if (allOn) n.delete(i.id);
        else n.add(i.id);
      }
      return n;
    });
  }

  async function run() {
    setBusy(true);
    setError(null);
    setOut(null);
    try {
      const data = await api<NonNullable<typeof out>>("/api/requirements/check", {
        method: "POST",
        body: JSON.stringify({ employability_id: employabilityId, ids: [...checked], custom: custom || undefined }),
      });
      setOut(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <span className="flex items-center gap-2"><IconShield className="size-4 text-trust" /> Screening requirements</span>
        <span>{checked.size > 0 ? `${checked.size} selected` : "pick what matters"}</span>
      </CardHeader>

      <div className="p-6 sm:p-8">
        {error && !catalog ? (
          <p className="text-sm text-ink/45">{error}</p>
        ) : !catalog ? (
          <div className="space-y-3">
            <div className="skeleton h-10 rounded-xl" />
            <div className="skeleton h-10 rounded-xl" />
            <div className="skeleton h-10 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {cats.map(([cat, items]) => (
                <div key={cat}>
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">{cat}</p>
                    <button
                      type="button"
                      onClick={() => toggleCat(items)}
                      className="cursor-pointer text-xs font-semibold text-trust hover:underline underline-offset-4"
                    >
                      {items.every((i) => checked.has(i.id)) ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {items.map((i) => {
                      const on = checked.has(i.id);
                      return (
                        <button
                          key={i.id}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => toggle(i.id)}
                          className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all duration-150 active:scale-[0.99] ${
                            on ? "border-trust bg-mint/50 font-medium" : "border-black/[0.08] bg-white hover:border-ink/25"
                          }`}
                        >
                          <span className={`grid size-4.5 shrink-0 place-items-center rounded-md border transition-colors duration-150 ${on ? "border-trust bg-trust text-white" : "border-ink/25"}`}>
                            {on && <IconCheck className="size-3" />}
                          </span>
                          {i.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* custom requirement */}
            <div className="mt-6">
              <span className="mb-1.5 block text-sm font-medium text-ink/70">…or paste your own requirement</span>
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                rows={2}
                placeholder="e.g. Must have 3+ years managing payment infrastructure and be based in Lagos."
                className="w-full resize-y rounded-xl border border-ink/15 bg-card px-4 py-3 text-sm transition-all duration-200 placeholder:text-ink/35 hover:border-ink/25 focus:border-trust focus:outline-none focus:ring-4 focus:ring-trust/15"
              />
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <Btn variant="trust" onClick={run} disabled={busy || (checked.size === 0 && !custom.trim())}>
                {busy ? "Screening…" : `Run screening ${checked.size > 0 ? `(${checked.size}${custom.trim() ? "+1" : ""})` : ""}`}
              </Btn>
              {out && (
                <p className="text-sm text-ink/55">
                  <b className="text-trust">{out.summary.met}</b> met · <b>{out.summary.not_met}</b> not met · <b>{out.summary.unknown}</b> not evidenced
                </p>
              )}
            </div>

            {/* results */}
            {out && (
              <div className="animate-fade-up mt-6 space-y-2 border-t border-black/[0.05] pt-6">
                {out.results.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-4 rounded-xl border border-black/[0.06] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="mt-0.5 text-xs text-ink/45">{r.evidence}</p>
                    </div>
                    <StatusChip status={r.status} />
                  </div>
                ))}
                {out.custom_result && (
                  <div className="rounded-xl border border-trust/25 bg-mint/40 p-5">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-trust">
                      <IconSparkle className="size-3.5" /> Custom requirement — AI verdict
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink/75">{out.custom_result.answer}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

/* ==================== AI Q&A about the candidate ==================== */

interface QA {
  q: string;
  a: string;
  backend: string;
  sources: number;
}

const SUGGESTED = [
  "Does this candidate have fintech experience?",
  "Are they open to remote work?",
  "What is their education background?",
  "Have they ever led a team?",
];

export function AskPanel({ employabilityId }: { employabilityId: string }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QA[]>([]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ answer: string; backend: string; sources: number }>("/api/ai/ask", {
        method: "POST",
        body: JSON.stringify({ employability_id: employabilityId, question }),
      });
      setHistory((h) => [{ q: question, a: data.answer, backend: data.backend, sources: data.sources }, ...h]);
      setQ("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <span className="flex items-center gap-2"><IconSparkle className="size-4 text-trust" /> Ask the AI about this candidate</span>
        <span>documents stay sealed</span>
      </CardHeader>

      <div className="p-6 sm:p-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
          className="flex flex-col gap-2.5 sm:flex-row"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask anything — experience, skills, availability, education…"
            aria-label="Ask the AI about this candidate"
            className="min-h-12 flex-1 rounded-xl border border-ink/15 bg-card px-4 text-sm transition-all duration-200 placeholder:text-ink/35 hover:border-ink/25 focus:border-trust focus:outline-none focus:ring-4 focus:ring-trust/15"
          />
          <Btn type="submit" variant="trust" disabled={busy || q.trim().length < 4}>
            {busy ? "Thinking…" : "Ask"} <IconArrowRight className="size-4" />
          </Btn>
        </form>

        {history.length === 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                disabled={busy}
                className="cursor-pointer rounded-full border border-trust/25 bg-mint/50 px-3.5 py-1.5 text-xs font-medium text-trust transition-all duration-150 hover:bg-mint disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>
        )}

        <div className="mt-5 space-y-4">
          {history.map((item, i) => (
            <div key={i} className={i === 0 ? "animate-fade-up" : ""}>
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-trust px-4 py-2.5 text-sm font-medium text-white">{item.q}</p>
              </div>
              <div className="mt-2 flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-black/[0.06] bg-white px-4 py-3">
                  <p className="text-sm leading-relaxed text-ink/80">{item.a}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink/40">
                    <IconSparkle className="size-3 text-trust" />
                    Mopol AI · grounded in {item.sources} sealed document{item.sources === 1 ? "" : "s"} · {item.backend}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-black/[0.05] pt-4 text-[11px] leading-relaxed text-ink/40">
          The AI reads this candidate&apos;s sealed documents to answer. Raw documents are never displayed,
          and every question is logged in the audit trail.
        </p>
      </div>
    </Card>
  );
}
