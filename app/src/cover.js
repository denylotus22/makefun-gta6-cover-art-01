// Vice Coast cover renderer: draws the multi-panel poster cover onto a 2D canvas.
// Every layout is a set of photo panels over a Vice City sunset backdrop, finished
// with a bold Anton title block, a Pacifico tagline, a grade wash, grain and vignette.
// All art is original: no Rockstar logo, artwork or font is used anywhere.

/** Post sizes the app exports, in pixels. */
export const POST_SIZES = {
  '1x1': [1080, 1080],
  '4x5': [1080, 1350],
  '9x16': [1080, 1920],
  '16x9': [1920, 1080],
};

/** Panel counts per layout. */
export const LAYOUTS = {
  hero: { label: 'Hero + 3', panels: 4 },
  grid9: { label: 'Nine grid', panels: 9 },
  trio: { label: 'Trio strip', panels: 3 },
  duo: { label: 'Duo split', panels: 2 },
  fullbleed: { label: 'Full bleed', panels: 1 },
  tilted: { label: 'Tilted snaps', panels: 3 },
};

/** Colour grades: sky stops for the backdrop and the wash laid over each photo. */
export const GRADES = {
  sunset: { label: 'Vice Sunset', sky: ['#2b1040', '#7a2060', '#d6485a', '#ff7a3d', '#ffc46b'], wash: ['rgba(255,122,61,0.28)', 'rgba(255,46,136,0.30)'], tint: 'rgba(255,150,60,0.10)' },
  neon: { label: 'Neon Nights', sky: ['#12002b', '#3d0a5e', '#a4136e', '#ff2e88', '#2de2c5'], wash: ['rgba(255,46,136,0.34)', 'rgba(45,226,197,0.26)'], tint: 'rgba(255,46,136,0.12)' },
  golden: { label: 'Golden Hour', sky: ['#3a2405', '#8a4d12', '#d98a2b', '#ffb347', '#fff3c4'], wash: ['rgba(255,179,71,0.30)', 'rgba(255,220,120,0.18)'], tint: 'rgba(255,190,80,0.12)' },
  teal: { label: 'Palm Teal', sky: ['#062a2a', '#0d4d4a', '#17806e', '#2de2c5', '#ffb347'], wash: ['rgba(45,226,197,0.28)', 'rgba(255,179,71,0.22)'], tint: 'rgba(45,226,197,0.10)' },
  noir: { label: 'Noir Pink', sky: ['#0d0d12', '#23232e', '#4a2b45', '#7a2b52', '#ff2e88'], wash: ['rgba(20,20,28,0.30)', 'rgba(255,46,136,0.30)'], tint: 'rgba(255,46,136,0.08)' },
};

/** Builds a fresh panel list for a layout, keeping each panel's photo where possible. */
export function panelsForLayout(layout, previous) {
  const count = LAYOUTS[layout].panels;
  // Slightly varied default crops, so the same photo repeated across panels
  // reads as different framings, and faces (usually at the top) stay in frame.
  const ZOOMS = [1.15, 1.3, 1.05, 1.4, 1.2, 1.35, 1.1, 1.25, 1.45];
  const OXS = [0, 0.05, -0.05, 0.03, -0.04, 0.05, -0.02, 0.04, -0.03];
  const OYS = [0.1, 0.12, 0.06, 0.08, -0.04, 0.1, 0.02, 0.08, 0];
  const out = [];
  for (let i = 0; i < count; i++) {
    const old = previous && previous[i % previous.length];
    out.push(old ? { ...old } : { photo: i % 3, zoom: ZOOMS[i % 9], ox: OXS[i % 9], oy: OYS[i % 9] });
  }
  return out;
}

