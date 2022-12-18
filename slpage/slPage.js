async function login(page, account, password) {
  try {
    // page.waitForSelector('button[type=button]').then(() => page.click('button[type=button]'));
    // page.goto('https://next.splinterlands.com/login');
    await page
      .waitForSelector('input[name=email]')
      .then(() => page.waitForTimeout(3000))
      .then(() => page.focus('input[name=email]'))
      .then(() => page.type('input[name=email]', account))
      .then(() => page.focus('input[name=password]'))
      .then(() => page.type('input[name=password]', password))
      // .then(() => page.waitForSelector('#login_dialog_v2 > div > div > div.modal-body > div > div > form > div > div.col-sm-offset-1 > button', { visible: true }).then(() => page.click('#login_dialog_v2 > div > div > div.modal-body > div > div > form > div > div.col-sm-offset-1 > button')))
      .then(() => page.click('button[type=submit]'))
      .then(() => page.waitForTimeout(5000))
      .then(() => page.reload())
      .then(() => page.waitForTimeout(5000))
      .then(() => page.reload())
      .then(() => page.waitForTimeout(3000))
      .then(async () => {
        await page
          .$('.bio', {
            visible: true,
            timeout: 3000,
          })
          .then(() => {
            console.log('logged in!');
          })
          .catch((e) => {
            console.log(e);
            console.log('didnt login');
            throw new Error('Didnt login');
          });
      })
      .then(() => page.waitForTimeout(2000))
      .then(() => page.reload());
  } catch (e) {
    console.log(e);
    console.log('Check that you used correctly username and posting key. (dont use email and password)');
  }
}

export default { login };
