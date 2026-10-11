const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {}) });
  try {
    for (const [width,height,reduced] of [[1440,900,false],[390,844,false],[320,568,true],[844,390,false]].filter(([w]) => !process.env.TEST_VIEWPORT || w === Number(process.env.TEST_VIEWPORT))) {
      const page = await browser.newPage({viewport:{width,height}, reducedMotion:reduced?'reduce':'no-preference'});
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.route('http://carillion.test/**', route => {
        const file = path.join(__dirname,'..',new URL(route.request().url()).pathname);
        return route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)] || 'application/octet-stream'});
      });
      await page.clock.install({time:new Date('2026-10-08T12:00:00Z')});
      await page.clock.pauseAt(new Date('2026-10-08T12:00:01Z'));
      await page.goto('http://carillion.test/index.html');
      await page.evaluate(() => Promise.all([characterSpritesReady,catchSpritesReady,loonSpritesReady]));
      const encounter = async () => {
        await page.evaluate(async () => {returnToRiver(); selectedDay=window.DIVE_DAYS.find(d=>d.id==='2026-09-28'); setQuickMode(true); Math.random=()=>0; await begin(); questions=[...questions.slice(1),questions[0]]; round=6; next(); document.querySelector('#answerInput').value='Carleton'; document.querySelector('#answerForm').requestSubmit();});
        await page.clock.runFor(10);
        assert.equal(await page.evaluate(()=>roundState.phase),'loonChoice');
        assert.equal(await page.evaluate(()=>timer),null);
      };
      assert(await page.evaluate(() => loonDifficulty(19).speed > loonDifficulty(0).speed && loonDifficulty(19).interval < loonDifficulty(0).interval));
      await encounter(); const points=await page.evaluate(()=>score);
      await page.screenshot({path:`/private/tmp/carillion-loon-choice-${width}.png`});
      await page.locator('#fightLoon').click();
      await page.clock.runFor(2100);
      assert.equal(await page.evaluate(() => document.querySelector('#loonCourse').getBoundingClientRect().width), width);
      assert.equal(await page.evaluate(() => document.querySelector('#loonCourse').getBoundingClientRect().height), height);
      // Play through real physics and collisions, jumping when a rock approaches.
      for (let i=0;i<1100;i++) {
        const state=await page.evaluate(()=>({phase:loonFight.phase,y:loonFight.y,playerX:loonFight.playerX,speed:loonDifficulty(loonFight.elapsed).speed,rock:loonFight.rocks.find(r=>r.x+r.width>loonFight.playerX-18)?.x}));
        if (state.phase!=='playing') break;
        if (!state.y && state.rock<state.playerX+state.speed*.24+18) {
          if (width===1440) await page.keyboard.press('Space');
          else await page.locator('#loonCourse').dispatchEvent('pointerdown');
        }
        await page.clock.runFor(20);
      }
      assert.equal(await page.evaluate(()=>loonFight.phase),'punch');
      await page.screenshot({path:`/private/tmp/carillion-loon-punch-${width}.png`});
      await page.clock.runFor(5900); await page.locator('#fightLoon').click();
      assert.equal(await page.evaluate(()=>roundState.phase),'roundEnd');
      assert.equal(await page.evaluate(()=>score),points);
      assert.equal(await page.evaluate(()=>roundState.record.catches.length),1);
      assert.equal(await page.evaluate(()=>used.size),1);
      await encounter(); await page.locator('#fightLoon').click();
      await page.clock.runFor(5800);
      assert.equal(await page.evaluate(()=>loonFight.phase),'lost');
      assert.equal(await page.evaluate(()=>score),-30);
      assert.equal(await page.evaluate(()=>roundState.record.reason),'loon-loss');
      assert((await page.evaluate(()=>catchShareText())).includes('💀'));
      await page.locator('#fightLoon').click(); await page.clock.runFor(10);
      assert.equal(await page.evaluate(()=>round),7);
      assert.equal(await page.evaluate(()=>roundState.phase),'summary');
      await encounter(); await page.locator('#leaveLoon').click(); await page.clock.runFor(10);
      await page.evaluate(() => setQuickMode(false));
      for (const alias of ['Carleton','Carleton College']) {
        await page.locator('#answerInput').fill(alias); await page.locator('#answerForm button').click();
        assert.equal(await page.evaluate(()=>roundState.phase),'question');
        assert.equal(await page.evaluate(()=>score),0);
        assert((await page.locator('#inputFeedback').textContent()).includes('stole'));
        assert.equal(await page.evaluate(() => fishingCast), null);
      }
      await encounter(); await page.locator('#leaveLoon').click(); await page.clock.runFor(10);
      assert.equal(await page.evaluate(()=>used.size),1);
      await encounter(); await page.locator('#fightLoon').click();
      await page.evaluate(()=>returnToRiver()); await page.clock.runFor(22000);
      assert.equal(await page.evaluate(()=>roundState.phase),'home');
      assert.equal(await page.locator('#loonEncounter').count(),0);
      assert.equal(await page.evaluate(()=>loonFight),null);
      assert.deepEqual(errors,[]);
      console.log(`${width}x${height}: fight victory, collision, surrender, aliases and cancellation passed`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
