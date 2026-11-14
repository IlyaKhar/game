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

export type LeaderboardCategory = 'overall' | GameId | 'groups';

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
    title: 'ДИНОЗАВРИК 3D',
    subtitle: 'Неоновый 3D-раннер у колледжа',
    controls: 'Пробел / ↑ / Тап — прыжок (двойной), ↓ — пригнуться',
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
    title: 'BLOCK BLAST 3D',
    subtitle: '3D-головоломка 8×8',
    controls: 'Перетаскивай 3D-фигуры на поле 8×8 (или тап по фигуре → клетка)',
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

export const COLLEGE_GROUPS = [
  // 1 курс
  '1А1', '1БД1', '1БД3', '1БП1', '1БУ1', '1БУ3', '1ВБ1', '1ВБ2',
  '1Д1', '1Д3', '1Д4', '1ИИ1', '1ИС1', '1ИС2', '1ИС3', '1М1',
  '1ПК1', '1ПК2', '1Р1', '1Р3', '1РИ1', '1СА1', '1СА3',
  // 2 курс
  '2А1', '2БД1', '2БД3', '2БП1', '2БУ1', '2БУ3', '2ВБ1', '2ВБ2',
  '2ВБ3 (Б)', '2Д1', '2Д3', '2ИС1', '2ИС2', '2ИС3', '2М1',
  '2ПК1', '2ПК2', '2Р1', '2Р3', '2СА1', '2СА2', '2СА3',
  // 3 курс
  '3А1', '3БД1', '3БД3', '3БП3', '3БУ1', '3БУ3', '3ВБ1', '3ВБ2',
  '3ВБ3', '3Д1', '3Д3', '3ИС1', '3ИС3', '3М1', '3ПК1', '3ПК2',
  '3Р1', '3Р3', '3СА1', '3СА3',
  // 4 курс
  '4БУ1',
] as const;

export type CollegeGroup = typeof COLLEGE_GROUPS[number];

