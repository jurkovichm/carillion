// Local browser fixture: /loon-checks serves the normal game with this test script.
const loonCheckButton = document.createElement('button');
loonCheckButton.textContent = 'Run loon checks';
loonCheckButton.style.cssText = 'position:fixed;top:8px;left:8px;z-index:110;padding:8px;background:#efcd87;color:#11271b;font:12px monospace';
document.body.append(loonCheckButton);
const loonCheckStatus = document.createElement('output');
loonCheckStatus.id = 'loonCheckStatus';
loonCheckStatus.style.cssText = 'position:fixed;top:8px;left:140px;right:8px;z-index:110;background:#11271be0;color:#efcd87;font:12px monospace;padding:8px';
document.body.append(loonCheckStatus);
const waitLoonCheck = ms => new Promise(resolve => setTimeout(resolve, ms));
const assertLoonCheck = (value, message) => { if (!value) throw new Error(message); };
async function waitLoonCondition(predicate, timeout = 3000) {
  const deadline = performance.now() + timeout;
  while (!predicate()) { if (performance.now() > deadline) throw new Error('Timed out waiting for game state'); await waitLoonCheck(20); }
}
async function loonCheckEncounter(checkApproach = false) {
  returnToRiver();
  selectedDay = window.DIVE_DAYS.find(day => day.id === '2026-09-28');
  setQuickMode(true); Math.random = () => 0; await begin();
  questions = [...questions.slice(1), questions[0]]; round = 6; next();
  if (checkApproach) setQuickMode(false);
  $('#answerInput').value = 'Carleton'; $('#answerForm').requestSubmit();
  if (checkApproach) {
    await waitLoonCondition(() => roundState.phase === 'loon', 8000);
    assertLoonCheck(!$('#loonEncounter') && !fishingLoon.stolen && shoreCatches.length === 1, 'Approach must precede the choice');
    await waitLoonCheck(900);
    assertLoonCheck(!$('#loonEncounter') && shoreCatches.length === 1, 'Catch must stay in basket until grab');
  }
  await waitLoonCondition(() => roundState.phase === 'loonChoice', 8000);
}
loonCheckButton.onclick = async () => {
  loonCheckButton.disabled = true;
  let pilot;
  const originalLoonSound = loonSound, soundEvents = [];
  loonSound = name => { soundEvents.push(name); originalLoonSound(name); };
  const previousSoundEnabled = soundEnabled;
  soundEnabled = true; soundButton();
  const previousQuickMode = isQuickMode();
  loonCheckStatus.textContent = 'Checking the loon approach and grab…';
  try {
    await loonCheckEncounter(true); const original = score;
    const easy = loonDifficulty(0), hard = loonDifficulty(19);
    assertLoonCheck(hard.speed > easy.speed && hard.interval < easy.interval && hard.height > easy.height && hard.width > easy.width, 'Difficulty must increase throughout the chase');
    assertLoonCheck($('#loonMessage').textContent === 'A loon is stealing your catch! Fight?' && $('#fightLoon').textContent === 'Yes' && $('#leaveLoon').textContent === 'No, Recast', 'Choice must use concise requested copy');
    assertLoonCheck(fishingLoon.stolen && shoreCatches.length === 0 && fishingLoon.pausedProgress === .42, 'Prompt must pause at the grab');
    $('#fightLoon').click();
    assertLoonCheck(loonFight.phase === 'entering', 'Chase must begin with the cinematic transition');
    await waitLoonCheck(1500);
    assertLoonCheck(loonFight.phase === 'entering' && loonFight.elapsed === 0, 'Iris transition must not consume chase time');
    await waitLoonCondition(() => loonFight?.phase === 'playing');
    const pauseTime=performance.now(), elapsedBeforePause=loonFight.elapsed;
    setLoonPaused(true,pauseTime);
    await waitLoonCheck(150);
    assertLoonCheck(loonFight.elapsed===elapsedBeforePause && $('#fightLoon').textContent==='Resume','Pause advanced the chase');
    const beforeJump=loonFight.velocity;jumpLoonRock();
    assertLoonCheck(loonFight.velocity===beforeJump,'Paused chase accepted a jump');
    setLoonPaused(false);
    loonFight.rocks.push({x:loonFight.playerX+200,width:32,height:32,variant:0});
    const resizeRock=loonFight.rocks.at(-1), distance=resizeRock.x-loonFight.playerX;
    loonFight.playerX-=64;resizeRock.x-=64;
    resizeLoonCourse();
    assertLoonCheck(resizeRock.x-loonFight.playerX===distance,'Resize changed obstacle distance');
    loonFight.rocks.pop();
    assertLoonCheck(!$('#loonProgress'), 'Chase must have no timer');
    const box = $('#loonCourse').getBoundingClientRect();
    assertLoonCheck(box.x === 0 && box.y === 0 && box.width === innerWidth && box.height === innerHeight, 'Canvas must cover the whole viewport');
    await waitLoonCondition(() => loonAudioSources.size > 0);
    assertLoonCheck(loonAudioBus && loonAudioSources.size > 0, 'Chase must create actual audio nodes');
    $('#loonSoundToggle').click();
    assertLoonCheck(!soundEnabled && loonAudioBus.gain.value === 0, 'SFX button must immediately mute the audio bus');
    const mutedSources = loonAudioSources.size;
    loonSound('jump');
    assertLoonCheck(loonAudioSources.size === mutedSources, 'Muted effects must not create audio nodes');
    $('#loonSoundToggle').click();
    assertLoonCheck(soundEnabled && loonAudioBus.gain.value === 1, 'SFX button must restore audio');
    loonCheckStatus.textContent = 'Checking immersed freestyle, sound, and catch recovery…';
    pilot = setInterval(() => {
      if (loonFight?.phase !== 'playing' || loonFight.y) return;
      const rock = loonFight.rocks.find(r => r.x + r.width > loonFight.playerX - 18);
      if (rock && rock.x < loonFight.playerX + loonDifficulty(loonFight.elapsed).speed * .24 + 18) jumpLoonRock();
    }, 20);
    await waitLoonCondition(() => loonFight?.phase !== 'playing', 26000);
    clearInterval(pilot);
    assertLoonCheck(loonFight.phase === 'punch', 'Real physics must allow a 20-second win');
    await waitLoonCheck(900);
    assertLoonCheck(loonFight.phase === 'punch' && !loonFight.punchHit, 'Slow punch must keep its windup before impact');
    await waitLoonCondition(() => loonFight.punchHit);
    assertLoonCheck(loonFight.phase === 'punch', 'Impact must precede recovery');
    await waitLoonCondition(() => loonFight.phase === 'won', 7000); $('#fightLoon').click();
    assertLoonCheck(roundState.phase === 'roundEnd' && score === original && shoreCatches.length === 1 && roundState.record.catches.length === 1, 'Victory must restore exactly one fish with unchanged points');
    loonCheckStatus.textContent = 'Checking fight penalty, skull, next question, and recast…';
    await loonCheckEncounter(); $('#fightLoon').click();
    assertLoonCheck($('#leaveLoon').classList.contains('hidden'), 'Chase must have no surrender button');
    await waitLoonCondition(() => loonFight?.phase === 'lost', 8000);
    loseLoonCatch();
    assertLoonCheck(score === -30 && roundState.record.points === -30 && roundState.record.reason === 'loon-loss' && !caughtFish.length, 'Fight loss must remove catch points plus 30');
    $('#fightLoon').click();
    assertLoonCheck(round === 7 && score === -30 && roundState.phase === 'summary', 'Fight loss must advance without a reguess');
    assertLoonCheck(roundLog[6].loonPenalty === 30 && catchShareText().includes('💀'), 'Postgame share must mark fight loss with a skull');
    finishSummary();
    assertLoonCheck($('#catchList .catch-row:last-child .catch-answer').textContent.includes('💀') && $('#catchList .catch-row:last-child .round-catches').textContent.includes('−30'), 'Postgame must show skull and fight penalty');
    await loonCheckEncounter(); $('#leaveLoon').click();
    await waitLoonCondition(() => roundState.phase === 'question');
    assertLoonCheck(score === 0 && !shoreCatches.length && !roundState.record.loonPenalty, 'No, Recast must allow another answer without fight penalty');
    setQuickMode(false);
    for (const answer of ['Carleton', 'Carleton College']) {
      $('#answerInput').value = answer; $('#answerForm').requestSubmit();
      assertLoonCheck(roundState.phase === 'question' && !fishingCast && score === 0 && $('#inputFeedback').textContent.includes('stole'), 'Stolen aliases must be rejected before casting');
    }
    await loonCheckEncounter(); returnToRiver();
    await waitLoonCheck(1500);
    assertLoonCheck(roundState.phase === 'home' && !loonFight && !fishingLoon && !$('#loonEncounter'), 'Leaving during the choice must cancel the handoff');
    assertLoonCheck(['call','stroke','jump','land','current','collision','punch','recover'].every(name => soundEvents.includes(name)), 'Every chase event must play its sound');
    assertLoonCheck(loonAudioBus === null && loonAudioSources.size === 0, 'Leaving the chase must stop audio');
    loonCheckStatus.textContent = `PASS ${innerWidth}×${innerHeight}: grab handoff, full screen, difficulty, pause/resume, resize, sound/mute, victory, loss penalty/skull, recast, aliases, cancellation`;
  } catch (error) {
    loonCheckStatus.textContent = 'FAIL: ' + error.message;
    console.error(error);
  } finally { clearInterval(pilot); loonSound = originalLoonSound; soundEnabled = previousSoundEnabled; saveSoundPreference(); soundButton(); loonCheckButton.disabled = false; setQuickMode(previousQuickMode); }
};

