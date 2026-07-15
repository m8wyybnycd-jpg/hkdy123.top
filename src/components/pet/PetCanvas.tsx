import { useEffect, useRef, useCallback } from "react";
import type { PetState } from "../../types/pet";

/**
 * PetCanvas — Canvas 2D sprite sheet renderer for the AI pet.
 * 
 * Uses a procedural pixel-art pet rendered directly on canvas (no external sprite sheet needed).
 * Each state has different animation frames drawn via simple shapes.
 * 
 * The pet is a cute round blob creature with eyes, ears, and expressions
 * that change based on state (idle, waving, jumping, etc.)
 */

interface PetCanvasProps {
  state: PetState;
  size: number; // canvas size in px
  level: number; // 1-7, affects appearance
  className?: string;
}

// ── Sprite frame configs ─────────────────────────────────

const STATE_CONFIG: Record<PetState, { frames: number; fps: number }> = {
  idle: { frames: 6, fps: 2 },
  waving: { frames: 4, fps: 4 },
  jumping: { frames: 5, fps: 6 },
  running: { frames: 6, fps: 8 },
  failed: { frames: 8, fps: 3 },
  waiting: { frames: 6, fps: 2 },
  review: { frames: 6, fps: 4 },
};

// ── Level colors (7-level temperature-drift: cool→warm→legendary) ──
// Designer spec: L1 青蓝 → L2 琥珀 → L3 靛蓝 → L4 天蓝 → L5 翠绿 → L6 金色 → L7 纯白

const LEVEL_BODY_COLORS = [
  '#06B6D4',  // L1 蛋    — 青蓝
  '#F59E0B',  // L2 幼崽  — 琥珀
  '#6366F1',  // L3 少年  — 靛蓝
  '#38BDF8',  // L4 青年  — 天蓝
  '#10B981',  // L5 成年  — 翠绿
  '#EAB308',  // L6 精英  — 金色
  '#FFFFFF',  // L7 传说  — 纯白
];

const LEVEL_GLOW_COLORS = [
  'rgba(6,182,212,0.3)',    // L1
  'rgba(245,158,11,0.3)',   // L2
  'rgba(99,102,241,0.3)',   // L3
  'rgba(56,189,248,0.35)',  // L4
  'rgba(16,185,129,0.35)',  // L5
  'rgba(234,179,8,0.4)',    // L6
  'rgba(255,255,255,0.45)', // L7
];

const LEVEL_ACCENT_COLORS = [
  null,        // L1 — no accent
  '#06B6D4',   // L2 — 青蓝斑点（双色）
  '#F59E0B',   // L3 — 琥珀点缀
  '#FFFFFF',   // L4 — 白色高亮核
  '#06B6D4',   // L5 — 青蓝光晕
  '#F59E0B',   // L6 — 金色装甲
  null,        // L7 — 全光谱（特殊处理）
];

