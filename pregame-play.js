// A walk along the bridge leads to a separate, face-powered flying game.
const walkInput = { x: 0, y: 0, pointer: null, center: null, keys: new Set() };
const walkSurface = matchMedia('(max-width: 650px), (pointer: coarse)');
const flightState = { phase: 'closed', paused: false, score: 0, best: 0, pipes: [], character: 1, bird: null, width: 360, height: 640 };
const flightHeads = [];
try { flightState.best = Math.max(0, Number(localStorage.getItem('carillion-flight-best')) || 0); } catch {}

fishingViewport.insertAdjacentHTML('beforeend', `
  <div class="pregame-walk" id="pregameWalk">
    <button class="walk-stick" id="walkStick" aria-label="Walk your angler. Drag to move, or use arrow keys."><span class="walk-cross" aria-hidden="true"></span><span id="walkKnob" aria-hidden="true"></span></button>
    <small>WALK</small><span class="walk-hint">Explore the banks →</span>
  </div>
  <button class="walk-menu" id="walkMenu">Show fishing menu</button>
  <section class="flight-game" id="flightGame" role="dialog" aria-modal="true" aria-label="Flappy Angler" hidden>
    <canvas id="flightCanvas" aria-label="Flying course. Tap to flap." tabindex="0"></canvas>
    <header class="flight-hud"><button id="leaveFlight" aria-label="Back to Lyman Lakes">← Lakes</button><div><small>FLAPPY ANGLER</small><strong id="flightScore">0</strong></div><button id="pauseFlight" aria-label="Pause flying game">Ⅱ</button></header>
    <div class="flight-message" id="flightMessage"><h2 id="flightMessageTitle">A FLYING START</h2><p id="flightMessageText">Tap to flap. Fly between the wooden posts.</p><small id="flightBest">BEST · 0</small><button id="flightStart">LET’S FLY →</button></div>
    <button class="flight-flap" id="flightFlap">FLAP ↑</button>
    <p class="flight-status" id="flightStatus" role="status" aria-live="polite"></p>
  </section>`);
const walkStick = $('#walkStick'), walkKnob = $('#walkKnob');
const flightCanvas = $('#flightCanvas'), flightPaint = flightCanvas.getContext('2d');
let pregameLastFrame = null;
let flightInert = [];

