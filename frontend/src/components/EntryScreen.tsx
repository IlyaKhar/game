import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Gamepad2,
  Search,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { BrandHeader } from './BrandHeader';
import { SloganBadge } from './SloganBadge';
import { COLLEGE_GROUPS } from '../types/festival';

const STORAGE_REMEMBERED_STUDENT = 'okei_remembered_student';
const STORAGE_STUDENT_HISTORY = 'okei_student_history';

interface SavedStudent {
  fullName: string;
  groupName: string;
}

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

  // Group Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<'all' | '1' | '2' | '3' | '4'>('all');

  // Remembered student state
  const [savedStudent, setSavedStudent] = useState<SavedStudent | null>(null);
  const [studentHistory, setStudentHistory] = useState<SavedStudent[]>([]);

  const nameRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLInputElement>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load remembered student and history from localStorage on mount
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(STORAGE_REMEMBERED_STUDENT);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw) as SavedStudent;
        if (parsed?.fullName && parsed?.groupName) {
          setFullName(parsed.fullName);
          setGroupName(parsed.groupName);
          setSavedStudent(parsed);
        }
      }

      const historyRaw = localStorage.getItem(STORAGE_STUDENT_HISTORY);
      if (historyRaw) {
        const parsedHistory = JSON.parse(historyRaw) as SavedStudent[];
        if (Array.isArray(parsedHistory)) {
          setStudentHistory(parsedHistory.slice(0, 5));
        }
      }
    } catch {
      // Ignore JSON parse errors in localStorage
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setGroupSearch('');
    }
  }, [isDropdownOpen]);

  // Filter groups by search query and course tab
  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    return COLLEGE_GROUPS.filter((g) => {
      const matchCourse = courseFilter === 'all' || g.startsWith(courseFilter);
      if (!matchCourse) return false;
      if (!q) return true;
      return g.toLowerCase().includes(q);
    });
  }, [groupSearch, courseFilter]);

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
    if (!trimmed) return 'Укажите или выберите учебную группу';
    if (trimmed.length < 2 || trimmed.length > 20) {
      return 'Группа должна быть от 2 до 20 символов';
    }
    if (!/^[а-яёА-ЯЁa-zA-Z0-9\-\s\(\)]+$/.test(trimmed)) {
      return 'Группа может содержать только буквы, цифры, дефис, пробел и скобки (например: 3ВБ2, 2ВБ3 (Б))';
    }
    return null;
  };

  // When user selects a group from the list
  const handleSelectGroup = (selected: string) => {
    setGroupName(selected);
    if (groupError) setGroupError(null);
    setIsDropdownOpen(false);
  };

  // When user clicks a saved profile chip
  const handleSelectSavedProfile = (student: SavedStudent) => {
    setFullName(student.fullName);
    setGroupName(student.groupName);
    setNameError(null);
    setGroupError(null);
    setSavedStudent(student);
  };

  const handleClearSavedStudent = () => {
    setFullName('');
    setGroupName('');
    setSavedStudent(null);
    try {
      localStorage.removeItem(STORAGE_REMEMBERED_STUDENT);
    } catch {
      // ignore
    }
    nameRef.current?.focus();
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
      // Save remembered student and history in localStorage
      const profile: SavedStudent = { fullName: trimmedName, groupName: trimmedGroup };
      try {
        localStorage.setItem(STORAGE_REMEMBERED_STUDENT, JSON.stringify(profile));

        // Update history: deduplicate by lowercased fullName
        const updatedHistory = [
          profile,
          ...studentHistory.filter(
            (s) => s.fullName.toLowerCase() !== trimmedName.toLowerCase()
          ),
        ].slice(0, 5);
        localStorage.setItem(STORAGE_STUDENT_HISTORY, JSON.stringify(updatedHistory));
        setStudentHistory(updatedHistory);
      } catch {
        // ignore storage errors
      }

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

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center px-4 py-3">
        <section
          aria-labelledby="entry-heading"
          className="relative w-full rounded-[28px] border-2 border-[#ff47b3]/85 bg-gradient-to-b from-[#1a0738]/94 via-[#13052b]/96 to-[#1d083d]/94 p-6 shadow-[0_18px_50px_rgba(8,2,20,0.9),0_0_32px_rgba(255,46,147,0.38)] backdrop-blur-xl sm:p-8"
        >
          {/* Top neon highlight */}
          <div
            className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff66d9] to-transparent opacity-90"
            aria-hidden="true"
          />

          <div className="mb-5 text-center">
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
              Введи ФИО и выбери группу — очки всех 5 игр пойдут в рейтинг
            </p>
          </div>

          {/* Remembered Student Banner */}
          {savedStudent && (
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-fuchsia-400/40 bg-fuchsia-950/60 px-3.5 py-2.5 text-xs text-fuchsia-100 shadow-[0_0_16px_rgba(217,70,239,0.2)] backdrop-blur-md">
              <div className="flex items-center gap-2 overflow-hidden">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <div className="truncate">
                  <span className="text-fuchsia-300/80">Твой профиль: </span>
                  <span className="font-bold text-white">{savedStudent.fullName}</span>{' '}
                  <span className="font-semibold text-cyan-300">({savedStudent.groupName})</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearSavedStudent}
                className="ml-2 flex shrink-0 items-center gap-1 text-[11px] font-bold text-fuchsia-300 transition hover:text-white"
                title="Войти под другим именем"
              >
                <X className="h-3.5 w-3.5" />
                <span>Сменить</span>
              </button>
            </div>
          )}

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
                  const val = e.target.value;
                  setFullName(val);
                  if (nameError) setNameError(null);

                  // If typed name matches a saved history entry, auto-fill group
                  const matched = studentHistory.find(
                    (s) => s.fullName.toLowerCase() === val.trim().toLowerCase()
                  );
                  if (matched && !groupName) {
                    setGroupName(matched.groupName);
                  }
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
                <div
                  className="fest-error-msg !flex items-center gap-1.5 text-xs font-medium text-rose-300"
                  role="alert"
                >
                  {nameError}
                </div>
              )}

              {/* History fast-chips (if multiple players used this device) */}
              {studentHistory.length > 1 && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-fuchsia-300/60">Недавние:</span>
                  {studentHistory.map((s) => (
                    <button
                      key={s.fullName}
                      type="button"
                      onClick={() => handleSelectSavedProfile(s)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                        fullName.trim().toLowerCase() === s.fullName.toLowerCase()
                          ? 'border border-fuchsia-400 bg-fuchsia-500/30 text-white'
                          : 'border border-fuchsia-500/25 bg-purple-950/40 text-fuchsia-200/80 hover:border-fuchsia-400 hover:text-white'
                      }`}
                    >
                      {s.fullName.split(' ').slice(0, 2).join(' ')} ({s.groupName})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Student Group Combobox / Dropdown */}
            <div ref={dropdownContainerRef} className="relative flex flex-col gap-1.5">
              <label
                htmlFor="student-group"
                className="flex items-center justify-between font-display text-xs font-extrabold italic tracking-wide text-fuchsia-100 uppercase sm:text-sm"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#38bdf8]" aria-hidden="true" />
                  Учебная группа <span aria-hidden="true" className="text-pink-400">*</span>
                </span>
                <span className="text-[11px] font-normal not-italic text-cyan-300/80">
                  {COLLEGE_GROUPS.length} групп
                </span>
              </label>

              <div className="relative">
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
                  autoComplete="off"
                  enterKeyHint="done"
                  aria-invalid={!!groupError}
                  aria-expanded={isDropdownOpen}
                  value={groupName}
                  onClick={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    const upper = e.target.value.toUpperCase();
                    setGroupName(upper);
                    if (groupError) setGroupError(null);
                  }}
                  onBlur={() => {
                    if (groupName.trim()) {
                      setGroupError(validateGroup(groupName));
                    }
                  }}
                  placeholder="Выбери группу из списка..."
                  className={`fest-input w-full cursor-pointer rounded-2xl border-2 bg-[#210a42]/90 px-4 py-3.5 pr-11 text-white uppercase placeholder:normal-case placeholder:text-fuchsia-300/40 shadow-inner transition focus:outline-none ${
                    groupError
                      ? 'user-invalid-fallback border-rose-400'
                      : 'border-indigo-400/50 focus:border-[#38bdf8] focus:shadow-[0_0_18px_rgba(56,189,248,0.28)]'
                  }`}
                />

                {/* Dropdown toggle button */}
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-indigo-300 transition hover:text-white"
                  aria-label="Открыть список групп"
                >
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180 text-cyan-300' : ''
                    }`}
                  />
                </button>
              </div>

              {groupError && (
                <div
                  className="fest-error-msg !flex items-center gap-1.5 text-xs font-medium text-rose-300"
                  role="alert"
                >
                  {groupError}
                </div>
              )}

              {/* Group Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+6px)] z-50 w-full overflow-hidden rounded-2xl border-2 border-indigo-400/80 bg-[#16062f]/98 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_24px_rgba(99,102,241,0.45)] backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-150">
                  {/* Search and Course Filters header */}
                  <div className="border-b border-indigo-500/30 bg-[#1e0a3d]/90 p-3 space-y-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-300/70" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        placeholder="Поиск по названию (например: 3ВБ2)..."
                        className="w-full rounded-xl border border-indigo-400/40 bg-[#100326] py-2 pl-9 pr-3 text-sm text-white placeholder:text-indigo-300/40 focus:border-cyan-400 focus:outline-none"
                      />
                      {groupSearch && (
                        <button
                          type="button"
                          onClick={() => setGroupSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Course Filter Tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-0.5 text-xs font-bold scrollbar-none">
                      {(
                        [
                          { key: 'all', label: 'Все' },
                          { key: '1', label: '1 курс' },
                          { key: '2', label: '2 курс' },
                          { key: '3', label: '3 курс' },
                          { key: '4', label: '4 курс' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setCourseFilter(tab.key)}
                          className={`rounded-lg px-2.5 py-1 transition ${
                            courseFilter === tab.key
                              ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400'
                              : 'bg-indigo-950/40 text-indigo-200/70 hover:bg-indigo-900/50 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable Groups Grid */}
                  <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-indigo-500/50">
                    {filteredGroups.length === 0 ? (
                      <div className="py-6 text-center text-xs text-indigo-200/60">
                        Группа не найдена. Можешь ввести её вручную в поле выше.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                        {filteredGroups.map((g) => {
                          const isSelected = groupName.trim() === g;
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => handleSelectGroup(g)}
                              className={`flex min-h-[38px] items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-black italic tracking-wide transition active:scale-95 ${
                                isSelected
                                  ? 'border-2 border-[#ff47b3] bg-[#ff47b3]/30 text-white shadow-[0_0_12px_rgba(255,71,179,0.5)]'
                                  : 'border border-indigo-400/30 bg-[#1f0d44]/80 text-fuchsia-100 hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-white'
                              }`}
                            >
                              <span>{g}</span>
                              {isSelected && <Check className="h-3 w-3 text-cyan-300" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
              {submitting
                ? 'Загружаем арену...'
                : savedStudent && fullName.trim() === savedStudent.fullName
                ? 'Продолжить как ' + fullName.split(' ')[0]
                : 'Начать фестиваль'}
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
