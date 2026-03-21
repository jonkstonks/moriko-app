/* ═══════════════════════════════════════════════
   MORIKO APP — JavaScript
   ═══════════════════════════════════════════════ */


// PocketBase: https://pocketbase.io/
import PocketBase from 'https://cdn.jsdelivr.net/npm/pocketbase/dist/pocketbase.es.mjs';

const pb = new PocketBase('https://moriko.app/pocketbase');

// ═══════════════════════════════════════════════
//  CONFIG
// ════
const CANVAS_SIZES = [
  { label: '16×16',   w: 16,  h: 16,  thumb: [13, 13] },
  { label: '32×32',   w: 32,  h: 32,  thumb: [13, 13] },
  { label: '64×64',   w: 64,  h: 64,  thumb: [13, 13] },
];

// PEN_SIZES: grid cells covered per stroke — 1×1, 2×2, 4×4
// Completely independent of zoom and pixelSize.
const PEN_SIZES = [1, 2, 4];

const ZOOM_STEPS = [0.5, 1, 2, 3, 4, 6, 8, 12, 16];
const RULER_SIZE = 26; // must match CSS --ruler-size

const PALETTE = [
  '#2d2d2d', '#ffffff', '#f4a7c0', '#f9d4e0', '#fde8e8',
  '#e8739a', '#c85888', '#7b4f7a', '#5c3d52', '#f0e0f0',
  '#d4f0e8', '#7ec8a0', '#fef3d0', '#fde0c8', '#f9c8a0',
];

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
let canvasSizeIdx  = 0;   // default: 16×16
let pixelSize      = 32;   // display px per grid cell at zoom 1× — render only, not brush
let penSize        = 1;   // brush size in grid cells — 1, 2, or 4
let zoomIdx        = 1;   // index into ZOOM_STEPS
let zoom           = 1;
let color          = '#f4a7c0';
let tool           = 'pen';
let showGrid       = true;
let painting       = false;
let lineStart      = null;
let rectStart      = null;
let undoStack      = [];
let lineSnap, rectSnap;
let pendingSizeIdx = null;
let cols, rows, grid;

// ═══════════════════════════════════════════════
//  ELEMENTS
// ═══════════════════════════════════════════════
const canvas   = document.getElementById('pixelCanvas');
const ctx      = canvas.getContext('2d');
const rulerXEl = document.getElementById('rulerX');
const rulerYEl = document.getElementById('rulerY');
const ctxRX    = rulerXEl.getContext('2d');
const ctxRY    = rulerYEl.getContext('2d');
const viewport = document.getElementById('canvasViewport');
const inner    = document.getElementById('canvasInner');


// ═══════════════════════════════════════════════
//  INIT GRID
// ═══════════════════════════════════════════════
function initGrid(sizeIdx) {
  canvasSizeIdx = sizeIdx ?? canvasSizeIdx;
  const p = CANVAS_SIZES[canvasSizeIdx];
  cols = p.w;
  rows = p.h;
  grid = new Array(cols * rows).fill(null);
  undoStack = [];
  fitZoom();
  redrawAll();
  updateLabels();
}

// ═══════════════════════════════════════════════
//  ZOOM  (no connection to pen size)
// ═══════════════════════════════════════════════
function cellPx() {
  return Math.round(pixelSize * zoom);
}

function applyZoom() {
  zoom = ZOOM_STEPS[zoomIdx];
  const cp = cellPx();
  canvas.width  = cols * cp;
  canvas.height = rows * cp;
  inner.style.width  = (canvas.width  + 16) + 'px';
  inner.style.height = (canvas.height + 16) + 'px';
  canvas.style.margin = '8px';
  updateRulers();
  redrawAll();
  updateZoomUI();
}

function fitZoom() {
  const areaW = viewport.offsetWidth  - 20;
  const areaH = viewport.offsetHeight - 20;

  if (areaW <= 0 || areaH <= 0) {
    zoomIdx = 1;
    applyZoom();
    return;
  }

  const fitScale     = Math.min(areaW / cols, areaH / rows);
  const fitZoomRatio = fitScale / pixelSize;

  let best = 0;
  for (let i = 0; i < ZOOM_STEPS.length; i++) {
    if (ZOOM_STEPS[i] <= fitZoomRatio) best = i;
  }
  zoomIdx = best;
  applyZoom();
}

