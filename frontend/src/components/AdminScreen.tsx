import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Flame,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  adminCreatePlayer,
  adminDeletePlayer,
  adminListPlayers,
  adminLogin,
  adminResetAll,
  adminUpdatePlayer,
  clearAdminToken,
  getAdminToken,
} from '../lib/api';
import type { PlayerSummary } from '../types/festival';

interface AdminScreenProps {
  onBack: () => void;
  onRefreshMe: () => Promise<void>;
}

interface DraftRow {
  dino: string;
  snake: string;
  gd: string;
  block: string;
  subway: string;
  bonus_score: string;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ onBack, onRefreshMe }) => {
  const [authed, setAuthed] = useState<boolean>(Boolean(getAdminToken()));
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Quick add player
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');

  const resetDialogRef = useRef<HTMLDialogElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const res = await adminListPlayers();
      setPlayers(res.players);
      const nextDrafts: Record<number, DraftRow> = {};
      for (const p of res.players) {
        nextDrafts[p.id] = {
          dino: String(p.games.dino),
          snake: String(p.games.snake),
          gd: String(p.games.gd),
          block: String(p.games.block),
          subway: String(p.games.subway),
          bonus_score: String(p.bonus_score),
        };
      }
      setDrafts(nextDrafts);
    } catch (err) {
      clearAdminToken();
      setAuthed(false);
      setAuthError(err instanceof Error ? err.message : 'Сессия админа истекла');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) {
      void loadPlayers();
    }
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await adminLogin(password);
      setPassword('');
      setAuthed(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Ошибка входа');
    }
  };

  const updateDraftField = (id: number, field: keyof DraftRow, val: string) => {
    setDrafts((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, [field]: val } };
    });
  };

  const handleSaveRow = async (id: number) => {
    const d = drafts[id];
    if (!d) return;
    try {
      await adminUpdatePlayer(id, {
        dino: Math.max(0, parseInt(d.dino || '0', 10) || 0),
        snake: Math.max(0, parseInt(d.snake || '0', 10) || 0),
        gd: Math.max(0, parseInt(d.gd || '0', 10) || 0),
        block: Math.max(0, parseInt(d.block || '0', 10) || 0),
        subway: Math.max(0, parseInt(d.subway || '0', 10) || 0),
        bonus_score: parseInt(d.bonus_score || '0', 10) || 0,
      });
      await loadPlayers();
      await onRefreshMe();
      showToast('Очки сохранены!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const handleQuickBoost = async (p: PlayerSummary, delta: number) => {
    try {
      await adminUpdatePlayer(p.id, { bonus_score: p.bonus_score + delta });
      await loadPlayers();
      await onRefreshMe();
      showToast(`+${delta} очков для ${p.full_name}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка накрутки');
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim().length < 2 || newGroup.trim().length < 2) return;
    try {
      await adminCreatePlayer({
        full_name: newName.trim(),
        group_name: newGroup.trim(),
      });
      setNewName('');
      setNewGroup('');
      await loadPlayers();
      showToast('Участник добавлен');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка создания');
    }
  };

  const handleDelete = async (p: PlayerSummary) => {
    try {
      await adminDeletePlayer(p.id);
      await loadPlayers();
      showToast(`Удалён: ${p.full_name}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const openResetModal = () => {
    const dialog = resetDialogRef.current;
    if (!dialog) return;
    dialog.returnValue = '';
    dialog.showModal();
  };

  const handleResetDialogClose = async () => {
    const dialog = resetDialogRef.current;
    if (!dialog) return;
    const action = dialog.returnValue;
    dialog.returnValue = '';
    if (action === 'confirm-reset') {
      try {
        await adminResetAll();
        await loadPlayers();
        await onRefreshMe();
        showToast('Все результаты сброшены');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Ошибка сброса');
      }
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.group_name.toLowerCase().includes(q)
    );
  }, [players, query]);

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-400/50 bg-[#1a0836]/90 px-4 py-2 text-xs font-bold text-fuchsia-200 hover:bg-[#2a1054]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Назад
        </button>

        <div className="neon-card-pink rounded-3xl bg-[#15062d]/92 p-7 backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-500/20 text-fuchsia-300">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-xl font-black italic text-white uppercase">
                Админ-панель ОКЭИ
              </h1>
              <p className="text-xs text-fuchsia-200/75">Управление рейтингом и бонусами</p>
            </div>
          </div>

          <form method="POST" onSubmit={handleLogin} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-pass" className="text-sm font-semibold text-fuchsia-100">
                Пароль администратора
              </label>
              <input
                id="admin-pass"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль..."
                className="fest-input rounded-xl border-2 border-fuchsia-500/45 bg-[#230c47] px-4 py-2.5 text-white focus:border-fuchsia-400 focus:outline-none"
              />
            </div>

            {authError && (
              <div role="alert" className="text-xs font-medium text-rose-300">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="font-display min-h-[48px] w-full rounded-xl bg-gradient-to-r from-[#ff2e93] to-[#7c3aed] px-5 py-2.5 text-sm font-black italic text-white uppercase shadow-[0_0_18px_rgba(255,46,147,0.5)]"
            >
              Войти в панель
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-6 sm:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-[42px] items-center gap-2 rounded-full border border-fuchsia-400/60 bg-[#210942]/90 px-4 py-2 text-xs font-bold text-white hover:bg-[#331066]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            В хаб
          </button>
          <h1 className="font-display text-xl font-black italic text-white uppercase sm:text-2xl">
            Админка • Управление очками
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadPlayers()}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-indigo-400/50 bg-[#1a0b3b] px-3.5 py-2 text-xs font-bold text-indigo-100 hover:bg-indigo-900/50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Обновить
          </button>
          <button
            type="button"
            onClick={openResetModal}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-rose-400/50 bg-rose-950/60 px-3.5 py-2 text-xs font-bold text-rose-200 hover:bg-rose-900/70"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Сбросить всё
          </button>
          <button
            type="button"
            onClick={() => {
              clearAdminToken();
              setAuthed(false);
            }}
            className="min-h-[40px] rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-fuchsia-200 hover:bg-white/10"
          >
            Выйти
          </button>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-400/60 bg-emerald-950/95 px-4 py-2.5 text-sm font-bold text-emerald-200 shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* Quick Add Player + Search */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form
          onSubmit={handleCreatePlayer}
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-400/35 bg-[#170833]/90 p-3.5"
        >
          <UserPlus className="h-4 w-4 text-indigo-300" aria-hidden="true" />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ФИО участника"
            className="min-h-[40px] flex-1 rounded-lg border border-white/15 bg-[#230e4a] px-3 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
          />
          <input
            type="text"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            placeholder="Группа"
            className="min-h-[40px] w-28 rounded-lg border border-white/15 bg-[#230e4a] px-3 text-sm text-white uppercase placeholder:normal-case placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="submit"
            className="flex min-h-[40px] items-center gap-1 rounded-lg bg-indigo-500 px-3.5 text-xs font-bold text-white hover:bg-indigo-400"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Добавить
          </button>
        </form>

        <search className="flex items-center gap-2 rounded-2xl border border-fuchsia-400/35 bg-[#170833]/90 p-3.5">
          <Search className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти студента для накрутки или правки..."
            className="min-h-[40px] w-full bg-transparent text-sm text-white placeholder:text-fuchsia-200/45 focus:outline-none"
          />
        </search>
      </div>

      {/* Editable Players Table */}
      <div className="neon-card-blue overflow-x-auto rounded-2xl bg-[#130629]/95 backdrop-blur-xl">
        <table className="w-full min-w-[1040px] text-left text-xs sm:text-sm">
          <thead className="border-b border-indigo-500/30 bg-[#1f0b42]/90 text-[11px] font-bold tracking-wider text-indigo-200 uppercase">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">ФИО / Группа</th>
              <th className="px-2 py-3">Дино</th>
              <th className="px-2 py-3">Змейка</th>
              <th className="px-2 py-3">GD</th>
              <th className="px-2 py-3">Block</th>
              <th className="px-2 py-3">Subway</th>
              <th className="px-2 py-3 text-amber-300">Бонус</th>
              <th className="px-3 py-3 text-right">Итого</th>
              <th className="px-3 py-3 text-right">Быстрая накрутка / Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.map((p) => {
              const d = drafts[p.id];
              if (!d) return null;
              return (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-3 py-2.5 font-display font-black italic text-amber-300">{p.rank}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-white">{p.full_name}</div>
                    <div className="text-xs text-indigo-300">{p.group_name}</div>
                  </td>
                  {(['dino', 'snake', 'gd', 'block', 'subway', 'bonus_score'] as const).map((field) => (
                    <td key={field} className="px-1.5 py-2">
                      <input
                        type="number"
                        value={d[field]}
                        onChange={(e) => updateDraftField(p.id, field, e.target.value)}
                        className={`w-20 rounded-lg border bg-[#220c45] px-2 py-1.5 text-right tabular-nums text-white focus:outline-none ${
                          field === 'bonus_score'
                            ? 'border-amber-400/50 text-amber-200 focus:border-amber-300'
                            : 'border-white/15 focus:border-fuchsia-400'
                        }`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-display text-base font-black italic text-fuchsia-300 tabular-nums">
                    {p.total_score.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleQuickBoost(p, 500)}
                        title="Быстро добавить +500 бонусных очков"
                        className="flex items-center gap-0.5 rounded-lg border border-amber-400/50 bg-amber-500/20 px-2 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/35"
                      >
                        <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                        +500
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleQuickBoost(p, 2000)}
                        title="Быстро добавить +2000 бонусных очков"
                        className="rounded-lg border border-fuchsia-400/50 bg-fuchsia-500/20 px-2 py-1.5 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-500/35"
                      >
                        +2000
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveRow(p.id)}
                        title="Сохранить введённые значения"
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        <Save className="h-3.5 w-3.5" aria-hidden="true" />
                        Ок
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(p)}
                        title="Удалить участника"
                        aria-label={`Удалить ${p.full_name}`}
                        className="rounded-lg bg-rose-600/80 p-1.5 text-white hover:bg-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-indigo-200/70">
                  Участники не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Native <dialog> confirmation modal per modern-web-guidance */}
      <dialog
        ref={resetDialogRef}
        aria-labelledby="reset-dialog-title"
        onClose={() => void handleResetDialogClose()}
        className="m-auto w-full max-w-md rounded-2xl border-2 border-rose-400/70 bg-[#1a0736] p-6 text-white shadow-2xl"
      >
        <h2 id="reset-dialog-title" className="font-display text-lg font-black italic uppercase text-rose-300">
          Сбросить все результаты?
        </h2>
        <p className="mt-2 text-sm text-fuchsia-100/85">
          Это действие безвозвратно удалит всех участников и все набранные очки в таблице лидеров.
        </p>
        <form method="dialog" className="mt-6 flex justify-end gap-3">
          <button
            value="cancel"
            autoFocus
            className="min-h-[42px] rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
          >
            Отмена
          </button>
          <button
            value="confirm-reset"
            className="min-h-[42px] rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500"
          >
            Удалить всё
          </button>
        </form>
      </dialog>
    </div>
  );
};

