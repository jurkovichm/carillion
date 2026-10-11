const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('pregame-play.js', 'utf8');
const context = vm.createContext({});
const riverSource=fs.readFileSync('fishing.js','utf8');
vm.runInContext(riverSource.slice(riverSource.indexOf('const WATER_CHANNEL'),riverSource.indexOf('bridgeImage.onload')),context);
vm.runInContext(source.slice(source.indexOf('function walkDeckAt'), source.indexOf('function walkPregame')), context);
const move = context.movePregameAngler;
// Bank approaches must stop at the narrowing bridge, never teleport onto it.
for (const y of [320, 400, 800, 900]) {
  const actor = {x: 379, y};
  for (let i = 0; i < 100; i++) {
    const before = {...actor}; move(actor, 5, 0, 0, null);
    assert(Math.hypot(actor.x-before.x, actor.y-before.y) <= 7);
  }
}
// Both directions traverse the entire deck without discontinuities.
for (const direction of [-1, 1]) {
  const actor={x:direction===1?350:1770,y:walkY(direction===1?350:1770)};
  for(let i=0;i<285;i++) { const before={...actor};move(actor,direction*5,0,0,null);assert(Math.hypot(actor.x-before.x,actor.y-before.y)<7); }
  assert(direction===1?actor.x>1740:actor.x<380);
}
function walkY(x) { return context.walkDeckAt(x); }
// Solid basket base blocks entry, while diagonal motion slides around it.
const basket={x:180,y:480,width:225,height:225};
let actor={x:180,y:650};move(actor,0,-200,0,basket);
assert(actor.y>=basket.y+basket.height*.45+12);
move(actor,200,-100,0,basket);assert(actor.x>298);
assert(context.canStandPregame(actor.x,actor.y,0,basket));
console.log('Walking passed: bridge approaches, both slopes, basket blocking and sliding.');

actor={x:1600,y:1000};move(actor,-400,0,0,null);assert.equal(actor.swimming,true);
const riverX=actor.x;move(actor,0,400,0,null);assert.equal(actor.swimming,true);assert.equal(actor.x,riverX);
move(actor,600,-400,0,null);assert.equal(actor.swimming,false);
actor={x:1000,y:480};move(actor,0,100,0,null);assert(actor.y<=512);
console.log('Swimming passed: bank entry, free movement, bank exit, bridge rails.');
// River and bridge are separate vertical layers at identical map coordinates.
actor={x:1000,y:900,swimming:true};
for(let i=0;i<220;i++){const before={...actor};move(actor,0,-4,0,null);assert(Math.hypot(actor.x-before.x,actor.y-before.y)<=4.01);assert(actor.swimming);}
assert(actor.y<200,'Swimmer must emerge upstream behind the bridge');
move(actor,0,900,0,null);assert(actor.y>800&&actor.swimming,'Swimmer must return below bridge');
actor={x:1000,y:480,swimming:false};move(actor,0,-150,0,null);assert(actor.y>=448&&!actor.swimming,'Deck walker must not fall through rear rail');
actor={x:1000,y:480,swimming:true};move(actor,400,0,0,null);assert(actor.swimming,'Swimmer must not climb through an abutment');
console.log('Bridge layers passed: both river directions, upstream emergence, deck rails and abutments.');
