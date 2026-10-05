// Shared DOM, sound, answer matching, and answer-bank presentation.
const $ = selector => document.querySelector(selector);
const modal = $('#modal'), content = $('#dialogContent');
const scene = $('#scene'), paint = scene.getContext('2d', { alpha: false });
const scoreTiers = { 10: 'NEW STUDENT', 15: 'QUIRKY', 30: 'CUM LAUDE', 60: 'MAGNA CUM LAUDE', 85: 'SUMMA CUM LAUDE', 100: 'CARILLIONAIRE' };
function soundPreference() {
  try {
    return localStorage.getItem('carillion-sound') !== 'off';
  }
  catch {
    return true;
  }
}
function saveSoundPreference() {
  try {
    localStorage.setItem('carillion-sound', soundEnabled ? 'on' : 'off');
  }
  catch {
  }
}
let soundEnabled = soundPreference(), audioCtx = null;
function soundButton() {
  const b = $('#soundBtn');
  b.textContent = soundEnabled ? '🔊' : '🔇';
  b.title = soundEnabled ? 'Sound on' : 'Sound off';
  b.setAttribute('aria-label', soundEnabled ? 'Mute sound' : 'Enable sound');
  b.setAttribute('aria-pressed', String(soundEnabled));
  if (!soundEnabled) {
    stopSpeech();
    almaMater.pause();
  }
}
function normalizeAnswer(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function renderSteps() {
  const total = questions.length;
  $('#steps').innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < round ? 'done' : ''}"></i>`).join('');
  const label = `PROMPT ${Math.min(round + 1, total)} OF ${total}`;
  $('#stepLabel').textContent = label;
  $('#promptIndex').textContent = label;
}
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}
function clearInputHint() {
  $('#softFill').classList.add('hidden');
  $('#inputFeedback').classList.add('hidden');
}
function showSoftFill(typed, candidate) {
  candidate = { ...candidate, form: candidate.answer.forms[0] };
  const hint = $('#softFill'), answer = document.createElement('b'), detail = document.createElement('small');
  answer.textContent = '“' + candidate.form + '”';
  detail.textContent = 'submit again to confirm · or edit';
  hint.replaceChildren(document.createTextNode('“' + typed + '” → '), answer, detail);
  hint.classList.remove('hidden');
  $('#inputFeedback').classList.add('hidden');
  $('#answerInput').value = candidate.form;
  $('#answerInput').focus();
  $('#answerInput').setSelectionRange(candidate.form.length, candidate.form.length);
  fx('tap');
  delete hint.dataset.rank;
  clearTimeout(showSoftFill.timer);
  showSoftFill.timer = setTimeout(() => hint.classList.add('hidden'), 1800);
}
function rejectInput(typed) {
  $('#inputFeedback').textContent = '“' + typed + '”: no echo. try again';
  $('#inputFeedback').classList.remove('hidden');
  $('#softFill').classList.add('hidden');
  fx('miss');
}
function soundContext() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C)
      return null;
    audioCtx ??= new C();
    if (audioCtx.state === 'suspended')
      audioCtx.resume();
    return audioCtx;
  }
  catch {
    return null;
  }
}
function waterNote(frequency, duration, volume, when = 0, endFrequency = frequency) {
  if (!soundEnabled)
    return;
  const ctx = soundContext();
  if (!ctx)
    return;
  const start = ctx.currentTime + when, osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, start);
  osc.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  filter.type = 'lowpass';
  filter.frequency.value = 2200;
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .018);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + .04);
}
function bubbleWash(duration = .28, volume = .012, when = 0) {
  if (!soundEnabled)
    return;
  const ctx = soundContext();
  if (!ctx)
    return;
  const start = ctx.currentTime + when, buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), data = buffer.getChannelData(0), source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = 850;
  filter.Q.value = 1.5;
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + duration + .02);
}
function fx(name, points = 0) {
  if (!soundEnabled)
    return;
  if (name === 'tap') {
    waterNote(540, .07, .012, 0, 470);
  }
  else if (name === 'dive') {
    bubbleWash(.52, .022);
    waterNote(360, .6, .018, 0, 95);
    waterNote(175, .52, .015, .09, 70);
  }
  else if (name === 'answer') {
    const lift = points >= 60 ? 1.35 : 1;
    bubbleWash(.24, .012);
    waterNote(310 + points * 2, .22, .024);
    waterNote((470 + points * 3) * lift, .33, .02, .1);
    if (points >= 30)
      waterNote((660 + points * 4) * lift, .46, .016, .22);
  }
  else if (name === 'miss') {
    bubbleWash(.18, .014);
    waterNote(225, .25, .017, 0, 120);
  }
  else if (name === 'descend') {
    bubbleWash(.38, .018);
    waterNote(300, .48, .016, 0, 120);
  }
  else if (name === 'surface') {
    bubbleWash(.42, .018);
    waterNote(294, .28, .018);
    waterNote(440, .35, .018, .12);
    waterNote(659, .5, .016, .26);
  }
}
function rankClass(points) {
  return points ? 'rank-' + points : 'rank-miss';
}
function numberedAmendment(typed) {
  const topic = typed.replace(/^the\s+/, '').replace(/^amendment\s*/, '')
    .replace(/\s*amendment$/, '').replace(/^(?:number|no)\s*/, '');
  return /^\d+(?:st|nd|rd|th)?$/.test(topic) || /^[ivx]+$/.test(topic)
    || /^(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty (?:first|second|third|fourth|fifth|sixth|seventh))$/.test(topic);
}
function softCandidate(q, typed) {
  if (q.answerFormat === 'amendment-topic' && numberedAmendment(typed)) return null;
  const genericTokens = new Set(['sir', 'saint', 'st', 'the', 'of', 'and', 'college', 'university', 'hall', 'county', 'junior', 'jr', 'iii']);
  if (typed.length < 3 || genericTokens.has(typed))
    return null;
  const candidates = [];
  q.answers.forEach(answer => answer.forms.forEach(form => {
    const clean = normalizeAnswer(form), words = clean.split(' ');
    let distance = Infinity;
    if (typed.length >= 4 && clean.startsWith(typed))
      distance = .25 + (clean.length - typed.length) / 100;
    for (const word of words) {
      if (genericTokens.has(word))
        continue;
      if (word === typed)
        distance = Math.min(distance, .1);
      const edits = editDistance(typed, word);
      if (typed.length >= 5 && word.length >= 5 && edits === 1)
        distance = Math.min(distance, 1.2);
    }
    if (Number.isFinite(distance))
      candidates.push({ answer, form, distance });
  }));
  return candidates.length ? candidates.sort((a, b) => a.distance - b.distance || a.form.length - b.form.length)[0] : null;
}
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function legacyAnswerFact(questionIndex, answer) {
  const facts = {
    'Carleton College': 'Carleton was a charter member when the MIAC formed in 1920 and returned to the conference in 1983.', 'St. Olaf College': 'Carleton and St. Olaf are Northfield rivals; their football teams compete annually for the Goat Trophy.', 'Macalester College': 'Carleton and Macalester play football for the Book of Knowledge, a traveling trophy started in 1998.', 'Augsburg University': 'Augsburg joined Carleton in the MIAC in 1924, four years after the conference was founded.', 'Bethel University': 'Bethel joined the MIAC in 1977, later becoming one of Carleton’s conference opponents.', 'Gustavus Adolphus College': 'Gustavus and Carleton were charter members of the MIAC in 1920.', 'Hamline University': 'Hamline and Carleton were charter members of the MIAC in 1920.', 'Concordia College': 'Concordia joined Carleton’s MIAC in 1921, the conference’s first new member.', 'College of Saint Benedict': 'The College of Saint Benedict joined Carleton in the MIAC in 1985.', 'St. Catherine University': 'St. Catherine entered the MIAC when the conference began women’s competition in 1982.', 'Saint John’s University': 'Saint John’s and Carleton were charter members of the MIAC in 1920.', 'Saint Mary’s University of Minnesota': 'Saint Mary’s joined Carleton’s MIAC in 1926.', 'The College of St. Scholastica': 'St. Scholastica became a Carleton conference opponent when it joined the MIAC in 2021.', 'Gould Library': 'The current library building opened in 1956 and was renamed for Laurence McKinley Gould in 1996.', 'Anderson Hall': 'Evelyn M. Anderson Hall opened in 2019 and honors research scientist Evelyn Anderson, class of 1921.', 'Olin Hall': 'Olin Hall of Science opened in 1961 for physics and psychology offices, classrooms, and laboratories.', 'Weitz Center for Creativity': 'The Weitz Center opened in 2011 after Carleton repurposed Northfield’s former middle school.', 'Boliou Hall': 'Boliou Memorial Art Hall opened in 1949; its major expansion and remodeling finished in 1995.', 'Goodsell Observatory': 'Goodsell Observatory dates to 1887 and is one of Carleton’s historic astronomy landmarks.', 'Scoville Hall': 'Scoville served as Carleton’s library for 60 years before Gould Library opened.', 'Skinner Memorial Chapel': 'Skinner Memorial Chapel was completed in 1916 and is listed on the National Register of Historic Places.', 'Nourse Hall': 'Nourse Hall was built in 1917.', 'Leighton Hall': 'Leighton Hall was completed and dedicated in 1921.', 'Mudd Hall of Science': 'Seeley G. Mudd Hall of Science opened in 1975.', 'Center for Mathematics and Computing': 'The Center for Mathematics and Computing was completed in 1993.', 'Hulings Hall': 'Hulings Hall was completed in 1995.', 'West Gymnasium': 'West Gym opened in 1964 with courts, a swimming pool, and athletics facilities.', 'Cowling Gymnasium': 'Elizabeth Cowling Recreation Center opened in 1965.', 'Thorstein Veblen': 'Veblen wrote The Theory of the Leisure Class, published in 1899.', 'Pierce Butler': 'Pierce Butler served on the U.S. Supreme Court from 1923 to 1939.', 'Melvin Laird': 'Melvin Laird served as U.S. Secretary of Defense from 1969 to 1973.', 'Jimmy Chin': 'Jimmy Chin co-directed the Academy Award-winning documentary Free Solo.', 'Jonathan Capehart': 'Jonathan Capehart won the 1999 Pulitzer Prize for Editorial Writing.', 'Christopher Kratt': 'Chris Kratt co-created and hosts Wild Kratts and Zoboomafoo.', 'Kai Bird': 'Kai Bird is a Pulitzer Prize-winning biographer and journalist.', 'T. J. Stiles': 'T. J. Stiles has won two Pulitzer Prizes, for biography and history.', 'Walter Alvarez': 'Walter Alvarez helped develop the asteroid-impact theory for the Cretaceous–Paleogene extinction.', 'Anthony Downs': 'Anthony Downs wrote An Economic Theory of Democracy.', 'John F. Harris': 'John F. Harris is the editor-in-chief of Politico.', 'Naomi Kritzer': 'Naomi Kritzer is a Locus and Hugo Award-winning speculative-fiction author.', 'Peter Tork': 'Peter Tork studied at Carleton from 1960 to 1963 before joining the Monkees.', 'Laura Veirs': 'Laura Veirs is a singer-songwriter and part of the case/lang/veirs project.', 'Kao Kalia Yang': 'Kao Kalia Yang wrote the memoir The Latehomecomer.', 'Patricia C. Wrede': 'Patricia C. Wrede wrote the Enchanted Forest Chronicles.', 'Maya Dusenbery': 'Maya Dusenbery was executive director of the feminist blog Feministing.', 'Jack El-Hai': 'Jack El-Hai is a writer and journalist.', 'Michael Gartner': 'Michael Gartner led NBC News and won a Pulitzer Prize for Editorial Writing.', 'Helene Wecker': 'Helene Wecker wrote the historical-fantasy novel The Golem and the Jinni.', 'Karen Tei Yamashita': 'Karen Tei Yamashita wrote I Hotel and Tropic of Orange.', 'Rush Holt Jr.': 'Rush Holt represented New Jersey in the U.S. House of Representatives.', 'Jane Elizabeth Hodgson': 'Jane Hodgson was a pioneer in women’s reproductive health and abortion-rights advocacy.', 'Sir Paul McCartney': 'Paul McCartney was knighted in 1997 for services to music.', 'Computer Science': 'Computer Science is one of Carleton’s most popular undergraduate majors.', 'Jaxon Smith-Njigba': 'Jaxon Smith-Njigba was selected in the first round of the 2023 NFL Draft.'
  };
  const overrides = { "Saint John's University": 'Saint John’s and Carleton were charter members of the MIAC in 1920.', "Saint Mary's University of Minnesota": 'Saint Mary’s joined Carleton’s MIAC in 1926.' };
  const name = answer.forms[0], fact = overrides[name] || facts[name] || '';
  return questionIndex === 3 && fact ? 'Carleton alum ' + name + '. ' + fact : fact;
}
function legacyRoundTidbit(index) {
  return index === 4 ? 'This round nods to Carleton’s athletic teams, the Knights.' : index === 6 ? 'Tristan Belzer ’21 is a Seahawks fan.' : '';
}
function renderAnswerBank() {
  clearInterval(timer);
  document.body.classList.remove('playing');
  $('#gameUI').classList.add('hidden');
  $('#summaryScore').textContent = score;
  $('#catchList').innerHTML = questions.map((q, i) => {
    const r = roundLog[i] || { typed: '', points: 0, depthAfter: 0 }, bank = [...q.answers].sort((a, b) => b.points - a.points), tidbit = roundTidbit(i);
    return `<details class="catch-row"><summary><span class="catch-number">${String(i + 1).padStart(2, '0')}</span><span class="catch-question">${escapeHTML(q.prompt)}</span><span class="catch-answer">${r.typed ? escapeHTML(r.typed) : 'No answer'}</span><span class="catch-points">+${r.points}</span></summary><div class="catch-body">${tidbit ? `<small class="round-tidbit">${escapeHTML(tidbit)}</small>` : ''}<div class="answer-bank">${bank.map(a => {
      const blurb = a.note || postAnswerFact(i, a);
      return `<div class="bank-answer"><span>${escapeHTML(a.forms[0])}</span><em>${a.points} · ${scoreTiers[a.points]}</em>${blurb ? `<small>${escapeHTML(blurb)}</small>` : ''}</div>`;
    }).join('')}</div>${q.sourceNote ? `<small class="source-note">${escapeHTML(q.sourceNote)}</small>` : ''}${q.source ? `<small class="source-note"><a href="${escapeHTML(q.source)}" target="_blank" rel="noreferrer">Source</a></small>` : ''}</div></details>`;
  }).join('');
  $('#summaryScreen').classList.remove('hidden');
  $('#summaryScreen').scrollTop = 0;
  $('.bearing').innerHTML = '<span><b>10 PTS</b>New Student</span><span><b>15 PTS</b>Quirky</span><span><b>30 PTS</b>Cum Laude</span><span><b>60 PTS</b>Magna Cum Laude</span><span><b>85 PTS</b>Summa Cum Laude</span><span><b>100 PTS</b>Carillionaire</span>';
  Array.from($('#catchList').children).forEach((detail, questionIndex) => {
    const answers = [...questions[questionIndex].answers].sort((a, b) => b.points - a.points);
    detail.querySelectorAll('.bank-answer').forEach((row, index) => row.dataset.rank = rankClass(answers[index].points));
    const row = roundLog[questionIndex];
    const point = detail.querySelector('.catch-points');
    if (point)
      point.dataset.rank = rankClass(row?.points || 0);
  });
  $('.bearing').querySelectorAll('span').forEach((span, index) => span.dataset.rank = rankClass([10, 15, 30, 60, 85, 100][index]));
}
const almaMater = new Audio('assets/carleton-alma-mater.mp3');
almaMater.preload = 'auto';
almaMater.volume = .22;
