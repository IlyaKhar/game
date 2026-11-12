import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { sfx } from '../lib/sound';

interface DinoGameProps {
  onGameOver: (score: number) => void;
  bestScore: number;
  isNewRecord: boolean;
}

interface Obstacle {
  x: number;
  w: number;
  h: number;
  kind: 'cactus' | 'ptero';
  yOffset: number;
}

interface Coin {
  x: number;
  y: number;
  r: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export const DinoGame: React.FC<DinoGameProps> = ({ onGameOver, bestScore, isNewRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [liveScore, setLiveScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
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

    const groundY = 358;
    const dino = {
      x: 110,
      y: groundY - 58,
      w: 48,
      h: 58,
      vy: 0,
      jumpsLeft: 2,
      ducking: false,
      runFrame: 0,
    };

    let speed = 360;
    let distance = 0;
    let bonus = 0;
    let spawnTimer = 0.8;
    let coinTimer = 1.6;
    let dead = false;
    let lastTs = performance.now();

    const obstacles: Obstacle[] = [];
    const coins: Coin[] = [];
    const particles: Particle[] = [];

    const spawnParticles = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 180,
          vy: -Math.random() * 160 - 30,
          life: 0.45 + Math.random() * 0.25,
          color,
        });
      }
    };

    const jump = () => {
      if (dead) return;
      if (dino.jumpsLeft > 0) {
        dino.vy = dino.jumpsLeft === 2 ? -640 : -560;
        dino.jumpsLeft -= 1;
        dino.ducking = false;
        sfx.jump();
        spawnParticles(dino.x + 20, dino.y + dino.h, '#f472b6', 6);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (dead) {
          setGameOver(false);
          setLiveScore(0);
          setSessionId((s) => s + 1);
          return;
        }
        jump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        dino.ducking = true;
        if (dino.y + dino.h < groundY) {
          dino.vy = Math.max(dino.vy, 520);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        dino.ducking = false;
      }
    };

    const onPointerDown = () => {
      if (!dead) jump();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);

    let rafId = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (!dead) {
        speed = Math.min(820, 360 + distance * 0.055);
        distance += speed * dt * 0.14;
        const currentScore = Math.floor(distance) + bonus;
        setLiveScore(currentScore);

        dino.runFrame += dt * (speed * 0.032);
        const targetH = dino.ducking ? 34 : 58;
        if (dino.h !== targetH) {
          dino.y += dino.h - targetH;
          dino.h = targetH;
        }

        dino.vy += 1750 * dt;
        dino.y += dino.vy * dt;
        if (dino.y + dino.h >= groundY) {
          dino.y = groundY - dino.h;
          dino.vy = 0;
          dino.jumpsLeft = 2;
        }

        // Spawn obstacles
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          const canPtero = currentScore > 160 && Math.random() < 0.32;
          if (canPtero) {
            const high = Math.random() < 0.55;
            obstacles.push({
              x: W + 40,
              w: 46,
              h: 28,
              kind: 'ptero',
              yOffset: high ? 56 : 18,
            });
          } else {
            const cluster = Math.random() < 0.38 ? 2 : 1;
            const h = 42 + Math.random() * 26;
            obstacles.push({
              x: W + 40,
              w: cluster === 2 ? 48 : 26,
              h,
              kind: 'cactus',
              yOffset: 0,
            });
          }
          const minGap = Math.max(0.62, 1.35 - speed / 950);
          spawnTimer = minGap + Math.random() * 0.75;
        }

        // Spawn bonus neon coins
        coinTimer -= dt;
        if (coinTimer <= 0) {
          coins.push({
            x: W + 40,
            y: groundY - (Math.random() < 0.5 ? 45 : 118),
            r: 12,
            collected: false,
          });
          coinTimer = 1.4 + Math.random() * 1.8;
        }

        // Update obstacles & check collisions
        for (let i = obstacles.length - 1; i >= 0; i--) {
          const ob = obstacles[i]!;
          ob.x -= speed * dt;
          const obTop = groundY - ob.h - ob.yOffset;
          const pad = 7;
          if (
            dino.x + pad < ob.x + ob.w - pad &&
            dino.x + dino.w - pad > ob.x + pad &&
            dino.y + pad < obTop + ob.h - pad &&
            dino.y + dino.h - pad > obTop + pad
          ) {
            dead = true;
            sfx.hit();
            spawnParticles(dino.x + dino.w / 2, dino.y + dino.h / 2, '#fb7185', 18);
            setFinalScore(currentScore);
            setGameOver(true);
            onGameOverRef.current(currentScore);
          }
          if (ob.x + ob.w < -40) obstacles.splice(i, 1);
        }

        // Update coins
        for (let i = coins.length - 1; i >= 0; i--) {
          const c = coins[i]!;
          c.x -= speed * dt;
          if (!c.collected) {
            const cx = dino.x + dino.w / 2;
            const cy = dino.y + dino.h / 2;
            const dx = cx - c.x;
            const dy = cy - c.y;
            if (dx * dx + dy * dy < (c.r + 24) * (c.r + 24)) {
              c.collected = true;
              bonus += 25;
              sfx.coin();
              spawnParticles(c.x, c.y, '#fde047', 10);
            }
          }
          if (c.x < -30 || c.collected) coins.splice(i, 1);
        }
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i]!;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 400 * dt;
        pt.life -= dt;
        if (pt.life <= 0) particles.splice(i, 1);
      }

      // --- DRAW SCENE ---
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#1e0842');
      sky.addColorStop(0.65, '#6b1d8c');
      sky.addColorStop(1, '#db2777');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Synthwave Sun
      ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
      ctx.beginPath();
      ctx.arc(720, 125, 52, 0, Math.PI * 2);
      ctx.fill();

      // Parallax Mountains
      const offset = (distance * 1.4) % 300;
      ctx.fillStyle = '#3b0c68';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      for (let x = -300; x <= W + 300; x += 150) {
        ctx.lineTo(x - offset, groundY - 75 - ((Math.abs(x) / 150) % 2) * 35);
      }
      ctx.lineTo(W, groundY);
      ctx.closePath();
      ctx.fill();

      // Ground
      ctx.fillStyle = '#180633';
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.strokeStyle = '#ff47b3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();

      // Ground grid lines
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.lineWidth = 1.5;
      const gOff = (distance * 7) % 60;
      for (let x = -60; x < W + 60; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x - gOff, groundY);
        ctx.lineTo(x - gOff - 40, H);
        ctx.stroke();
      }

      // Coins
      for (const c of coins) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Obstacles
      for (const ob of obstacles) {
        const top = groundY - ob.h - ob.yOffset;
        if (ob.kind === 'cactus') {
          ctx.fillStyle = '#22c55e';
          ctx.strokeStyle = '#052e16';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(ob.x, top, 16, ob.h, 6);
          ctx.fill();
          ctx.stroke();
          if (ob.w > 30) {
            ctx.beginPath();
            ctx.roundRect(ob.x + 22, top + 10, 14, ob.h - 10, 5);
            ctx.fill();
            ctx.stroke();
          }
          // Cactus arm
          ctx.beginPath();
          ctx.roundRect(ob.x - 8, top + 14, 10, 14, 4);
          ctx.fill();
        } else {
          // Neon Pterodactyl
          const flap = Math.sin(now * 0.015) * 8;
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.moveTo(ob.x, top + 14);
          ctx.lineTo(ob.x + 22, top + flap);
          ctx.lineTo(ob.x + ob.w, top + 14);
          ctx.lineTo(ob.x + 20, top + 24);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Draw Cool Purple T-Rex with Sunglasses & Red Sneakers
      ctx.save();
      ctx.translate(dino.x, dino.y);
      ctx.fillStyle = '#a855f7';
      ctx.strokeStyle = '#180530';
      ctx.lineWidth = 3;
      // Body
      ctx.beginPath();
      ctx.roundRect(4, dino.ducking ? 6 : 18, dino.w - 10, dino.h - 16, 8);
      ctx.fill();
      ctx.stroke();
      // Tail
      ctx.beginPath();
      ctx.moveTo(4, dino.h - 22);
      ctx.lineTo(-14, dino.h - 30);
      ctx.lineTo(4, dino.h - 14);
      ctx.closePath();
      ctx.fill();
      // Head
      const headY = dino.ducking ? 2 : 0;
      const headX = dino.ducking ? 22 : 14;
      ctx.beginPath();
      ctx.roundRect(headX, headY, 32, 22, 7);
      ctx.fill();
      ctx.stroke();
      // Sunglasses
      ctx.fillStyle = '#09090b';
      ctx.fillRect(headX + 12, headY + 5, 20, 7);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(headX + 14, headY + 6, 6, 2);
      // Animated Legs + Red Sneakers
      const legOffset = dino.y + dino.h >= groundY ? Math.sin(dino.runFrame) * 6 : 0;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(12, dino.h - 8 + legOffset * 0.5, 12, 7);
      ctx.fillRect(28, dino.h - 8 - legOffset * 0.5, 12, 7);
      ctx.restore();

      // Particles
      for (const pt of particles) {
        ctx.globalAlpha = Math.max(0, pt.life * 1.5);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, 5, 5);
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [sessionId]);

  const handleRestart = () => {
    setGameOver(false);
    setLiveScore(0);
    setSessionId((s) => s + 1);
  };

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center p-2 sm:p-4">
      <div className="mb-2 flex w-full max-w-[900px] items-center justify-between px-2">
        <span className="text-xs font-semibold text-fuchsia-200">
          Клик / Пробел — прыжок (можно двойной!), ↓ — пригнуться
        </span>
        <span className="font-display text-xl font-black italic text-amber-300 tabular-nums">
          {liveScore}
        </span>
      </div>

      <div className="relative w-full max-w-[900px] overflow-hidden rounded-2xl border border-fuchsia-400/40">
        <canvas
          ref={canvasRef}
          className="block aspect-[900/440] w-full cursor-pointer touch-none select-none"
        />

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#110424]/82 p-6 text-center backdrop-blur-sm">
            {isNewRecord && (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 px-3 py-1 text-xs font-black text-amber-300 uppercase">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Новый личный рекорд!
              </div>
            )}
            <h2 className="font-display text-3xl font-black italic text-white uppercase">
              Столкновение!
            </h2>
            <p className="mt-1 text-sm text-fuchsia-200">
              Счёт за забег:{' '}
              <span className="font-display text-lg font-black text-amber-300">{finalScore}</span>{' '}
              (Лучший: {Math.max(bestScore, finalScore)})
            </p>
            <button
              type="button"
              onClick={handleRestart}
              className="font-display mt-5 flex min-h-[46px] items-center gap-2 rounded-full bg-gradient-to-r from-[#ff2e93] to-[#a855f7] px-6 py-2.5 text-sm font-black italic text-white uppercase shadow-[0_0_20px_rgba(255,46,147,0.65)] hover:brightness-110"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Ещё забег
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

