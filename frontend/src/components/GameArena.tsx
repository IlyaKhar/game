import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Volume2, VolumeX } from 'lucide-react';
import { sfx } from '../lib/sound';
import type { GameMeta, PlayerSummary } from '../types/festival';

interface GameArenaProps {
  game: GameMeta;
  player: PlayerSummary;
  onExit: () => void;
  onOpenResults: () => void;
  children: (api: {
    onScoreSubmit: (score: number) => void;
    runKey: number;
    bestScore: number;
    isNewRecord: boolean;
    lastSubmitted: number | null;
    restart: () => void;
  }) => React.ReactNode;
  onScoreSaved: (score: number) => Promise<void>;
}

export const GameArena: React.FC<GameArenaProps> = ({
  game,
  player,
  onExit,
  onOpenResults,
  children,
  onScoreSaved,
}) => {
  const [muted, setMuted] = useState(sfx.muted);
  const [runKey, setRunKey] = useState(0);
  const [lastSubmitted, setLastSubmitted] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const bestScore = player.games[game.id];

  const toggleMute = () => {
    sfx.muted = !sfx.muted;
    setMuted(sfx.muted);
  };

  const handleScoreSubmit = (score: number) => {
    const clean = Math.max(0, Math.floor(score));
    setLastSubmitted(clean);
    setIsNewRecord(clean > bestScore);
    void onScoreSaved(clean);
  };

  const restart = () => {
    setLastSubmitted(null);
    setIsNewRecord(false);
    setRunKey((k) => k + 1);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 py-3 sm:px-6 sm:py-5">
      {/* Top Arena HUD */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-fuchsia-400/40 bg-[#15062d]/90 px-3.5 py-2.5 backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-fuchsia-400/50 bg-[#250c4a] px-3.5 py-1.5 font-display text-xs font-black italic text-white uppercase transition hover:bg-[#361469]"
          >
            <ArrowLeft className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
            В хаб
          </button>

          <div>
            <h1 className="font-display text-base font-black italic text-white uppercase sm:text-xl">
              {game.title}
            </h1>
            <p className="hidden text-xs text-fuchsia-200/75 sm:block">{game.controls}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-amber-400/45 bg-amber-500/15 px-3 py-1.5 text-right">
            <div className="text-[10px] font-bold tracking-wider text-amber-200/80 uppercase">
              Твой рекорд
            </div>
            <div className="font-display text-sm font-black italic text-amber-300 tabular-nums sm:text-base">
              {bestScore.toLocaleString('ru-RU')}
            </div>
          </div>

          <button
            type="button"
            onClick={restart}
            title="Начать заново"
            aria-label="Начать заново"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            title={muted ? 'Включить звук' : 'Выключить звук'}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
          >
            {muted ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-emerald-300" />}
          </button>

          <button
            type="button"
            onClick={onOpenResults}
            className="hidden min-h-[40px] items-center gap-1.5 rounded-xl border border-indigo-400/50 bg-indigo-500/20 px-3 py-1.5 text-xs font-bold text-indigo-100 hover:bg-indigo-500/35 sm:flex"
          >
            <Trophy className="h-4 w-4 text-amber-300" aria-hidden="true" />
            Рейтинг
          </button>
        </div>
      </header>

      {/* Main Game Viewport */}
      <div className="neon-card-pink relative flex flex-1 flex-col overflow-hidden rounded-3xl bg-[#100522]/95">
        {children({
          onScoreSubmit: handleScoreSubmit,
          runKey,
          bestScore,
          isNewRecord,
          lastSubmitted,
          restart,
        })}
      </div>

      <p className="mt-2 text-center text-xs text-fuchsia-200/75 sm:hidden">{game.controls}</p>
    </div>
  );
};

