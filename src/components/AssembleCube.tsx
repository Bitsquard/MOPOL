"use client";

import React from "react";

/* ------------------------------------------------------------------ */
/*  AssembleCube — 8 glowing mini-cubes that explode apart and snap    */
/*  back together into one cube, on a slow 3D turntable. Pure CSS 3D.  */
/* ------------------------------------------------------------------ */

const POS: [number, number, number][] = [
  [-1, -1, -1],
  [1, -1, -1],
  [-1, 1, -1],
  [1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [-1, 1, 1],
  [1, 1, 1],
];
const U = 19; // half-spacing of the 2×2×2 block

export default function AssembleCube({ className = "" }: { className?: string }) {
  return (
    <div className={`cube-scene ${className}`} aria-hidden>
      <div className="cube-rotor">
        {POS.map(([x, y, z], i) => (
          <span
            key={i}
            className="mini-cube"
            style={
              {
                "--x": `${x * U}px`,
                "--y": `${y * U}px`,
                "--z": `${z * U}px`,
                "--d": `${i * 0.12}s`,
              } as React.CSSProperties
            }
          >
            <span className="cube-face cube-face-front" />
            <span className="cube-face cube-face-top" />
            <span className="cube-face cube-face-left" />
          </span>
        ))}
      </div>
    </div>
  );
}