function resetZoom() { fitZoom(); }

function changeZoom(dir) {
  zoomIdx = Math.max(0, Math.min(ZOOM_STEPS.length - 1, zoomIdx + dir));
  applyZoom();
}

function updateZoomUI() {
  const pct = Math.round(zoom * 100);
  document.getElementById('zoomVal').textContent  = zoom + '×';
  document.getElementById('zoomInfo').textContent = pct + '%';
}

// ═══════════════════════════════════════════════
//  RULERS
// ═══════════════════════════════════════════════
function updateRulers() {
  const cp = cellPx();
  const vW = viewport.clientWidth;
  const vH = viewport.clientHeight;
  const offX = 8;
  const offY = 8;

  // ─── Horizontal ruler (X) ───
  rulerXEl.width  = Math.max(cols * cp + 16, vW);
  rulerXEl.height = RULER_SIZE;
  rulerXEl.style.width = rulerXEl.width + 'px';

  ctxRX.fillStyle    = '#fcf0e8';
  ctxRX.fillRect(0, 0, rulerXEl.width, RULER_SIZE);
  ctxRX.strokeStyle  = '#e8d0c0';
  ctxRX.fillStyle    = '#b89880';
  ctxRX.font         = `${Math.max(8, Math.min(cp - 2, 10))}px monospace`;
  ctxRX.textAlign    = 'center';
  ctxRX.textBaseline = 'middle';
  ctxRX.lineWidth    = 1;

  const stepX = cp >= 14 ? 1 : cp >= 7 ? 2 : cp >= 4 ? 4 : 8;

  for (let c = 0; c <= cols; c++) {
    const x = offX + c * cp;
    ctxRX.beginPath();
    ctxRX.moveTo(x + 0.5, RULER_SIZE - 5);
    ctxRX.lineTo(x + 0.5, RULER_SIZE - 1);
    ctxRX.stroke();
    if (c < cols && c % stepX === 0) {
      ctxRX.fillText(String(c), offX + c * cp + cp / 2, RULER_SIZE / 2 - 1);
    }
  }

  // ─── Vertical ruler (Y) ───
  rulerYEl.width  = RULER_SIZE;
  rulerYEl.height = Math.max(rows * cp + 16, vH);
  rulerYEl.style.height = rulerYEl.height + 'px';

  ctxRY.fillStyle    = '#fcf3e8';
  ctxRY.fillRect(0, 0, RULER_SIZE, rulerYEl.height);
  ctxRY.strokeStyle  = '#e8d0c0';
  ctxRY.fillStyle    = '#b89880';
  ctxRY.lineWidth    = 1;

  const stepY = cp >= 14 ? 1 : cp >= 7 ? 2 : cp >= 4 ? 4 : 8;

  for (let r = 0; r <= rows; r++) {
    const y = offY + r * cp;
    ctxRY.beginPath();
    ctxRY.moveTo(RULER_SIZE - 5, y + 0.5);
    ctxRY.lineTo(RULER_SIZE - 1, y + 0.5);
    ctxRY.stroke();
    if (r < rows && r % stepY === 0) {
      ctxRY.save();
      ctxRY.translate(RULER_SIZE / 2, offY + r * cp + cp / 2);
      ctxRY.rotate(-Math.PI / 2);
      ctxRY.font         = `${Math.max(8, Math.min(cp - 2, 10))}px monospace`;
      ctxRY.textAlign    = 'center';
      ctxRY.textBaseline = 'middle';
      ctxRY.fillText(String(r), 0, 0);
      ctxRY.restore();
    }
  }
}

viewport.addEventListener('scroll', () => {
  rulerXEl.style.transform = `translateX(-${viewport.scrollLeft}px)`;
  rulerYEl.style.transform = `translateY(-${viewport.scrollTop}px)`;
});