function canWalkPregame() {
  return roundState.phase === 'home' && flightState.phase === 'closed' && !document.hidden
    && !modal.classList.contains('open') && $('#characterPicker').classList.contains('hidden')
    && !!characterFrames[0]?.[selectedFisherman] && !!fishingSceneView;
}
function stopPregameWalk() {
  const pointer = walkInput.pointer;
  walkInput.pointer = null;
  walkInput.x = walkInput.y = 0;
  walkInput.keys.clear();
  pregameAngler.walking = false;
  walkKnob.style.transform = 'translate(0, 0)';
  if (pointer !== null && walkStick.hasPointerCapture(pointer)) walkStick.releasePointerCapture(pointer);
}
function resetPregameWalk() {
  stopPregameWalk();
  Object.assign(pregameAngler, { x: 950, y: 480, facing: 1, walking: false });
  document.body.classList.remove('exploring');
}
function moveWalkStick(event) {
  const dx = event.clientX - walkInput.center.x, dy = event.clientY - walkInput.center.y;
  const distance = Math.hypot(dx, dy), radius = 31, scale = Math.min(1, radius / (distance || 1));
  const x = dx * scale, y = dy * scale;
  walkKnob.style.transform = `translate(${x}px, ${y}px)`;
  const strength = Math.max(0, (Math.min(1, distance / radius) - .12) / .88);
  walkInput.x = distance ? dx / distance * strength : 0;
  walkInput.y = distance ? dy / distance * strength : 0;
}
walkStick.addEventListener('pointerdown', event => {
  if (!canWalkPregame() || walkInput.pointer !== null || event.button !== 0) return;
  event.preventDefault();
  const box = walkStick.getBoundingClientRect();
  walkInput.center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  walkInput.pointer = event.pointerId;
  walkStick.setPointerCapture(event.pointerId);
  document.body.classList.add('exploring');
  moveWalkStick(event);
});
walkStick.addEventListener('pointermove', event => {
  if (event.pointerId === walkInput.pointer) moveWalkStick(event);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
  walkStick.addEventListener(type, event => { if (event.pointerId === walkInput.pointer) stopPregameWalk(); });
$('#walkMenu').onclick = () => {
  stopPregameWalk();
  document.body.classList.remove('exploring');
  $('#begin').focus();
};

function walkPregame(dt) {
  if (!canWalkPregame()) { stopPregameWalk(); return; }
  let x = walkInput.x, y = walkInput.y;
  if (walkInput.keys.size) {
    x = Number(walkInput.keys.has('ArrowRight') || walkInput.keys.has('d')) - Number(walkInput.keys.has('ArrowLeft') || walkInput.keys.has('a'));
    y = Number(walkInput.keys.has('ArrowDown') || walkInput.keys.has('s')) - Number(walkInput.keys.has('ArrowUp') || walkInput.keys.has('w'));
    const length = Math.hypot(x, y) || 1; x /= length; y /= length;
  }
  pregameAngler.walking = Math.hypot(x, y) > .01;
  if (!pregameAngler.walking) return;
  const view = fishingSceneView;
  const step = 95 * dt / view.scale;
  // Follow the sloping deck onto either bank; vertical movement stays on land.
  const deckAt = x => 480 + Math.max(0, Math.abs(x - 1024) - 380) * .42;
  const previousDeck = deckAt(pregameAngler.x);
  pregameAngler.x = Math.max(-view.ox / view.scale + 80, pregameAngler.x + x * step);
  const deck = deckAt(pregameAngler.x);
  pregameAngler.y += deck - previousDeck + y * step;
  const onBridge = pregameAngler.x >= 380 && pregameAngler.x <= 1740;
  pregameAngler.y = Math.max(onBridge ? deck - 32 : 320, Math.min(onBridge ? deck + 32 : 900, pregameAngler.y));
  if (Math.abs(x) > .01) pregameAngler.facing = x < 0 ? -1 : 1;
  const sprite = characterFrames[0][selectedFisherman], halfWidth = 103 * sprite.width / sprite.height;
  if (x > 0 && view.ox + (pregameAngler.x - halfWidth) * view.scale > view.width) openFlightGame();
}

function flightHead(index) {
  if (flightHeads[index]) return flightHeads[index];
  const sprite = characterFrames[0]?.[index];
  if (!sprite) return null;
  const head = document.createElement('canvas');
  head.width = Math.round(sprite.width * .75);
  head.height = Math.round(sprite.height * .4);
  head.getContext('2d').drawImage(sprite, Math.round(sprite.width * .05), 0, head.width, head.height, 0, 0, head.width, head.height);
  return flightHeads[index] = head;
}
function updateFlightUI() {
  const over = flightState.phase === 'over', ready = flightState.phase === 'ready', paused = flightState.paused;
  $('#flightMessage').hidden = !over && !ready && !paused;
  $('#flightMessageTitle').textContent = paused ? 'TAKE A BREATHER' : over ? 'ONE MORE FLIGHT?' : 'A FLYING START';
  $('#flightMessageText').textContent = paused ? 'Your flight is paused.' : over ? `${flightState.score} ${flightState.score === 1 ? 'post' : 'posts'} passed. Give it another go.` : 'Tap to flap. Fly between the wooden posts.';
  $('#flightStart').textContent = paused ? 'RESUME →' : over ? 'TRY AGAIN →' : 'LET’S FLY →';
  $('#flightBest').textContent = 'BEST · ' + flightState.best;
  $('#flightScore').textContent = flightState.score;
  $('#pauseFlight').disabled = flightState.phase !== 'playing';
  $('#pauseFlight').textContent = paused ? '▶' : 'Ⅱ';
  $('#pauseFlight').setAttribute('aria-label', paused ? 'Resume flying game' : 'Pause flying game');
  $('#flightFlap').textContent = paused ? 'RESUME →' : over ? 'TRY AGAIN ↑' : 'FLAP ↑';
}
function resizeFlightCanvas() {
  const width = fishingViewport.clientWidth, height = fishingViewport.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  flightCanvas.width = Math.round(width * dpr); flightCanvas.height = Math.round(height * dpr);
  const previous = flightState.width;
  flightState.width = 640 * width / height;
  if (flightState.bird) flightState.bird.x = flightState.width * .28;
  if (previous) for (const pipe of flightState.pipes) pipe.x += (flightState.width - previous) * .28;
}
function resetFlight() {
  flightState.phase = 'ready'; flightState.paused = false; flightState.score = 0;
  flightState.bird = { x: flightState.width * .28, y: 300, velocity: 0 };
  flightState.pipes = []; flightState.distance = 0;
  flightState.nextPipe = flightState.width + 100;
  $('#flightStatus').textContent = '';
  updateFlightUI();
}
function openFlightGame() {
  if (roundState.phase !== 'home' || flightState.phase !== 'closed') return;
  stopPregameWalk();
  flightState.character = selectedFisherman;
  roundState.phase = 'flappy';
  document.body.classList.add('flappy-open');
  $('#flightGame').hidden = false;
  flightInert = Array.from(fishingViewport.children).filter(el => el.id !== 'flightGame' && el.id !== 'crtEffect').map(el => [el, el.inert]);
  flightInert.forEach(([el]) => el.inert = true);
  resizeFlightCanvas(); resetFlight();
  $('#flightStart').focus({ preventScroll: true });
}
function leaveFlightGame() {
  flightState.phase = 'closed'; flightState.paused = false; flightState.pipes = [];
  $('#flightGame').hidden = true;
  flightInert.forEach(([el, inert]) => el.inert = inert); flightInert = [];
  document.body.classList.remove('flappy-open');
  roundState.phase = 'home'; resetPregameWalk();
  $('#begin').focus({ preventScroll: true });
}
function flapAngler() {
  if (flightState.phase === 'closed') return;
  if (flightState.paused) { flightState.paused = false; updateFlightUI(); flightCanvas.focus({ preventScroll: true }); return; }
  if (flightState.phase === 'over') resetFlight();
  if (flightState.phase === 'ready') { flightState.phase = 'playing'; updateFlightUI(); flightCanvas.focus({ preventScroll: true }); }
  flightState.bird.velocity = -350;
  waterNote(390, .06, .008);
}
function pauseFlightGame() {
  if (flightState.phase !== 'playing') return;
  flightState.paused = !flightState.paused;
  updateFlightUI();
}
function crashFlight() {
  flightState.phase = 'over';
  if (flightState.score > flightState.best) {
    flightState.best = flightState.score;
    try { localStorage.setItem('carillion-flight-best', String(flightState.best)); } catch {}
  }
  $('#flightStatus').textContent = `Flight over. ${flightState.score} posts passed.`;
  updateFlightUI(); fx('miss');
  $('#flightStart').focus({ preventScroll: true });
}
function advanceFlight(dt) {
  if (flightState.phase !== 'playing' || flightState.paused || document.hidden) return;
  const bird = flightState.bird, radius = 18, speed = 140;
  bird.velocity += 1050 * dt; bird.y += bird.velocity * dt;
  flightState.distance += speed * dt;
  flightState.nextPipe -= speed * dt;
  if (flightState.nextPipe < flightState.width + 70) {
    const center = 220 + Math.random() * 200;
    flightState.pipes.push({ x: flightState.nextPipe, top: center - 105, bottom: center + 105, passed: false });
    flightState.nextPipe += 245;
  }
  for (const pipe of flightState.pipes) {
    pipe.x -= speed * dt;
    const overlap = bird.x + radius > pipe.x && bird.x - radius < pipe.x + 62;
    if (overlap && (bird.y - radius < pipe.top || bird.y + radius > pipe.bottom)) { crashFlight(); return; }
    if (!pipe.passed && pipe.x + 62 < bird.x - radius) {
      pipe.passed = true; flightState.score++; $('#flightScore').textContent = flightState.score;
      waterNote(620, .1, .012);
    }
  }
  flightState.pipes = flightState.pipes.filter(pipe => pipe.x > -80);
  if (bird.y - radius < 88 || bird.y + radius > 614) crashFlight();
}
function drawFlight() {
  const ctx = flightPaint, width = flightState.width, height = 640;
  ctx.setTransform(flightCanvas.width / width, 0, 0, flightCanvas.height / height, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#87bcb0'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#b6d9bc';
  for (let i = 0; i < 5; i++) {
    const x = (i * 177 - (reducedFishingMotion ? 0 : flightState.distance * .1)) % (width + 170);
    ctx.fillRect(x, 160 + i % 3 * 30, 58, 14); ctx.fillRect(x + 12, 148 + i % 3 * 30, 32, 15);
  }
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = layer ? '#376e50' : '#589072';
    const offset = reducedFishingMotion ? 0 : flightState.distance * (.06 + layer * .03) % 72;
    for (let x = -72; x < width + 72; x += 72) {
      const top = 402 + layer * 63 + Math.sin(x * .08) * 22;
      ctx.fillRect(x - offset, top, 72, height - top);
      ctx.fillRect(x + 12 - offset, top - 22, 46, 24);
      ctx.fillRect(x + 24 - offset, top - 36, 22, 16);
    }
  }
  ctx.fillStyle = '#1a686c'; ctx.fillRect(0, 555, width, 68);
  ctx.fillStyle = '#7caaa0';
  for (let i = 0; i < 12; i++) ctx.fillRect((i * 89 - flightState.distance * .24) % (width + 60), 566 + i % 4 * 12, 28, 2);
  for (const pipe of flightState.pipes) {
    for (const [y, h] of [[0, pipe.top], [pipe.bottom, height - pipe.bottom]]) {
      const x = Math.round(pipe.x);
      ctx.fillStyle = '#493a2c'; ctx.fillRect(x - 3, y, 68, h);
      ctx.fillStyle = '#a47749'; ctx.fillRect(x, y, 62, h);
      ctx.fillStyle = '#d5ad6b'; ctx.fillRect(x + 5, y, 10, h);
      ctx.fillStyle = '#705039'; ctx.fillRect(x + 47, y, 10, h);
      for (let grain = y + 24; grain < y + h; grain += 34) ctx.fillRect(x + 20, grain, 24, 3);
      const cap = y ? y : y + h - 18;
      ctx.fillStyle = '#493a2c'; ctx.fillRect(x - 8, cap - 2, 78, 22);
      ctx.fillStyle = '#c79a5b'; ctx.fillRect(x - 5, cap + 1, 72, 14);
      ctx.fillStyle = '#ebc785'; ctx.fillRect(x - 5, cap + 1, 72, 4);
    }
  }
  ctx.fillStyle = '#dbbf80'; ctx.fillRect(0, 621, width, 19);
  ctx.fillStyle = '#608848'; ctx.fillRect(0, 617, width, 6);
  const head = flightHead(flightState.character), bird = flightState.bird;
  if (head && bird) {
    ctx.save(); ctx.translate(bird.x, bird.y);
    ctx.rotate(flightState.phase === 'over' ? .9 : Math.max(-.35, Math.min(.7, bird.velocity / 650)));
    const w = 48 * head.width / head.height;
    ctx.drawImage(head, -w / 2, -24, w, 48); ctx.restore();
  }
}
$('#leaveFlight').onclick = leaveFlightGame;
$('#pauseFlight').onclick = pauseFlightGame;
$('#flightStart').onclick = flapAngler;
$('#flightFlap').onclick = flapAngler;
flightCanvas.addEventListener('pointerdown', event => { event.preventDefault(); flapAngler(); });
document.addEventListener('keydown', event => {
  if (flightState.phase !== 'closed') {
    if (event.key === 'Escape') { event.preventDefault(); leaveFlightGame(); return; }
    if (event.key === 'Tab') {
      const buttons = Array.from($('#flightGame').querySelectorAll('button, canvas')).filter(el => !el.disabled && el.getClientRects().length);
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    if ([' ', 'ArrowUp', 'w'].includes(event.key) && !event.repeat && (event.key !== ' ' || !event.target.closest('button'))) {
      event.preventDefault(); flapAngler();
    }
    return;
  }
  if (!canWalkPregame() || event.target.closest('input, select, textarea')) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(event.key)) {
    event.preventDefault(); walkInput.keys.add(event.key); document.body.classList.add('exploring');
  }
});
document.addEventListener('keyup', event => { walkInput.keys.delete(event.key); });
function suspendPregamePlay() {
  stopPregameWalk();
  if (flightState.phase === 'playing' && !flightState.paused) pauseFlightGame();
}
window.addEventListener('blur', suspendPregamePlay);
document.addEventListener('visibilitychange', () => { if (document.hidden) suspendPregamePlay(); });
window.addEventListener('resize', () => {
  if (flightState.phase !== 'closed') { resizeFlightCanvas(); if (flightState.phase === 'playing' && !flightState.paused) pauseFlightGame(); }
  else resetPregameWalk();
});
walkSurface.addEventListener('change', stopPregameWalk);
function animatePregamePlay(now) {
  requestAnimationFrame(animatePregamePlay);
  const dt = pregameLastFrame === null ? 0 : Math.min(.035, Math.max(0, (now - pregameLastFrame) / 1000));
  pregameLastFrame = now;
  if (flightState.phase !== 'closed') { advanceFlight(dt); drawFlight(); }
  else walkPregame(dt);
}
requestAnimationFrame(animatePregamePlay);
