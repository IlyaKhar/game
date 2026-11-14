import React from 'react';
import { ArrowLeft, Play, Trophy } from 'lucide-react';
import { FESTIVAL_GAMES, type GameId, type LeaderboardCategory, type PlayerSummary } from '../types/festival';
import { BrandHeader } from './BrandHeader';
import { SloganBadge } from './SloganBadge';
import { GameCardArtwork } from './art/GameCardArtwork';

interface HubScreenProps {
  player: PlayerSummary;
  onPlayGame: (gameId: GameId) => void;
  onBackToLogin: () => void;
  onOpenResults: (category?: LeaderboardCategory) => void;
  onSecretAdmin: () => void;
}

export const HubScreen: React.FC<HubScreenProps> = ({
  player,
  onPlayGame,
  onBackToLogin,
  onOpenResults,
  onSecretAdmin,
}) => {
  return (
    <div className="relative flex min-h-dvh flex-col justify-between">
      <BrandHeader
        player={player}
        onOpenResults={onOpenResults}
        onSecretAdmin={onSecretAdmin}
      />

      {/* Center-Bottom 5 Full-Bleed Portrait Neon Cards matching the mockup */}
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-end px-4 pb-3 pt-2 sm:px-8 sm:pb-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {FESTIVAL_GAMES.map((game) => {
            const best = player.games[game.id];
            const isPink = game.variant === 'pink';

            return (
              <article
                key={game.id}
                onClick={() => onPlayGame(game.id)}
                className={`group relative aspect-[3/3.45] w-full cursor-pointer overflow-hidden rounded-[26px] bg-[#14072b] transition-all duration-300 hover:-translate-y-2 ${
                  isPink ? 'neon-card-pink' : 'neon-card-blue'
                }`}
              >
                {/* Full-bleed Card Artwork */}
                <div className="absolute inset-0">
                  <GameCardArtwork gameId={game.id} />
                </div>

                {/* Smooth Bottom Scrim for Crisp Typography over Art */}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-[#0d031f] via-[#13052b]/82 to-transparent"
                  aria-hidden="true"
                />

                {/* Personal Best Pill - clickable to open that game's leaderboard */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenResults(game.id);
                  }}
                  title={`Посмотреть топ игроков в ${game.title}`}
                  className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-white/25 bg-[#120626]/85 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 backdrop-blur-md transition hover:border-amber-300 hover:bg-[#200840] hover:scale-105 active:scale-95"
                >
                  <Trophy className="h-3 w-3 text-amber-300" />
                  <span>{best > 0 ? `Рекорд: ${best}` : '0 pts'}</span>
                </button>

                {/* Floating Title & Play Button over Artwork */}
                <div className="relative flex h-full flex-col items-center justify-end px-3 pb-4 text-center">
                  <h2 className="font-display mb-2.5 flex min-h-[2.7rem] items-end justify-center text-xl font-black italic leading-[1.04] tracking-tight text-white uppercase drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)] xl:text-[23px]">
                    {game.title}
                  </h2>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayGame(game.id);
                    }}
                    className={`flex min-h-[42px] w-full max-w-[172px] items-center justify-center gap-2 rounded-full px-5 py-2 font-display text-xs font-black italic tracking-wider text-white uppercase transition active:scale-95 ${
                      isPink
                        ? 'bg-gradient-to-r from-[#ff2e93] to-[#c026d3] shadow-[0_0_18px_rgba(255,46,147,0.75)] hover:brightness-110'
                        : 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] shadow-[0_0_18px_rgba(99,102,241,0.75)] hover:brightness-110'
                    }`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    ИГРАТЬ
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* Bottom Bar */}
      <footer className="flex flex-wrap items-center justify-between gap-4 px-4 pb-5 pt-2 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToLogin}
            className="flex min-h-[44px] items-center gap-2 rounded-full border-2 border-[#ff47b3] bg-[#210942]/90 px-5 py-2 font-display text-xs font-black italic tracking-wider text-white uppercase shadow-[0_0_16px_rgba(255,71,179,0.45)] transition hover:bg-[#331066] active:scale-95 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
            НАЗАД
          </button>

          <button
            type="button"
            onClick={() => onOpenResults('overall')}
            className="flex min-h-[44px] items-center gap-2 rounded-full border-2 border-indigo-400/85 bg-gradient-to-r from-[#1f0d47]/95 to-[#2d1261]/95 px-5 py-2 font-display text-xs font-black italic tracking-wider text-white uppercase shadow-[0_0_18px_rgba(99,102,241,0.45)] transition hover:border-amber-300/80 hover:brightness-110 active:scale-95 sm:text-sm"
          >
            <Trophy className="h-4 w-4 text-amber-300" aria-hidden="true" />
            ИТОГИ
            <span className="rounded-full border border-amber-300/60 bg-amber-400/20 px-2 py-0.5 text-[11px] font-black not-italic text-[#fde047]">
              {player.games_done}/5
            </span>
          </button>
        </div>

        <SloganBadge />
      </footer>
    </div>
  );
};
