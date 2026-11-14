import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const APP_URL = 'http://localhost:5174/';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SNAPSHOTS_DIR = '/Users/maloy/.gemini/antigravity/brain/0ff15816-b493-42bd-9866-a7a561d31dd1/snapshots';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Testing Per-Game and Overall Leaderboard in Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=430,932'],
    defaultViewport: { width: 430, height: 932, isMobile: true, hasTouch: true },
  });

  const page = await browser.newPage();
  await page.goto(APP_URL, { waitUntil: 'networkidle2' });

  // Log in as Семенов Даниил (3ВБ2)
  console.log('🔑 Logging in as Семенов Даниил...');
  await page.evaluate(() => {
    localStorage.setItem('okei_remembered_student', JSON.stringify({ fullName: 'Семенов Даниил', groupName: '3ВБ2' }));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(400);

  // Click Submit
  await page.click('button[type="submit"]');
  await sleep(1500);

  // Open Results screen
  console.log('🏆 Opening Results Screen...');
  const resultsBtn = await page.$('button:has(svg.lucide-trophy)');
  if (resultsBtn) {
    await resultsBtn.click();
  } else {
    const btns = await page.$$('button');
    for (const b of btns) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text?.includes('ИТОГИ')) {
        await b.click();
        break;
      }
    }
  }
  await sleep(1200);

  console.log('📸 1. Capturing Overall Leaderboard...');
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'lb_1_overall.png') });

  // Click Dino tab
  console.log('🦖 2. Switching to Dino tab...');
  const tabButtons = await page.$$('nav button');
  for (const b of tabButtons) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text?.includes('Динозаврик')) {
      await b.click();
      break;
    }
  }
  await sleep(500);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'lb_2_dino.png') });

  // Click Geometry Dash tab
  console.log('⚡ 3. Switching to Geometry Dash tab...');
  const tabButtons2 = await page.$$('nav button');
  for (const b of tabButtons2) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text?.includes('Geometry Dash') || text?.includes('GD')) {
      await b.click();
      break;
    }
  }
  await sleep(500);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'lb_3_gd.png') });

  // Click Subway Surfers tab
  console.log('🏃 4. Switching to Subway Surfers tab...');
  const tabButtons3 = await page.$$('nav button');
  for (const b of tabButtons3) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text?.includes('Subway')) {
      await b.click();
      break;
    }
  }
  await sleep(500);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'lb_4_subway.png') });

  // Click Groups tab
  console.log('👥 5. Switching to Groups tab...');
  const tabButtons4 = await page.$$('nav button');
  for (const b of tabButtons4) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text?.includes('Рейтинг групп') || text?.includes('Группы')) {
      await b.click();
      break;
    }
  }
  await sleep(500);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'lb_5_groups.png') });

  console.log('🎉 Per-game leaderboard test completed successfully!');
  await browser.close();
}

main().catch((err) => {
  console.error('❌ Error during leaderboard test:', err);
  process.exit(1);
});

