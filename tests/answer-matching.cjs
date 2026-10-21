const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const elements = new Map();
const element = selector => {
  if (!elements.has(selector)) elements.set(selector, {
    value: '', textContent: '', classList: { add() {}, remove() {} }, getContext: () => ({})
  });
  return elements.get(selector);
};
const context = vm.createContext({
  window: {}, document: { querySelector: element },
  localStorage: { getItem: () => null }, Audio: function () {},
  questions: [], round: 0, used: new Set(),
  roundState: { phase: 'question', record: { catches: [], points: 0, stolenAnswers: new Set() } },
  shoreCatches: [], caughtFish: [], score: 0, depthScore: 0,
  tickRoundClock() {}, showQuestionInput() {}, pauseRoundClock() {}, updateFishingHUD() {},
  castFishingLine(callback) { context.casts++; callback(); },
  reelCatch(catchData) { context.lastCatch = catchData; },
  rejectInput() { context.rejected = true; }, casts: 0
});
vm.runInContext(fs.readFileSync(path.join(root, 'game-core.js'), 'utf8'), context);
// Exercise the real submission, catch identity and theft functions without animation dependencies.
const gameplay = fs.readFileSync(path.join(root, 'fishing-game.js'), 'utf8');
for (const name of ['submitFishingAnswer', 'resolveFishingGuess', 'rejectUsedFishingAnswer', 'removeLoonCatch']) {
  const start = gameplay.indexOf(`function ${name}(`);
  assert(start >= 0);
  const end = gameplay.indexOf('\n}', start) + 2;
  vm.runInContext(gameplay.slice(start, end), context);
}
vm.runInContext(fs.readFileSync(process.env.TEST_QUESTIONS || path.join(root, 'questions-days.js'), 'utf8'), context);
const allDays = context.window.DIVE_DAYS;
const question = allDays.flatMap(day => Array.from(day.questions)).find(q => q.answerFormat === 'programming-language');
assert(question, 'Programming question must be present');
context.questions = [question];
const exact = (q, input) => q.answers.find(a => a.forms.some(f => context.normalizeAnswer(f, q) === context.normalizeAnswer(input, q)));
for (const day of allDays) for (const q of day.questions) {
  const owners = new Map();
  for (const answer of q.answers) for (const form of answer.forms) {
    const key = context.normalizeAnswer(form, q);
    assert(key);
    assert(!owners.has(key) || owners.get(key) === answer, `Collision: ${form}`);
    owners.set(key, answer);
    assert.equal(exact(q, form), answer, `Incorrect owner: ${form}`);
  }
}
for (const [input, canonical] of [
  ['C', 'C'], ['c + +', 'C++'], ['C plus plus', 'C++'], ['C#', 'C#'], ['C sharp', 'C#'],
  ['C--', 'C--'], ['C*', 'C*'], ['F#', 'F#'], ['F*', 'F*'],
  ['Go', 'Go'], ['Go!', 'Go!'], ['Java', 'Java'], ['JS', 'JavaScript'],
  ['Swift', 'Swift'], ['Swift (parallel scripting)', 'Swift (parallel scripting)'],
  ['ZPL', 'Zebra Programming Language'], ['ZPL (parallel language)', 'ZPL (parallel language)']
]) {
  assert.equal(exact(question, input)?.forms[0], canonical, input);
}
assert.equal(context.normalizeAnswer('C++'), 'c', 'Legacy normalization must stay unchanged');
for (const input of ['C', 'C++', 'C#', 'C--', 'C*', 'Go', 'Go!']) {
  element('#answerInput').value = input;
  context.submitFishingAnswer({ preventDefault() {} });
  assert.equal(context.lastCatch.name, input);
}
assert.equal(context.used.size, 7, 'Symbolic catches must have separate identities');
const casts = context.casts;
element('#answerInput').value = 'C plus plus';
context.submitFishingAnswer({ preventDefault() {} });
assert.equal(context.casts, casts, 'A caught language alias must not cast again');
const fish = { kind: 'fish', name: 'C#', points: 10 };
context.removeLoonCatch(fish);
assert(context.roundState.record.stolenAnswers.has(context.normalizeAnswer('C#', question)));
assert(!context.roundState.record.stolenAnswers.has(context.normalizeAnswer('C', question)));
assert(!context.roundState.record.stolenAnswers.has(context.normalizeAnswer('C++', question)));
assert.equal(context.softCandidate(question, context.normalizeAnswer('Pythn', question))?.answer.forms[0], 'Python');
assert.equal(context.softCandidate(question, context.normalizeAnswer('Javascr', question))?.answer.forms[0], 'JavaScript');
console.log('All exact aliases, symbol-sensitive submissions, duplicate catches, theft identities and representative suggestions passed.');
