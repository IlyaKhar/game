import React from 'react';
import { Calendar, Trophy } from 'lucide-react';
import type { PlayerSummary } from '../types/festival';

interface BrandHeaderProps {
  player: PlayerSummary | null;
  onOpenResults?: () => void;
  onSecretAdmin?: () => void;
}

/**
 * Top festival header lockup matching the mockup with crisp real typography and vector SVG icons.
 */
export const BrandHeader: React.FC<BrandHeaderProps> = ({
  player,
  onOpenResults,
  onSecretAdmin,
}) => {
  const clickCountRef = React.useRef(0);
  const timerRef = React.useRef<number | null>(null);

  const handleGamepadTap = () => {
    if (!onSecretAdmin) return;
    clickCountRef.current += 1;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      clickCountRef.current = 0;
    }, 900);
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      onSecretAdmin();
    }
  };

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 px-4 pt-4 sm:px-8 sm:pt-6">
      {/* Top-Left Festival Title Lockup */}
      <div className="relative select-none -rotate-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="okei-title-white text-5xl leading-[0.9] sm:text-7xl">
            ОКЭИ:
          </h1>

          {/* Crisp Neon Gamepad Icon (triple-click opens secret admin) */}
          <button
            type="button"
            onClick={handleGamepadTap}
            title="ОКЭИ Фестиваль Игр"
            className="group relative flex h-12 w-20 items-center justify-center rounded-2xl transition-transform active:scale-95 sm:h-16 sm:w-24"
            aria-label="Иконка геймпада ОКЭИ"
          >
            <svg
              viewBox="0 0 92 60"
              className="h-full w-full drop-shadow-[0_0_14px_rgba(255,46,147,0.9)]"
            >
              <path
                d="M22 10 H70 C81 10 88 20 86 35 L83 47 C81 54 73 56 68 50 L58 39 H34 L24 50 C19 56 11 54 9 47 L6 35 C4 20 11 10 22 10 Z"
                fill="#200b3d"
                stroke="#ff47b3"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M25 22 V34 M19 28 H31"
                stroke="#c084fc"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="62" cy="23" r="3" fill="#ff47b3" />
              <circle cx="69" cy="28" r="3" fill="#a855f7" />
              <circle cx="62" cy="33" r="3" fill="#38bdf8" />
              <circle cx="55" cy="28" r="3" fill="#fde047" />
            </svg>
          </button>
        </div>

        <div className="okei-title-pink -mt-1 text-3xl leading-[0.95] tracking-tight sm:text-[44px]">
          НОВЫЙ УРОВЕНЬ
        </div>

        {/* Slanted Yellow Brush Badge */}
        <div className="relative mt-2 inline-block -rotate-2">
          <div
            className="bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#f59e0b] px-6 py-1.5 shadow-[0_4px_18px_rgba(250,204,21,0.5)]"
            style={{
              clipPath: 'polygon(3% 4%, 98% 0%, 100% 92%, 0% 100%)',
            }}
          >
            <span className="font-display block text-xs font-black italic tracking-wider text-[#18072b] uppercase sm:text-lg">
              ФЕСТИВАЛЬ ИГР
            </span>
          </div>
        </div>
      </div>

      {/* Top-Right Date Pill & Active Student HUD */}
      <div className="flex flex-col items-end gap-2.5">
        <div className="rotate-2 rounded-2xl border-2 border-[#ff47b3] bg-[#240a47]/90 px-4 py-2 shadow-[0_0_20px_rgba(255,71,179,0.5)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-[#f472b6] sm:h-7 sm:w-7" aria-hidden="true" />
            <div className="leading-tight">
              <div className="font-display text-lg font-black italic tracking-tight text-white sm:text-2xl">
                16–27
              </div>
              <div className="font-display text-[10px] font-extrabold tracking-widest text-fuchsia-200 uppercase sm:text-xs">
                НОЯБРЯ
              </div>
            </div>
          </div>
        </div>

        {player && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="rounded-xl border border-fuchsia-400/40 bg-[#1a0836]/85 px-3 py-1.5 text-right backdrop-blur-md">
              <div className="text-xs font-bold text-white sm:text-sm">{player.full_name}</div>
              <div className="text-[11px] font-medium text-fuchsia-300">
                Группа <span className="font-bold text-white">{player.group_name}</span> •{' '}
                <span className="font-bold text-amber-300">{player.total_score.toLocaleString('ru-RU')}</span> очков
              </div>
            </div>

            {onOpenResults && (
              <button
                type="button"
                onClick={onOpenResults}
                className="flex min-h-[42px] items-center gap-1.5 rounded-xl border-2 border-amber-400/80 bg-amber-500/20 px-3.5 py-1.5 font-display text-xs font-black italic tracking-wide text-amber-200 uppercase shadow-[0_0_16px_rgba(251,191,36,0.35)] transition hover:bg-amber-400/30 active:scale-95 sm:text-sm"
              >
                <Trophy className="h-4 w-4 text-amber-300" aria-hidden="true" />
                Итоги ({player.games_done}/5)
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
