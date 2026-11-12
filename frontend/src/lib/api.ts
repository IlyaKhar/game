import { z } from 'zod';
import type { GameId, LeaderboardResponse, PlayerSummary } from '../types/festival';

const TOKEN_KEY = 'okei_fest_token';
const ADMIN_TOKEN_KEY = 'okei_fest_admin_token';

const GameScoresSchema = z.object({
  dino: z.number(),
  snake: z.number(),
  gd: z.number(),
  block: z.number(),
  subway: z.number(),
});

export const PlayerSummarySchema = z.object({
  id: z.number(),
  full_name: z.string(),
  group_name: z.string(),
  games: GameScoresSchema,
  bonus_score: z.number(),
  total_score: z.number(),
  games_done: z.number(),
  rank: z.number(),
  updated_at: z.string(),
});

const GroupSummarySchema = z.object({
  group_name: z.string(),
  players_count: z.number(),
  total_score: z.number(),
  avg_score: z.number(),
  rank: z.number(),
});

export const LeaderboardSchema = z.object({
  players: z.array(PlayerSummarySchema),
  groups: z.array(GroupSummarySchema),
});

const EnterResponseSchema = z.object({
  token: z.string(),
  player: PlayerSummarySchema,
});

export function getPlayerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearPlayerToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, { ...options, headers });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
  }
  return data as T;
}

export async function enterFestival(fullName: string, groupName: string): Promise<PlayerSummary> {
  const raw = await request<unknown>('/api/auth/enter', {
    method: 'POST',
    body: JSON.stringify({ full_name: fullName, group_name: groupName }),
  });
  const parsed = EnterResponseSchema.parse(raw);
  localStorage.setItem(TOKEN_KEY, parsed.token);
  return parsed.player;
}

export async function fetchMe(): Promise<PlayerSummary> {
  const token = getPlayerToken();
  if (!token) throw new Error('Не авторизован');
  const raw = await request<unknown>('/api/me', {}, token);
  return PlayerSummarySchema.parse(raw);
}

export async function submitGameScore(gameId: GameId, score: number): Promise<PlayerSummary> {
  const token = getPlayerToken();
  if (!token) throw new Error('Сессия истекла');
  const raw = await request<unknown>(
    '/api/scores',
    {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, score: Math.max(0, Math.floor(score)) }),
    },
    token
  );
  return PlayerSummarySchema.parse(raw);
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const raw = await request<unknown>('/api/leaderboard');
  return LeaderboardSchema.parse(raw);
}

export async function adminLogin(password: string): Promise<string> {
  const raw = await request<{ token: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  sessionStorage.setItem(ADMIN_TOKEN_KEY, raw.token);
  return raw.token;
}

export async function adminListPlayers(): Promise<LeaderboardResponse> {
  const raw = await request<unknown>('/api/admin/players', {}, getAdminToken());
  return LeaderboardSchema.parse(raw);
}

export interface AdminScorePatch {
  full_name?: string;
  group_name?: string;
  dino?: number;
  snake?: number;
  gd?: number;
  block?: number;
  subway?: number;
  bonus_score?: number;
}

export async function adminUpdatePlayer(id: number, patch: AdminScorePatch): Promise<PlayerSummary> {
  const raw = await request<unknown>(
    `/api/admin/players/${id}/scores`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
    getAdminToken()
  );
  return PlayerSummarySchema.parse(raw);
}

export async function adminCreatePlayer(patch: Required<Pick<AdminScorePatch, 'full_name' | 'group_name'>> & AdminScorePatch): Promise<PlayerSummary> {
  const raw = await request<unknown>(
    '/api/admin/players',
    {
      method: 'POST',
      body: JSON.stringify(patch),
    },
    getAdminToken()
  );
  return PlayerSummarySchema.parse(raw);
}

export async function adminDeletePlayer(id: number): Promise<void> {
  await request<void>(`/api/admin/players/${id}`, { method: 'DELETE' }, getAdminToken());
}

export async function adminResetAll(): Promise<void> {
  await request<unknown>(
    '/api/admin/reset',
    {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'RESET_ALL' }),
    },
    getAdminToken()
  );
}

