import dontenv from 'dotenv';
dontenv.config();
import { run, setupAccount } from './index.js';
import chalk from 'chalk';

async function startSingle() {
  let account = process.env.ACCOUNT.split('@')[0];
  let password = process.env.PASSWORD;

  if (account.includes(',')) {
    console.error(chalk.red('There is a comma in your account name.'));
    throw new Error(chalk.yellow('Invalid account value'));
  }

  setupAccount(account, password);
  await run();
}

(async () => {
  console.log(chalk.blue('Running Single Mode'));
  await startSingle();
})();
