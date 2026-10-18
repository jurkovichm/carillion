const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let stored = null, fail = false;
const context = vm.createContext({localStorage: {
  getItem: () => stored,
  setItem: (_, value) => { if (fail) throw Error('Storage unavailable'); stored = value; }
}});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../player-progress.js'), 'utf8'), context);
assert.equal(context.savePlayerResult('day', -5).best, -5);
assert.equal(context.savePlayerResult('day', -10).best, -5);
assert.equal(context.savePlayerResult('day', 100).newBest, true);
assert.equal(context.savePlayerResult('day', 100).newBest, false);
assert.equal(JSON.parse(stored).day.plays, 4);
assert.equal(context.savePlayerResult('other', 30).plays, 1);
stored = '{broken';
assert.equal(context.savePlayerResult('day', 15).best, 15);
fail = true;
assert.equal(context.savePlayerResult('day', 60).saved, false);
console.log('Records: negative scores, bests, ties, separate days, corrupt and unavailable storage passed.');

const game = fs.readFileSync(path.join(__dirname, '../fishing-game.js'), 'utf8');
let scheduled = 0;
const clock = vm.createContext({
  roundState: { phase:'question', remainingMs:12000 }, timer:null,
  modal:{ classList:{ contains: () => false } }, document:{ hidden:true },
  performance:{ now:()=>100 }, setInterval:()=>{ scheduled++; return 1; },
  tickRoundClock(){}, updateClock(){}, finishQuestion(){}
});
vm.runInContext(game.slice(game.indexOf('function resumeRoundClock()'), game.indexOf('function showQuestionInput()')), clock);
clock.resumeRoundClock();
assert.equal(scheduled,0);
clock.document.hidden = false;
clock.resumeRoundClock();
assert.equal(scheduled,1);
assert.equal(clock.roundState.deadline,12100);
clock.resumeRoundClock();
assert.equal(scheduled,1);
console.log('Clock: hidden tabs cannot resume and visible resume schedules only once.');
