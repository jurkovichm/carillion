const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, height] of [[1440,900], [390,844]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.route('http://carillion.test/**', route => {
        const file = path.join(__dirname, '..', new URL(route.request().url()).pathname);
        return route.fulfill({ body: fs.readFileSync(file), contentType: ({ '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png' })[path.extname(file)] || 'application/octet-stream' });
      });
      await page.clock.install();
      await page.goto('http://carillion.test/index.html');
      await page.evaluate(() => Promise.all([characterSpritesReady, catchSpritesReady, harbourCanoeReady, harbourArtworkReady, loonSpritesReady]));
      await page.clock.runFor(32);
      const moveTo = async (x,y) => page.evaluate(([x,y]) => {
        document.body.classList.add('exploring');
        Object.assign(pregameAngler, { x, y, swimming:isPregameWater(x,y) });
        updateCanoePrompt();
        return !$('#canoePrompt').hidden;
      }, [x,y]);
      assert.equal(await moveTo(1745,900), true); // Existing right-bank boarding point.
      assert.equal(await moveTo(1100,1130), true); // Beside the actual canoe.
      assert.equal(await moveTo(1420,1000), true); // Along the bank-to-canoe approach.
      assert.equal(await moveTo(1100,1410), true); // Small exit margin avoids flicker.
      assert.equal(await moveTo(1100,1450), false);
      assert.equal(await moveTo(1100,1410), false); // Must reenter the normal range.
      assert.equal(await moveTo(950,480), false); // Bridge spawn does not offer boarding.
      assert.equal(await moveTo(1100,1130), true);
      await page.evaluate(() => { pregameAngler.x=100; pregameAngler.y=400; startCanoe(); });
      assert.equal(await page.evaluate(() => harbour.phase), 'dock'); // Reject stale prompts.
      assert.equal(await moveTo(1100,1130), true);
      await page.keyboard.press('e');
      assert.equal(await page.evaluate(() => harbour.phase), 'outbound');
      await page.evaluate(() => { cancelHarbourVisit(); returnToRiver(); });
      // Force a successful theft roll on every question: only question seven may activate.
      await page.evaluate(async () => { setQuickMode(true); Math.random=()=>0; await begin(); });
      for (let i=0;i<7;i++) {
        await page.evaluate(() => { $('#answerInput').value=questions[round].answers.find(a=>a.points>0).forms[0]; $('#answerForm').requestSubmit(); });
        await page.clock.runFor(10);
        assert.equal(await page.evaluate(() => roundState.phase), i===6 ? 'loonChoice' : 'roundEnd');
        if (i<6) await page.locator('#descendBtn').click();
      }
      await page.locator('#leaveLoon').click(); await page.clock.runFor(10);
      assert.equal(await page.evaluate(() => roundState.phase), 'question');
      await page.evaluate(() => { $('#answerInput').value=questions[round].answers.find(a=>a.points>0 && !used.has(normalizeAnswer(a.forms[0]))).forms[0]; $('#answerForm').requestSubmit(); });
      await page.clock.runFor(10);
      assert.equal(await page.evaluate(() => roundState.phase), 'roundEnd'); // No second theft on retry.
      // Give Up follows the same eligibility rule.
      await page.evaluate(async () => { returnToRiver(); await begin(); });
      for (let i=0;i<7;i++) {
        await page.locator('#giveUpBtn').click(); await page.clock.runFor(10);
        assert.equal(await page.evaluate(() => roundState.phase), i===6 ? 'loonChoice' : 'roundEnd');
        if (i<6) await page.locator('#descendBtn').click();
      }
      assert.deepEqual(errors, []);
      console.log(`${width}x${height}: canoe approach, hull, boundary margin, stale prompt, keyboard boarding, and question-7-only fish/loot theft passed`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