/** Panel rectangles for a layout, as fractions [x, y, w, h, rotationDeg]. */
export function layoutPanels(layout, W, H) {
  const g = 0.008; // white gutter between panels, as a fraction of the width
  const band = 0.24; // title band height, as a fraction of the height
  const artH = 1 - band;
  switch (layout) {
    case 'hero':
      return [
        [0, 0, 0.62, artH, 0],
        [0.62 + g, 0, 0.38 - g, artH / 3 - g / 2, 0],
        [0.62 + g, artH / 3 + g / 2, 0.38 - g, artH / 3 - g, 0],
        [0.62 + g, (2 * artH) / 3 + g / 2, 0.38 - g, artH / 3 - g / 2, 0],
      ];
    case 'grid9': {
      const cells = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          cells.push([c / 3 + (c ? g / 2 : 0), (r * artH) / 3 + (r ? g / 2 : 0), 1 / 3 - (c ? g : 0), artH / 3 - (r ? g : 0), 0]);
        }
      }
      return cells;
    }
    case 'trio':
      return [
        [0, 0, 1 / 3 - g / 2, artH, 0],
        [1 / 3 + g / 2, 0, 1 / 3 - g, artH, 0],
        [2 / 3 + g / 2, 0, 1 / 3 - g / 2, artH, 0],
      ];
    case 'duo':
      return [
        [0, 0, 0.55 - g / 2, artH, 0],
        [0.55 + g / 2, 0, 0.45 - g / 2, artH, 0],
      ];
    case 'fullbleed':
      return [[0, 0, 1, artH, 0]];
    case 'tilted':
      return [
        [0.05, 0.05, 0.44, 0.42, -6],
        [0.51, 0.03, 0.44, 0.42, 5],
        [0.27, 0.42, 0.46, 0.36, -2],
      ];
    default:
      return [[0, 0, 1, artH, 0]];
  }
}

/** Draws the sunset sky backdrop with a low sun; palms only when the backdrop
 *  itself is the art (the tilted layout), since elsewhere panels cover it and
 *  fronds would only speckle the white gutters. */
export function drawSunsetBackdrop(ctx, W, H, grade, withPalms) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  grade.sky.forEach((color, i) => sky.addColorStop(i / (grade.sky.length - 1), color));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Low sun, glowing.
  const sunX = W * 0.68;
  const sunY = H * 0.52;
  const sunR = Math.min(W, H) * 0.17;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.4);
  glow.addColorStop(0, 'rgba(255, 236, 190, 0.85)');
  glow.addColorStop(0.35, 'rgba(255, 170, 90, 0.35)');
  glow.addColorStop(1, 'rgba(255, 120, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffedbe';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Sea shimmer at the bottom of the backdrop.
  const sea = ctx.createLinearGradient(0, H * 0.78, 0, H);
  sea.addColorStop(0, 'rgba(60, 20, 70, 0)');
  sea.addColorStop(1, 'rgba(20, 8, 40, 0.55)');
  ctx.fillStyle = sea;
  ctx.fillRect(0, H * 0.78, W, H * 0.22);
  // Palms rooted at the foot of the art area, so their fronds never stray
  // into the title band below it.
  if (withPalms) {
    drawPalmSilhouette(ctx, W * 0.06, H * 0.76, Math.min(W, H) * 0.0016, 0.35);
    drawPalmSilhouette(ctx, W * 0.95, H * 0.76, Math.min(W, H) * 0.0013, -0.3);
  }
}

