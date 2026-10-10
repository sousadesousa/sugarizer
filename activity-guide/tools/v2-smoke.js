// Smoke test of Sugarizer 2.0 served statically (no server): first screen, new user, home, open Paint
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() == 'error') errors.push('console: ' + m.text()); });
  p.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url().replace('http://127.0.0.1:8090', '')); });
  await p.route('**/js/sugarizer.js', async route => { const r = await route.fetch(); await route.fulfill({ response: r, body: (await r.text()).replace('noServerMode: false', 'noServerMode: true') }); });
  await p.goto('http://127.0.0.1:8090/index.html');
  await p.waitForTimeout(3000);
  await p.screenshot({ path: process.argv[2] + '-1-first.png' });
  console.log('body text start:', (await p.locator('body').innerText()).slice(0, 120).replace(/\n/g, ' | '));
  const skip = p.locator('.introjs-skipbutton');
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await p.locator('#newuser-icon').click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: process.argv[2] + '-2-newuser.png' });
  await p.locator('input[name=name]').fill('Tester');
  for (let k = 0; k < 4 && !(await p.locator('#homescreen').isVisible().catch(() => false)); k++) {
    await p.getByText(/^(Next|Done)$/).first().click().catch(() => {});
    await p.waitForTimeout(1500);
  }
  await p.locator('.home-icon').first().waitFor({ state: 'attached', timeout: 15000 });
  await p.waitForTimeout(1500);
  const tour = p.locator('.introjs-skipbutton');
  if (await tour.isVisible().catch(() => false)) await tour.click();
  await p.screenshot({ path: process.argv[2] + '-3-home.png' });
  console.log('home icons:', await p.locator('.home-icon').count());
  await p.locator('[id="org.olpcfrance.PaintActivity"]').first().click();
  await p.waitForTimeout(4000);
  console.log('after click url:', p.url());
  console.log('frames:', p.frames().map(f => f.url().replace('http://127.0.0.1:8090', '')).join(' , '));
  await p.screenshot({ path: process.argv[2] + '-4-paint.png' });
  console.log('errors', JSON.stringify(errors.slice(0, 12)));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
