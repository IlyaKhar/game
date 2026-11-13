import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { CollegeSceneBg } from './components/art/CollegeSceneBg';
import { EntryScreen } from './components/EntryScreen';
import { GameArena } from './components/GameArena';
import { HubScreen } from './components/HubScreen';
import {
  clearPlayerToken,
  enterFestival,
  fetchMe,
  getPlayerToken,
  submitGameScore,
} from './lib/api';
import { FESTIVAL_GAMES, type GameId, type PlayerSummary } from './types/festival';

const ResultsScreen = React.lazy(() =>
  import('./components/ResultsScreen').then((m) => ({ default: m.ResultsScreen }))
);
const AdminScreen = React.lazy(() =>
  import('./components/AdminScreen').then((m) => ({ default: m.AdminScreen }))
);
const DinoGame = React.lazy(() =>
  import('./games/DinoGame').then((m) => ({ default: m.DinoGame }))
);
const SnakeGame = React.lazy(() =>
  import('./games/SnakeGame').then((m) => ({ default: m.SnakeGame }))
);
const GeometryDashGame = React.lazy(() =>
  import('./games/GeometryDashGame').then((m) => ({ default: m.GeometryDashGame }))
);
const BlockBlastGame = React.lazy(() =>
  import('./games/BlockBlastGame').then((m) => ({ default: m.BlockBlastGame }))
);
const FestivalRunnerGame = React.lazy(() =>
  import('./games/FestivalRunnerGame').then((m) => ({ default: m.FestivalRunnerGame }))
);

type ViewState =
  | { kind: 'entry' }
  | { kind: 'hub' }
  | { kind: 'game'; gameId: GameId }
  | { kind: 'results'; returnTo: 'entry' | 'hub' }
  | { kind: 'admin'; returnTo: 'entry' | 'hub' };

function getInitialView(): ViewState {
  if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
    return { kind: 'admin', returnTo: getPlayerToken() ? 'hub' : 'entry' };
  }
  return { kind: 'entry' };
}

export function App() {
  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<ViewState>(getInitialView);

  const refreshMe = useCallback(async () => {
    if (!getPlayerToken()) {
      setPlayer(null);
      return;
    }
    try {
      const me = await fetchMe();
      setPlayer(me);
    } catch {
      clearPlayerToken();
      setPlayer(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (getPlayerToken()) {
        try {
          const me = await fetchMe();
          setPlayer(me);
          setView((prev) => (prev.kind === 'admin' ? prev : { kind: 'hub' }));
        } catch {
          clearPlayerToken();
        }
      }
      setBooting(false);
    })();
  }, []);

  const handleEnter = async (fullName: string, groupName: string) => {
    const me = await enterFestival(fullName, groupName);
    setPlayer(me);
    setView({ kind: 'hub' });
  };

  const handleBackToLogin = () => {
    clearPlayerToken();
    setPlayer(null);
    setView({ kind: 'entry' });
  };

  const openAdmin = () => {
    setView({ kind: 'admin', returnTo: player ? 'hub' : 'entry' });
  };

  const handleScoreSaved = async (gameId: GameId, score: number) => {
    try {
      const updated = await submitGameScore(gameId, score);
      setPlayer(updated);
    } catch {
      // Keep playable even if offline briefly
    }
  };

  if (booting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#120724]">
        <CollegeSceneBg dimmed />
        <div className="font-display animate-pulse text-xl font-black italic text-fuchsia-300 uppercase">
          Загружаем ОКЭИ: Новый Уровень...
        </div>
      </div>
    );
  }

  const activeGameMeta =
    view.kind === 'game' ? FESTIVAL_GAMES.find((g) => g.id === view.gameId) : undefined;

  return (
    <div className="relative min-h-dvh">
      <CollegeSceneBg dimmed={view.kind !== 'hub'} />

      <div className="relative z-10 min-h-dvh">
        <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center">
            <span className="font-display text-lg font-black italic text-fuchsia-200 uppercase">
              Загрузка модуля...
            </span>
          </div>
        }
      >
        {view.kind === 'entry' && (
          <EntryScreen
            onEnter={handleEnter}
            onViewLeaderboard={() => setView({ kind: 'results', returnTo: 'entry' })}
            onSecretAdmin={openAdmin}
          />
        )}

        {view.kind === 'hub' && player && (
          <HubScreen
            player={player}
            onPlayGame={(gameId) => setView({ kind: 'game', gameId })}
            onBackToLogin={handleBackToLogin}
            onOpenResults={() => setView({ kind: 'results', returnTo: 'hub' })}
            onSecretAdmin={openAdmin}
          />
        )}

        {view.kind === 'results' && (
          <ResultsScreen
            currentPlayer={player}
            onBack={() => setView({ kind: view.returnTo === 'hub' && player ? 'hub' : 'entry' })}
          />
        )}

        {view.kind === 'admin' && (
          <AdminScreen
            onBack={() => {
              if (window.location.pathname === '/admin') {
                window.history.replaceState({}, '', '/');
              }
              setView({ kind: view.returnTo === 'hub' && player ? 'hub' : 'entry' });
            }}
            onRefreshMe={refreshMe}
          />
        )}

        {view.kind === 'game' && activeGameMeta && player && (
          <GameArena
            game={activeGameMeta}
            player={player}
            onExit={() => setView({ kind: 'hub' })}
            onOpenResults={() => setView({ kind: 'results', returnTo: 'hub' })}
            onScoreSaved={(score) => handleScoreSaved(activeGameMeta.id, score)}
          >
            {({ onScoreSubmit, runKey, bestScore, isNewRecord }) => {
              const common = {
                onGameOver: onScoreSubmit,
                bestScore,
                isNewRecord,
              };
              switch (activeGameMeta.id) {
                case 'dino':
                  return <DinoGame key={runKey} {...common} />;
                case 'snake':
                  return <SnakeGame key={runKey} {...common} />;
                case 'gd':
                  return <GeometryDashGame key={runKey} {...common} />;
                case 'block':
                  return <BlockBlastGame key={runKey} {...common} />;
                case 'subway':
                  return <FestivalRunnerGame key={runKey} {...common} />;
              }
            }}
          </GameArena>
        )}
        </Suspense>
      </div>
    </div>
  );
}

export default App;

