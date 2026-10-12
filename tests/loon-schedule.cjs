const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('fishing-game.js','utf8');
const math=Object.create(Math),context=vm.createContext({Math:math});
vm.runInContext(source.match(/function chooseLoonQuestion\(count\) \{[^}]+\}/)[0],context);
for(let i=0;i<7;i++){math.random=()=> (i+.5)/7;assert.equal(context.chooseLoonQuestion(7),i);}
math.random=()=>0;assert.equal(context.chooseLoonQuestion(7),0);
math.random=()=>.999999;assert.equal(context.chooseLoonQuestion(7),6);
const catchItem={kind:'fish'},loot={kind:'boot'};
Object.assign(context,{pauseRoundClock(){},roundState:{record:null},shoreCatches:[],round:0,loonQuestion:0,steals:0,stealFishWithLoon(){context.steals++}});
const start=source.indexOf('function completeQuestion('),end=source.indexOf("  roundState.phase = 'roundEnd';",start);
vm.runInContext(source.slice(start,end)+'}',context);
for(let selected=0;selected<7;selected++){
 context.loonQuestion=selected;context.steals=0;
 for(let round=0;round<7;round++){
  context.round=round;context.roundState.record={catches:[catchItem]};context.shoreCatches=[catchItem];
  context.completeQuestion();context.completeQuestion();
 }
 assert.equal(context.steals,1);
}
context.round=context.loonQuestion=3;context.steals=0;context.roundState.record={catches:[],loot};context.shoreCatches=[loot];context.completeQuestion();assert.equal(context.steals,1);
assert(source.includes('loonQuestion = chooseLoonQuestion(questions.length);'));
console.log('Loon schedule passed: all seven slots, random boundaries, one encounter, no repeat, consolation catch.');
