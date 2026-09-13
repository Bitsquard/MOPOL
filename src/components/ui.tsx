import Link from "next/link";
import React from "react";

/* ==================== Icons (stroke, 1.6px, consistent) ==================== */

type IconProps = { className?: string };
const ic = (path: React.ReactNode, viewBox = "0 0 24 24") =>
  function Icon({ className = "size-4" }: IconProps) {
    return (
      <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        {path}
      </svg>
    );
  };

export const IconCheck = ic(<><path d="M20 6 9 17l-5-5" /></>);
export const IconShield = ic(<><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>);
export const IconLock = ic(<><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>);
export const IconSearch = ic(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>);
export const IconArrowRight = ic(<><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>);
export const IconCopy = ic(<><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>);
export const IconUpload = ic(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></>);
export const IconFile = ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>);
export const IconBolt = ic(<><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" /></>);
export const IconEye = ic(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>);
export const IconUser = ic(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></>);
export const IconBuilding = ic(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 21v-4h6v4" /><path d="M8 7h2m4 0h2M8 11h2m4 0h2" /></>);
export const IconLogout = ic(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>);
export const IconSparkle = ic(<><path d="M12 3v3m0 12v3M5.6 5.6l2.2 2.2m8.4 8.4 2.2 2.2M3 12h3m12 0h3M5.6 18.4l2.2-2.2m8.4-8.4 2.2-2.2" /></>);

export function IconStar({ className = "size-4", filled = true }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden
      fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
      <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6Z" />
    </svg>
  );
}

/* ==================== Brand ==================== */

export function Logo({ invert = false, href = "/" }: { invert?: boolean; href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="Mopol home">
      <span className={`grid size-8 place-items-center rounded-lg text-sm font-bold shadow-sm transition-transform duration-200 group-hover:scale-105 ${invert ? "bg-white text-ink" : "bg-ink text-white"}`}>
        M
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Mopol</span>
    </Link>
  );
}

/* ==================== Eyebrow ==================== */

export function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
      dark ? "border-white/15 bg-white/5 text-white/70" : "border-trust/20 bg-mint text-trust"
    }`}>
      <span className={`size-1.5 rounded-full animate-pulse-dot ${dark ? "bg-trust-light" : "bg-trust"}`} />
      {children}
    </span>
  );
}

/* ==================== Buttons ==================== */

const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer select-none active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none";

type BtnVariant = "solid" | "outline" | "invert" | "trust" | "ghost";

const btnVariants: Record<BtnVariant, string> = {
  solid: "bg-ink text-white shadow-sm hover:bg-ink/85",
  trust: "bg-trust text-white shadow-[0_8px_30px_-6px_rgb(11_110_79/0.55)] hover:bg-trust-strong hover:shadow-[0_10px_36px_-6px_rgb(11_110_79/0.7)]",
  outline: "border border-ink/15 bg-card text-ink hover:border-ink/30 hover:bg-ink/[0.03]",
  invert: "bg-white text-ink shadow-sm hover:bg-white/85",
  ghost: "text-ink/60 hover:text-ink hover:bg-ink/[0.05]",
};

export function Btn({
  variant = "solid",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return <button className={`${btnBase} ${btnVariants[variant]} ${className}`} {...props} />;
}

export function BtnLink({
  variant = "solid",
  className = "",
  ...props
}: React.ComponentProps<typeof Link> & { variant?: BtnVariant }) {
  return <Link className={`${btnBase} ${btnVariants[variant]} ${className}`} {...props} />;
}

/* ==================== Forms ==================== */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink/70">{label}</span>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink/45">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-ink/15 bg-card px-4 py-3 text-sm text-ink transition-all duration-200 placeholder:text-ink/35 hover:border-ink/25 focus:border-trust focus:outline-none focus:ring-4 focus:ring-trust/15";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputCls} ${props.className ?? ""}`} {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputCls} min-h-28 resize-y ${props.className ?? ""}`} {...props} />;
}

/* ==================== Cards ==================== */

export function Card({
  children,
  className = "",
  invert = false,
}: {
  children: React.ReactNode;
  className?: string;
  invert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border ${
        invert
          ? "border-white/10 bg-ink text-paper"
          : "border-black/[0.06] bg-card shadow-[0_1px_2px_rgb(25_27_22/0.04)]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, invert = false }: { children: React.ReactNode; invert?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b px-6 py-4 text-sm font-semibold ${
        invert ? "border-white/10 [&>span:last-child]:font-normal [&>span:last-child]:text-paper/50" : "border-black/[0.05] [&>span:last-child]:font-normal [&>span:last-child]:text-ink/40 [&>span:last-child]:text-xs"
      }`}
    >
      {children}
    </div>
  );
}

/* ==================== Trust ==================== */

export function TrustMeter({ score, label, count }: { score: number; label: string; count: number }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <p className="leading-none">
          <span className="text-5xl font-semibold tracking-tight tabular-nums">{score}</span>
          <span className="ml-1 text-sm font-medium text-ink/40">/ 100</span>
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-trust/20 bg-mint px-3 py-1 text-xs font-semibold text-trust">
          <IconShield className="size-3.5" /> {label}
        </span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-ink/[0.07]">
        <div className="animate-bar h-full rounded-full bg-gradient-to-r from-trust to-trust-light" style={{ width: `${score}%` }} />
      </div>
      <p className="mt-3 text-xs text-ink/50">{count} employer remark{count === 1 ? "" : "s"} on file</p>
    </div>
  );
}

export function RatingStars({ value, invert = false }: { value: number; invert?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${invert ? "text-trust-light" : "text-trust"}`} aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <IconStar key={i} filled={i < value} className={`size-4 ${i < value ? "" : invert ? "text-white/20" : "text-ink/15"}`} />
      ))}
    </span>
  );
}

/* ==================== Badges ==================== */

export function VerifiedBadge({ children = "Verified" }: { children?: React.ReactNode }) {
  return (
    <span className="animate-pop inline-flex items-center gap-1.5 rounded-full border border-trust/20 bg-mint px-3 py-1 text-xs font-semibold text-trust">
      <IconCheck className="size-3.5" /> {children}
    </span>
  );
}

/* ==================== Redacted ==================== */

export function Redacted({ label = "Hidden by candidate" }: { label?: string }) {
  return (
    <div className="redacted flex min-h-20 items-center justify-center gap-2 px-4 py-4" role="note">
      <IconLock className="size-4 text-ink/35" />
      <span className="text-xs font-medium text-ink/40">{label}</span>
    </div>
  );
}

/* ==================== Avatar ==================== */

export function Monogram({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const cls = size === "lg" ? "size-24 text-2xl" : "size-12 text-sm";
  return (
    <span className={`grid ${cls} shrink-0 place-items-center rounded-full bg-mint font-semibold text-trust ring-4 ring-mint/50`}>
      {initials || "?"}
    </span>
  );
}
