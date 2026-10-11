// Run with the same Playwright environment as tests/game.cjs.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [844, 390]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
      await page.waitForFunction(() => bridgeReady);
      await page.getByRole('button', { name: 'Open settings' }).click();
      assert.equal(await page.locator('#selectTheme').inputValue(), 'classic');
      await page.locator('#selectTheme').selectOption('autumn');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'autumn');
      assert.equal(await page.evaluate(() => localStorage.getItem('carillion-theme')), 'autumn');
      const box = await page.locator('#selectTheme').boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width);
      assert(box.y >= 0 && box.y + box.height <= height);
      // Recolor foliage once, preserving every other pixel including water and alpha.
      assert(await page.evaluate(() => {
        const alt = themedScenery(bridgePixels);
        if (alt === bridgePixels || themedScenery(bridgePixels) !== alt) return false;
        const original = bridgePixels.getContext('2d').getImageData(0, 0, 320, 534).data;
        const autumn = alt.getContext('2d').getImageData(0, 0, 320, 534).data;
        let changed = 0;
        for (let i = 0; i < original.length; i += 4) {
          if (original[i + 3] !== autumn[i + 3]) return false;
          if (original[i] !== autumn[i] || original[i + 1] !== autumn[i + 1] || original[i + 2] !== autumn[i + 2]) {
            changed++;
            if (!(original[i + 1] > original[i] * 1.12 && original[i + 1] > original[i + 2] * 1.18)) return false;
          }
        }
        return changed > 1000;
      }));
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.screenshot({ path: `/private/tmp/carillion-autumn-${width}.png` });
      await page.evaluate(() => Promise.all([characterSpritesReady, catchSpritesReady]));
      await page.locator('#begin').click();
      await page.waitForFunction(() => roundState.phase === 'question');
      assert(await page.locator('#answerInput').isVisible());
      await page.screenshot({ path: `/private/tmp/carillion-autumn-playing-${width}.png` });
      await page.reload();
      await page.getByRole('button', { name: 'Open settings' }).click();
      assert.equal(await page.locator('#selectTheme').inputValue(), 'autumn');
      await page.locator('#selectTheme').selectOption('classic');
      assert(await page.evaluate(() => themedScenery(bridgePixels) === bridgePixels));
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'classic');
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('Autumn theme: desktop, mobile, landscape, palette preservation, caching, switching, and persistence passed.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
