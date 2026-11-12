export type GameId = 'dino' | 'snake' | 'gd' | 'block' | 'subway';

export interface GameScoresMap {
  dino: number;
  snake: number;
  gd: number;
  block: number;
  subway: number;
}

export interface PlayerSummary {
  id: number;
  full_name: string;
  group_name: string;
  games: GameScoresMap;
  bonus_score: number;
  total_score: number;
  games_done: number;
  rank: number;
  updated_at: string;
}

export interface GroupSummary {
  group_name: string;
  players_count: number;
  total_score: number;
  avg_score: number;
  rank: number;
}

export interface LeaderboardResponse {
  players: PlayerSummary[];
  groups: GroupSummary[];
}

export interface GameMeta {
  id: GameId;
  title: string;
  subtitle: string;
  controls: string;
  variant: 'pink' | 'blue';
}

export const FESTIVAL_GAMES: GameMeta[] = [
  {
    id: 'dino',
    title: 'ДИНОЗАВРИК',
    subtitle: 'Неоновый забег по пустыне',
    controls: 'Пробел / ↑ — прыжок (двойной), ↓ — пригнуться / тап по экрану',
    variant: 'pink',
  },
  {
    id: 'snake',
    title: 'ЗМЕЙКА 3D',
    subtitle: 'Изометрическая 3D-арена',
    controls: 'WASD / Стрелки / Свайпы • Зажми и крути 3D-камеру',
    variant: 'blue',
  },
  {
    id: 'gd',
    title: 'GEOMETRY DASH',
    subtitle: 'Ритм-прыжки под неон',
    controls: 'Пробел / ↑ / Клик — прыжок (держи для серии)',
    variant: 'pink',
  },
  {
    id: 'block',
    title: 'BLOCK BLAST',
    subtitle: 'Комбо-головоломка 8×8',
    controls: 'Перетаскивай фигуры на поле и сжигай линии',
    variant: 'blue',
  },
  {
    id: 'subway',
    title: 'SUBWAY SURFERS FEST',
    subtitle: '3D-раннер по рельсам',
    controls: 'A/D или ←/→ — полосы, W/↑/Пробел — прыжок, S/↓ — подкат',
    variant: 'pink',
  },
];
