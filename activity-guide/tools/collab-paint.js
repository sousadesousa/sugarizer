// Two users share Paint through Sugarizer Server: host in activity dir argv[2], guest in argv[3]
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:8080';
const id = 'org.olpcfrance.PaintActivity';

async function signup(browser, name) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 700 } });
  const p = await context.newPage();
  p.errors = [];
  p.on('pageerror', e => p.errors.push(name + ': ' + e.message));
  p.on('response', r => { if (r.status() == 404 && !/locales\/.*-/.test(r.url())) p.errors.push(name + ' 404 ' + r.url().replace(base, '')); });
  p.on('console', m => { if (m.type() == 'error' && !m.text().includes('404')) p.errors.push(name + ' console: ' + m.text()); });
  await p.goto(base + '/');
  await p.waitForTimeout(2500);
  if (await p.locator('.introjs-skipbutton').isVisible().catch(() => false)) await p.locator('.introjs-skipbutton').click();
  await p.locator('#newuser-icon').click();
  await p.waitForTimeout(800);
  await p.locator('input[name=name]').fill(name);
  for (let k = 0; k < 6 && !(await p.locator('.home-icon').first().isVisible().catch(() => false)); k++) {
    if (await p.getByText('Choose at least 4 images').isVisible().catch(() => false)) {
      for (const x of [495, 557, 617, 678]) { await p.mouse.click(x, 330); await p.waitForTimeout(200); }
    }
    await p.locator('#next-btn').click().catch(() => {});
    await p.waitForTimeout(1500);
  }
  await p.locator('.home-icon').first().waitFor({ state: 'attached', timeout: 20000 });
  await p.waitForTimeout(800);
  if (await p.locator('.introjs-skipbutton').isVisible().catch(() => false)) await p.locator('.introjs-skipbutton').click();
  return p;
}

function painted(p) {
  return p.evaluate(() => { const c = document.getElementById('paint-canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200)) n++; return n; });
}

async function stroke(p, y) {
  const box = await p.locator('#paint-canvas').boundingBox();
  await p.mouse.move(box.x + 100, box.y + y); await p.mouse.down();
  for (let s = 1; s <= 20; s++) await p.mouse.move(box.x + 100 + s * 15, box.y + y + (s % 2) * 20);
  await p.mouse.up();
}

async function waitFor(what, fn, timeout) {
  const end = Date.now() + (timeout || 10000);
  let last;
  while (Date.now() < end) { last = await fn(); if (last.ok) return last; await new Promise(r => setTimeout(r, 300)); }
  throw new Error(what + ' ' + JSON.stringify(last));
}

(async () => {
  const [hostDir, guestDir] = [process.argv[2], process.argv[3]];
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const suffix = Date.now().toString().slice(-5);
  const host = await signup(browser, 'host' + suffix);
  const guest = await signup(browser, 'guest' + suffix);

  await host.goto(base + '/activities/' + hostDir + '/index.html?aid=h' + suffix + '&a=' + id + '&n=Paint');
  await host.locator('#stop-button').waitFor(); await host.waitForTimeout(1500);
  await stroke(host, 80);
  const before = await painted(host);

  // share
  await host.locator('#network-button').click();
  await host.locator('#shared-button').click();
  const sharedId = (await waitFor('shared id', () => host.evaluate(() => {
    const app = document.querySelector('#app');
    const presence = app && app.__vue_app__ ? app.__vue_app__._container._vnode.component.proxy.presence : (window.PaintApp && PaintApp.data.presence);
    const info = presence && presence.getSharedInfo && presence.getSharedInfo();
    return { ok: !!(info && info.id), id: info && info.id };
  }))).id;
  console.log('shared', sharedId);

  // join: the guest receives the current drawing
  await guest.goto(base + '/activities/' + guestDir + '/index.html?aid=g' + suffix + '&a=' + id + '&n=Paint&s=' + sharedId);
  await guest.locator('#stop-button').waitFor();
  await waitFor('guest gets drawing', async () => { const n = await painted(guest); return { ok: n == before, n, before }; }, 15000);
  console.log('guest received the drawing', before);
  const hostJoin = await host.locator('.humane').textContent().catch(() => '');
  console.log('host notification:', hostJoin.trim());
  console.log('guest undo disabled:', await guest.locator('#undo-button').evaluate(b => b.disabled || b.style.opacity == '0.4'));

  // host draws, guest sees
  await stroke(host, 200);
  const hostNow = await painted(host);
  await waitFor('guest sees host stroke', async () => { const n = await painted(guest); return { ok: Math.abs(n - hostNow) < hostNow * 0.05, n, hostNow }; });
  console.log('guest sees host stroke', hostNow);

  // guest draws, host sees
  await stroke(guest, 320);
  const guestNow = await painted(guest);
  await waitFor('host sees guest stroke', async () => { const n = await painted(host); return { ok: Math.abs(n - guestNow) < guestNow * 0.05, n, guestNow }; });
  console.log('host sees guest stroke', guestNow);

  // host clears, guest cleared
  await host.locator('#clear-button').click();
  await waitFor('guest cleared', async () => { const n = await painted(guest); return { ok: n == 0, n }; });
  console.log('clear shared');

  console.log('errors', JSON.stringify(host.errors.concat(guest.errors)));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
