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
function drawFisherman(time, tension = 0, pull = 0, resting = false) {
  const sprite = characterFrames[rewardStage]?.[selectedFisherman];
  // Pivot at planted feet: the angler leans back as the rod sweeps upward.
  const lean = reducedFishingMotion ? 0 : -tension * .045 - pull * .25 + Math.sin(time * 14) * .008 * tension;
  const tipLocal = resting ? { x: -170, y: -205 } : { x: 150 + tension * 28 - pull * 90, y: -160 + tension * 65 - pull * 80 };
  const tip = {
    x: 950 + tipLocal.x * Math.cos(lean) - tipLocal.y * Math.sin(lean),
    y: 480 + tipLocal.x * Math.sin(lean) + tipLocal.y * Math.cos(lean)
  };
  if (!sprite) return tip;
  const actorHeight = 206, actorWidth = actorHeight * sprite.width / sprite.height;
  paint.save();
  paint.translate(950, 480);
  paint.rotate(lean);
  if (resting) {
    // A straight, unloaded rod rests across the shoulder behind the neck.
    // Drawing it before the sprite lets the shoulder and hand cover it naturally.
    paint.strokeStyle = '#d6b56d'; paint.lineWidth = 5;
    paint.beginPath(); paint.moveTo(58, -111); paint.lineTo(tipLocal.x, tipLocal.y); paint.stroke();
    paint.strokeStyle = '#634632'; paint.lineWidth = 8;
    paint.beginPath(); paint.moveTo(58, -111); paint.lineTo(35, -120); paint.stroke();
  }
  paint.imageSmoothingEnabled = false;
  paint.drawImage(sprite, -actorWidth / 2, -actorHeight, actorWidth, actorHeight);
  paint.restore();
  // Redraw the traced timber layer using the same grid and origin as the world.
  // Transparent spaces leave the legs in front of the board backing.
  if (bridgeReady)
    paint.drawImage(bridgeForegroundPixels, 0, -1107, 2048, 534 * 6.4);
  if (resting) return tip;
  // The handle follows the hand, and the line uses this transformed rod tip.
  paint.save();
  paint.translate(950, 480);
  paint.rotate(lean);
  paint.strokeStyle = '#d6b56d';
  paint.lineWidth = 5;
  paint.beginPath();
  paint.moveTo(53, -101);
  paint.quadraticCurveTo(90 - pull * 20, -195 - tension * 25 - pull * 60, tipLocal.x, tipLocal.y);
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
