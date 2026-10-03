// Timed multi-answer rounds. Existing question data and matching helpers stay intact.
const ROUND_MS=25000;
const BOTTLE_CHANCE=.10;
const bottleFacts=[
  {text:'Carleton’s Cowling Arboretum covers about 800 acres.',source:'https://athletics.carleton.edu/sports/2019/7/15/cowling-arboretum.aspx?id=6001'},
  {text:'Goodsell Observatory was built in 1887.',source:'https://cdn.carleton.edu/uploads/sites/190/2021/01/2015_16_Carleton_College_Catalog.pdf'},
  {text:'Students have been stealing and revealing the Schiller bust since 1957.',source:'https://hhfinals.dgah.sites.carleton.edu/mascots/schiller/index.html'}
];
const shoreCatches=[];
const roundState={phase:'home',remainingMs:ROUND_MS,deadline:0,peakScore:0,epoch:0,record:null};
let lastBottleFact=-1,assetFailure=false;
let selectedDay=window.DIVE_DAYS.at(-1),selectedMode='single';
let matchDay=selectedDay,matchMode=selectedMode;
const modeLabel=()=>matchMode==='single'?'Single-cast':'Multi-cast';
const previousAnswerFact=postAnswerFact,previousRoundTidbit=roundTidbit;
postAnswerFact=function(index,item){return matchDay.id==='2026-09-28'?previousAnswerFact(index,item):item.note||questions[index].answerNote||'';};
roundTidbit=function(index){return matchDay.id==='2026-09-28'?previousRoundTidbit(index):questions[index].tidbit||'';};

// Keep the existing summary's answer bank, facts, sources, styling, and music.
const legacySummary=showSummary;
const legacyShow=show;
close=function(){modal.classList.remove('open');};
show=function(title,body){
  if(roundState.phase==='question')pauseRoundClock();
  legacyShow(title,body);
};
const modalChanges=new MutationObserver(()=>{
  if(!modal.classList.contains('open')&&roundState.phase==='question'&&!timer)resumeRoundClock();
});
modalChanges.observe(modal,{attributes:true,attributeFilter:['class']});

function stopSpeech(){if('speechSynthesis' in window)window.speechSynthesis.cancel();}
function speakFact(fact){
  stopSpeech();
  if(!soundEnabled||!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window))return;
  const utterance=new SpeechSynthesisUtterance(fact.text);utterance.rate=.95;
  window.speechSynthesis.speak(utterance);
}
const previousSoundButton=soundButton;
soundButton=function(){previousSoundButton();if(!soundEnabled){stopSpeech();almaMater.pause();}};

