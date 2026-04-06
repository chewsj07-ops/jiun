const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  // Set viewport for screenshot 1
  await page.setViewport({ width: 1080, height: 1920 });
  await page.goto('https://ais-dev-w36cpfaagcrdwerzp3qsmu-561984307826.asia-southeast1.run.app/', { waitUntil: 'networkidle0' });
  // Wait a bit for animations
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'public/screenshot1.jpg', type: 'jpeg', quality: 90 });

  // Screenshot 2 (maybe click a tab?)
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.innerText.includes('功德地图') || btn.innerText.includes('Merit')) {
        btn.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'public/screenshot2.jpg', type: 'jpeg', quality: 90 });

  // Feature Graphic
  await page.setViewport({ width: 1024, height: 500 });
  await page.goto('https://ais-dev-w36cpfaagcrdwerzp3qsmu-561984307826.asia-southeast1.run.app/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'public/feature_graphic.jpg', type: 'jpeg', quality: 90 });

  // Icon
  await page.setViewport({ width: 512, height: 512 });
  await page.screenshot({ path: 'public/icon.jpg', type: 'jpeg', quality: 90 });

  await browser.close();
})();
