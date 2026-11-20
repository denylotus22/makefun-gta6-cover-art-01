// Vice Coast Cover Studio: wires the editor — photo loading, layout and grade
// pickers, caption editing, per-panel crop by dragging, undo/redo and PNG export.
// The cover itself is drawn by ./cover.js; this file only runs the page.
import { POST_SIZES, LAYOUTS, GRADES, panelsForLayout, layoutPanels, renderCover } from './cover.js';
import { readShotPreset, applyShotPreset, markShotReady } from './shots.js';

const SAMPLES = [
  { name: 'Boulevard', file: 'boulevard', src: './samples/boulevard.jpg' },
  { name: 'Pier', file: 'pier', src: './samples/pier.jpg' },
  { name: 'Sunset', file: 'sunset', src: './samples/sunset.jpg' },
];

const PRESETS = {
  'sunset-hero': { layout: 'hero', grade: 'sunset', title: 'VICE COAST', tagline: 'Sunset Heist', titleStyle: 'sunset' },
  'neon-nights': { layout: 'trio', grade: 'neon', title: 'NEON NIGHTS', tagline: 'After Dark', titleStyle: 'neon' },
  'golden-grid': { layout: 'grid9', grade: 'golden', title: 'GOLDEN HOUR', tagline: 'Coast to Coast', titleStyle: 'white' },
  'tilted-snaps': { layout: 'tilted', grade: 'sunset', title: 'PIER PRESSURE', tagline: 'Summer, forever', titleStyle: 'sunset' },
};

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const photoStrip = document.getElementById('photoStrip');
const layoutGrid = document.getElementById('layoutGrid');
const gradeGrid = document.getElementById('gradeGrid');
const selectedPanelName = document.getElementById('selectedPanelName');
const zoomRange = document.getElementById('zoomRange');

const state = {
  layout: 'hero',
  grade: 'sunset',
  size: '1x1',
  title: 'VICE COAST',
  tagline: 'Sunset Heist',
  titleStyle: 'sunset',
  titleScale: 100,
  grain: true,
  vignette: true,
  frame: true,
  panels: panelsForLayout('hero', null),
};

let photos = []; // {name, img, sample:boolean}
let selectedPanel = 0;
let selectedPhoto = 0;
let currentRects = [];
let history = [];
let historyIndex = -1;
let renderQueued = false;
let drag = null;

function snapshotState() {
  return JSON.stringify({ ...state, panels: state.panels.map((p) => ({ ...p })) });
}

function pushHistory() {
  const snap = snapshotState();
  if (history[historyIndex] === snap) return;
  history = history.slice(0, historyIndex + 1);
  history.push(snap);
  historyIndex = history.length - 1;
  if (history.length > 60) { history.shift(); historyIndex--; }
  syncUndoButtons();
}

function restoreHistory(index) {
  const snap = JSON.parse(history[index]);
  state.layout = snap.layout;
  state.grade = snap.grade;
  state.size = snap.size;
  state.title = snap.title;
  state.tagline = snap.tagline;
  state.titleStyle = snap.titleStyle;
  state.titleScale = snap.titleScale;
  state.grain = snap.grain;
  state.vignette = snap.vignette;
  state.frame = snap.frame;
  state.panels = snap.panels;
  historyIndex = index;
  syncControlsFromState();
  queueRender();
}

function syncUndoButtons() {
  document.getElementById('undoBtn').disabled = historyIndex <= 0;
  document.getElementById('redoBtn').disabled = historyIndex >= history.length - 1;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const [w, h] = POST_SIZES[state.size];
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    currentRects = renderCover(canvas, state, photos.map((p) => p.img));
  });
}

/** Rebuilds the photo thumbnail strip from the loaded photos. */
function renderPhotoStrip() {
  photoStrip.innerHTML = '';
  photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.className = 'photo-thumb' + (i === selectedPhoto ? ' is-active' : '');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    thumb.addEventListener('click', () => {
      selectedPhoto = i;
      assignPhotoToSelectedPanel(i);
      renderPhotoStrip();
    });
    photoStrip.appendChild(thumb);
  });
}

function assignPhotoToSelectedPanel(photoIndex) {
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  panel.photo = photoIndex;
  pushHistory();
  queueRender();
}

