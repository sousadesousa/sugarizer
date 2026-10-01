// Sugarizer 2.0 client served by Sugarizer Server: sign up, home, open Paint, reload and log in again
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:8080';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() == 'error' && !m.text().includes('404')) errors.push('console: ' + m.text()); });
  p.on('response', r => { const u = r.url().replace(base, ''); if (u.startsWith('/auth') || u.startsWith('/api')) console.log('  ', r.request().method(), u.split('?')[0], r.status()); else if (r.status() >= 400 && !/locales\/.*-/.test(u)) errors.push(r.status() + ' ' + u); });
  await p.goto(base + '/');
  await p.waitForTimeout(3000);
  const skip = p.locator('.introjs-skipbutton');
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await p.locator('#newuser-icon').click();
  await p.waitForTimeout(1000);
  const name = 'kid' + Date.now().toString().slice(-6);
  await p.locator('input[name=name]').fill(name);
  for (let k = 0; k < 6 && !(await p.locator('.home-icon').first().isVisible().catch(() => false)); k++) {
    // password step: pick the first four emojis
    if (await p.getByText('Choose at least 4 images').isVisible().catch(() => false)) {
      for (const x of [495, 557, 617, 678]) { await p.mouse.click(x, 330); await p.waitForTimeout(200); }
    }
    await p.screenshot({ path: process.argv[2] + '-step' + k + '.png' });
    await p.getByText(/^(Next|Done)$/).first().click().catch(() => {});
    await p.waitForTimeout(1500);
  }
  await p.locator('.home-icon').first().waitFor({ state: 'attached', timeout: 15000 });
  await p.waitForTimeout(1000);
  if (await p.locator('.introjs-skipbutton').isVisible().catch(() => false)) await p.locator('.introjs-skipbutton').click();
  console.log('signed up as', name, 'icons', await p.locator('.home-icon').count());
  await p.screenshot({ path: process.argv[2] + '-home.png' });
  console.log('errors', JSON.stringify(errors.slice(0, 10)));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