function installFishingUI(){
  $('#home').insertAdjacentHTML('afterbegin',`<button class="choose-angler" id="chooseAngler" type="button"><canvas width="40" height="56" aria-hidden="true"></canvas><span>YOUR ANGLER<br><b id="selectedAnglerName"></b><small>Change character →</small></span></button>`);
  $('#chooseAngler').insertAdjacentHTML('afterend',`<div class="pregame-settings"><label class="day-label" for="selectDay">Select Day</label><select id="selectDay">${[...window.DIVE_DAYS].reverse().map(day=>`<option value="${day.id}">${day.label}</option>`).join('')}</select><fieldset class="cast-mode"><legend>Cast mode</legend><label><input type="radio" name="castMode" value="single" checked><span>Single-cast</span></label><label><input type="radio" name="castMode" value="multi"><span>Multi-cast</span></label></fieldset></div>`);
  $('#selectDay').value=selectedDay.id;
  $('#selectDay').onchange=()=>{if(roundState.phase==='home'){selectedDay=window.DIVE_DAYS.find(day=>day.id===$('#selectDay').value);$('#home .bottomrow>span').textContent=selectedDay.label;}};
  document.querySelectorAll('[name="castMode"]').forEach(input=>input.onchange=()=>{if(roundState.phase==='home'&&input.checked)selectedMode=input.value;});
  $('#home .bottomrow>span').textContent=selectedDay.label;
  $('#gameUI').insertAdjacentHTML('beforeend',`<div class="round-actions hidden" id="roundActions"><span id="roundCatchCount">0 fish this question</span><button id="giveUpBtn" type="button">Give Up</button></div><div class="last-catch hidden" id="lastCatch" role="status"></div><div class="reward-toast hidden" id="rewardToast" role="status"></div>`);
  $('#game').insertAdjacentHTML('beforeend',`<section class="character-picker hidden" id="characterPicker" role="dialog" aria-modal="true" aria-labelledby="pickerTitle"><div class="character-picker-panel"><button class="close" id="closePicker" aria-label="Close character selection">×</button><small class="picker-eyebrow">A QUIET RIVER. YOUR OWN STORY.</small><h2 id="pickerTitle">Choose your angler</h2><p>Same game. Three ways to fish.</p><div class="character-grid">${fishermanChoices.map((c,i)=>`<button class="character-choice" type="button" data-character="${i}" aria-pressed="false"><canvas width="64" height="80" aria-hidden="true"></canvas><strong>${c.name}</strong><span>${c.description}</span></button>`).join('')}</div><div class="wardrobe-preview"><canvas id="wardrobePreview" width="120" height="70" aria-hidden="true"></canvas><span>Earn your graduation gear<br><small>200 · cap &nbsp; 300 · gown &nbsp; 350 · ribbons</small></span></div><button class="picker-confirm" id="confirmCharacter">FISH AS STUDENT →</button><p class="asset-status" id="assetStatus" role="status">Loading your anglers…</p></div></section>`);
  $('#chooseAngler').onclick=openCharacterPicker;
  $('#closePicker').onclick=closeCharacterPicker;
  $('#confirmCharacter').onclick=()=>{closeCharacterPicker();begin();};
  $('#characterPicker').addEventListener('click',e=>{if(e.target===$('#characterPicker'))closeCharacterPicker();const button=e.target.closest('[data-character]');if(button)selectFisherman(Number(button.dataset.character));});
  $('#giveUpBtn').onclick=()=>finishQuestion('giveup');
  $('#close').onclick=close;
  $('#begin').onclick=begin;
  $('#playAgain').onclick=returnToRiver;
  $('#descendBtn').onclick=descendNext;
  $('#answerForm').onsubmit=submitFishingAnswer;
  $('#answerInput').oninput=()=>{clearInputHint();$('#lastCatch').classList.add('hidden');};
  $('#howBtn').onclick=()=>show('HOW TO FISH',`<p>Seven questions, 25 seconds per question. Single-cast ends each question on your first correct answer; your result stays until Next Cast. Multi-cast lets you keep catching different answers until time runs out.</p><p>Wrong answers clear so you can try again. Spelling suggestions ask you to confirm. The clock pauses during a catch; rarity and points stay secret until the fish breaks the surface.</p><p>Ending with no fish catches a boot or skeleton for −5 points. Give Up on an empty round has a 10% chance of a zero-point bottle with a Carleton fact. Once you have caught a fish, ending the question carries no penalty.</p><p>Earn a cap at 200, a gown at 300, and ribbons at 350 points. Earned gear stays until the next game.</p><button class="action" id="gotIt">LET’S FISH</button>`);
  $('#summaryScreen').setAttribute('aria-label','Fishing summary');
  $('#gameUI').removeAttribute('aria-live');
  $('#answerResult').setAttribute('role','status');
  $('#descendNote').setAttribute('role','status');
  $('#playAgain').textContent='BACK TO THE RIVER';
  $('#summaryScreen .summary-head').insertAdjacentHTML('afterend',`<div class="summary-share" role="group" aria-label="Share results"><div class="share-buttons"><button type="button" id="copyScore">Copy score</button></div><p id="shareStatus" role="status"></p><textarea id="sharePreview" class="hidden" readonly aria-label="Results to copy" rows="8"></textarea></div>`);
  $('#copyScore').onclick=()=>copyCatchSummary();
  selectFisherman(selectedFisherman);
  characterSpritesReady.then(()=>{$('#assetStatus').textContent='';selectFisherman(selectedFisherman);}).catch(error=>{assetFailure=true;$('#assetStatus').textContent=error.message+' Reload to try again.';$('#confirmCharacter').disabled=true;});
}

