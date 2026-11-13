import React, { useRef, useState } from 'react';
import { Gamepad2, Trophy, UserCheck, Users } from 'lucide-react';
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
  const [nameError, setNameError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLInputElement>(null);

  const validateName = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return 'Введите Фамилию и Имя';
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2 || parts.length > 3) {
      return 'Введите Фамилию и Имя через пробел';
    }
    if (parts[0] && parts[1] && parts[0].toLowerCase() === parts[1].toLowerCase()) {
      return 'Фамилия и Имя не могут совпадать';
    }
    for (const part of parts) {
      if (part.length < 2) {
        return 'Каждое слово в ФИО должно содержать минимум 2 буквы';
      }
      if (!/^[а-яёА-ЯЁ\-]+$/.test(part)) {
        return 'ФИО должно содержать только русские буквы';
      }
    }
    return null;
  };

  const validateGroup = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return 'Укажите учебную группу';
    if (trimmed.length < 2 || trimmed.length > 20) {
      return 'Группа должна быть от 2 до 20 символов';
    }
    if (!/^[а-яёА-ЯЁa-zA-Z0-9\-]+$/.test(trimmed)) {
      return 'Группа может содержать только буквы, цифры и дефис (например: ИСП-21)';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

    const trimmedName = fullName.trim();
    const trimmedGroup = groupName.trim();

    const errName = validateName(trimmedName);
    const errGroup = validateGroup(trimmedGroup);
    setNameError(errName);
    setGroupError(errGroup);

    if (errName) {
      nameRef.current?.focus();
      return;
    }
    if (errGroup) {
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

      <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col items-center justify-center px-4 py-3">
        <section
          aria-labelledby="entry-heading"
          className="relative w-full overflow-hidden rounded-[28px] border-2 border-[#ff47b3]/85 bg-gradient-to-b from-[#1a0738]/92 via-[#13052b]/95 to-[#1d083d]/92 p-6 shadow-[0_18px_50px_rgba(8,2,20,0.9),0_0_32px_rgba(255,46,147,0.38)] backdrop-blur-xl sm:p-8"
        >
          {/* Top neon highlight */}
          <div
            className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff66d9] to-transparent opacity-90"
            aria-hidden="true"
          />

          <div className="mb-6 text-center">
            <h2
              id="entry-heading"
              className="font-display text-[26px] font-black italic leading-[1.02] tracking-tight text-white uppercase drop-shadow-[0_3px_12px_rgba(0,0,0,0.7)] sm:text-[32px]"
            >
              ВЫЙДИ НА{' '}
              <span className="block text-[#ff47b3] drop-shadow-[0_0_16px_rgba(255,71,179,0.65)]">
                НОВЫЙ УРОВЕНЬ
              </span>
            </h2>
            <p className="mt-2 text-xs font-medium text-fuchsia-200/80 sm:text-sm">
              Введи ФИО и группу — очки всех 5 игр пойдут в рейтинг
            </p>
          </div>

          <form method="POST" onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="student-fullname"
                className="flex items-center gap-2 font-display text-xs font-extrabold italic tracking-wide text-fuchsia-100 uppercase sm:text-sm"
              >
                <UserCheck className="h-4 w-4 text-[#ff47b3]" aria-hidden="true" />
                ФИО <span aria-hidden="true" className="text-pink-400">*</span>
              </label>
              <input
                ref={nameRef}
                id="student-fullname"
                name="full_name"
                type="text"
                required
                minLength={5}
                maxLength={80}
                autoComplete="name"
                enterKeyHint="next"
                aria-invalid={!!nameError}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                onBlur={() => {
                  if (fullName.trim()) {
                    setNameError(validateName(fullName));
                  }
                }}
                placeholder="Иванов Иван Иванович"
                className={`fest-input w-full rounded-2xl border-2 bg-[#210a42]/90 px-4 py-3.5 text-white placeholder:text-fuchsia-300/40 shadow-inner transition focus:outline-none ${
                  nameError
                    ? 'user-invalid-fallback border-rose-400'
                    : 'border-fuchsia-500/45 focus:border-[#ff47b3] focus:shadow-[0_0_18px_rgba(255,71,179,0.3)]'
                }`}
              />
              {nameError && (
                <div className="fest-error-msg !flex items-center gap-1.5 text-xs font-medium text-rose-300" role="alert">
                  {nameError}
                </div>
              )}
            </div>

            {/* Student Group */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="student-group"
                className="flex items-center gap-2 font-display text-xs font-extrabold italic tracking-wide text-fuchsia-100 uppercase sm:text-sm"
              >
                <Users className="h-4 w-4 text-[#38bdf8]" aria-hidden="true" />
                Учебная группа <span aria-hidden="true" className="text-pink-400">*</span>
              </label>
              <input
                ref={groupRef}
                id="student-group"
                name="group_name"
                type="text"
                required
                minLength={2}
                maxLength={20}
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                aria-invalid={!!groupError}
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  if (groupError) setGroupError(null);
                }}
                onBlur={() => {
                  if (groupName.trim()) {
                    setGroupError(validateGroup(groupName));
                  }
                }}
                placeholder="Например: ИСП-31"
                className={`fest-input w-full rounded-2xl border-2 bg-[#210a42]/90 px-4 py-3.5 text-white uppercase placeholder:normal-case placeholder:text-fuchsia-300/40 shadow-inner transition focus:outline-none ${
                  groupError
                    ? 'user-invalid-fallback border-rose-400'
                    : 'border-indigo-400/50 focus:border-[#38bdf8] focus:shadow-[0_0_18px_rgba(56,189,248,0.28)]'
                }`}
              />
              {groupError && (
                <div className="fest-error-msg !flex items-center gap-1.5 text-xs font-medium text-rose-300" role="alert">
                  {groupError}
                </div>
              )}
            </div>

            {serverError && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-2xl border border-rose-400/60 bg-rose-950/60 px-4 py-2.5 text-sm font-medium text-rose-200"
              >
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="font-display mt-2 flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#ff2e93] via-[#d946ef] to-[#7c3aed] px-6 py-3.5 text-base font-black italic tracking-wide text-white uppercase shadow-[0_0_26px_rgba(255,46,147,0.65)] transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              <Gamepad2 className="h-5 w-5" aria-hidden="true" />
              {submitting ? 'Загружаем арену...' : 'Начать фестиваль'}
            </button>
          </form>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-4 px-4 pb-5 sm:px-8">
        <button
          type="button"
          onClick={onViewLeaderboard}
          className="flex min-h-[44px] items-center gap-2 rounded-full border-2 border-indigo-400/80 bg-[#1a0b3b]/90 px-5 py-2 font-display text-xs font-black italic tracking-wider text-white uppercase shadow-[0_0_16px_rgba(99,102,241,0.45)] transition hover:border-amber-300/80 hover:brightness-110 active:scale-95 sm:text-sm"
        >
          <Trophy className="h-4 w-4 text-amber-300" aria-hidden="true" />
          ТАБЛИЦА ЛИДЕРОВ
        </button>

        <SloganBadge />
      </footer>
    </div>
  );
};

