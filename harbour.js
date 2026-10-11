// Device-local money uses integer cents. One saved record commits a whole sale/purchase.
const HARBOUR_SAVE_KEY = 'carillion-harbour-v1';
function readHarbourSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(HARBOUR_SAVE_KEY) || '{}');
    return { cents: Number.isSafeInteger(saved.cents) ? Math.max(0, saved.cents) : 0,
      sunglasses: saved.sunglasses === true, equipped: saved.sunglasses === true && saved.equipped === true,
      lastSale: typeof saved.lastSale === 'string' ? saved.lastSale : null };
  } catch { return { cents: 0, sunglasses: false, equipped: false, lastSale: null }; }
}
let harbourSave = readHarbourSave();
let harbourGameId = null;
const harbour = { phase: 'dock', started: 0, sale: null, completed: false, beers: 0, consumption: null, origin: 'home', sold: 0, lastSound: 0 };
const money = cents => '$' + (Math.abs(cents) / 100).toFixed(2);
function persistHarbour(next) {
  try { localStorage.setItem(HARBOUR_SAVE_KEY, JSON.stringify(next)); }
  catch { $('#harbourSaveStatus').textContent = 'Device storage unavailable: progress lasts only until this page closes.'; }
  harbourSave = next;
  updateHarbourUI();
}
function newHarbourGame() {
  harbourGameId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now() + '-' + Math.random();
  harbour.completed = false;
  harbour.sale = null;
  harbour.pickedUp = harbour.setDown = false;
}
function settleHarbourSale(id, items) {
  const total = items.reduce((sum, item) => sum + Math.round(item.points * 10), 0);
  const before = harbourSave.cents;
  if (harbourSave.lastSale !== id) persistHarbour({ ...harbourSave, cents: Math.max(0, before + total), lastSale: id });
  return { items: items.map(item => ({ ...item })), total, before, after: harbourSave.cents };
}
fishingViewport.insertAdjacentHTML('beforeend', `
  <div class="wallet" id="playerWallet" aria-label="Player’s Wallet"><svg viewBox="0 0 32 26" aria-hidden="true"><path fill="#bc9155" stroke="#efcd87" stroke-width="2" d="M3 4h24v19H3z"/><path fill="#634632" d="M3 3l21-2v5H3z"/><path fill="#d5ad6c" stroke="#49382d" stroke-width="2" d="M20 11h10v8H20z"/><path fill="#49382d" d="M23 14h3v3h-3z"/></svg><span><small>WALLET</small><b id="walletBalance"></b></span></div>
  <button id="canoePrompt" class="harbour-prompt" hidden>Board canoe · Harbourside Shoppe →</button>
  <section id="fishmongerUI" class="harbour-caption" hidden aria-label="Fishmonger sale"><p id="fishmongerStatus" role="status"></p><p id="fishmongerTotal"></p><button id="skipFishmonger">Skip →</button></section>
  <section id="shoppeUI" class="shoppe-panel" hidden aria-label="Harbourside Shoppe"><h2>HARBOURSIDE SHOPPE</h2><p id="shoppeStatus" role="status">A little something for the river.</p><div class="shoppe-items"><button id="buyBeer">Beer <b>$10.00</b><small>Chug here · three per visit</small></button><button id="buyBurger"><span class="culvers">Culver’s</span> Butterburger <b>$10.00</b><small>Fresh off the griddle · eat here</small></button><button id="buySunglasses">Sunglasses <b>$50.00</b><small>Yours to keep</small></button></div><button id="equipSunglasses" hidden></button><button id="returnCanoe">← Canoe back to the dock</button></section>
  <p id="harbourSaveStatus" role="status"></p>`);