function drawPreview(canvas,stage,index){
  const ctx=canvas.getContext('2d'),sprite=characterFrames[stage]?.[index];ctx.clearRect(0,0,canvas.width,canvas.height);if(!sprite)return;
  ctx.imageSmoothingEnabled=false;const height=Math.min(canvas.height-8,64),width=height*sprite.width/sprite.height;
  ctx.drawImage(sprite,Math.floor((canvas.width-width)/2),canvas.height-height-4,width,height);
}
function selectFisherman(index){
  selectedFisherman=index;
  try{localStorage.setItem('carillion-character',fishermanChoices[index].id);}catch{}
  document.querySelectorAll('.character-choice').forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===index));drawPreview(button.querySelector('canvas'),0,i);});
  $('#selectedAnglerName').textContent=fishermanChoices[index].name;
  $('#confirmCharacter').textContent='FISH AS '+fishermanChoices[index].short.toUpperCase()+' →';
  drawPreview($('#chooseAngler canvas'),0,index);
  const canvas=$('#wardrobePreview'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,120,70);ctx.imageSmoothingEnabled=false;
  for(let stage=1;stage<=3;stage++){const sprite=characterFrames[stage]?.[index];if(sprite){const w=56*sprite.width/sprite.height;ctx.drawImage(sprite,(stage-1)*40+(40-w)/2,7,w,56);}}
}
function openCharacterPicker(){
  if(roundState.phase!=='home')return;
  $('#characterPicker').classList.remove('hidden');
  document.querySelector(`.character-choice[data-character="${selectedFisherman}"]`).focus();
}
function closeCharacterPicker(){$('#characterPicker').classList.add('hidden');$('#chooseAngler').focus();}
// Handle Escape before legacy handlers; removing the old menu left no menu target.
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopImmediatePropagation();if(!$('#characterPicker').classList.contains('hidden'))closeCharacterPicker();else close();}
  if(e.key==='Tab'&&!$('#characterPicker').classList.contains('hidden')){
    const controls=[...$('#characterPicker').querySelectorAll('button:not(:disabled)')],first=controls[0],last=controls[controls.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
},true);

function clearFishingTimers(){
  clearInterval(timer);timer=null;clearTimeout(descentTimer);clearInterval(descentTick);
  catchTimers.forEach(clearTimeout);catchTimers=[];clearTimeout(showSoftFill.timer);
}
function later(callback,delay){
  const epoch=roundState.epoch;
  catchTimers.push(setTimeout(()=>{if(epoch===roundState.epoch)callback();},delay));
}
function signedPoints(points){return(points>=0?'+':'−')+Math.abs(points);}
function updateFishingHUD(){
  $('#score').textContent=score;$('#hudScore').textContent=score;$('#hudDepth').textContent=caughtFish.length;
  $('#catchCaption').textContent='YOUR CATCH · '+caughtFish.length+' FISH';
  const count=roundState.record?.catches.length||0;
  $('#roundCatchCount').textContent=count+' fish this question';
  $('#giveUpBtn').textContent=count?'Finish question':'Give Up';
  renderSteps();
  $('#stepLabel').textContent=`QUESTION ${Math.min(round+1,questions.length)} OF ${questions.length}`;
  $('#promptIndex').textContent=$('#stepLabel').textContent;
}
function updateClock(){
  seconds=Math.max(0,Math.ceil(roundState.remainingMs/1000));$('#countdown').textContent=seconds;
  $('.timer-dial').style.setProperty('--time-left',Math.max(0,roundState.remainingMs/ROUND_MS));
}
function tickRoundClock(){
  if(roundState.phase!=='question')return;
  roundState.remainingMs=Math.max(0,roundState.deadline-performance.now());updateClock();
  if(roundState.remainingMs<=0)finishQuestion('timeout');
}
function pauseRoundClock(){
  if(timer!==null){roundState.remainingMs=Math.max(0,roundState.deadline-performance.now());clearInterval(timer);timer=null;updateClock();}
}
function resumeRoundClock(){
  if(roundState.phase!=='question'||timer!==null||modal.classList.contains('open'))return;
  if(roundState.remainingMs<=0){finishQuestion('timeout');return;}
  roundState.deadline=performance.now()+roundState.remainingMs;
  timer=setInterval(tickRoundClock,100);updateClock();
}
function showQuestionInput(){
  roundState.phase='question';fishingBusy=false;
  $('#answerResult').classList.add('hidden');$('#descendBtn').classList.add('hidden');$('#descendNote').classList.add('hidden');
  $('.prompt-card').classList.remove('hidden');$('#answer-dock').classList.remove('hidden');$('#roundActions').classList.remove('hidden');
  $('#answerInput').disabled=false;$('#answerForm button').disabled=false;$('#giveUpBtn').disabled=false;
  $('#answerInput').value='';$('#answerInput').placeholder=used.size?'Another answer…':'Type an answer…';
  updateFishingHUD();resumeRoundClock();$('#answerInput').focus({preventScroll:true});
}

