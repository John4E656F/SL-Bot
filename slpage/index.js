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

// LOAD MY CARDS
async function getCards() {
  const myCards = await user.getPlayerCards(account);
  return myCards;
}

// LOAD RENTED CARDS AS PREFERRED
async function getPreferredCards() {
  const myPreferredCards = await user.getRentedCards(account);
  return myPreferredCards;
}

async function closePopups(page) {
  console.log('check if any modal needs to be closed...');
  if (await clickOnElement(page, '.close', 4000)) return;
  await clickOnElement(page, '.modal-close-new', 1000, 2000);
  await clickOnElement(page, '.modal-close', 4000, 2000);
}

async function checkEcr(page) {
  try {
    const ecr = await getElementTextByXpath(page, "//div[@class='sps-options'][1]/div[@class='value'][2]/div", 100);
    if (ecr) {
      console.log(chalk.bold.whiteBright.bgMagenta('Your current Energy Capture Rate is ' + ecr.split('.')[0] + '%'));
      return parseFloat(ecr);
    }
  } catch (e) {
    console.log(chalk.bold.redBright.bgBlack('ECR not defined'));
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

    const ecr = await checkEcr(page);
    if (ecr === undefined) throw new Error(chalk.red('Fail to get ECR!'));

    if (process.env.ECR_STOP_LIMIT && process.env.ECR_RECOVER_TO && ecr < parseFloat(process.env.ECR_STOP_LIMIT)) {
      if (ecr < parseFloat(process.env.ECR_STOP_LIMIT)) {
        console.log(
          chalk.bold.red(
            `ECR lower than limit ${process.env.ECR_STOP_LIMIT}%. reduce the limit in the env file config or wait until ECR will be at ${
              process.env.ECR_RECOVER_TO || '100'
            }%`,
          ),
        );
      } else if (ecr < parseFloat(process.env.ECR_RECOVER_TO)) {
        console.log(chalk.bold.red(`ECR Not yet Recovered to ${process.env.ECR_RECOVER_TO}`));
      }
      // calculating time needed for recovery
      ecrNeededToRecover = parseFloat(process.env.ECR_RECOVER_TO) - parseFloat(ecr);
      recoveryTimeInHours = Math.ceil(ecrNeededToRecover / ecrRecoveryRatePerHour);

      console.log(chalk.bold.white(`Time needed to recover ECR, approximately ${recoveryTimeInHours * 60} minutes.`));
      await closeBrowser(browser);
      console.log(
        chalk.bold.white(
          `Initiating sleep mode. The bot will awaken at ${new Date(Date.now() + recoveryTimeInHours * 3600 * 1000).toLocaleString()}`,
        ),
      );
      await sleep(recoveryTimeInHours * 3600 * 1000);

      throw new Error(`Restart needed.`);
    }
    // console.log('getting user quest info from splinterlands API...');
    // const quest = await getQuest();
    // if (!quest) {
    //   console.log('Error for quest details. Splinterlands API didnt work or you used incorrect username, remove @ and dont use email');
    // }
    // if (
    //   process.env.SKIP_QUEST &&
    //   quest?.splinter &&
    //   process.env.SKIP_QUEST.split(',').includes(quest?.splinter) &&
    //   quest?.total !== quest?.completed
    // ) {
    //   try {
    //     await page
    //       .click('#focus_new_btn')
    //       .then(async (a) => {
    //         await page.reload();
    //         console.log('New quest requested');
    //       })
    //       .catch((e) => console.log('Cannot click on new quest'));
    //   } catch (e) {
    //     console.log('Error while skipping new quest');
    //   }
    // }

    console.log('getting user cards collection from splinterlands API...');
    const myCards = await getCards()
      .then((x) => {
        console.log('cards retrieved:', x?.length);
        return x;
      })
      .catch(() => console.log('cards collection api didnt respond. Did you use username? avoid email!'));

    const myPreferredCards = await getPreferredCards()
      .then((x) => {
        console.log('delegated cards size:', x?.length, x);
        return x;
      })
      .catch(() => console.log('cards collection api didnt respond. Did you use username? avoid email!'));

    if (myCards) {
      console.log(account, ' deck size: ' + myCards.length);
    } else {
      console.log(account, ' playing only basic cards');
    }

    // LAUNCH the battle
    if (!(await launchBattle(page))) throw new Error('The Battle cannot start');
  } catch (e) {
    console.log('Error handling browser not opened, internet connection issues, or battle cannot start:', e);
  }
}
