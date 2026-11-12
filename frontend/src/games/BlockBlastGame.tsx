import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { sfx } from '../lib/sound';

interface BlockBlastGameProps {
  onGameOver: (score: number) => void;
  bestScore: number;
  isNewRecord: boolean;
}

interface Piece {
  id: string;
  cells: [number, number][]; // [row, col]
  color: string;
  rows: number;
  cols: number;
}

const GRID_SIZE = 8;

const COLORS = [
  '#facc15', // yellow
  '#38bdf8', // cyan
  '#6366f1', // indigo
  '#22c55e', // emerald
  '#fb923c', // orange
  '#f43f5e', // rose
  '#c084fc', // purple
];

const SHAPES: [number, number][][] = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 1], [1, 1], [2, 1], [2, 0]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 1], [1, 0], [1, 1]],
];

function createRandomPiece(seq: number): Piece {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]!;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]!;
  const rows = Math.max(...shape.map((c) => c[0])) + 1;
  const cols = Math.max(...shape.map((c) => c[1])) + 1;
  return { id: `${seq}-${Math.random()}`, cells: shape, color, rows, cols };
}

function createEmptyGrid(): (string | null)[][] {
  return Array.from({ length: GRID_SIZE }, () => Array<string | null>(GRID_SIZE).fill(null));
}

function canPlace(grid: (string | null)[][], piece: Piece, r0: number, c0: number): boolean {
  for (const [dr, dc] of piece.cells) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (grid[r]?.[c] !== null) return false;
  }
  return true;
}

function anyPlacementExists(grid: (string | null)[][], tray: (Piece | null)[]): boolean {
  for (const p of tray) {
    if (!p) continue;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlace(grid, p, r, c)) return true;
      }
    }
  }
  return false;
}