export function PetCanvas({ state, size, level, className }: PetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, frame: number, currentState: PetState, currentLevel: number) => {
    const s = size;
    ctx.clearRect(0, 0, s, s);

    const bodyColor = LEVEL_BODY_COLORS[Math.min(currentLevel - 1, 6)];
    const glowColor = LEVEL_GLOW_COLORS[Math.min(currentLevel - 1, 6)];
    const accentColor = LEVEL_ACCENT_COLORS[Math.min(currentLevel - 1, 6)];

    // ── Level 1 (egg): draw an egg ──
    if (currentLevel === 1) {
      // Egg glow
      const glowGrad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      glowGrad.addColorStop(0, glowColor);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, s, s);

      // Egg body
      const wobble = Math.sin(frame * 0.5) * 2;
      ctx.save();
      ctx.translate(s / 2 + wobble, s * 0.55);
      
      const eggGrad = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.3);
      eggGrad.addColorStop(0, '#fef3c7');
      eggGrad.addColorStop(0.5, bodyColor);
      eggGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = eggGrad;
      
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.28, s * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      // Egg spots
      ctx.fillStyle = 'rgba(217, 119, 6, 0.3)';
      ctx.beginPath();
      ctx.arc(-s * 0.08, -s * 0.1, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.1, s * 0.05, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.05, -s * 0.2, s * 0.03, 0, Math.PI * 2);
      ctx.fill();

      // Crack lines appear at higher frames (hatching animation)
      if (currentState === 'jumping' && frame > 2) {
        ctx.strokeStyle = 'rgba(120, 53, 15, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.15);
        ctx.lineTo(-s * 0.03, -s * 0.05);
        ctx.lineTo(-s * 0.08, 0);
        ctx.lineTo(0, s * 0.08);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    // ── Level 2+: draw the blob creature ──
    const bounce = currentState === 'jumping' ? Math.abs(Math.sin(frame * 0.8)) * s * 0.12 : Math.sin(frame * 0.3) * s * 0.02;
    const bodyY = s * 0.5 - bounce;

    // Glow
    const glowGrad = ctx.createRadialGradient(s / 2, bodyY, 0, s / 2, bodyY, s * 0.5);
    glowGrad.addColorStop(0, glowColor);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, s, s);

    ctx.save();
    ctx.translate(s / 2, bodyY);

    // ── Ears ──
    ctx.fillStyle = bodyColor;
    const earOffset = currentState === 'waving' ? Math.sin(frame * 0.5) * 3 : 0;
    
    // Left ear
    ctx.beginPath();
    ctx.ellipse(-s * 0.2, -s * 0.25 + earOffset, s * 0.08, s * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.ellipse(s * 0.2, -s * 0.25 - earOffset, s * 0.08, s * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Inner ears
    ctx.fillStyle = 'rgba(255, 182, 193, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.2, -s * 0.23 + earOffset, s * 0.04, s * 0.06, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.2, -s * 0.23 - earOffset, s * 0.04, s * 0.06, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // ── Body (round blob) ──
    const bodyGrad = ctx.createRadialGradient(-s * 0.05, -s * 0.05, 0, 0, 0, s * 0.3);
    bodyGrad.addColorStop(0, lightenColor(bodyColor, 30));
    bodyGrad.addColorStop(1, bodyColor);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.28, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Eyes ──
    const eyeY = -s * 0.05;
    const eyeSpacing = s * 0.1;

    if (currentState === 'failed') {
      // X X eyes
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      drawX(ctx, -eyeSpacing, eyeY, s * 0.04);
      drawX(ctx, eyeSpacing, eyeY, s * 0.04);
    } else if (currentState === 'waiting') {
      // Closed eyes (line)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-eyeSpacing - s * 0.03, eyeY);
      ctx.lineTo(-eyeSpacing + s * 0.03, eyeY);
      ctx.moveTo(eyeSpacing - s * 0.03, eyeY);
      ctx.lineTo(eyeSpacing + s * 0.03, eyeY);
      ctx.stroke();
    } else if (currentState === 'review') {
      // Star eyes (^_^)
      ctx.fillStyle = '#1e293b';
      drawStarEye(ctx, -eyeSpacing, eyeY, s * 0.04);
      drawStarEye(ctx, eyeSpacing, eyeY, s * 0.04);
    } else {
      // Normal round eyes
      const blinkScale = (frame % 6 === 0 && currentState === 'idle') ? 0.1 : 1;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing, eyeY, s * 0.04, s * 0.04 * blinkScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(eyeSpacing, eyeY, s * 0.04, s * 0.04 * blinkScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye shine
      if (blinkScale > 0.5) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-eyeSpacing + s * 0.015, eyeY - s * 0.015, s * 0.015, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeSpacing + s * 0.015, eyeY - s * 0.015, s * 0.015, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Mouth ──
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    if (currentState === 'failed') {
      // Sad mouth (inverted U)
      ctx.arc(0, s * 0.08, s * 0.04, Math.PI, 0, true);
    } else if (currentState === 'waving' || currentState === 'review') {
      // Happy open mouth
      ctx.arc(0, s * 0.05, s * 0.04, 0, Math.PI);
    } else if (currentState === 'waiting') {
      // Small circle (o)
      ctx.arc(0, s * 0.06, s * 0.015, 0, Math.PI * 2);
    } else {
      // Default smile
      ctx.arc(0, s * 0.04, s * 0.03, 0.2, Math.PI - 0.2);
    }
    ctx.stroke();

    // ── Cheeks (blush) ──
    if (currentState !== 'failed') {
      ctx.fillStyle = 'rgba(255, 105, 180, 0.25)';
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, s * 0.03, s * 0.04, s * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 0.15, s * 0.03, s * 0.04, s * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Level-specific decorations (7-level temperature-drift) ──
    if (currentLevel >= 7) {
      // L7 传说: multilayer stardust + pure white core
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      drawSparkle(ctx, 0, -s * 0.42, s * 0.06);
      ctx.fillStyle = 'rgba(167,139,250,0.3)'; // low-sat purple ambient (< 0.12 opacity equivalent)
      drawSparkle(ctx, -s * 0.35, -s * 0.18, s * 0.035);
      drawSparkle(ctx, s * 0.35, -s * 0.18, s * 0.035);
      // Orbiting micro-particles
      for (let i = 0; i < 6; i++) {
        const angle = (frame * 0.02 + i * Math.PI / 3) % (Math.PI * 2);
        const r = s * 0.38;
        ctx.fillStyle = `hsla(${(frame * 2 + i * 60) % 360}, 40%, 80%, 0.5)`;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r * 0.6 - s * 0.05, s * 0.015, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (currentLevel >= 6) {
      // L6 精英: golden armor particles + trailing sparks
      ctx.fillStyle = '#EAB308';
      drawSparkle(ctx, 0, -s * 0.4, s * 0.05);
      // Angular armor particles
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + Math.PI / 4;
        const r = s * 0.32;
        ctx.fillStyle = 'rgba(234,179,8,0.5)';
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r - s * 0.05, s * 0.02, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (currentLevel >= 5) {
      // L5 成年: green halo ring
      ctx.strokeStyle = 'rgba(16,185,129,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.05, s * 0.35, s * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#10B981';
      drawSparkle(ctx, 0, -s * 0.38, s * 0.04);
    } else if (currentLevel >= 4) {
      // L4 青年: white core highlight
      if (accentColor) {
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(0, -s * 0.08, s * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#38BDF8';
      drawSparkle(ctx, s * 0.22, -s * 0.25, s * 0.025);
    } else if (currentLevel >= 3) {
      // L3 少年: small accent sparkle
      if (accentColor) {
        ctx.fillStyle = accentColor;
        drawSparkle(ctx, s * 0.18, -s * 0.28, s * 0.02);
      }
    } else if (currentLevel >= 2) {
      // L2 幼崽: dual-color spots (青蓝 on 琥珀 body)
      if (accentColor) {
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(-s * 0.12, -s * 0.02, s * 0.035, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s * 0.08, s * 0.08, s * 0.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── Waving arm ──
    if (currentState === 'waving') {
      const armAngle = Math.sin(frame * 0.5) * 0.5 + 0.3;
      ctx.save();
      ctx.translate(s * 0.25, -s * 0.05);
      ctx.rotate(armAngle);
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.06, s * 0.04, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }, [size]);

  // ── Animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const config = STATE_CONFIG[state];
    const frameInterval = 1000 / config.fps;

    const animate = (time: number) => {
      if (time - lastTimeRef.current >= frameInterval) {
        draw(ctx, frameRef.current, state, level);
        frameRef.current = (frameRef.current + 1) % config.frames;
        lastTimeRef.current = time;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    // Draw first frame immediately
    draw(ctx, 0, state, level);

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [state, level, size, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={className}
    />
  );
}

// ── Drawing helpers ──────────────────────────────────────

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0xff) + percent);
  const b = Math.min(255, (num & 0xff) + percent);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function drawX(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();
}

function drawStarEye(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.3, y - size * 0.3);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.3, y + size * 0.3);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.3, y + size * 0.3);
  ctx.lineTo(x - size, y);
  ctx.lineTo(x - size * 0.3, y - size * 0.3);
  ctx.closePath();
  ctx.fill();
}

export default PetCanvas;
