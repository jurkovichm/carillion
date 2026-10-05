// Run with Playwright installed; set PLAYWRIGHT_MODULE and BROWSER_CHANNEL if needed.
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
    for (const [width, height, reduced] of [[1440, 900, false], [390, 844, false], [320, 568, true], [844, 390, false]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.install();
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
      await page.evaluate(() => characterSpritesReady);
      assert.equal(await page.locator('[name=castMode]:checked').inputValue(), 'single');
      assert.equal(await page.locator('#selectDay').inputValue(), await page.evaluate(() => window.DIVE_DAYS.at(-1).id));
      await page.locator('#selectDay').selectOption('2026-09-29');
      await page.screenshot({ path: `/private/tmp/carillion-home-${width}.png` });
      await page.locator('#begin').click();
      await page.waitForFunction(() => roundState.phase === 'question' && bridgeReady);
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
      const submit = text => page.evaluate(text => { document.querySelector('#answerInput').value = text; document.querySelector('#answerForm').requestSubmit(); }, text);
      await submit('zzzzzzzzzzzzzzzz');
      assert.equal(await page.locator('#answerInput').inputValue(), '');
      assert.equal(await page.evaluate(() => roundState.phase), 'question');
      assert.equal(await page.locator('#catchCaption').count(), 0);
      assert(await page.evaluate(() => basketAtlas.complete && basketAtlas.naturalWidth > 0));
      await page.clock.runFor(240);
      const waterFrame = await page.evaluate(() => waterFlowFrame);
      assert(await page.evaluate(() => waterMaskReady));
      assert(await page.evaluate(() => {
        const flow = waterFlowPixels.getContext('2d').getImageData(0, 0, 320, 534).data;
        const mask = waterMask.getContext('2d').getImageData(0, 0, 320, 534).data;
        return flow.every((value, index) => index % 4 !== 3 || !value || mask[index] === 255);
      }));
      assert(await page.evaluate(() => waterFlowPixels.getContext('2d').getImageData(0, 0, 320, 534).data.some((value, index) => index % 4 === 3 && value > 0)));
      await page.clock.runFor(240);
      assert(reduced ? (await page.evaluate(() => waterFlowFrame)) === waterFrame : (await page.evaluate(() => waterFlowFrame)) > waterFrame);

      assert.equal(await page.evaluate(() => CATCH_FLIGHT_MS), reduced ? 0 : 1400);
      for (let question = 0; question < 7; question++) {
        await submit(await page.evaluate(() => questions[round].answers[0].forms[0]));
        const revealDelay = await page.evaluate(() => fishingCatch.revealDelay);
        const remaining = await page.evaluate(() => roundState.remainingMs);
        await page.clock.runFor(revealDelay - 1);
        assert.equal(await page.evaluate(() => fishingCatch.revealed), false);
        await page.clock.runFor(1);
        assert.equal(await page.evaluate(() => fishingCatch.revealed), true);
        assert.equal(await page.evaluate(() => shoreCatches.length), question);
        assert.equal(await page.evaluate(() => roundState.remainingMs), remaining);
        await page.clock.runFor(1600);
        assert.equal(await page.evaluate(() => roundState.phase), 'roundEnd');
        assert.equal(await page.locator('#descendBtn').textContent(), 'Next Cast');
        await page.clock.fastForward(30000);
        assert.equal(await page.evaluate(() => roundState.phase), 'roundEnd');
        assert.equal(await page.locator('#answerResult').isVisible(), true);
        if (question === 0) await page.screenshot({ path: `/private/tmp/carillion-result-${width}.png` });
        await page.locator('#descendBtn').click();
      }
      assert.equal(await page.evaluate(() => roundState.phase), 'summary');
      const share = await page.evaluate(() => catchShareText());
      assert.equal(share.split('\n')[0], 'Carillion 29 Sep 2026');
      assert.equal(Array.from(share.split('\n')[1]).length, 7);
      assert.equal(share.split('\n').length, 3);
      assert(!share.includes('Tiger'));
      assert.equal(await page.evaluate(() => catchShareText(true)), share);
      await page.locator('#playAgain').click();
      await page.locator('#selectDay').selectOption('2026-09-28');
      await page.locator('[name=castMode][value=multi]').check();
      await page.locator('#begin').click();
      await page.waitForFunction(() => roundState.phase === 'question');
      assert((await page.locator('#promptText').textContent()).includes('MIAC'));
      for (const text of ['Carleton', 'St Olaf']) { await submit(text); await page.clock.runFor(3200); }
      assert.equal(await page.evaluate(() => roundState.record.catches.length), 2);
      await page.screenshot({ path: `/private/tmp/carillion-basket-${width}.png` });
      assert.equal(await page.evaluate(() => roundState.phase), 'question');
      await submit('Carleton');
      assert.equal(await page.locator('#answerInput').inputValue(), '');
      await page.evaluate(() => finishQuestion('giveup'));
      assert.equal(await page.evaluate(() => roundState.phase), 'roundEnd');
      assert((await page.evaluate(() => catchShareText())).startsWith('Carillion 28 Sep 2026\n'));
      await page.evaluate(() => {
        roundLog[0].catches.push({ name: 'Rare test answer', points: 100 });
      });
      assert.equal(Array.from((await page.evaluate(() => catchShareText())).split('\n')[1])[0], '\uD83E\uDD2F');
      // Settings must preserve the remaining answer time in an active question.
      await page.evaluate(async () => { returnToRiver(); await begin(); });
      await page.evaluate(() => show('SETTINGS', '<p>Settings</p>'));
      const paused = await page.evaluate(() => roundState.remainingMs);
      await page.clock.runFor(5000);
      assert.equal(await page.evaluate(() => roundState.remainingMs), paused);
      await page.evaluate(() => close());
      await page.waitForFunction(() => timer !== null);
      await page.clock.runFor(200);
      assert((await page.evaluate(() => roundState.remainingMs)) < paused);
      // Quick mode still completes an empty timeout and records its penalty.
      await page.evaluate(async () => {
        returnToRiver();
        setQuickMode(true);
        await begin();
        finishQuestion('timeout');
      });
      await page.clock.runFor(100);
      assert.equal(await page.evaluate(() => roundState.phase), 'roundEnd');
      assert.equal(await page.evaluate(() => score), -5);
      assert.equal(await page.evaluate(() => roundState.record.catches.length), 0);
      assert(['boot', 'skeleton'].includes(await page.evaluate(() => roundState.record.loot.kind)));
      // Exercise every rarity through its real answer path and delayed reveal.
      if (width !== 844) {
        const durations = {10: 650, 15: 2400, 30: 1000, 60: 1800, 85: 3400, 100: 4400};
        for (const points of [10, 15, 30, 60, 85, 100]) {
          const answer = await page.evaluate(async points => {
            returnToRiver(); setQuickMode(false); selectedMode = 'single';
            selectedDay = window.DIVE_DAYS.find(day => day.questions.some(q => q.answers.some(a => a.points === points)));
            await begin();
            round = questions.findIndex(q => q.answers.some(a => a.points === points)); next();
            return questions[round].answers.find(a => a.points === points).forms[0];
          }, points);
          await submit(answer);
          const duration = reduced ? 300 : durations[points];
          assert.equal(await page.evaluate(() => fishingCatch.revealDelay), duration);
          const remaining = await page.evaluate(() => roundState.remainingMs);
          const middle = Math.floor(duration * .76);
          await page.clock.runFor(middle);
          assert.equal(await page.evaluate(() => score), 0);
          assert.equal(await page.locator('#answerResult').isVisible(), false);
          if (!reduced && [15, 85, 100].includes(points)) {
            await page.screenshot({path: `/private/tmp/carillion-bite-${points}-${width}.png`});
          }
          await page.clock.runFor(duration - middle - 1);
          assert.equal(await page.evaluate(() => fishingCatch.revealed), false);
          await page.clock.runFor(1);
          assert.equal(await page.evaluate(() => fishingCatch.revealed), true);
          assert.equal(await page.evaluate(() => score), points);
          assert.equal(await page.evaluate(() => roundState.remainingMs), remaining);
          await page.clock.runFor(1600);
          assert.equal(await page.evaluate(() => roundState.phase), 'roundEnd');
          assert.equal(await page.evaluate(() => shoreCatches.length), 1);
        }
      }
      assert.deepEqual(errors, []);
      console.log(`${width}x${height}: defaults, single-cast persistence, retries, timing, sharing, day switching and multi-cast passed`);
      await page.close();
    }
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
