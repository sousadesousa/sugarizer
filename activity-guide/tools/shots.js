const { chromium } = require('playwright');
const fs = require('fs');
const acts = JSON.parse(fs.readFileSync(require('path').join(__dirname, '../../activities.json'), 'utf8'));
const out = process.argv[2];
const slow = /Scratch|Etoys|HumanBody|3DVolume|Planets|Constellation|Moon|Stickman|Physics|Turtle/;
async function noServer(ctxOrPage) {
  await ctxOrPage.route('**/js/sugarizer.js', async route => { const r = await route.fetch(); await route.fulfill({ response: r, body: (await r.text()).replace('noServerMode: false', 'noServerMode: true') }); });
}
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const first = await b.newContext({ viewport: { width: 1024, height: 640 } });
  await noServer(first);
  const p = await first.newPage();
  await p.goto('http://127.0.0.1:8090/index.html');
  await p.waitForTimeout(2500);
  if (await p.locator('.introjs-skipbutton').isVisible().catch(() => false)) await p.locator('.introjs-skipbutton').click();
  await p.locator('#newuser-icon').click();
  await p.locator('input[name=name]').fill('Kid');
  for (let k = 0; k < 4 && !(await p.locator('.home-icon').first().isVisible().catch(() => false)); k++) { await p.locator('#next-btn').click().catch(() => {}); await p.waitForTimeout(1000); }
  await p.locator('.home-icon').first().waitFor({ state: 'attached' });
  await p.waitForTimeout(800);
  const state = await first.storageState();
  await p.close();
  const queue = acts.map((a, i) => [i, a]);
  async function worker() {
    while (queue.length) {
      const [i, a] = queue.shift();
      const ctx = await b.newContext({ viewport: { width: 1024, height: 640 }, storageState: state });
      await noServer(ctx);
      const pg = await ctx.newPage();
      const errs = [];
      pg.on('pageerror', e => errs.push(e.message.slice(0, 100)));
      try {
        await pg.goto('http://127.0.0.1:8090/' + a.directory + '/index.html?aid=s' + i + '&a=' + a.id + '&n=' + encodeURIComponent(a.name), { timeout: 30000 });
        await pg.waitForTimeout(slow.test(a.directory) ? 9000 : 4500);
        const f = out + '/' + String(i).padStart(2, '0') + '.jpg';
        await pg.screenshot({ path: f, type: 'jpeg', quality: 62 });
        console.log('ok', i, a.name, fs.statSync(f).size, errs.length ? 'errors: ' + errs.join(' || ') : '');
      } catch (e) { console.log('FAIL', i, a.name, e.message.slice(0, 80)); }
      await ctx.close();
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  await b.close();
})();
