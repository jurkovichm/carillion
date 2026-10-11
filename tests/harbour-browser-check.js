// Local visual fixtures; never loaded by the regular game.
const harbourChecks = document.createElement('div');
harbourChecks.style.cssText='position:fixed;top:60px;left:10px;z-index:10000;display:flex;flex-wrap:wrap;max-width:calc(100% - 20px);gap:8px';
harbourChecks.innerHTML='<button id="previewCanoePan">Preview downstream canoe</button><button id="previewBasketFront">Preview basket collision</button><button id="finishHarbourPreview">Resume preview</button>';
document.body.append(harbourChecks);
let harbourPreviewHold = false, harbourPreviewTime = 2000;
$('#previewCanoePan').onclick = async () => {
  await Promise.all([characterSpritesReady,harbourCanoeReady,harbourArtworkReady]);
  document.body.classList.add('exploring');
  pregameAngler.x=DOCK_BOARDING.x;pregameAngler.y=DOCK_BOARDING.y;updateCanoePrompt();startCanoe();
  harbourPreviewHold=true;
};
function holdHarbourPreview() { if(harbourPreviewHold)harbour.started=performance.now()-harbourPreviewTime; requestAnimationFrame(holdHarbourPreview); }
requestAnimationFrame(holdHarbourPreview);
$('#previewBasketFront').onclick = () => {
  harbourPreviewHold=false;harbour.phase='dock';document.body.classList.remove('harbour-active');
  document.body.classList.add('exploring');
  stopPregameWalk();pregameAngler.x=basket.x;pregameAngler.y=650;
  movePregameAngler(pregameAngler,0,-200,0,basket);
};
$('#finishHarbourPreview').onclick = () => {harbourPreviewHold=false;harbourChecks.style.display='none';};

const runWalkCheck=document.createElement('button');runWalkCheck.textContent='Run movement checks';harbourChecks.append(runWalkCheck);
const walkCheckStatus=document.createElement('output');harbourChecks.append(walkCheckStatus);
runWalkCheck.onclick=async()=>{
  await characterSpritesReady;
  harbourPreviewHold=false;harbour.phase='dock';document.body.classList.remove('harbour-active');
  stopPregameWalk();document.body.classList.add('exploring');
  Object.assign(pregameAngler,{x:1750,y:850});
  const before={...pregameAngler};window.dispatchEvent(new Event('resize'));
  if(pregameAngler.x!==before.x||pregameAngler.y!==before.y)throw Error('Resize moved player');
  walkInput.keys.add('ArrowLeft');
  for(let i=0;i<200;i++){
    const before={...pregameAngler};walkPregame(.016);
    if(Math.hypot(pregameAngler.x-before.x,pregameAngler.y-before.y)>95*.016/fishingSceneView.scale*1.5)throw Error('Walking jumped');
  }
  stopPregameWalk();
  Object.assign(pregameAngler,{x:basket.x,y:650});walkInput.keys.add('ArrowUp');
  for(let i=0;i<100;i++)walkPregame(.016);
  stopPregameWalk();
  if(pregameAngler.y<basket.y+basket.height*.45+12)throw Error('Basket overlap');
  walkCheckStatus.textContent='PASS: smooth bridge collision, solid basket, resize preserves position';
};
const swimPreview=document.createElement('button');swimPreview.textContent='Preview swimming';harbourChecks.append(swimPreview);
swimPreview.onclick=async()=>{
  await characterSpritesReady;
  harbourPreviewHold=false;harbour.phase='dock';document.body.classList.remove('harbour-active');document.body.classList.add('exploring');
  stopPregameWalk();Object.assign(pregameAngler,{x:1600,y:1000});
  walkInput.keys.add('ArrowLeft');for(let i=0;i<120;i++)walkPregame(.016);stopPregameWalk();
  if(!pregameAngler.swimming)throw Error('Bank entry did not switch to swimming');
  walkInput.keys.add('ArrowDown');for(let i=0;i<130;i++)walkPregame(.016);stopPregameWalk();
  if(!pregameAngler.swimming)throw Error('Free swimming failed');
  walkCheckStatus.textContent='PASS: walk into river, swim freely, keep the same world position';
};
const auditHarbourButton=document.createElement('button');auditHarbourButton.textContent='Run harbour audit';harbourChecks.append(auditHarbourButton);
const auditTick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const auditAssert=(ok,message)=>{if(!ok)throw Error(message);};
auditHarbourButton.onclick=async()=>{
  const savedRecord=localStorage.getItem(HARBOUR_SAVE_KEY),savedWallet={...harbourSave},savedQuick=isQuickMode();
  auditHarbourButton.disabled=true;harbourPreviewHold=false;
  try{
    await Promise.all([characterSpritesReady,basketSpritesReady,catchSpritesReady,harbourArtworkReady,harbourCanoeReady]);
    returnToRiver();setQuickMode(true);await begin();
    $('#answerInput').value='definitely not an answer';$('#answerForm').requestSubmit();
    auditAssert(roundState.phase==='question'&&score===0,'Wrong answer changed score or ended question');
    score=10;shoreCatches.push({kind:'fish',name:'Fish',points:15},{kind:'boot',name:'Boot',points:-5});
    const balance=harbourSave.cents;showSummary();
    auditAssert(roundState.phase==='summary'&&harbourSave.cents===balance+100,'Sale total/summary incorrect');
    showSummary();auditAssert(harbourSave.cents===balance+100,'Sale paid twice');
    $('#visitShoppe').click();Object.assign(pregameAngler,{...DOCK_BOARDING,swimming:false});updateCanoePrompt();
    auditAssert(!$('#canoePrompt').hidden,'Canoe unavailable from bank');
    modal.classList.add('open');startCanoe();auditAssert(harbour.phase==='dock','Boarded behind settings');modal.classList.remove('open');startCanoe();
    const started=harbour.started;modal.classList.add('open');syncHarbourPause(started+100);syncHarbourPause(started+2100);
    auditAssert(harbour.pausedAt===started+100,'Settings failed to pause harbour');modal.classList.remove('open');syncHarbourPause(started+2100);
    auditAssert(harbour.started===started+2000,'Harbour lost paused time');
    harbour.started=performance.now()-CANOE_TRIP_MS-30;await auditTick();
    auditAssert(harbour.phase==='shop'&&!$('#shoppeUI').hidden,'Canoe arrival failed');
    auditAssert(getComputedStyle($('#crtEffect')).display==='none','Harbour screen grid visible');
    persistHarbour({...harbourSave,cents:10000,sunglasses:false,equipped:false});
    buyHarbourItem('invalid');auditAssert(harbourSave.cents===10000,'Invalid item charged wallet');
    buyHarbourItem('sunglasses');buyHarbourItem('sunglasses');
    auditAssert(harbourSave.cents===5000&&harbourSave.equipped,'Sunglasses charged twice or did not equip');
    buyHarbourItem('burger');auditAssert(harbourSave.cents===4000&&$('#returnCanoe').disabled,'Consumption did not lock return');
    harbour.consumption.started=performance.now()-3300;await auditTick();
    for(let i=0;i<3;i++){buyHarbourItem('beer');harbour.consumption.started=performance.now()-3300;await auditTick();}
    auditAssert(harbour.phase==='dismiss'&&harbourSave.cents===1000,'Three-beer limit or wallet incorrect');
    harbour.started=performance.now()-2100;await auditTick();auditAssert(harbour.phase==='return','Beer limit did not start return');
    harbour.started=performance.now()-CANOE_TRIP_MS-30;await auditTick();auditAssert(harbour.phase==='dock'&&pregameAngler.x===DOCK_BOARDING.x,'Return lost player position');
    returnToRiver();auditAssert(!document.body.classList.contains('harbour-active')&&$('#shoppeUI').hidden,'Home left stale harbour state');
    updateCanoePrompt();auditAssert($('#canoePrompt').hidden,'Canoe prompt overlaps home menu');
    walkCheckStatus.textContent=`PASS ${innerWidth}×${innerHeight}: wrong answer, sale once, shop purchases, settings pause, beer limit, return, cleanup, no grid`;
  }catch(error){walkCheckStatus.textContent='FAIL: '+error.message;console.error(error);}
  finally{
    modal.classList.remove('open');returnToRiver();setQuickMode(savedQuick);harbourSave=savedWallet;updateHarbourUI();
    if(savedRecord===null)localStorage.removeItem(HARBOUR_SAVE_KEY);else localStorage.setItem(HARBOUR_SAVE_KEY,savedRecord);
    auditHarbourButton.disabled=false;
  }
};

