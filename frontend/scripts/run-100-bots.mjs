import puppeteer from 'puppeteer-core';

const TOTAL_BOTS = 100;
const CONCURRENCY = 5; // 5 parallel browser contexts at a time to prevent RAM exhaustion
const BASE_URL = 'http://localhost:5174';

const VIEWPORTS = [
  { name: 'iPhone 14 Pro', width: 393, height: 852, isMobile: true, hasTouch: true },
  { name: 'iPhone SE', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'Samsung Galaxy S21', width: 360, height: 800, isMobile: true, hasTouch: true },
  { name: 'Google Pixel 7', width: 412, height: 915, isMobile: true, hasTouch: true },
  { name: 'iPad Air', width: 820, height: 1180, isMobile: true, hasTouch: true },
  { name: 'Desktop Full HD', width: 1920, height: 1080, isMobile: false, hasTouch: false },
];

const GROUPS = ['3ВБ2', '2ИС1', '1ОД1', '4ВБ1', '3ПГ2'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSingleBot(botId, browser) {
  const vp = VIEWPORTS[botId % VIEWPORTS.length];
  const group = GROUPS[botId % GROUPS.length];
  const studentName = `КиберСтудент_${botId + 1}`;

  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  const report = {
    botId: botId + 1,
    studentName,
    group,
    viewport: `${vp.name} (${vp.width}x${vp.height})`,
    success: true,
    errors: [],
    gamesTested: [],
  };

  try {
    await page.setViewport(vp);

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('AudioContext') && !text.includes('favicon')) {
          report.errors.push(`[Console] ${text}`);
        }
      }
    });

    page.on('pageerror', (err) => {
      report.errors.push(`[Crash] ${err.message}`);
      report.success = false;
    });

    // 1. Visit Portal
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 12000 });

    // 2. Auth Flow
    const nameInput = await page.$('input[placeholder*="Имя"], input[type="text"]:first-of-type');
    const groupInput = await page.$('input[placeholder*="3ВБ2"], input[placeholder*="групп"], input[type="text"]:last-of-type');

    if (nameInput && groupInput) {
      await nameInput.type(studentName, { delay: 5 });
      await groupInput.type(group, { delay: 5 });
      const submit = await page.$('button[type="submit"]');
      if (submit) {
        await submit.click();
        await sleep(800);
      }
    }

    // 3. Hub Menu Check
    await sleep(400);
    const gameCards = await page.$$('article');
    if (gameCards.length >= 5) {
      report.gamesTested.push(`Хаб (${gameCards.length} игр доступно)`);
    }

    // 4. Test Game (cycle through games based on botId)
    const targetGameIdx = botId % 5;
    const gameNames = ['Subway Surfers', 'Динозаврик', 'Змейка', 'Geometry Dash', 'Блок Бласт'];
    
    const cardToClick = gameCards[targetGameIdx];
    if (cardToClick) {
      await cardToClick.click();
      await sleep(1000);

      // Verify canvas or iframe
      const hasCanvas = await page.$('canvas');
      const hasIframe = await page.$('iframe');
      if (hasCanvas || hasIframe) {
        report.gamesTested.push(`${gameNames[targetGameIdx]}: рендеринг 3D успешен`);
      }

      // Quick back to hub
      await page.evaluate(() => {
        const backBtn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent && b.textContent.includes('НАЗАД')
        );
        if (backBtn) backBtn.click();
      });
      await sleep(500);
    }

    if (report.errors.length > 0) {
      report.success = false;
    }
  } catch (err) {
    report.success = false;
    report.errors.push(err.message);
  } finally {
    await page.close();
    await context.close();
  }

  return report;
}

async function main() {
  console.log(`🚀 Запуск массированного тестирования: ${TOTAL_BOTS} ботов (пул: ${CONCURRENCY} параллельных потоков)...\n`);
  const start = Date.now();

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const reports = [];
  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < TOTAL_BOTS; i += CONCURRENCY) {
    const chunkIds = Array.from({ length: Math.min(CONCURRENCY, TOTAL_BOTS - i) }, (_, k) => i + k);
    const chunkResults = await Promise.all(chunkIds.map((id) => runSingleBot(id, browser)));
    
    for (const res of chunkResults) {
      reports.push(res);
      if (res.success) {
        passedCount++;
        process.stdout.write('🟢');
      } else {
        failedCount++;
        process.stdout.write('🔴');
      }
    }
  }

  await browser.close();

  const totalTime = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n\n==================== РЕЗУЛЬТАТЫ 100 БОТОВ (${totalTime}с) ====================`);
  console.log(`✅ Успешно пройдено: ${passedCount} / ${TOTAL_BOTS}`);
  console.log(`❌ Ошибок: ${failedCount}`);

  if (failedCount > 0) {
    console.log('\nОбнаруженные проблемы:');
    reports.filter(r => !r.success).forEach(r => {
      console.log(`- Бот #${r.botId} (${r.viewport}): ${r.errors.join('; ')}`);
    });
  } else {
    console.log('🎉 ВСЕ 100 БОТОВ УСПЕШНО ЗАВЕРШИЛИ ТЕСТЫ!');
  }
}

main();

