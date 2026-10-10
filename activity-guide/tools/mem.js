const { chromium } = require('playwright');
const fs = require('fs');
const acts = JSON.parse(fs.readFileSync(require('path').join(__dirname, '../../activities.json'), 'utf8'));
function chromiumRssMb() {
  let total = 0, count = 0;
  for (const p of fs.readdirSync('/proc').filter(x => /^\d+$/.test(x))) {
    try {
      const exe = fs.readlinkSync('/proc/' + p + '/exe');
      if (!exe.includes('pw-browsers')) continue;
      const m = fs.readFileSync('/proc/' + p + '/status', 'utf8').match(/VmRSS:\s+(\d+)/);
      if (m) { total += +m[1]; count++; }
    } catch (e) {}
  }
  return [Math.round(total / 1024), count];
}
async function noServer(ctx) { await ctx.route('**/js/sugarizer.js', async route => { const r = await route.fetch(); await route.fulfill({ response: r, body: (await r.text()).replace('noServerMode: false', 'noServerMode: true') }); }); }
(async () => {
  const names = process.argv.slice(2);
  const rows = [];
  for (const name of ['(home screen)'].concat(names)) {
    const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
    const ctx = await b.newContext({ viewport: { width: 1024, height: 640 } });
    await noServer(ctx);
    const p = await ctx.newPage();
    let bytes = 0, reqs = 0;
    p.on('requestfinished', async r => { try { const s = await r.sizes(); bytes += s.responseBodySize + s.responseHeadersSize; reqs++; } catch (e) {} });
    await p.goto('http://127.0.0.1:8090/index.html'); await p.waitForTimeout(2500);
    if (await p.locator('.introjs-skipbutton').isVisible().catch(() => false)) await p.locator('.introjs-skipbutton').click();
    await p.locator('#newuser-icon').click(); await p.locator('input[name=name]').fill('Kid');
    for (let k = 0; k < 4 && !(await p.locator('.home-icon').first().isVisible().catch(() => false)); k++) { await p.locator('#next-btn').click().catch(() => {}); await p.waitForTimeout(1000); }
    await p.locator('.home-icon').first().waitFor({ state: 'attached' }); await p.waitForTimeout(1500);
    if (name !== '(home screen)') {
      bytes = 0; reqs = 0;
      const a = acts.find(x => x.name == name);
      await p.goto('http://127.0.0.1:8090/' + a.directory + '/index.html?aid=m&a=' + a.id + '&n=' + encodeURIComponent(name));
      await p.waitForTimeout(name.match(/Scratch|Etoys|Human/) ? 12000 : 6000);
    }
    const heap = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
    const [mb, n] = chromiumRssMb();
    rows.push([name, mb, n, heap, (bytes / 1048576).toFixed(1), reqs]);
    console.log(name.padEnd(16), 'browser total', String(mb).padStart(5), 'MB in', n, 'processes | JS heap', heap, 'MB | downloaded', (bytes / 1048576).toFixed(1), 'MB in', reqs, 'requests');
    await b.close();
  }
})();
