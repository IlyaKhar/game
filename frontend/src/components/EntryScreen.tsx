import React, { useRef, useState } from 'react';
import { Gamepad2, Sparkles, Trophy, UserCheck, Users } from 'lucide-react';
import { BrandHeader } from './BrandHeader';
import { SloganBadge } from './SloganBadge';

interface EntryScreenProps {
  onEnter: (fullName: string, groupName: string) => Promise<void>;
  onViewLeaderboard: () => void;
  onSecretAdmin: () => void;
}

export const EntryScreen: React.FC<EntryScreenProps> = ({
  onEnter,
  onViewLeaderboard,
  onSecretAdmin,
}) => {
  const [fullName, setFullName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [groupInvalid, setGroupInvalid] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

    const trimmedName = fullName.trim();
    const trimmedGroup = groupName.trim();

    const badName = trimmedName.length < 3;
    const badGroup = trimmedGroup.length < 2;
    setNameInvalid(badName);
    setGroupInvalid(badGroup);

    if (badName) {
      nameRef.current?.focus();
      return;
    }
    if (badGroup) {
      groupRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onEnter(trimmedName, trimmedGroup);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col justify-between">
      <BrandHeader player={null} onSecretAdmin={onSecretAdmin} />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-6">
        <section
          aria-labelledby="entry-heading"
          className="neon-card-pink w-full rounded-3xl bg-[#160730]/88 p-6 backdrop-blur-xl sm:p-8"
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/50 bg-fuchsia-500/15 px-3.5 py-1 text-xs font-bold tracking-wider text-fuchsia-200 uppercase">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              Регистрация участника
            </div>
            <h2
              id="entry-heading"
              className="font-display text-2xl font-black italic tracking-tight text-white uppercase sm:text-3xl"
            >
              Выйди на новый уровень
            </h2>
            <p className="mt-1.5 text-sm text-fuchsia-200/85">
              Укажи свои ФИО и группу — результаты всех 5 игр пойдут в общий зачёт колледжа.
            </p>
          </div>

          <form method="POST" onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="student-fullname"
                className="flex items-center gap-2 text-sm font-semibold text-fuchsia-100"
              >
                <UserCheck className="h-4 w-4 text-fuchsia-400" aria-hidden="true" />
                ФИО <span aria-hidden="true" className="text-pink-400">*</span>
              </label>
              <span id="fullname-hint" className="text-xs text-fuchsia-300/75">
                Например: Иванов Иван Иванович (от 3 символов)
              </span>
              <input
                ref={nameRef}
                id="student-fullname"
                name="full_name"
                type="text"
                required
                minLength={3}
                maxLength={120}
                autoComplete="name"
                enterKeyHint="next"
                aria-describedby="fullname-hint"
                aria-invalid={nameInvalid}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (nameInvalid && e.target.value.trim().length >= 3) {
                    setNameInvalid(false);
                  }
                }}
                onBlur={() => {
                  if (fullName.length > 0 && fullName.trim().length < 3) {
                    setNameInvalid(true);
                  }
                }}
                placeholder="Фамилия Имя Отчество"
                className={`fest-input w-full rounded-xl border-2 bg-[#230c47]/80 px-4 py-3 text-white placeholder:text-fuchsia-300/40 transition ${
                  nameInvalid ? 'user-invalid-fallback border-rose-400' : 'border-fuchsia-500/45 focus:border-fuchsia-400'
                }`}
              />
              {nameInvalid && (
                <div className="fest-error-msg !flex items-center gap-1.5 text-xs font-medium text-rose-300" role="alert">
                  Введите ФИО полностью (минимум 3 символа).
                </div>
              )}
            </div>

            {/* Student Group */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="student-group"
                className="flex items-center gap-2 text-sm font-semibold text-fuchsia-100"
              >
                <Users className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                Учебная группа <span aria-hidden="true" className="text-pink-400">*</span>
              </label>
              <span id="group-hint" className="text-xs text-fuchsia-300/75">
                Формат: ИСП-31, БД-21, ЭК-11
              </span>
              <input
                ref={groupRef}
                id="student-group"
                name="group_name"
                type="text"
                required
                minLength={2}
                maxLength={40}
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                aria-describedby="group-hint"
                aria-invalid={groupInvalid}
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  if (groupInvalid && e.target.value.trim().length >= 2) {
                    setGroupInvalid(false);
                  }
                }}
                onBlur={() => {
                  if (groupName.length > 0 && groupName.trim().length < 2) {
                    setGroupInvalid(true);
                  }
                }}
                placeholder="Впиши свою группу"
                className={`fest-input w-full rounded-xl border-2 bg-[#230c47]/80 px-4 py-3 text-white uppercase placeholder:normal-case placeholder:text-fuchsia-300/40 transition ${
                  groupInvalid ? 'user-invalid-fallback border-rose-400' : 'border-indigo-400/50 focus:border-indigo-300'
                }`}
              />
              {groupInvalid && (
                <div className="fest-error-msg !flex items-center gap-1.5 text-xs font-medium text-rose-300" role="alert">
                  Укажите номер группы (минимум 2 символа).
                </div>
              )}
            </div>

            {serverError && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-rose-400/60 bg-rose-950/60 px-4 py-2.5 text-sm font-medium text-rose-200"
              >
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="font-display flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#ff2e93] via-[#d946ef] to-[#7c3aed] px-6 py-3.5 text-base font-black italic tracking-wide text-white uppercase shadow-[0_0_24px_rgba(255,46,147,0.65)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              <Gamepad2 className="h-5 w-5" aria-hidden="true" />
              {submitting ? 'Загружаем арену...' : 'Начать фестиваль'}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-fuchsia-200/75">
            <span>5 игр • общий рейтинг</span>
            <button
              type="button"
              onClick={onViewLeaderboard}
              className="inline-flex items-center gap-1.5 font-semibold text-amber-300 transition hover:text-amber-200"
            >
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              Смотреть таблицу лидеров
            </button>
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-end px-4 pb-5 sm:px-8">
        <SloganBadge />
      </footer>
    </div>
  );
};