begin=async function(){
  if(roundState.phase!=='home')return;
  roundState.phase='loading';
  $('#begin').disabled=true;
  try{await characterSpritesReady;}catch{assetFailure=true;roundState.phase='home';openCharacterPicker();$('#begin').disabled=false;return;}
  if(assetFailure)return;
  matchDay=selectedDay;matchMode=selectedMode;questions=matchDay.questions;
  roundState.epoch++;clearFishingTimers();stopSpeech();almaMater.pause();almaMater.currentTime=0;
  score=0;depthScore=0;round=0;roundLog=[];used.clear();caughtFish.length=0;shoreCatches.length=0;
  fishingCatch=null;fishingBusy=false;rewardStage=0;roundState.peakScore=0;roundState.record=null;
  $('#begin').disabled=false;$('#summaryScreen').classList.add('hidden');$('#characterPicker').classList.add('hidden');
  document.body.classList.add('playing');$('#gameUI').classList.remove('hidden');
  $('#rewardToast').classList.add('hidden');$('#lastCatch').classList.add('hidden');clearInputHint();soundButton();next();fx('dive');
};
next=function(){
  clearFishingTimers();stopSpeech();
  if(round>=questions.length){showSummary();return;}
  used.clear();roundState.remainingMs=ROUND_MS;
  roundState.record={question:questions[round].prompt,typed:'',points:0,meters:0,depthAfter:depthScore,timedOut:false,matched:null,catches:[],loot:null,reason:null};
  roundLog[round]=roundState.record;
  $('#promptText').textContent=questions[round].prompt;
  $('.rarity').textContent=matchMode==='single'?'Single-cast · Rarity reveals at the surface.':'Multi-cast · Rarity reveals at the surface.';
  $('#lastCatch').classList.add('hidden');clearInputHint();showQuestionInput();
};

function submitFishingAnswer(event){
  event.preventDefault();if(roundState.phase!=='question')return;
  tickRoundClock();if(roundState.phase!=='question')return;
  const typed=$('#answerInput').value.trim(),clean=normalizeAnswer(typed),q=questions[round];if(!clean)return;
  const match=q.answers.find(answer=>answer.forms.some(form=>normalizeAnswer(form)===clean));
  if(!match){const candidate=softCandidate(q,clean);if(candidate)showSoftFill(typed,candidate);else{rejectInput(typed);$('#answerInput').value='';}return;}
  const identity=normalizeAnswer(match.forms[0]);
  if(used.has(identity)){$('#inputFeedback').textContent='Already caught — try a different answer.';$('#inputFeedback').classList.remove('hidden');$('#softFill').classList.add('hidden');$('#answerInput').value='';return;}
  used.add(identity);pauseRoundClock();
  if(matchMode==='single')roundState.record.reason='caught';
  reelCatch({kind:'fish',points:match.points,name:match.forms[0],match,typed},matchMode==='single');
}

