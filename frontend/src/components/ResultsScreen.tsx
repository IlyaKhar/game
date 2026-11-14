import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Blocks,
  Crown,
  Flame,
  Medal,
  RefreshCw,
  Search,
  Sparkles,
  TrainFront,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { fetchLeaderboard } from '../lib/api';
import type { GameId, LeaderboardCategory, LeaderboardResponse, PlayerSummary } from '../types/festival';

interface ResultsScreenProps {
  currentPlayer: PlayerSummary | null;
  initialCategory?: LeaderboardCategory;
  onBack: () => void;
}

interface RankedGamePlayer extends PlayerSummary {
  gameRank: number;
  gameScore: number;
}

const CATEGORIES: Array<{
  id: LeaderboardCategory;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeClass: string;
}> = [
  {
    id: 'overall',
    title: 'Общий зачёт',
    shortTitle: 'Общий',
    icon: Trophy,
    color: 'text-amber-300',
    activeClass:
      'bg-gradient-to-r from-[#ff2e93] via-[#d946ef] to-[#7c3aed] text-white shadow-[0_0_18px_rgba(255,46,147,0.55)] border-fuchsia-400',
  },
  {
    id: 'dino',
    title: 'Динозаврик 3D',
    shortTitle: 'Динозаврик',
    icon: Flame,
    color: 'text-emerald-400',
    activeClass:
      'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.55)] border-emerald-400',
  },
  {
    id: 'snake',
    title: 'Змейка 3D',
    shortTitle: 'Змейка',
    icon: Sparkles,
    color: 'text-cyan-400',
    activeClass:
      'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_18px_rgba(6,182,212,0.55)] border-cyan-400',
  },
  {
    id: 'gd',
    title: 'Geometry Dash',
    shortTitle: 'GD',
    icon: Zap,
    color: 'text-amber-400',
    activeClass:
      'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-[0_0_18px_rgba(245,158,11,0.55)] border-amber-400',
  },
  {
    id: 'block',
    title: 'Block Blast 3D',
    shortTitle: 'Block Blast',
    icon: Blocks,
    color: 'text-fuchsia-400',
    activeClass:
      'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_18px_rgba(217,70,239,0.55)] border-fuchsia-400',
  },
  {
    id: 'subway',
    title: 'Subway Surfers',
    shortTitle: 'Subway',
    icon: TrainFront,
    color: 'text-rose-400',
    activeClass:
      'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_0_18px_rgba(244,63,94,0.55)] border-rose-400',
  },
  {
    id: 'groups',
    title: 'Рейтинг групп',
    shortTitle: 'Группы',
    icon: Users,
    color: 'text-indigo-400',
    activeClass:
      'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-[0_0_18px_rgba(99,102,241,0.55)] border-indigo-400',
  },
];

