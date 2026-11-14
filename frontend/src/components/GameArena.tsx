import React, { useEffect, useState } from 'react';
import { ArrowLeft, Maximize, Minimize, RotateCcw, Trophy, Volume2, VolumeX } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  const [isTouchDevice, setIsTouchDevice] = useState(() =>
    typeof window !== 'undefined'
      ? 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
      : false
  );
  const bestScore = player.games[game.id];

  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== 'undefined' &&
    Boolean(
      (window.navigator as unknown as { standalone?: boolean }).standalone ||
        window.matchMedia?.('(display-mode: standalone)').matches
    );

  useEffect(() => {
    if (!showIosTip) return;
    const timer = setTimeout(() => setShowIosTip(false), 4500);
    return () => clearTimeout(timer);
  }, [showIosTip]);

  useEffect(() => {
    const handleOrientationChange = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
      setIsTouchDevice('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleMute = () => {
    sfx.muted = !sfx.muted;
    setMuted(sfx.muted);
  };

  const toggleFullscreen = async () => {
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      const doc = document as Document & {
        webkitExitFullscreen?: () => Promise<void>;
      };

      if (!document.fullscreenElement && !isFullscreen) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
        if (isIOS && !isStandalone) {
          setShowIosTip(true);
        }
      } else {
        if (document.fullscreenElement) {
          if (doc.exitFullscreen) {
            await doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          }
        }
        setIsFullscreen(false);
        setShowIosTip(false);
      }
    } catch {
      // Fallback: enable CSS immersive mode on iOS or restricted browsers
      setIsFullscreen((prev) => !prev);
      if (isIOS && !isStandalone && !isFullscreen) {
        setShowIosTip(true);
      }
    }
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

  const isCompactLandscape = isTouchDevice && isLandscape;
  const isImmersive = isFullscreen;

  return (
    <div
      style={{
        paddingTop: isCompactLandscape ? '4px' : 'max(env(safe-area-inset-top, 0px), 16px)',
      }}
      className={`mx-auto flex w-full flex-col select-none transition-all ${
        isImmersive
          ? 'fixed inset-0 z-50 h-dvh max-h-dvh w-dvw bg-[#0c031a] px-1 sm:px-2'
          : isCompactLandscape
            ? 'h-dvh max-h-dvh max-w-none px-1 pb-1 sm:px-2 sm:pb-2'
            : 'min-h-dvh max-w-5xl px-2.5 pb-2 sm:px-6 sm:pb-5'
      }`}
    >
      {/* Top Arena HUD (Shifted down safely below iPhone 13 notch / status bar) */}
      <header
        className={`flex items-center justify-between gap-1.5 rounded-2xl border border-fuchsia-400/40 bg-[#15062d]/90 backdrop-blur-xl transition-all sm:gap-2 ${
          isCompactLandscape || isImmersive ? 'mb-1 px-2.5 py-1' : 'mb-2 px-2.5 py-1.5 sm:mb-3 sm:py-2.5 sm:px-5'
        }`}
      >
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={onExit}
            className="flex h-9 sm:h-10 min-h-[36px] items-center gap-1.5 rounded-xl border border-fuchsia-400/50 bg-[#250c4a] px-2.5 sm:px-3.5 font-display text-[11px] sm:text-xs font-black italic text-white uppercase transition hover:bg-[#361469] active:scale-95 shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
            <span className="hidden xs:inline">В хаб</span>
          </button>

          <h1 className="font-display font-black italic tracking-wide text-white uppercase truncate text-xs sm:text-lg max-w-[110px] xs:max-w-[150px] sm:max-w-none">
            {game.title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Best Score Badge */}
          <div className="rounded-xl border border-amber-400/45 bg-amber-500/15 px-2 py-0.5 text-right sm:px-3 sm:py-1">
            <div className="text-[8px] font-bold tracking-wider text-amber-200/80 uppercase sm:text-[10px]">
              Рекорд
            </div>
            <div className="font-display font-black italic text-amber-300 tabular-nums text-xs leading-none sm:text-base sm:leading-normal">
              {bestScore.toLocaleString('ru-RU')}
            </div>
          </div>

          {/* Restart Button */}
          <button
            type="button"
            onClick={restart}
            title="Начать заново"
            aria-label="Начать заново"
            className="flex h-9 w-9 min-w-[36px] sm:h-10 sm:w-10 sm:min-w-[40px] items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            title={muted ? 'Включить звук' : 'Выключить звук'}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            className="flex h-9 w-9 min-w-[36px] sm:h-10 sm:w-10 sm:min-w-[40px] items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-rose-300" />
            ) : (
              <Volume2 className="h-4 w-4 text-emerald-300" />
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Обычный экран' : 'Во весь экран'}
            aria-label={isFullscreen ? 'Обычный экран' : 'Во весь экран'}
            className="flex h-9 w-9 min-w-[36px] sm:h-10 sm:w-10 sm:min-w-[40px] items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-200 transition hover:bg-cyan-500/30 active:scale-95"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {/* Rating Modal Trigger (Hidden on compact screens) */}
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
      <div
        className={`neon-card-pink relative flex flex-1 flex-col overflow-hidden bg-[#100522]/95 ${
          isCompactLandscape || isImmersive ? 'rounded-2xl' : 'rounded-3xl'
        }`}
      >
        {children({
          onScoreSubmit: handleScoreSubmit,
          runKey,
          bestScore,
          isNewRecord,
          lastSubmitted,
          restart,
        })}
      </div>

      {/* iOS Safari Tip: Add to Home Screen for True Fullscreen */}
      {showIosTip && (
        <aside
          role="status"
          aria-live="polite"
          className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-cyan-400/40 bg-[#160830]/95 px-3.5 py-2 text-[11px] sm:text-xs text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.35)] backdrop-blur-xl max-w-[92vw]"
        >
          <span className="text-sm">💡</span>
          <span>
            Чтобы скрыть полосы Safari: нажми <strong>«Поделиться» ➔ «На экран Домой»</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowIosTip(false)}
            aria-label="Закрыть подсказку"
            className="ml-1 text-white/50 hover:text-white font-bold"
          >
            ✕
          </button>
        </aside>
      )}
    </div>
  );
};