/** Rebuilds the layout picker buttons with mini panel diagrams. */
function renderLayoutGrid() {
  layoutGrid.innerHTML = '';
  Object.entries(LAYOUTS).forEach(([key, info]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn' + (state.layout === key ? ' is-active' : '');
    btn.dataset.layout = key;
    const sw = document.createElement('span');
    sw.className = 'layout-sw';
    const rects = layoutPanels(key, 100, 100);
    sw.style.gridTemplateColumns = `repeat(${key === 'grid9' ? 3 : key === 'trio' ? 3 : 2}, 1fr)`;
    rects.forEach(() => {
      const cell = document.createElement('i');
      sw.appendChild(cell);
    });
    btn.appendChild(sw);
    btn.appendChild(document.createTextNode(info.label));
    btn.addEventListener('click', () => {
      state.layout = key;
      state.panels = panelsForLayout(key, state.panels);
      selectedPanel = 0;
      pushHistory();
      syncControlsFromState();
      queueRender();
    });
    layoutGrid.appendChild(btn);
  });
}

/** Rebuilds the grade picker buttons with sunset-to-neon swatches. */
function renderGradeGrid() {
  gradeGrid.innerHTML = '';
  Object.entries(GRADES).forEach(([key, grade]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn' + (state.grade === key ? ' is-active' : '');
    const sw = document.createElement('span');
    sw.className = 'grade-sw grade-' + key;
    btn.appendChild(sw);
    btn.appendChild(document.createTextNode(grade.label));
    btn.addEventListener('click', () => {
      state.grade = key;
      pushHistory();
      syncControlsFromState();
      queueRender();
    });
    gradeGrid.appendChild(btn);
  });
}

function syncControlsFromState() {
  document.getElementById('titleInput').value = state.title;
  document.getElementById('taglineInput').value = state.tagline;
  document.getElementById('titleStyleSelect').value = state.titleStyle;
  document.getElementById('titleSizeRange').value = state.titleScale;
  document.getElementById('grainToggle').checked = state.grain;
  document.getElementById('vignetteToggle').checked = state.vignette;
  document.getElementById('frameToggle').checked = state.frame;
  selectedPanelName.textContent = String(selectedPanel + 1);
  const panel = state.panels[selectedPanel];
  if (panel) zoomRange.value = String(panel.zoom);
  document.querySelectorAll('.size-btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.size === state.size);
  });
  renderLayoutGrid();
  renderGradeGrid();
  renderPhotoStrip();
}

/** Maps a pointer event on the preview canvas to a panel index, or -1. */
function panelAtEvent(event) {
  const box = canvas.getBoundingClientRect();
  const x = ((event.clientX - box.left) / box.width) * canvas.width;
  const y = ((event.clientY - box.top) / box.height) * canvas.height;
  for (let i = 0; i < currentRects.length; i++) {
    const [fx, fy, fw, fh] = currentRects[i];
    if (x >= fx * canvas.width && x <= (fx + fw) * canvas.width && y >= fy * canvas.height && y <= (fy + fh) * canvas.height) return i;
  }
  return -1;
}

canvas.addEventListener('pointerdown', (event) => {
  const index = panelAtEvent(event);
  if (index < 0) return;
  selectedPanel = index;
  selectedPanelName.textContent = String(index + 1);
  const panel = state.panels[index];
  zoomRange.value = String(panel.zoom);
  canvas.setPointerCapture(event.pointerId);
  drag = { x: event.clientX, y: event.clientY, moved: false };
  queueRender();
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const box = canvas.getBoundingClientRect();
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  const rect = currentRects[selectedPanel];
  if (!rect) return;
  const dx = (event.clientX - drag.x) / box.width;
  const dy = (event.clientY - drag.y) / box.height;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox + dx / rect[2]));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy + dy / rect[3]));
  drag.x = event.clientX;
  drag.y = event.clientY;
  queueRender();
});

canvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) pushHistory();
  drag = null;
});

/** Exports the current cover at one size as a PNG download. */
function exportCover(sizeKey) {
  const [w, h] = POST_SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const savedSize = state.size;
  state.size = sizeKey;
  renderCover(off, state, photos.map((p) => p.img));
  state.size = savedSize;
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-coast-cover-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(a.download);
    }, 'image/png');
  });
}

document.getElementById('exportBtn').addEventListener('click', async () => {
  const name = await exportCover(state.size);
  status.textContent = `Saved ${name}`;
});

document.getElementById('exportAllBtn').addEventListener('click', async () => {
  for (const key of Object.keys(POST_SIZES)) {
    await exportCover(key);
  }
  status.textContent = 'Saved all 4 sizes as PNG';
});