/** One original palm silhouette: a leaning trunk and seven drooping fronds. */
export function drawPalmSilhouette(ctx, baseX, baseY, s, lean) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.fillStyle = 'rgba(24, 8, 32, 0.92)';
  ctx.strokeStyle = 'rgba(24, 8, 32, 0.92)';
  const topX = lean * 90 * s;
  const topY = -190 * s;
  ctx.lineWidth = 11 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * 30 * s, -100 * s, topX, topY);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const angle = (-150 + i * 26) * (Math.PI / 180);
    const tipX = topX + Math.cos(angle) * 115 * s;
    const tipY = topY + Math.sin(angle) * 52 * s + 26 * s;
    const midX = topX + Math.cos(angle) * 58 * s;
    const midY = topY + Math.sin(angle) * 16 * s - 24 * s;
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws one photo cover-fit into a panel rect, with zoom/pan and the grade wash. */
export function drawPhotoPanel(ctx, img, rect, panel, grade, W, H) {
  const [fx, fy, fw, fh, rot] = rect;
  const rx = fx * W;
  const ry = fy * H;
  const rw = fw * W;
  const rh = fh * H;
  ctx.save();
  ctx.translate(rx + rw / 2, ry + rh / 2);
  if (rot) ctx.rotate((rot * Math.PI) / 180);
  ctx.translate(-rw / 2, -rh / 2);
  if (rot) {
    // Instant-photo white border.
    ctx.fillStyle = '#fdf8f2';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.min(W, H) * 0.02;
    ctx.shadowOffsetY = Math.min(W, H) * 0.008;
    ctx.fillRect(-rw * 0.03, -rh * 0.03, rw * 1.06, rh * 1.12);
    ctx.shadowColor = 'transparent';
  }
  ctx.beginPath();
  ctx.rect(0, 0, rw, rh);
  ctx.clip();
  if (img) {
    const base = Math.max(rw / img.naturalWidth, rh / img.naturalHeight) * panel.zoom;
    const dw = img.naturalWidth * base;
    const dh = img.naturalHeight * base;
    // Clamp the pan so the photo never leaves a gap, and bias wide crops
    // toward the top of the photo, where faces usually are.
    const maxOx = Math.max(0, (dw - rw) / (2 * rw));
    const maxOy = Math.max(0, (dh - rh) / (2 * rh));
    const oxEff = Math.max(-maxOx, Math.min(maxOx, panel.ox));
    const oyEff = Math.max(-maxOy, Math.min(maxOy, panel.oy + maxOy * 0.55));
    ctx.drawImage(img, (rw - dw) / 2 + oxEff * rw, (rh - dh) / 2 + oyEff * rh, dw, dh);
  } else {
    ctx.fillStyle = '#3a2054';
    ctx.fillRect(0, 0, rw, rh);
  }
  applyGradeWash(ctx, rw, rh, grade);
  ctx.restore();
}