// ═══════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════
function redrawAll(previewGrid) {
  const g  = previewGrid || grid;
  const cp = cellPx();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(252,241,232,0.96)' : 'rgba(248,236,224,0.96)';
      ctx.fillRect(c * cp, r * cp, cp, cp);
    }
  }

  for (let i = 0; i < g.length; i++) {
    if (!g[i]) continue;
    ctx.fillStyle = g[i];
    ctx.fillRect((i % cols) * cp, Math.floor(i / cols) * cp, cp, cp);
  }

  if (showGrid) {
    ctx.strokeStyle = 'rgba(165,123,99,0.25)';
    ctx.lineWidth   = 1;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cp + 0.5, 0);
      ctx.lineTo(c * cp + 0.5, rows * cp);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cp + 0.5);
      ctx.lineTo(cols * cp, r * cp + 0.5);
      ctx.stroke();
    }
  }
}

// ═══════════════════════════════════════════════
//  COORDINATE HELPERS
// ═══════════════════════════════════════════════
function getCell(e) {
  const rect = canvas.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  const cp   = cellPx();
  const x    = src.clientX - rect.left;
  const y    = src.clientY - rect.top;
  const c    = Math.floor(x / cp);
  const r    = Math.floor(y / cp);
  return { c, r, valid: c >= 0 && c < cols && r >= 0 && r < rows };
}

function idx(c, r) { return r * cols + c; }

function setPixel(c, r, col) {
  if (c < 0 || c >= cols || r < 0 || r >= rows) return;
  grid[idx(c, r)] = col;
}

// Paint a penSize×penSize block of grid cells centred on (c, r).
// penSize is in grid cell units — zoom has absolutely no effect on this.
function paintPen(c, r, col) {
  const half = Math.floor(penSize / 2);
  for (let dr = 0; dr < penSize; dr++) {
    for (let dc = 0; dc < penSize; dc++) {
      setPixel(c - half + dc, r - half + dr, col);
    }
  }
}

// ═══════════════════════════════════════════════
//  DRAW ALGORITHMS
// ═══════════════════════════════════════════════
function floodFill(sc, sr, fc) {
  const target = grid[idx(sc, sr)];
  if (target === fc) return;
  const stack = [[sc, sr]], visited = new Set();
  while (stack.length) {
    const [c, r] = stack.pop();
    const key = `${c},${r}`;
    if (visited.has(key) || c < 0 || c >= cols || r < 0 || r >= rows) continue;
    if (grid[idx(c, r)] !== target) continue;
    visited.add(key);
    grid[idx(c, r)] = fc;
    stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
}

function bresenham(c0, r0, c1, r1) {
  const cells = [], dc = Math.abs(c1 - c0), dr = Math.abs(r1 - r0);
  let sc = c0 < c1 ? 1 : -1, sr = r0 < r1 ? 1 : -1, err = dc - dr;
  for (;;) {
    cells.push([c0, r0]);
    if (c0 === c1 && r0 === r1) break;
    const e2 = 2 * err;
    if (e2 > -dr) { err -= dr; c0 += sc; }
    if (e2 <  dc) { err += dc; r0 += sr; }
  }
  return cells;
}

function getRect(c0, r0, c1, r1) {
  const cells = [];
  const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
  const minR = Math.min(r0, r1), maxR = Math.max(r0, r1);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (r === minR || r === maxR || c === minC || c === maxC) cells.push([c, r]);
    }
  }
  return cells;
}

// ═══════════════════════════════════════════════
//  UNDO
// ═══════════════════════════════════════════════
function pushUndo() {
  undoStack.push([...grid]);
  if (undoStack.length > 40) undoStack.shift();
}

function undoAction() {
  if (!undoStack.length) return;
  grid = undoStack.pop();
  redrawAll();
}

// ═══════════════════════════════════════════════
//  MOUSE / TOUCH EVENTS
// ═══════════════════════════════════════════════
canvas.addEventListener('mousedown',  onDown);
canvas.addEventListener('mousemove',  onMove);
canvas.addEventListener('mouseup',    onUp);
canvas.addEventListener('mouseleave', onLeave);
canvas.addEventListener('touchstart', e => { e.preventDefault(); onDown(e); }, { passive: false });
canvas.addEventListener('touchmove',  e => { e.preventDefault(); onMove(e); }, { passive: false });
canvas.addEventListener('touchend',   onUp);

