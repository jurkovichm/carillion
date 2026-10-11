// The chase takes over the fishing scene at the instant the loon grabs the catch.
let loonFight = null, loonFightFrame = null;
const LOON_ENTRY_MS = 2000, LOON_PUNCH_SLOWDOWN = 3.2, LOON_PUNCH_MS = 5800;
const loonBackdrop = new Image(), loonSwimmerAtlas = new Image(), loonShore = new Image();
let loonShoreSprite = null;
loonShore.onload = () => { loonShoreSprite = sampleSprite(loonShore, 0, 0, loonShore.naturalWidth, loonShore.naturalHeight, 144, 240); };
loonShore.src = 'assets/loon-shore-v2.png';
const loonSwimmerFrames = [], loonRockFrames = [];
loonBackdrop.src = 'assets/loon-chase-lake.png';
loonSwimmerAtlas.onload = () => {
  // Explicit gutters keep the leaping poses and neighbouring strokes separate.
  const columns = [0, 334, 642, 948, 1240, 1500, 1774], rows = [0, 320, 581, 887];
  for (let row = 0; row < 3; row++) {
    loonSwimmerFrames[row] = [];
    for (let col = 0; col < 6; col++) loonSwimmerFrames[row][col] = sampleSprite(loonSwimmerAtlas, columns[col], rows[row], columns[col+1]-columns[col], rows[row+1]-rows[row], 112, 220);
  }
};
loonSwimmerAtlas.src = 'assets/loon-swimming-atlas.png';
function loonDifficulty(elapsed) {
  const progress = Math.min(1, elapsed / 20);
  return { speed: 240 + progress * 200, interval: 1.5 - progress * .68, height: 32 + progress * 24, width: 32 + progress * 16, level: Math.min(4, 1 + Math.floor(elapsed / 5)) };
}
function makeLoonRock(variant) {
  const sprite = document.createElement('canvas'); sprite.width = 48; sprite.height = 48;
  const c = sprite.getContext('2d');
  const shape = [[2,44],[2,29],[7,29],[7,17],[13,17],[13,8],[22,8],[22,4],[33,4],[33,9],[39,9],[39,20],[44,20],[44,44]];
  const fill = (points,color) => { c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill(); };
  fill(shape,'#273f3b');
  fill([[5,40],[8,27],[11,27],[11,18],[17,18],[17,10],[31,8],[35,13],[35,25],[40,25],[39,39]],'#5c7165');
  fill([[12,24],[17,12],[28,10],[33,14],[27,19],[24,29]],'#9eaf91');
  fill([[24,29],[33,18],[36,29],[38,39],[28,40]],'#465c52');
  fill([[7,32],[13,27],[24,29],[20,37],[8,38]],'#718875');
  for(let i=0;i<12;i++){c.fillStyle=i%3?'#819382':'#343b3b';c.fillRect(10+(i*13+variant*7)%25,15+(i*11)%22,2+i%2,2);}
  c.fillStyle='#4c7845';c.fillRect(18,8,10,3);c.fillRect(12,17,6,3);c.fillStyle='#87aa63';c.fillRect(19,8,5,1);
  return sprite;
}
for(let i=0;i<3;i++) loonRockFrames.push(makeLoonRock(i));
function splashLoon(count = 12, originX = loonFight?.playerX - 8, originY = 0) {
  if (!loonFight) return;
  for(let i=0;i<count;i++) loonFight.particles.push({x:originX,y:originY,vx:-80+Math.random()*160,vy:-80-Math.random()*140,life:.4+Math.random()*.4});
}

