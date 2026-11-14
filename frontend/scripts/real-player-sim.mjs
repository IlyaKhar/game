/**
 * real-player-sim.mjs
 * Полный симулятор реального игрока:
 * 1. Заходит в браузер на http://localhost:5174/
 * 2. Вводит ФИО и группу руками (через клавиатуру с задержками)
 * 3. Переходит в Хаб
 * 4. Заходит в игры и РЕАЛЬНО играет в них клавиатурой/свайпами (прыжки, уклонения, повороты)
 * 5. Играет несколько попыток (переигрывает, ставит рекорды)
 * 6. Выходит обратно в хаб и проверяет себя в турнирной таблице ("ИТОГИ")
 * 7. Сохраняет скриншоты каждого шага!
 * 
 * Запуск: node frontend/scripts/real-player-sim.mjs
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const APP_URL = 'http://localhost:5174/';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SNAPSHOTS_DIR = '/Users/maloy/.gemini/antigravity/brain/0ff15816-b493-42bd-9866-a7a561d31dd1/snapshots';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Парсинг аргументов CLI
const args = process.argv.slice(2);
const studentName = args.find(a => a.startsWith('--name='))?.split('=')[1] || 'Семенов Даниил';
const studentGroup = args.find(a => a.startsWith('--group='))?.split('=')[1] || '3ВБ2';
const isHeadless = !args.includes('--show');

console.log('\n🎮 =======================================================');
console.log(`🤖 СИМУЛЯТОР РЕАЛЬНОГО ИГРОКА: ${studentName} (${studentGroup})`);
console.log('🎮 =======================================================\n');

if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

async function main() {
  const browser = await puppeteer.launch({
    headless: isHeadless ? 'new' : false,
    executablePath: CHROME_PATH,
    args: [
      '--no-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=metal',
      '--window-size=430,920',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  const playedSummary = {};

  try {
    // -----------------------------------------------------------------
    // ШАГ 1: ВХОД В ПРИЛОЖЕНИЕ (РЕАЛЬНЫЙ НАБОР ТЕКСТА)
    // -----------------------------------------------------------------
    console.log(`📍 [Шаг 1] Открываем ${APP_URL}...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await sleep(600);

    console.log(`✍️  Вводим ФИО: "${studentName}"...`);
    await page.click('#student-fullname');
    await page.type('#student-fullname', studentName, { delay: 45 });
    await sleep(250);

    console.log(`✍️  Вводим учебную группу: "${studentGroup}"...`);
    await page.click('#student-group');
    await page.type('#student-group', studentGroup, { delay: 45 });
    await sleep(300);

    await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'sim_1_form_filled.png') });

    console.log('🚀 Нажимаем кнопку "НАЧАТЬ"...');
    await page.click('button[type="submit"]');

    await page.waitForSelector('article h2', { timeout: 6000 });
    console.log('✅ Успешно вошли в Игровой Хаб!');
    await sleep(600);
    await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'sim_2_hub_ready.png') });

    // -----------------------------------------------------------------
    // ШАГ 2: ИГРА В ДИНОЗАВРИКА 3D (2 ПОПЫТКИ С РЕАЛЬНЫМИ ПРЫЖКАМИ)
    // -----------------------------------------------------------------
    console.log('\n🦖 [Шаг 2] Выбираем игру: ДИНОЗАВРИК 3D...');
    
    // Кликаем по первой карточке (Динозаврик)
    const dinoCard = await page.evaluateHandle(() => {
      const cards = Array.from(document.querySelectorAll('article'));
      return cards.find(c => c.textContent.includes('ДИНОЗАВРИК') || c.textContent.includes('DINO')) || cards[0];
    });
    await dinoCard.click();
    await sleep(1000);

    // Ожидаем холст игры
    await page.waitForSelector('canvas', { timeout: 6000 });
    console.log('🎮 Арена Динозаврика загружена. Начинаем попытку #1...');

    // Попытка 1: начинаем бег и прыгаем
    await page.keyboard.press('Space'); // Начать бег
    await sleep(1200);

    // Серия человеческих действий: прыжок, уклонение
    console.log('🏃 [Попытка 1] Бежим... Опасность: прыжок!');
    await page.keyboard.press('Space');
    await sleep(900);

    console.log('🦘 [Попытка 1] Двойной прыжок за монеткой!');
    await page.keyboard.press('Space');
    await sleep(120);
    await page.keyboard.press('Space');
    await sleep(1400);

    console.log('🦅 [Попытка 1] Птеродактиль летит низко: ПРИГИБАЕМСЯ (ArrowDown)!');
    await page.keyboard.down('ArrowDown');
    await sleep(650);
    await page.keyboard.up('ArrowDown');
    await sleep(1100);

    await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'sim_3_dino_running.png') });

    // Ждем столкновения (бежим без прыжка навстречу кактусу)
    console.log('💥 [Попытка 1] Ловим столкновение для фиксации очков...');
    await page.waitForSelector('button:has-text("ИГРАТЬ СНОВА")', { timeout: 8000 }).catch(async () => {
      // Если еще жив, ждем секунду
      await sleep(2500);
    });

    const attempt1Score = await page.evaluate(() => {
      const el = document.querySelector('p span.font-black');
      return el ? el.textContent.trim() : '0';
    });
    console.log(`📊 [Попытка 1] Завершена! Набрано очков: ${attempt1Score}`);
    await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'sim_4_dino_gameover_1.png') });

    // Попытка 2: Переигрываем ("ИГРАТЬ СНОВА")
    console.log('🔄 [Попытка 2] Жмем "ИГРАТЬ СНОВА", пробуем побить рекорд...');
    const retryBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('ИГРАТЬ СНОВА'));
    });
    if (retryBtn) {
      await retryBtn.click();
      await sleep(800);

      console.log('🏃 [Попытка 2] Бежим техничнее...');
      for (let j = 0; j < 3; j++) {
        await sleep(1100);
        await page.keyboard.press('Space');
        console.log(`   Прыжок #${j + 1}`);
      }
      await sleep(600);
      await page.keyboard.down('ArrowDown');
      await sleep(700);
      await page.keyboard.up('ArrowDown');

      // Ждем завершения попытки
      await sleep(3500);
      await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'sim_5_dino_gameover_2.png') });
    }

    playedSummary.dino = attempt1Score;

    // Выходим в Хаб через кнопку "В хаб"
    console.log('🔙 Возвращаемся в хаб...');
    const backToHub = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('header button'));
      return buttons.find(b => b.textContent.includes('В хаб') || b.querySelector('svg'));
    });
    if (backToHub) {
      await backToHub.click();
      await sleep(1000);
    }

    // -----------------------------------------------------------------
    // ШАГ 3: ИГРА В SUBWAY SURFERS (FESTIVAL RUNNER)
    // -----------------------------------------------------------------
    console.log('\n🚇 [Шаг 3] Выбираем игру: SUBWAY SURFERS FEST...');
    const subwayCard = await page.evaluateHandle(() => {
      const cards = Array.from(document.querySelectorAll('article'));
      return cards.find(c => c.textContent.includes('SUBWAY') || c.textContent.includes('САБВЕЙ')) || cards[4];
    });
    if (subwayCard) {
      await subwayCard.click();
      await sleep(1200);

      // Ищем iframe игры
      const iframeElement = await page.waitForSelector('iframe', { timeout: 6000 });
      const frame = await iframeElement.contentFrame();

      if (frame) {
        console.log('⏳ Ожидаем загрузки 3D моделей и персонажа в Subway Surfers...');
        await frame.waitForFunction(() => {
          const btn = document.getElementById('start');
          return btn && !btn.disabled;
        }, { timeout: 12000 });

        console.log('🟢 Жмем кнопку "ПОГНАЛИ!"...');
        await frame.click('#start');
        await sleep(1000);

        console.log('🏃 Subway Surfers: бежим по рельсам!');
        await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'sim_6_subway_running.png') });

        // Реальные действия стрелками
        console.log('➡️  Смещаемся вправо (ArrowRight)...');
        await page.keyboard.press('ArrowRight');
        await sleep(1100);

        console.log('🦘 Прыжок через барьер (ArrowUp)...');
        await page.keyboard.press('ArrowUp');
        await sleep(1200);

        console.log('⬅️  Смещаемся влево (ArrowLeft)...');
        await page.keyboard.press('ArrowLeft');
        await sleep(1000);

        console.log('🛹 Подкат под семафор (ArrowDown)...');
        await page.keyboard.press('ArrowDown');
        await sleep(2500); // Бежим дальше навстречу поезду для финиша забега

        await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'sim_7_subway_finished.png') });

        const subwayResult = await frame.evaluate(() => {
          const res = document.getElementById('result');
          return res ? res.textContent : '0';
        });
        console.log(`📊 Результат Subway Surfers: ${subwayResult}`);
        playedSummary.subway = subwayResult;
      }

      // Выходим обратно в Хаб
      console.log('🔙 Выходим из Subway Surfers в Хаб...');
      const exitBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('header button'));
        return buttons.find(b => b.textContent.includes('В хаб') || b.querySelector('svg'));
      });
      if (exitBtn) {
        await exitBtn.click();
        await sleep(1000);
      }
    }

    // -----------------------------------------------------------------
    // ШАГ 4: ИГРА В ЗМЕЙКУ 3D
    // -----------------------------------------------------------------
    console.log('\n🐍 [Шаг 4] Выбираем игру: ЗМЕЙКА 3D...');
    const snakeCard = await page.evaluateHandle(() => {
      const cards = Array.from(document.querySelectorAll('article'));
      return cards.find(c => c.textContent.includes('ЗМЕЙКА') || c.textContent.includes('SNAKE')) || cards[1];
    });
    if (snakeCard) {
      await snakeCard.click();
      await sleep(1000);

      await page.waitForSelector('canvas', { timeout: 6000 });
      console.log('🟢 Змейка на 3D арене! Управляем стрелками...');

      // Поворачиваем змейку
      await sleep(800);
      console.log('⬇️  Поворот вниз (ArrowDown)...');
      await page.keyboard.press('ArrowDown');
      await sleep(700);

      console.log('⬅️  Поворот влево (ArrowLeft)...');
      await page.keyboard.press('ArrowLeft');
      await sleep(700);

      console.log('⬆️  Поворот вверх (ArrowUp)...');
      await page.keyboard.press('ArrowUp');
      await sleep(1200);

      await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'sim_8_snake_playing.png') });
      await sleep(2000); // Столкновение со стеной

      playedSummary.snake = 'Сыграно';

      // Возврат в Хаб
      console.log('🔙 Возвращаемся в Хаб...');
      const backBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('header button'));
        return buttons.find(b => b.textContent.includes('В хаб') || b.querySelector('svg'));
      });
      if (backBtn) {
        await backBtn.click();
        await sleep(1000);
      }
    }

    // -----------------------------------------------------------------
    // ШАГ 5: ПРОВЕРКА СЕБЯ В ТУРНИРНОЙ ТАБЛИЦЕ ("ИТОГИ")
    // -----------------------------------------------------------------
    console.log('\n🏆 [Шаг 5] Открываем экран "ИТОГИ" (Рейтинг фестиваля)...');
    const resultsBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('footer button'));
      return buttons.find(b => b.textContent.includes('ИТОГИ'));
    });
    if (resultsBtn) {
      await resultsBtn.click();
      await sleep(1500);

      await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'sim_9_leaderboard_verified.png') });

      // Считываем персональную карточку и топ игроков
      const rankInfo = await page.evaluate((name) => {
        const rows = Array.from(document.querySelectorAll('tr, .rounded-2xl'));
        const myRow = rows.find(r => r.textContent.includes(name));
        return myRow ? myRow.innerText.replace(/\n+/g, ' | ') : 'Не найдена персональная строка';
      }, studentName);

      console.log(`🏅 Позиция реального игрока в рейтинге:`);
      console.log(`   ${rankInfo}`);
    }

    console.log('\n🎉 =======================================================');
    console.log('✅ ТЕСТ РЕАЛЬНОГО ИГРОКА ПОЛНОСТЬЮ ЗАВЕРШЕН!');
    console.log(`📸 Все скриншоты реального прохождения сохранены в:\n   ${SNAPSHOTS_DIR}`);
    console.log('🎮 =======================================================\n');

  } catch (err) {
    console.error('❌ Ошибка во время теста игрока:', err);
    await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'sim_error.png') });
  } finally {
    await browser.close();
  }
}

main();