canvas.addEventListener('mousemove', e => {
  const { c, r } = getCell(e);
  document.getElementById('coordInfo').textContent = `x:${c} y:${r}`;
});

function onDown(e) {
  const { c, r, valid } = getCell(e);
  if (!valid) return;
  painting = true;
  if (tool === 'pick') { setColor(grid[idx(c, r)] || '#000000'); return; }
  pushUndo();
  if (tool === 'fill') { floodFill(c, r, color); redrawAll(); return; }
  if (tool === 'line') { lineStart = { c, r }; lineSnap = [...grid]; return; }
  if (tool === 'rect') { rectStart = { c, r }; rectSnap = [...grid]; return; }
  // pen / eraser: paintPen covers penSize×penSize cells, zoom-independent
  paintPen(c, r, tool === 'eraser' ? null : color);
  redrawAll();
}

function onMove(e) {
  if (!painting) return;
  const { c, r, valid } = getCell(e);
  if (!valid) return;

  if (tool === 'pen' || tool === 'eraser') {
    paintPen(c, r, tool === 'eraser' ? null : color);
    redrawAll();
    return;
  }

  if (tool === 'line' && lineStart) {
    const p = [...lineSnap];
    bresenham(lineStart.c, lineStart.r, c, r).forEach(([pc, pr]) => {
      if (pc >= 0 && pc < cols && pr >= 0 && pr < rows) p[idx(pc, pr)] = color;
    });
    redrawAll(p);
  }

  if (tool === 'rect' && rectStart) {
    const p = [...rectSnap];
    getRect(rectStart.c, rectStart.r, c, r).forEach(([pc, pr]) => {
      if (pc >= 0 && pc < cols && pr >= 0 && pr < rows) p[idx(pc, pr)] = color;
    });
    redrawAll(p);
  }
}

function onUp(e) {
  if (!painting) { painting = false; return; }
  painting = false;
  if ((tool === 'line' || tool === 'rect') && e.type !== 'mouseleave') {
    const { c, r } = getCell(e);
    if (tool === 'line' && lineStart) {
      bresenham(lineStart.c, lineStart.r, c, r).forEach(([pc, pr]) => setPixel(pc, pr, color));
    }
    if (tool === 'rect' && rectStart) {
      getRect(rectStart.c, rectStart.r, c, r).forEach(([pc, pr]) => setPixel(pc, pr, color));
    }
    redrawAll();
  }
  lineStart = null;
  rectStart = null;
}

function onLeave() {
  painting  = false;
  lineStart = null;
  rectStart = null;
}

// ─── Scroll-wheel zoom (Ctrl/Shift + scroll) ───
viewport.addEventListener('wheel', e => {
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    e.preventDefault();
    const rect   = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + viewport.scrollLeft;
    const mouseY = e.clientY - rect.top  + viewport.scrollTop;
    const oldCp  = cellPx();

    zoomIdx = Math.max(0, Math.min(ZOOM_STEPS.length - 1, zoomIdx + (e.deltaY < 0 ? 1 : -1)));
    applyZoom();

    const ratio = cellPx() / oldCp;
    viewport.scrollLeft = mouseX * ratio - (e.clientX - rect.left);
    viewport.scrollTop  = mouseY * ratio - (e.clientY - rect.top);
  }
}, { passive: false });

// ─── Keyboard shortcuts ───
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const toolKeys = { p: 'pen', f: 'fill', r: 'rect', l: 'line', e: 'eraser', k: 'pick' };
  if (toolKeys[e.key]) setTool(toolKeys[e.key]);
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoAction(); }
  if (e.key === '+' || e.key === '=') changeZoom(+1);
  if (e.key === '-')  changeZoom(-1);
  if (e.key === '0')  resetZoom();
});

// ═══════════════════════════════════════════════
//  CANVAS SIZE BUTTONS
// ═══════════════════════════════════════════════
const sizeListEl = document.getElementById('sizeList');

CANVAS_SIZES.forEach((s, i) => {
  const btn = document.createElement('button');
  btn.className = 'sz-btn' + (i === canvasSizeIdx ? ' active' : '');

  const thumb = document.createElement('div');
  thumb.className    = 'sz-thumb';
  thumb.style.width  = s.thumb[0] + 'px';
  thumb.style.height = s.thumb[1] + 'px';

  btn.appendChild(thumb);
  btn.appendChild(document.createTextNode(s.label));
  btn.onclick = () => requestResize(i);
  sizeListEl.appendChild(btn);
});

