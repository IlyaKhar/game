import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Crown, Medal, RefreshCw, Search, Trophy, Users } from 'lucide-react';
import { fetchLeaderboard } from '../lib/api';
import type { LeaderboardResponse, PlayerSummary } from '../types/festival';

interface ResultsScreenProps {
  currentPlayer: PlayerSummary | null;
  onBack: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ currentPlayer, onBack }) => {
  const [data, setData] = useState<LeaderboardResponse>({ players: [], groups: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'players' | 'groups'>('players');
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

  const filteredPlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.players;
    return data.players.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.group_name.toLowerCase().includes(q)
    );
  }, [data.players, query]);

  const topThree = data.players.slice(0, 3);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-8">
      {/* Top Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[44px] items-center gap-2 rounded-full border-2 border-[#ff47b3] bg-[#210942]/90 px-5 py-2 font-display text-xs font-black italic tracking-wider text-white uppercase shadow-[0_0_16px_rgba(255,71,179,0.45)] transition hover:bg-[#331066]"
        >
          <ArrowLeft className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
          Назад
        </button>

        <h1 className="okei-title-white text-center text-2xl uppercase sm:text-4xl">
          Общий результат фестиваля
        </h1>

        <button
          type="button"
          onClick={() => void load()}
          className="flex min-h-[44px] items-center gap-2 rounded-full border border-indigo-400/60 bg-[#1a0b3b]/85 px-4 py-2 text-xs font-bold text-indigo-100 transition hover:bg-indigo-900/60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Обновить
        </button>
      </div>

      {/* Personal Summary Card if logged in */}
      {currentPlayer && (
        <div className="neon-card-blue mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#160733]/90 px-5 py-4 backdrop-blur-md">
          <div>
            <div className="text-xs font-semibold tracking-wider text-indigo-300 uppercase">
              Твой текущий результат
            </div>
            <div className="mt-0.5 text-lg font-extrabold text-white">
              {currentPlayer.full_name}{' '}
              <span className="ml-1 rounded-md bg-indigo-500/30 px-2 py-0.5 text-xs font-bold text-indigo-200">
                {currentPlayer.group_name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-fuchsia-200/75">Место</div>
              <div className="font-display text-2xl font-black italic text-amber-300">
                #{currentPlayer.rank}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-fuchsia-200/75">Игр пройдено</div>
              <div className="font-display text-2xl font-black italic text-white">
                {currentPlayer.games_done}/5
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-fuchsia-200/75">Всего очков</div>
              <div className="font-display text-2xl font-black italic text-pink-400">
                {currentPlayer.total_score.toLocaleString('ru-RU')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {topThree.map((p, idx) => {
            const colors = [
              'border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.45)] bg-amber-500/10',
              'border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.3)] bg-slate-400/10',
              'border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.35)] bg-orange-500/10',
            ][idx];
            return (
              <div
                key={p.id}
                className={`flex items-center gap-4 rounded-2xl border-2 p-4 backdrop-blur-md ${colors}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/35">
                  {idx === 0 ? (
                    <Crown className="h-7 w-7 text-amber-300" aria-hidden="true" />
                  ) : (
                    <Medal className={`h-7 w-7 ${idx === 1 ? 'text-slate-200' : 'text-orange-300'}`} aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xs font-black italic text-amber-200 uppercase">
                    {idx + 1} место • {p.group_name}
                  </div>
                  <div className="truncate text-base font-bold text-white">{p.full_name}</div>
                  <div className="font-display text-xl font-black italic text-fuchsia-300">
                    {p.total_score.toLocaleString('ru-RU')} pts
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs + Search */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('players')}
            className={`flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === 'players'
                ? 'bg-gradient-to-r from-[#ff2e93] to-[#a855f7] text-white shadow-[0_0_16px_rgba(255,46,147,0.5)]'
                : 'border border-white/15 bg-[#1b0938]/80 text-fuchsia-200 hover:bg-[#2a1054]'
            }`}
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Личный зачёт ({data.players.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('groups')}
            className={`flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === 'groups'
                ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white shadow-[0_0_16px_rgba(99,102,241,0.5)]'
                : 'border border-white/15 bg-[#1b0938]/80 text-fuchsia-200 hover:bg-[#2a1054]'
            }`}
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Рейтинг групп ({data.groups.length})
          </button>
        </div>

        {tab === 'players' && (
          <search className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-300" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по ФИО или группе..."
              aria-label="Поиск по ФИО или группе"
              className="min-h-[42px] w-full rounded-xl border border-fuchsia-400/40 bg-[#180833]/90 py-2 pl-9 pr-3 text-sm text-white placeholder:text-fuchsia-300/45 focus:border-fuchsia-400 focus:outline-none"
            />
          </search>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-400/50 bg-rose-950/60 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="neon-card-pink flex-1 overflow-x-auto rounded-2xl bg-[#130629]/92 backdrop-blur-xl">
        {tab === 'players' ? (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-fuchsia-500/30 bg-[#1f0b42]/90 text-xs font-bold tracking-wider text-fuchsia-200 uppercase">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Участник</th>
                <th className="px-4 py-3.5">Группа</th>
                <th className="px-3 py-3.5 text-right">Дино</th>
                <th className="px-3 py-3.5 text-right">Змейка</th>
                <th className="px-3 py-3.5 text-right">GD</th>
                <th className="px-3 py-3.5 text-right">Block</th>
                <th className="px-3 py-3.5 text-right">Subway</th>
                <th className="px-4 py-3.5 text-right text-amber-300">Итого</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-fuchsia-200/70">
                    {loading ? 'Загружаем рейтинг...' : 'Пока нет результатов'}
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((p) => {
                  const isMe = currentPlayer?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      className={isMe ? 'bg-fuchsia-500/20 font-semibold' : 'hover:bg-white/5'}
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
                      <td className="px-3 py-3 text-right tabular-nums text-fuchsia-100/85">{p.games.dino}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-fuchsia-100/85">{p.games.snake}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-fuchsia-100/85">{p.games.gd}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-fuchsia-100/85">{p.games.block}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-fuchsia-100/85">{p.games.subway}</td>
                      <td className="px-4 py-3 text-right font-display text-base font-black italic text-amber-300 tabular-nums">
                        {p.total_score.toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[520px] text-left text-sm">
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
              {data.groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-indigo-200/70">
                    {loading ? 'Загружаем группы...' : 'Группы появятся после первых участников'}
                  </td>
                </tr>
              ) : (
                data.groups.map((g) => (
                  <tr key={g.group_name} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-display font-black italic text-amber-300">{g.rank}</td>
                    <td className="px-4 py-3 font-bold text-white">{g.group_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-indigo-200">{g.players_count}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-indigo-100">
                      {g.avg_score.toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-right font-display text-base font-black italic text-amber-300 tabular-nums">
                      {g.total_score.toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