// Visual inspection shortcut: the integration runner above still plays all 20 seconds.
const loonFinalePreview = document.createElement('button');
loonFinalePreview.textContent = 'Preview shore finale';
loonFinalePreview.style.cssText = 'position:fixed;top:42px;left:8px;z-index:110;padding:8px;background:#efcd87;color:#11271b;font:12px monospace';
document.body.append(loonFinalePreview);
loonFinalePreview.onclick = async () => {
  await loonCheckEncounter();
  setQuickMode(false);
  $('#fightLoon').click();
  await waitLoonCondition(() => loonFight?.phase === 'playing');
  loonFight.elapsed = 20; loonFight.rocks = []; loonFight.nextRock = Infinity;
  for (const control of [loonCheckButton, loonCheckStatus, loonFinalePreview, loonIrisPreview]) control.style.visibility = 'hidden';
};
const loonIrisPreview = document.createElement('button');
loonIrisPreview.textContent = 'Inspect zoom framing';
loonIrisPreview.style.cssText = 'position:fixed;top:76px;left:8px;z-index:110;padding:8px;background:#efcd87;color:#11271b;font:12px monospace';
document.body.append(loonIrisPreview);
loonIrisPreview.onclick = async () => {
  await loonCheckEncounter();
  setQuickMode(false);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  $('#fightLoon').click();
  cancelAnimationFrame(loonFightFrame);
  drawLoonCourse(loonFight.enteredAt + 849);
};