/** Lays the grade's colour wash over a photo already drawn at the origin. */
export function applyGradeWash(ctx, w, h, grade) {
  const wash = ctx.createLinearGradient(0, 0, w * 0.4, h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

/** Fits the title to the cover width and draws the title block across the foot. */
export function drawTitleBlock(ctx, state, W, H) {
  const bandH = H * 0.24;
  const bandY = H - bandH;
  const shade = ctx.createLinearGradient(0, bandY - H * 0.06, 0, H);
  shade.addColorStop(0, 'rgba(18, 6, 28, 0)');
  shade.addColorStop(0.45, 'rgba(18, 6, 28, 0.72)');
  shade.addColorStop(1, 'rgba(18, 6, 28, 0.92)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, bandY - H * 0.06, W, bandH + H * 0.06);
  // Thin gold rule above the tagline.
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(W * 0.08, bandY + bandH * 0.1, W * 0.84, Math.max(2, H * 0.003));

  const tagline = state.tagline.trim();
  const title = (state.title.trim() || 'VICE COAST').toUpperCase();
  const scale = (state.titleScale ?? 100) / 100;

  if (tagline) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(H * 0.042)}px Pacifico, cursive`;
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = H * 0.018;
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(tagline, W / 2, bandY + bandH * 0.26);
    ctx.restore();
  }

  // Title: Anton, fitted to the width, outlined and filled.
  let size = H * 0.115 * scale;
  ctx.font = `${Math.round(size)}px Anton, sans-serif`;
  const maxW = W * 0.92;
  while (ctx.measureText(title).width > maxW && size > H * 0.03) {
    size -= 2;
    ctx.font = `${Math.round(size)}px Anton, sans-serif`;
  }
  ctx.save();
  ctx.translate(W / 2, bandY + bandH * (tagline ? 0.62 : 0.52));
  ctx.rotate(-0.015);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.085);
  ctx.strokeStyle = 'rgba(18, 6, 28, 0.95)';
  ctx.strokeText(title, 0, 0);
  if (state.titleStyle === 'sunset') {
    const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    fill.addColorStop(0, '#fff3c4');
    fill.addColorStop(0.45, '#ffb347');
    fill.addColorStop(1, '#ff2e88');
    ctx.fillStyle = fill;
  } else if (state.titleStyle === 'neon') {
    ctx.fillStyle = '#ff5fd0';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = size * 0.22;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillText(title, 0, 0);
  ctx.restore();

  // Micro-credit line under the title.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const micro = H * 0.016;
  ctx.font = `700 ${Math.round(micro)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(245, 238, 251, 0.75)';
  const gap = W * 0.012;
  const label = 'A VICE COAST ORIGINAL  •  MADE OFFLINE';
  const labelW = ctx.measureText(label).width;
  ctx.fillText(label, W / 2, H - H * 0.035);
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(W / 2 - labelW / 2 - gap - micro * 1.4, H - H * 0.035 - micro * 0.35, micro * 1.4, micro * 0.7);
  ctx.fillRect(W / 2 + labelW / 2 + gap, H - H * 0.035 - micro * 0.35, micro * 1.4, micro * 0.7);
  ctx.restore();
}

/** Film grain from a small pre-made noise tile, tiled over the cover. */
let noiseTile = null;
export function drawGrain(ctx, W, H) {
  if (!noiseTile) {
    noiseTile = document.createElement('canvas');
    noiseTile.width = 128;
    noiseTile.height = 128;
    const nctx = noiseTile.getContext('2d');
    const data = nctx.createImageData(128, 128);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 22;
    }
    nctx.putImageData(data, 0, 0);
  }
  const pattern = ctx.createPattern(noiseTile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
}

/** Darkens the cover's corners so the title block and panels pop. */
export function drawVignette(ctx, W, H) {
  const v = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(10, 4, 18, 0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Renders the whole cover for `state` onto `canvas` (sized by the caller).
 * `photos` is the list of loaded images; a panel's `photo` indexes into it.
 */
export function renderCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width: W, height: H } = canvas;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = layoutPanels(state.layout, W, H);

  // White poster paper first: the gutters and frame show through it.
  ctx.fillStyle = state.frame ? '#fdf8f2' : '#1c0b2c';
  ctx.fillRect(0, 0, W, H);
  const inset = state.frame ? Math.max(3, Math.round(Math.min(W, H) * 0.012)) : 0;

  drawSunsetBackdrop(ctx, W, H, grade, state.layout === 'tilted');

  ctx.save();
  if (inset) {
    ctx.beginPath();
    ctx.rect(inset, inset, W - inset * 2, H - inset * 2);
    ctx.clip();
  }
  state.panels.forEach((panel, i) => {
    const rect = rects[i];
    if (!rect) return;
    const img = photos[panel.photo] ?? null;
    // Panels sit inside the frame inset.
    const shifted = [
      rect[0] * ((W - inset * 2) / W) + inset / W,
      rect[1] * ((H - inset * 2) / H) + inset / H,
      rect[2] * ((W - inset * 2) / W),
      rect[3] * ((H - inset * 2) / H),
      rect[4],
    ];
    drawPhotoPanel(ctx, img, shifted, panel, grade, W, H);
  });
  ctx.restore();

  drawTitleBlock(ctx, state, W, H);
  if (state.vignette) drawVignette(ctx, W, H);
  if (state.grain) drawGrain(ctx, W, H);

  if (state.frame) {
    ctx.strokeStyle = '#fdf8f2';
    ctx.lineWidth = inset;
    ctx.strokeRect(inset / 2, inset / 2, W - inset, H - inset);
  }
  return rects;
}