document.getElementById('photoInput').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      photos.push({ name: file.name.replace(/\.[^.]+$/, ''), img, sample: false });
    } catch {
      status.textContent = `Could not read ${file.name}`;
    }
  }
  if (files.length) {
    selectedPhoto = photos.length - 1;
    assignPhotoToSelectedPanel(selectedPhoto);
    renderPhotoStrip();
    status.textContent = `${files.length} photo${files.length > 1 ? 's' : ''} added`;
  }
  event.target.value = '';
});

document.getElementById('fillAllBtn').addEventListener('click', () => {
  state.panels.forEach((panel) => { panel.photo = selectedPhoto; });
  pushHistory();
  queueRender();
  status.textContent = 'Every panel now uses the selected photo';
});

zoomRange.addEventListener('input', () => {
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  panel.zoom = Number(zoomRange.value);
  queueRender();
});
zoomRange.addEventListener('change', pushHistory);

document.getElementById('resetCropBtn').addEventListener('click', () => {
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  panel.zoom = 1.15;
  panel.ox = 0;
  panel.oy = 0;
  zoomRange.value = '1.15';
  pushHistory();
  queueRender();
});

document.getElementById('shuffleBtn').addEventListener('click', () => {
  state.panels.forEach((panel) => {
    panel.photo = Math.floor(Math.random() * photos.length);
  });
  pushHistory();
  queueRender();
});

document.getElementById('titleInput').addEventListener('input', (e) => { state.title = e.target.value; queueRender(); });
document.getElementById('titleInput').addEventListener('change', pushHistory);
document.getElementById('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; queueRender(); });
document.getElementById('taglineInput').addEventListener('change', pushHistory);
document.getElementById('titleStyleSelect').addEventListener('change', (e) => { state.titleStyle = e.target.value; pushHistory(); queueRender(); });
document.getElementById('titleSizeRange').addEventListener('input', (e) => { state.titleScale = Number(e.target.value); queueRender(); });
document.getElementById('titleSizeRange').addEventListener('change', pushHistory);
document.getElementById('grainToggle').addEventListener('change', (e) => { state.grain = e.target.checked; pushHistory(); queueRender(); });
document.getElementById('vignetteToggle').addEventListener('change', (e) => { state.vignette = e.target.checked; pushHistory(); queueRender(); });
document.getElementById('frameToggle').addEventListener('change', (e) => { state.frame = e.target.checked; pushHistory(); queueRender(); });

document.querySelectorAll('.size-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    pushHistory();
    syncControlsFromState();
    queueRender();
  });
});

document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    Object.assign(state, preset);
    state.panels = panelsForLayout(state.layout, state.panels);
    pushHistory();
    syncControlsFromState();
    queueRender();
  });
});

document.getElementById('undoBtn').addEventListener('click', () => {
  if (historyIndex > 0) restoreHistory(historyIndex - 1);
});
document.getElementById('redoBtn').addEventListener('click', () => {
  if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1);
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1);
    } else if (historyIndex > 0) {
      restoreHistory(historyIndex - 1);
    }
  }
});

/** Boots the app: loads samples and fonts, applies any ?shot= scene, renders. */
async function boot() {
  const preset = readShotPreset(location.search);
  let sampleNames = SAMPLES.map((s) => s.file);
  if (preset) {
    sampleNames = applyShotPreset(preset, state);
    state.panels = panelsForLayout(state.layout, state.panels);
    if (preset.shot === 'cover') document.body.classList.add('shot-cover');
  }
  const wanted = [...new Set(sampleNames)];
  const loaded = [];
  for (const file of wanted) {
    const sample = SAMPLES.find((s) => s.file === file) ?? SAMPLES[0];
    try {
      const img = await loadImage(sample.src);
      loaded.push({ name: sample.name, img, sample: true });
    } catch {
      // A missing sample still leaves the other photos usable.
    }
  }
  // Keep the canonical sample order so panel indexes stay stable.
  photos = SAMPLES.map((s) => loaded.find((l) => l.name === s.name)).filter(Boolean);
  if (!photos.length) photos = loaded;
  try {
    await Promise.race([
      Promise.all([document.fonts.load('100px Anton'), document.fonts.load('40px Pacifico')]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    // System fonts still render the cover if the vendored fonts fail.
  }
  syncControlsFromState();
  pushHistory();
  queueRender();
  if (preset) markShotReady();
}

boot();
