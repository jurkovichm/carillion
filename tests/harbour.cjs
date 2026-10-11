const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  try {
    for (const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]) {
      const page = await browser.newPage({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference'}), errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('http://carillion.test/**', route=>{
        const file=path.join(__dirname,'..',new URL(route.request().url()).pathname);
        return route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});
      });
      await page.clock.install({time:new Date('2026-10-08T12:00:00Z')});
      await page.clock.pauseAt(new Date('2026-10-08T12:00:01Z'));
      await page.goto('http://carillion.test/index.html');
      await page.evaluate(()=>Promise.all([characterSpritesReady,basketSpritesReady,catchSpritesReady,harbourCanoeReady,harbourArtworkReady]));
      await page.clock.runFor(32);
      assert(await page.evaluate(()=>RIVER_SHOP.y-400>(fishingSceneView.height-fishingSceneView.oy)/fishingSceneView.scale));
      // Commit cents, deductions, floor at zero, and an idempotent saved transaction.
      assert.deepEqual(await page.evaluate(()=>{
        persistHarbour({...harbourSave,cents:0});
        const one=settleHarbourSale('fixture-one',[{points:15},{points:-5}]);
        settleHarbourSale('fixture-one',[{points:15},{points:-5}]);
        const balance=harbourSave.cents;
        settleHarbourSale('fixture-two',[{points:-100}]);
        return [one.total,balance,harbourSave.cents];
      }),[100,100,0]);
      // Start a real game before finishing the fixture catch; early return never pays.
      await page.evaluate(async()=>{setQuickMode(true);await begin();returnToRiver();});
      assert.equal(await page.evaluate(()=>harbourSave.cents),0);
      await page.evaluate(async()=>{
        await begin();setQuickMode(false);score=10;
        shoreCatches.push({kind:'fish',points:15,name:'Fish'},{kind:'boot',points:-5,name:'Boot'});
        showSummary();
      });
      assert.equal(await page.evaluate(()=>roundState.phase),'selling');
      assert.equal(await page.evaluate(()=>harbourSave.cents),100);
      await page.clock.fastForward(8500);
      await page.screenshot({path:`/private/tmp/carillion-fishmonger-${width}.png`});
      await page.locator('#skipFishmonger').click();
      assert.deepEqual(await page.evaluate(()=>[roundState.phase,harbourSave.cents,shoreCatches.length,pregameAngler.x]),['summary',100,0,950]);
      assert((await page.locator('.fishmonger-receipt').textContent()).includes('+$1.00'));
      await page.evaluate(()=>showSummary());
      assert.equal(await page.evaluate(()=>harbourSave.cents),100);
      // Shop from post-game exploration, then purchase and finish three beers.
      await page.locator('#visitShoppe').click();
      await page.evaluate(()=>{pregameAngler.x=DOCK_BOARDING.x;pregameAngler.y=DOCK_BOARDING.y;persistHarbour({...harbourSave,cents:10000});});
      await page.clock.runFor(32);
      assert(await page.locator('#canoePrompt').isVisible());
      await page.screenshot({path:`/private/tmp/carillion-canoe-${width}.png`});
      await page.locator('#canoePrompt').click();
      await page.clock.fastForward(await page.evaluate(()=>CANOE_TRIP_MS+200));
      await page.clock.runFor(32);
      assert.equal(await page.evaluate(()=>harbour.phase),'shop');
      await page.screenshot({path:`/private/tmp/carillion-shoppe-${width}.png`});
      await page.locator('#buySunglasses').click();
      assert.deepEqual(await page.evaluate(()=>[harbourSave.cents,harbourSave.sunglasses,harbourSave.equipped]),[5000,true,true]);
      await page.locator('#equipSunglasses').click();
      assert.equal(await page.evaluate(()=>harbourSave.equipped),false);
      await page.locator('#equipSunglasses').click();
      await page.locator('#buyBurger').click();
      assert.equal(await page.evaluate(()=>harbourSave.cents),4000);
      assert(await page.locator('#returnCanoe').isDisabled());
      await page.clock.fastForward(3400);
      for(let i=1;i<=3;i++){
        await page.locator('#buyBeer').click();
        await page.clock.fastForward(1600);
        if(i===1) await page.screenshot({path:`/private/tmp/carillion-chug-${width}.png`});
        await page.clock.fastForward(1800);
        assert.equal(await page.evaluate(()=>harbour.beers),i);
      }
      assert.equal(await page.evaluate(()=>harbour.phase),'dismiss');
      await page.clock.fastForward(2200);
      await page.clock.fastForward(await page.evaluate(()=>CANOE_TRIP_MS+200));
      await page.clock.runFor(32);
      assert.deepEqual(await page.evaluate(()=>[harbour.phase,roundState.phase,harbourSave.cents]),['dock','summary',1000]);
      assert(await page.locator('#summaryScreen').isVisible());
      // Reload during a committed cutscene must retain the payment.
      await page.evaluate(()=>{returnToRiver();newHarbourGame();shoreCatches.push({kind:'fish',points:15,name:'Fish'});showSummary();});
      await page.reload();
      await page.evaluate(()=>characterSpritesReady);
      assert.deepEqual(await page.evaluate(()=>[harbourSave.cents,harbourSave.sunglasses,harbourSave.equipped]),[1150,true,true]);
      // Zero catch still visits the fishmonger and completes naturally.
      await page.evaluate(()=>{newHarbourGame();shoreCatches.length=0;showSummary();});
      await page.clock.fastForward(21000);
      assert.deepEqual(await page.evaluate(()=>[roundState.phase,harbourSave.cents]),['summary',1150]);
      assert.deepEqual(errors,[]);
      console.log(`Harbour passed ${width} × ${height}`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
