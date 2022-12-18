import puppeteer from 'puppeteer';
import chalk from 'chalk';
import slPage from './slPage.js';

let isMultiAccountMode = false;
let account = '';
let password = '';
let totalDec = 0;
let winTotal = 0;
let loseTotal = 0;
let undefinedTotal = 0;
const ecrRecoveryRatePerHour = 1.04;

// 30 MINUTES INTERVAL BETWEEN EACH MATCH (if not specified in the .env file)
const sleepingTimeInMinutes = process.env.MINUTES_BATTLES_INTERVAL || 30;
const sleepingTime = sleepingTimeInMinutes * 60000;
const isHeadlessMode = process.env.HEADLESS === 'false' ? false : true;
const executablePath = process.env.CHROME_EXEC || null;
let puppeteer_options = {
  headless: false, // default is true
  defaultViewport: null,
  args: [
    '--window-size=1920,1080',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    //'--disable-dev-shm-usage',
    //'--disable-accelerated-2d-canvas',
    // '--disable-canvas-aa',
    // '--disable-2d-canvas-clip-aa',
    //'--disable-gl-drawing-for-tests',
    // '--no-first-run',
    // '--no-zygote',
    '--disable-dev-shm-usage',
    // '--use-gl=swiftshader',
    // '--single-process', // <- this one doesn't works in Windows
    // '--disable-gpu',
    // '--enable-webgl',
    // '--hide-scrollbars',
    '--mute-audio',
    // '--disable-infobars',
    // '--disable-breakpad',
    '--disable-web-security',
  ],
};
if (executablePath) {
  puppeteer_options['executablePath'] = executablePath;
}

export const setupAccount = (uname, pword) => {
  account = uname;
  password = pword;
};

export async function run() {
  let start = true;

  console.log(chalk('START ') + account, new Date().toLocaleString());
  const browser = await puppeteer.launch(puppeteer_options);

  let page = await browser.newPage();
  page.setDefaultNavigationTimeout(500000);
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });
  page.on('error', function (err) {
    const errorMessage = err.toString();
    console.log('browser error: ', errorMessage);
  });
  page.on('pageerror', function (err) {
    const errorMessage = err.toString();
    console.log('browser page error: ', errorMessage);
  });
  page.goto('https://next.splinterlands.com/login/email');
  page.recoverStatus = 0;
  page.favouriteDeck = process.env.FAVOURITE_DECK || '';
  while (start) {
    // console.log('Recover Status: ', page.recoverStatus);
    // if(!process.env.API) {
    //   console.log(chalk.bold.redBright.bgBlack('Dont pay scammers!'));
    //   console.log(chalk.bold.whiteBright.bgBlack('If you need support for the bot, join the telegram group https://t.me/splinterlandsbot and discord https://discord.gg/bR6cZDsFSX'));
    //   console.log(chalk.bold.greenBright.bgBlack('If you interested in a higher winning rate with the private API, contact the owner via discord or telegram'));
    // }
    await slPage.login(page, account, password).catch((e) => {
      console.log(e);
      throw new Error('Login Error');
    });
    await startPlayMatch(page, browser);
  }
}

async function startPlayMatch(page, browser) {
  console.log(new Date().toLocaleDateString(), 'opening browser...');
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3163.100 Safari/537.36');
    await page.setViewport({
      width: 1800,
      height: 1500,
      deviceScaleFactor: 1,
    });

    await page.goto('https://splinterlands.com/');
    await page.waitForTimeout(5000);

    let item = await page
      .waitForSelector('#log_in_button > button', {
        visible: true,
      })
      .then((res) => res)
      .catch(() => console.log('Already logged in'));

    if (item != undefined) {
      console.log('Login attempt...');
      await slPage.login(page, account, password).catch((e) => {
        console.log(e);
        throw new Error('Login Error');
      });
    }

    await page.goto('https://splinterlands.com/?p=battle_history');
    await page.waitForTimeout(8000);
    await closePopups(page);
    await closePopups(page);
    await clickOnElement(page, '#bh_wild_toggle', 1000, 2000);
  } catch (e) {
    console.log('Error handling browser not opened, internet connection issues, or battle cannot start:', e);
  }
}
