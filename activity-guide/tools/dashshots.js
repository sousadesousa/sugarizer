const { chromium } = require('playwright');
const out = process.argv[2];
const base = 'http://127.0.0.1:8080';
async function signup(name, role) {
  const r = await fetch(base + '/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user: JSON.stringify({ name, password: 'pass1234', role, colorvalue: { stroke: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'), fill: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0') }, language: 'en' }) }) });
  return r.status;
}
(async () => {
  const admin = 'admin' + Date.now().toString().slice(-5);
  console.log('admin', await signup(admin, 'admin'));
  for (const n of ['Alice', 'Bruno', 'Chloe', 'Dmitri', 'Emma', 'Farid']) console.log(n, await signup(n + Date.now().toString().slice(-3), 'student'));
  console.log('teacher', await signup('Teacher' + Date.now().toString().slice(-3), 'teacher'));
  const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user: JSON.stringify({ name: admin, password: 'pass1234', role: 'admin' }) }) });
  const lj = await login.json();
  const H = { 'content-type': 'application/json', 'x-access-token': lj.token, 'x-key': lj.user._id };
  const cr = await fetch(base + '/api/v1/classrooms', { method: 'POST', headers: H, body: JSON.stringify({ classroom: JSON.stringify({ name: 'Class 1A', color: { stroke: '#005FE4', fill: '#00EA11' }, students: [] }) }) });
  console.log('classroom', cr.status);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(base + '/dashboard/login');
  await p.fill('input[name=username]', admin); await p.fill('input[name=password]', 'pass1234');
  await Promise.all([p.waitForNavigation(), p.click('button[type=submit]')]);
  const pages = { home: '/dashboard', users: '/dashboard/users', 'users-add': '/dashboard/users/add', activities: '/dashboard/activities', classrooms: '/dashboard/classrooms', 'classrooms-add': '/dashboard/classrooms/add/', stats: '/dashboard/stats', journal: '/dashboard/journal', assignments: '/dashboard/assignments', profile: '/dashboard/profile' };
  for (const [name, path] of Object.entries(pages)) {
    const r = await p.goto(base + path);
    await p.waitForTimeout(1200);
    for (let k = 0; k < 3; k++) {
      const skip = p.locator('.introjs-skipbutton, .introjs-donebutton').first();
      if (await skip.isVisible().catch(() => false)) { await skip.click().catch(() => {}); await p.waitForTimeout(400); }
    }
    const endBtn = p.getByText('End', { exact: true }).first();
    if (await endBtn.isVisible().catch(() => false)) { await endBtn.click().catch(() => {}); await p.waitForTimeout(500); }
    await p.waitForTimeout(600);
    const text = await p.evaluate(() => document.body.innerText.slice(0, 160).replace(/\n/g, ' | '));
    await p.screenshot({ path: out + '/' + name + '.jpg', type: 'jpeg', quality: 70 });
    console.log(r.status(), name, p.url().replace(base, ''), '::', text);
  }
  await b.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