function requestResize(i) {
  if (i === canvasSizeIdx) return;
  if (grid.some(v => v !== null)) {
    pendingSizeIdx = i;
    document.getElementById('modalOverlay').classList.add('open');
  } else {
    applySizeChange(i);
  }
}

function cancelResize() {
  pendingSizeIdx = null;
  document.getElementById('modalOverlay').classList.remove('open');
}

function confirmResize() {
  document.getElementById('modalOverlay').classList.remove('open');
  if (pendingSizeIdx !== null) {
    applySizeChange(pendingSizeIdx);
    pendingSizeIdx = null;
  }
}

function applySizeChange(i) {
  document.querySelectorAll('.sz-btn').forEach((b, j) => b.classList.toggle('active', j === i));
  initGrid(i);
}

// ═══════════════════════════════════════════════
//  PEN SIZE BUTTONS
//  1 → 1×1 cell, 2 → 2×2 cells, 4 → 4×4 cells
//  No zoom. No pixelSize. No fitZoom. Ever.
// ═══════════════════════════════════════════════
const pxRowEl = document.getElementById('pxRow');

PEN_SIZES.forEach(s => {
  const btn = document.createElement('div');
  btn.className = 'px-btn' + (s === penSize ? ' active' : '');

  const dot = document.createElement('div');
  dot.className          = 'px-dot';
  dot.style.borderRadius = '2px';
  // Visual square: 6px for s=1, 12px for s=2, 20px for s=4
  const vis = s === 1 ? 6 : s === 2 ? 12 : 20;
  dot.style.width  = vis + 'px';
  dot.style.height = vis + 'px';

  btn.appendChild(dot);
  btn.title   = s === 1 ? 'Small — 1 cell' : s === 2 ? 'Medium — 2×2 cells' : 'Large — 4×4 cells';
  btn.onclick = () => setPenSize(s);
  pxRowEl.appendChild(btn);
});

function setPenSize(s) {
  penSize = s;
  document.querySelectorAll('.px-btn').forEach((b, i) => {
    b.classList.toggle('active', PEN_SIZES[i] === s);
  });
  // Nothing else. Pen size only affects how many cells paintPen fills.
}

// ═══════════════════════════════════════════════
//  TOOL
// ═══════════════════════════════════════════════
function setTool(t) {
  tool = t;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  const map = { pen: 'toolPen', fill: 'toolFill', rect: 'toolRect', line: 'toolLine', eraser: 'toolEraser', pick: 'toolPick' };
  document.getElementById(map[t])?.classList.add('active');

  // Gray out pen size controls when not using pen or eraser
  const penActive = t === 'pen' || t === 'eraser';
  document.getElementById('penSizeSection').classList.toggle('disabled', !penActive);

  updateLabels();
}

// ═══════════════════════════════════════════════
//  COLOR PALETTE
// ═══════════════════════════════════════════════
const paletteEl = document.getElementById('palette');

PALETTE.forEach(c => {
  const sw = document.createElement('div');
  sw.className = 'sw' + (c === color ? ' active' : '');
  sw.style.background = c;
  sw.onclick = () => setColor(c);
  paletteEl.appendChild(sw);
});

function setColor(c) {
  color = c;
  const hex = /^#[0-9a-f]{6}$/i.test(c) ? c : '#f4a7c0';
  document.getElementById('customColor').value = hex;
  document.getElementById('curBox').style.background = c;
  document.getElementById('curHex').textContent = c.toUpperCase();
  document.querySelectorAll('.sw').forEach((s, i) => s.classList.toggle('active', PALETTE[i] === c));
}

setColor(color);

// ═══════════════════════════════════════════════
//  GRID TOGGLE
// ═══════════════════════════════════════════════
function toggleGrid() {
  showGrid = !showGrid;
  const el = document.getElementById('gridTog');
  el.textContent = showGrid ? '✓' : '';
  el.classList.toggle('on', showGrid);
  redrawAll();
}