const bendPreview=document.createElement('button');bendPreview.textContent='Inspect river bend';harbourChecks.append(bendPreview);
bendPreview.onclick=async()=>{harbourPreviewTime=4500;await $('#previewCanoePan').onclick();harbourChecks.style.display='none';};

const flightAudit=document.createElement('button');flightAudit.textContent='Run flight checks';harbourChecks.append(flightAudit);
flightAudit.onclick=async()=>{
  try{
    await characterSpritesReady;returnToRiver();openFlightGame();
    auditAssert(roundState.phase==='flappy'&&flightState.phase==='ready','Flight failed to open');
    flapAngler();pauseFlightGame();const before=flightState.bird.y;
    advanceFlight(.1);auditAssert(flightState.bird.y===before,'Paused flight moved');
    pauseFlightGame();flightState.bird.y=613;advanceFlight(.016);
    auditAssert(flightState.phase==='over','Flight collision did not end run');
    flapAngler();auditAssert(flightState.phase==='playing'&&flightState.score===0,'Flight retry failed');
    window.dispatchEvent(new Event('resize'));auditAssert(flightState.paused,'Resize failed to pause flight');
    leaveFlightGame();auditAssert(roundState.phase==='home'&&!$('#home').inert,'Flight exit left home inert');
    walkCheckStatus.textContent='PASS: flight start, pause, collision, retry, resize, exit';
  }catch(error){walkCheckStatus.textContent='FAIL: '+error.message;console.error(error);}
};

const bridgeCheck=document.createElement('button');bridgeCheck.textContent='Inspect bridge swimming';harbourChecks.append(bridgeCheck);
bridgeCheck.onclick=async()=>{
  await Promise.all([characterSpritesReady,harbourArtworkReady]);returnToRiver();document.body.classList.add('exploring');
  Object.assign(pregameAngler,{x:1000,y:900,swimming:true});
  movePregameAngler(pregameAngler,0,-500,0,basket);
  auditAssert(pregameAngler.swimming&&Math.abs(pregameAngler.y-400)<.01,'Swimmer blocked beneath bridge');
  movePregameAngler(pregameAngler,0,-220,0,basket);
  auditAssert(pregameAngler.swimming&&Math.abs(pregameAngler.y-180)<.01,'Swimmer cannot emerge upstream');
  movePregameAngler(pregameAngler,0,720,0,basket);
  auditAssert(pregameAngler.swimming&&Math.abs(pregameAngler.y-900)<.01,'Swimmer cannot return downstream');
  Object.assign(pregameAngler,{x:1000,y:340,swimming:true});$('#walkMenu').focus({preventScroll:true});
  walkCheckStatus.textContent='PASS: swim beneath bridge, emerge upstream, return downstream';
};