export const BlockBlastGame: React.FC<BlockBlastGameProps> = ({
  onGameOver,
  bestScore,
  isNewRecord,
}) => {
  const [grid, setGrid] = useState<(string | null)[][]>(createEmptyGrid);
  const [tray, setTray] = useState<(Piece | null)[]>(() => [
    createRandomPiece(1),
    createRandomPiece(2),
    createRandomPiece(3),
  ]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const [dragging, setDragging] = useState<{
    trayIndex: number;
    piece: Piece;
    x: number;
    y: number;
  } | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<{ r: number; c: number } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(4);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const computeAnchorFromPointer = useCallback((clientX: number, clientY: number, piece: Piece) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cellW = rect.width / GRID_SIZE;
    const cellH = rect.height / GRID_SIZE;

    // Offset slightly upward on touch so finger doesn't hide the piece
    const adjY = clientY - cellH * (piece.rows * 0.55);
    const adjX = clientX - (cellW * piece.cols) / 2 + cellW / 2;

    const c = Math.round((adjX - rect.left) / cellW);
    const r = Math.round((adjY - rect.top) / cellH);
    if (r < -1 || c < -1 || r >= GRID_SIZE || c >= GRID_SIZE) return null;
    return { r, c };
  }, []);

  const previewInfo = useMemo(() => {
    if (!dragging || !hoverAnchor) return null;
    const valid = canPlace(grid, dragging.piece, hoverAnchor.r, hoverAnchor.c);
    if (!valid) return null;

    const previewSet = new Set<string>();
    const testGrid = grid.map((row) => [...row]);
    for (const [dr, dc] of dragging.piece.cells) {
      const r = hoverAnchor.r + dr;
      const c = hoverAnchor.c + dc;
      previewSet.add(`${r},${c}`);
      testGrid[r]![c] = dragging.piece.color;
    }

    const clearRows = new Set<number>();
    const clearCols = new Set<number>();
    for (let r = 0; r < GRID_SIZE; r++) {
      if (testGrid[r]!.every((cell) => cell !== null)) clearRows.add(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (testGrid[r]![c] === null) {
          full = false;
          break;
        }
      }
      if (full) clearCols.add(c);
    }

    return { previewSet, clearRows, clearCols };
  }, [dragging, hoverAnchor, grid]);

  const commitDrop = useCallback(
    (trayIndex: number, piece: Piece, anchor: { r: number; c: number } | null) => {
      if (!anchor || !canPlace(grid, piece, anchor.r, anchor.c)) return;

      const nextGrid = grid.map((row) => [...row]);
      for (const [dr, dc] of piece.cells) {
        nextGrid[anchor.r + dr]![anchor.c + dc] = piece.color;
      }

      const fullRows: number[] = [];
      const fullCols: number[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        if (nextGrid[r]!.every((cell) => cell !== null)) fullRows.push(r);
      }
      for (let c = 0; c < GRID_SIZE; c++) {
        if (nextGrid.every((row) => row[c] !== null)) fullCols.push(c);
      }

      for (const r of fullRows) {
        for (let c = 0; c < GRID_SIZE; c++) nextGrid[r]![c] = null;
      }
      for (const c of fullCols) {
        for (let r = 0; r < GRID_SIZE; r++) nextGrid[r]![c] = null;
      }

      const lines = fullRows.length + fullCols.length;
      const nextCombo = lines > 0 ? combo + 1 : 0;
      const gained = piece.cells.length * 10 + (lines > 0 ? lines * 80 * nextCombo : 0);
      const nextScore = score + gained;

      if (lines > 0) {
        sfx.clear();
        setBanner(lines > 1 || nextCombo > 1 ? `КОМБО ×${Math.max(lines, nextCombo)}! +${gained}` : `ЛИНИЯ! +${gained}`);
        window.setTimeout(() => setBanner(null), 1100);
      } else {
        sfx.coin();
      }

      let nextTray = tray.map((item, idx) => (idx === trayIndex ? null : item));
      if (nextTray.every((item) => item === null)) {
        nextTray = [
          createRandomPiece(seqRef.current++),
          createRandomPiece(seqRef.current++),
          createRandomPiece(seqRef.current++),
        ];
      }

      setGrid(nextGrid);
      setTray(nextTray);
      setScore(nextScore);
      setCombo(nextCombo);

      if (!anyPlacementExists(nextGrid, nextTray)) {
        sfx.hit();
        setGameOver(true);
        onGameOverRef.current(nextScore);
      }
    },
    [grid, combo, score, tray]
  );

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (e: PointerEvent) => {
      setDragging((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
      setHoverAnchor(computeAnchorFromPointer(e.clientX, e.clientY, dragging.piece));
    };

    const onPointerUp = (e: PointerEvent) => {
      const anchor = computeAnchorFromPointer(e.clientX, e.clientY, dragging.piece);
      commitDrop(dragging.trayIndex, dragging.piece, anchor);
      setDragging(null);
      setHoverAnchor(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragging, computeAnchorFromPointer, commitDrop]);

  const restart = () => {
    setGrid(createEmptyGrid());
    setTray([
      createRandomPiece(seqRef.current++),
      createRandomPiece(seqRef.current++),
      createRandomPiece(seqRef.current++),
    ]);
    setScore(0);
    setCombo(0);
    setGameOver(false);
    setBanner(null);
  };

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center p-3 sm:p-5 select-none">
      {/* Score & Combo Header */}
      <div className="mb-3 flex w-full max-w-[400px] items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-indigo-200">Сетка 8×8</span>
          {combo > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-black text-amber-300">
              <Sparkles className="h-3 w-3" /> ×{combo}
            </span>
          )}
        </div>
        <div className="font-display text-2xl font-black italic text-amber-300 tabular-nums">
          {score}
        </div>
      </div>

      {/* 8x8 Neon Grid */}
      <div className="relative">
        <div
          ref={boardRef}
          className="grid grid-cols-8 gap-1.5 rounded-2xl border-2 border-indigo-400/60 bg-[#0c0a26] p-2.5 shadow-[0_0_28px_rgba(99,102,241,0.45)]"
          style={{ width: 'min(86vw, 376px)', height: 'min(86vw, 376px)' }}
        >
          {grid.map((row, r) =>
            row.map((cellColor, c) => {
              const isGhost = previewInfo?.previewSet.has(`${r},${c}`) ?? false;
              const willClear =
                (previewInfo?.clearRows.has(r) ?? false) ||
                (previewInfo?.clearCols.has(c) ?? false);
              const displayColor = isGhost ? dragging?.piece.color : cellColor;

              return (
                <div
                  key={`${r}-${c}`}
                  className={`rounded-md transition-transform duration-100 ${
                    willClear ? 'scale-105 ring-2 ring-white' : ''
                  }`}
                  style={{
                    backgroundColor: displayColor ?? '#1a1742',
                    opacity: isGhost ? 0.72 : 1,
                    boxShadow: displayColor
                      ? `inset 0 3px 0 rgba(255,255,255,0.38), inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 10px ${displayColor}66`
                      : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                  }}
                />
              );
            })
          )}
        </div>

        {banner && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
            <span className="font-display inline-block rounded-full bg-gradient-to-r from-[#ff2e93] to-[#facc15] px-5 py-1.5 text-lg font-black italic text-white uppercase shadow-xl">
              {banner}
            </span>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[#0d0522]/88 p-6 text-center backdrop-blur-sm">
            {isNewRecord && (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 px-3 py-1 text-xs font-black text-amber-300 uppercase">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Новый рекорд!
              </div>
            )}
            <h2 className="font-display text-2xl font-black italic text-white uppercase">Нет ходов!</h2>
            <p className="mt-1 text-sm text-indigo-200">
              Итого: <span className="font-display text-lg font-black text-amber-300">{score}</span> (Лучший:{' '}
              {Math.max(bestScore, score)})
            </p>
            <button
              type="button"
              onClick={restart}
              className="font-display mt-5 flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#ec4899] px-6 py-2 text-sm font-black italic text-white uppercase"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Заново
            </button>
          </div>
        )}
      </div>

      {/* 3-Piece Tray */}
      <div className="mt-4 flex w-full max-w-[400px] items-center justify-around gap-3 rounded-2xl border border-white/10 bg-[#150833]/85 px-3 py-3">
        {tray.map((piece, idx) => (
          <div key={idx} className="flex h-20 w-24 items-center justify-center">
            {piece && dragging?.trayIndex !== idx && (
              <div
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDragging({ trayIndex: idx, piece, x: e.clientX, y: e.clientY });
                  setHoverAnchor(computeAnchorFromPointer(e.clientX, e.clientY, piece));
                }}
                className="grid cursor-grab touch-none gap-1 p-1 transition hover:scale-110 active:cursor-grabbing"
                style={{
                  gridTemplateRows: `repeat(${piece.rows}, 16px)`,
                  gridTemplateColumns: `repeat(${piece.cols}, 16px)`,
                }}
              >
                {Array.from({ length: piece.rows }).map((_, r) =>
                  Array.from({ length: piece.cols }).map((__, c) => {
                    const filled = piece.cells.some(([cr, cc]) => cr === r && cc === c);
                    return (
                      <div
                        key={`${r}-${c}`}
                        className="rounded-[4px]"
                        style={{
                          backgroundColor: filled ? piece.color : 'transparent',
                          boxShadow: filled
                            ? 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.3)'
                            : 'none',
                        }}
                      />
                    );
                  })
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating Dragging Piece */}
      {dragging && (
        <div
          className="pointer-events-none fixed z-50 grid gap-1.5"
          style={{
            left: dragging.x,
            top: dragging.y,
            transform: 'translate(-50%, -85%)',
            gridTemplateRows: `repeat(${dragging.piece.rows}, 38px)`,
            gridTemplateColumns: `repeat(${dragging.piece.cols}, 38px)`,
          }}
        >
          {Array.from({ length: dragging.piece.rows }).map((_, r) =>
            Array.from({ length: dragging.piece.cols }).map((__, c) => {
              const filled = dragging.piece.cells.some(([cr, cc]) => cr === r && cc === c);
              return (
                <div
                  key={`${r}-${c}`}
                  className="rounded-md"
                  style={{
                    backgroundColor: filled ? dragging.piece.color : 'transparent',
                    boxShadow: filled
                      ? `inset 0 3px 0 rgba(255,255,255,0.45), 0 6px 16px rgba(0,0,0,0.45)`
                      : 'none',
                  }}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