function unlockRewards(){
  roundState.peakScore=Math.max(roundState.peakScore,score);
  const stage=roundState.peakScore>=350?3:roundState.peakScore>=300?2:roundState.peakScore>=200?1:0;
  if(stage<=rewardStage)return;
  const previous=rewardStage;rewardStage=stage;
  const names=['','Graduation cap','Graduation gown','Distinction ribbons'];
  $('#rewardToast').textContent=Array.from({length:stage-previous},(_,i)=>names[previous+i+1]).join(' + ')+' earned!';
  $('#rewardToast').classList.remove('hidden');
  later(()=>$('#rewardToast').classList.add('hidden'),5000);
}
function chooseBottleFact(){
  const choices=bottleFacts.map((fact,i)=>({fact,i})).filter(({i})=>i!==lastBottleFact);
  const selected=choices[Math.floor(Math.random()*choices.length)];lastBottleFact=selected.i;return selected.fact;
}
function finishQuestion(reason){
  if(roundState.phase!=='question')return;
  pauseRoundClock();const record=roundState.record;record.reason=reason;record.timedOut=reason==='timeout';
  if(record.catches.length){completeQuestion();return;}
  const bottle=reason==='giveup'&&Math.random()<BOTTLE_CHANCE;
  const kind=bottle?'bottle':Math.random()<.5?'boot':'skeleton';
  reelCatch({kind,points:bottle?0:-5,name:kind==='boot'?'An old boot':kind==='skeleton'?'A skeleton fish':'A message in a bottle',fact:bottle?chooseBottleFact():null},true);
}
function reelCatch(item,endsQuestion){
  roundState.phase='reeling';fishingBusy=true;clearInputHint();$('#lastCatch').classList.add('hidden');
  $('#answerInput').disabled=true;$('#answerForm button').disabled=true;$('#giveUpBtn').disabled=true;
  $('#answer-dock').classList.add('hidden');$('#roundActions').classList.add('hidden');$('.prompt-card').classList.add('hidden');
  $('#answerResult').classList.add('hidden');$('#descendBtn').classList.add('hidden');
  $('#descendNote').textContent='Something on the line… · clock paused';$('#descendNote').classList.remove('hidden');
  fishingCatch={...item,revealed:false,revealedAt:null,target:shoreCatchPosition(shoreCatches.length)};
  bubbleWash(.35,.012);
  later(()=>{
    fishingCatch.revealed=true;
    fishingCatch.revealedAt=performance.now();
    score+=item.points;depthScore=score*10;
    const record=roundState.record;record.points+=item.points;record.meters=record.points*10;record.depthAfter=depthScore;
    if(item.kind==='fish'){
      record.catches.push(item);record.typed=record.catches.map(c=>c.name).join(', ');record.matched=item.match;
    }else{record.loot=item;record.typed=item.name;}
    updateFishingHUD();unlockRewards();
    $('#answerResult').dataset.rank=item.kind==='fish'?rankClass(item.points):item.kind==='bottle'?'rank-bottle':'rank-miss';
    $('#answerTier').textContent=item.kind==='fish'?scoreTiers[item.points]:item.kind==='bottle'?'A NOTE FROM CARLETON':'BETTER LUCK NEXT CAST';
    $('#acceptedAnswer').textContent=item.name;
    $('#answerPoints').textContent=item.kind==='fish'?`1 FISH × ${item.points} RARITY = +${item.points} PTS`:item.kind==='bottle'?'A LITTLE WISDOM · 0 PTS':'−5 PTS';
    $('#answerNote').textContent=item.fact?.text||(item.match?(item.match.note||postAnswerFact(round,item.match)):'No fish this question. The lake sent a consolation prize.');
    $('#descendNote').classList.add('hidden');$('#answerResult').classList.remove('hidden');
    fx(item.kind==='fish'?'answer':item.kind==='bottle'?'surface':'miss',Math.max(0,item.points));
    if(item.fact)speakFact(item.fact);
    // Start landing from the actual reveal so delayed timers cannot skip the flight.
    later(()=>{
      shoreCatches.push(item);if(item.kind==='fish')caughtFish.push(item);
      fishingCatch=null;fishingBusy=false;updateFishingHUD();
      if(endsQuestion){completeQuestion(true);return;}
      if(used.size===questions[round].answers.length){roundState.record.reason='all-caught';completeQuestion();return;}
      $('#lastCatch').textContent=item.name+' · '+scoreTiers[item.points]+' · +'+item.points;
      $('#lastCatch').classList.remove('hidden');showQuestionInput();
    },CATCH_FLIGHT_MS+CATCH_SETTLE_MS);
  },CATCH_REVEAL_MS);
}
function completeQuestion(keepResult=false){
  pauseRoundClock();roundState.phase='roundEnd';fishingBusy=false;
  $('#answer-dock').classList.add('hidden');$('#roundActions').classList.add('hidden');$('.prompt-card').classList.add('hidden');$('#lastCatch').classList.add('hidden');
  if(!keepResult){
    const record=roundState.record;
    $('#answerResult').dataset.rank='';$('#answerTier').textContent=record.reason==='all-caught'?'EVERY ANSWER CAUGHT':'QUESTION COMPLETE';
    $('#acceptedAnswer').textContent=record.catches.length+' fish landed';$('#answerPoints').textContent=signedPoints(record.points)+' PTS THIS QUESTION';
    $('#answerNote').textContent=record.reason==='timeout'?'Time’s up. Your catch is safe.':'Your catch is safe. On to the next spot.';
  }
  $('#answerResult').classList.remove('hidden');$('#descendBtn').textContent=matchMode==='single'?'Next Cast':round===questions.length-1?'REVIEW THE CATCH →':'NEXT QUESTION →';$('#descendBtn').classList.remove('hidden');$('#descendBtn').focus({preventScroll:true});
  document.querySelectorAll('#steps i')[round]?.classList.add('done');
}
descendNext=function(){
  if(roundState.phase!=='roundEnd')return;
  roundState.phase='transition';round++;next();
};
// Legacy timeout entry points are retained for callers, with the new round rules.
resolve=function(typed,match,timedOut){
  if(timedOut){finishQuestion('timeout');return;}
  if(match&&roundState.phase==='question'){$('#answerInput').value=typed;$('#answerForm').requestSubmit();}
};

