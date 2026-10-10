const { chromium } = require('playwright');
const fs = require('fs');
const acts = JSON.parse(fs.readFileSync(require('path').join(__dirname, '../../activities.json'), 'utf8'));
const out = process.argv[2];
const steps = {
  'Paint': async p => {
    const box = await p.locator('#paint-canvas').boundingBox();
    async function stroke(pts) { await p.mouse.move(box.x + pts[0][0], box.y + pts[0][1]); await p.mouse.down(); for (const q of pts.slice(1)) await p.mouse.move(box.x + q[0], box.y + q[1], { steps: 6 }); await p.mouse.up(); }
    await p.locator('#size-button').click(); await p.locator('#size-button').click();
    await stroke([[300, 400], [300, 250], [450, 150], [600, 250], [600, 400], [300, 400]]);
    await p.locator('#stamps-button').click(); await p.locator('.palette .stamps button').nth(1).click(); await p.mouse.click(box.x + 780, box.y + 140);
    await p.waitForTimeout(500);
  },
  'Physics JS': async p => {
    for (const [btn, x, y] of [['circle-button', 300, 200], ['box-button', 500, 160], ['triangle-button', 650, 220], ['circle-button', 420, 330], ['box-button', 560, 300]]) {
      await p.locator('#' + btn).click(); await p.mouse.click(x, y); await p.waitForTimeout(150);
    }
    await p.locator('#run-button').click(); await p.waitForTimeout(2500);
  },
  'Gears': async p => {
    for (const [x, y] of [[300, 350], [450, 350], [600, 300]]) { await p.locator('#gear-button').click(); await p.mouse.click(x, y); await p.waitForTimeout(300); }
    await p.waitForTimeout(800);
  },
  'Get Things Done': async p => {
    for (const t of ['Draw a house', 'Count to 20', 'Read a story']) { await p.locator('#new-todo').fill(t); await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
  },
  '3D Volume': async p => { await p.locator('#cube-button').click(); await p.waitForTimeout(1500); await p.locator('#dodeca-button').click(); await p.waitForTimeout(1500); },
  'Human Body': async p => { await p.waitForTimeout(8000); }
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1024, height: 640 } });
  await ctx.route('**/js/sugarizer.js', async route => { const r = await route.fetch(); await route.fulfill({ response: r, body: (await r.text()).replace('noServerMode: false', 'noServerMode: true') }); });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8090/index.html'); await p.waitForTimeout(2500);
  if (await p.locator('.introjs-skipbutton').isVisible().catch(() => false)) await p.locator('.introjs-skipbutton').click();
  await p.locator('#newuser-icon').click(); await p.locator('input[name=name]').fill('Kid');
  for (let k = 0; k < 4 && !(await p.locator('.home-icon').first().isVisible().catch(() => false)); k++) { await p.locator('#next-btn').click().catch(() => {}); await p.waitForTimeout(1000); }
  await p.locator('.home-icon').first().waitFor({ state: 'attached' });
  for (const name of Object.keys(steps)) {
    const i = acts.findIndex(x => x.name == name), a = acts[i];
    const errs = [];
    p.removeAllListeners('pageerror'); p.on('pageerror', e => errs.push(e.message.slice(0, 80)));
    try {
      await p.goto('http://127.0.0.1:8090/' + a.directory + '/index.html?aid=x' + i + '&a=' + a.id + '&n=' + encodeURIComponent(name));
      await p.waitForTimeout(5000);
      await steps[name](p);
      await p.screenshot({ path: out + '/' + String(i).padStart(2, '0') + '.jpg', type: 'jpeg', quality: 62 });
      console.log('ok', i, name, errs.join('||'));
    } catch (e) { console.log('FAIL', name, e.message.slice(0, 100)); }
  }
  await b.close();
})();
