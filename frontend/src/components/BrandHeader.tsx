import React from 'react';
import { Calendar, Star } from 'lucide-react';
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
    <header className="flex flex-wrap items-start justify-between gap-4 px-4 pt-4 sm:px-8 sm:pt-6 lg:px-10 lg:pt-7">
      {/* Top-Left Festival Title Lockup */}
      <div className="relative select-none -rotate-2 pt-1">
        <div className="flex items-center gap-2.5 sm:gap-4 lg:gap-5">
          <h1 className="okei-title-white text-5xl leading-[0.88] sm:text-7xl md:text-[84px] lg:text-[102px] xl:text-[116px]">
            ОКЭИ:
          </h1>

          {/* Crisp Neon Gamepad Icon (triple-click opens secret admin) */}
          <button
            type="button"
            onClick={handleGamepadTap}
            title="ОКЭИ Фестиваль Игр"
            className="group relative flex h-12 w-20 items-center justify-center rounded-2xl transition-transform active:scale-95 sm:h-16 sm:w-26 md:h-[76px] md:w-32 lg:h-[90px] lg:w-36 xl:h-24 xl:w-40"
            aria-label="Иконка геймпада ОКЭИ"
          >
            <svg
              viewBox="0 0 92 60"
              className="h-full w-full drop-shadow-[0_0_16px_rgba(255,46,147,0.9)]"
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

        <div className="okei-title-pink -mt-1 text-3xl leading-[0.94] tracking-tight sm:text-[44px] md:text-[52px] lg:text-[62px] xl:text-[70px]">
          НОВЫЙ УРОВЕНЬ
        </div>

        {/* Slanted Yellow Brush Badge */}
        <div className="relative mt-2.5 inline-block -rotate-2 lg:mt-3.5">
          <div
            className="bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#f59e0b] px-6 py-1.5 shadow-[0_4px_18px_rgba(250,204,21,0.5)] sm:px-8 sm:py-2 lg:px-10 lg:py-2.5"
            style={{
              clipPath: 'polygon(3% 4%, 98% 0%, 100% 92%, 0% 100%)',
            }}
          >
            <span className="font-display block text-xs font-black italic tracking-wider text-[#18072b] uppercase sm:text-lg lg:text-2xl xl:text-[26px]">
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
          <button
            type="button"
            onClick={onOpenResults}
            disabled={!onOpenResults}
            className="group relative flex max-w-[340px] items-center gap-3 overflow-hidden rounded-2xl border-2 border-[#ff47b3]/80 bg-gradient-to-br from-[#1b0838]/95 via-[#13052b]/95 to-[#240a47]/95 p-2.5 pr-4 text-left shadow-[0_8px_28px_rgba(10,3,24,0.85),0_0_22px_rgba(255,71,179,0.32)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#ff66d9] hover:shadow-[0_10px_32px_rgba(10,3,24,0.9),0_0_26px_rgba(255,71,179,0.55)] active:scale-[0.98] sm:max-w-[390px]"
          >
            {/* Subtle top neon highlight line */}
            <div
              className="pointer-events-none absolute inset-x-4 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ff66d9] to-transparent opacity-80"
              aria-hidden="true"
            />

            {/* Generated Neon Arcade Avatar */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 border-[#38bdf8]/80 bg-[#15062b] shadow-[0_0_14px_rgba(56,189,248,0.45)] sm:h-14 sm:w-14">
              <img
                src="/art/player-avatar.jpg"
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Real Player Info & Progress */}
            <div className="min-w-0">
              <div className="font-display truncate text-sm font-black italic tracking-tight text-white sm:text-base">
                {player.full_name}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-cyan-400/55 bg-cyan-500/15 px-2 py-0.5 font-display text-[11px] font-black italic tracking-wide text-cyan-200 uppercase">
                  {player.group_name}
                </span>

                <span className="flex items-center gap-1 font-display text-xs font-black italic text-[#fde047] sm:text-sm">
                  <Star className="h-3.5 w-3.5 fill-[#fde047] text-[#fde047]" aria-hidden="true" />
                  {player.total_score.toLocaleString('ru-RU')}
                  <span className="font-sans text-[11px] font-semibold not-italic text-fuchsia-200/80">
                    очков
                  </span>
                </span>
              </div>

              {/* 5-Game Progress Pips */}
              <div className="mt-1.5 flex items-center gap-1" aria-label={`Пройдено игр: ${player.games_done} из 5`}>
                {[0, 1, 2, 3, 4].map((idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 w-5 rounded-full transition-all ${
                      idx < player.games_done
                        ? 'bg-gradient-to-r from-[#ff47b3] to-[#fde047] shadow-[0_0_8px_rgba(255,71,179,0.8)]'
                        : 'bg-white/15'
                    }`}
                  />
                ))}
                <span className="ml-1 text-[10px] font-bold text-fuchsia-300/85">
                  {player.games_done}/5
                </span>
              </div>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
