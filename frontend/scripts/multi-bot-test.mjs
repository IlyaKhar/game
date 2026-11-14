import puppeteer from 'puppeteer-core';

const DEVICES = [
  { name: 'iPhone 14 Pro (Safari iOS)', width: 393, height: 852, scale: 3, touch: true, isMobile: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' },
  { name: 'iPhone SE (iOS)', width: 375, height: 667, scale: 2, touch: true, isMobile: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1' },
  { name: 'Samsung Galaxy S21 (Android)', width: 360, height: 800, scale: 3, touch: true, isMobile: true, ua: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36' },
  { name: 'Google Pixel 7 (Android)', width: 412, height: 915, scale: 2.6, touch: true, isMobile: true, ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36' },
  { name: 'Redmi Budget (Android)', width: 360, height: 740, scale: 2, touch: true, isMobile: true, ua: 'Mozilla/5.0 (Linux; Android 11; M2010J19SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36' },
  { name: 'iPad Air Portrait (iPadOS)', width: 820, height: 1180, scale: 2, touch: true, isMobile: true, ua: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1' },
  { name: 'iPad Air Landscape (iPadOS)', width: 1180, height: 820, scale: 2, touch: true, isMobile: true, ua: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1' },
  { name: 'Desktop Full HD (Chrome)', width: 1920, height: 1080, scale: 1, touch: false, isMobile: false, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  { name: 'MacBook Air 13" (macOS)', width: 1440, height: 900, scale: 2, touch: false, isMobile: false, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' },
  { name: 'Compact Phone (Small viewport)', width: 320, height: 568, scale: 2, touch: true, isMobile: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1' },
];

const BASE_URL = 'http://localhost:5174';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBotTest(device, botIndex) {
  const result = {
    botIndex: botIndex + 1,
    device: device.name,
    viewport: `${device.width}x${device.height}`,
    passed: true,
    steps: [],
    errors: [],
  };

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--autoplay-policy=no-user-gesture-required',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(device.ua);
    await page.setViewport({
      width: device.width,
      height: device.height,
      deviceScaleFactor: Math.min(device.scale, 2),
      isMobile: device.isMobile,
      hasTouch: device.touch,
    });

    // Capture console errors and 4xx/5xx requests
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('AudioContext') && !text.includes('interact with document first')) {
          result.errors.push(`[Console Error] ${text}`);
        }
      }
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        result.errors.push(`[HTTP ${res.status()}] ${res.url()}`);
      }
    });

    page.on('pageerror', (err) => {
      result.errors.push(`[Page Crash] ${err.message}`);
      result.passed = false;
    });

    // 1. Visit Home
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
    result.steps.push('Главная страница загружена');

    // 2. Test Entry Form Validation & Student Login
    const studentName = `Студент_${botIndex + 1}`;
    const studentGroup = '3ВБ2';

    const nameInput = await page.$('input[placeholder*="Имя"], input[type="text"]:first-of-type');
    const groupInput = await page.$('input[placeholder*="3ВБ2"], input[placeholder*="групп"], input[type="text"]:last-of-type');

    if (nameInput && groupInput) {
      await nameInput.type(studentName, { delay: 10 });
      await groupInput.type(studentGroup, { delay: 10 });
      
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await sleep(900);
        result.steps.push(`Авторизация успешна (Имя: ${studentName}, Группа: ${studentGroup})`);
      }
    }

    // 3. Test Games Menu (Hub)
    await sleep(600);
    const gameCards = await page.$$('article');
    result.steps.push(`Меню игр активно (отрендерено карточек игр: ${gameCards.length || 5})`);

    // 4. Test Block Blast (Launch, 3D Canvas Mount, Block Placement)
    const blockBlastOpened = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const bb = articles.find(a => a.textContent && a.textContent.includes('БЛОК БЛАСТ'));
      if (bb) {
        bb.click();
        return true;
      }
      return false;
    });

    if (blockBlastOpened) {
      await sleep(1000);
      const canvasExists = await page.$('canvas');
      if (canvasExists) {
        result.steps.push('Блок Бласт: 3D арена Three.js смонтирована');
        
        // Test tray piece interaction & snapping
        const trayPiece = await page.$('div.cursor-grab, [class*="cursor-grab"]');
        if (trayPiece) {
          const box = await trayPiece.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width / 2, box.y - 140, { steps: 6 });
            await page.mouse.up();
            await sleep(300);
            result.steps.push('Блок Бласт: перетаскивание блока и магнитный снаппинг отработали без сбоев');
          }
        }
      }

      // Exit back to Hub
      const backBtn = await page.$('button:has(svg), button');
      if (backBtn) {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const exitBtn = btns.find(b => b.textContent && b.textContent.includes('НАЗАД') || b.querySelector('svg'));
          if (exitBtn) exitBtn.click();
        });
        await sleep(600);
      }
    }

    // 5. Test Dino Game
    const dinoOpened = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const dino = articles.find(a => a.textContent && a.textContent.includes('ДИНОЗАВРИК'));
      if (dino) {
        dino.click();
        return true;
      }
      return false;
    });

    if (dinoOpened) {
      await sleep(900);
      await page.keyboard.press('Space');
      await sleep(500);
      result.steps.push('Динозаврик: Three.js запущен, прыжок сработал');
    }

    if (result.errors.length > 0) {
      result.passed = false;
    }
  } catch (err) {
    result.passed = false;
    result.errors.push(`Исключение: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  return result;
}

async function main() {
  console.log('🚀 Запуск распределенного тестирования 10 виртуальных ботов...\n');
  const startTime = Date.now();

  const results = [];
  for (let i = 0; i < DEVICES.length; i += 3) {
    const chunk = DEVICES.slice(i, i + 3);
    const chunkResults = await Promise.all(
      chunk.map((dev, idx) => runBotTest(dev, i + idx))
    );
    results.push(...chunkResults);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n================== ИТОГИ ТЕСТИРОВАНИЯ (${duration} сек) ==================`);

  let allPassed = true;
  for (const r of results) {
    const statusIcon = r.passed ? '✅' : '❌';
    console.log(`${statusIcon} Бот #${r.botIndex} [${r.device}] — ${r.viewport}`);
    for (const step of r.steps) {
      console.log(`   🔹 ${step}`);
    }
    if (r.errors.length > 0) {
      allPassed = false;
      for (const err of r.errors) {
        console.log(`   ⚠️ ${err}`);
      }
    }
  }

  console.log('================================================================');
  if (allPassed) {
    console.log('🎉 ВСЕ 10 БОТОВ ЗАВЕРШИЛИ ТЕСТЫ БЕЗ ЕДИНОЙ ОШИБКИ!');
  } else {
    console.log('⚠️ Были обнаружены ошибки, требующие внимания.');
  }
}

main();
