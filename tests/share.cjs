const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'fishing-game.js'), 'utf8');
const shareFunction = source.slice(source.indexOf('function catchShareText('), source.indexOf('function copyCatchFallback('));
const context = vm.createContext({
  matchDay: { id: '2026-09-29', label: '29 Sept 2026' },
  modeLabel: () => 'Multi-cast',
  signedPoints: points => `+${points}`,
  score: 310,
  questions: Array.from({ length: 7 }, (_, i) => ({ prompt: `Question ${i + 1}` })),
  roundLog: [10, 10, 30, 15, 85, 60, 100].map(points => ({ catches: [{ points, name: 'Secret answer' }] }))
});
vm.runInContext(shareFunction, context);
assert.equal(context.catchShareText(), 'Carillion 29 Sep 2026\n🥏🥏🎓😛🧬🧠🤯\n310 pts');
context.roundLog[0].catches.push({ points: 100, name: 'Rarer secret' });
assert(context.catchShareText().split('\n')[1].startsWith('🤯'));
assert(!context.catchShareText().includes('Secret'));
assert(context.catchShareText(true).includes('Secret answer'));
assert(context.catchShareText(true).includes('ANSWERS (SPOILERS!)'));
for (const [kind, emoji] of [['boot', '🥾'], ['skeleton', '🦴'], ['bottle', '🍾']]) {
  context.roundLog[0] = { catches: [], loot: { kind } };
  assert(context.catchShareText().split('\n')[1].startsWith(emoji));
}
context.score = -30;
assert(context.catchShareText().endsWith('-30 pts'));
console.log('Exact share format, all rarity emojis, best catches, loot and spoilers passed.');
