/**
 * squad-players-sim.mjs
 * Запускает отряд из реальных игроков через браузер:
 * - Каждый игрок получает изолированную браузерную сессию (incognito context)
 * - Самостоятельно авторизуется на экране входа (ФИО + Группа)
 * - Выбирает разные игры в хабе
 * - Реально играет в них через клавиатурные события (прыжки, подкаты, повороты)
 * - Отправляет очки естественным путем через движок игры
 * - Проверяет свой результат в рейтинге фестиваля!
 */

import puppeteer from 'puppeteer-core';

const APP_URL = 'http://localhost:5174/';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PLAYERS = [
  { name: 'Ковалев Артем', group: '2ИС1', games: ['dino', 'subway'] },
  { name: 'Смирнова Полина', group: '1ОД1', games: ['dino', 'snake'] },
  { name: 'Морозов Никита', group: '4ВБ1', games: ['subway', 'gd'] },
  { name: 'Волков Егор', group: '3ПГ2', games: ['dino', 'snake', 'subway'] },
  { name: 'Кузнецов Дмитрий', group: '2ВБ1', games: ['dino', 'subway'] },
  { name: 'Новикова Дарья', group: '3ВБ2', games: ['snake', 'dino'] },
];

async function playDino(page, playerName) {
  console.log(`   🦖 [${playerName}] Запуск Динозаврика 3D...`);
  const dinoCard = await page.evaluateHandle(() => {
    const cards = Array.from(document.querySelectorAll('article'));
    return cards.find(c => c.textContent.includes('ДИНОЗАВРИК') || c.textContent.includes('DINO')) || cards[0];
  });
  await dinoCard.click();
  await sleep(1000);

  await page.waitForSelector('canvas', { timeout: 6000 });
  await page.keyboard.press('Space'); // Старт забега
  await sleep(1000);

  // Живые прыжки и подкаты
  const jumps = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < jumps; i++) {
    await sleep(900 + Math.floor(Math.random() * 500));
    await page.keyboard.press('Space');
    if (i === 1) {
      await sleep(120);
      await page.keyboard.press('Space'); // двойной прыжок
    }
    if (i === 2) {
      await sleep(400);
      await page.keyboard.down('ArrowDown');
      await sleep(550);
      await page.keyboard.up('ArrowDown');
    }
  }

  // Ждем финиша попытки
  await sleep(2500);

  // Считываем очки
  const score = await page.evaluate(() => {
    const el = document.querySelector('p span.font-black');
    return el ? el.textContent.trim() : '0';
  });
  console.log(`   🦖 [${playerName}] Динозаврик завершен: ${score} очков!`);

  // Возврат в Хаб
  const backBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('header button'));
    return buttons.find(b => b.textContent.includes('В хаб') || b.querySelector('svg'));
  });
  if (backBtn) {
    await backBtn.click();
    await sleep(1000);
  }
  return score;
}

async function playSubway(page, playerName) {
  console.log(`   🚇 [${playerName}] Запуск Subway Surfers...`);
  const subwayCard = await page.evaluateHandle(() => {
    const cards = Array.from(document.querySelectorAll('article'));
    return cards.find(c => c.textContent.includes('SUBWAY') || c.textContent.includes('САБВЕЙ')) || cards[4];
  });
  if (!subwayCard) return '0';
  await subwayCard.click();
  await sleep(1200);

  const iframeEl = await page.waitForSelector('iframe', { timeout: 6000 });
  const frame = await iframeEl.contentFrame();
  if (frame) {
    await frame.waitForFunction(() => {
      const btn = document.getElementById('start');
      return btn && !btn.disabled;
    }, { timeout: 12000 });

    await frame.click('#start');
    await sleep(1000);

    // Маневры по путям
    const actions = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
    for (const act of actions) {
      await sleep(800 + Math.floor(Math.random() * 600));
      await page.keyboard.press(act);
    }
    await sleep(2500);

    const score = await frame.evaluate(() => {
      const el = document.getElementById('score');
      return el ? el.textContent.trim() : '0';
    });
    console.log(`   🚇 [${playerName}] Subway Surfers завершен: ${score} очков!`);

    const backBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('header button'));
      return buttons.find(b => b.textContent.includes('В хаб') || b.querySelector('svg'));
    });
    if (backBtn) {
      await backBtn.click();
      await sleep(1000);
    }
    return score;
  }
  return '0';
}

