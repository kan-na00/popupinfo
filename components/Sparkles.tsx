"use client";

import { useEffect, useRef } from "react";

type P = {
  x: number;
  y: number;
  r: number;
  base: number; // 基本の明るさ
  phase: number; // 瞬きの位相
  tw: number; // 瞬き速度
  vx: number;
  vy: number;
  color: string;
};

const COLORS = ["#ffffff", "#ffd6e6", "#ffe6b0", "#e9d8ff", "#ffc2d6"];

export default function Sparkles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = ref.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!context) return;
    // 以降のクロージャでも非nullとして扱えるよう別名に固定
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = context;
    const parent = canvas.parentElement as HTMLElement;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: P[] = [];
    let raf = 0;

    function build() {
      const rect = parent.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 面積に応じて数を決める
      const count = Math.min(130, Math.max(36, Math.round((w * h) / 6500)));
      particles = Array.from({ length: count }, () => spawn(true));
    }

    function spawn(initial: boolean): P {
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : h + 10,
        r: 1.6 + Math.random() * 4,
        base: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        tw: 0.6 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -(0.12 + Math.random() * 0.4),
        color: COLORS[(Math.random() * COLORS.length) | 0],
      };
    }

    function sparkle(x: number, y: number, r: number, alpha: number, color: string) {
      const inner = r * 0.32;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const ox = x + Math.cos(a) * r;
        const oy = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        const a2 = a + Math.PI / 4;
        ctx.lineTo(x + Math.cos(a2) * inner, y + Math.sin(a2) * inner);
      }
      ctx.closePath();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.shadowColor = color;
      ctx.shadowBlur = r * 2.4;
      ctx.fillStyle = color;
      ctx.fill();
    }

    let t = 0;
    function frame() {
      ctx.clearRect(0, 0, w, h);
      t += 0.016;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -12 || p.x < -12 || p.x > w + 12) {
          particles[i] = spawn(false);
          continue;
        }
        const tw = (Math.sin(t * p.tw + p.phase) + 1) / 2; // 0..1
        sparkle(p.x, p.y, p.r, p.base * (0.25 + 0.75 * tw), p.color);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    }

    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) sparkle(p.x, p.y, p.r, p.base, p.color);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    build();
    if (reduce) {
      drawStatic();
    } else {
      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(() => {
      build();
      if (reduce) drawStatic();
    });
    ro.observe(parent);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="sparkles" aria-hidden="true" />;
}
