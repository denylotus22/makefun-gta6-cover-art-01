// Fixed scenes for screenshots: ?shot=cover draws the exported cover alone at the
// chosen post size; ?shot=editor shows the editor with a sample photo loaded.
// window.__shotReady is set once the scene has painted, so a screenshot can wait for it.

/** Reads the shot preset from the page's query string, or null when not a shot. */
export function readShotPreset(search) {
  const q = new URLSearchParams(search);
  const shot = q.get('shot');
  if (!shot) return null;
  return {
    shot,
    layout: q.get('layout') ?? 'hero',
    grade: q.get('grade') ?? 'sunset',
    size: q.get('size') ?? '1x1',
    photo: q.get('photo') ?? 'boulevard',
    photo2: q.get('photo2') ?? 'pier',
    photo3: q.get('photo3') ?? 'sunset',
    title: q.get('title') ?? 'VICE COAST',
    tagline: q.get('tagline') ?? 'Sunset Heist',
    titleStyle: q.get('titleStyle') ?? 'sunset',
  };
}

/** Applies a preset to the editor state and returns the sample names to load. */
export function applyShotPreset(preset, state) {
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.size = preset.size;
  state.title = preset.title;
  state.tagline = preset.tagline;
  state.titleStyle = preset.titleStyle;
  return [preset.photo, preset.photo2, preset.photo3];
}

/** Marks the shot ready after the next two animation frames have painted. */
export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
