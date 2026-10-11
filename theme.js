// Alternate scenery is cached once per asset; actors and water keep their colors.
let gameTheme = 'classic';
try { if (localStorage.getItem('carillion-theme') === 'autumn') gameTheme = 'autumn'; } catch {}
const autumnScenery = new WeakMap();

function setGameTheme(value, persist = true) {
  gameTheme = value === 'autumn' ? 'autumn' : 'classic';
  document.documentElement.dataset.theme = gameTheme;
  document.querySelector('meta[name="theme-color"]').content = gameTheme === 'autumn' ? '#583326' : '#0B5091';
  const select = document.querySelector('#selectTheme');
  if (select) select.value = gameTheme;
  if (persist) {
    try { localStorage.setItem('carillion-theme', gameTheme); } catch {}
  }
}

function themeSettingsMarkup() {
  return `<div class="theme-setting"><label for="selectTheme">Season</label><select id="selectTheme" aria-describedby="themeDescription"><option value="classic"${gameTheme === 'classic' ? ' selected' : ''}>Classic · summer greens</option><option value="autumn"${gameTheme === 'autumn' ? ' selected' : ''}>Autumn · copper & gold</option></select><p id="themeDescription">Change the scenery and colors. Your choice is saved on this device.</p></div>`;
}

function themedScenery(source) {
  if (gameTheme !== 'autumn') return source;
  if (autumnScenery.has(source)) return autumnScenery.get(source);
  const width = source.naturalWidth || source.width, height = source.naturalHeight || source.height;
  if (!width || !height) return source;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0);
  try {
    const frame = ctx.getImageData(0, 0, width, height), d = frame.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      // Only vegetation: teal water, timber, sprites, and transparent pixels survive.
      if (d[i + 3] && g > r * 1.12 && g > b * 1.18) {
        const light = Math.max(r, g, b) / 255;
        const gold = r / g > .65;
        const red = 45 + light * (gold ? 218 : 204);
        const green = 24 + light * (gold ? 167 : 104);
        const blue = 22 + light * 39;
        const luminance = red * .2126 + green * .7152 + blue * .0722;
        // Keep the tonal detail, with softer russet and ochre chroma.
        d[i] = Math.round(luminance + (red - luminance) * .55);
        d[i + 1] = Math.round(luminance + (green - luminance) * .55);
        d[i + 2] = Math.round(luminance + (blue - luminance) * .55);
      }
    }
    ctx.putImageData(frame, 0, 0);
    autumnScenery.set(source, canvas);
    return canvas;
  } catch {
    // Local file launches can deny pixel reads; retain the original artwork.
    autumnScenery.set(source, source);
    return source;
  }
}

document.querySelector('#modal').addEventListener('change', e => {
  if (e.target.id === 'selectTheme') setGameTheme(e.target.value);
});
setGameTheme(gameTheme, false);