$('#summaryScreen .summary-actions').insertAdjacentHTML('beforeend', '<button id="visitShoppe">VISIT THE SHOPPE →</button>');
function updateHarbourUI(displayCents = harbourSave.cents) {
  $('#walletBalance').textContent = money(displayCents);
  const busy = harbour.phase !== 'shop' || !!harbour.consumption;
  $('#buyBeer').disabled = busy || harbourSave.cents < 1000;
  $('#buyBurger').disabled = busy || harbourSave.cents < 1000;
  $('#buySunglasses').disabled = busy || harbourSave.cents < 5000 || harbourSave.sunglasses;
  $('#buySunglasses small').textContent = harbourSave.sunglasses ? 'Owned · yours to keep' : 'Yours to keep';
  $('#equipSunglasses').hidden = !harbourSave.sunglasses;
  $('#equipSunglasses').disabled = busy;
  $('#equipSunglasses').textContent = harbourSave.equipped ? 'Remove sunglasses' : 'Equip sunglasses';
  $('#returnCanoe').disabled = busy;
}
function harbourSound(kind) {
  if (!soundEnabled) return;
  if (kind === 'cash') { waterNote(660,.12,.04); waterNote(990,.2,.035,.1); }
  else if (kind === 'deduct') waterNote(240,.22,.04,0,120);
  else if (kind === 'step') bubbleWash(.075,.009);
  else if (kind === 'basket') { bubbleWash(.18,.025); waterNote(100,.15,.02); }
  else if (kind === 'paddle') bubbleWash(.35,.02);
  else if (kind === 'gulp') { waterNote(180,.14,.035,0,90); bubbleWash(.15,.013); }
  else if (kind === 'bite') bubbleWash(.16,.03);
  else if (kind === 'dismiss') { waterNote(330,.15,.04); waterNote(220,.25,.04,.17); }
  else bubbleWash(.2,.018);
}
function harbourFootstep(now) {
  if (now - harbour.lastSound > 320) { harbour.lastSound = now; harbourSound('step'); }
}
function startFishmonger() {
  if (harbour.completed) return false;
  if (harbour.phase === 'sale') return true;
  harbourGameId ||= typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now() + '-sale';
  clearFishingTimers(); stopSpeech(); stopPregameWalk();
  fishingCatch = fishingCast = fishingLoon = null; fishingLineInWater = false;
  harbour.sale = settleHarbourSale(harbourGameId, shoreCatches);
  harbour.phase = 'sale'; harbour.started = performance.now(); harbour.sold = 0;
  harbour.homeBasket = { ...basket };
  roundState.phase = 'selling';
  document.body.classList.remove('playing', 'showing-summary', 'exploring');
  document.body.classList.add('harbour-active');
  $('#gameUI').classList.add('hidden'); $('#summaryScreen').classList.add('hidden');
  $('#fishmongerUI').hidden = false;
  $('#fishmongerStatus').textContent = 'Taking the catch to the fishmonger…';
  $('#fishmongerTotal').textContent = `Full sale: ${harbour.sale.total < 0 ? '−' : '+'}${money(harbour.sale.total)} · Wallet after sale: ${money(harbour.sale.after)}`;
  updateHarbourUI(harbour.sale.before);
  $('#skipFishmonger').focus({ preventScroll: true });
  if (isQuickMode()) finishFishmonger();
  return true;
}
function renderHarbourReceipt(gear) {
  $('#summaryScreen .fishmonger-receipt')?.remove();
  if (!harbour.completed || !harbour.sale) return;
  const receipt=document.createElement('p');receipt.className='fishmonger-receipt';
  const sale=harbour.sale;
  receipt.textContent=`Fishmonger: ${sale.total<0?'−':'+'}${money(sale.total)} · Wallet after sale: ${money(sale.after)}`;
  gear.after(receipt);
}
function finishFishmonger() {
  if (harbour.phase !== 'sale') return;
  harbour.phase = 'dock'; harbour.completed = true;
  shoreCatches.length = 0;
  Object.assign(basket, harbour.homeBasket);
  resetPregameWalk();
  document.body.classList.remove('harbour-active');
  $('#fishmongerUI').hidden = true;
  updateHarbourUI(); finishSummary();
  $('#playAgain').focus({ preventScroll: true });
}
$('#skipFishmonger').onclick = finishFishmonger;
$('#visitShoppe').onclick = () => {
  $('#summaryScreen').classList.add('hidden');
  document.body.classList.add('exploring');
  $('#walkMenu').textContent = 'Show post-game menu';
  $('#walkStick').focus({ preventScroll: true });
};
const RIVER_SHOP = { x:1720, y:3600, playerX:1720, playerY:3800, boatY:4120 };
const CANOE_TRIP_MS = 9400;
const CANOE_BOARD_SECONDS = 1.8;
const canoeJourney = elapsed => easeHarbour((elapsed-CANOE_BOARD_SECONDS)/(CANOE_TRIP_MS/1000-CANOE_BOARD_SECONDS*2));
const DOCK_CANOE = { x: 1100, y: 1130 };
// Boarding happens from the dry right-hand path, independently of the floating hull.
const DOCK_BOARDING = { x: 1745, y: 900 };
const CANOE_BOARDING_RADIUS = 260;
function withinCanoeBoardingRange(actor, margin = 0) {
  // Cover the bank-to-hull approach, including swimmers beside the canoe.
  const dx = DOCK_CANOE.x - DOCK_BOARDING.x, dy = DOCK_CANOE.y - DOCK_BOARDING.y;
  const t = Math.max(0, Math.min(1, ((actor.x - DOCK_BOARDING.x) * dx + (actor.y - DOCK_BOARDING.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(actor.x - (DOCK_BOARDING.x + dx * t), actor.y - (DOCK_BOARDING.y + dy * t)) <= CANOE_BOARDING_RADIUS + margin;
}
function canBoardCanoe() {
  return canWalkPregame() && document.body.classList.contains('exploring') && harbour.phase === 'dock'
    && withinCanoeBoardingRange(pregameAngler, $('#canoePrompt').hidden ? 0 : 40);
}
// Hull-clearance waypoints follow the bends of the generated river.
const CANOE_CHANNEL = [[1130,1100],[1210,800],[1500,850],[2150,1150],[2500,800],[2850,650],[3350,650],[3650,720],[3900,850],[4020,1000],[4120,1310]];
function canoePosition(progress) {
  const y=DOCK_CANOE.y+(RIVER_SHOP.boatY-DOCK_CANOE.y)*Math.max(0,Math.min(1,progress));
  for(let i=1;i<CANOE_CHANNEL.length;i++){
    const a=CANOE_CHANNEL[i-1],b=CANOE_CHANNEL[i];
    if(y<=b[0]){const t=easeHarbour((y-a[0])/(b[0]-a[0]));return {x:a[1]+(b[1]-a[1])*t,y};}
  }
  return {x:DOCK_CANOE.x,y:RIVER_SHOP.boatY};
}
function canoeTransferPose(from, to, progress, shop, boarding) {
  const t=easeHarbour(progress), x=from.x+(to.x-from.x)*t, y=from.y+(to.y-from.y)*t;
  const atHull=boarding?progress>.88:progress<.12;
  const inWater=shop?y>3940:isPregameWater(x,y);
  return {x,y,walking:true,handsFree:true,swimming:inWater&&!atHull,facing:to.x>=from.x?1:-1};
}
function canoeMooring(boat) {
  return boat.y<2000?{x:1660-boat.x,y:-80}:{x:RIVER_SHOP.playerX-100-boat.x,y:RIVER_SHOP.playerY+60-boat.y};
}

const harbourCanoe = new Image();
let harbourCanoeBounds = null;
const harbourCanoeReady = new Promise(resolve => {
  harbourCanoe.onload = () => {
    const c=document.createElement('canvas');c.width=harbourCanoe.naturalWidth;c.height=harbourCanoe.naturalHeight;
    const ctx=c.getContext('2d');ctx.drawImage(harbourCanoe,0,0);
    try {
      const data=ctx.getImageData(0,0,c.width,c.height).data;let l=c.width,r=0,t=c.height,b=0;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>16){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
      harbourCanoeBounds={x:l,y:t,w:r-l+1,h:b-t+1};
    } catch { harbourCanoeBounds={x:0,y:0,w:c.width,h:c.height}; }
    resolve();
  };
  harbourCanoe.onerror=resolve;
});
harbourCanoe.src='assets/harbour-canoe-v2.png';
function updateCanoePrompt() {
  $('#canoePrompt').hidden = !canBoardCanoe();
}
function startCanoe(returning = false, kicked = false) {
  if (modal.classList.contains('open') || document.hidden) return;
  if (returning ? harbour.phase !== 'shop' || harbour.consumption : !canBoardCanoe()) return;
  stopPregameWalk();
  if (!returning) {
    harbour.origin = roundState.phase; harbour.beers = 0;
    almaMater.pause();
    $('#summaryScreen').classList.add('hidden');
  }
  harbour.boardingActor = returning ? {x:RIVER_SHOP.playerX,y:RIVER_SHOP.playerY,swimming:false} : { ...pregameAngler,swimming:false };
  harbour.phase = returning ? 'return' : 'outbound'; harbour.started = performance.now(); harbour.kicked = kicked; harbour.paddleBeat = -1; harbour.pausedAt = null;
  document.body.classList.add('harbour-active');
  $('#canoePrompt').hidden = true; $('#shoppeUI').hidden = true;
  harbourSound('paddle');
}
$('#canoePrompt').onclick = () => startCanoe();
$('#returnCanoe').onclick = () => startCanoe(true);
function buyHarbourItem(kind) {
  if (harbour.phase !== 'shop' || harbour.consumption || modal.classList.contains('open') || !['beer','burger','sunglasses'].includes(kind)) return;
  const price = kind === 'sunglasses' ? 5000 : 1000;
  if (harbourSave.cents < price || kind === 'sunglasses' && harbourSave.sunglasses) return;
  persistHarbour({ ...harbourSave, cents: harbourSave.cents - price,
    sunglasses: harbourSave.sunglasses || kind === 'sunglasses', equipped: harbourSave.equipped || kind === 'sunglasses' });
  harbourSound('cash');
  if (kind === 'sunglasses') { $('#shoppeStatus').textContent = 'Looking sharp. Sunglasses are yours to keep.'; return; }
  if (kind === 'beer') harbour.beers++;
  harbour.consumption = { kind, started: performance.now(), beat: -1 };
  $('#shoppeStatus').textContent = kind === 'beer' ? `Chugging beer ${harbour.beers} of 3…` : 'Enjoying a hot Butterburger…';
  updateHarbourUI();
}
$('#buyBeer').onclick = () => buyHarbourItem('beer');
$('#buyBurger').onclick = () => buyHarbourItem('burger');
$('#buySunglasses').onclick = () => buyHarbourItem('sunglasses');
$('#equipSunglasses').onclick = () => {
  if (harbour.phase === 'shop' && !harbour.consumption && harbourSave.sunglasses) persistHarbour({ ...harbourSave, equipped: !harbourSave.equipped });
};
document.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'e' && !$('#canoePrompt').hidden && !event.target.closest('input,textarea,select') && !event.repeat) { event.preventDefault(); startCanoe(); }
});
function drawAnglerSunglasses(width, height) {
  if (!harbourSave.equipped) return;
  const p = paint, y = -height * .81;
  p.fillStyle = '#10202a'; p.fillRect(-width * .17, y, width * .38, 9);
  p.fillRect(-width * .17, y + 7, width * .15, 7); p.fillRect(width * .07, y + 7, width * .14, 7);
  p.fillStyle = '#77cbbc'; p.fillRect(-width * .14, y + 2, 6, 3); p.fillRect(width * .09, y + 2, 6, 3);
}
function harbourRect(x,y,w,h,color) { paint.fillStyle = color; paint.fillRect(Math.round(x),Math.round(y),w,h); }
function harbourLabel(text,x,y,size=24,color='#f5e8be') {
  paint.fillStyle = color; paint.font = `${size}px monospace`; paint.textAlign = 'center'; paint.fillText(text,x,y);
}
function drawCanoe(x,y,now,travelling=false,mooring={x:186,y:-105}) {
  const p=paint, bob=reducedFishingMotion?0:Math.sin(now/450)*3;
  const stroke = reducedFishingMotion ? -.3 : Math.sin(now/400)*.6;
  p.save();p.translate(x,y+bob);
  // A restrained moving wake underneath the cedar hull.
  p.strokeStyle='#77cbbc60';p.lineWidth=3;
  for(let i=0;i<3;i++){p.beginPath();p.ellipse(-i*10,34+i*10,165+i*22,8+i*3,0,0,Math.PI*2);p.stroke();}
  p.fillStyle='#073d4060';p.beginPath();p.ellipse(0,32,162,12,0,0,Math.PI*2);p.fill();
  const b=harbourCanoeBounds, width=360, height=b?width*b.h/b.w:82;
  const drawHull=()=>{if(b)p.drawImage(harbourCanoe,b.x,b.y,b.w,b.h,-width/2,-height*.55,width,height);};
  drawHull();
  if(travelling){
    drawFisherman(now/1000,0,0,true,null,{x:-10,y:0,handsFree:true,seated:true});
    // Near gunwale hides the paddler's lower body inside the boat.
    p.save();p.beginPath();p.rect(-width/2,-height*.02,width,height);p.clip();drawHull();p.restore();
  }else{
    // Rope ties the canoe to a weathered mooring post on the right bank.
    const mx=mooring.x, my=mooring.y;
    p.strokeStyle='#dfc88d';p.lineWidth=3;p.beginPath();p.moveTo(145,-18);p.quadraticCurveTo((145+mx)/2,my+50,mx,my);p.stroke();
    harbourRect(mx-6,my-30,16,50,'#634632');harbourRect(mx-3,my-28,5,48,'#bc9155');harbourRect(mx-9,my-34,22,7,'#d5ad6c');
  }
  // Cedar paddle with stepped blade, grain, and a lit shaft; animate its stroke.
  if(travelling){
    // Both hands follow the shaft; the paddle no longer floats beside the angler.
    const grip = along => ({x:40-Math.sin(stroke)*along,y:-70+Math.cos(stroke)*along});
    for(const [shoulder,along] of [[-24,-16],[23,28]]){
      const hand=grip(along), elbow={x:(shoulder+hand.x)/2,y:hand.y+12};
      p.lineJoin='miter';p.lineCap='square';
      for(const [color,width] of [['#49382d',13],['#d5ad6c',8]]){
        p.strokeStyle=color;p.lineWidth=width;p.beginPath();p.moveTo(shoulder,-100);p.lineTo(elbow.x,elbow.y);p.lineTo(hand.x,hand.y);p.stroke();
      }
    }
  }
  p.save();p.translate(40,travelling?-70:-45);p.rotate(travelling?stroke:-.65);
  harbourRect(-4,-20,8,127,'#634632');harbourRect(-2,-20,3,127,'#efcd87');harbourRect(-7,-23,14,8,'#bc9155');
  p.fillStyle='#a17143';p.beginPath();p.moveTo(-4,68);p.lineTo(-15,84);p.lineTo(-18,116);p.lineTo(-10,134);p.lineTo(9,134);p.lineTo(17,116);p.lineTo(14,84);p.lineTo(4,68);p.closePath();p.fill();
  harbourRect(-5,85,5,41,'#d5ad6c');harbourRect(8,90,3,29,'#815a39');harbourRect(-10,128,19,3,'#634632');
  if(travelling){harbourRect(-6,-20,12,9,'#d5ad6c');harbourRect(-6,24,12,9,'#d5ad6c');}
  p.restore();p.restore();
}
function drawDockCanoe(now) { drawCanoe(DOCK_CANOE.x,DOCK_CANOE.y,now,false,{x:1660-DOCK_CANOE.x,y:-80}); }
// Reference-matched sprites stay separate from actors and the counter foreground.
const harbourArtwork = {};
function harbourSpriteBounds(image, region = { x:0, y:0, w:image.naturalWidth, h:image.naturalHeight }) {
  const c=document.createElement('canvas');c.width=region.w;c.height=region.h;
  const ctx=c.getContext('2d');ctx.drawImage(image,region.x,region.y,region.w,region.h,0,0,c.width,c.height);
  try {
    const pixels=ctx.getImageData(0,0,c.width,c.height).data;
    let left=c.width,right=0,top=c.height,bottom=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    return { x:region.x+left, y:region.y+top, w:right-left+1, h:bottom-top+1 };
  } catch { return region; }
}
function loadHarbourArtwork(name,src) {
  return new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>{harbourArtwork[name]={image,bounds:harbourSpriteBounds(image)};resolve();};
    image.onerror=resolve;image.src=src;
  });
}
const harbourArtworkReady=Promise.all([
  loadHarbourArtwork('fishmonger','assets/harbour-fishmonger.png'),
  loadHarbourArtwork('shoppe','assets/harbour-shoppe.png'),
  loadHarbourArtwork('consumables','assets/harbour-consumables.png'),
  loadHarbourArtwork('continuousRiver','assets/harbour-continuous-river.png'),
  loadHarbourArtwork('shorelineJunction','assets/river-shoreline-junction.png'),
  loadHarbourArtwork('fishEnvironment','assets/fishmonger-riverbank.png')
]).then(()=>{
  const river=harbourArtwork.continuousRiver;
  if(river){
    const c=document.createElement('canvas');c.width=500;c.height=750;
    const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(river.image,0,0,c.width,c.height);
    ctx.globalCompositeOperation='destination-in';
    const join=ctx.createLinearGradient(0,0,0,c.height);join.addColorStop(0,'transparent');join.addColorStop(.08,'#fff');join.addColorStop(1,'#fff');
    ctx.fillStyle=join;ctx.fillRect(0,0,c.width,c.height);
    // The source lake ends at x=0/2048. Keep exposed outer columns opaque,
    // blending only where both paintings actually overlap.
    ctx.globalCompositeOperation='source-over';
    for(let x=0;x<c.width;x++){
      const wx=-300+x*6.4, edge=Math.min(wx,2048-wx);
      ctx.globalAlpha=1-easeHarbour(edge/160);
      if(ctx.globalAlpha>0)ctx.drawImage(river.image,x/c.width*river.image.naturalWidth,0,river.image.naturalWidth/c.width,river.image.naturalHeight,x,0,1,c.height);
    }
    ctx.globalAlpha=1;river.worldLayer=c;
  }
  const junction=harbourArtwork.shorelineJunction;
  if(junction){
    const c=document.createElement('canvas');c.width=500;c.height=250;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(junction.image,0,0,500,250);junction.worldLayer=c;
    const pixels=ctx.getImageData(0,0,500,250).data, land=new Uint8Array(500*250),queue=[];
    const solid=i=>!(pixels[i*4+2]>pixels[i*4+1]*.78&&pixels[i*4]<pixels[i*4+1]*.65);
    for(let y=0;y<250;y++)for(const x of [0,499]){const i=y*500+x;if(solid(i)){land[i]=1;queue.push(i);}}
    for(let n=0;n<queue.length;n++){const i=queue[n],x=i%500,y=Math.floor(i/500);
      for(const [xx,yy] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(xx>=0&&xx<500&&yy>=0&&yy<250){const j=yy*500+xx;if(!land[j]&&solid(j)){land[j]=1;queue.push(j);}}
    }
    junction.land=land;
    // Join along stepped, irregular contours. Only water may blend; leaves,
    // soil and rocks remain either fully opaque or fully outside the patch.
    const edgeFrame=ctx.getImageData(0,0,500,250),rgba=edgeFrame.data;
    for(let y=0;y<250;y++)for(let x=0;x<500;x++){
      const edge=8+Math.round(3*Math.sin(Math.floor(x/4)*.31)+2*Math.sin(Math.floor(x/4)*.73));
      const distance=Math.min(y,249-y)-edge, i=y*500+x;
      const water=rgba[i*4+2]>rgba[i*4+1]*.78&&rgba[i*4]<rgba[i*4+1]*.65;
      rgba[i*4+3]=distance<0?0:water?Math.round(255*easeHarbour(distance/10)):255;
    }
    ctx.putImageData(edgeFrame,0,0);
  }
  const atlas=harbourArtwork.consumables;if(!atlas)return;
  const image=atlas.image,cw=Math.floor(image.naturalWidth/2),ch=Math.floor(image.naturalHeight/3);
  atlas.frames={};
  for(const [kind,col] of [['beer',0],['burger',1]]){
    const frames=Array.from({length:3},(_,row)=>harbourSpriteBounds(image,{x:col*cw,y:row*ch,w:cw,h:ch}));
    // Fixed crop bounds keep the vessel and wrapper stationary between frames.
    const left=Math.min(...frames.map(f=>f.x-col*cw)),right=Math.max(...frames.map(f=>f.x-col*cw+f.w));
    const top=Math.min(...frames.map((f,row)=>f.y-row*ch)),bottom=Math.max(...frames.map((f,row)=>f.y-row*ch+f.h));
    atlas.frames[kind]=frames.map((f,row)=>({x:col*cw+left,y:row*ch+top,w:right-left,h:bottom-top}));
  }
});
function drawHarbourMerchant(shop,now,top=-238) {
  const p=paint, sprite=characterFrames[0]?.[shop?0:2];if(!sprite)return;
  const height=190,width=height*sprite.width/sprite.height;
  p.save();p.translate(0,top+238+Math.sin(now/650)*1.5);p.drawImage(sprite,-width/2,-238,width,height);
  // Clustered cloth highlights and pocket follow the character atlas pixel density.
  harbourRect(-22,-134,44,76,'#cbd1af');harbourRect(-18,-130,34,66,'#e5dfb9');
  harbourRect(-15,-122,6,42,'#efeee0');harbourRect(10,-121,6,59,'#a6b49a');
  harbourRect(-13,-96,25,18,'#a6b49a');harbourRect(-11,-96,23,14,'#e5dfb9');
  harbourRect(-22,-64,44,6,'#819382');
  p.restore();
}
function drawIllustratedStall(x,y,shop,now) {
  const art=harbourArtwork[shop?'shoppe':'fishmonger'];if(!art)return false;
  const p=paint,b=art.bounds,width=600,height=width*b.h/b.w,top=82-height;
  p.save();p.translate(x,y);
  p.fillStyle='#11271b60';p.beginPath();p.ellipse(0,86,285, 20,0,0,Math.PI*2);p.fill();
  p.drawImage(art.image,b.x,b.y,b.w,b.h,-width/2,top,width,height);
  // The shared sprite characters sit in the service opening behind the counter.
  p.save();p.beginPath();p.rect(-125,top+height*.43,250,height*.57);p.clip();drawHarbourMerchant(shop,now,top+height*.43+5);p.restore();
  // Each illustration places its near countertop at 69% of its visible height.
  p.save();p.beginPath();p.rect(-width/2,top+height*.69,width,height*.31+1);p.clip();
  p.drawImage(art.image,b.x,b.y,b.w,b.h,-width/2,top,width,height);p.restore();
  p.restore();return true;
}
function drawTimberDock(x,y,width,height) {
  const p=paint;harbourRect(x-7,y+height-5,width+14,16,'#49382d');
  for(let plank=0;plank<Math.ceil(width/44);plank++){
    const px=x+plank*44,pw=Math.min(42,x+width-px);
    harbourRect(px,y,pw,height,'#a17143');harbourRect(px+3,y+3,5,height-6,'#d5ad6c');
    harbourRect(px+pw-7,y+2,4,height-4,'#634632');
    for(let grain=0;grain<4;grain++)harbourRect(px+12+(grain%2)*4,y+10+grain*13,14,3,grain%2?'#bc9155':'#815a39');
    harbourRect(px+10,y+6,4,4,'#49382d');harbourRect(px+10,y+height-10,4,4,'#49382d');
  }
  harbourRect(x,y,width,5,'#efcd87');harbourRect(x,y+height-4,width,4,'#634632');
}
function drawHarbourSoil(x,y,width,height) {
  harbourRect(x,y,width,height,'#d5ad6c');
  for(let i=0;i<240;i++){
    const px=x+(i*137)%width,py=y+(i*83)%height;
    harbourRect(px,py,6+(i%4)*6,6,i%3?'#bc9155':'#efcd87');
    if(i%5===0)harbourRect(px+6,py+6,12,6,'#a17143');
  }
}
function drawRiverHighlights(now,shoreY,left,width,height) {
  const p=paint,t=reducedFishingMotion?0:now/1000;
  p.save();p.globalAlpha=.16;
  for(let i=0;i<35;i++){
    const y=shoreY+80+((i*137+t*(9+i%6))%height),x=left+50+((i*173)%Math.max(1,width-100));
    harbourRect(x,y,18+(i%5)*6,3,i%3?'#77cbbc':'#48b9b1');
  }
  p.restore();
}
function drawRiverWorldLayer(source) {
  const p=paint,worldHeight=534*6.4;
  // Share pixel columns with the bridge world across a gradual bank transition.
  p.save();for(let x=0;x<40;x+=4){p.globalAlpha=easeHarbour((x+2)/40);p.drawImage(source,x,0,4,534,x*6.4,-1107,4*6.4,worldHeight);}
  p.globalAlpha=1;p.drawImage(source,40,0,280,534,256,-1107,1792,worldHeight);p.restore();
}
function drawActorGroundShadow(x,y) {
  paint.save();paint.fillStyle='#11271b45';paint.beginPath();paint.ellipse(x,y+5,43,9,0,0,Math.PI*2);paint.fill();paint.restore();
}
function drawHarbourBank(now) {
  const art=harbourArtwork.fishEnvironment;
  if(art){paint.drawImage(themedScenery(art.image),-2200,-1107,2456,3407);drawRiverHighlights(now,1000,-2150,2300,1100);return;}
  // Continue the lake's palette and pixel grid beyond the left path.
  harbourRect(-2200,-1107,2200,3400,'#216944');
  drawHarbourSoil(-2200,340,2300,300);
  for(let i=0;i<170;i++){
    const x=-2200+(i*137)%2200, y=350+(i*83)%275;
    harbourRect(x,y,14+(i%4)*7,4,i%2?'#d5ad6c':'#a17143');
  }
  if(bridgeReady){
    for(let x=-2200;x<0;x+=512){
      paint.save();paint.translate(x,0);
      if(Math.floor((x+2200)/512)%2){paint.translate(512,0);paint.scale(-1,1);}
      paint.drawImage(themedScenery(bridgePixels),0,20,80,220,0,-980,512,1408);paint.restore();
    }
  }

  harbourRect(-2200,710,2400,1500,'#11687b');
  if(bridgeReady)for(let x=-2200;x<0;x+=768)for(let y=710;y<2200;y+=1113)paint.drawImage(themedScenery(bridgePixels),100,360,120,174,x,y,768,1113);
  for(let i=0;i<50;i++)harbourRect(-2180+(i*173+now/70)%2300,760+(i*89)%1100,35,4,'#26989b');
}
function drawStall(x,y,shop=false,now=0) {
  if(drawIllustratedStall(x,y,shop,now))return;
  const p=paint;p.save();p.translate(x,y);
  harbourRect(-245,-290,490,305,'#49382d');harbourRect(-232,-280,464,280,'#815a39');
  for(let i=0;i<13;i++)harbourRect(-232+i*37,-278,4,274,'#634632');
  harbourRect(-260,-326,520,44,'#49382d');
  for(let i=0;i<10;i++)harbourRect(-250+i*50,-320,50,54,i%2?'#efcd87':'#177d88');
  harbourRect(-186,-259,372,46,shop?'#0B5091':'#113e2d');
  harbourLabel(shop?'HARBOURSIDE SHOPPE':'FRESH FISH',0,-229,shop?23:28);
  // Reuse the detailed lake character atlas for the merchant behind the counter.
  const merchant=characterFrames[0]?.[shop?0:2];
  if(merchant){
    const height=190, width=height*merchant.width/merchant.height;
    p.drawImage(merchant,-width/2,-238,width,height);
    harbourRect(-23,-135,47, 70,'#e5dfb9');
    harbourRect(-18,-130,37,4,'#cbd1af');harbourRect(-18,-77,37,4,'#a6b49a');
    harbourRect(27,-119+Math.sin(now/200)*6,13,39,'#d5ad6c');
  }
  harbourRect(-245,-68,490,28,'#efcd87');harbourRect(-240,-40,480,74,'#815a39');
  harbourRect(-226,34,20,55,'#49382d');harbourRect(206,34,20,55,'#49382d');
  for(let i=0;i<8;i++)harbourRect(-224+i*58,-34,4, 60,'#634632');
  if(shop){harbourLabel('Culver’s',-130,-92,26,'#ffffff');harbourRect(-208,-123,156,5,'#0B5091'); drawConsumable('beer',100,-99,1);drawConsumable('burger',165,-93,1);}
  else {harbourRect(-198,-91,105,21,'#77cbbc');harbourRect(100,-90,94,18,'#77cbbc');}
  p.restore();
}
function drawCarriedBasket(x,y,items,scale=1) {
  const p=paint;p.save();p.translate(x,y);p.scale(scale,scale);
  const cell=basketAtlas.naturalWidth/2;
  if(cell){p.drawImage(basketAtlas,0,0,cell,basketAtlas.naturalHeight,-112,-112,225,225);
    items.slice(-5).forEach((item,i)=>drawCatchItem(item,Math.sin(i*2.4)*12,-35-i*4,-.25+i*.1));
    p.drawImage(basketAtlas,cell,0,cell,basketAtlas.naturalHeight,-112,-112,225,225);}
  p.restore();
}
function drawConsumable(kind,x,y,fraction) {
  const atlas=harbourArtwork.consumables,p=paint;
  if(atlas?.frames?.[kind]){
    const frame=atlas.frames[kind][Math.min(2,Math.floor((1-Math.max(0,fraction))*3))];
    const height=kind==='beer'?55:44,width=height*frame.w/frame.h;
    p.drawImage(atlas.image,frame.x,frame.y,frame.w,frame.h,x-width/2,y-height*.75,width,height);
    return;
  }
  // Loading fallback keeps consumption visible even if artwork cannot be fetched.
  p.save();p.translate(x,y);
  if(kind==='beer'){harbourRect(-14,-35,28,42,'#efcd87');harbourRect(-10,-28,20,28*fraction,'#d49a32');harbourRect(-15,-39,30,10,'#fff4da');p.strokeStyle='#efcd87';p.lineWidth=5;p.strokeRect(14,-27,12,23);}
  else {const w=44*Math.max(.2,fraction);harbourRect(-w/2,-15,w,12,'#efcd87');harbourRect(-w/2-2,-3,w+4,5,'#68b957');harbourRect(-w/2,2,w,9,'#49382d');harbourRect(-w/2,11,w,8,'#d5ad6c');}
  p.restore();
}
const easeHarbour = t => { t=Math.max(0,Math.min(1,t));return t*t*(3-2*t); };
function harbourWaterAt(x,y) {
  const land=harbourArtwork.shorelineJunction?.land;
  if(!land||y<850||y>=2450||x< -300||x>=2900)return null;
  return !land[Math.floor((y-850)/6.4)*500+Math.floor((x+300)/6.4)];
}
function drawDownstreamExtension(now) {
  const river=harbourArtwork.continuousRiver;
  if(river?.worldLayer){paint.drawImage(themedScenery(river.worldLayer),-300,1120,3200,4800);}
  // A painted, opaque shoreline replaces the old vegetation crossfade.
  const junction=harbourArtwork.shorelineJunction;
  if(junction?.worldLayer)paint.drawImage(themedScenery(junction.worldLayer),-300,850,3200,1600);
}
function drawDownstreamWorld(now) {
  if(bridgeReady){paint.drawImage(themedScenery(bridgePixels),0,-1107,2048,534*6.4);drawWaterCurrent(now);paint.drawImage(waterFlowPixels,0,-1107,2048,534*6.4);}
  drawDownstreamExtension(now);
}
function drawRiverShop(now) {
  drawStall(RIVER_SHOP.x,RIVER_SHOP.y,true,now);
  if(!harbourArtwork.continuousRiver?.worldLayer)drawTimberDock(1470,RIVER_SHOP.y+90,430,160);
}
function syncHarbourPause(now = performance.now()) {
  if (harbour.phase === 'dock') { harbour.pausedAt = null; return; }
  const paused = document.hidden || modal.classList.contains('open');
  if (paused && harbour.pausedAt == null) harbour.pausedAt = now;
  else if (!paused && harbour.pausedAt != null) {
    const delta = now - harbour.pausedAt;
    harbour.started += delta;
    if (harbour.consumption) harbour.consumption.started += delta;
    harbour.pausedAt = null;
  }
}
document.addEventListener('visibilitychange', () => syncHarbourPause());
function cancelHarbourVisit() {
  harbour.phase = 'dock'; harbour.consumption = null; harbour.pausedAt = null;
  document.body.classList.remove('harbour-active');
  for (const id of ['canoePrompt','shoppeUI','fishmongerUI']) $('#'+id).hidden = true;
  updateHarbourUI();
}
function renderHarbourScene(now,w,h) {
  if(harbour.phase==='dock') return false;
  syncHarbourPause(now);
  now = harbour.pausedAt ?? now;
  $('#canoePrompt').hidden=true;
  const p=paint, sale=harbour.phase==='sale';
  const worldWidth=2048, worldHeight=534*6.4;
  const baseScale=Math.max(w/worldWidth,h/worldHeight);
  let scale=baseScale, ox=(w-worldWidth*scale)/2, oy=Math.max(h-worldHeight*scale,Math.min(0,h*.44-1499*scale))+1107*scale;
  const elapsed=(now-harbour.started)/1000;
  let actor={x:950,y:480,facing:-1,handsFree:true}, carrying=false, remaining=[], saleProgress=-1;
  const sellSeconds=Math.max(6, (harbour.sale?.items.length||0)*1.15), returnAt=7+sellSeconds;
  if(sale){
    const home=harbour.homeBasket;
    if(elapsed<3){const f=easeHarbour(elapsed/3);actor.x=950+(home.x-950)*f;actor.walking=elapsed<2.8;}
    else if(elapsed<7){const f=easeHarbour((elapsed-3)/4);actor.x=home.x+(-520-home.x)*f;actor.walking=true;carrying=true;}
    else if(elapsed<returnAt){actor.x=-520;carrying=true;saleProgress=(elapsed-7)/sellSeconds*harbour.sale.items.length;}
    else if(elapsed<returnAt+5){const f=easeHarbour((elapsed-returnAt)/5);actor.x=-520+(home.x+520)*f;actor.facing=1;actor.walking=true;carrying=true;saleProgress=harbour.sale.items.length;}
    else {const f=easeHarbour((elapsed-returnAt-5)/2);actor.x=home.x+(950-home.x)*f;actor.facing=1;actor.walking=true;saleProgress=harbour.sale.items.length;}
    // Camera tracks the entire outward and return journey continuously.
    const camera=easeHarbour((home.x-actor.x)/Math.max(1,home.x+520));ox+=((w*.45-ox)/scale+685)*camera*scale;
    remaining=harbour.sale.items.slice(Math.max(0,Math.floor(saleProgress)));
    if(actor.walking)harbourFootstep(now);
    if(elapsed>=3 && !harbour.pickedUp){harbour.pickedUp=true;harbourSound('basket');}
    if(elapsed>=returnAt+5 && !harbour.setDown){harbour.setDown=true;harbourSound('basket');}
    const sold=Math.max(0,Math.min(harbour.sale.items.length,Math.floor(saleProgress)));
    if(sold!==harbour.sold){harbour.sold=sold;harbourSound(harbour.sale.items[sold-1]?.points<0?'deduct':'cash');}
    const shown=harbour.sale.before+harbour.sale.items.slice(0,sold).reduce((sum,item)=>sum+Math.round(item.points*10),0);
    updateHarbourUI(Math.max(0,shown));
    $('#fishmongerStatus').textContent=elapsed<7?'Taking the catch to the fishmonger…':elapsed>=returnAt?'Back to the dock…':harbour.sale.items.length?`Selling ${harbour.sale.items[sold]?.name || 'the last item'} · ${sold} / ${harbour.sale.items.length}`:'No catch today. See you next time!';
  }else{
    const journey = canoeJourney(elapsed);
    const downstream = harbour.phase === 'outbound' ? journey : harbour.phase === 'return' ? 1 - journey : 1;
    // Keep the dock's scale and artwork, then follow the hull down the river.
    const targetOy=h*.48-RIVER_SHOP.playerY*scale;
    oy+=(targetOy-oy)*downstream;
    const boat=canoePosition(downstream), homeCenter=(w*.5-ox)/scale;
    const follow=easeHarbour(downstream/.15), arrival=easeHarbour((downstream-.82)/.18);
    let center=homeCenter+(boat.x-homeCenter)*follow;
    const shopCenter=RIVER_SHOP.x+(h<450?w*.08/scale:0);
    center+=(shopCenter-center)*arrival;
    // Reveal the wider river only once its artwork reaches the top of frame.
    const expand=easeHarbour((-oy/scale-1120)/500), half=w/(2*scale);
    center=Math.max(half-300*expand,Math.min(2048+852*expand-half,center));
    ox=w*.5-center*scale;
  }
  p.save();p.translate(ox,oy);p.scale(scale,scale);
  if(sale){
    drawHarbourBank(now);
    if(bridgeReady){drawRiverWorldLayer(themedScenery(bridgePixels));drawWaterCurrent(now);drawRiverWorldLayer(waterFlowPixels);}
    drawStall(-850,480,false,now);
    drawActorGroundShadow(actor.x,actor.y);
    drawFisherman(now/1000,0,0,true,null,actor);
    if(carrying)drawCarriedBasket(actor.x+(actor.facing<0?-75:75),actor.y-30,remaining,.7);
    else drawCarriedBasket(harbour.homeBasket.x,480,elapsed<3?harbour.sale.items:[],1);
    if(saleProgress>=0 && saleProgress<harbour.sale.items.length){
      const i=Math.floor(saleProgress), f=saleProgress-i, item=harbour.sale.items[i];
      drawCatchItem(item,-595-200*easeHarbour(f),410-80*Math.sin(f*Math.PI),-.3+f*.5);
      const cents=Math.round(item.points*10);
      harbourLabel(`${cents<0?'−':'+'}${money(cents)}`,-760,260-f*90,30,cents<0?'#ff9f83':'#a6ef86');

    }
  }else{
    drawDownstreamWorld(now);
    drawBasketLayer();drawBasketCatches();drawBasketLayer(true);
    // The shop sits on the existing right bank, downstream of the bridge.
    drawRiverShop(now);
    if(harbour.phase==='outbound'||harbour.phase==='return'){
      const f=canoeJourney(elapsed), boat=canoePosition(harbour.phase==='outbound'?f:1-f), y=boat.y;
      drawCanoe(boat.x,y,now, !(elapsed < CANOE_BOARD_SECONDS || elapsed > CANOE_TRIP_MS/1000-CANOE_BOARD_SECONDS), canoeMooring(boat));
      if (elapsed < CANOE_BOARD_SECONDS) {
        const t=elapsed/CANOE_BOARD_SECONDS, start=harbour.boardingActor;
        drawFisherman(now/1000,0,0,true,null,canoeTransferPose(start,{x:boat.x,y:y+50},t,harbour.phase==='return',true));
      }
      if (elapsed > CANOE_TRIP_MS/1000-CANOE_BOARD_SECONDS) {
        const t=(elapsed-(CANOE_TRIP_MS/1000-CANOE_BOARD_SECONDS))/CANOE_BOARD_SECONDS, target=harbour.phase==='outbound'?{x:RIVER_SHOP.playerX,y:RIVER_SHOP.playerY}:DOCK_BOARDING;
        drawFisherman(now/1000,0,0,true,null,canoeTransferPose({x:boat.x,y:y+50},target,t,harbour.phase==='outbound',false));
      }
      // The near hull covers legs during the standing-to-seated handoff.
      if(elapsed<CANOE_BOARD_SECONDS && elapsed/CANOE_BOARD_SECONDS>.75 || elapsed>CANOE_TRIP_MS/1000-CANOE_BOARD_SECONDS && (elapsed-(CANOE_TRIP_MS/1000-CANOE_BOARD_SECONDS))/CANOE_BOARD_SECONDS<.25)
        drawCanoe(boat.x,y,now,false,canoeMooring(boat));
      if(elapsed>=CANOE_BOARD_SECONDS && elapsed<=CANOE_TRIP_MS/1000-CANOE_BOARD_SECONDS && Math.floor(elapsed/(Math.PI*.8))>harbour.paddleBeat){harbour.paddleBeat=Math.floor(elapsed/(Math.PI*.8));harbourSound('paddle');}
    }else{
      drawCanoe(canoePosition(1).x,RIVER_SHOP.boatY,now,false,canoeMooring(canoePosition(1)));
      const eating=harbour.consumption, progress=eating?Math.min(1,(now-eating.started)/3200):0;
      drawActorGroundShadow(RIVER_SHOP.playerX,RIVER_SHOP.playerY);
      p.save();p.translate(RIVER_SHOP.playerX,RIVER_SHOP.playerY);p.rotate(eating&&!reducedFishingMotion?-.12*Math.sin(progress*Math.PI):0);
      drawFisherman(now/1000,0,0,true,null,{x:0,y:0,facing:1,handsFree:true});
      if(eating){
        p.save();p.translate(45,-135);p.rotate(eating.kind==='beer'?-progress*.9:0);drawConsumable(eating.kind,0,0,1-progress);p.restore();
        p.strokeStyle='#d5ad6c';p.lineWidth=13;p.beginPath();p.moveTo(48,-93);p.lineTo(45,-128);p.stroke();
        const beat=Math.floor(progress*5);if(beat!==eating.beat){eating.beat=beat;harbourSound(eating.kind==='beer'?'gulp':'bite');}
      }
      p.restore();
      if(harbour.phase==='dismiss'){harbourLabel('THREE’S YOUR LIMIT. HOME YOU GO!',RIVER_SHOP.x,RIVER_SHOP.y-250,24);}
    }
  }
  p.restore();
  if(sale && saleProgress>=0 && saleProgress<harbour.sale.items.length){
    const f=saleProgress%1, fly=easeHarbour(Math.max(0,(f-.2)/.8));
    const item=harbour.sale.items[Math.floor(saleProgress)];
    const sx=ox-760*scale, sy=oy+220*scale;
    const x=sx+(45-sx)*fly, y=sy+(38-sy)*fly-45*Math.sin(fly*Math.PI);
    p.save();p.globalAlpha=Math.sin(f*Math.PI);
    harbourRect(x-18,y-10,36,22,item.points<0?'#ce7959':'#68b957');
    harbourLabel('$',x,y+6,18,'#113e2d');p.restore();
  }
  if(sale && elapsed>=returnAt+7) finishFishmonger();
  else if(harbour.phase==='outbound' && elapsed>=CANOE_TRIP_MS/1000){harbour.phase='shop';$('#shoppeUI').hidden=false;$('#shoppeStatus').textContent='Welcome! Food and drink are enjoyed here.';updateHarbourUI();($('#shoppeUI button:not(:disabled)') || $('#returnCanoe')).focus({preventScroll:true});}
  else if(harbour.phase==='return' && elapsed>=CANOE_TRIP_MS/1000){
    harbour.phase='dock';document.body.classList.remove('harbour-active');stopPregameWalk();
    Object.assign(pregameAngler,{x:DOCK_BOARDING.x,y:DOCK_BOARDING.y,facing:-1,swimming:false});
    if(harbour.origin==='summary'){document.body.classList.add('showing-summary');$('#summaryScreen').classList.remove('hidden');$('#visitShoppe').focus({preventScroll:true});}else{$('#walkStick').focus({preventScroll:true});}
  }
  else if(harbour.phase==='shop' && harbour.consumption && now-harbour.consumption.started>=3200){
    const beer=harbour.consumption.kind==='beer';harbour.consumption=null;
    if(beer&&harbour.beers===3){harbour.phase='dismiss';harbour.started=now;$('#shoppeUI').hidden=true;harbourSound('dismiss');}
    else{$('#shoppeStatus').textContent=beer?`Cheers! ${harbour.beers} / 3 beers this visit.`:'That hit the spot.';updateHarbourUI();}
  }
  else if(harbour.phase==='dismiss'&&elapsed>=2){harbour.phase='shop';startCanoe(true,true);}
  return true;
}
updateHarbourUI();
