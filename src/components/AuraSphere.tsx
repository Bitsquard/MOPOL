"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  AuraSphere — a choreographed 3D particle network in SVG.           */
/*                                                                     */
/*  The loop:                                                          */
/*    1. EXPAND  — particles explode outward, then snap back together  */
/*    2. SPIN    — 4 full anti-clockwise revolutions while the whole   */
/*       sphere somersaults upward once (the "goes round upwards")     */
/*    …then EXPAND again. Forever.                                     */
/*                                                                     */
/*  Runs on its own clock (pausable via the motion button).            */
/*  Fibonacci sphere → rotation → perspective projection, updated      */
/*  imperatively via rAF (no React re-renders per frame).              */
/* ------------------------------------------------------------------ */

const PARTICLES = 380;
const HUB_EVERY = 24; // every Nth particle is a glowing hub node
const SIZE = 560;
const C = SIZE / 2;
const RADIUS = 200;
const FOV = 3.2;

const EXPAND_MS = 3200; // explode + reassemble
const SPIN_MS = 4 * 1600; // exactly 4 turns
const EXPAND_AMT = 0.55; // max outward scale = 1 + this (stays in frame)

interface P3 {
  x: number;
  y: number;
  z: number;
}

function fibSphere(n: number): P3[] {
  const pts: P3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return pts;
}

const CHIPS = [
  { label: "AGE 21+ · PROVEN", r: "min(232px, 40vw)", t: "26s", rev: false, delay: "0s" },
  { label: "IDENTITY CONFIRMED", r: "min(258px, 45vw)", t: "34s", rev: true, delay: "-9s" },
  { label: "LOAN-FREE TENURE", r: "min(232px, 40vw)", t: "30s", rev: false, delay: "-14s" },
  { label: "TRUST 92 / 100", r: "min(258px, 45vw)", t: "38s", rev: true, delay: "-21s" },
];

