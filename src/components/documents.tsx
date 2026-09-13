"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardHeader, IconFile, IconLock, IconSparkle, IconUpload } from "./ui";
import { api } from "./client";

interface DocItem {
  id: string;
  name: string;
  kind: "cv" | "certificate" | "other";
  ai_summary: string;
  skills: string[];
  has_text: boolean;
  created_at: string;
}

export function DocumentsCard() {
  const ref = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"cv" | "certificate" | "other">("cv");
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ documents: DocItem[] }>("/api/documents")
      .then((d) => {
        setDocs(d.documents);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function upload(file: File) {
    setBusy(true);
    setNote(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDocs((ds) => [data.document, ...ds]);
      if (data.warning) setNote(data.warning);
    } catch (err: any) {
      setNote(err.message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <span className="flex items-center gap-2">
          <IconLock className="size-4 text-trust" /> Sealed documents
        </span>
        <span>{docs.length} on file</span>
      </CardHeader>

      <div className="p-6 sm:p-7">
        <p className="text-sm leading-relaxed text-ink/55">
          The AI reads these to understand you and answer employer questions.{" "}
          <b className="text-ink">They never appear on your public profile.</b>
        </p>

        <input
          ref={ref}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <div className="flex overflow-hidden rounded-xl border border-ink/15">
            {(["cv", "certificate", "other"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`cursor-pointer px-3.5 py-2.5 text-xs font-semibold capitalize transition-colors duration-150 ${kind === k ? "bg-trust text-white" : "bg-white text-ink/55 hover:text-ink"}`}
              >
                {k === "cv" ? "CV / résumé" : k}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={busy}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink/25 px-4 text-sm font-medium text-ink/60 transition-all duration-200 hover:border-trust hover:text-trust disabled:opacity-50"
          >
            <IconUpload className="size-4" />
            {busy ? "AI is reading…" : "Upload document"}
          </button>
        </div>

        {note && <p className="mt-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{note}</p>}

        <div className="mt-5 space-y-3">
          {!loaded ? (
            <div className="skeleton h-20 rounded-xl" />
          ) : docs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink/20 px-4 py-6 text-center text-sm text-ink/45">
              No documents yet — upload your CV so the AI can vouch for you in screenings.
            </p>
          ) : (
            docs.map((d) => (
              <div key={d.id} className="rounded-xl border border-trust/20 bg-mint/40 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <IconFile className="size-4 shrink-0 text-trust" />
                  <span className="text-sm font-semibold">{d.name}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink/50 border border-black/[0.06]">
                    {d.kind}
                  </span>
                  {d.has_text && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-trust px-2 py-0.5 text-[10px] font-semibold text-white">
                      <IconSparkle className="size-2.5" /> AI read
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-ink/40">{new Date(d.created_at).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await api(`/api/documents?id=${d.id}`, { method: "DELETE" }).catch(() => {});
                      setDocs((ds) => ds.filter((x) => x.id !== d.id));
                    }}
                    className="cursor-pointer text-[11px] font-semibold text-danger hover:underline underline-offset-4"
                  >
                    Delete
                  </button>
                </div>
                {d.ai_summary && <p className="mt-2 text-xs leading-relaxed text-ink/65">{d.ai_summary}</p>}
                {d.skills.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {d.skills.slice(0, 10).map((s) => (
                      <span key={s} className="rounded-full border border-trust/20 bg-white px-2.5 py-0.5 text-[11px] font-medium text-trust">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