async function playSnake(page, playerName) {
  console.log(`   🐍 [${playerName}] Запуск Змейки 3D...`);
  const snakeCard = await page.evaluateHandle(() => {
    const cards = Array.from(document.querySelectorAll('article'));
    return cards.find(c => c.textContent.includes('ЗМЕЙКА') || c.textContent.includes('SNAKE')) || cards[1];
  });
  if (!snakeCard) return '0';
  await snakeCard.click();
  await sleep(1000);

  await page.waitForSelector('canvas', { timeout: 6000 });
  await sleep(600);
  await page.keyboard.press('ArrowDown');
  await sleep(700);
  await page.keyboard.press('ArrowLeft');
  await sleep(700);
  await page.keyboard.press('ArrowUp');
  await sleep(1800);

  console.log(`   🐍 [${playerName}] Змейка сыграна!`);

  const backBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('header button'));
    return buttons.find(b => b.textContent.includes('В хаб') || b.querySelector('svg'));
  });
  if (backBtn) {
    await backBtn.click();
    await sleep(1000);
  }
  return 'OK';
}

async function playGD(page, playerName) {
  console.log(`   🔷 [${playerName}] Запуск Geometry Dash...`);
  const gdCard = await page.evaluateHandle(() => {
    const cards = Array.from(document.querySelectorAll('article'));
    return cards.find(c => c.textContent.includes('GEOMETRY') || c.textContent.includes('GD')) || cards[2];
  });
  if (!gdCard) return '0';
  await gdCard.click();
  await sleep(1000);

  await page.waitForSelector('canvas', { timeout: 6000 });
  for (let i = 0; i < 4; i++) {
    await sleep(400);
    await page.keyboard.press('Space');
  }
  await sleep(1800);

  console.log(`   🔷 [${playerName}] Geometry Dash сыгран!`);

  const backBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('header button'));
    return buttons.find(b => b.textContent.includes('В хаб') || b.querySelector('svg'));
  });
  if (backBtn) {
    await backBtn.click();
    await sleep(1000);
  }
  return 'OK';
}

async function runPlayerSession(browser, player, index) {
  console.log(`\n👤 [Игрок #${index + 1}/${PLAYERS.length}] Начинает ${player.name} (${player.group})...`);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  try {
    // Вход
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await page.type('#student-fullname', player.name, { delay: 35 });
    await page.type('#student-group', player.group, { delay: 35 });
    await page.click('button[type="submit"]');

    await page.waitForSelector('article h2', { timeout: 6000 });
    console.log(`   ✅ [${player.name}] Успешно зашел в Хаб фестиваля.`);

    // Прохождение выбранных игр
    for (const game of player.games) {
      if (game === 'dino') await playDino(page, player.name);
      else if (game === 'subway') await playSubway(page, player.name);
      else if (game === 'snake') await playSnake(page, player.name);
      else if (game === 'gd') await playGD(page, player.name);
      await sleep(600);
    }

    // Проверка рейтинга
    const resultsBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('footer button'));
      return buttons.find(b => b.textContent.includes('ИТОГИ'));
    });
    if (resultsBtn) {
      await resultsBtn.click();
      await sleep(1200);

      const rank = await page.evaluate((name) => {
        const text = document.body.innerText;
        const match = text.match(/Место\s*#(\d+)/i);
        return match ? `#${match[1]}` : 'в таблице';
      }, player.name);

      console.log(`   🏆 [${player.name}] Занял место в топе: ${rank}`);
    }

  } catch (err) {
    console.error(`   ❌ [${player.name}] Ошибка:`, err.message);
  } finally {
    await context.close();
  }
}

async function main() {
  console.log('🚀 ========================================================');
  console.log(`🎮 ЗАПУСК ОТРЯДА ИЗ ${PLAYERS.length} РЕАЛЬНЫХ ИГРОКОВ В БРАУЗЕРЕ`);
  console.log('🚀 ========================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: [
      '--no-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=metal',
      '--disable-dev-shm-usage',
    ],
  });

  const startTime = Date.now();

  // Запуск по 2 параллельных игрока для бережной нагрузки на GPU
  const CONCURRENCY = 2;
  for (let i = 0; i < PLAYERS.length; i += CONCURRENCY) {
    const chunk = PLAYERS.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((p, idx) => runPlayerSession(browser, p, i + idx)));
  }

  await browser.close();

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 Все ${PLAYERS.length} игроков успешно сыграли и внесены в рейтинг за ${durationSec} сек!`);

  // Запрос финальной таблицы лидеров
  try {
    const res = await fetch('http://localhost:8080/api/leaderboard');
    const data = await res.json();
    console.log('\n📊 ТЕКУЩИЙ ТОП ФЕСТИВАЛЯ:');
    console.log(`Всего зарегистрированных участников в базе: ${data.players?.length || 0}`);
    console.log('Топ 10 участников:');
    (data.players || []).slice(0, 10).forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.full_name} (${p.group_name}) — ${p.total_score} очков [игр: ${p.games_done}/5]`);
    });
  } catch {}
}

main();

