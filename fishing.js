// Canvas rendering for the fishing scene.
const bridgeImage = new Image();
const bridgePixels = document.createElement('canvas');
bridgePixels.width = 320;
bridgePixels.height = 534;
// Separate foreground timber from the board backing on the original pixel grid.
const bridgeForegroundPixels = document.createElement('canvas');
bridgeForegroundPixels.width = 320;
bridgeForegroundPixels.height = 534;
function prepareBridgeForeground() {
  const ctx = bridgeForegroundPixels.getContext('2d');
  ctx.clearRect(0, 0, 320, 534);
  ctx.save();
  ctx.beginPath();
  // Two rails: exclude the pale board rows immediately below each log.
  ctx.rect(127, 233, 63, 5);
  ctx.rect(127, 241, 63, 4);
  // Stepped caps and side shadows belong to the posts, not adjacent boards.
  ctx.rect(148, 231, 5, 29);
  ctx.rect(147, 233, 1, 27);
  ctx.rect(121, 231, 5, 2);
  ctx.rect(120, 233, 7, 27);
  ctx.rect(191, 231, 5, 2);
  ctx.rect(190, 233, 7, 27);
  ctx.clip();
  ctx.drawImage(bridgePixels, 0, 0);
  ctx.restore();
}
let bridgeReady = false;
const waterMask = document.createElement('canvas');
const waterFlowPixels = document.createElement('canvas');
const waterTexturePixels = document.createElement('canvas');
waterMask.width = waterFlowPixels.width = waterTexturePixels.width = 320;
waterMask.height = waterFlowPixels.height = waterTexturePixels.height = 534;
let waterFlowFrame = -1, waterMaskReady = false;
// Conservative channel boundaries in the artwork's 320×534 pixel grid.
const WATER_CHANNEL = [[130,146,154],[145,140,166],[170,128,180],[195,115,182],[210,112,180],[260,116,190],[280,108,202],[300,100,211],[320,88,224],[340,74,235],[360,52,257],[380,24,287],[400,4,316],[534,0,320]];
function waterChannelAt(y) {
  for (let i = 1; i < WATER_CHANNEL.length; i++) {
    const a = WATER_CHANNEL[i - 1], b = WATER_CHANNEL[i];
    if (y <= b[0]) {
      const fraction = Math.max(0, (y - a[0]) / (b[0] - a[0]));
      return { left: a[1] + (b[1] - a[1]) * fraction, right: a[2] + (b[2] - a[2]) * fraction };
    }
  }
  return { left: 0, right: 320 };
}
bridgeImage.onload = () => {
  const ctx = bridgePixels.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bridgeImage, 0, 0, 320, 534);
  // One fixed pixel grid and palette: no blended shades within a pixel.
  const palette = ['#073d40', '#084b52', '#0b5968', '#11687b', '#177d88', '#26989b', '#48b9b1', '#77cbbc', '#113e2d', '#175535', '#216944', '#287d46', '#36964c', '#4aaa51', '#68b957', '#87ca63', '#a6d875', '#c0e58f', '#343b3b', '#465452', '#5c6d63', '#819382', '#a6b49a', '#cbd1af', '#e5dfb9', '#49382d', '#634632', '#815a39', '#a17143', '#bc9155', '#d5ad6c', '#efcd87'].map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
  try {
    const pixels = ctx.getImageData(0, 0, 320, 534);
    for (let i = 0; i < pixels.data.length; i += 4) {
      let best = palette[0], distance = Infinity;
      for (const color of palette) {
        const d = (pixels.data[i] - color[0]) ** 2 + (pixels.data[i + 1] - color[1]) ** 2 + (pixels.data[i + 2] - color[2]) ** 2;
        if (d < distance) {
          distance = d;
          best = color;
        }
      }
      pixels.data[i] = best[0];
      pixels.data[i + 1] = best[1];
      pixels.data[i + 2] = best[2];
    }
    ctx.putImageData(pixels, 0, 0);
    // Restrict the current to water-colored pixels, leaving banks and bridge still.
    const maskContext = waterMask.getContext('2d');
    const mask = maskContext.createImageData(320, 534);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const y = Math.floor(i / 4 / 320);
      const x = (i / 4) % 320, channel = waterChannelAt(y);
      const water = (y >= 260 || y >= 130 && y < 210) && x >= channel.left && x <= channel.right && pixels.data[i + 2] > pixels.data[i] + 25 && pixels.data[i + 2] >= pixels.data[i + 1];
      if (water) { mask.data[i] = mask.data[i + 1] = mask.data[i + 2] = mask.data[i + 3] = 255; }
    }
    maskContext.putImageData(mask, 0, 0);
    const texture = waterTexturePixels.getContext('2d');
    texture.drawImage(bridgePixels, 0, 0);
    texture.globalCompositeOperation = 'destination-in';
    texture.drawImage(waterMask, 0, 0);
    waterMaskReady = true;
  }
  catch (error) { /* file:// pages taint the canvas; keep the unquantized bridge. */
  }
  prepareBridgeForeground();
  bridgeReady = true;
};
bridgeImage.src = 'assets/fishing-world-extended.png';
const observatoryImage = new Image();
const observatoryPixels = document.createElement('canvas');
observatoryPixels.width = 96;
observatoryPixels.height = 64;
let observatoryReady = false;
observatoryImage.onload = () => {
  const ctx = observatoryPixels.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(observatoryImage, 0, 0, 96, 64);
  observatoryReady = true;
};
observatoryImage.src = 'assets/observatory.png';
// Matched back/front atlas layers let the wicker occlude the catch naturally.
const basketAtlas = new Image();
const basket = { x: 180, y: 480, width: 225, height: 225, mouthY: 467.5 };
const basketSpritesReady = new Promise((resolve, reject) => {
  basketAtlas.onload = resolve;
  basketAtlas.onerror = () => reject(new Error('Basket artwork could not load.'));
});
basketSpritesReady.catch(() => {});
basketAtlas.src = 'assets/fishing-basket-atlas.png';
function drawBasketLayer(front = false) {
  if (!basketAtlas.complete || !basketAtlas.naturalWidth) return;
  const cell = basketAtlas.naturalWidth / 2;
  paint.drawImage(basketAtlas, front ? cell : 0, 0, cell, basketAtlas.naturalHeight,
    basket.x - basket.width / 2, basket.y - basket.height / 2, basket.width, basket.height);
}
const caughtFish = [];
let fishingCatch = null;
const reducedFishingMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Bobber keyframes: [progress, horizontal run, depth, line tension].
// Goldfish toys with the bait; trout makes a heavy run; pike feints then surges.
const BITE_ORIGIN = { x: 1040, y: 920 };
const BITE_PROFILES = {
  10: { duration: 650, beats: [[0,0,0,0],[.3,3,5,.15],[.65,8,18,.55],[1,12,28,.8]] },
  15: { duration: 2400, beats: [[0,0,0,0],[.16,-8,9,.2],[.3,3,1,.05],[.46,12,15,.35],[.58,-6,2,.1],[.76,28,32,.7],[.88,14,11,.4],[1,35,42,.9]] },
  30: { duration: 1000, beats: [[0,0,0,0],[.25,8,8,.2],[.55,-16,24,.6],[1,32,38,.85]] },
  60: { duration: 1800, beats: [[0,0,0,0],[.2,8,12,.25],[.4,-15,20,.5],[.6,30,34,.8],[.78,8,18,.4],[1,48,44,.9]] },
  85: { duration: 3400, beats: [[0,0,0,0],[.17,2,8,.15],[.32,20,29,.55],[.47,70,45,.9],[.6,110,55,1],[.72,78,37,.7],[.84,130,58,1],[1,64,48,.95]] },
  100: { duration: 4400, beats: [[0,0,0,0],[.13,-12,10,.2],[.25,5,0,.05],[.39,-38,23,.5],[.53,-96,48,.95],[.64,55,38,.8],[.75,150,62,1],[.83,95,32,.6],[.92,178,65,1],[1,82,52,1]] }
};
function catchRevealDelay(item) {
  if (isQuickMode()) return 0;
  if (reducedFishingMotion) return 300;
  return (BITE_PROFILES[item.kind === 'fish' ? item.points : 10] || BITE_PROFILES[10]).duration;
}
function bitePose(item, now) {
  const profile = BITE_PROFILES[item.points] || BITE_PROFILES[10];
  const progress = Math.max(0, Math.min(1, (now - item.startedAt) / item.revealDelay));
  let left = profile.beats[0], right = profile.beats.at(-1);
  for (let i = 1; i < profile.beats.length; i++) {
    if (progress <= profile.beats[i][0]) { left = profile.beats[i - 1]; right = profile.beats[i]; break; }
  }
  const fraction = (progress - left[0]) / (right[0] - left[0]);
  const ease = fraction * fraction * (3 - 2 * fraction);
  const mix = index => left[index] + (right[index] - left[index]) * ease;
  const tension = mix(3);
  // Runs travel downstream as well as sideways; reserve room for the widest wake.
  const surfaceY = BITE_ORIGIN.y + mix(2) * 2;
  const channel = waterChannelAt((1107 + surfaceY) / 6.4);
  const x = Math.max(channel.left * 6.4 + 120, Math.min(channel.right * 6.4 - 120, BITE_ORIGIN.x + mix(1)));
  const depth = mix(2) * .45;
  return { x, y: surfaceY + depth, surfaceY, depth, tension, tilt: (right[1] - left[1]) * .004, progress };
}
const CATCH_FLIGHT_MS = reducedFishingMotion ? 0 : 1400;
const CATCH_SETTLE_MS = reducedFishingMotion ? 900 : 100;
const fishingViewport = document.getElementById('game');
let fishingWidth = innerWidth, fishingHeight = innerHeight, keyboardOpen = false;
function resizeScene() {
  const dpr = Math.min(devicePixelRatio || 1, 2), width = Math.round(fishingViewport.clientWidth * dpr), height = Math.round(fishingViewport.clientHeight * dpr);
  if (scene.width !== width)
    scene.width = width;
  if (scene.height !== height)
    scene.height = height;
}
;
function updateFishingViewport() {
  // Place the basket farther along the sandy bank, keeping it visible on phones.
  basket.x = innerWidth < 650 ? 360 : 180;
  if (fishingCatch) fishingCatch.target = shoreCatchPosition(shoreCatches.length);
  const viewport = window.visualViewport;
  const typing = document.activeElement === document.getElementById('answerInput');
  if (innerWidth !== fishingWidth) {
    fishingWidth = innerWidth;
    fishingHeight = innerHeight;
  }
  const visibleHeight = viewport?.height || innerHeight;
  const touchDevice = navigator.maxTouchPoints > 0;
  // Keep the world at its pre-keyboard size, including during keyboard dismissal.
  keyboardOpen = (typing || keyboardOpen) && (touchDevice || visibleHeight < innerHeight - 120) && (!viewport || viewport.scale === 1) && fishingHeight - visibleHeight > 120;
  if (!keyboardOpen && (!typing || !touchDevice || innerHeight >= fishingHeight))
    fishingHeight = innerHeight;
  fishingViewport.style.setProperty('--game-height', fishingHeight + 'px');
  fishingViewport.style.setProperty('--viewport-top', (keyboardOpen ? viewport?.offsetTop || 0 : 0) + 'px');
  fishingViewport.style.setProperty('--keyboard-inset', (keyboardOpen ? Math.max(0, fishingHeight - visibleHeight) : 0) + 'px');
  fishingViewport.classList.toggle('keyboard-open', keyboardOpen);
  resizeScene();
}
function drawCatchFish(x, y, points, rotation = 0) {
  const sprite = fishSprites[points];
  if (!sprite) return;
  const p = paint, s = 2 * (1 + points / 180) * (innerWidth < 650 ? 1.6 : 1);
  p.save();
  p.translate(x, y);
  p.rotate(rotation);
  p.scale(s, s);
  p.imageSmoothingEnabled = false;
  const width = points >= 60 ? 65 : 45, height = width * sprite.height / sprite.width;
  p.drawImage(sprite, -width / 2, -height / 2, width, height);
  p.restore();
}
function shoreCatchPosition(index) {
  // Bodies nest inside the small mouth; full-sized heads and tails protrude.
  return { x: basket.x + Math.sin(index * 2.4) * 12, y: basket.mouthY - 12 - Math.min(index, 8) * 2, rotation: -.35 + (index % 5) * .16 };
}
function drawCatchItem(item, x, y, rotation = 0) {
  if (item.kind === 'fish') drawCatchFish(x, y, item.points, rotation);
  else drawLoot(x, y, item.kind, rotation);
}
function drawBasketCatches() {
  // Older fish sit below the visible top of the pile; no clipping or scaling
  // cuts off the fish projecting above and beyond the wicker rim.
  shoreCatches.slice(-8).forEach((item, i, visible) => {
    const index = shoreCatches.length - visible.length + i, pos = shoreCatchPosition(index);
    drawCatchItem(item, pos.x, pos.y, pos.rotation);
  });
}
function drawWaterCurrent(now) {
  if (!waterMaskReady) return;
  const frame = reducedFishingMotion ? 0 : Math.floor(now / 40);
  if (frame === waterFlowFrame) return;
  waterFlowFrame = frame;
  const ctx = waterFlowPixels.getContext('2d'), time = frame * .04;
  ctx.clearRect(0, 0, 320, 534);
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = false;
  // Traveling surface waves refract the original water texture. The masked
  // source excludes rocks, plants, and timber before any displacement occurs.
  for (let y = 130; y < 532; y += 2) {
    const dx = reducedFishingMotion ? 0 : Math.round(Math.sin(y * .08 - time * .8) * 2);
    const dy = reducedFishingMotion ? 0 : Math.round(Math.sin(y * .12 - time * 1.3) * 2);
    ctx.drawImage(waterTexturePixels, 0, y + dy, 320, 2, dx, y, 320, 2);
  }
  // Advected ribbons follow the widening channel, with darker troughs and
  // broken highlights moving together instead of independently twinkling.
  for (let i = 0; i < 150; i++) {
    const speed = 6 + i % 6;
    const y = 130 + ((i * 47 + time * speed) % 404);
    const channel = waterChannelAt(y), lane = ((i * 37) % 101) / 101;
    const x = channel.left + (channel.right - channel.left) * lane + Math.sin(y * .035 + time * .7 + i) * 2;
    const width = 3 + (i % 10) * Math.min(1, (channel.right - channel.left) / 65);
    const strength = .13 + .12 * (.5 + .5 * Math.sin(time * .7 + i * 2));
    for (let tail = 0; tail < 4; tail++) {
      const bend = Math.sin(i + tail * .8 + time * .6) * 2;
      ctx.fillStyle = `rgba(7,50,64,${strength * (1 - tail / 5)})`;
      ctx.fillRect(Math.round(x + bend - 2), Math.round(y - tail * 2 + 2), Math.round(width + 3), 2);
      ctx.fillStyle = `rgba(141,213,207,${strength * (1 - tail / 5)})`;
      ctx.fillRect(Math.round(x + bend), Math.round(y - tail * 2), Math.round(width), 1);
    }
  }
  // Gentle rotating eddies where the stream opens out beside the banks.
  for (const [x, y, radius, direction] of [[110,303,10,1],[202,315,12,-1],[70,358,15,1],[257,375,14,-1]]) {
    for (let ring = 0; ring < 3; ring++) {
      ctx.strokeStyle = `rgba(131,210,199,${.2 - ring * .045})`;
      ctx.lineWidth = 1;
      const angle = time * .8 * direction + ring * 1.9;
      ctx.beginPath(); ctx.ellipse(x, y, radius + ring * 3, 3 + ring * 2, .1 * direction, angle, angle + Math.PI * 1.15); ctx.stroke();
    }
  }
  // Both the coastline and exact water pixels must agree before anything moves.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(waterMask, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}
function animateScene(now) {
  requestAnimationFrame(animateScene);
  const p = paint, w = fishingViewport.clientWidth, h = fishingViewport.clientHeight, t = reducedFishingMotion ? 0 : now / 1000, mobile = w < 650;
  p.setTransform(scene.width / w, 0, 0, scene.height / h, 0, 0);
  p.imageSmoothingEnabled = false;
  p.fillStyle = '#143f36';
  p.fillRect(0, 0, w, h);
  // Extended world uses the same horizontal grid; the bridge band begins 1107 units down.
  const worldWidth = 2048, worldHeight = worldWidth * 534 / 320, bridgeOffset = 1107;
  const scale = Math.max(w / worldWidth, h / worldHeight), iw = worldWidth * scale, ih = worldHeight * scale, ox = (w - iw) / 2;
  const worldY = Math.max(h - ih, Math.min(0, h * .44 - (bridgeOffset + 392) * scale));
  if (bridgeReady) {
    p.drawImage(bridgePixels, ox, worldY, iw, ih);
    drawWaterCurrent(now);
    p.drawImage(waterFlowPixels, ox, worldY, iw, ih);
  }
  // Keep the hill landmark in view across aspect ratios and keyboard changes.
  if (observatoryReady) {
    const besideHUD = mobile && document.body.classList.contains('playing');
    const width = Math.round(Math.min(w * (besideHUD ? .11 : .27), 220, h * .3));
    p.drawImage(observatoryPixels, Math.round(w * (besideHUD ? .01 : .025)), Math.round(h * .016), width, Math.round(width * 2 / 3));
  }
  const oy = worldY + bridgeOffset * scale;
  p.save();
  p.translate(ox, oy);
  p.scale(scale, scale);
  const reeling = !!fishingCatch && !fishingCatch.revealed;
  const animated = !reducedFishingMotion && !isQuickMode();
  const bite = reeling && animated ? bitePose(fishingCatch, now) : { x: BITE_ORIGIN.x, y: BITE_ORIGIN.y + Math.sin(t * 2) * 3, surfaceY: BITE_ORIGIN.y, depth: 0, tension: 0, tilt: 0, progress: 0 };
  // Rod and water share the same tension, so the line stays connected throughout.
  let landing = null;
  if (fishingCatch?.revealed) {
    const progress = animated ? Math.max(0, Math.min(1, (now - fishingCatch.revealedAt) / CATCH_FLIGHT_MS)) : 1;
    const start = fishingCatch.surface, target = fishingCatch.target;
    const travel = 1 - (1 - progress) ** 2;
    landing = { x: start.x + (target.x - start.x) * travel, y: start.y + (target.y - start.y) * progress - 340 * 4 * progress * (1 - progress), progress };
  }
  const tension = landing ? 1 - landing.progress : bite.tension;
  // Set the hook just before the breach, then pump the rod while reeling.
  let pull = 0;
  if (animated && fishingCatch) {
    if (!fishingCatch.revealed) {
      const strike = Math.max(0, Math.min(1, (now - fishingCatch.startedAt - fishingCatch.revealDelay + 240) / 240));
      pull = strike * strike * (3 - 2 * strike);
    } else {
      const elapsed = now - fishingCatch.revealedAt;
      const settle = Math.max(0, Math.min(1, (1 - landing.progress) / .28));
      pull = (elapsed < 180 ? 1 : .78 + Math.cos((elapsed - 180) / 110) * .18) * settle;
    }
  }
  const resting = !document.body.classList.contains('playing');
  const rodTip = drawFisherman(t, tension, pull, resting);
  const bobX = bite.x, bobY = bite.y;
  const hookX = landing ? landing.x : bobX, hookY = landing ? landing.y : bobY;
  if (!resting) {
    p.strokeStyle = '#edf0c3b0';
    p.lineWidth = 2;
    p.beginPath();
    p.moveTo(rodTip.x, rodTip.y);
    const slack = landing ? 18 : 65 * (1 - tension);
    p.quadraticCurveTo((rodTip.x + hookX) / 2 + slack, (rodTip.y + hookY) / 2 + slack, hookX, hookY);
    p.stroke();
  }
  for (let i = 0; i < 7; i++) {
    p.strokeStyle = '#c7eed330';
    p.lineWidth = 2;
    p.beginPath();
    p.ellipse(750 + (i * 113) % 520, 710 + (i * 79) % 340, 18 + Math.sin(t + i) * 7, 3, 0, 0, Math.PI * 2);
    p.stroke();
  }
  if (!resting && !landing) {
    // A submerged float disappears below the surface rather than hovering over it.
    const depth = bite.depth, visibility = Math.max(.12, 1 - depth / 35);
    p.save();
    p.translate(bobX, bite.surfaceY + Math.min(depth, 8));
    p.rotate(bite.tilt);
    p.globalAlpha = visibility;
    p.fillStyle = '#f1e2b0'; p.fillRect(-5, -14, 10, 14);
    p.fillStyle = '#ce7959'; p.fillRect(-5, 0, 10, 8);
    p.restore();
    // Expanding rings and the wake track the hidden fish, without revealing rarity.
    const rings = reeling && animated ? 4 : 1;
    for (let i = 0; i < rings; i++) {
      const pulse = reeling && animated ? ((now - fishingCatch.startedAt) / 650 + i / rings) % 1 : .35;
      p.strokeStyle = `rgba(224,242,213,${(1 - pulse) * (reeling ? .55 : .3)})`;
      p.lineWidth = reeling ? 3 : 2;
      p.beginPath(); p.ellipse(bobX, bite.surfaceY + 10, 14 + pulse * (24 + tension * 70), 4 + pulse * 15, 0, 0, Math.PI * 2); p.stroke();
    }
    if (reeling && animated) {
      p.fillStyle = '#082f3270';
      p.beginPath(); p.ellipse(bobX - 12, bite.surfaceY + 29, 22 + tension * 36, 7 + tension * 7, bite.tilt, 0, Math.PI * 2); p.fill();
      if (tension > .45) {
        p.strokeStyle = '#d5eedb90'; p.lineWidth = 3;
        p.beginPath(); p.moveTo(bobX - 30, bite.surfaceY + 19); p.quadraticCurveTo(bobX - 45, bite.surfaceY + 6, bobX - 65, bite.surfaceY + 24); p.stroke();
      }
    }
  }
  // Water droplets fan out from the breach and fall under gravity.
  if (landing && animated && landing.progress < .55) {
    const elapsed = (now - fishingCatch.revealedAt) / 1000, start = fishingCatch.surface;
    p.fillStyle = '#d6efde';
    for (let i = 0; i < 14; i++) {
      const vx = (i - 6.5) * 27, vy = -100 - (i % 4) * 45;
      p.globalAlpha = Math.max(0, 1 - elapsed * 1.8);
      p.fillRect(start.x + vx * elapsed, start.y + 9 + vy * elapsed + 310 * elapsed ** 2, 4, 7);
    }
    p.globalAlpha = 1;
  }
  // Basket back first, catches inside, then the front wicker and cloth.
  p.fillStyle = '#11271b45'; p.beginPath(); p.ellipse(basket.x, basket.y + basket.height * .41, basket.width * .375, basket.height * .065, 0, 0, Math.PI * 2); p.fill();
  drawBasketLayer();
  drawBasketCatches();
  if (landing) {
    const rotation = animated ? -.9 + (fishingCatch.target.rotation + .9) * landing.progress + Math.sin(landing.progress * 24) * .12 * (1 - landing.progress) : fishingCatch.target.rotation;
    drawCatchItem(fishingCatch, landing.x, landing.y, rotation);
  }
  // Airborne fish pass above the rim; the final drop disappears behind it.
  drawBasketLayer(true);
  p.restore();
}
;
updateFishingViewport();
addEventListener('resize', updateFishingViewport);
window.visualViewport?.addEventListener('resize', updateFishingViewport);
window.visualViewport?.addEventListener('scroll', updateFishingViewport);
document.getElementById('answerInput').addEventListener('focus', updateFishingViewport);
document.getElementById('answerInput').addEventListener('blur', updateFishingViewport);
requestAnimationFrame(animateScene);
