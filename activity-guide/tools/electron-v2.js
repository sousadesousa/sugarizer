// Sugarizer 2.0 in Electron: new user, home, open Paint, draw
const { _electron: electron } = require('playwright');
const path = require('path');
(async () => {
  const appDir = process.argv[2];
  const app = await electron.launch({ executablePath: path.join(appDir, 'node_modules/electron/dist/electron'), args: ['--no-sandbox', appDir, '--window', '--init'], timeout: 60000 });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSize(1280, 800); });
  const errors = [];
  win.on('pageerror', e => errors.push(e.name + ': ' + e.message));
  win.on('console', m => { if (m.type() == 'error') errors.push('console: ' + m.text()); });
  await win.waitForTimeout(3500);
  const skip = win.locator('.introjs-skipbutton');
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await win.locator('#newuser-icon').click();
  await win.locator('input[name=name]').fill('Tester');
  for (let k = 0; k < 5 && !(await win.locator('.home-icon').first().isVisible().catch(() => false)); k++) {
    await win.getByText(/^(Next|Done)$/).first().click().catch(() => {});
    await win.waitForTimeout(1500);
  }
  await win.locator('.home-icon').first().waitFor({ state: 'attached', timeout: 20000 });
  await win.waitForTimeout(1000);
  if (await win.locator('.introjs-skipbutton').isVisible().catch(() => false)) await win.locator('.introjs-skipbutton').click();
  console.log('window', JSON.stringify(await win.evaluate(() => [innerWidth, innerHeight])), 'home icons', await win.locator('.home-icon').count());
  await win.locator('[id="org.olpcfrance.PaintActivity"]').first().click();
  await win.locator('#stop-button').waitFor({ timeout: 20000 });
  await win.waitForTimeout(1500);
  console.log('url', win.url().replace(appDir, '').slice(0, 90));
  const box = await win.locator('#paint-canvas').boundingBox();
  await win.mouse.move(box.x + 100, box.y + 100); await win.mouse.down();
  for (let s = 1; s < 15; s++) await win.mouse.move(box.x + 100 + s * 15, box.y + 100 + (s % 2) * 20);
  await win.mouse.up();
  const painted = await win.evaluate(() => { const c = document.getElementById('paint-canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200)) n++; return n; });
  console.log('painted pixels', painted);
  console.log('bridge', await win.evaluate(() => typeof window.sugarizerElectron + ' ' + typeof window.require));
  console.log('errors', JSON.stringify(errors.slice(0, 8)));
  await app.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