// ═══════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════
function clearCanvas() {
  pushUndo();
  grid.fill(null);
  redrawAll();
}

function exportPixels(scale) {
  const s   = scale || 1;
  const tmp = document.createElement('canvas');
  tmp.width  = cols * s;
  tmp.height = rows * s;
  const tc = tmp.getContext('2d');
  tc.imageSmoothingEnabled = false;
  tc.fillStyle = '#ffffff';
  tc.fillRect(0, 0, tmp.width, tmp.height);
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) continue;
    tc.fillStyle = grid[i];
    tc.fillRect((i % cols) * s, Math.floor(i / cols) * s, s, s);
  }
  return tmp;
}

async function saveToGallery() {
  const EXPORT_SCALE = 32;
  const preview = exportPixels(EXPORT_SCALE);

  preview.toBlob(async (blob) => {
    try {
      const formData = new FormData();
      formData.append('image', blob, `sprite-${Date.now()}.png`);
      formData.append('title', `Sprite #${Date.now()}`);
      formData.append('label', CANVAS_SIZES[canvasSizeIdx].label);

      await pb.collection('drawings').create(formData);
    } catch (err) {
      console.error(err);
    }
  }, 'image/png');
}



function downloadCanvas() {
  const out = exportPixels(Math.max(4, Math.floor(512 / Math.max(cols, rows))));
  const a   = document.createElement('a');
  a.download = `pixel-studio-${Date.now()}.png`;
  a.href     = out.toDataURL('image/png');
  a.click();
}

// ═══════════════════════════════════════════════
//  LABELS
// ═══════════════════════════════════════════════
function updateLabels() {
  document.getElementById('modeLabel').textContent = tool;
  document.getElementById('gridLabel').textContent = `${cols}×${rows}`;
}



// ═══════════════════════════════════════════════
//  RESIZE OBSERVER
// ═══════════════════════════════════════════════
new ResizeObserver(() => {
  updateRulers();
}).observe(viewport);

window.addEventListener('resize', () => {
  updateRulers();
});

// ═══════════════════════════════════════════════
//  BOOT — wait for layout before measuring
// ═══════════════════════════════════════════════
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    // Set initial pen size section state (pen is default tool, so enabled)
    document.getElementById('penSizeSection').classList.toggle('disabled', !(tool === 'pen' || tool === 'eraser'));
    initGrid(canvasSizeIdx);

    // ── Wire up all buttons (needed because file is a module) ──
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => setTool(btn.dataset.tool));
    });
    document.getElementById('zoomOut').addEventListener('click', () => changeZoom(-1));
    document.getElementById('zoomIn').addEventListener('click',  () => changeZoom(+1));
    document.getElementById('zoomFit').addEventListener('click', () => resetZoom());
    document.getElementById('gridTogRow').addEventListener('click', () => toggleGrid());
    document.getElementById('customColor').addEventListener('input', e => setColor(e.target.value));
    document.getElementById('btnSave').addEventListener('click',     () => saveToGallery());
    document.getElementById('btnDownload').addEventListener('click', () => downloadCanvas());
    document.getElementById('btnUndo').addEventListener('click',     () => undoAction());
    document.getElementById('btnClear').addEventListener('click',    () => clearCanvas());
    document.getElementById('btnCancelResize').addEventListener('click',  () => cancelResize());
    document.getElementById('btnConfirmResize').addEventListener('click', () => confirmResize());
  });
});

// ═══════════════════════════════════════════════
// SERVER STORAGE SCRIPT - CURRENTLY NOY USED, POCKETBASE DB IS USED INSTEAD
// ═══════════════════════════════════════════════
//async function uploadToServer(canvas) {
//  return new Promise((resolve, reject) => {
//    canvas.toBlob(async (blob) => {
//      try {
//        const formData = new FormData();
//        formData.append('image', blob, 'sprite.png');
//
//        const res = await fetch('/upload', { // 👈 use your real endpoint
//          method: 'POST',
//          body: formData
//        });
//
//        if (!res.ok) throw new Error('Upload failed');
//
//        const data = await res.json();
//        resolve(data.url);
//      } catch (err) {
//        reject(err);
//      }
//    }, 'image/png');
//  });
//}
