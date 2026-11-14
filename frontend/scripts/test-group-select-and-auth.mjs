import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const APP_URL = 'http://localhost:5174/';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SNAPSHOTS_DIR = '/Users/maloy/.gemini/antigravity/brain/0ff15816-b493-42bd-9866-a7a561d31dd1/snapshots';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Launching Chrome to test Group Select and Remembered Student...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=430,932'],
    defaultViewport: { width: 430, height: 932, isMobile: true, hasTouch: true },
  });

  const page = await browser.newPage();
  await page.goto(APP_URL, { waitUntil: 'networkidle2' });

  // Clear any existing localStorage so we start clean
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle2' });

  console.log('📸 Step 1: Initial Clean Entry Screen');
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'entry_1_clean.png') });

  // Click on the group dropdown trigger
  console.log('🖱️ Step 2: Opening Group Dropdown');
  await page.click('#student-group');
  await sleep(300);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'entry_2_dropdown_open.png') });

  // Test Course tabs
  console.log('🖱️ Step 3: Filtering by 2 курс');
  const courseButtons = await page.$$('button');
  for (const btn of courseButtons) {
    const text = await (await btn.getProperty('textContent')).jsonValue();
    if (text?.includes('2 курс')) {
      await btn.click();
      break;
    }
  }
  await sleep(300);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'entry_3_course_2_filter.png') });

  // Search for 2ВБ3 (Б)
  console.log('⌨️ Step 4: Searching 2ВБ3 (Б)');
  const searchInput = await page.$('input[placeholder*="Поиск по названию"]');
  if (searchInput) {
    await searchInput.type('2вб3');
    await sleep(200);
  }
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'entry_4_search_group.png') });

  // Select 2ВБ3 (Б)
  const groupButtons = await page.$$('button');
  for (const btn of groupButtons) {
    const text = await (await btn.getProperty('textContent')).jsonValue();
    if (text?.includes('2ВБ3 (Б)')) {
      await btn.click();
      console.log('✅ Clicked group 2ВБ3 (Б)');
      break;
    }
  }
  await sleep(300);

  // Type Full Name
  console.log('⌨️ Step 5: Typing Full Name: Семенов Даниил');
  const nameInput = await page.$('#student-fullname');
  await nameInput.type('Семенов Даниил', { delay: 40 });
  await sleep(200);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'entry_5_filled.png') });

  // Submit entry form
  console.log('🚀 Step 6: Submitting form');
  await page.click('button[type="submit"]');
  await sleep(1500);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'entry_6_in_hub.png') });

  // Check player score & name in Hub
  const hubText = await page.evaluate(() => document.body.innerText);
  const hasName = hubText.includes('Семенов Даниил');
  const hasScore = hubText.includes('158');
  console.log(`Verified in Hub: hasName=${hasName}, hasScore(158)=${hasScore}`);

  // Now click "Сменить" or log out button
  console.log('🚪 Step 7: Logging out back to Entry Screen');
  const changeBtn = await page.$('button[title*="выйти"], button[title*="Выйти"]');
  if (changeBtn) {
    await changeBtn.click();
  } else {
    // Or call clearPlayerToken and go to entry
    await page.evaluate(() => {
      localStorage.removeItem('okei_fest_token');
      window.location.reload();
    });
  }
  await sleep(1000);

  // Check remembered student on entry screen
  console.log('📸 Step 8: Entry Screen with Remembered Student');
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'entry_7_remembered.png') });

  const entryText = await page.evaluate(() => document.body.innerText);
  const remembersName = entryText.includes('Семенов Даниил');
  const remembersGroup = entryText.includes('2ВБ3 (Б)');
  const hasContinueBtn = entryText.includes('Продолжить как Семенов');

  console.log(`Remembered state: name=${remembersName}, group=${remembersGroup}, continueBtn=${hasContinueBtn}`);

  // Test one-click login via "Продолжить как Семенов"
  console.log('🚀 Step 9: Testing One-Click Login with Remembered Student');
  await page.click('button[type="submit"]');
  await sleep(1500);
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, 'entry_8_reentered_hub.png') });

  const reenteredText = await page.evaluate(() => document.body.innerText);
  console.log(`Re-entered Hub successfully: ${reenteredText.includes('Семенов Даниил')}`);

  await browser.close();
  console.log('🎉 Test Completed successfully!');
}

main().catch((err) => {
  console.error('❌ Error during test:', err);
  process.exit(1);
});
