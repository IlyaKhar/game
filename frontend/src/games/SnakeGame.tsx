import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Trophy } from 'lucide-react';
import { sfx } from '../lib/sound';

interface SnakeGameProps {
  onGameOver: (score: number) => void;
  bestScore: number;
  isNewRecord: boolean;
}

type Dir = { x: number; y: number };

export const SnakeGame: React.FC<SnakeGameProps> = ({ onGameOver, bestScore, isNewRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [sessionId, setSessionId] = useState(0);
  const dirQueueRef = useRef<Dir[]>([]);
  const currentDirRef = useRef<Dir>({ x: 1, y: 0 });
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const enqueueDir = (next: Dir) => {
    const q = dirQueueRef.current;
    const last = q.length > 0 ? q[q.length - 1]! : currentDirRef.current;
    if (last.x + next.x === 0 && last.y + next.y === 0) return;
    if (last.x === next.x && last.y === next.y) return;
    if (q.length < 3) q.push(next);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const COLS = 20;
    const ROWS = 16;
    const CELL = 32;
    const W = COLS * CELL;
    const H = ROWS * CELL;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let snake = [
      { x: 6, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 8 },
    ];
    currentDirRef.current = { x: 1, y: 0 };
    dirQueueRef.current = [];

    const spawnFood = (occupied: { x: number; y: number }[]) => {
      let fx = 0;
      let fy = 0;
      let tries = 0;
      do {
        fx = Math.floor(Math.random() * COLS);
        fy = Math.floor(Math.random() * ROWS);
        tries++;
      } while (occupied.some((s) => s.x === fx && s.y === fy) && tries < 200);
      return { x: fx, y: fy, golden: Math.random() < 0.18 };
    };

    let food = spawnFood(snake);
    let currentScore = 0;
    let dead = false;
    let stepMs = 128;
    let lastStep = performance.now();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        enqueueDir({ x: 0, y: -1 });
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        enqueueDir({ x: 0, y: 1 });
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        enqueueDir({ x: -1, y: 0 });
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        enqueueDir({ x: 1, y: 0 });
      }
    };

    let touchStart: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) touchStart = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t || !touchStart) return;
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 20) enqueueDir(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
      } else if (Math.abs(dy) > 20) {
        enqueueDir(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
      }
      touchStart = null;
    };

    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    let rafId = 0;
    const loop = (now: number) => {
      if (!dead && now - lastStep >= stepMs) {
        lastStep = now;
        const queued = dirQueueRef.current.shift();
        if (queued) currentDirRef.current = queued;
        const d = currentDirRef.current;

        const head = snake[0]!;
        const nx = head.x + d.x;
        const ny = head.y + d.y;

        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || snake.some((s) => s.x === nx && s.y === ny)) {
          dead = true;
          sfx.hit();
          setGameOver(true);
          onGameOverRef.current(currentScore);
        } else {
          const newHead = { x: nx, y: ny };
          snake = [newHead, ...snake];
          if (nx === food.x && ny === food.y) {
            currentScore += food.golden ? 50 : 15;
            setScore(currentScore);
            sfx.coin();
            stepMs = Math.max(72, stepMs - 2);
            food = spawnFood(snake);
          } else {
            snake.pop();
          }
        }
      }

      // Draw Arena
      ctx.fillStyle = '#0d102b';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL, 0);
        ctx.lineTo(x * CELL, H);
        ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL);
        ctx.lineTo(W, y * CELL);
        ctx.stroke();
      }

      // Apple
      const fx = food.x * CELL + CELL / 2;
      const fy = food.y * CELL + CELL / 2;
      ctx.fillStyle = food.golden ? '#fde047' : '#ef4444';
      ctx.beginPath();
      ctx.arc(fx, fy, 11 + Math.sin(now * 0.008) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(fx - 2, fy - 15, 4, 6);

      // Snake
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i]!;
        const t = i / Math.max(1, snake.length - 1);
        ctx.fillStyle = i === 0 ? '#38bdf8' : t < 0.5 ? '#818cf8' : '#ec4899';
        ctx.beginPath();
        ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 8);
        ctx.fill();

        if (i === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(seg.x * CELL + 11, seg.y * CELL + 11, 3.2, 0, Math.PI * 2);
          ctx.arc(seg.x * CELL + 21, seg.y * CELL + 11, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#09090b';
          ctx.beginPath();
          ctx.arc(seg.x * CELL + 11, seg.y * CELL + 11, 1.6, 0, Math.PI * 2);
          ctx.arc(seg.x * CELL + 21, seg.y * CELL + 11, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [sessionId]);

  const restart = () => {
    setGameOver(false);
    setScore(0);
    setSessionId((s) => s + 1);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-3 sm:p-4">
      <div className="mb-2 flex w-full max-w-[640px] items-center justify-between">
        <span className="text-xs text-indigo-200">Красные яблоки: +15 • Золотые: +50</span>
        <span className="font-display text-xl font-black italic text-amber-300 tabular-nums">{score}</span>
      </div>

      <div className="relative w-full max-w-[640px] overflow-hidden rounded-2xl border-2 border-indigo-400/60 shadow-[0_0_24px_rgba(99,102,241,0.45)]">
        <canvas ref={canvasRef} className="block aspect-[20/16] w-full touch-none select-none" />

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0622]/85 p-6 text-center backdrop-blur-sm">
            {isNewRecord && (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 px-3 py-1 text-xs font-black text-amber-300 uppercase">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Новый рекорд!
              </div>
            )}
            <h2 className="font-display text-3xl font-black italic text-white uppercase">Игра окончена</h2>
            <p className="mt-1 text-sm text-indigo-200">
              Итого: <span className="font-display text-lg font-black text-amber-300">{score}</span> (Лучший:{' '}
              {Math.max(bestScore, score)})
            </p>
            <button
              type="button"
              onClick={restart}
              className="font-display mt-5 flex min-h-[46px] items-center gap-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#ec4899] px-6 py-2.5 text-sm font-black italic text-white uppercase"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Играть снова
            </button>
          </div>
        )}
      </div>

      {/* Touch D-Pad for Mobile */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:hidden">
        <div />
        <button
          type="button"
          aria-label="Вверх"
          onClick={() => enqueueDir({ x: 0, y: -1 })}
          className="flex h-12 w-14 items-center justify-center rounded-xl border border-indigo-400/50 bg-[#1c0b3d] active:bg-indigo-600"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
        <div />
        <button
          type="button"
          aria-label="Влево"
          onClick={() => enqueueDir({ x: -1, y: 0 })}
          className="flex h-12 w-14 items-center justify-center rounded-xl border border-indigo-400/50 bg-[#1c0b3d] active:bg-indigo-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Вниз"
          onClick={() => enqueueDir({ x: 0, y: 1 })}
          className="flex h-12 w-14 items-center justify-center rounded-xl border border-indigo-400/50 bg-[#1c0b3d] active:bg-indigo-600"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Вправо"
          onClick={() => enqueueDir({ x: 1, y: 0 })}
          className="flex h-12 w-14 items-center justify-center rounded-xl border border-indigo-400/50 bg-[#1c0b3d] active:bg-indigo-600"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