function catchShareText(){
  const date=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(matchDay.id+'T00:00:00Z')).replace('Sept','Sep');
  const rarityEmoji={10:'🥏',15:'😛',30:'🎓',60:'🧠',85:'🧬',100:'🤯'};
  const rounds=questions.map((question,i)=>{
    const record=roundLog[i],catches=record?.catches||[];
    const best=catches.reduce((top,c)=>!top||c.points>top.points?c:top,null);
    const emoji=best?(rarityEmoji[best.points]||'🐟'):'';
    const empty=({boot:'🥾',skeleton:'🦴',bottle:'🍾'})[record?.loot?.kind]||'➖';
    return emoji||empty;
  });
  return `Carillion ${date}\n${rounds.join('')}\n${score} pts`;
}
function copyCatchFallback(text){
  const field=document.createElement('textarea'),previous=document.activeElement;
  field.value=text;field.readOnly=true;field.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.append(field);field.focus({preventScroll:true});field.select();
  try{return document.execCommand('copy');}catch{return false;}
  finally{field.remove();previous?.focus({preventScroll:true});}
}
async function copyCatchSummary(){
  if(roundState.phase!=='summary')return;
  const text=catchShareText(),buttons=[$('#copyScore')];
  buttons.forEach(button=>button.disabled=true);
  $('#shareStatus').textContent='';$('#sharePreview').classList.add('hidden');
  let copied=false;
  try{
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true;}
  }catch{}
  if(!copied)copied=copyCatchFallback(text);
  buttons.forEach(button=>button.disabled=false);
  if(roundState.phase!=='summary')return;
  $('#shareStatus').textContent=copied?'Score copied':'Clipboard unavailable. Your text is selected below.';
  if(!copied){
    const preview=$('#sharePreview');preview.value=text;preview.classList.remove('hidden');preview.focus({preventScroll:true});preview.select();
  }
}