export default function AuraSphere({ className = "" }: { className?: string }) {
  const dots = useMemo(() => fibSphere(PARTICLES), []);
  const hubs = useMemo(
    () => dots.map((_, i) => i).filter((i) => i % HUB_EVERY === 0),
    [dots]
  );
  const pairs = useMemo(() => {
    const ps: [number, number][] = [];
    hubs.forEach((h, i) => {
      ps.push([h, hubs[(i + 1) % hubs.length]]);
      if (i % 3 === 0) ps.push([h, hubs[(i + 5) % hubs.length]]);
    });
    return ps;
  }, [hubs]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<(SVGCircleElement | null)[]>([]);
  const halosRef = useRef<(SVGCircleElement | null)[]>([]);
  const linesRef = useRef<(SVGLineElement | null)[]>([]);
  const pointer = useRef({ tx: 0, ty: 0, x: 0, y: 0 });
  const runningRef = useRef(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let raf = 0;

    const sx = new Float32Array(dots.length);
    const sy = new Float32Array(dots.length);
    const sz = new Float32Array(dots.length);
    // stable per-particle variance so the explosion feels organic, not uniform
    const variance = new Float32Array(dots.length);
    for (let i = 0; i < dots.length; i++) variance[i] = 1 + 0.14 * Math.sin(i * 12.9898);

    // ---- choreography state (driven by a private, pausable clock) ----
    let last = performance.now();
    let clock = 0;
    let phase: "EXPAND" | "SPIN" = "EXPAND";
    let phaseStart = 0;
    let angle = 0.6;
    let angleStart = angle;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!runningRef.current) {
        last = now;
        return; // frozen — keep the loop alive but skip all state + paint work
      }

      const dt = Math.min(64, now - last); // clamp tab-switch jumps
      last = now;
      clock += dt;

      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.06; // buttery lerp toward pointer
      p.y += (p.ty - p.y) * 0.06;

      // ---- advance the phase machine ----
      if (phase === "EXPAND" && clock - phaseStart > EXPAND_MS) {
        phase = "SPIN";
        phaseStart = clock;
        angleStart = angle;
      } else if (phase === "SPIN" && clock - phaseStart > SPIN_MS) {
        phase = "EXPAND";
        phaseStart = clock;
      }

      let expandF = 1;
      let lineFade = 1;
      let tumble = 0;

      if (phase === "EXPAND") {
        const e = Math.min(1, (clock - phaseStart) / EXPAND_MS);
        const w = Math.sin(e * Math.PI); // 0 → 1 → 0 : outward then back together
        expandF = 1 + EXPAND_AMT * w;
        lineFade = 1 - 0.4 * w; // lines stay bold even mid-explosion
      } else {
        const s = Math.min(1, (clock - phaseStart) / SPIN_MS);
        angle = angleStart - s * 4 * Math.PI * 2; // 4 turns, anti-clockwise
        tumble = s * Math.PI * 2; // one full upward somersault across the 4 turns
      }

      const rot = angle + p.x * 0.5;
      const tilt = 0.42 + p.y * 0.22 + tumble;
      const cosA = Math.cos(rot),
        sinA = Math.sin(rot);
      const cosT = Math.cos(tilt),
        sinT = Math.sin(tilt);
      const t = clock / 1000;

      for (let i = 0; i < dots.length; i++) {
        const pt = dots[i];
        const f = expandF === 1 ? 1 : 1 + (expandF - 1) * variance[i]; // radial explosion
        const x1 = pt.x * f * cosA - pt.z * f * sinA;
        const z1 = pt.x * f * sinA + pt.z * f * cosA;
        const y2 = pt.y * f * cosT - z1 * sinT;
        const z2 = pt.y * f * sinT + z1 * cosT;
        const s = FOV / (FOV + z2);
        sx[i] = C + x1 * RADIUS * s;
        sy[i] = C + y2 * RADIUS * s;
        sz[i] = z2 / f; // keep depth perception stable while exploded

        const el = dotsRef.current[i];
        if (el) {
          const hub = i % HUB_EVERY === 0;
          const depth = 1 - (z2 / f + 1) / 2; // 1 = closest to viewer
          el.setAttribute("cx", sx[i].toFixed(1));
          el.setAttribute("cy", sy[i].toFixed(1));
          el.setAttribute("r", ((hub ? 3.8 : 1.9) * s).toFixed(2));
          el.setAttribute("opacity", hub ? "0.95" : (0.18 + 0.6 * Math.max(0, depth)).toFixed(2));
        }
      }

      hubs.forEach((h, hi) => {
        const halo = halosRef.current[hi];
        if (!halo) return;
        const depth = Math.max(0, 1 - (sz[h] + 1) / 2);
        const s = FOV / (FOV + sz[h]);
        const pulse = 0.55 + 0.45 * Math.sin(t * 2 + hi * 1.3);
        halo.setAttribute("cx", sx[h].toFixed(1));
        halo.setAttribute("cy", sy[h].toFixed(1));
        halo.setAttribute("r", (13 * s * expandF).toFixed(2));
        halo.setAttribute("opacity", (0.15 + 0.5 * depth * pulse).toFixed(2));
      });

      pairs.forEach(([a, b], li) => {
        const line = linesRef.current[li];
        if (!line) return;
        const depth = Math.max(0, 1 - (Math.max(sz[a], sz[b]) + 1) / 2);
        line.setAttribute("x1", sx[a].toFixed(1));
        line.setAttribute("y1", sy[a].toFixed(1));
        line.setAttribute("x2", sx[b].toFixed(1));
        line.setAttribute("y2", sy[b].toFixed(1));
        line.setAttribute("stroke-opacity", ((0.09 + 0.45 * depth) * lineFade).toFixed(2));
      });
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [dots, hubs, pairs]);

  return (
    <div
      ref={wrapRef}
      suppressHydrationWarning
      className={`relative ${className}`}
      onMouseMove={(e) => {
        const r = wrapRef.current?.getBoundingClientRect();
        if (!r) return;
        pointer.current.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        pointer.current.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      }}
      onMouseLeave={() => {
        pointer.current.tx = 0;
        pointer.current.ty = 0;
      }}
    >
      {/* ambient aura behind the sphere */}
      <div className="absolute left-1/2 top-1/2 -z-10 size-[75%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-trust/15 blur-3xl" aria-hidden />

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full"
        role="img"
        aria-label="Rotating network of verified identities"
      >
        <defs>
          <radialGradient id="aura-halo">
            <stop offset="0%" stopColor="#0C513F" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0C513F" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* network links */}
        {pairs.map((_, i) => (
          <line
            key={`l${i}`}
            ref={(el) => {
              linesRef.current[i] = el;
            }}
            stroke="#0C513F"
            strokeWidth={2.2}
          />
        ))}

        {/* hub halos */}
        {hubs.map((_, i) => (
          <circle
            key={`h${i}`}
            ref={(el) => {
              halosRef.current[i] = el;
            }}
            fill="url(#aura-halo)"
          />
        ))}

        {/* particles */}
        {dots.map((_, i) => (
          <circle
            key={`d${i}`}
            ref={(el) => {
              dotsRef.current[i] = el;
            }}
            fill={i % HUB_EVERY === 0 ? "#0C513F" : "#191B16"}
          />
        ))}
      </svg>

      {/* orbiting proof chips */}
      {CHIPS.map((c) => (
        <span
          key={c.label}
          className="orbit-chip"
          style={
            {
              "--orbit-r": c.r,
              "--orbit-t": c.t,
              animationDirection: c.rev ? "reverse" : "normal",
              animationDelay: c.delay,
              animationPlayState: paused ? "paused" : "running",
            } as React.CSSProperties
          }
        >
          <span className="orbit-chip-inner">{c.label}</span>
        </span>
      ))}

      {/* motion control — anyone who needs stillness can stop it */}
      <button
        type="button"
        aria-pressed={paused}
        aria-label={paused ? "Resume motion" : "Pause motion"}
        onClick={() => {
          runningRef.current = paused;
          setPaused(!paused);
        }}
        className="absolute bottom-2 right-2 z-10 inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/[0.08] bg-card/90 px-3.5 py-1.5 text-xs font-semibold text-ink/55 shadow-sm backdrop-blur transition-all duration-200 hover:text-ink hover:shadow active:scale-95"
      >
        {paused ? (
          <>
            <svg viewBox="0 0 24 24" className="size-3" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5-13-7.5Z" /></svg>
            Play
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="size-3" fill="currentColor" aria-hidden><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            Pause
          </>
        )}
      </button>
    </div>
  );
}
