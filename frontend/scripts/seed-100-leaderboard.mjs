/**
 * seed-100-leaderboard.mjs
 * Заполняет таблицу лидеров фестиваля 100 реалистичными участниками
 * с очками по 5 играм и распределением по группам колледжа.
 * 
 * Запуск: node frontend/scripts/seed-100-leaderboard.mjs
 */

const API_BASE = 'http://localhost:8080/api';

const FIRST_NAMES_M = [
  'Алексей', 'Дмитрий', 'Сергей', 'Максим', 'Артем', 'Даниил', 'Никита', 'Егор',
  'Матвей', 'Тимофей', 'Роман', 'Ярослав', 'Илья', 'Кирилл', 'Владислав', 'Марк',
  'Глеб', 'Арсений', 'Денис', 'Антон', 'Богдан', 'Лев', 'Тимур', 'Давид', 'Макар'
];

const LAST_NAMES_M = [
  'Смирнов', 'Кузнецов', 'Попов', 'Соколов', 'Новиков', 'Морозов', 'Волков', 'Лебедев',
  'Семенов', 'Егоров', 'Павлов', 'Степанов', 'Николаев', 'Орлов', 'Андреев', 'Макаров',
  'Никитин', 'Захаров', 'Зайцев', 'Соловьев', 'Борисов', 'Яковлев', 'Григорьев', 'Ковалев'
];

const FIRST_NAMES_F = [
  'Анна', 'Дарья', 'Полина', 'Виктория', 'Екатерина', 'Анастасия', 'София', 'Алиса',
  'Ксения', 'Варвара', 'Вероника', 'Александра', 'Мария', 'Валерия', 'Алена', 'Диана'
];

const LAST_NAMES_F = [
  'Смирнова', 'Кузнецова', 'Попова', 'Соколова', 'Михайлова', 'Новикова', 'Федорова',
  'Морозова', 'Волкова', 'Алексеева', 'Козлова', 'Васильева', 'Романова', 'Тарасова'
];

const GROUPS = ['3ВБ2', '2ИС1', '1ОД1', '4ВБ1', '3ПГ2', '2ВБ1', '1ИС2', '3ИС1'];
const GAMES = ['dino', 'snake', 'gd', 'block', 'subway'];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateStudent(i) {
  const isFemale = Math.random() < 0.35;
  const first = isFemale
    ? FIRST_NAMES_F[randInt(0, FIRST_NAMES_F.length - 1)]
    : FIRST_NAMES_M[randInt(0, FIRST_NAMES_M.length - 1)];
  const last = isFemale
    ? LAST_NAMES_F[randInt(0, LAST_NAMES_F.length - 1)]
    : LAST_NAMES_M[randInt(0, LAST_NAMES_M.length - 1)];
  const group = GROUPS[randInt(0, GROUPS.length - 1)];
  return { fullName: `${last} ${first}`, groupName: group };
}

async function main() {
  console.log('🚀 Запуск сидирования 100 студентов в таблицу лидеров...');
  
  let successCount = 0;
  for (let i = 1; i <= 100; i++) {
    const student = generateStudent(i);
    try {
      const authRes = await fetch(`${API_BASE}/auth/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: student.fullName, group_name: student.groupName })
      });
      if (!authRes.ok) {
        console.warn(`[#${i}] Ошибка регистрации ${student.fullName}: ${authRes.status}`);
        continue;
      }
      const authData = await authRes.json();
      const token = authData.token;
      
      // Случайное число сыгранных игр (от 2 до 5)
      const gamesCount = randInt(2, 5);
      const shuffledGames = [...GAMES].sort(() => Math.random() - 0.5).slice(0, gamesCount);
      
      for (const game of shuffledGames) {
        let score = 0;
        if (game === 'dino') score = randInt(220, 2450);
        else if (game === 'snake') score = randInt(30, 420);
        else if (game === 'gd') score = randInt(600, 5800);
        else if (game === 'block') score = randInt(200, 2300);
        else if (game === 'subway') score = randInt(350, 3100);
        
        await fetch(`${API_BASE}/scores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ game_id: game, score })
        });
      }
      successCount++;
      if (i % 20 === 0 || i === 100) {
        console.log(`✅ Обработано ${i}/100 студентов...`);
      }
    } catch (err) {
      console.error(`Ошибка при добавлении студента #${i}:`, err.message);
    }
  }
  
  console.log(`\n🎉 Готово! Успешно добавлено ${successCount} студентов.`);
  
  const leadRes = await fetch(`${API_BASE}/leaderboard`);
  const leadData = await leadRes.json();
  console.log(`📊 Всего игроков в таблице лидеров теперь: ${leadData.players?.length || 0}`);
  console.log(`🏆 Топ групп:`, leadData.groups?.map(g => `${g.group_name} (${g.players_count} чел, очки: ${g.total_score})`).join(' | '));
}

main();