function cancelLoonFight() {
  stopLoonAudio();
  cancelAnimationFrame(loonFightFrame);
  loonFightFrame = null;
  loonFight = null;
  $('#loonEncounter')?.remove();
  document.body.classList.remove('loon-chase');
  $('#gameUI').inert = false;
  $('.controls-top').inert = false;
}
function offerLoonFight(fish, shoreIndex) {
  cancelLoonFight();
  $('#gameUI').inert = true;
  $('.controls-top').inert = true;
  const overlay = document.createElement('section');
  overlay.id = 'loonEncounter'; overlay.className = 'loon-overlay';
  overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'loonMessage');
  overlay.innerHTML = `<div class="loon-panel"><canvas id="loonCourse" class="hidden" aria-label="Swim and jump over approaching rocks"></canvas><h2 id="loonTitle" class="hidden"></h2><button id="loonPause" class="loon-pause hidden" type="button" aria-label="Pause chase">Ⅱ</button><button id="loonSoundToggle" class="loon-sfx hidden" type="button"></button><p id="loonMessage" role="status">A loon is stealing your catch! Fight?</p><div class="loon-buttons"><button id="fightLoon">Yes</button><button class="secondary" id="leaveLoon">No, Recast</button></div></div>`;
  document.body.append(overlay);
  $('#fightLoon').onclick = () => {
    if (roundState.phase !== 'loonChoice') return;
    if (soundEnabled) soundContext();
    startLoonFight(fish, shoreIndex);
  };
  $('#leaveLoon').onclick = () => declineLoonFight(fish);
  $('#fightLoon').focus();
}
function resizeLoonCourse() {
  if (!loonFight) return;
  const canvas = $('#loonCourse');
  const width = innerWidth < 650 ? 360 : 720;
  // Preserve each obstacle's time-to-contact when crossing a viewport breakpoint.
  const shift = width * .18 - (loonFight.playerX ?? width * .18);
  for (const rock of loonFight.rocks) rock.x += shift;
  for (const particle of loonFight.particles) particle.x += shift;
  loonFight.width = width;
  loonFight.height = Math.round(width * innerHeight / innerWidth);
  // Keep simulation coordinates fixed, but render with enough detail for close-ups.
  loonFight.renderScale = Math.min(3, Math.max(1, innerWidth / width * (devicePixelRatio || 1)));
  canvas.width = Math.round(width * loonFight.renderScale);
  canvas.height = Math.round(loonFight.height * loonFight.renderScale);
  loonFight.playerX = width * .18;
}
function startLoonFight(fish, shoreIndex) {
  // Capture from the original environment art instead of magnifying its coarse
  // gameplay buffer. Sprite styling stays consistent with the fishing scene.
  animateScene(performance.now(), true);
  const sceneCopy = document.createElement('canvas');
  sceneCopy.width = scene.width; sceneCopy.height = scene.height;
  sceneCopy.getContext('2d').drawImage(scene, 0, 0);
  const bird = fishingLoon ? loonTheftPose(performance.now()) : null;
  const view = fishingSceneView;
  const anchor = bird && view ? { x: (view.ox + bird.x * view.scale) / view.width, y: (view.oy + bird.y * view.scale) / view.height } : { x: .5, y: .5 };
  fishingLoon = null;
  roundState.phase = 'loonFight';
  loonFight = { fish, shoreIndex, phase: 'entering', elapsed: 0, last: performance.now(), enteredAt: performance.now(), sceneCopy, anchor, y: 0, velocity: 0, rocks: [], particles: [], stroke: 0, soundStroke: 0, soundLevel: 1, nextRock: 1.1, wonAt: 0 };
  $('#loonEncounter').classList.add('chasing');
  document.body.classList.add('loon-chase');
  $('.loon-panel').classList.remove('hidden');
  resizeLoonCourse();
  $('#loonTitle').classList.remove('hidden');
  $('#loonTitle').textContent = 'CHASE THE LOON';
  $('#loonPause').classList.remove('hidden');
  $('#loonPause').onclick = () => setLoonPaused(loonFight.pausedAt == null);
  $('#loonSoundToggle').classList.remove('hidden');
  $('#loonSoundToggle').onclick = () => { soundEnabled = !soundEnabled; saveSoundPreference(); soundButton(); setLoonSoundEnabled(soundEnabled); if (soundEnabled) { soundContext(); loonSound('stroke'); } };
  setLoonSoundEnabled(soundEnabled);
  loonSound('land');
  $('#loonMessage').textContent = 'Space / ↑ / tap to jump · the current gets faster';
  $('#loonCourse').classList.remove('hidden');
  $('#fightLoon').textContent = 'Jump'; $('#fightLoon').onclick = jumpLoonRock;
  $('#leaveLoon').classList.add('hidden');
  $('#loonCourse').onpointerdown = event => { event.preventDefault(); jumpLoonRock(); };
  $('#fightLoon').focus({preventScroll:true});
  drawLoonCourse();
  loonFightFrame = requestAnimationFrame(stepLoonFight);
}
function loseLoonCatch() {
  if (!loonFight || loonFight.penaltyApplied) return;
  loonFight.penaltyApplied = true;
  const fish = loonFight.fish;
  removeLoonCatch(fish);
  score -= 30; depthScore = score * 10;
  const record = roundState.record;
  record.points -= 30; record.meters = record.points * 10; record.depthAfter = depthScore;
  record.reason = 'loon-loss'; record.loonPenalty = 30;
  record.typed = record.catches.map(catchItem => catchItem.name).join(', ');
  record.matched = record.catches.at(-1)?.match || null;
  updateFishingHUD();
}
function jumpLoonRock() {
  if (loonFight?.phase === 'playing' && loonFight.pausedAt == null && loonFight.y === 0) { loonFight.velocity = 490; splashLoon(18); loonSound('jump'); }
}
function setLoonPaused(paused, now = performance.now()) {
  const state = loonFight;
  if (!state || !['entering', 'playing', 'punch'].includes(state.phase)) return;
  if (paused && state.pausedAt == null) {
    state.pausedAt = now;
    state.pauseMessage = $('#loonMessage').textContent;
    stopLoonAudio();
  } else if (!paused && state.pausedAt != null) {
    const delay = now - state.pausedAt;
    state.enteredAt += delay;
    if (state.wonAt) state.wonAt += delay;
    state.last = now;
    state.pausedAt = null;
  } else return;
  $('#loonEncounter').classList.toggle('paused', paused);
  $('#loonPause').textContent = paused ? '▶' : 'Ⅱ';
  $('#loonPause').setAttribute('aria-label', paused ? 'Resume chase' : 'Pause chase');
  $('#loonMessage').textContent = paused ? 'Chase paused · press Resume to continue' : state.pauseMessage;
  $('#fightLoon').textContent = paused ? 'Resume' : state.phase === 'punch' ? 'POW!' : 'Jump';
  $('#fightLoon').disabled = !paused && state.phase === 'punch';
  $('#fightLoon').onclick = paused ? () => setLoonPaused(false) : jumpLoonRock;
  if (paused) $('#fightLoon').focus({ preventScroll:true });
}
document.addEventListener('visibilitychange', () => { if (document.hidden) setLoonPaused(true); });
window.addEventListener('blur', () => setLoonPaused(true));
function stepLoonFight(now) {
  const state = loonFight;
  if (!state) return;
  if (state.pausedAt != null) { loonFightFrame = requestAnimationFrame(stepLoonFight); return; }
  const dt = Math.min(.04, Math.max(0, (now - state.last) / 1000)); state.last = now;
  if (state.phase === 'entering' && now - state.enteredAt >= (reducedFishingMotion ? 150 : LOON_ENTRY_MS)) {
    state.phase = 'playing'; state.sceneCopy = null;
  }
  if (state.phase === 'playing') {
    state.elapsed += dt;
    state.velocity -= 1150 * dt;
    const previousY = state.y;
    state.y = Math.max(0, state.y + state.velocity * dt);
    if (!state.y) { state.velocity = 0; if(previousY) { splashLoon(14); loonSound('land'); } }
    const difficulty = loonDifficulty(state.elapsed), speed = difficulty.speed;
    if (difficulty.level !== state.soundLevel) { state.soundLevel = difficulty.level; loonSound('current'); }
    state.soundStroke += dt;
    if (!state.y && state.soundStroke >= .42) { state.soundStroke = 0; loonSound('stroke'); }
    state.stroke += dt;
    if (!state.y && state.stroke > .15) { state.stroke = 0; splashLoon(2, state.playerX + 24); }
    if (state.elapsed >= state.nextRock) {
      state.rocks.push({ x: state.width + 30, width: difficulty.width + Math.random() * 7, height: difficulty.height + Math.random() * 6, variant:Math.floor(Math.random()*3) });
      if(state.elapsed > 9 && Math.random() < .45) state.rocks.push({x:state.width+126,width:25,height:30,variant:2});
      state.nextRock = state.elapsed + difficulty.interval + Math.random() * .18;
    }
    for (const rock of state.rocks) rock.x -= speed * dt;
    state.rocks = state.rocks.filter(rock => rock.x > -60);
    if (state.rocks.some(rock => rock.x < state.playerX + 18 && rock.x + rock.width > state.playerX - 18 && state.y < rock.height - 5)) {
      loonSound('collision');
      loseLoonCatch();
      state.phase = 'lost'; $('#loonPause').classList.add('hidden'); $('#loonEncounter').classList.add('result');
      $('#loonTitle').classList.add('hidden');
      $('#loonMessage').textContent = 'You hit a rock. −30 points.';
      $('#fightLoon').textContent = round === questions.length - 1 ? 'Review the catch' : 'Next Cast';
      $('#fightLoon').onclick = () => { cancelLoonFight(); completeQuestion(); descendNext(); };
      $('#leaveLoon').classList.add('hidden');
    } else if (state.elapsed >= 20) {
      state.phase = 'punch'; state.wonAt = now;
      $('#loonEncounter').classList.add('result');
      $('#loonTitle').textContent = 'POW! CATCH RECOVERED';
      $('#loonMessage').textContent = 'One punch. Your catch is coming home.';
      $('#fightLoon').textContent = 'POW!'; $('#fightLoon').disabled = true;
      $('#leaveLoon').classList.add('hidden');
    }
  } else if (state.phase === 'punch' && now - state.wonAt >= (reducedFishingMotion ? 3200 : LOON_PUNCH_MS)) {
    state.phase = 'won'; $('#loonPause').classList.add('hidden');
    loonSound('recover');
    $('#fightLoon').disabled = false; $('#fightLoon').textContent = 'Keep the catch';
    $('#fightLoon').onclick = () => {
      shoreCatches.splice(Math.max(0, state.shoreIndex), 0, state.fish);
      cancelLoonFight(); completeQuestion(true);
    };
    $('#fightLoon').focus();
  }
  if(state.phase === 'punch' && !state.punchHit && now - state.wonAt >= 2000 + 380 * (reducedFishingMotion ? 1 : LOON_PUNCH_SLOWDOWN)) {
    state.punchHit = true; loonSound('punch'); splashLoon(28, state.width - 75, -35);
  }
  const particleDt = state.phase === 'punch' ? dt / LOON_PUNCH_SLOWDOWN : dt;
  for(const particle of state.particles){particle.x+=(particle.vx-loonDifficulty(state.elapsed).speed*.2)*particleDt;particle.y+=particle.vy*particleDt;particle.vy+=500*particleDt;particle.life-=particleDt;}
  state.particles=state.particles.filter(p=>p.life>0);
  drawLoonCourse(now);
  loonFightFrame = ['entering', 'playing', 'punch'].includes(state.phase) ? requestAnimationFrame(stepLoonFight) : null;
}
function drawLoonCourse(now = performance.now()) {
  const state = loonFight, canvas = $('#loonCourse'), ctx = canvas.getContext('2d');
  if ($('#loonEncounter').dataset.phase !== state.phase) $('#loonEncounter').dataset.phase = state.phase;
  const w = state.width, h = state.height, surface = Math.round(h * .68);
  const recovered = ['punch', 'won'].includes(state.phase);
  const punchElapsed = recovered ? Math.max(0, (now - state.wonAt) / 1000) : 0;
  const punchTime = Math.max(0, punchElapsed - 2) / (reducedFishingMotion ? 1 : LOON_PUNCH_SLOWDOWN);
  ctx.setTransform(state.renderScale, 0, 0, state.renderScale, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#113e2d'; ctx.fillRect(0, 0, w, h);
  const focus = recovered && !reducedFishingMotion ? Math.max(0, Math.min(1, (punchElapsed - 1.1) / 1.1)) : 0;
  const cameraEase = focus * focus * (3 - 2 * focus);
  ctx.save();
  // Distant scenery moves more gently than the foreground close-up.
  applyLoonCamera(ctx, w, h, surface, cameraEase, .5);
  const drift = state.elapsed * (12 + loonDifficulty(state.elapsed).level * 2);
  if (loonBackdrop.complete && loonBackdrop.naturalWidth) {
    // Use one continuous projection for the bank, reeds, reflections and lake.
    // Small ripples preserve reflection shapes; fast highlights carry the
    // current without shearing the image into stretched diagonal bands.
    const sw = loonBackdrop.naturalWidth, sh = loonBackdrop.naturalHeight;
    const bankHeight = Math.max(120, surface - 30), scale = bankHeight / (sh * .53);
    const tileWidth = sw * scale;
    const currentStart = bankHeight + Math.min(24, h * .025);
    for (let x = -(drift % tileWidth); x < w; x += tileWidth) {
      ctx.drawImage(themedScenery(loonBackdrop), Math.floor(x), 0, Math.ceil(tileWidth) + 1, sh * scale);
    }
    const rowStep = 1 / state.renderScale;
    for (let y = Math.ceil(currentStart); y < h; y += rowStep) {
      const rowHeight = Math.min(rowStep, h - y);
      const depth = Math.max(0, Math.min(1, (y - currentStart) / Math.max(1, h - currentStart)));
      const blend = depth * depth * (3 - 2 * depth);
      const ripple = reducedFishingMotion ? 0 : Math.sin(y * .08 - state.elapsed * 3) * 3 * blend;
      const offset = drift + ripple;
      for (let x = -(offset % tileWidth); x < w; x += tileWidth) {
        ctx.drawImage(themedScenery(loonBackdrop), 0, y / scale, sw, rowHeight / scale,
          Math.floor(x), y, Math.ceil(tileWidth) + 1, rowHeight);
      }
    }
  } else if(bridgeReady) {
    ctx.drawImage(themedScenery(bridgePixels),0,70,320,120,0,0,w,surface-30);
    ctx.fillStyle='#0b5968';ctx.fillRect(0,surface-30,w,h-surface+30);
  }
  const flow = Math.floor(state.elapsed * loonDifficulty(state.elapsed).speed * .8);
  for (let row = 0; row < 8; row++) {
    ctx.fillStyle = row % 2 ? '#177d8844' : '#77cbbc55';
    for (let i = 0; i < 10; i++) ctx.fillRect((i * 96 + row * 28 - flow % 96), surface - 20 + row * (h - surface) / 9, 8 + row % 3 * 8, 2);
  }
  ctx.restore(); ctx.save();
  applyLoonCamera(ctx, w, h, surface, cameraEase, 2);
  const swimToBank = Math.min(1, punchElapsed / 1.35);
  const climb = Math.max(0, Math.min(1, (punchElapsed - 1.35) / .65));
  const swimming = recovered ? climb === 0 : state.y === 0;
  const playerX = recovered ? state.playerX + (w - 150 - state.playerX) * swimToBank + 35 * climb : state.playerX;
  const playerY = surface - (recovered ? 0 : state.y);
  const actionFrame = recovered && !swimming ? (punchTime < .25 ? 4 : 5) : state.y > 0 && !recovered ? 4 : (reducedFishingMotion ? 1 : Math.floor(now / 105) % 4);
  if (recovered) drawLoonBank(ctx, w, surface, Math.min(1, punchElapsed / .6));
  if(recovered && !swimming){ctx.fillStyle='#11271b35';ctx.fillRect(Math.round(playerX-32),surface-7,15,3);ctx.fillRect(Math.round(playerX+10),surface-7,17,3);}
  const swimmer = loonSwimmerFrames[selectedFisherman]?.[actionFrame];
  const sprite = swimmer || characterFrames[rewardStage]?.[selectedFisherman];
  const bob = !state.y && !recovered && !reducedFishingMotion ? Math.sin(now / 130) * 2 : 0;
  if (sprite) {
    const height = swimmer ? (recovered ? 42 + climb * 26 : state.y > 0 ? 58 : 42) : 48;
    const width = Math.round(height * sprite.width / sprite.height);
    const waterY = surface + (reducedFishingMotion ? 0 : Math.round(Math.sin(now / 170)));
    const patchX = Math.round(playerX - width / 2 - 12), patchHeight = Math.ceil(height / 2 + 7);
    let waterPatch;
    if (swimming) {
      // Save the actual moving water before drawing the body, so the submerged
      // half can disappear beneath the same texture instead of a flat blue box.
      waterPatch = state.swimWater ||= document.createElement('canvas');
      if (waterPatch.width !== Math.ceil((width + 24) * state.renderScale) || waterPatch.height !== Math.ceil(patchHeight * state.renderScale)) {
        waterPatch.width = Math.ceil((width + 24) * state.renderScale); waterPatch.height = Math.ceil(patchHeight * state.renderScale);
      }
      waterPatch.getContext('2d').drawImage(canvas, patchX * state.renderScale, waterY * state.renderScale, waterPatch.width, waterPatch.height,
        0, 0, waterPatch.width, waterPatch.height);
    }
    const centerY = recovered ? surface + 4 + (surface - 8 - height * .4 - (surface + 4)) * climb : playerY + (swimming ? height * .1 : -20) + bob;
    ctx.save(); ctx.translate(Math.round(playerX), Math.round(centerY));
    if(!swimmer) ctx.rotate(recovered ? 0 : state.y > 0 ? .2 : Math.PI / 2);
    else if(state.y > 0 && !recovered && !reducedFishingMotion) ctx.rotate(Math.max(-.25,Math.min(.25,-state.velocity/1800)));
    ctx.drawImage(sprite,-width/2,-height*.6,width,height);ctx.restore();
    if (swimming) {
      ctx.save(); ctx.globalAlpha = .84;
      ctx.drawImage(waterPatch, patchX, waterY, width + 24, patchHeight); ctx.restore();
      // Broken foam at the surface follows the shoulder, recovering arm and wake.
      ctx.fillStyle = '#b9e3cc';
      for (let i = 0; i < 5; i++) {
        const ripple = reducedFishingMotion ? 0 : Math.round(Math.sin(now / 110 + i));
        ctx.fillRect(Math.round(patchX + 6 + i * (width + 8) / 5), waterY + ripple, 6 + i % 2 * 3, 1);
      }
      ctx.fillStyle = '#77cbbc';
      ctx.fillRect(Math.round(playerX + width * .32), waterY + 2, 7, 2);
    }
  }
  for(const particle of state.particles){ctx.globalAlpha=Math.min(1,particle.life*3);ctx.fillStyle='#b9e3cc';ctx.fillRect(Math.round(particle.x),Math.round(surface+particle.y),3,3);}ctx.globalAlpha=1;
  if (swimming) {
    ctx.fillStyle = '#77cbbc';
    for (let i = 0; i < 4; i++) ctx.fillRect(playerX - 45 - i * 12, surface + 2 + i % 2 * 4, 8, 2);
  }
  if (!recovered) for (const rock of state.rocks) {
    const x=Math.round(rock.x),y=surface-Math.round(rock.height);
    ctx.fillStyle='#073d4088';ctx.fillRect(x-4,surface+5,rock.width+8,5);
    ctx.drawImage(loonRockFrames[rock.variant||0],x,y,Math.round(rock.width),Math.round(rock.height)+8);
    ctx.fillStyle='#b9e3cc';ctx.fillRect(x-5,surface+3,10,2);ctx.fillRect(x+rock.width-3,surface+5,9,2);
  }
  const recoil = recovered ? Math.min(1, Math.max(0, punchTime - .38) / .6) : 0;
  const birdX = w - 75 + recoil * 40;
  const birdY = recovered ? surface - 100 + 60 * Math.min(1, punchElapsed / 1.35) - recoil * 35 : surface - 100 + (reducedFishingMotion ? 0 : Math.round(Math.sin(now / 220) * 5));
  const bird = loonFrames[reducedFishingMotion ? 1 : Math.floor(now / 100) % 4];
  const carrying = !recovered || punchTime < .38;
  drawLoonWithCatch(ctx, bird, Math.round(birdX), Math.round(birdY), .35, -1,
    carrying ? state.fish : null, now, state.fish.kind === 'fish' && state.fish.points >= 60 ? 36 : 30);
  if (!carrying && bird) {
    // The punch frees the object; it arcs from the bill back into the angler's hand.
    const grip = loonGripPosition(bird, w - 75, surface - 40, .35);
    const flight = Math.min(1, (punchTime - .38) / .55), ease = flight * flight * (3 - 2 * flight);
    drawHeldCatch(ctx, state.fish, grip.x + (playerX + 40 - grip.x) * ease,
      grip.y + (surface - 43 - grip.y) * ease - Math.sin(flight * Math.PI) * 18,
      24, 1.12 * (1 - ease) + .15 * ease);
  }
  if (recovered) {
    if (punchTime >= .38) {
      ctx.font = 'bold 24px monospace'; ctx.lineJoin = 'miter'; ctx.lineWidth = 4;
      ctx.strokeStyle = '#11271b'; ctx.strokeText('POW!', w-140, surface-112);
      ctx.fillStyle = '#efcd87'; ctx.fillText('POW!', w-140, surface-112);
      for(let i=0;i<8;i++){const a=i*Math.PI/4, r=14+recoil*20;ctx.fillRect(Math.round(w-70+Math.cos(a)*r),Math.round(surface-45+Math.sin(a)*r),4,4);}
    }
  }
  ctx.restore();
  if (state.phase === 'entering' && state.sceneCopy) {
    const elapsed = now - state.enteredAt;
    if (reducedFishingMotion) {
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - elapsed / 150);
      ctx.drawImage(state.sceneCopy, 0, 0, w, h); ctx.restore();
    } else if (elapsed < 1400) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      const focus = Math.min(1, elapsed / 850), ease = focus * focus * (3 - 2 * focus);
      const zoom = 1 + ease * 1.8;
      // Move the loon from its basket position to the middle of the close-up.
      const centerX = Math.max(w / (2 * zoom), Math.min(w - w / (2 * zoom), w / 2 + (w * state.anchor.x - w / 2) * ease));
      const centerY = Math.max(h / (2 * zoom), Math.min(h - h / (2 * zoom), h / 2 + (h * state.anchor.y - h / 2) * ease));
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(zoom, zoom);
      ctx.drawImage(state.sceneCopy, -centerX, -centerY, w, h); ctx.restore();
      const closing = Math.max(0, Math.min(1, (elapsed - 850) / 450));
      drawLoonIris(ctx, w, h, w / 2 + (w * state.anchor.x - centerX) * zoom, h / 2 + (h * state.anchor.y - centerY) * zoom, 1 - closing);
    } else {
      const opening = Math.min(1, (elapsed - 1400) / 600);
      drawLoonIris(ctx, w, h, w - 75, surface - 100, opening);
    }
  }
}
function applyLoonCamera(ctx, width, height, surface, ease, magnification) {
  const zoom = 1 + ease * magnification;
  const centerX = width / 2 + (width - 100 - width / 2) * ease;
  const centerY = height / 2 + (surface - 40 - height / 2) * ease;
  ctx.translate(width / 2, height / 2); ctx.scale(zoom, zoom); ctx.translate(-centerX, -centerY);
}
function drawLoonBank(ctx, width, surface, arrival) {
  if (!loonShoreSprite) return;
  const left = width - 175 + (1 - arrival) * 180;
  const bankWidth = 240, bankHeight = bankWidth * loonShoreSprite.height / loonShoreSprite.width;
  // The dirt path is the walkable plane, 37 logical pixels below the sprite's top.
  ctx.drawImage(themedScenery(loonShoreSprite), Math.round(left), surface - 45, bankWidth, Math.round(bankHeight));
}
function drawLoonIris(ctx, width, height, x, y, openness) {
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) * openness;
  ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath();
  ctx.rect(0, 0, width, height);
  if (radius > 0) { ctx.moveTo(x + radius, y); ctx.arc(x, y, radius, 0, Math.PI * 2); }
  ctx.fill('evenodd'); ctx.restore();

}
addEventListener('resize', () => { resizeLoonCourse(); if (loonFight) drawLoonCourse(loonFight.pausedAt ?? performance.now()); });
document.addEventListener('keydown', event => {
  if (!$('#loonEncounter')) return;
  if (event.key === 'Escape' && loonFight) { event.preventDefault(); setLoonPaused(loonFight.pausedAt == null); return; }
  if ((event.code === 'Space' || event.key === 'ArrowUp') && loonFight?.phase === 'playing' && loonFight.pausedAt == null) {
    if (event.code === 'Space' && event.target.closest('button') && event.target.id !== 'fightLoon') return;
    event.preventDefault(); if (!event.repeat) jumpLoonRock();
  }
  if (event.key === 'Tab') {
    const buttons = [...$('#loonEncounter').querySelectorAll('button:not(:disabled):not(.hidden)')].filter(button => getComputedStyle(button).visibility !== 'hidden');
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});