showSummary=function(){
  clearFishingTimers();stopSpeech();roundState.phase='summary';fishingCatch=null;
  document.body.classList.add('showing-summary');
  legacySummary();
  $('#shareStatus').textContent='';$('#sharePreview').value='';$('#sharePreview').classList.add('hidden');
  $('#summaryDive').textContent=matchDay.label+' · '+modeLabel();$('#summaryDepth').textContent=`${caughtFish.length} FISH · ${fishermanChoices[selectedFisherman].name.toUpperCase()}`;
  const maximum=questions.reduce((sum,q)=>sum+(matchMode==='single'?Math.max(...q.answers.map(a=>a.points)):q.answers.reduce((n,a)=>n+a.points,0)),0);
  const percentage=Math.max(0,Math.min(100,score/maximum*100));
  $('.score-position small').textContent=matchMode==='single'?'YOUR SHARE OF POSSIBLE SINGLE-CAST POINTS':'YOUR SHARE OF ALL CURATED ANSWER POINTS';
  $('#scoreTrackFill').style.width=percentage+'%';$('#scorePositionText').textContent=`${score} points · ${caughtFish.length} unique answers caught`;
  $('#summaryScreen .summary-head').querySelector('.earned-gear')?.remove();
  const gear=document.createElement('p');gear.className='earned-gear';gear.textContent=rewardStage?['','Graduation cap earned','Cap + gown earned','Cap + gown + distinction ribbons earned'][rewardStage]:'Next milestone: graduation cap at 200 points';$('#summaryDepth').after(gear);
  $('#catchList').querySelectorAll('.catch-row').forEach((detail,i)=>{
    const record=roundLog[i];if(!record)return;
    const answerEl=detail.querySelector('.catch-answer');
    if(record.catches.length)answerEl.innerHTML=record.catches.map(c=>`<span class="catch-name" data-rank="${rankClass(c.points)}">${escapeHTML(c.name)}</span>`).join(', ');
    else answerEl.textContent=record.loot?.name||'No catch';
    const points=detail.querySelector('.catch-points');points.textContent=signedPoints(record.points);
    const best=record.catches.reduce((top,c)=>!top||c.points>top.points?c:top,null);
    if(best)points.dataset.rank=rankClass(best.points);else points.removeAttribute('data-rank');
    const list=document.createElement('div');list.className='round-catches';
    list.innerHTML='<h3>YOUR CATCH</h3>'+record.catches.map(c=>`<div><span>${escapeHTML(c.name)}</span><b data-rank="${rankClass(c.points)}">${signedPoints(c.points)}</b></div>`).join('');
    if(record.loot){list.innerHTML+=`<div><span>${escapeHTML(record.loot.name)}</span><b>${signedPoints(record.loot.points)}</b></div>`;if(record.loot.fact)list.innerHTML+=`<p>${escapeHTML(record.loot.fact.text)} <a href="${escapeHTML(record.loot.fact.source)}" target="_blank" rel="noreferrer">Source</a></p>`;}
    detail.querySelector('.catch-body').prepend(list);
    detail.querySelectorAll('.bank-answer').forEach(row=>{if(record.catches.some(c=>c.name===row.querySelector('span')?.textContent))row.classList.add('caught-answer');});
  });
};
function returnToRiver(){
  roundState.epoch++;clearFishingTimers();stopSpeech();almaMater.pause();almaMater.currentTime=0;
  roundState.phase='home';roundState.record=null;fishingCatch=null;fishingBusy=false;rewardStage=0;
  score=0;round=0;roundLog=[];caughtFish.length=0;shoreCatches.length=0;
  document.body.classList.remove('playing','showing-summary');$('#gameUI').classList.add('hidden');$('#summaryScreen').classList.add('hidden');
  $('#catchCaption').textContent='YOUR CATCH · 0 FISH';$('#begin').focus();
}

installFishingUI();
// Rebind after the replacement functions have been assigned.
$('#begin').onclick=begin;$('#descendBtn').onclick=descendNext;