const GAME_NAMES: Record<GameId, string> = {
  dino: 'ДИНОЗАВРИК 3D',
  snake: 'ЗМЕЙКА 3D',
  gd: 'GEOMETRY DASH',
  block: 'BLOCK BLAST 3D',
  subway: 'SUBWAY SURFERS FEST',
};

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  currentPlayer,
  initialCategory = 'overall',
  onBack,
}) => {
  const [data, setData] = useState<LeaderboardResponse>({ players: [], groups: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<LeaderboardCategory>(initialCategory);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLeaderboard();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки рейтинга');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const isGameCategory = (cat: LeaderboardCategory): cat is GameId => {
    return ['dino', 'snake', 'gd', 'block', 'subway'].includes(cat);
  };

  // Compute per-game rankings for the selected game
  const rankedGamePlayers: RankedGamePlayer[] = useMemo(() => {
    if (!isGameCategory(category)) return [];
    const gId = category;

    const copy = [...data.players];
    copy.sort((a, b) => {
      const scoreA = a.games[gId] || 0;
      const scoreB = b.games[gId] || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      return a.id - b.id;
    });

    return copy.map((p, idx) => ({
      ...p,
      gameRank: idx + 1,
      gameScore: p.games[gId] || 0,
    }));
  }, [data.players, category]);

  // Filter overall players
  const filteredOverallPlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.players;
    return data.players.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.group_name.toLowerCase().includes(q)
    );
  }, [data.players, query]);

  // Filter game-specific players
  const filteredGamePlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rankedGamePlayers;
    return rankedGamePlayers.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.group_name.toLowerCase().includes(q)
    );
  }, [rankedGamePlayers, query]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.groups;
    return data.groups.filter((g) => g.group_name.toLowerCase().includes(q));
  }, [data.groups, query]);

  // Top 3 Podium: either overall or for current game (only with score > 0)
  const topThree = useMemo(() => {
    if (category === 'overall') {
      return data.players.slice(0, 3).map((p, idx) => ({
        id: p.id,
        rank: idx + 1,
        full_name: p.full_name,
        group_name: p.group_name,
        scoreText: `${p.total_score.toLocaleString('ru-RU')} pts`,
        badge: `${p.games_done}/5 игр`,
      }));
    }
    if (isGameCategory(category)) {
      return rankedGamePlayers
        .filter((p) => p.gameScore > 0)
        .slice(0, 3)
        .map((p, idx) => ({
          id: p.id,
          rank: idx + 1,
          full_name: p.full_name,
          group_name: p.group_name,
          scoreText: `${p.gameScore.toLocaleString('ru-RU')} pts`,
          badge: `В общем топе: #${p.rank}`,
        }));
    }
    // Groups podium
    return data.groups.slice(0, 3).map((g, idx) => ({
      id: idx,
      rank: idx + 1,
      full_name: g.group_name,
      group_name: `${g.players_count} участников`,
      scoreText: `${g.total_score.toLocaleString('ru-RU')} pts`,
      badge: `Ср. балл: ${g.avg_score}`,
    }));
  }, [category, data.players, data.groups, rankedGamePlayers]);

  // Current Player personal stats for active tab
  const personalStats = useMemo(() => {
    if (!currentPlayer) return null;

    if (category === 'overall') {
      return {
        title: 'Твой общий результат в фестивале',
        rank: `#${currentPlayer.rank}`,
        primaryLabel: 'Всего очков',
        primaryValue: currentPlayer.total_score.toLocaleString('ru-RU'),
        secondaryLabel: 'Игр пройдено',
        secondaryValue: `${currentPlayer.games_done}/5`,
      };
    }

    if (isGameCategory(category)) {
      const gId = category;
      const myScore = currentPlayer.games[gId] || 0;
      const myEntry = rankedGamePlayers.find((p) => p.id === currentPlayer.id);
      const leaderScore = rankedGamePlayers[0]?.gameScore || 0;
      const myRank = myScore > 0 && myEntry ? `#${myEntry.gameRank}` : '—';
      const diff = leaderScore > myScore ? leaderScore - myScore : 0;

      return {
        title: `Твой результат в ${GAME_NAMES[gId]}`,
        rank: myRank,
        primaryLabel: 'Рекорд в игре',
        primaryValue: `${myScore.toLocaleString('ru-RU')} pts`,
        secondaryLabel: myScore >= leaderScore && myScore > 0 ? 'Статус' : 'До топ-1',
        secondaryValue:
          myScore >= leaderScore && myScore > 0
            ? 'Лидер! 👑'
            : myScore === 0
            ? 'Не сыграно'
            : `-${diff.toLocaleString('ru-RU')} pts`,
      };
    }

    // Groups tab
    const myGroup = data.groups.find(
      (g) => g.group_name.toUpperCase() === currentPlayer.group_name.toUpperCase()
    );
    return {
      title: `Твоя группа: ${currentPlayer.group_name}`,
      rank: myGroup ? `#${myGroup.rank}` : '—',
      primaryLabel: 'Очки группы',
      primaryValue: myGroup ? myGroup.total_score.toLocaleString('ru-RU') : '0',
      secondaryLabel: 'Участников',
      secondaryValue: myGroup ? `${myGroup.players_count} чел.` : '0',
    };
  }, [currentPlayer, category, rankedGamePlayers, data.groups]);

  // Dynamic screen title based on category
  const screenTitle = useMemo(() => {
    if (category === 'overall') return 'Общий рейтинг фестиваля';
    if (isGameCategory(category)) return `Рейтинг: ${GAME_NAMES[category]}`;
    return 'Рейтинг учебных групп ОКЭИ';
  }, [category]);

  return (
    <div
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 18px)' }}
      className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-6 sm:px-8 sm:pt-6"
    >
      {/* Top Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[44px] items-center gap-2 rounded-full border-2 border-[#ff47b3] bg-[#210942]/90 px-5 py-2 font-display text-xs font-black italic tracking-wider text-white uppercase shadow-[0_0_16px_rgba(255,71,179,0.45)] transition hover:bg-[#331066] active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
          Назад
        </button>

        <h1 className="okei-title-white text-center text-xl uppercase sm:text-3xl">
          {screenTitle}
        </h1>

        <button
          type="button"
          onClick={() => void load()}
          className="flex min-h-[44px] items-center gap-2 rounded-full border border-indigo-400/60 bg-[#1a0b3b]/85 px-4 py-2 text-xs font-bold text-indigo-100 transition hover:bg-indigo-900/60 active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Обновить
        </button>
      </div>

      {/* Category Pills (Overall, 5 Games, Groups) */}
      <nav aria-label="Разделы рейтинга" className="mb-5 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex min-w-max items-center gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.id;

            // Player count badge for category
            let countLabel = '';
            if (cat.id === 'overall') {
              countLabel = String(data.players.length);
            } else if (cat.id === 'groups') {
              countLabel = String(data.groups.length);
            } else {
              const withScore = data.players.filter((p) => (p.games[cat.id as GameId] || 0) > 0).length;
              countLabel = `${withScore}/${data.players.length}`;
            }

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex min-h-[44px] items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-black italic tracking-wide uppercase transition active:scale-95 sm:px-4 sm:text-sm ${
                  isActive
                    ? cat.activeClass
                    : 'border-white/15 bg-[#170833]/85 text-fuchsia-200/80 hover:border-cyan-400/50 hover:bg-[#250d4f] hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : cat.color}`} aria-hidden="true" />
                <span>{cat.title}</span>
                {countLabel && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold not-italic ${
                      isActive ? 'bg-black/35 text-white' : 'bg-white/10 text-fuchsia-300/70'
                    }`}
                  >
                    {countLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Personal Summary Card if logged in */}
      {personalStats && (
        <div className="neon-card-blue mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#160733]/92 px-5 py-4 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-indigo-300 uppercase">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {personalStats.title}
            </div>
            <div className="mt-0.5 text-lg font-extrabold text-white">
              {currentPlayer?.full_name}{' '}
              <span className="ml-1 rounded-md bg-indigo-500/30 px-2 py-0.5 text-xs font-bold text-indigo-200">
                {currentPlayer?.group_name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-fuchsia-200/75">Место</div>
              <div className="font-display text-2xl font-black italic text-amber-300">
                {personalStats.rank}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-fuchsia-200/75">{personalStats.secondaryLabel}</div>
              <div className="font-display text-2xl font-black italic text-white">
                {personalStats.secondaryValue}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-fuchsia-200/75">{personalStats.primaryLabel}</div>
              <div className="font-display text-2xl font-black italic text-pink-400">
                {personalStats.primaryValue}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {topThree.map((item, idx) => {
            const colors = [
              'border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.45)] bg-amber-500/10',
              'border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.3)] bg-slate-400/10',
              'border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.35)] bg-orange-500/10',
            ][idx];
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3.5 rounded-2xl border-2 p-3.5 backdrop-blur-md transition hover:scale-[1.01] ${colors}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/40">
                  {idx === 0 ? (
                    <Crown className="h-7 w-7 text-amber-300" aria-hidden="true" />
                  ) : (
                    <Medal
                      className={`h-7 w-7 ${idx === 1 ? 'text-slate-200' : 'text-orange-300'}`}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs font-black italic text-amber-200 uppercase">
                    <span>{idx + 1} МЕСТО</span>
                    <span className="text-[11px] font-normal not-italic text-fuchsia-200/70">
                      {item.badge}
                    </span>
                  </div>
                  <div className="truncate text-base font-bold text-white">{item.full_name}</div>
                  <div className="text-xs text-indigo-300">{item.group_name}</div>
                  <div className="font-display text-lg font-black italic text-fuchsia-300">
                    {item.scoreText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search Input */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-fuchsia-200/80">
          {category === 'overall' && `Все участники фестиваля (${filteredOverallPlayers.length})`}
          {isGameCategory(category) && `Рейтинг по ${GAME_NAMES[category]} (${filteredGamePlayers.length})`}
          {category === 'groups' && `Все учебные группы колледжа (${filteredGroups.length})`}
        </div>

        <search className="relative w-full sm:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-300"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={category === 'groups' ? 'Поиск по группе...' : 'Поиск по ФИО или группе...'}
            aria-label="Поиск по турнирной таблице"
            className="min-h-[42px] w-full rounded-xl border border-fuchsia-400/40 bg-[#180833]/90 py-2 pl-9 pr-3 text-sm text-white placeholder:text-fuchsia-300/45 focus:border-fuchsia-400 focus:outline-none shadow-inner"
          />
        </search>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-400/50 bg-rose-950/60 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Tables Container */}
      <div className="neon-card-pink flex-1 overflow-x-auto rounded-2xl bg-[#130629]/92 backdrop-blur-xl">
        {/* 1. Overall Category Table */}
        {category === 'overall' && (
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-fuchsia-500/30 bg-[#1f0b42]/90 text-xs font-bold tracking-wider text-fuchsia-200 uppercase">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Участник</th>
                <th className="px-4 py-3.5">Группа</th>
                <th
                  onClick={() => setCategory('dino')}
                  title="Нажмите, чтобы открыть рейтинг Динозаврика"
                  className="cursor-pointer px-3 py-3.5 text-right transition hover:text-emerald-300"
                >
                  Дино ↗
                </th>
                <th
                  onClick={() => setCategory('snake')}
                  title="Нажмите, чтобы открыть рейтинг Змейки"
                  className="cursor-pointer px-3 py-3.5 text-right transition hover:text-cyan-300"
                >
                  Змейка ↗
                </th>
                <th
                  onClick={() => setCategory('gd')}
                  title="Нажмите, чтобы открыть рейтинг Geometry Dash"
                  className="cursor-pointer px-3 py-3.5 text-right transition hover:text-amber-300"
                >
                  GD ↗
                </th>
                <th
                  onClick={() => setCategory('block')}
                  title="Нажмите, чтобы открыть рейтинг Block Blast"
                  className="cursor-pointer px-3 py-3.5 text-right transition hover:text-fuchsia-300"
                >
                  Block ↗
                </th>
                <th
                  onClick={() => setCategory('subway')}
                  title="Нажмите, чтобы открыть рейтинг Subway Surfers"
                  className="cursor-pointer px-3 py-3.5 text-right transition hover:text-rose-300"
                >
                  Subway ↗
                </th>
                <th className="px-4 py-3.5 text-right text-amber-300">Итого</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredOverallPlayers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-fuchsia-200/70">
                    {loading ? 'Загружаем рейтинг...' : 'Пока нет результатов'}
                  </td>
                </tr>
              ) : (
                filteredOverallPlayers.map((p) => {
                  const isMe = currentPlayer?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      className={isMe ? 'bg-fuchsia-500/25 font-semibold' : 'hover:bg-white/5'}
                    >
                      <td className="px-4 py-3 font-display font-black italic text-amber-300">
                        {p.rank}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {p.full_name}
                        {isMe && (
                          <span className="ml-2 rounded bg-fuchsia-500/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                            Вы
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-indigo-200">{p.group_name}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-fuchsia-100/85">
                        {p.games.dino}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-fuchsia-100/85">
                        {p.games.snake}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-fuchsia-100/85">
                        {p.games.gd}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-fuchsia-100/85">
                        {p.games.block}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-fuchsia-100/85">
                        {p.games.subway}
                      </td>
                      <td className="px-4 py-3 text-right font-display text-base font-black italic text-amber-300 tabular-nums">
                        {p.total_score.toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* 2. Specific Game Category Table */}
        {isGameCategory(category) && (
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-fuchsia-500/30 bg-[#1f0b42]/90 text-xs font-bold tracking-wider text-fuchsia-200 uppercase">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Участник</th>
                <th className="px-4 py-3.5">Группа</th>
                <th className="px-4 py-3.5 text-right font-black text-amber-300">
                  Рекорд в {GAME_NAMES[category]}
                </th>
                <th className="px-4 py-3.5 text-right text-fuchsia-200">Сумма всех игр</th>
                <th className="px-4 py-3.5 text-right text-indigo-300">Место в общем топе</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredGamePlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-fuchsia-200/70">
                    {loading ? 'Загружаем результаты игры...' : 'В этой игре пока нет результатов'}
                  </td>
                </tr>
              ) : (
                filteredGamePlayers.map((p) => {
                  const isMe = currentPlayer?.id === p.id;
                  const hasPlayed = p.gameScore > 0;
                  return (
                    <tr
                      key={p.id}
                      className={
                        isMe
                          ? 'bg-fuchsia-500/25 font-semibold'
                          : hasPlayed
                          ? 'hover:bg-white/5'
                          : 'opacity-50 hover:opacity-80'
                      }
                    >
                      <td className="px-4 py-3 font-display font-black italic text-amber-300">
                        {hasPlayed ? p.gameRank : '—'}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {p.full_name}
                        {isMe && (
                          <span className="ml-2 rounded bg-fuchsia-500/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                            Вы
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-indigo-200">{p.group_name}</td>
                      <td className="px-4 py-3 text-right font-display text-base font-black italic text-amber-300 tabular-nums">
                        {p.gameScore.toLocaleString('ru-RU')} pts
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-fuchsia-200/90 font-medium">
                        {p.total_score.toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-indigo-300 font-bold">
                        #{p.rank}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* 3. Groups Category Table */}
        {category === 'groups' && (
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="border-b border-indigo-500/30 bg-[#1f0b42]/90 text-xs font-bold tracking-wider text-indigo-200 uppercase">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Группа</th>
                <th className="px-4 py-3.5 text-right">Участников</th>
                <th className="px-4 py-3.5 text-right">Средний балл</th>
                <th className="px-4 py-3.5 text-right text-amber-300">Сумма очков</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-indigo-200/70">
                    {loading ? 'Загружаем группы...' : 'Группы появятся после первых участников'}
                  </td>
                </tr>
              ) : (
                filteredGroups.map((g) => {
                  const isMyGroup =
                    currentPlayer?.group_name.toUpperCase() === g.group_name.toUpperCase();
                  return (
                    <tr
                      key={g.group_name}
                      className={isMyGroup ? 'bg-indigo-600/30 font-semibold' : 'hover:bg-white/5'}
                    >
                      <td className="px-4 py-3 font-display font-black italic text-amber-300">
                        {g.rank}
                      </td>
                      <td className="px-4 py-3 font-bold text-white">
                        {g.group_name}
                        {isMyGroup && (
                          <span className="ml-2 rounded bg-indigo-500/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                            Твоя группа
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-indigo-200">
                        {g.players_count}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-indigo-100">
                        {g.avg_score.toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-3 text-right font-display text-base font-black italic text-amber-300 tabular-nums">
                        {g.total_score.toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
