// Run with PLAYWRIGHT_MODULE and BROWSER_CHANNEL as for game.cjs.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  try {
    for (const [width, height, reduced] of [[1440,900,false], [390,844,false], [320,568,true], [844,390,false]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 900, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => { Math.random = () => .5; });
      await page.route('http://carillion.test/**', route => {
        const file = path.join(root, new URL(route.request().url()).pathname);
        return route.fulfill({ body: fs.readFileSync(file), contentType: ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)] || 'application/octet-stream' });
      });
      await page.clock.install(); await page.goto('http://carillion.test/index.html');
      await page.evaluate(() => Promise.all([characterSpritesReady, basketSpritesReady, catchSpritesReady, loonSpritesReady]));
      await page.waitForFunction(() => bridgeReady && fishingSceneView);
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
      assert.equal(await page.locator('#selectDay').inputValue(), '2026-10-03');
      assert.equal(await page.locator('#selectDay option[value="2026-10-05"]').count(), 0);
      assert.equal(await page.locator('#walkStick').isVisible(), width < 900);
      assert.equal(await page.evaluate(() => loonFrames.length), 4);
      assert(await page.evaluate(() => loonFrames.every(f => f.beak.x > 180 && f.beak.x < 240 && f.beak.y > 40 && f.beak.y < 120)));
      await page.screenshot({path:`/private/tmp/carillion-joystick-home-${width}.png`});
      if (width < 900) {
        // Select a different face on each mobile layout without starting trivia.
        const character = width === 390 ? 0 : width === 320 ? 2 : 1;
        await page.locator('#chooseAngler').click();
        await page.locator(`.character-choice[data-character="${character}"]`).click();
        await page.locator('#closePicker').click();
        const box = await page.locator('#walkStick').boundingBox();
        const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
        await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 36, cy);
        await page.clock.runFor(200);
        assert((await page.evaluate(() => pregameAngler.x)) > 950);
        await page.evaluate(() => walkStick.dispatchEvent(new PointerEvent('pointercancel', { pointerId: walkInput.pointer })));
        const stopped = await page.evaluate(() => pregameAngler.x);
        await page.clock.runFor(200); assert.equal(await page.evaluate(() => pregameAngler.x), stopped);
        await page.mouse.up(); await page.locator('#walkMenu').click();
        await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 36, cy);
        await page.clock.runFor(500); await page.screenshot({path:`/private/tmp/carillion-walking-${width}.png`});
        await page.clock.runFor(width === 844 ? 6500 : 4000); await page.mouse.up();
        assert.equal(await page.evaluate(() => roundState.phase), 'flappy');
        assert.equal(await page.evaluate(() => flightState.character), character);
        assert.equal(await page.evaluate(() => score), 0);
        assert.equal(await page.evaluate(() => roundLog.length), 0);
        assert.equal(await page.locator('#begin').evaluate(el => el.inert || el.closest('[inert]') !== null), true);
        await page.locator('#flightStart').click(); await page.clock.runFor(100);
        assert.equal(await page.evaluate(() => flightState.phase), 'playing');
        await page.screenshot({path:`/private/tmp/carillion-flappy-${width}.png`});
        await page.locator('#pauseFlight').click();
        const birdY = await page.evaluate(() => flightState.bird.y);
        await page.clock.runFor(1000); assert.equal(await page.evaluate(() => flightState.bird.y), birdY);
        await page.locator('#flightStart').click(); await page.clock.runFor(2000);
        assert.equal(await page.evaluate(() => flightState.phase), 'over');
        await page.locator('#flightStart').click();
        assert.equal(await page.evaluate(() => flightState.score), 0);
        if (width === 390) {
          // Fly through real obstacles with keyboard flaps, then persist the earned best.
          for (let step = 0; step < 70; step++) {
            await page.clock.runFor(100);
            const bird = await page.evaluate(() => ({ ...flightState.bird, phase: flightState.phase }));
            assert.equal(bird.phase, 'playing');
            if (bird.y > 320 && bird.velocity > 0) await page.keyboard.press('ArrowUp');
          }
          assert((await page.evaluate(() => flightState.score)) >= 2);
          await page.screenshot({path:'/private/tmp/carillion-flappy-scoring.png'});
          await page.clock.runFor(2000);
          assert.equal(await page.evaluate(() => flightState.phase), 'over');
          assert((await page.evaluate(() => flightState.best)) >= 2);
          assert.equal(await page.evaluate(() => Number(localStorage.getItem('carillion-flight-best'))), await page.evaluate(() => flightState.best));
        }
        await page.locator('#leaveFlight').click();
        assert.equal(await page.evaluate(() => roundState.phase), 'home');
        assert.equal(await page.evaluate(() => pregameAngler.x), 950);
        assert.equal(await page.locator('#selectDay').inputValue(), '2026-10-03');
        assert.equal(await page.locator('#begin').evaluate(el => el.inert || el.closest('[inert]') !== null), false);
      }
      // Use a stable historical pack for gameplay checks, independently of the default day.
      await page.evaluate(async () => { selectedDay = window.DIVE_DAYS.find(day => day.id === '2026-09-28'); setQuickMode(true); await begin(); });
      const submit = async text => {
        await page.locator('#answerInput').fill(text);
        await page.locator('#answerForm button').click();
        const cast = await page.evaluate(() => fishingCast?.duration || 0);
        if (cast) await page.clock.fastForward(cast);
      };
      const land = async () => {
        const reveal = await page.evaluate(() => fishingCatch?.revealDelay || 0);
        await page.clock.fastForward(Math.max(1, reveal));
        await page.clock.fastForward(await page.evaluate(() => quickMode ? 1 : CATCH_FLIGHT_MS + CATCH_SETTLE_MS));
      };
      // Save a previous round's fish, then force theft in the current 10-point round.
      await page.evaluate(async () => { returnToRiver(); Math.random = () => .5; await begin(); });
      await submit('Bethel'); await land();
      assert.equal(await page.evaluate(() => roundState.phase), 'roundEnd');
      await page.locator('#descendBtn').click();
      await page.evaluate(() => { setQuickMode(false); Math.random = () => .099; });
      await submit('Hennepin'); await land();
      assert.equal(await page.evaluate(() => roundState.phase), 'loon');
      assert.equal(await page.evaluate(() => round), 1);
      assert.equal(await page.evaluate(() => timer), null);
      if (!reduced) {
        assert.equal(await page.evaluate(() => score), 25);
        await page.clock.runFor(1100); await page.screenshot({path:`/private/tmp/carillion-loon-approach-${width}.png`});
        await page.clock.runFor(150); await page.screenshot({path:`/private/tmp/carillion-loon-steal-${width}.png`});
      } else await page.clock.runFor(100);
      assert.equal(await page.evaluate(() => score), 15);
      assert.equal(await page.evaluate(() => shoreCatches.length), 1);
      assert.equal(await page.evaluate(() => caughtFish.length), 1);
      assert.equal(await page.evaluate(() => roundLog[0].catches[0].name), 'Bethel University');
      await page.clock.fastForward(reduced ? 600 : 1550);
      assert.equal(await page.evaluate(() => roundState.phase), 'question');
      assert.equal(await page.evaluate(() => round), 1);
      assert.equal(await page.evaluate(() => roundState.remainingMs), 25000);
      assert.equal(await page.evaluate(() => used.size), 0);
      assert.equal(await page.evaluate(() => fishingLineInWater), false);
      assert.equal(await page.evaluate(() => roundState.record.catches.length), 0);
      await page.evaluate(() => { Math.random = () => 0; });
      await submit('Hennepin'); await land();
      assert.equal(await page.evaluate(() => roundState.phase), 'roundEnd'); // Even a forced theft roll cannot steal again on retry.
      assert.equal(await page.evaluate(() => score), 25);
      // High-point fish get the same 10% chance; the next attempt keeps the same question.
      const rareAnswer = await page.evaluate(async () => {
        returnToRiver(); setQuickMode(true); Math.random = () => .099; await begin();
        round = questions.findIndex(q => q.answers.some(answer => answer.points === 100)); next();
        return { round, text: questions[round].answers.find(answer => answer.points === 100).forms[0] };
      });
      await submit(rareAnswer.text); await land(); await page.clock.runFor(5);
      assert.equal(await page.evaluate(() => roundState.phase), 'question');
      assert.equal(await page.evaluate(() => round), rareAnswer.round);
      assert.equal(await page.evaluate(() => score), 0);
      assert.equal(await page.evaluate(() => caughtFish.length), 0);
      // Multi-cast loses just the stolen fish and can recatch it without duplicating the others.
      await page.evaluate(async () => { returnToRiver(); selectedMode = 'multi'; Math.random = () => .5; await begin(); });
      for (const text of ['Carleton', 'Bethel', 'St Olaf']) { await submit(text); await land(); }
      await page.evaluate(() => { Math.random = () => .099; });
      await page.locator('#giveUpBtn').click(); await page.clock.runFor(5);
      assert.equal(await page.evaluate(() => roundState.phase), 'question');
      assert.equal(await page.evaluate(() => score), 25);
      assert.equal(await page.evaluate(() => roundState.record.points), 25);
      assert.equal(await page.evaluate(() => roundState.record.catches.length), 2);
      assert.equal(await page.evaluate(() => caughtFish.length), 2);
      await submit('Bethel'); assert.equal(await page.evaluate(() => score), 25);
      await page.evaluate(() => { Math.random = () => .5; });
      await submit('St Olaf'); await land(); await page.locator('#giveUpBtn').click();
      assert.equal(await page.evaluate(() => roundState.phase), 'roundEnd');
      assert.equal(await page.evaluate(() => score), 35);
      assert.equal(await page.evaluate(() => roundState.record.catches.length), 3);
      // Give Up's consolation is eligible, without removing an earlier fish.
      await page.evaluate(async () => { returnToRiver(); selectedMode = 'single'; setQuickMode(true); Math.random = () => 0; await begin(); });
      await submit('Carleton'); await land(); await page.clock.runFor(5);
      assert.equal(await page.evaluate(() => roundState.phase), 'question');
      assert.equal(await page.evaluate(() => score), 0);
      assert.equal(await page.evaluate(() => shoreCatches.length), 0);
      await page.evaluate(() => { Math.random = () => .5; });
      await submit('Bethel'); await land(); await page.locator('#descendBtn').click();
      await page.evaluate(() => { Math.random = () => 0; });
      await page.locator('#giveUpBtn').click(); await land();
      await page.clock.runFor(5);
      assert.equal(await page.evaluate(() => roundState.phase), 'question');
      assert.equal(await page.evaluate(() => caughtFish.length), 1);
      assert.equal(await page.evaluate(() => score), 15);
      assert.equal(await page.evaluate(() => roundState.record.loot), null);
      assert.equal(await page.evaluate(() => shoreCatches.length), 1);
      // All three consolation kinds can be stolen on the first question, refunding penalties.
      for (const [lootRoll, kind, points] of [[.05,'bottle',0],[.3,'boot',-5],[.8,'skeleton',-5]]) {
        await page.evaluate(async () => { returnToRiver(); setQuickMode(false); Math.random = () => .5; await begin(); });
        await page.evaluate(roll => { Math.random = () => roll; }, lootRoll);
        await page.locator('#giveUpBtn').click();
        const cast = await page.evaluate(() => fishingCast?.duration || 0);
        if (cast) await page.clock.fastForward(cast);
        assert.equal(await page.evaluate(() => fishingCatch.kind), kind);
        // The loot choice and the independent 10% theft roll use distinct draws.
        await page.evaluate(() => { Math.random = () => .099; });
        await land();
        assert.equal(await page.evaluate(() => roundState.phase), 'loon');
        if (!reduced) assert.equal(await page.evaluate(() => score), points);
        await page.clock.fastForward(reduced ? 1 : 1176);
        assert.equal(await page.evaluate(() => score), 0);
        assert.equal(await page.evaluate(() => roundState.record.loot), null);
        assert.equal(await page.evaluate(() => shoreCatches.length), 0);
        await page.clock.fastForward(reduced ? 699 : 1624);
        assert.equal(await page.evaluate(() => roundState.phase), 'question');
        assert.equal(await page.evaluate(() => round), 0);
        assert.equal(await page.evaluate(() => roundState.remainingMs), 25000);
        assert.equal(await page.evaluate(() => roundState.record.points), 0);
      }
      assert.deepEqual(errors, []);
      console.log(`${width}x${height}: walking/flight, default day, theft/retry, probability boundary and safe prior catches passed`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
