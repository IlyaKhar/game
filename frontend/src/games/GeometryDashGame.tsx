import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { sfx } from '../lib/sound';

interface GeometryDashGameProps {
  onGameOver: (score: number) => void;
  bestScore: number;
  isNewRecord: boolean;
}

interface Hazard {
  x: number;
  w: number;
  h: number;
  kind: 'spike' | 'block' | 'pad';
  yOffset: number;
}

export const GeometryDashGame: React.FC<GeometryDashGameProps> = ({
  onGameOver,
  bestScore,
  isNewRecord,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [sessionId, setSessionId] = useState(0);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 900;
    const H = 440;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const groundY = 354;
    const size = 40;
    const cube = {
      x: 160,
      y: groundY - size,
      vy: 0,
      angle: 0,
      onGround: true,
    };

    let holdingJump = false;
    let speed = 410;
    let distance = 0;
    let spawnTimer = 0.7;
    let dead = false;
    let lastTs = performance.now();

    const hazards: Hazard[] = [];
    const trail: { x: number; y: number; alpha: number }[] = [];

    const setHold = (val: boolean) => {
      holdingJump = val;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (dead) {
          setGameOver(false);
          setScore(0);
          setSessionId((s) => s + 1);
          return;
        }
        setHold(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') setHold(false);
    };
    const onPointerDown = () => setHold(true);
    const onPointerUp = () => setHold(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    let rafId = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (!dead) {
        speed = Math.min(720, 410 + distance * 0.06);
        distance += speed * dt * 0.16;
        const pts = Math.floor(distance);
        setScore(pts);

        if (holdingJump && cube.onGround) {
          cube.vy = -670;
          cube.onGround = false;
          sfx.jump();
        }

        cube.vy += 2100 * dt;
        cube.y += cube.vy * dt;

        if (!cube.onGround) {
          cube.angle += dt * 7.2;
        } else {
          cube.angle = Math.round(cube.angle / (Math.PI / 2)) * (Math.PI / 2);
        }

        // Default ground clamp
        let landed = false;
        if (cube.y + size >= groundY) {
          cube.y = groundY - size;
          cube.vy = 0;
          landed = true;
        }

        // Trail
        trail.push({ x: cube.x + 6, y: cube.y + size / 2, alpha: 0.75 });
        for (let i = trail.length - 1; i >= 0; i--) {
          trail[i]!.x -= speed * dt;
          trail[i]!.alpha -= dt * 2.4;
          if (trail[i]!.alpha <= 0) trail.splice(i, 1);
        }

        // Spawn patterns
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          const r = Math.random();
          if (r < 0.42) {
            // Single or double spike
            const count = Math.random() < 0.45 && pts > 80 ? 2 : 1;
            for (let k = 0; k < count; k++) {
              hazards.push({ x: W + 40 + k * 34, w: 34, h: 38, kind: 'spike', yOffset: 0 });
            }
          } else if (r < 0.78) {
            // Platform block + optional spike after
            hazards.push({ x: W + 40, w: 68, h: 42, kind: 'block', yOffset: 0 });
            if (Math.random() < 0.5) {
              hazards.push({ x: W + 165, w: 34, h: 38, kind: 'spike', yOffset: 0 });
            }
          } else {
            // Jump pad before tall spike
            hazards.push({ x: W + 40, w: 36, h: 12, kind: 'pad', yOffset: 0 });
            hazards.push({ x: W + 195, w: 42, h: 52, kind: 'spike', yOffset: 0 });
          }
          spawnTimer = Math.max(0.68, 1.25 - speed / 1200) + Math.random() * 0.45;
        }

        // Collisions
        for (let i = hazards.length - 1; i >= 0; i--) {
          const hz = hazards[i]!;
          hz.x -= speed * dt;
          const hzTop = groundY - hz.h - hz.yOffset;

          if (hz.kind === 'pad') {
            if (
              cube.x + size > hz.x &&
              cube.x < hz.x + hz.w &&
              cube.y + size >= hzTop - 4 &&
              cube.y + size <= groundY + 4
            ) {
              cube.vy = -860;
              cube.onGround = false;
              landed = false;
              sfx.clear();
            }
          } else if (hz.kind === 'block') {
            if (cube.x + size - 6 > hz.x && cube.x + 6 < hz.x + hz.w) {
              // Landing on top of block
              if (cube.y + size >= hzTop && cube.y + size <= hzTop + 22 && cube.vy >= 0) {
                cube.y = hzTop - size;
                cube.vy = 0;
                landed = true;
              } else if (cube.y + size > hzTop + 12 && cube.y < hzTop + hz.h) {
                dead = true;
              }
            }
          } else {
            // Spike forgiving hitbox
            const pad = 10;
            if (
              cube.x + size - pad > hz.x + 6 &&
              cube.x + pad < hz.x + hz.w - 6 &&
              cube.y + size - 4 > hzTop + 8 &&
              cube.y + pad < hzTop + hz.h
            ) {
              dead = true;
            }
          }

          if (dead) {
            sfx.hit();
            setGameOver(true);
            onGameOverRef.current(pts);
            break;
          }
          if (hz.x + hz.w < -60) hazards.splice(i, 1);
        }

        cube.onGround = landed;
      }

      // Draw Background
      const pulse = Math.sin(now * 0.006) * 0.5 + 0.5;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#140c38');
      bg.addColorStop(1, `rgba(${Math.round(70 + pulse * 40)}, 16, 98, 1)`);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Background grid
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.14)';
      ctx.lineWidth = 1;
      const bgShift = (distance * 2.5) % 60;
      for (let x = -60; x < W + 60; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x - bgShift, 0);
        ctx.lineTo(x - bgShift, groundY);
        ctx.stroke();
      }

      // Floor
      ctx.fillStyle = '#0f0524';
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();

      // Trail
      for (const tr of trail) {
        ctx.fillStyle = `rgba(253, 224, 71, ${tr.alpha * 0.55})`;
        ctx.fillRect(tr.x - 5, tr.y - 5, 10, 10);
      }

      // Hazards
      for (const hz of hazards) {
        const hzTop = groundY - hz.h - hz.yOffset;
        if (hz.kind === 'spike') {
          ctx.fillStyle = '#4c1d95';
          ctx.strokeStyle = '#f472b6';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(hz.x, hzTop + hz.h);
          ctx.lineTo(hz.x + hz.w / 2, hzTop);
          ctx.lineTo(hz.x + hz.w, hzTop + hz.h);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (hz.kind === 'block') {
          ctx.fillStyle = '#312e81';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.fillRect(hz.x, hzTop, hz.w, hz.h);
          ctx.strokeRect(hz.x, hzTop, hz.w, hz.h);
        } else {
          ctx.fillStyle = '#fde047';
          ctx.fillRect(hz.x, hzTop, hz.w, hz.h);
        }
      }

      // Angry Golden Cube
      ctx.save();
      ctx.translate(cube.x + size / 2, cube.y + size / 2);
      ctx.rotate(cube.angle);
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, 5);
      ctx.fill();
      ctx.stroke();
      // Eyes & Mouth
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-11, -8, 7, 7);
      ctx.fillRect(4, -8, 7, 7);
      ctx.fillRect(-10, 5, 20, 6);
      ctx.restore();

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [sessionId]);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center p-2 sm:p-4">
      <div className="mb-2 flex w-full max-w-[900px] items-center justify-between px-2">
        <span className="text-xs text-fuchsia-200">Удерживай Пробел / Клик для непрерывных прыжков</span>
        <span className="font-display text-xl font-black italic text-amber-300 tabular-nums">{score}</span>
      </div>

      <div className="relative w-full max-w-[900px] overflow-hidden rounded-2xl border border-fuchsia-400/40">
        <canvas ref={canvasRef} className="block aspect-[900/440] w-full cursor-pointer touch-none select-none" />

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#110424]/85 p-6 text-center backdrop-blur-sm">
            {isNewRecord && (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 px-3 py-1 text-xs font-black text-amber-300 uppercase">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Новый рекорд!
              </div>
            )}
            <h2 className="font-display text-3xl font-black italic text-white uppercase">Попытка завершена!</h2>
            <p className="mt-1 text-sm text-fuchsia-200">
              Счёт: <span className="font-display text-lg font-black text-amber-300">{score}</span> (Лучший:{' '}
              {Math.max(bestScore, score)})
            </p>
            <button
              type="button"
              onClick={() => {
                setGameOver(false);
                setScore(0);
                setSessionId((s) => s + 1);
              }}
              className="font-display mt-5 flex min-h-[46px] items-center gap-2 rounded-full bg-gradient-to-r from-[#ff2e93] to-[#a855f7] px-6 py-2.5 text-sm font-black italic text-white uppercase"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Снова (Пробел)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

