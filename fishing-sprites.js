// Character and loot atlases are sampled once into small, crisp game sprites.
const fishermanChoices = [
  { id: 'regular', name: 'Lakeside Regular', short: 'Regular', description: 'A trusty hat and a well-worn fishing vest.' },
  { id: 'student', name: 'Student Angler', short: 'Student', description: 'Carleton blue, gold, and a little ambition.' },
  { id: 'professor', name: 'Old Professor', short: 'Professor', description: 'A patient angler with a lifetime of stories.' }
];
let selectedFisherman = 1;
try {
  const saved = localStorage.getItem('carillion-character');
  const index = fishermanChoices.findIndex(c => c.id === saved);
  if (index >= 0)
    selectedFisherman = index;
}
catch {
}
let rewardStage = 0;
const characterFrames = [], lootFrames = {}, fishSprites = {};
function sampleSprite(image, x, y, width, height, targetHeight, maxWidth = Infinity) {
  const source = document.createElement('canvas');
  source.width = width;
  source.height = height;
  const ctx = source.getContext('2d');
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  let left = width, top = height, right = 0, bottom = 0;
  for (let py = 0; py < height; py++)
    for (let px = 0; px < width; px++)
      if (data[(py * width + px) * 4 + 3] > 128) {
        left = Math.min(left, px);
        right = Math.max(right, px);
        top = Math.min(top, py);
        bottom = Math.max(bottom, py);
      }
  if (left > right)
    return source;
  const sprite = document.createElement('canvas');
  const ratio = (right - left + 1) / (bottom - top + 1);
  sprite.height = Math.max(1, Math.min(targetHeight, Math.round(maxWidth / ratio)));
  sprite.width = Math.max(1, Math.round(ratio * sprite.height));
  const out = sprite.getContext('2d');
  out.imageSmoothingEnabled = false;
  out.drawImage(source, left, top, right - left + 1, bottom - top + 1, 0, 0, sprite.width, sprite.height);
  // Keep the generated artwork's native edge detail. The previous 32-pixel
  // reduction and binary-alpha pass made every catch look overly chunky.
  return sprite;
}
const characterAtlas = new Image();
const characterSpritesReady = new Promise((resolve, reject) => {
  characterAtlas.onload = () => {
    const cw = Math.floor(characterAtlas.naturalWidth / 3);
    // Explicit transparent gutters keep the next row's cap out of each crop.
    const rows = [[26, 348], [369, 704], [721, 1055], [1073, 1417]];
    for (let row = 0; row < 4; row++) {
      characterFrames[row] = [];
      const [top, bottom] = rows[row];
      for (let col = 0; col < 3; col++)
        characterFrames[row][col] = sampleSprite(characterAtlas, col * cw, top, cw, bottom - top, 56);
    }
    resolve();
  };
  characterAtlas.onerror = () => reject(new Error('Character artwork could not load.'));
});
characterAtlas.src = 'assets/fishermen-atlas.png';
// New lake-themed fish and loot share one crisp, transparent sprite pipeline.
const catchSpriteFiles = {
  10: 'sunny-crappie', 15: 'derpy-goldfish', 30: 'bass',
  60: 'walleye', 85: 'rainbow-trout', 100: 'pike',
  boot: 'old-boot', bottle: 'message-bottle', skeleton: 'skeleton-fish'
};
const catchSpritesReady = Promise.all(Object.entries(catchSpriteFiles).map(([key, file]) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const fish = Number.isFinite(Number(key));
    const sprite = sampleSprite(image, 0, 0, image.naturalWidth, image.naturalHeight, 128, fish ? (Number(key) < 60 ? 192 : 240) : 192);
    (fish ? fishSprites : lootFrames)[key] = sprite;
    resolve();
  };
  image.onerror = () => reject(new Error(`Catch artwork could not load: ${file}`));
  image.src = `assets/catches/${file}.png`;
})));
catchSpritesReady.catch(() => {});
const loonFrames = [];
const loonAtlas = new Image();
const loonSpritesReady = new Promise((resolve, reject) => {
  loonAtlas.onload = () => {
    const width = loonAtlas.naturalWidth / 2, height = loonAtlas.naturalHeight / 2;
    for (let frame = 0; frame < 4; frame++) {
      const cell = document.createElement('canvas'); cell.width = width; cell.height = height;
      const ctx = cell.getContext('2d');
      ctx.drawImage(loonAtlas, frame % 2 * width, Math.floor(frame / 2) * height, width, height, 0, 0, width, height);
      // The red eye anchors the body despite the generated wing poses' different bounds.
      let eyeX = 0, eyeY = 0, count = 0;
      try {
        const data = ctx.getImageData(0, 0, width, height).data;
        for (let y = 0; y < height; y++) for (let x = Math.floor(width * .6); x < width; x++) {
          const i = (y * width + x) * 4;
          if (data[i + 3] > 180 && data[i] > 85 && data[i] > data[i + 1] * 1.9 && data[i] > data[i + 2] * 1.9) {
            eyeX += x; eyeY += y; count++;
          }
        }
      } catch { /* Native file previews can taint the atlas; explicit anchors remain usable. */ }
      const fallback = [[616, 337], [619, 338], [616, 247], [619, 283]][frame];
      const sprite = document.createElement('canvas'); sprite.width = 240; sprite.height = 160;
      sprite.getContext('2d').imageSmoothingEnabled = false;
      sprite.getContext('2d').drawImage(cell, 0, 0, 240, 160);
      const beak = { x: ((count ? eyeX / count : fallback[0]) + 112) * 240 / width, y: (count ? eyeY / count : fallback[1]) * 160 / height };
      // Grip at the middle of the bill, slightly below the eye; the bill tip is the flight anchor.
      loonFrames.push({ sprite, beak, mouth: { x: beak.x - 10, y: beak.y + 3 } });
    }
    resolve();
  };
  loonAtlas.onerror = () => reject(new Error('Loon artwork could not load.'));
});
loonSpritesReady.catch(() => {});
loonAtlas.src = 'assets/loon-flight-atlas.png';
function drawHeldCatch(ctx, item, x, y, width, rotation) {
  const sprite = item.kind === 'fish' ? fishSprites[item.points] : lootFrames[item.kind];
  if (!sprite) return;
  const height = width * sprite.height / sprite.width;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.imageSmoothingEnabled = false;
  // The bill grips the body (or bottle neck), rather than leaving a gap above it.
  ctx.drawImage(sprite, -width * .5, -height * (item.kind === 'bottle' ? .18 : .45), width, height);
  ctx.restore();
}
function loonGripPosition(frame, x, y, scale, heading = -1) {
  return { x: x + (frame.mouth.x - frame.beak.x) * scale * heading,
    y: y + (frame.mouth.y - frame.beak.y) * scale };
}
function drawLoonWithCatch(ctx, frame, x, y, scale, heading, item, time, catchWidth) {
  if (!frame) return;
  if (item) {
    const grip = loonGripPosition(frame, x, y, scale, heading);
    const sway = reducedFishingMotion ? 0 : Math.sin(time / 180) * .065;
    drawHeldCatch(ctx, item, grip.x, grip.y, catchWidth, (item.kind === 'fish' ? 1.12 : .12) + sway);
  }
  // Draw the bill over the catch so its jaws visibly overlap the grip point.
  ctx.save(); ctx.translate(x, y); ctx.scale(heading * scale, scale); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame.sprite, -frame.beak.x, -frame.beak.y); ctx.restore();
}
function drawFlyingLoon(x, y, time, heading = -1, item = null) {
  const frame = loonFrames[reducedFishingMotion || isQuickMode() ? 1 : Math.floor(time / 90) % 4];
  const catchSprite = item && (item.kind === 'fish' ? fishSprites[item.points] : lootFrames[item.kind]);
  const catchWidth = item?.kind === 'fish' ? (item.points >= 60 ? 65 : 45) * 2 * (1 + item.points / 180) * (innerWidth < 650 ? 1.6 : 1) : catchSprite ? (item.kind === 'skeleton' ? 90 : 100) * catchSprite.width / catchSprite.height : 80;
  drawLoonWithCatch(paint, frame, x, y, 1.75, heading, item, time, catchWidth);
}
function drawExploringSwimmer(time, position) {
  const frame = reducedFishingMotion || !position.walking ? 1 : Math.floor(time * 9) % 4;
  const swimmer = typeof loonSwimmerFrames !== 'undefined' ? loonSwimmerFrames[selectedFisherman]?.[frame] : null;
  const sprite = swimmer || characterFrames[0]?.[selectedFisherman];
  if (!sprite) return;
  const p = paint, height = 130, width = height * sprite.width / sprite.height;
  const bob = reducedFishingMotion ? 0 : Math.sin(time * 6) * 2;
  p.save();p.translate(position.x, position.y + bob);p.scale(position.facing || 1, 1);
  // Clip at the actual waterline: the submerged half shares the river behind it.
  p.save();p.beginPath();p.rect(-160,-150,320,150);p.clip();
  if (!swimmer) p.rotate(Math.PI / 2);
  p.drawImage(sprite,-width/2,-height*.53,width,height);p.restore();
  p.fillStyle='#77cbbc';
  for(let i=0;i<5;i++){
    const ripple=reducedFishingMotion?0:Math.round(Math.sin(time*8+i)*2);
    p.fillRect(-width*.5+i*width*.2, ripple, 12, 3);
  }
  if(position.walking){
    p.fillStyle='#cbd1af';
    for(let i=0;i<3;i++)p.fillRect(-width*.5-18-i*20,3+i%2*5,12,3);
  }
  p.restore();
}
function drawFisherman(time, tension = 0, pull = 0, resting = false, cast = null, position = { x: 950, y: 480 }) {
  if (position.swimming) { drawExploringSwimmer(time, position); drawBridgeOverSwimmer(); return {x:position.x,y:position.y}; }
  const sprite = characterFrames[rewardStage]?.[selectedFisherman];
  // Pivot at planted feet: the angler leans back as the rod sweeps upward.
  const lean = cast ? cast.lean : reducedFishingMotion ? 0 : position.walking ? Math.sin(time * 12) * .02 : -tension * .045 - pull * .25 + Math.sin(time * 14) * .008 * tension;
  const facing = position.facing || 1;
  const tipLocal = cast ? cast.tip : resting ? { x: -170, y: -205 } : { x: 150 + tension * 28 - pull * 90, y: -160 + tension * 65 - pull * 80 };
  const tip = {
    x: position.x + facing * (tipLocal.x * Math.cos(lean) - tipLocal.y * Math.sin(lean)),
    y: position.y + tipLocal.x * Math.sin(lean) + tipLocal.y * Math.cos(lean)
  };
  if (!sprite) return tip;
  const actorHeight = 206, actorWidth = actorHeight * sprite.width / sprite.height;
  paint.save();
  paint.translate(position.x, position.y);
  paint.scale(facing, 1);
  paint.rotate(lean);
  if (resting && !position.handsFree) {
    // A straight, unloaded rod rests across the shoulder behind the neck.
    // Drawing it before the sprite lets the shoulder and hand cover it naturally.
    paint.strokeStyle = '#d6b56d'; paint.lineWidth = 5;
    paint.beginPath(); paint.moveTo(58, -111); paint.lineTo(tipLocal.x, tipLocal.y); paint.stroke();
    paint.strokeStyle = '#634632'; paint.lineWidth = 8;
    paint.beginPath(); paint.moveTo(58, -111); paint.lineTo(35, -120); paint.stroke();
  }
  paint.imageSmoothingEnabled = false;
  if (position.seated) {
    const torso = Math.round(sprite.height * .78);
    const seatedHeight = actorHeight * .78;
    paint.drawImage(sprite, 0, 0, sprite.width, torso, -actorWidth / 2, -seatedHeight, actorWidth, seatedHeight);
  } else if (position.walking && !reducedFishingMotion) {
    const cut = Math.round(sprite.height * .76), legs = sprite.height - cut;
    const torsoHeight = actorHeight * cut / sprite.height;
    paint.drawImage(sprite, 0, 0, sprite.width, cut, -actorWidth / 2, -actorHeight, actorWidth, torsoHeight);
    for (const side of [-1, 1]) {
      paint.save();
      paint.translate(side * actorWidth / 4, -actorHeight + torsoHeight);
      paint.rotate(Math.sin(time * 12) * .17 * side);
      paint.drawImage(sprite, side < 0 ? 0 : sprite.width / 2, cut, sprite.width / 2, legs,
        -actorWidth / 4, 0, actorWidth / 2, actorHeight - torsoHeight);
      paint.restore();
    }
  } else paint.drawImage(sprite, -actorWidth / 2, -actorHeight, actorWidth, actorHeight);
  if (typeof drawAnglerSunglasses === 'function') drawAnglerSunglasses(actorWidth, position.seated ? actorHeight * .74 : actorHeight);
  paint.restore();
  if (position.handsFree) return tip;
  // Redraw the traced timber layer using the same grid and origin as the world.
  // Transparent spaces leave the legs in front of the board backing.
  if (bridgeReady)
    paint.drawImage(bridgeForegroundPixels, 0, -1107, 2048, 534 * 6.4);
  if (resting) return tip;
  // The handle follows the hand, and the line uses this transformed rod tip.
  paint.save();
  paint.translate(position.x, position.y);
  paint.scale(facing, 1);
  paint.rotate(lean);
  paint.strokeStyle = '#d6b56d';
  paint.lineWidth = 5;
  paint.beginPath();
  paint.moveTo(53, -101);
  const bend = cast ? Math.sin(cast.progress * Math.PI) : 0;
  paint.quadraticCurveTo(cast ? 90 + (tipLocal.x - 150) * .5 : 90 - pull * 20,
    cast ? -195 - bend * 65 : -195 - tension * 25 - pull * 60, tipLocal.x, tipLocal.y);
  paint.stroke();
  paint.fillStyle = '#36453b';
  paint.beginPath(); paint.arc(58, -92, 8, 0, Math.PI * 2); paint.fill();
  const crank = pull && !reducedFishingMotion ? time * 20 : 0;
  paint.strokeStyle = '#dfc88d'; paint.lineWidth = 3;
  paint.beginPath(); paint.moveTo(58, -92); paint.lineTo(58 + Math.cos(crank) * 10, -92 + Math.sin(crank) * 10); paint.stroke();
  paint.restore();
  return tip;
}
function drawLoot(x, y, kind, rotation = 0) {
  const sprite = lootFrames[kind];
  if (!sprite)
    return;
  paint.save();
  paint.translate(x, y);
  paint.rotate(rotation);
  paint.imageSmoothingEnabled = false;
  const h = kind === 'skeleton' ? 90 : 100, w = h * sprite.width / sprite.height;
  paint.drawImage(sprite, -w / 2, -h / 2, w, h);
  paint.restore();
}
