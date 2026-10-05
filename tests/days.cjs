const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({ window: {} });
for (const file of ['questions-days.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
const days = context.window.DIVE_DAYS;
const manifestIds = fs.readdirSync(path.join(__dirname, '..', 'question-packs'))
  .filter(id => /^\d{4}-\d{2}-\d{2}$/.test(id)).sort();
assert.deepEqual(Array.from(days, day => day.id), manifestIds);
assert.equal(context.window.DIVE_QUESTIONS, days.at(-1).questions);
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
for (const day of days) {
  assert.equal(day.questions.length, 7);
  for (const question of day.questions) {
    const owners = new Map();
    assert(!question.source || question.source.startsWith('https://'));
    for (const answer of question.answers) {
      assert([10, 15, 30, 60, 85, 100].includes(answer.points));
      assert(answer.forms.length);
      for (const form of answer.forms) {
        const key = normalize(form);
        assert(key);
        assert(!owners.has(key) || owners.get(key) === answer, `Ambiguous answer: ${form}`);
        owners.set(key, answer);
      }
    }
  }
}
for (const [index, form] of [[0, 'Puma'], [1, 'Tom Riddle'], [2, 'Fudge'], [3, 'Cumulus'], [4, 'JSN'], [5, 'John Paul 2'], [6, 'Golden State']]) {
  assert(days[1].questions[index].answers.some(answer => answer.forms.some(value => normalize(value) === normalize(form))), form);
}
console.log(`${days.length} daily sets, answer tiers, aliases and latest default day passed.`);
