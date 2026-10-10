const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://127.0.0.1:8080/dashboard/login'); await p.waitForTimeout(1500);
  await p.screenshot({ path: process.argv[2] + '/login.jpg', type: 'jpeg', quality: 70 });
  await b.close();
})();
