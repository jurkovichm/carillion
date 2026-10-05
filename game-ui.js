// Shared settings, modal, and companion interactions.
// Adjustable CRT finish applies to scenery and interface without intercepting input.
let crtStrength = 25;
try {
  const saved = localStorage.getItem('carillion-crt-strength');
  if (saved !== null && Number.isFinite(Number(saved))) crtStrength = Number(saved);
} catch {}
function setCrtStrength(value, persist = true) {
  crtStrength = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const effect = $('#crtEffect');
  effect.style.setProperty('--crt-strength', crtStrength / 100);
  effect.hidden = crtStrength === 0;
  const label = crtStrength ? `${crtStrength}%` : 'Off';
  const slider = $('#crtStrength'), output = $('#crtValue');
  if (slider) { slider.value = crtStrength; slider.setAttribute('aria-valuetext', label); }
  if (output) output.textContent = label;
  if (persist) {
    try { localStorage.setItem('carillion-crt-strength', String(crtStrength)); } catch {}
  }
}
setCrtStrength(crtStrength, false);

$('#modal').onclick = e => {
  if (e.target === modal)
    close();
};
document.addEventListener('click', e => {
  const m = e.target.closest('[data-modal]');
  if (m) {
    const which = m.dataset.modal;
    show(which === 'settings' ? 'SETTINGS' : 'YOUR WARDROBE', which === 'settings' ? `<p>Sound effects <button class="action" id="toggleSound">${soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</button></p><p>Catch sounds, bottle narration, and the post-game song.</p>` : '<p>Schiller alt skins coming soon.</p><button class="action" id="wardrobeDone">BACK TO THE DIVE</button>');
    return;
  }
  const t = e.target.closest('[data-toast]');
  if (t) {
    e.preventDefault();
    const el = $('#toast');
    el.textContent = t.dataset.toast;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }
});
modal.addEventListener('click', e => {
  if (e.target.id === 'gotIt' || e.target.id === 'wardrobeDone')
    close();
  if (e.target.id === 'toggleSound') {
    soundEnabled = !soundEnabled;
    saveSoundPreference();
    soundButton();
    e.target.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
    fx('tap');
  }
});
$('#soundBtn').onclick = () => {
  soundEnabled = !soundEnabled;
  saveSoundPreference();
  soundButton();
  fx('tap');
};
const schillerCompanion = $('#schillerCompanion');
let schillerPoint = { x: innerWidth * .72, y: innerHeight * .66 }, schillerMoveTimer = null;
function moveSchiller(force = false) {
  if (!schillerCompanion)
    return;
  const margin = 16, w = schillerCompanion.offsetWidth || 48, h = schillerCompanion.offsetHeight || 58, landing = $('#depthLanding'), landingActive = landing && !landing.classList.contains('hidden'), questionActive = document.body.classList.contains('playing') && !$('.prompt-card').classList.contains('hidden') && !$('#answer-dock').classList.contains('hidden');
  if (questionActive && !force) {
    schillerCompanion.classList.remove('darting', 'looping', 'jetting');
    clearTimeout(schillerMoveTimer);
    schillerMoveTimer = setTimeout(() => moveSchiller(), 9000);
    return;
  }
  let candidates;
  if (landingActive) {
    const line = parseFloat(landing.style.getPropertyValue('--line-y')) || innerHeight * .48;
    candidates = [[innerWidth * .73, line - h - 14], [innerWidth * .2, line - h - 18]];
  }
  else {
    candidates = [[innerWidth * .08, innerHeight * .2], [innerWidth * .86, innerHeight * .2], [innerWidth * .07, innerHeight * .48], [innerWidth * .87, innerHeight * .48], [innerWidth * .13, innerHeight * .73], [innerWidth * .8, innerHeight * .74]];
  }
  const obstacles = [...document.querySelectorAll('.hud,.prompt-card:not(.hidden),.answer-result:not(.hidden),.soft-fill:not(.hidden),.answer-dock:not(.hidden),.descend-btn:not(.hidden),.modal.open .dialog,.summary-head')].filter(e => e.offsetParent !== null).map(e => {
    const r = e.getBoundingClientRect();
    return { x: r.left - 18, y: r.top - 18, r: r.right + 18, b: r.bottom + 18 };
  });
  const valid = candidates.map(([x, y]) => ({ x: Math.max(margin, Math.min(innerWidth - w - margin, x)), y: Math.max(margin, Math.min(innerHeight - h - margin, y)) })).filter(p => !obstacles.some(o => p.x + w > o.x && p.x < o.r && p.y + h > o.y && p.y < o.b));
  const pool = valid.length ? valid : candidates.map(([x, y]) => ({ x, y }));
  let target = pool[Math.floor(Math.random() * pool.length)];
  if (!force && Math.hypot(target.x - schillerPoint.x, target.y - schillerPoint.y) < 70)
    target = pool[(pool.indexOf(target) + 1) % pool.length] || target;
  schillerCompanion.style.setProperty('--schiller-facing', target.x < schillerPoint.x ? '-1' : '1');
  schillerCompanion.style.left = target.x + 'px';
  schillerCompanion.style.top = target.y + 'px';
  schillerPoint = target;
  schillerCompanion.classList.remove('darting', 'looping', 'jetting');
  const behavior = landingActive ? 'jetting' : ['', '', 'darting', 'looping'][Math.floor(Math.random() * 4)];
  if (behavior)
    schillerCompanion.classList.add(behavior);
  clearTimeout(schillerMoveTimer);
  schillerMoveTimer = setTimeout(() => {
    schillerCompanion.classList.remove('darting', 'looping', 'jetting');
    moveSchiller();
  }, landingActive ? 1900 : 6200);
}
requestAnimationFrame(() => moveSchiller(true));
addEventListener('resize', () => moveSchiller(true));
