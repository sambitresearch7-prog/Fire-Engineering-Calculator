/* ============================================================
   Fire Engineering Calculator — calc.js
   All calculation logic ported from Python source
   ============================================================ */

'use strict';

// ── Chart instances (managed globally so we can destroy & recreate) ──
const charts = {};

// ── Tab switching ──────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ── Utility ────────────────────────────────────────────────────────────
function g(id) { return parseFloat(document.getElementById(id).value); }
function s(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function show(id) { const el = document.getElementById(id); if (el) el.style.display = ''; }
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function el(id) { return document.getElementById(id); }

function fmtNum(v, dec = 2) { return isFinite(v) ? v.toFixed(dec) : '—'; }

function makeChart(canvasId, cfg) {
  if (charts[canvasId]) { charts[canvasId].destroy(); }
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  charts[canvasId] = new Chart(ctx, cfg);
}

// ── Window radiation screen toggle ─────────────────────────────────────
el('wr-use-screen').addEventListener('change', () => {
  const on = el('wr-use-screen').checked;
  el('wr-screen-row').style.display = on ? '' : 'none';
});

// ── Window Radiation Diagram (canvas) ──────────────────────────────────
function drawWRDiagram() {
  const cv = el('wr-canvas');
  if (!cv) return;
  const CW = cv.width, CH = cv.height;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, CW, CH);

  const a = parseFloat(el('wr-a').value) || 3.0;
  const b = parseFloat(el('wr-b').value) || 2.0;
  const d = parseFloat(el('wr-d').value) || 5.0;

  // ─── PLAN VIEW (top half of canvas) ───────────────────────────────
  const planH = Math.round(CH * 0.52);

  // Title
  ctx.fillStyle = '#1a2744';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PLAN VIEW (Top Down)', CW / 2, 14);

  // Layout: margins
  const ml = 50, mr = 50, mt = 22, mb = 8;
  const drawW = CW - ml - mr;
  const drawH = planH - mt - mb;

  // Scene extents in world metres: room is 5m deep, span: left edge of window
  // to target is the key geometry. Show: [room 3m deep | wall | air gap d | target]
  const roomDepth = 3.5;
  const worldW = roomDepth + d + 1.5;   // total width to show
  const worldH = Math.max(a * 1.4, 4);  // total height (a = window width in plan)
  const sc = Math.min(drawW / worldW, drawH / worldH);

  // Pixel coords: origin at top-left of plan drawing area
  const px0 = ml, py0 = mt;

  // Columns in pixels
  const wallXpx = px0 + roomDepth * sc;          // x-position of the wall
  const winCentreY = py0 + worldH * sc / 2;       // vertical centre
  const winHalfPx = (a * sc) / 2;
  const winTop = winCentreY - winHalfPx;
  const winBot = winCentreY + winHalfPx;

  // --- Fire room box (left of wall) ---
  ctx.fillStyle = '#fff2cc55';
  ctx.strokeStyle = '#b07000';
  ctx.lineWidth = 1.5;
  const roomLeft = px0;
  const roomTop  = winTop - 20;
  const roomBot  = winBot + 20;
  ctx.fillRect(roomLeft, roomTop, roomDepth * sc, roomBot - roomTop);
  ctx.strokeRect(roomLeft, roomTop, roomDepth * sc, roomBot - roomTop);
  ctx.fillStyle = '#c05000';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FIRE', roomLeft + roomDepth * sc / 2, winCentreY - 6);
  ctx.fillText('ROOM', roomLeft + roomDepth * sc / 2, winCentreY + 8);

  // --- Wall (thick vertical bar) ---
  ctx.fillStyle = '#888';
  ctx.fillRect(wallXpx - 3, roomTop, 6, roomBot - roomTop);

  // --- Window opening (gap in wall, filled blue) ---
  ctx.fillStyle = '#aad4f5cc';
  ctx.strokeStyle = '#2980b9';
  ctx.lineWidth = 2;
  ctx.fillRect(wallXpx - 3, winTop, 6, winBot - winTop);
  ctx.beginPath();
  ctx.moveTo(wallXpx - 3, winTop); ctx.lineTo(wallXpx + 3, winTop);
  ctx.moveTo(wallXpx - 3, winBot); ctx.lineTo(wallXpx + 3, winBot);
  ctx.stroke();

  // --- "WINDOW" label ---
  ctx.fillStyle = '#1e40af';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Window', wallXpx + 6, winCentreY + 3);

  // --- Target point (right of wall at distance d) ---
  const targetX = wallXpx + d * sc;
  const targetY = winCentreY;
  ctx.fillStyle = '#dc2626';
  ctx.beginPath(); ctx.arc(targetX, targetY, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Target', targetX + 10, targetY - 5);
  ctx.fillText('Point', targetX + 10, targetY + 8);

  // --- Radiation rays (3 arrows from window centre to target) ---
  ctx.strokeStyle = '#e74c3c'; ctx.fillStyle = '#e74c3c'; ctx.lineWidth = 1.8;
  [0.2, 0.5, 0.8].forEach(f => {
    const sy2 = winTop + f * (winBot - winTop);
    drawArrow(ctx, wallXpx + 4, sy2, targetX - 7, targetY);
  });

  // --- Label 'Heat Radiation' ---
  ctx.fillStyle = '#e74c3c';
  ctx.font = 'italic 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Heat Radiation', (wallXpx + targetX) / 2, winCentreY + 22);

  // --- Dimension d (double arrow above gap) ---
  ctx.strokeStyle = '#15803d'; ctx.fillStyle = '#15803d'; ctx.lineWidth = 1.2;
  const dY = winTop - 14;
  drawDoubleArrow(ctx, wallXpx, dY, targetX, dY);
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`d = ${d.toFixed(1)} m`, (wallXpx + targetX) / 2, dY - 4);

  // --- Dimension a (window width, vertical double arrow) ---
  ctx.strokeStyle = '#1e40af'; ctx.fillStyle = '#1e40af'; ctx.lineWidth = 1.2;
  const aX = wallXpx - 16;
  drawDoubleArrow(ctx, aX, winTop, aX, winBot);
  ctx.save();
  ctx.translate(aX - 12, (winTop + winBot) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`a = ${a.toFixed(1)} m`, 0, 0);
  ctx.restore();

  // ─── ELEVATION VIEW (bottom half of canvas) ────────────────────────
  const eTop = planH + 6;
  ctx.fillStyle = '#1a2744';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ELEVATION VIEW (Front Face of Wall)', CW / 2, eTop + 12);

  const eml = 52, emr = 30, emt = 22, emb = 22;
  const eW = CW - eml - emr;
  const eH = CH - eTop - emt - emb;
  const ex = eml, ey = eTop + emt;

  // Wall height: use a representative 3.5m; window is centred
  const wallHm = 3.5;
  const scE = Math.min(eW / (a + 1.5), eH / wallHm);
  const winWpx = a * scE;
  const winHpx = b * scE;
  const wallWpx = Math.min(winWpx + 60, eW);
  const wallHpx = wallHm * scE;
  const wallX = ex + (eW - wallWpx) / 2;
  const wallY = ey;

  // Window position inside wall: centred horizontally, centred vertically
  const winX = wallX + (wallWpx - winWpx) / 2;
  const winY = wallY + (wallHpx - winHpx) / 2;

  // --- Wall (4 panels around window) ---
  ctx.fillStyle = '#d4c89a';
  ctx.strokeStyle = '#7a6020'; ctx.lineWidth = 1.5;
  // left panel
  ctx.fillRect(wallX, wallY, winX - wallX, wallHpx); ctx.strokeRect(wallX, wallY, winX - wallX, wallHpx);
  // right panel
  ctx.fillRect(winX + winWpx, wallY, wallX + wallWpx - winX - winWpx, wallHpx);
  ctx.strokeRect(winX + winWpx, wallY, wallX + wallWpx - winX - winWpx, wallHpx);
  // top panel
  ctx.fillRect(winX, wallY, winWpx, winY - wallY); ctx.strokeRect(winX, wallY, winWpx, winY - wallY);
  // bottom panel (sill)
  ctx.fillRect(winX, winY + winHpx, winWpx, wallY + wallHpx - winY - winHpx);
  ctx.strokeRect(winX, winY + winHpx, winWpx, wallY + wallHpx - winY - winHpx);

  // --- Window glass ---
  ctx.fillStyle = '#aad4f5cc';
  ctx.strokeStyle = '#2980b9'; ctx.lineWidth = 2;
  ctx.fillRect(winX, winY, winWpx, winHpx);
  ctx.strokeRect(winX, winY, winWpx, winHpx);
  // cross glazing bars
  ctx.strokeStyle = '#2980b966'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(winX + winWpx / 2, winY); ctx.lineTo(winX + winWpx / 2, winY + winHpx);
  ctx.moveTo(winX, winY + winHpx / 2); ctx.lineTo(winX + winWpx, winY + winHpx / 2);
  ctx.stroke();

  // FIRE label inside window
  ctx.fillStyle = '#c0392b'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🔥 FIRE', winX + winWpx / 2, winY + winHpx / 2 + 4);

  // --- Ground line ---
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(wallX - 5, wallY + wallHpx); ctx.lineTo(wallX + wallWpx + 5, wallY + wallHpx);
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#555'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('Ground', wallX + wallWpx + 7, wallY + wallHpx + 4);

  // --- Dimension b (height) left of window ---
  ctx.strokeStyle = '#1e40af'; ctx.fillStyle = '#1e40af'; ctx.lineWidth = 1.2;
  const bX = winX - 18;
  drawDoubleArrow(ctx, bX, winY, bX, winY + winHpx);
  ctx.save();
  ctx.translate(bX - 10, winY + winHpx / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`b = ${b.toFixed(1)} m`, 0, 0);
  ctx.restore();

  // --- Dimension a (width) below window ---
  ctx.strokeStyle = '#003566'; ctx.fillStyle = '#003566'; ctx.lineWidth = 1.2;
  const aY2 = winY + winHpx + 18;
  drawDoubleArrow(ctx, winX, aY2, winX + winWpx, aY2);
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`a = ${a.toFixed(1)} m`, winX + winWpx / 2, aY2 + 12);
}

function drawArrow(ctx, x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hl = 8;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hl * Math.cos(angle - 0.4), y2 - hl * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - hl * Math.cos(angle + 0.4), y2 - hl * Math.sin(angle + 0.4));
  ctx.closePath(); ctx.fill();
}

function drawDoubleArrow(ctx, x1, y1, x2, y2) {
  drawArrow(ctx, x1, y1, x2, y2);
  drawArrow(ctx, x2, y2, x1, y1);
}

// ============================================================
// MODULE 1 — WINDOW RADIATION
// ============================================================
function calcViewFactor(a, b, d) {
  const X = a / (2 * d);
  const Y = b / (2 * d);
  const s1 = Math.sqrt(1 + X * X);
  const s2 = Math.sqrt(1 + Y * Y);
  const t1 = (X / s1) * Math.atan(Y / s1);
  const t2 = (Y / s2) * Math.atan(X / s2);
  return (2 / Math.PI) * (t1 + t2);
}

function calcWindowRadiation() {
  const a = g('wr-a'), b = g('wr-b'), d = g('wr-d');
  const Tf = g('wr-tf'), Tamb = g('wr-tamb'), eps = g('wr-eps');
  const sigma = 5.67e-11; // kW/m²K⁴

  if (a <= 0 || b <= 0 || d <= 0) { alert('Dimensions must be positive!'); return; }
  if (Tf <= Tamb) { alert('Flame temperature must be greater than ambient temperature!'); return; }
  if (eps < 0 || eps > 1) { alert('Emissivity must be between 0 and 1!'); return; }

  const F = calcViewFactor(a, b, d);
  const qFlux = eps * sigma * F * (Math.pow(Tf, 4) - Math.pow(Tamb, 4));

  s('wr-F', F.toFixed(4));
  s('wr-area', `${(a * b).toFixed(2)} m²`);
  s('wr-flux', `${qFlux.toFixed(2)} kW/m²`);

  const useScreen = el('wr-use-screen').checked;
  if (useScreen) {
    const eff = parseFloat(el('wr-screen-eff').value);
    if (eff < 0 || eff > 100) { alert('Screen effectiveness must be 0–100%!'); return; }
    const qAtt = qFlux * (1 - eff / 100);
    s('wr-flux-att', `${qAtt.toFixed(2)} kW/m²`);
    s('wr-att-detail', `${eff}% effective | −${(qFlux - qAtt).toFixed(2)} kW/m²`);
    show('wr-screen-result');
    setSafety('wr-safety', qAtt, true);
  } else {
    hide('wr-screen-result');
    setSafety('wr-safety', qFlux, false);
  }

  show('wr-results');
  drawWRDiagram();
}

function setSafety(id, q, withScreen) {
  const el_ = el(id);
  el_.className = 'safety-banner';
  const pfx = withScreen ? '⚠ With screen: ' : '';
  if (q >= 12.5) {
    el_.textContent = `${pfx}⛔ CRITICAL: Spontaneous ignition risk! (${q.toFixed(2)} kW/m²)`;
    el_.classList.add('danger');
  } else if (q >= 4.0) {
    el_.textContent = `${pfx}⚠ WARNING: Piloted ignition possible (${q.toFixed(2)} kW/m²)`;
    el_.classList.add('warning');
  } else if (q >= 1.5) {
    el_.textContent = `${pfx}⚠ CAUTION: Above safe separation threshold (${q.toFixed(2)} kW/m²)`;
    el_.classList.add('warning');
  } else {
    el_.textContent = `${pfx}✓ Within safe separation criteria (${q.toFixed(2)} kW/m²)`;
    el_.classList.add('safe');
  }
}

// ============================================================
// ALPERT CORRELATION — shared core
// ============================================================
function alpertCalc(params) {
  const { tg, chiC, Hc, Hf, spacingX, spacingY, To, Te, RTI, C, useSecondRow } = params;
  const alpha = 1055 / (tg * tg);
  const minS = Math.min(spacingX, spacingY);
  const maxS = Math.max(spacingX, spacingY);
  let R;
  if (useSecondRow) {
    R = Math.sqrt(Math.pow(minS * 1.5, 2) + Math.pow(maxS * 0.5, 2));
  } else {
    R = Math.sqrt(Math.pow(minS * 0.5, 2) + Math.pow(maxS * 0.5, 2));
  }
  const r_bar = R / (Hc - Hf);
  const dt = 0.5;
  const maxTime = 1200;

  let t = 0, T_det = To;
  const timeData = [], tempGas = [], tempDet = [], hrrData = [];
  let actTime = null, actHrr = null;

  while (t <= maxTime) {
    const Q = alpha * t * t;
    const T_det_prev = T_det;
    let T_gas = To, u_cj = 0;
    if (Q > 0) {
      const dTpl = 16.9 * Math.pow(Q, 2 / 3) / Math.pow(Hc - Hf, 5 / 3);
      const dTcj = r_bar < 0.18 ? dTpl : dTpl * 0.32 * Math.pow(r_bar, -2 / 3);
      const u_pl = 0.95 * Math.pow(Q / (Hc - Hf), 1 / 3);
      u_cj = r_bar < 0.15 ? u_pl : u_pl * 0.2 * Math.pow(r_bar, -5 / 6);
      T_gas = dTcj + To;
    }
    timeData.push(t);
    tempGas.push(T_gas);
    tempDet.push(T_det_prev);
    hrrData.push(Q);

    if (T_det_prev >= Te && actTime === null) { actTime = t; actHrr = Q; break; }

    if (u_cj > 0) {
      const dTdet = (Math.sqrt(u_cj) / RTI) * ((T_gas - To) - (1 + C / Math.sqrt(u_cj)) * (T_det_prev - To)) * dt;
      T_det = T_det_prev + dTdet;
    }
    t += dt;
  }
  return { actTime, actHrr, R, timeData, tempGas, tempDet, hrrData, Te };
}

function drawAlpertCharts(prefix, res) {
  const { timeData, tempGas, tempDet, hrrData, actTime, Te } = res;
  const actIdx = timeData.length - 1;

  makeChart(`${prefix}-chart-temp`, {
    type: 'line',
    data: {
      labels: timeData,
      datasets: [
        { label: 'Gas Temperature', data: tempGas, borderColor: '#1a56db', borderWidth: 2, pointRadius: 0, tension: 0.1 },
        { label: 'Detector Temperature', data: tempDet, borderColor: '#dc2626', borderWidth: 2, pointRadius: 0, tension: 0.1 },
        { label: 'Activation Temp', data: timeData.map(() => Te), borderColor: '#16a34a', borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0 },
        { label: 'Activation', data: timeData.map((_, i) => i === actIdx ? tempDet[actIdx] : null), borderColor: '#dc2626', pointBackgroundColor: '#dc2626', pointRadius: timeData.map((_, i) => i === actIdx ? 8 : 0), showLine: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 10 } } } },
      scales: {
        x: { title: { display: true, text: 'Time (s)', font: { size: 10 } }, ticks: { maxTicksLimit: 8, font: { size: 9 } } },
        y: { title: { display: true, text: 'Temperature (°C)', font: { size: 10 } }, ticks: { font: { size: 9 } } }
      }
    }
  });

  makeChart(`${prefix}-chart-hrr`, {
    type: 'line',
    data: {
      labels: timeData,
      datasets: [
        { label: 'Heat Release Rate', data: hrrData, borderColor: '#ea580c', backgroundColor: 'rgba(234,88,12,0.08)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.1 },
        { label: 'Activation', data: timeData.map((_, i) => i === actIdx ? hrrData[actIdx] : null), borderColor: '#dc2626', pointBackgroundColor: '#dc2626', pointRadius: timeData.map((_, i) => i === actIdx ? 8 : 0), showLine: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 10 } } } },
      scales: {
        x: { title: { display: true, text: 'Time (s)', font: { size: 10 } }, ticks: { maxTicksLimit: 8, font: { size: 9 } } },
        y: { title: { display: true, text: 'HRR (kW)', font: { size: 10 } }, ticks: { font: { size: 9 } } }
      }
    }
  });
}

// ============================================================
// MODULE 2 — SPRINKLER ACTIVATION
// ============================================================
function calcSprinkler() {
  const tg = g('sp-tg'), chiC = g('sp-chi'), Hc = g('sp-hc'), Hf = g('sp-hf');
  const sx = g('sp-sx'), sy = g('sp-sy'), To = g('sp-to'), Te = g('sp-te');
  const RTI = g('sp-rti'), useSecondRow = el('sp-2ndrow').checked;
  const C = 0.8;

  if (tg <= 0 || Hc <= Hf || Te <= To || RTI <= 0) {
    alert('Invalid inputs:\n- Growth time > 0\n- Ceiling height > Fuel height\n- Activation temp > Room temp\n- RTI > 0'); return;
  }

  const res = alpertCalc({ tg, chiC, Hc, Hf, spacingX: sx, spacingY: sy, To, Te, RTI, C, useSecondRow });

  if (res.actTime !== null) {
    s('sp-time', `${res.actTime.toFixed(1)} s`);
    s('sp-hrr', `${res.actHrr.toFixed(1)} kW`);
    s('sp-R', `${res.R.toFixed(2)} m`);
    show('sp-results');
    drawAlpertCharts('sp', res);
  } else {
    alert('Sprinkler did not activate within 1200 seconds. Check input parameters.');
  }
}

// ============================================================
// MODULE 3 — DETECTOR ACTIVATION
// ============================================================
function calcDetector() {
  const tg = g('det-tg'), chiC = g('det-chi'), Hc = g('det-hc'), Hf = g('det-hf');
  const sx = g('det-sx'), sy = g('det-sy'), To = g('det-to'), Te = g('det-te');
  const RTI = g('det-rti'), C = g('det-c');

  if (tg <= 0 || Hc <= Hf || Te <= To || RTI <= 0) {
    alert('Invalid inputs:\n- Growth time > 0\n- Ceiling height > Fuel height\n- Activation temp > Room temp\n- RTI > 0'); return;
  }

  const res = alpertCalc({ tg, chiC, Hc, Hf, spacingX: sx, spacingY: sy, To, Te, RTI, C, useSecondRow: false });

  if (res.actTime !== null) {
    s('det-time', `${res.actTime.toFixed(1)} s`);
    s('det-hrr', `${res.actHrr.toFixed(1)} kW`);
    s('det-R', `${res.R.toFixed(2)} m`);
    show('det-results');
    drawAlpertCharts('det', res);
  } else {
    alert('Detector did not activate within 1200 seconds. Check input parameters.');
  }
}

// ============================================================
// MODULE 4 — FIRE SEVERITY
// ============================================================
function calcFireSeverity() {
  const Af = g('fs-Af'), At = g('fs-At'), H = g('fs-H');
  const Av = g('fs-Av'), heq = g('fs-heq'), Ah = g('fs-Ah'), Gb = g('fs-Gb');
  const Qfd = g('fs-Qfd'), Hc = g('fs-Hc'), b = g('fs-b');

  const errors = [];
  if (Af <= 0) errors.push('Floor area must be > 0');
  if (At <= 0) errors.push('Total surface area must be > 0');
  if (H <= 0) errors.push('Height must be > 0');
  if (Av < 0) errors.push('Vertical opening area must be ≥ 0');
  if (heq <= 0) errors.push('heq must be > 0');
  if (Qfd <= 0) errors.push('Fire load density must be > 0');
  if (Hc <= 0) errors.push('Heat of combustion must be > 0');
  if (Gb < 0 || Gb > 100) errors.push('Glass breakage must be 0–100');
  if (b <= 0) errors.push('Thermal inertia b must be > 0');
  if (errors.length) { alert(errors.join('\n')); return; }

  const Av_eff = Av * 0.01 * Gb;

  // Law
  const K = 1.0;
  const Lfk = (Qfd * Af) / Hc;
  const denom_law = Math.sqrt(Math.max(Av_eff * At, 1e-18));
  const Ted_law = (K * Lfk) / denom_law;
  s('fs-law-K', K.toFixed(2));
  s('fs-law-Lfk', `${Lfk.toFixed(2)} kg`);
  s('fs-law-Ted', `${Ted_law.toFixed(2)} min`);

  // CIB
  let c;
  if (b < 12) c = 0.09;
  else if (b <= 42) c = 0.07;
  else c = 0.05;
  const denom_cib = Math.sqrt(Math.max(Av_eff * At * Math.sqrt(heq), 1e-18));
  const w = Af / denom_cib;
  const Ted_cib = c * w * Qfd;
  s('fs-cib-c', c.toFixed(4));
  s('fs-cib-w', w.toFixed(4));
  s('fs-cib-Ted', `${Ted_cib.toFixed(2)} min`);

  // Eurocode
  const Kc = 1.0;
  const b_J = b * 60.0;
  let Kb;
  if (b_J < 720) Kb = 0.07;
  else if (b_J <= 2500) Kb = 0.055;
  else Kb = 0.04;

  const alphav = Av > 0 ? Av_eff / Af : 0;
  const alphah = Ah > 0 ? Ah / Af : 0;
  const bv = 12.5 * (1 + 10.0 * alphav - alphav * alphav);
  const alphav_safe = Math.max(Math.min(alphav, 0.4), 0);
  const inner = (90.0 * Math.pow(0.4 - alphav_safe, 4)) / (1.0 + bv * alphah);
  const wf = Math.pow(6.0 / H, 0.3) * (0.62 + inner);
  const Ted_ec = Kc * Kb * wf * Qfd;
  s('fs-ec-Kc', Kc.toFixed(2));
  s('fs-ec-Kb', Kb.toFixed(4));
  s('fs-ec-bv', bv.toFixed(4));
  s('fs-ec-wf', wf.toFixed(4));
  s('fs-ec-Ted', `${Ted_ec.toFixed(2)} min`);
}

// ============================================================
// MODULE 5 — OCCUPANT MOVEMENT
// ============================================================
function calcOccupantMovement() {
  const Lr = g('om-Lr'), Wr = g('om-Wr'), Lt = g('om-Lt');
  const Ns = g('om-Ns'), Nd = g('om-Nd'), Nr = g('om-Nr');
  const No = g('om-No'), S = g('om-S'), W = g('om-W');

  if (Lr <= 0 || Wr <= 0) { alert('Enclosure dimensions must be > 0'); return; }
  if (No <= 0) { alert('Number of occupants must be > 0'); return; }
  if (S <= 0) { alert('Travel speed must be > 0'); return; }
  if (W <= 0) { alert('Cumulative exit width must be > 0'); return; }

  const Do = No / (Lr * Wr);
  const We = W - (Ns * 2 * 0.15 + Nd * 2 * 0.05 + Nr * 2 * 0.09);
  if (We <= 0) { alert(`Effective exit width We = ${We.toFixed(3)} m ≤ 0.\nIncrease exit width or reduce exits.`); return; }
  const Fs = S * Do;
  const Fa = Fs * We;
  if (Fa <= 0) { alert('Actual flow Fa ≤ 0. Check inputs.'); return; }
  const Ttr = Lt / S;
  const TQ = No / Fa;
  const Tm = Ttr + TQ;

  s('om-Do', `${Do.toFixed(4)} persons/m²`);
  s('om-We', `${We.toFixed(4)} m`);
  s('om-Fs', `${Fs.toFixed(4)} persons/s/m`);
  s('om-Fa', `${Fa.toFixed(4)} persons/s`);
  s('om-Ttr', `${Ttr.toFixed(2)} s`);
  s('om-TQ', `${TQ.toFixed(2)} s`);
  s('om-Tm', `${Tm.toFixed(2)} s`);
  s('om-Tm-min', `${(Tm / 60).toFixed(3)} min`);
  show('om-results');
  updateOccupantDiagram();
}

function updateOccupantDiagram() {
  const canvas = el('om-diagram');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  let Lr, Wr, W, Nd, Ns, Nr;
  try {
    Lr = parseFloat(el('om-Lr').value) || 20;
    Wr = parseFloat(el('om-Wr').value) || 10;
    W  = parseFloat(el('om-W').value) || 1.8;
    Nd = parseFloat(el('om-Nd').value) || 1;
    Ns = parseFloat(el('om-Ns').value) || 0;
    Nr = parseFloat(el('om-Nr').value) || 0;
  } catch { return; }

  // Scale room to fit canvas with margins
  const margin = 60;
  const scale = Math.min((cw - margin * 2) / Lr, (ch - margin * 2) / Wr);
  const ox = margin, oy = margin;
  const rw = Lr * scale, rh = Wr * scale;

  // Room fill
  ctx.fillStyle = '#f0f4ff';
  ctx.strokeStyle = '#1a2744';
  ctx.lineWidth = 2;
  ctx.fillRect(ox, oy, rw, rh);
  ctx.strokeRect(ox, oy, rw, rh);

  // Door gap on bottom wall
  const doorW = Math.min(W * scale, rw * 0.8);
  const doorX = ox + (rw - doorW) / 2;
  const gapY = oy + rh;
  // Draw walls with gap
  ctx.strokeStyle = '#1a2744'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ox, gapY); ctx.lineTo(doorX, gapY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(doorX + doorW, gapY); ctx.lineTo(ox + rw, gapY); ctx.stroke();
  // Door arrows
  ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(doorX, gapY + 18); ctx.lineTo(doorX + doorW, gapY + 18); ctx.stroke();
  ctx.fillStyle = '#8b5cf6'; ctx.font = 'bold 11px IBM Plex Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`W = ${W.toFixed(2)} m`, doorX + doorW / 2, gapY + 32);

  // Dimension arrows
  ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
  ctx.fillStyle = '#2563eb'; ctx.font = 'bold 11px IBM Plex Sans, sans-serif';
  // Lr label
  ctx.textAlign = 'center';
  ctx.fillText(`Lr = ${Lr.toFixed(1)} m`, ox + rw / 2, oy - 14);
  // Wr label
  ctx.save(); ctx.translate(ox - 28, oy + rh / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText(`Wr = ${Wr.toFixed(1)} m`, 0, 0); ctx.restore();

  // Occupants label
  ctx.fillStyle = '#555'; ctx.font = 'italic 12px IBM Plex Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Occupants (No)', ox + rw / 2, oy + rh / 2);

  // Exit type label
  const parts = [];
  if (Nd > 0) parts.push(`${Nd} door${Nd > 1 ? 's' : ''}`);
  if (Ns > 0) parts.push(`${Ns} stair${Ns > 1 ? 's' : ''}`);
  if (Nr > 0) parts.push(`${Nr} rail${Nr > 1 ? 's' : ''}`);
  if (parts.length) {
    ctx.fillStyle = '#6b7280'; ctx.font = 'italic 10px IBM Plex Sans, sans-serif';
    ctx.fillText(`Exit (${parts.join(', ')})`, doorX + doorW / 2, oy + rh - 6);
  }
}

// ============================================================
// MODULE 6 — COMPARTMENT BURNOUT
// ============================================================
function calcBurnout() {
  const Lf = g('bo-Lf'), Wf = g('bo-Wf'), H = g('bo-H');
  const h = g('bo-h'), w = g('bo-w'), ef = g('bo-ef'), Hc = g('bo-Hc');

  const errs = [];
  if (Lf <= 0) errs.push('Length Lf must be > 0');
  if (Wf <= 0) errs.push('Width Wf must be > 0');
  if (H <= 0)  errs.push('Height H must be > 0');
  if (h <= 0 || h > H) errs.push('Window height h: 0 < h ≤ H');
  if (w <= 0)  errs.push('Window width w must be > 0');
  if (ef <= 0) errs.push('Fuel load density ef must be > 0');
  if (Hc <= 0) errs.push('Heat of combustion Hc must be > 0');
  if (errs.length) { alert(errs.join('\n')); return; }

  const Af = Lf * Wf;
  const Av = h * w;
  const At = 2.0 * (Af + H * (Lf + Wf));
  const Q  = ef * Af;
  const m  = Q / Hc;
  const mb = 0.092 * Av * Math.sqrt(h);
  const tb_s = m / mb;
  const tb_min = tb_s / 60.0;

  s('bo-Af', `${Af.toFixed(3)} m²`);
  s('bo-Av', `${Av.toFixed(3)} m²`);
  s('bo-At', `${At.toFixed(3)} m²`);
  s('bo-Q',  `${Q.toFixed(2)} MJ`);
  s('bo-m',  `${m.toFixed(2)} kg`);
  s('bo-mb', `${mb.toFixed(4)} kg/s`);
  s('bo-tb-s', `${tb_s.toFixed(1)} s`);
  s('bo-tb-m', `${tb_min.toFixed(2)} min`);
  show('bo-results');
  drawBurnout3D(Lf, Wf, H, h, w);
}

function updateBurnoutDiagram() {
  const Lf = parseFloat(el('bo-Lf').value) || 5;
  const Wf = parseFloat(el('bo-Wf').value) || 4;
  const H  = parseFloat(el('bo-H').value)  || 3;
  const h  = parseFloat(el('bo-h').value)  || 1.8;
  const w  = parseFloat(el('bo-w').value)  || 1.2;
  drawBurnout3D(Lf, Wf, H, h, w);
}

function drawBurnout3D(Lf, Wf, H, h, w) {
  const canvas = el('bo-diagram');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  // ── Oblique cabinet projection: x→right, y→depth (recede at 45°, 50%), z→up ──
  const kx = 0.50, ky = 0.28;   // depth recession factors

  // Fit the projected bounding box into the canvas
  // Projected extents: width = Lf + Wf*kx, height = H + Wf*ky
  const projW = Lf + Wf * kx;
  const projH = H  + Wf * ky;

  // Margins (leave room for dimension annotations)
  const ml = 56, mr = 38, mt = 24, mb = 52;
  const drawW = cw - ml - mr;
  const drawH = ch - mt - mb;
  const sc = Math.min(drawW / projW, drawH / projH) * 0.90;

  // Canvas origin = front-bottom-left corner of the box
  const ox = ml + (drawW - projW * sc) / 2;
  const oy = mt  + drawH - (drawH - projH * sc) / 2;

  // World-to-canvas transform
  function P(x, y, z) {
    return {
      px: ox + x * sc + y * sc * kx,
      py: oy - z * sc        - y * sc * ky
    };
  }

  function face(pts, fill, strokeCol, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0].px, pts[0].py);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].px, pts[i].py);
    ctx.closePath();
    if (fill)      { ctx.fillStyle   = fill;      ctx.fill();   }
    if (strokeCol) { ctx.strokeStyle = strokeCol; ctx.lineWidth = lw || 1.4; ctx.stroke(); }
  }

  // ── Draw faces back-to-front (painter's algo) ──
  // Back wall  (y = Wf)
  face([P(0,Wf,0),P(Lf,Wf,0),P(Lf,Wf,H),P(0,Wf,H)],   '#e0f0f888', '#4a7a90', 1.0);
  // Left wall  (x = 0)
  face([P(0,0,0), P(0,Wf,0), P(0,Wf,H), P(0,0,H)],      '#fff3cc88', '#8a7a20', 1.0);
  // Floor
  face([P(0,0,0), P(Lf,0,0),P(Lf,Wf,0),P(0,Wf,0)],      '#d5e8d499', '#4a7a4a', 1.0);
  // Ceiling
  face([P(0,0,H), P(Lf,0,H),P(Lf,Wf,H),P(0,Wf,H)],      '#dae8fc88', '#4a5a8a', 1.0);
  // Right wall (x = Lf)
  face([P(Lf,0,0),P(Lf,Wf,0),P(Lf,Wf,H),P(Lf,0,H)],    '#ffe6cc88', '#8a5a20', 1.0);

  // Front wall (y = 0) panels around window
  const wz0 = H * 0.12;
  const wz1 = Math.min(wz0 + h, H * 0.94);
  const wx0 = Math.max(0, (Lf - w) / 2);
  const wx1 = Math.min(wx0 + w, Lf);
  const wallFill = '#f0ead888', wallStk = '#7a6a40';
  face([P(0,0,0),   P(wx0,0,0), P(wx0,0,H),  P(0,0,H)],            wallFill, wallStk);  // left strip
  face([P(wx1,0,0), P(Lf,0,0),  P(Lf,0,H),   P(wx1,0,H)],          wallFill, wallStk);  // right strip
  face([P(wx0,0,0), P(wx1,0,0), P(wx1,0,wz0),P(wx0,0,wz0)],        wallFill, wallStk);  // sill
  face([P(wx0,0,wz1),P(wx1,0,wz1),P(wx1,0,H),P(wx0,0,H)],          wallFill, wallStk);  // lintel
  // Window glass
  face([P(wx0,0,wz0),P(wx1,0,wz0),P(wx1,0,wz1),P(wx0,0,wz1)],      '#aad4f5dd', '#2980b9', 2.2);

  // Stylised fire on floor
  const fc = P(Lf * 0.45, Wf * 0.5, 0);
  ['#e74c3c','#f39c12','#e74c3c','#f39c12','#e74c3c'].forEach((col, i) => {
    const fx = fc.px + (i - 2) * 5;
    const fh = 14 + Math.sin(i * 1.4) * 5;
    ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fx, fc.py);
    ctx.quadraticCurveTo(fx - 4, fc.py - fh * 0.6, fx, fc.py - fh);
    ctx.stroke();
  });

  // ── Dimension annotations ──
  function dim2(x1, y1, x2, y2, label, col, offset) {
    // offset: perpendicular shift to avoid overlapping geometry
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const nx = -Math.sin(ang) * (offset || 0);
    const ny =  Math.cos(ang) * (offset || 0);
    const ax1 = x1 + nx, ay1 = y1 + ny, ax2 = x2 + nx, ay2 = y2 + ny;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.1;
    // leader lines
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ax1, ay1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(ax2, ay2); ctx.stroke();
    // arrow shaft
    ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke();
    // arrowheads
    function arrowHead(fx2, fy2, fx1, fy1) {
      const a2 = Math.atan2(fy2 - fy1, fx2 - fx1);
      const hl = 7;
      ctx.beginPath();
      ctx.moveTo(fx2, fy2);
      ctx.lineTo(fx2 - hl * Math.cos(a2 - 0.4), fy2 - hl * Math.sin(a2 - 0.4));
      ctx.lineTo(fx2 - hl * Math.cos(a2 + 0.4), fy2 - hl * Math.sin(a2 + 0.4));
      ctx.closePath(); ctx.fill();
    }
    arrowHead(ax1, ay1, ax2, ay2);
    arrowHead(ax2, ay2, ax1, ay1);
    const mx = (ax1 + ax2) / 2, my = (ay1 + ay2) / 2;
    ctx.font = 'bold 9.5px sans-serif'; ctx.textAlign = 'center';
    const perpAng = ang + Math.PI / 2;
    const lx = mx + Math.cos(perpAng) * 11;
    const ly = my + Math.sin(perpAng) * 11;
    ctx.fillText(label, lx, ly);
  }

  // Lf — along front bottom edge
  const pA = P(0,0,0), pB = P(Lf,0,0);
  dim2(pA.px, pA.py, pB.px, pB.py, `Lf = ${Lf.toFixed(1)} m`, '#c0392b', 18);

  // Wf — along left bottom receding edge
  const pC = P(0,0,0), pD = P(0,Wf,0);
  dim2(pC.px, pC.py, pD.px, pD.py, `Wf = ${Wf.toFixed(1)} m`, '#8e44ad', -18);

  // H — left vertical edge
  const pE = P(0,0,0), pF = P(0,0,H);
  dim2(pE.px, pE.py, pF.px, pF.py, `H = ${H.toFixed(1)} m`, '#27ae60', -26);

  // h (window height) on left side of window opening
  const pH1 = P(wx0,0,wz0), pH2 = P(wx0,0,wz1);
  dim2(pH1.px, pH1.py, pH2.px, pH2.py, `h=${h.toFixed(1)}m`, '#2980b9', -12);

  // w (window width) below sill
  const pW1 = P(wx0,0,wz0), pW2 = P(wx1,0,wz0);
  dim2(pW1.px, pW1.py, pW2.px, pW2.py, `w=${w.toFixed(1)}m`, '#16a085', 14);

  // Title
  ctx.fillStyle = '#1a2744'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Fire Cell — 3D View', cw / 2, 14);
}

// ============================================================
// MODULE 7 — FDS MESH SIZE
// ============================================================
function calcFDSMesh() {
  const Q = g('fds-Q'), rho = g('fds-rho'), cp = g('fds-cp');
  const gg = g('fds-g'), T = g('fds-T'), dx = g('fds-dx');

  if (Q <= 0 || rho <= 0 || cp <= 0 || gg <= 0 || T <= 0 || dx <= 0) {
    alert('All inputs must be positive values.'); return;
  }

  const dstar = Math.pow(Q / (rho * cp * T * Math.sqrt(gg)), 0.4);
  const ratio = dstar / dx;
  const cellCoarse = dstar / 4.0;
  const cellMedium = dstar / 10.0;
  const cellFine   = dstar / 16.0;

  s('fds-dstar', `${dstar.toFixed(4)} m`);
  s('fds-ratio',  `${ratio.toFixed(2)}`);
  s('fds-coarse', `${cellCoarse.toFixed(4)} m`);
  s('fds-medium', `${cellMedium.toFixed(4)} m`);
  s('fds-fine',   `${cellFine.toFixed(4)} m`);

  const ratioEl = el('fds-ratio');
  let quality;
  if (ratio < 4)       { ratioEl.style.color = '#dc2626'; quality = 'Very Coarse'; }
  else if (ratio < 10) { ratioEl.style.color = '#ea580c'; quality = 'Coarse'; }
  else if (ratio < 16) { ratioEl.style.color = '#1a56db'; quality = 'Medium'; }
  else                 { ratioEl.style.color = '#15803d'; quality = 'Fine'; }

  show('fds-results');
  drawFDSChart(Q, rho, cp, gg, T, dstar);
}

function drawFDSChart(Q_cur, rho, cp, g_val, T, dstar_cur) {
  const n = 200;
  const Qmin = Math.max(10, Q_cur * 0.05);
  const Qmax = Q_cur * 5.0;
  const Qs = Array.from({ length: n }, (_, i) => Qmin + (Qmax - Qmin) * i / (n - 1));
  const dstars = Qs.map(q => Math.pow(q / (rho * cp * T * Math.sqrt(g_val)), 0.4));

  makeChart('fds-chart', {
    type: 'line',
    data: {
      labels: Qs.map(q => q.toFixed(0)),
      datasets: [
        { label: 'Coarse (D*/dx=4)',  data: dstars.map(d => d / 4),  borderColor: '#dc2626', borderWidth: 2, pointRadius: 0, tension: 0.1 },
        { label: 'Medium (D*/dx=10)', data: dstars.map(d => d / 10), borderColor: '#ea580c', borderWidth: 2, pointRadius: 0, tension: 0.1 },
        { label: 'Fine (D*/dx=16)',   data: dstars.map(d => d / 16), borderColor: '#15803d', borderWidth: 2, pointRadius: 0, tension: 0.1 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 10 } } },
        annotation: {}
      },
      scales: {
        x: { title: { display: true, text: 'HRR Q (kW)', font: { size: 10 } }, ticks: { maxTicksLimit: 8, font: { size: 9 } } },
        y: { title: { display: true, text: 'Cell Size (m)', font: { size: 10 } }, ticks: { font: { size: 9 } } }
      }
    }
  });
}

// ============================================================
// MODULE 8 — SMOKE LAYER HEIGHT
// ============================================================
const FIRE_LOADS = {
  'Class 2, 3 or 5':             { Unsprinklered: 5.0,  Sprinklered: 1.5 },
  'Class 6':                      { Unsprinklered: 10.0, Sprinklered: 5.0 },
  'Class 7 or 8':                 { Unsprinklered: 15.0, Sprinklered: 5.0 },
  'Class 9':                      { Unsprinklered: 5.0,  Sprinklered: 1.5 },
  'Class 9b / Exhibition Hall':   { Unsprinklered: 10.0, Sprinklered: 5.0 },
};

function updateSlTableVal() {
  const cls = el('sl-class').value;
  const spr = el('sl-sprinkler').value;
  const val = FIRE_LOADS[cls][spr];
  s('sl-table-val', `${val} MW`);
}

el('sl-class').addEventListener('change', updateSlTableVal);
el('sl-sprinkler').addEventListener('change', updateSlTableVal);

function toggleSlMode() {
  const manual = document.querySelector('input[name="sl-mode"]:checked').value === 'manual';
  el('sl-table-row').style.display = manual ? 'none' : '';
  el('sl-manual-row').style.display = manual ? '' : 'none';
}

function getFireSizeMW() {
  const manual = document.querySelector('input[name="sl-mode"]:checked').value === 'manual';
  if (manual) return parseFloat(el('sl-manual-Q').value);
  return FIRE_LOADS[el('sl-class').value][el('sl-sprinkler').value];
}

function calcSmokeLayer() {
  const A  = g('sl-A'), y = g('sl-y'), Hd = g('sl-Hd'), Hp = g('sl-Hp');
  const L  = g('sl-L'), W = g('sl-W');
  // Gravity: read from field if it exists; otherwise use 9.81
  const ggEl = el('sl-g');
  const gg = (ggEl && isFinite(parseFloat(ggEl.value))) ? parseFloat(ggEl.value) : 9.81;
  const Qmw = getFireSizeMW();

  const errs = [];
  if (A <= 0)  errs.push('Floor area must be > 0');
  if (y <= 0)  errs.push('Target smoke height must be > 0');
  if (Hd <= 0) errs.push('DTS ceiling height must be > 0');
  if (Hp <= 0) errs.push('Performance ceiling height must be > 0');
  if (Hd >= Hp) errs.push('Performance height Hp should be > DTS height Hd');
  if (y >= Hd) errs.push('Target smoke height y must be < Hd');
  if (y >= Hp) errs.push('Target smoke height y must be < Hp');
  if (L <= 0 || W <= 0) errs.push('Fire dimensions must be > 0');
  if (gg <= 0) errs.push('Gravity must be > 0');
  if (Qmw <= 0) errs.push('Fire size must be > 0');
  if (errs.length) { alert(errs.join('\n')); return; }

  const Pf = 2.0 * (L + W);
  const g_sqrt = Math.sqrt(gg);
  const factor = (20.0 * A) / (Pf * g_sqrt);
  const Td = factor * (1.0 / Math.sqrt(y) - 1.0 / Math.sqrt(Hd));
  const Tp = factor * (1.0 / Math.sqrt(y) - 1.0 / Math.sqrt(Hp));
  const dT = Tp - Td;

  s('sl-Pf', `${Pf.toFixed(2)} m`);
  s('sl-Td', `${Td.toFixed(1)} s`);
  s('sl-Tp', `${Tp.toFixed(1)} s`);
  const dTel = el('sl-dT');
  dTel.textContent = `${dT >= 0 ? '+' : ''}${dT.toFixed(1)} s`;
  dTel.style.color = dT >= 0 ? '#15803d' : '#dc2626';

  show('sl-results');
  drawSmokeLayerChart(A, Pf, g_sqrt, Hd, Hp, y, Td, Tp);
}

function drawSmokeLayerChart(A, Pf, g_sqrt, Hd, Hp, yTgt, Td, Tp) {
  const factor = (20.0 * A) / (Pf * g_sqrt);
  const tMax = Math.max(Td, Tp) * 1.25 + 10;
  const n = 300;
  const times = Array.from({ length: n }, (_, i) => i * tMax / (n - 1));

  function heightAt(t, H) {
    const val = t / factor + 1.0 / Math.sqrt(H);
    return val > 0 ? 1.0 / (val * val) : H;
  }

  const yDTS  = times.map(t => heightAt(t, Hd));
  const yPerf = times.map(t => heightAt(t, Hp));

  makeChart('sl-chart', {
    type: 'line',
    data: {
      labels: times.map(t => t.toFixed(1)),
      datasets: [
        { label: `DTS (H = ${Hd.toFixed(2)} m)`,  data: yDTS,  borderColor: '#1a56db', borderWidth: 2, pointRadius: 0, tension: 0.1 },
        { label: `Perf (H = ${Hp.toFixed(2)} m)`, data: yPerf, borderColor: '#15803d', borderWidth: 2, pointRadius: 0, tension: 0.1 },
        { label: `Critical y = ${yTgt} m`,         data: times.map(() => yTgt), borderColor: '#dc2626', borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 10 } } } },
      scales: {
        x: { title: { display: true, text: 'Time (s)', font: { size: 10 } }, ticks: { maxTicksLimit: 8, font: { size: 9 } }, reverse: false },
        y: { title: { display: true, text: 'Smoke Layer Height (m)', font: { size: 10 } }, ticks: { font: { size: 9 } }, reverse: true }
      }
    }
  });
}

// ── Init diagrams on load ────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  drawWRDiagram();
  updateOccupantDiagram();
  updateBurnoutDiagram();
  updateSlTableVal();
});

// ══════════════════════════════════════════════════════════════════════════════
//  MODULE 9: NEAREST FIRE STATIONS
// ══════════════════════════════════════════════════════════════════════════════

// ── Built-in station database (auto-generated from Excel) ────────────────────
const FS_BUILTIN_STATIONS = [{"name": "Aberdeen Fire Station", "address": "20 Moray St", "locality": "Aberdeen NSW 2336", "type": "Urban", "state": "NSW", "lat": -32.16344, "lon": 150.89008}, {"name": "Abermain Fire Station", "address": "Cnr Cessnock Rd & Charles St", "locality": "Abermain NSW 2326", "type": "Urban", "state": "NSW", "lat": -32.81113, "lon": 151.43185}, {"name": "Albion Park Fire Station", "address": "3 Russell St", "locality": "Albion Park NSW 2527", "type": "Urban", "state": "NSW", "lat": -34.57281, "lon": 150.77455}, {"name": "Albury Central Fire Station", "address": "817-821 Mate St", "locality": "Albury NSW 2640", "type": "Urban", "state": "NSW", "lat": -36.06583, "lon": 146.9307}, {"name": "Albury Civic Fire Station", "address": "565 Kiewa St", "locality": "Albury NSW 2640", "type": "Urban", "state": "NSW", "lat": -36.07713, "lon": 146.91593}, {"name": "North Albury Fire Station", "address": "596 Nagle Rd", "locality": "Lavington NSW 2641", "type": "Urban", "state": "NSW", "lat": -36.03508, "lon": 146.95729}, {"name": "Alexandria Fire Station", "address": "179 Wyndham St", "locality": "Alexandria NSW 2015", "type": "Urban", "state": "NSW", "lat": -33.90496, "lon": 151.20119}, {"name": "Alstonville Fire Station", "address": "1 Mellis Circuit", "locality": "Alstonville NSW 2477", "type": "Urban", "state": "NSW", "lat": -28.84422, "lon": 153.44028}, {"name": "Armidale Fire Station", "address": "66 Barney St", "locality": "Armidale NSW 2350", "type": "Urban", "state": "NSW", "lat": -30.51785, "lon": 151.66833}, {"name": "Arncliffe Fire Station", "address": "100-106 West Botany St", "locality": "Arncliffe NSW 2205", "type": "Urban", "state": "NSW", "lat": -33.93993, "lon": 151.15164}, {"name": "Ashfield Fire Station", "address": "16 Victoria St", "locality": "Ashfield NSW 2131", "type": "Urban", "state": "NSW", "lat": -33.89133, "lon": 151.13034}, {"name": "Avalon Fire Station", "address": "689 Barrenjoey Rd", "locality": "Avalon Beach NSW 2107", "type": "Urban", "state": "NSW", "lat": -33.63429, "lon": 151.33011}, {"name": "Balgownie Fire Station", "address": "117 Balgownie Rd", "locality": "Balgownie NSW 2519", "type": "Urban", "state": "NSW", "lat": -34.38899, "lon": 150.87906}, {"name": "Ballina Fire Station", "address": "60 Tamarind Dr", "locality": "Ballina NSW 2478", "type": "Urban", "state": "NSW", "lat": -28.85301, "lon": 153.55677}, {"name": "Balmain Fire Station", "address": "391 Darling St", "locality": "Balmain NSW 2041", "type": "Urban", "state": "NSW", "lat": -33.85601, "lon": 151.17703}, {"name": "Balranald Fire Station", "address": "123 Market St", "locality": "Balranald NSW 2715", "type": "Urban", "state": "NSW", "lat": -34.63769, "lon": 143.56113}, {"name": "Bangalow Fire Station", "address": "56 Byron St", "locality": "Bangalow NSW 2479", "type": "Urban", "state": "NSW", "lat": -28.68672, "lon": 153.52419}, {"name": "Bankstown Fire Station", "address": "353 Hume Hwy", "locality": "Bankstown NSW 2200", "type": "Urban", "state": "NSW", "lat": -33.90759, "lon": 151.03393}, {"name": "Barham Fire Station", "address": "40 Wakool St", "locality": "Barham NSW 2732", "type": "Urban", "state": "NSW", "lat": -35.62796, "lon": 144.12977}, {"name": "Barraba Fire Station", "address": "73 Henry St", "locality": "Barraba NSW 2347", "type": "Urban", "state": "NSW", "lat": -30.38369, "lon": 150.60097}, {"name": "Bateau Bay Fire Station", "address": "4 Community Dr", "locality": "Bateau Bay NSW 2261", "type": "Urban", "state": "NSW", "lat": -33.37257, "lon": 151.4731}, {"name": "Batemans Bay Fire Station", "address": "1 Heradale Pde", "locality": "Batemans Bay NSW 2536", "type": "Urban", "state": "NSW", "lat": -35.7133, "lon": 150.18371}, {"name": "Bathurst Fire Station", "address": "56 Suttor St", "locality": "Bathurst NSW 2795", "type": "Urban", "state": "NSW", "lat": -33.41202, "lon": 149.55588}, {"name": "Batlow Fire Station", "address": "32 Mill Rd", "locality": "Batlow NSW 2730", "type": "Urban", "state": "NSW", "lat": -35.52359, "lon": 148.1491}, {"name": "Beecroft Fire Station", "address": "109 Beecroft Rd", "locality": "Beecroft NSW 2119", "type": "Urban", "state": "NSW", "lat": -33.75069, "lon": 151.06524}, {"name": "Bega Fire Station", "address": "114 Gipps St", "locality": "Bega NSW 2550", "type": "Urban", "state": "NSW", "lat": -36.67685, "lon": 149.84307}, {"name": "Bellbird Fire Station", "address": "44 Ruby St", "locality": "Bellbird NSW 2325", "type": "Urban", "state": "NSW", "lat": -32.85528, "lon": 151.32106}, {"name": "Bellingen Fire Station", "address": "22 Hyde St", "locality": "Bellingen NSW 2454", "type": "Urban", "state": "NSW", "lat": -30.45286, "lon": 152.89959}, {"name": "Belmont Fire Station", "address": "635 Pacific Hwy", "locality": "Belmont NSW 2280", "type": "Urban", "state": "NSW", "lat": -33.03806, "lon": 151.65979}, {"name": "Berkeley Vale Fire Station", "address": "8 Craftsman Ave", "locality": "Berkeley Vale NSW 2261", "type": "Urban", "state": "NSW", "lat": -33.32759, "lon": 151.42307}, {"name": "Berowra Fire Station", "address": "9 Berowra Waters Rd", "locality": "Berowra NSW 2081", "type": "Urban", "state": "NSW", "lat": -33.62392, "lon": 151.15024}, {"name": "Berrigan Fire Station", "address": "7 Cobram Rd", "locality": "Berrigan NSW 2712", "type": "Urban", "state": "NSW", "lat": -35.65816, "lon": 145.8092}, {"name": "Berry Fire Station", "address": "26 Prince Alfred St", "locality": "Berry NSW 2535", "type": "Urban", "state": "NSW", "lat": -34.77654, "lon": 150.69908}, {"name": "Blackheath Fire Station", "address": "223-225 Great Western Hwy", "locality": "Blackheath NSW 2785", "type": "Urban", "state": "NSW", "lat": -33.63672, "lon": 150.28524}, {"name": "Blacktown Fire Station", "address": "222 Richmond Rd", "locality": "Woodcroft NSW 2767", "type": "Urban", "state": "NSW", "lat": -33.75241, "lon": 150.88698}, {"name": "Blayney Fire Station", "address": "23 Church St", "locality": "Blayney NSW 2799", "type": "Urban", "state": "NSW", "lat": -33.5301, "lon": 149.25342}, {"name": "Bondi Fire Station", "address": "359 Old South Head Rd", "locality": "Bondi NSW 2026", "type": "Urban", "state": "NSW", "lat": -33.88241, "lon": 151.27008}, {"name": "Bonnyrigg Heights Fire Station", "address": "70 Gloucester St", "locality": "Bonnyrigg Heights NSW 2177", "type": "Urban", "state": "NSW", "lat": -33.88914, "lon": 150.86148}, {"name": "Botany Fire Station", "address": "3 Banksia St", "locality": "Botany NSW 2019", "type": "Urban", "state": "NSW", "lat": -33.94474, "lon": 151.19745}, {"name": "Bourke Fire Station", "address": "25 Mitchell St", "locality": "Bourke NSW 2840", "type": "Urban", "state": "NSW", "lat": -30.08845, "lon": 145.93666}, {"name": "Bowral Fire Station", "address": "16 Merrigang St", "locality": "Bowral NSW 2576", "type": "Urban", "state": "NSW", "lat": -34.47768, "lon": 150.41946}, {"name": "Braidwood Fire Station", "address": "13 Park Lane", "locality": "Braidwood NSW 2622", "type": "Urban", "state": "NSW", "lat": -35.44254, "lon": 149.79882}, {"name": "Branxton Greta Fire Station", "address": "2a Drinan St", "locality": "Branxton NSW 2335", "type": "Urban", "state": "NSW", "lat": -32.65856, "lon": 151.35225}, {"name": "Broken Hill Fire Station", "address": "248 Blende St", "locality": "Broken Hill NSW 2880", "type": "Urban", "state": "NSW", "lat": -31.95768, "lon": 141.46355}, {"name": "Broken Hill South Fire Station", "address": "151 Patton St", "locality": "Broken Hill NSW 2880", "type": "Urban", "state": "NSW", "lat": -31.97957, "lon": 141.46215}, {"name": "Brunswick Heads Fire Station", "address": "4 Fingal St", "locality": "Brunswick Heads NSW 2483", "type": "Urban", "state": "NSW", "lat": -28.54103, "lon": 153.55196}, {"name": "Budgewoi Fire Station", "address": "80 Scenic Dr", "locality": "Budgewoi NSW 2262", "type": "Urban", "state": "NSW", "lat": -33.23489, "lon": 151.55554}, {"name": "Bulli Fire Station", "address": "325-327 Princes Hwy", "locality": "Bulli NSW 2516", "type": "Urban", "state": "NSW", "lat": -34.33871, "lon": 150.90945}, {"name": "Bundeena Fire Station", "address": "48 Bundeena Dr", "locality": "Bundeena NSW 2230", "type": "Urban", "state": "NSW", "lat": -34.08414, "lon": 151.14466}, {"name": "Burwood Fire Station", "address": "12b Livingstone St", "locality": "Burwood NSW 2134", "type": "Urban", "state": "NSW", "lat": -33.88014, "lon": 151.10218}, {"name": "Busby Fire Station", "address": "101 Cartwright Ave", "locality": "Busby NSW 2168", "type": "Urban", "state": "NSW", "lat": -33.91891, "lon": 150.88452}, {"name": "Byron Bay Fire Station", "address": "3 Kingsley St", "locality": "Byron Bay NSW 2481", "type": "Urban", "state": "NSW", "lat": -28.64743, "lon": 153.61334}, {"name": "Cabramatta Fire Station", "address": "100 St Johns Rd", "locality": "Cabramatta NSW 2166", "type": "Urban", "state": "NSW", "lat": -33.88857, "lon": 150.92316}, {"name": "Camden Fire Station", "address": "129 Macarthur Rd", "locality": "Camden NSW 2570", "type": "Urban", "state": "NSW", "lat": -34.06458, "lon": 150.71148}, {"name": "Campbelltown Fire Station", "address": "66 Broughton St", "locality": "Campbelltown NSW 2560", "type": "Urban", "state": "NSW", "lat": -34.06692, "lon": 150.82024}, {"name": "Campsie Fire Station", "address": "294-296 Beamish St", "locality": "Campsie NSW 2194", "type": "Urban", "state": "NSW", "lat": -33.91451, "lon": 151.10381}, {"name": "Cardiff Fire Station", "address": "18 Taylor St", "locality": "Cardiff NSW 2285", "type": "Urban", "state": "NSW", "lat": -32.93769, "lon": 151.65851}, {"name": "Casino Fire Station", "address": "43 Hickey St", "locality": "Casino NSW 2470", "type": "Urban", "state": "NSW", "lat": -28.86298, "lon": 153.05141}, {"name": "Castle Hill Fire Station", "address": "380 Old Northern Rd", "locality": "Castle Hill NSW 2154", "type": "Urban", "state": "NSW", "lat": -33.71759, "lon": 151.01885}, {"name": "Cessnock Fire Station", "address": "7-11 Cessnock St", "locality": "Cessnock NSW 2325", "type": "Urban", "state": "NSW", "lat": -32.84163, "lon": 151.3561}, {"name": "Charlestown Fire Station", "address": "3 Charles St", "locality": "Charlestown NSW 2290", "type": "Urban", "state": "NSW", "lat": -32.96733, "lon": 151.69615}, {"name": "Chester Hill Fire Station", "address": "163 Waldron Rd", "locality": "Chester Hill NSW 2162", "type": "Urban", "state": "NSW", "lat": -33.88232, "lon": 150.99469}, {"name": "City of Sydney Fire Station", "address": "211-217 Castlereagh St", "locality": "Sydney NSW 2000", "type": "Urban", "state": "NSW", "lat": -33.87505, "lon": 151.20872}, {"name": "Cobar Fire Station", "address": "39 Barton St", "locality": "Cobar NSW 2835", "type": "Urban", "state": "NSW", "lat": -31.49928, "lon": 145.83573}, {"name": "Coffs Harbour Fire Station", "address": "9-11 Market St", "locality": "Coffs Harbour NSW 2450", "type": "Urban", "state": "NSW", "lat": -30.29987, "lon": 153.11318}, {"name": "Concord Fire Station", "address": "153 Concord Rd", "locality": "Concord NSW 2137", "type": "Urban", "state": "NSW", "lat": -33.85849, "lon": 151.09247}, {"name": "Cooma Fire Station", "address": "84 Massie St", "locality": "Cooma NSW 2630", "type": "Urban", "state": "NSW", "lat": -36.23544, "lon": 149.12273}, {"name": "Coonabarabran Fire Station", "address": "64 Cassilis St", "locality": "Coonabarabran NSW 2357", "type": "Urban", "state": "NSW", "lat": -31.2754, "lon": 149.27906}, {"name": "Coonamble Fire Station", "address": "95 Castlereagh St", "locality": "Coonamble NSW 2829", "type": "Urban", "state": "NSW", "lat": -30.95571, "lon": 148.38925}, {"name": "Cootamundra Fire Station", "address": "14-16 Adams St", "locality": "Cootamundra NSW 2590", "type": "Urban", "state": "NSW", "lat": -34.63598, "lon": 148.02799}, {"name": "Cowra Fire Station", "address": "124 Kendall St", "locality": "Cowra NSW 2794", "type": "Urban", "state": "NSW", "lat": -33.83484, "lon": 148.69427}, {"name": "Cranebrook Fire Station", "address": "137-139 Vincent Rd", "locality": "Cranebrook NSW 2479", "type": "Urban", "state": "NSW", "lat": -33.70339, "lon": 150.70877}, {"name": "Cronulla Fire Station", "address": "91 The Kingsway", "locality": "Cronulla NSW 2230", "type": "Urban", "state": "NSW", "lat": -34.04963, "lon": 151.14757}, {"name": "Crows Nest Fire Station", "address": "99 Shirley Rd", "locality": "Crows Nest NSW 2065", "type": "Urban", "state": "NSW", "lat": -33.82819, "lon": 151.19999}, {"name": "Darlinghurst Fire Station", "address": "100-102 Victoria St", "locality": "Darlinghurst NSW 2010", "type": "Urban", "state": "NSW", "lat": -33.8762, "lon": 151.22217}, {"name": "Dapto Fire Station", "address": "88 Byamee St", "locality": "Dapto NSW 2530", "type": "Urban", "state": "NSW", "lat": -34.49515, "lon": 150.79744}, {"name": "Dee Why Fire Station", "address": "38 Fisher Rd", "locality": "Dee Why NSW 2099", "type": "Urban", "state": "NSW", "lat": -33.75183, "lon": 151.28479}, {"name": "Deniliquin Fire Station", "address": "264 George St", "locality": "Deniliquin NSW 2710", "type": "Urban", "state": "NSW", "lat": -35.52916, "lon": 144.96457}, {"name": "Dubbo Fire Station", "address": "102 Wheelers Lane", "locality": "Dubbo NSW 2830", "type": "Urban", "state": "NSW", "lat": -32.25092, "lon": 148.63101}, {"name": "Drummoyne Fire Station", "address": "29-35 Lyons Rd", "locality": "Drummoyne NSW 2047", "type": "Urban", "state": "NSW", "lat": -33.85178, "lon": 151.15387}, {"name": "Eastwood Fire Station", "address": "269 Rowe St", "locality": "Eastwood NSW 2122", "type": "Urban", "state": "NSW", "lat": -33.79222, "lon": 151.07747}, {"name": "Eden Fire Station", "address": "44 Hopkins St", "locality": "Eden NSW 2551", "type": "Urban", "state": "NSW", "lat": -37.04308, "lon": 149.89649}, {"name": "Engadine Fire Station", "address": "8 Preston Ave", "locality": "Engadine NSW 2233", "type": "Urban", "state": "NSW", "lat": -34.06746, "lon": 151.01339}, {"name": "Forster Fire Station", "address": "22 Lake St", "locality": "Forster NSW 2428", "type": "Urban", "state": "NSW", "lat": -32.1831, "lon": 152.51711}, {"name": "Forbes Fire Station", "address": "46 Templar St", "locality": "Forbes NSW 2871", "type": "Urban", "state": "NSW", "lat": -33.38506, "lon": 148.0093}, {"name": "Forestville Fire Station", "address": "8 Cook St", "locality": "Forestville NSW 2087", "type": "Urban", "state": "NSW", "lat": -33.76037, "lon": 151.2186}, {"name": "Gladesville Fire Station", "address": "7a Pittwater Rd", "locality": "Gladesville NSW 2111", "type": "Urban", "state": "NSW", "lat": -33.82978, "lon": 151.12785}, {"name": "Glebe Fire Station", "address": "75 St Johns Rd", "locality": "Glebe NSW 2037", "type": "Urban", "state": "NSW", "lat": -33.8811, "lon": 151.18645}, {"name": "Glen Innes Fire Station", "address": "202 Bourke St", "locality": "Glen Innes NSW 2370", "type": "Urban", "state": "NSW", "lat": -29.73917, "lon": 151.73755}, {"name": "Gloucester Fire Station", "address": "40 King St", "locality": "Gloucester NSW 2422", "type": "Urban", "state": "NSW", "lat": -32.00697, "lon": 151.95975}, {"name": "Gordon Fire Station", "address": "966 Pacific Hwy", "locality": "Gordon NSW 2072", "type": "Urban", "state": "NSW", "lat": -33.74924, "lon": 151.14566}, {"name": "Gosford Fire Station", "address": "12 Brougham St", "locality": "Gosford NSW 2250", "type": "Urban", "state": "NSW", "lat": -33.43987, "lon": 151.35716}, {"name": "Goulburn Fire Station", "address": "157-161 Bourke St", "locality": "Goulburn NSW 2580", "type": "Urban", "state": "NSW", "lat": -34.75166, "lon": 149.7182}, {"name": "Grafton Fire Station", "address": "94 Prince St", "locality": "Grafton NSW 2460", "type": "Urban", "state": "NSW", "lat": -29.68908, "lon": 152.9355}, {"name": "Griffith Fire Station", "address": "11 Jondaryan Ave", "locality": "Griffith NSW 2680", "type": "Urban", "state": "NSW", "lat": -34.28974, "lon": 146.05066}, {"name": "Guildford Fire Station", "address": "263 Guildford Rd", "locality": "Guildford NSW 2161", "type": "Urban", "state": "NSW", "lat": -33.85422, "lon": 150.9884}, {"name": "Gunnedah Fire Station", "address": "96 Barber St", "locality": "Gunnedah NSW 2380", "type": "Urban", "state": "NSW", "lat": -30.97886, "lon": 150.25151}, {"name": "Hamlyn Terrace Fire Station", "address": "48 Minnesota Rd", "locality": "Hamlyn Terrace NSW 2259", "type": "Urban", "state": "NSW", "lat": -33.24884, "lon": 151.46791}, {"name": "Hornsby Fire Station", "address": "2 Bridge Rd", "locality": "Hornsby NSW 2077", "type": "Urban", "state": "NSW", "lat": -33.69742, "lon": 151.09834}, {"name": "Hurstville Fire Station", "address": "5-9 Butler Rd", "locality": "Hurstville NSW 2220", "type": "Urban", "state": "NSW", "lat": -33.96795, "lon": 151.10176}, {"name": "Inverell Fire Station", "address": "59 Evans St", "locality": "Inverell NSW 2360", "type": "Urban", "state": "NSW", "lat": -29.77467, "lon": 151.11494}, {"name": "Jindabyne Fire Station", "address": "10 Thredbo Tce", "locality": "Jindabyne NSW 2627", "type": "Urban", "state": "NSW", "lat": -36.41675, "lon": 148.62329}, {"name": "Kariong Fire Station", "address": "1 Central Coast Hwy", "locality": "Kariong NSW 2250", "type": "Urban", "state": "NSW", "lat": -33.43357, "lon": 151.29663}, {"name": "Katoomba Fire Station", "address": "14 Cascade St", "locality": "Katoomba NSW 2780", "type": "Urban", "state": "NSW", "lat": -33.71205, "lon": 150.30995}, {"name": "Kellyville Fire Station", "address": "1-5 Poole Rd", "locality": "Kellyville NSW 2155", "type": "Urban", "state": "NSW", "lat": -33.70991, "lon": 150.94958}, {"name": "Kempsey Fire Station", "address": "78 Elbow St", "locality": "Kempsey NSW 2440", "type": "Urban", "state": "NSW", "lat": -31.081, "lon": 152.82818}, {"name": "Kiama Fire Station", "address": "210 Terralong St", "locality": "Kiama NSW 2533", "type": "Urban", "state": "NSW", "lat": -34.66593, "lon": 150.84646}, {"name": "Kogarah Fire Station", "address": "26 Gray St", "locality": "Kogarah NSW 2217", "type": "Urban", "state": "NSW", "lat": -33.96674, "lon": 151.13244}, {"name": "Kurri Kurri Fire Station", "address": "119 Lang St", "locality": "Kurri Kurri NSW 2327", "type": "Urban", "state": "NSW", "lat": -32.81669, "lon": 151.48352}, {"name": "Lakemba Fire Station", "address": "210 Haldon St", "locality": "Lakemba NSW 2195", "type": "Urban", "state": "NSW", "lat": -33.92471, "lon": 151.07953}, {"name": "Lane Cove Fire Station", "address": "55-57 Dickson Ave", "locality": "Artarmon NSW 2064", "type": "Urban", "state": "NSW", "lat": -33.81629, "lon": 151.18298}, {"name": "Leichhardt Fire Station", "address": "1 Marion St", "locality": "Leichhardt NSW 2040", "type": "Urban", "state": "NSW", "lat": -33.88344, "lon": 151.15887}, {"name": "Lismore Fire Station", "address": "139-141 Molesworth St", "locality": "Lismore NSW 2480", "type": "Urban", "state": "NSW", "lat": -28.80946, "lon": 153.27505}, {"name": "Lithgow Fire Station", "address": "58 Cook St", "locality": "Lithgow NSW 2790", "type": "Urban", "state": "NSW", "lat": -33.4818, "lon": 150.15716}, {"name": "Liverpool Fire Station", "address": "Anzac Rd cnr Delfin Dr", "locality": "Moorebank NSW 2170", "type": "Urban", "state": "NSW", "lat": -33.94463, "lon": 150.9312}, {"name": "Maitland Fire Station", "address": "14 Church St", "locality": "Maitland NSW 2320", "type": "Urban", "state": "NSW", "lat": -32.73208, "lon": 151.55323}, {"name": "Manly Fire Station", "address": "128 Sydney Rd", "locality": "Fairlight NSW 2094", "type": "Urban", "state": "NSW", "lat": -33.79582, "lon": 151.27748}, {"name": "Maroubra Fire Station", "address": "Cnr Maroubra Rd & Flower St", "locality": "Maroubra NSW 2035", "type": "Urban", "state": "NSW", "lat": -33.94297, "lon": 151.247}, {"name": "Marrickville Fire Station", "address": "309 Marrickville Rd", "locality": "Marrickville NSW 2204", "type": "Urban", "state": "NSW", "lat": -33.90908, "lon": 151.15385}, {"name": "Mascot Fire Station", "address": "139-141 Coward St", "locality": "Mascot NSW 2020", "type": "Urban", "state": "NSW", "lat": -33.92594, "lon": 151.19684}, {"name": "Merewether Fire Station", "address": "39 Llewellyn St", "locality": "Merewether NSW 2291", "type": "Urban", "state": "NSW", "lat": -32.94204, "lon": 151.75105}, {"name": "Merimbula Fire Station", "address": "17-19 Monaro St", "locality": "Merimbula NSW 2548", "type": "Urban", "state": "NSW", "lat": -36.89032, "lon": 149.90876}, {"name": "Merrylands Fire Station", "address": "340 Merrylands Rd", "locality": "Merrylands NSW 2160", "type": "Urban", "state": "NSW", "lat": -33.83515, "lon": 150.98157}, {"name": "Miranda Fire Station", "address": "242 Port Hacking Rd", "locality": "Miranda NSW 2228", "type": "Urban", "state": "NSW", "lat": -34.03031, "lon": 151.10662}, {"name": "Mittagong Fire Station", "address": "10 Bowral Rd", "locality": "Mittagong NSW 2575", "type": "Urban", "state": "NSW", "lat": -34.45152, "lon": 150.44709}, {"name": "Mona Vale Fire Station", "address": "6 Harkeith St", "locality": "Mona Vale NSW 2103", "type": "Urban", "state": "NSW", "lat": -33.67622, "lon": 151.3067}, {"name": "Moree Fire Station", "address": "179 Balo St", "locality": "Moree NSW 2400", "type": "Urban", "state": "NSW", "lat": -29.46563, "lon": 149.84127}, {"name": "Mortdale Fire Station", "address": "38 Morts Rd", "locality": "Mortdale NSW 2223", "type": "Urban", "state": "NSW", "lat": -33.97014, "lon": 151.08007}, {"name": "Moruya Fire Station", "address": "15 Church St", "locality": "Moruya NSW 2537", "type": "Urban", "state": "NSW", "lat": -35.90941, "lon": 150.08215}, {"name": "Mosman Fire Station", "address": "730 Military Rd", "locality": "Mosman NSW 2088", "type": "Urban", "state": "NSW", "lat": -33.82518, "lon": 151.24284}, {"name": "Moss Vale Fire Station", "address": "64 Elizabeth St", "locality": "Moss Vale NSW 2577", "type": "Urban", "state": "NSW", "lat": -34.54913, "lon": 150.37421}, {"name": "Mount Druitt Fire Station", "address": "81 Railway St", "locality": "Mount Druitt NSW 2770", "type": "Urban", "state": "NSW", "lat": -33.76552, "lon": 150.83133}, {"name": "Mudgee Fire Station", "address": "95-97 Horatio St", "locality": "Mudgee NSW 2850", "type": "Urban", "state": "NSW", "lat": -32.59954, "lon": 149.58663}, {"name": "Murwillumbah Fire Station", "address": "133 Murwillumbah St", "locality": "Murwillumbah NSW 2484", "type": "Urban", "state": "NSW", "lat": -28.32612, "lon": 153.39549}, {"name": "Muswellbrook Fire Station", "address": "27-31 Market St", "locality": "Muswellbrook NSW 2333", "type": "Urban", "state": "NSW", "lat": -32.26699, "lon": 150.89102}, {"name": "Nambucca Heads Fire Station", "address": "8 Ken Howard Cres", "locality": "Nambucca Heads NSW 2448", "type": "Urban", "state": "NSW", "lat": -30.63497, "lon": 152.97944}, {"name": "Narellan Fire Station", "address": "12 Exchange Pde", "locality": "Smeaton Grange NSW 2567", "type": "Urban", "state": "NSW", "lat": -34.03938, "lon": 150.74932}, {"name": "Narooma Fire Station", "address": "3 Clarke St", "locality": "Narooma NSW 2546", "type": "Urban", "state": "NSW", "lat": -36.22082, "lon": 150.13371}, {"name": "Narrabeen Fire Station", "address": "9 Ocean St", "locality": "Narrabeen NSW 2101", "type": "Urban", "state": "NSW", "lat": -33.7209, "lon": 151.29851}, {"name": "Narrabri Fire Station", "address": "2 Doyle St", "locality": "Narrabri NSW 2390", "type": "Urban", "state": "NSW", "lat": -30.32472, "lon": 149.7837}, {"name": "Narrandera Fire Station", "address": "23 Twynam St", "locality": "Narrandera NSW 2700", "type": "Urban", "state": "NSW", "lat": -34.74648, "lon": 146.55126}, {"name": "Narromine Fire Station", "address": "39 Burroway St", "locality": "Narromine NSW 2821", "type": "Urban", "state": "NSW", "lat": -32.23378, "lon": 148.24214}, {"name": "Neutral Bay Fire Station", "address": "28 Yeo St", "locality": "Neutral Bay NSW 2089", "type": "Urban", "state": "NSW", "lat": -33.83193, "lon": 151.22094}, {"name": "Newcastle Fire Station", "address": "44 Union St", "locality": "Newcastle NSW 2300", "type": "Urban", "state": "NSW", "lat": -32.92976, "lon": 151.76615}, {"name": "Newtown Fire Station", "address": "214-216 Australia St", "locality": "Newtown NSW 2042", "type": "Urban", "state": "NSW", "lat": -33.89647, "lon": 151.17851}, {"name": "Nowra Fire Station", "address": "69 Bridge Rd", "locality": "Nowra NSW 2541", "type": "Urban", "state": "NSW", "lat": -34.87079, "lon": 150.60048}, {"name": "Orange Fire Station", "address": "79 Summer St", "locality": "Orange NSW 2800", "type": "Urban", "state": "NSW", "lat": -33.28264, "lon": 149.09482}, {"name": "Parkes Fire Station", "address": "20 Hill St", "locality": "Parkes NSW 2870", "type": "Urban", "state": "NSW", "lat": -33.13679, "lon": 148.17731}, {"name": "Parramatta Fire Station", "address": "110-114 Wigram St", "locality": "Harris Park NSW 2150", "type": "Urban", "state": "NSW", "lat": -33.81983, "lon": 151.00913}, {"name": "Penrith Fire Station", "address": "544-546 High St", "locality": "Penrith NSW 2750", "type": "Urban", "state": "NSW", "lat": -33.75113, "lon": 150.69283}, {"name": "Port Macquarie Fire Station", "address": "14 Short St", "locality": "Port Macquarie NSW 2444", "type": "Urban", "state": "NSW", "lat": -31.43208, "lon": 152.90753}, {"name": "Pyrmont Fire Station", "address": "208 Harris St", "locality": "Pyrmont NSW 2009", "type": "Urban", "state": "NSW", "lat": -33.87154, "lon": 151.19734}, {"name": "Queanbeyan Fire Station", "address": "161 Monaro St", "locality": "Queanbeyan NSW 2620", "type": "Urban", "state": "NSW", "lat": -35.35349, "lon": 149.23328}, {"name": "Randwick Fire Station", "address": "78 St Pauls St", "locality": "Randwick NSW 2031", "type": "Urban", "state": "NSW", "lat": -33.91303, "lon": 151.2385}, {"name": "Redfern Fire Station", "address": "249 Chalmers St", "locality": "Redfern NSW 2016", "type": "Urban", "state": "NSW", "lat": -33.89461, "lon": 151.20635}, {"name": "Richmond Fire Station", "address": "282 Windsor St", "locality": "Richmond NSW 2753", "type": "Urban", "state": "NSW", "lat": -33.59945, "lon": 150.7495}, {"name": "Riverstone Fire Station", "address": "4 Garfield Rd", "locality": "Riverstone NSW 2765", "type": "Urban", "state": "NSW", "lat": -33.6761, "lon": 150.8573}, {"name": "Ropes Crossing Fire Station", "address": "1a Ellsworth Dr", "locality": "Tregear NSW 2770", "type": "Urban", "state": "NSW", "lat": -33.74167, "lon": 150.78655}, {"name": "Salamander Bay Fire Station", "address": "194 Salamander Way", "locality": "Salamander Bay NSW 2317", "type": "Urban", "state": "NSW", "lat": -32.73832, "lon": 152.11223}, {"name": "Seven Hills Fire Station", "address": "91 Prospect Hwy", "locality": "Seven Hills NSW 2147", "type": "Urban", "state": "NSW", "lat": -33.78081, "lon": 150.93548}, {"name": "St Marys Fire Station", "address": "18 Harris St", "locality": "St Marys NSW 2760", "type": "Urban", "state": "NSW", "lat": -33.76536, "lon": 150.77572}, {"name": "Strathfield Fire Station", "address": "17 The Boulevarde", "locality": "Strathfield NSW 2135", "type": "Urban", "state": "NSW", "lat": -33.87267, "lon": 151.09303}, {"name": "Sutherland Fire Station", "address": "67-69 Boyle St", "locality": "Sutherland NSW 2232", "type": "Urban", "state": "NSW", "lat": -34.03056, "lon": 151.05622}, {"name": "Tamworth Fire Station", "address": "56-60 Phillip St", "locality": "Tamworth NSW 2340", "type": "Urban", "state": "NSW", "lat": -31.09011, "lon": 150.92478}, {"name": "The Rocks Fire Station", "address": "10 Grosvenor St", "locality": "The Rocks NSW 2000", "type": "Urban", "state": "NSW", "lat": -33.86013, "lon": 151.20679}, {"name": "Tuggerah Fire Station", "address": "6 Wyong Rd", "locality": "Tuggerah NSW 2259", "type": "Urban", "state": "NSW", "lat": -33.32247, "lon": 151.4101}, {"name": "Tweed Heads Fire Station", "address": "112 Wharf St", "locality": "Tweed Heads NSW 2485", "type": "Urban", "state": "NSW", "lat": -28.17651, "lon": 153.54382}, {"name": "Wagga Wagga Fire Station", "address": "112-114 Peter St", "locality": "Wagga Wagga NSW 2650", "type": "Urban", "state": "NSW", "lat": -35.11677, "lon": 147.37166}, {"name": "Windsor Fire Station", "address": "2 Baker St", "locality": "Windsor NSW 2756", "type": "Urban", "state": "NSW", "lat": -33.61444, "lon": 150.81303}, {"name": "Wollongong Fire Station", "address": "61 Burelli St", "locality": "Wollongong NSW 2500", "type": "Urban", "state": "NSW", "lat": -34.42628, "lon": 150.89308}, {"name": "Wyong Fire Station", "address": "38 Pacific Hwy", "locality": "Wyong NSW 2259", "type": "Urban", "state": "NSW", "lat": -33.27907, "lon": 151.42326}, {"name": "Yennora Fire Station", "address": "198 Fairfield Rd", "locality": "Yennora NSW 2161", "type": "Urban", "state": "NSW", "lat": -33.859, "lon": 150.95887}, {"name": "Young Fire Station", "address": "185 Lovell St", "locality": "Young NSW 2594", "type": "Urban", "state": "NSW", "lat": -34.31011, "lon": 148.3006}, {"name": "Melbourne City Fire Station", "address": "456 Flinders St", "locality": "Melbourne VIC 3000", "type": "Urban", "state": "VIC", "lat": -37.8193, "lon": 144.9594}, {"name": "South Melbourne Fire Station", "address": "94 City Rd", "locality": "South Melbourne VIC 3205", "type": "Urban", "state": "VIC", "lat": -37.8312, "lon": 144.9562}, {"name": "Richmond Fire Station", "address": "237 Swan St", "locality": "Richmond VIC 3121", "type": "Urban", "state": "VIC", "lat": -37.8264, "lon": 145.0003}, {"name": "Fitzroy Fire Station", "address": "83 Smith St", "locality": "Fitzroy VIC 3065", "type": "Urban", "state": "VIC", "lat": -37.7992, "lon": 144.9795}, {"name": "Prahran Fire Station", "address": "179 High St", "locality": "Prahran VIC 3181", "type": "Urban", "state": "VIC", "lat": -37.8491, "lon": 144.9909}, {"name": "Footscray Fire Station", "address": "35 Droop St", "locality": "Footscray VIC 3011", "type": "Urban", "state": "VIC", "lat": -37.7993, "lon": 144.9005}, {"name": "Coburg Fire Station", "address": "86 Solly Ave", "locality": "Coburg VIC 3058", "type": "Urban", "state": "VIC", "lat": -37.7419, "lon": 144.9648}, {"name": "Brunswick Fire Station", "address": "261 Sydney Rd", "locality": "Brunswick VIC 3056", "type": "Urban", "state": "VIC", "lat": -37.7634, "lon": 144.961}, {"name": "North Fitzroy Fire Station", "address": "65 Rae St", "locality": "North Fitzroy VIC 3068", "type": "Urban", "state": "VIC", "lat": -37.786, "lon": 144.978}, {"name": "Kew Fire Station", "address": "150 Cotham Rd", "locality": "Kew VIC 3101", "type": "Urban", "state": "VIC", "lat": -37.8059, "lon": 145.028}, {"name": "Hawthorn Fire Station", "address": "36 Burwood Rd", "locality": "Hawthorn VIC 3122", "type": "Urban", "state": "VIC", "lat": -37.8238, "lon": 145.0351}, {"name": "Malvern Fire Station", "address": "169 Glenferrie Rd", "locality": "Malvern VIC 3144", "type": "Urban", "state": "VIC", "lat": -37.8571, "lon": 145.0271}, {"name": "St Kilda Fire Station", "address": "246 St Kilda Rd", "locality": "St Kilda VIC 3182", "type": "Urban", "state": "VIC", "lat": -37.8639, "lon": 144.9747}, {"name": "Port Melbourne Fire Station", "address": "117 Williamstown Rd", "locality": "Port Melbourne VIC 3207", "type": "Urban", "state": "VIC", "lat": -37.8382, "lon": 144.9267}, {"name": "Williamstown Fire Station", "address": "152 Ferguson St", "locality": "Williamstown VIC 3016", "type": "Urban", "state": "VIC", "lat": -37.8583, "lon": 144.8983}, {"name": "Newport Fire Station", "address": "132 Mason St", "locality": "Newport VIC 3015", "type": "Urban", "state": "VIC", "lat": -37.8456, "lon": 144.8841}, {"name": "Altona Fire Station", "address": "101 Millers Rd", "locality": "Altona VIC 3018", "type": "Urban", "state": "VIC", "lat": -37.8696, "lon": 144.826}, {"name": "Sunshine Fire Station", "address": "29 Devonshire Rd", "locality": "Sunshine VIC 3020", "type": "Urban", "state": "VIC", "lat": -37.7898, "lon": 144.8311}, {"name": "Deer Park Fire Station", "address": "98 Ballarat Rd", "locality": "Deer Park VIC 3023", "type": "Urban", "state": "VIC", "lat": -37.7756, "lon": 144.777}, {"name": "Werribee Fire Station", "address": "7 Synnot St", "locality": "Werribee VIC 3030", "type": "Urban", "state": "VIC", "lat": -37.8996, "lon": 144.655}, {"name": "Hoppers Crossing Fire Station", "address": "186 Old Geelong Rd", "locality": "Hoppers Crossing VIC 3029", "type": "Urban", "state": "VIC", "lat": -37.8832, "lon": 144.6977}, {"name": "Williamstown North Fire Station", "address": "161 Blackshaws Rd", "locality": "Altona North VIC 3025", "type": "Urban", "state": "VIC", "lat": -37.8418, "lon": 144.8705}, {"name": "Maribyrnong Fire Station", "address": "11 Raleigh Rd", "locality": "Maribyrnong VIC 3032", "type": "Urban", "state": "VIC", "lat": -37.7816, "lon": 144.8914}, {"name": "Keilor Fire Station", "address": "5 Brook Rd", "locality": "Keilor VIC 3036", "type": "Urban", "state": "VIC", "lat": -37.7299, "lon": 144.8353}, {"name": "Essendon Fire Station", "address": "121 Buckley St", "locality": "Moonee Ponds VIC 3039", "type": "Urban", "state": "VIC", "lat": -37.7676, "lon": 144.9203}, {"name": "Pascoe Vale Fire Station", "address": "91 Cumberland Rd", "locality": "Pascoe Vale VIC 3044", "type": "Urban", "state": "VIC", "lat": -37.7317, "lon": 144.9408}, {"name": "Broadmeadows Fire Station", "address": "8 Pearcedale Pde", "locality": "Broadmeadows VIC 3047", "type": "Urban", "state": "VIC", "lat": -37.6877, "lon": 144.9178}, {"name": "Lalor Fire Station", "address": "45 Station St", "locality": "Lalor VIC 3075", "type": "Urban", "state": "VIC", "lat": -37.664, "lon": 145.0111}, {"name": "Heidelberg Fire Station", "address": "80 Burgundy St", "locality": "Heidelberg VIC 3084", "type": "Urban", "state": "VIC", "lat": -37.7538, "lon": 145.0618}, {"name": "Ringwood Fire Station", "address": "Cnr Maroondah Hwy & Dublin Rd", "locality": "Ringwood VIC 3134", "type": "Urban", "state": "VIC", "lat": -37.8154, "lon": 145.2249}, {"name": "Box Hill Fire Station", "address": "6 Middleborough Rd", "locality": "Box Hill VIC 3128", "type": "Urban", "state": "VIC", "lat": -37.8195, "lon": 145.1214}, {"name": "Burwood Fire Station", "address": "107 Burwood Hwy", "locality": "Burwood VIC 3125", "type": "Urban", "state": "VIC", "lat": -37.8447, "lon": 145.1074}, {"name": "Glen Waverley Fire Station", "address": "121 Coleman Pde", "locality": "Glen Waverley VIC 3150", "type": "Urban", "state": "VIC", "lat": -37.8796, "lon": 145.1646}, {"name": "Oakleigh Fire Station", "address": "1 Drummond St", "locality": "Oakleigh VIC 3166", "type": "Urban", "state": "VIC", "lat": -37.897, "lon": 145.0925}, {"name": "Clayton Fire Station", "address": "15 Bogong Ave", "locality": "Clayton VIC 3168", "type": "Urban", "state": "VIC", "lat": -37.9178, "lon": 145.1186}, {"name": "Dandenong Fire Station", "address": "88 Mason St", "locality": "Dandenong VIC 3175", "type": "Urban", "state": "VIC", "lat": -37.9868, "lon": 145.2145}, {"name": "Springvale Fire Station", "address": "518 Springvale Rd", "locality": "Springvale South VIC 3172", "type": "Urban", "state": "VIC", "lat": -37.9725, "lon": 145.1468}, {"name": "Moorabbin Fire Station", "address": "81 South Rd", "locality": "Moorabbin VIC 3189", "type": "Urban", "state": "VIC", "lat": -37.9345, "lon": 145.0342}, {"name": "Mentone Fire Station", "address": "50 Balcombe Rd", "locality": "Mentone VIC 3194", "type": "Urban", "state": "VIC", "lat": -37.9771, "lon": 145.0644}, {"name": "Chelsea Fire Station", "address": "79 Wells Rd", "locality": "Chelsea VIC 3196", "type": "Urban", "state": "VIC", "lat": -38.0423, "lon": 145.1193}, {"name": "Frankston Fire Station", "address": "3 Station St", "locality": "Frankston VIC 3199", "type": "Urban", "state": "VIC", "lat": -38.1451, "lon": 145.1237}, {"name": "Carrum Downs Fire Station", "address": "250 Hall Rd", "locality": "Carrum Downs VIC 3201", "type": "Urban", "state": "VIC", "lat": -38.0969, "lon": 145.17}, {"name": "Cranbourne Fire Station", "address": "10 Codrington St", "locality": "Cranbourne VIC 3977", "type": "Urban", "state": "VIC", "lat": -38.1138, "lon": 145.2843}, {"name": "Pakenham Fire Station", "address": "1 Henry Rd", "locality": "Pakenham VIC 3810", "type": "Urban", "state": "VIC", "lat": -38.0729, "lon": 145.4876}, {"name": "Narre Warren Fire Station", "address": "41 Overland Dr", "locality": "Narre Warren VIC 3805", "type": "Urban", "state": "VIC", "lat": -38.0202, "lon": 145.298}, {"name": "Endeavour Hills Fire Station", "address": "55 Matthew Flinders Ave", "locality": "Endeavour Hills VIC 3802", "type": "Urban", "state": "VIC", "lat": -37.9614, "lon": 145.2509}, {"name": "Boronia Fire Station", "address": "95 Boronia Rd", "locality": "Boronia VIC 3155", "type": "Urban", "state": "VIC", "lat": -37.8549, "lon": 145.2876}, {"name": "Geelong Fire Station", "address": "186 Moorabool St", "locality": "Geelong VIC 3220", "type": "Urban", "state": "VIC", "lat": -38.1494, "lon": 144.3617}, {"name": "Corio Fire Station", "address": "24 Purnell Rd", "locality": "Corio VIC 3214", "type": "Urban", "state": "VIC", "lat": -38.0844, "lon": 144.357}, {"name": "Lara Fire Station", "address": "20 Patullos Rd", "locality": "Lara VIC 3212", "type": "Urban", "state": "VIC", "lat": -38.0214, "lon": 144.4002}, {"name": "Norlane Fire Station", "address": "1 Wallace Cres", "locality": "Norlane VIC 3214", "type": "Urban", "state": "VIC", "lat": -38.1042, "lon": 144.342}, {"name": "Ballarat City Fire Station", "address": "36 Mair St", "locality": "Ballarat VIC 3350", "type": "Urban", "state": "VIC", "lat": -37.562, "lon": 143.8593}, {"name": "Ballarat East Fire Station", "address": "21 Windermere St", "locality": "Ballarat East VIC 3350", "type": "Urban", "state": "VIC", "lat": -37.5664, "lon": 143.8674}, {"name": "Ballarat North Fire Station", "address": "10 Howitt St", "locality": "Ballarat North VIC 3350", "type": "Urban", "state": "VIC", "lat": -37.5549, "lon": 143.8557}, {"name": "Bendigo Fire Station", "address": "107 Williamson St", "locality": "Bendigo VIC 3550", "type": "Urban", "state": "VIC", "lat": -36.7572, "lon": 144.2783}, {"name": "Kangaroo Flat Fire Station", "address": "67 High St", "locality": "Kangaroo Flat VIC 3555", "type": "Urban", "state": "VIC", "lat": -36.8171, "lon": 144.2336}, {"name": "Mildura Fire Station", "address": "72-74 Madden Ave", "locality": "Mildura VIC 3500", "type": "Urban", "state": "VIC", "lat": -34.1882, "lon": 142.1684}, {"name": "Traralgon Fire Station", "address": "32 Kay St", "locality": "Traralgon VIC 3844", "type": "Urban", "state": "VIC", "lat": -38.1976, "lon": 146.539}, {"name": "Morwell Fire Station", "address": "26 Commercial Rd", "locality": "Morwell VIC 3840", "type": "Urban", "state": "VIC", "lat": -38.2343, "lon": 146.3957}, {"name": "Moe Fire Station", "address": "37 Lloyd St", "locality": "Moe VIC 3825", "type": "Urban", "state": "VIC", "lat": -38.1731, "lon": 146.2675}, {"name": "Wodonga Fire Station", "address": "49 McKoy St", "locality": "Wodonga VIC 3690", "type": "Urban", "state": "VIC", "lat": -36.1227, "lon": 146.8736}, {"name": "Albury-Wodonga Fire Station", "address": "11 Elgin Blvd", "locality": "Wodonga VIC 3690", "type": "Urban", "state": "VIC", "lat": -36.1189, "lon": 146.8823}, {"name": "Shepparton Fire Station", "address": "215 Wyndham St", "locality": "Shepparton VIC 3630", "type": "Urban", "state": "VIC", "lat": -36.3798, "lon": 145.3966}, {"name": "Wangaratta Fire Station", "address": "60 Ryley St", "locality": "Wangaratta VIC 3677", "type": "Urban", "state": "VIC", "lat": -36.3672, "lon": 146.3082}, {"name": "Sale Fire Station", "address": "224 Raymond St", "locality": "Sale VIC 3850", "type": "Urban", "state": "VIC", "lat": -38.1054, "lon": 147.0658}, {"name": "Horsham Fire Station", "address": "32 McPherson St", "locality": "Horsham VIC 3400", "type": "Urban", "state": "VIC", "lat": -36.7101, "lon": 142.198}, {"name": "Warrnambool Fire Station", "address": "227 Koroit St", "locality": "Warrnambool VIC 3280", "type": "Urban", "state": "VIC", "lat": -38.3772, "lon": 142.4785}, {"name": "Hamilton Fire Station", "address": "105 Gray St", "locality": "Hamilton VIC 3300", "type": "Urban", "state": "VIC", "lat": -37.7388, "lon": 142.0172}, {"name": "Bairnsdale Fire Station", "address": "148 Main St", "locality": "Bairnsdale VIC 3875", "type": "Urban", "state": "VIC", "lat": -37.8372, "lon": 147.6068}, {"name": "Colac Fire Station", "address": "59 Murray St", "locality": "Colac VIC 3250", "type": "Urban", "state": "VIC", "lat": -38.3396, "lon": 143.5866}, {"name": "Ararat Fire Station", "address": "90 Barkly St", "locality": "Ararat VIC 3377", "type": "Urban", "state": "VIC", "lat": -37.2795, "lon": 143.0008}, {"name": "Maryborough Fire Station", "address": "117 Highett St", "locality": "Maryborough VIC 3465", "type": "Urban", "state": "VIC", "lat": -37.0443, "lon": 143.7375}, {"name": "Echuca Fire Station", "address": "96 Hare St", "locality": "Echuca VIC 3564", "type": "Urban", "state": "VIC", "lat": -36.1311, "lon": 144.7513}, {"name": "Sunbury Fire Station", "address": "40 Stawell St", "locality": "Sunbury VIC 3429", "type": "Urban", "state": "VIC", "lat": -37.5729, "lon": 144.7262}, {"name": "Melton Fire Station", "address": "30 McKenzie St", "locality": "Melton VIC 3337", "type": "Urban", "state": "VIC", "lat": -37.6927, "lon": 144.5828}, {"name": "Bacchus Marsh Fire Station", "address": "47 Gisborne Rd", "locality": "Bacchus Marsh VIC 3340", "type": "Urban", "state": "VIC", "lat": -37.6745, "lon": 144.4378}, {"name": "Kilmore Fire Station", "address": "37 Sydney St", "locality": "Kilmore VIC 3764", "type": "Urban", "state": "VIC", "lat": -37.2947, "lon": 144.9582}, {"name": "Seymour Fire Station", "address": "64 Station St", "locality": "Seymour VIC 3660", "type": "Urban", "state": "VIC", "lat": -37.0223, "lon": 145.1312}, {"name": "Benalla Fire Station", "address": "104 Bridge St", "locality": "Benalla VIC 3672", "type": "Urban", "state": "VIC", "lat": -36.5513, "lon": 145.9811}, {"name": "Cobram Fire Station", "address": "47 Bank St", "locality": "Cobram VIC 3644", "type": "Urban", "state": "VIC", "lat": -35.9249, "lon": 145.6473}, {"name": "Kyabram Fire Station", "address": "61 Allan St", "locality": "Kyabram VIC 3620", "type": "Urban", "state": "VIC", "lat": -36.3194, "lon": 145.0557}, {"name": "Swan Hill Fire Station", "address": "69 Beveridge St", "locality": "Swan Hill VIC 3585", "type": "Urban", "state": "VIC", "lat": -35.3361, "lon": 143.5539}, {"name": "Acacia Ridge", "address": "127 Bradman St", "locality": "Acacia Ridge QLD", "type": "Urban", "state": "QLD", "lat": -27.581159, "lon": 153.038533}, {"name": "Agnes Water", "address": "Lot 1, Round Hill Road", "locality": "Agnes Water QLD", "type": "Urban", "state": "QLD", "lat": -24.219973, "lon": 151.893296}, {"name": "Allora", "address": "3 Muir St", "locality": "Allora QLD", "type": "Urban", "state": "QLD", "lat": -28.03477, "lon": 151.984646}, {"name": "Amity Point", "address": "9 Hexton St", "locality": "Amity Point QLD", "type": "Urban", "state": "QLD", "lat": -27.39845, "lon": 153.442223}, {"name": "Annerley", "address": "346 Ipswich Rd", "locality": "Annerley QLD", "type": "Urban", "state": "QLD", "lat": -27.504391, "lon": 153.034752}, {"name": "Anzac Avenue", "address": "201 Anzac Av", "locality": "Toowoomba QLD", "type": "Urban", "state": "QLD", "lat": -27.57181, "lon": 151.924075}, {"name": "Aramac", "address": "87 Gordon St", "locality": "Aramac QLD", "type": "Urban", "state": "QLD", "lat": -22.971661, "lon": 145.240342}, {"name": "Arana Hills", "address": "1145 South Pine Rd", "locality": "Arana Hills QLD", "type": "Urban", "state": "QLD", "lat": -27.389698, "lon": 152.962517}, {"name": "Ashgrove", "address": "515 Waterworks Rd", "locality": "Ashgrove QLD", "type": "Urban", "state": "QLD", "lat": -27.447892, "lon": 152.976024}, {"name": "Atherton", "address": "17 Vernon St", "locality": "Atherton QLD", "type": "Urban", "state": "QLD", "lat": -17.267521, "lon": 145.477735}, {"name": "Ayr", "address": "47-49 Soper St", "locality": "Ayr QLD", "type": "Urban", "state": "QLD", "lat": -19.571625, "lon": 147.409658}, {"name": "Babinda", "address": "44 Eastwood St", "locality": "Babinda QLD", "type": "Urban", "state": "QLD", "lat": -17.344776, "lon": 145.921454}, {"name": "Baralaba", "address": "22 Stopford St", "locality": "Baralaba QLD", "type": "Urban", "state": "QLD", "lat": -24.182488, "lon": 149.811269}, {"name": "Barcaldine", "address": "56 Ash St", "locality": "Barcaldine QLD", "type": "Urban", "state": "QLD", "lat": -23.553389, "lon": 145.29107}, {"name": "Bargara", "address": "31 Tanner St", "locality": "Bargara QLD", "type": "Urban", "state": "QLD", "lat": -24.81348, "lon": 152.458762}, {"name": "Biggenden", "address": "22 George St", "locality": "Biggenden QLD", "type": "Urban", "state": "QLD", "lat": -25.512082, "lon": 152.046514}, {"name": "Bilinga", "address": "240 Coolangatta Rd", "locality": "Bilinga QLD", "type": "Urban", "state": "QLD", "lat": -28.160396, "lon": 153.510127}, {"name": "Biloela", "address": "190 Callide St", "locality": "Biloela QLD", "type": "Urban", "state": "QLD", "lat": -24.392444, "lon": 150.503905}, {"name": "Blackall", "address": "125 Shamrock St", "locality": "Blackall QLD", "type": "Urban", "state": "QLD", "lat": -24.423235, "lon": 145.462492}, {"name": "Blackbutt", "address": "72 Hart St", "locality": "Blackbutt QLD", "type": "Urban", "state": "QLD", "lat": -26.884903, "lon": 152.10085}, {"name": "Blackwater", "address": "2 Wilga St", "locality": "Blackwater QLD", "type": "Urban", "state": "QLD", "lat": -23.578643, "lon": 148.878437}, {"name": "Boonah", "address": "6 Farley St", "locality": "Boonah QLD", "type": "Urban", "state": "QLD", "lat": -27.996403, "lon": 152.681162}, {"name": "Boulia", "address": "59 Burke St", "locality": "Boulia QLD", "type": "Urban", "state": "QLD", "lat": -22.907882, "lon": 139.911846}, {"name": "Bowen", "address": "44 Gordon St", "locality": "Bowen QLD", "type": "Urban", "state": "QLD", "lat": -20.013203, "lon": 148.240701}, {"name": "Boyne Island", "address": "6 Gilbert Ct", "locality": "Boyne Island QLD", "type": "Urban", "state": "QLD", "lat": -23.94691, "lon": 151.352953}, {"name": "Bramston Beach", "address": "39 Evans Rd", "locality": "Bramston Beach QLD", "type": "Urban", "state": "QLD", "lat": -17.356239, "lon": 146.024807}, {"name": "Buderim", "address": "8 Lindsay Rd", "locality": "Buderim QLD", "type": "Urban", "state": "QLD", "lat": -26.684987, "lon": 153.050746}, {"name": "Bundaberg", "address": "57 Wyllie St", "locality": "Bundaberg QLD", "type": "Urban", "state": "QLD", "lat": -24.90135, "lon": 152.357217}, {"name": "Bundamba", "address": "61 Brisbane Rd", "locality": "Bundamba QLD", "type": "Urban", "state": "QLD", "lat": -27.60744, "lon": 152.814479}, {"name": "Burleigh Heads", "address": "164 West Burleigh Rd", "locality": "Burleigh Heads QLD", "type": "Urban", "state": "QLD", "lat": -28.099506, "lon": 153.44329}, {"name": "Burpengary", "address": "185 Pitt Road", "locality": "Burpengary QLD", "type": "Urban", "state": "QLD", "lat": -27.169632, "lon": 152.97694}, {"name": "Caboolture", "address": "54 Lower King St", "locality": "Caboolture QLD", "type": "Urban", "state": "QLD", "lat": -27.085896, "lon": 152.960892}, {"name": "Cairns", "address": "237-241 Gatton St", "locality": "Cairns QLD", "type": "Urban", "state": "QLD", "lat": -16.92844, "lon": 145.750435}, {"name": "Cairns South", "address": "80-84 Robert Rd", "locality": "Cairns South QLD", "type": "Urban", "state": "QLD", "lat": -17.003505, "lon": 145.735212}, {"name": "Calliope", "address": "2 Menzies St", "locality": "Calliope QLD", "type": "Urban", "state": "QLD", "lat": -24.005488, "lon": 151.200522}, {"name": "Camira", "address": "170 Old Logan Road And Alice Street", "locality": "Camira QLD", "type": "Urban", "state": "QLD", "lat": -27.619998, "lon": 152.915661}, {"name": "Camp Hill", "address": "112 Ferguson Rd", "locality": "Camp Hill QLD", "type": "Urban", "state": "QLD", "lat": -27.48807, "lon": 153.078556}, {"name": "Cannon Hill", "address": "24 Corporate Dr", "locality": "Cannon Hill QLD", "type": "Urban", "state": "QLD", "lat": -27.467658, "lon": 153.091322}, {"name": "Canungra", "address": "Finch Rd", "locality": "Canungra QLD", "type": "Urban", "state": "QLD", "lat": -28.017229, "lon": 153.165835}, {"name": "Capalaba", "address": "223 Mt Cotton Rd", "locality": "Capalaba QLD", "type": "Urban", "state": "QLD", "lat": -27.542667, "lon": 153.189536}, {"name": "Capella", "address": "18 Conran St", "locality": "Capella QLD", "type": "Urban", "state": "QLD", "lat": -23.085704, "lon": 148.025231}, {"name": "Cardwell", "address": "2 Panos St", "locality": "Cardwell QLD", "type": "Urban", "state": "QLD", "lat": -18.266686, "lon": 146.026421}, {"name": "Cecil Plains", "address": "69 Taylor St", "locality": "Cecil Plains QLD", "type": "Urban", "state": "QLD", "lat": -27.531762, "lon": 151.190185}, {"name": "Chermside", "address": "526 Hamilton Rd", "locality": "Chermside QLD", "type": "Urban", "state": "QLD", "lat": -27.385163, "lon": 153.023594}, {"name": "Childers", "address": "8 Brassington Dr", "locality": "Childers QLD", "type": "Urban", "state": "QLD", "lat": -25.239457, "lon": 152.291143}, {"name": "Chinchilla", "address": "20 Villiers St", "locality": "Chinchilla QLD", "type": "Urban", "state": "QLD", "lat": -26.743291, "lon": 150.62886}, {"name": "Clermont", "address": "31 Sirius St", "locality": "Clermont QLD", "type": "Urban", "state": "QLD", "lat": -22.823971, "lon": 147.641529}, {"name": "Cleveland", "address": "49 Wellington St", "locality": "Cleveland QLD", "type": "Urban", "state": "QLD", "lat": -27.529013, "lon": 153.255135}, {"name": "Cloncurry", "address": "44 Scarr St", "locality": "Cloncurry QLD", "type": "Urban", "state": "QLD", "lat": -20.705979, "lon": 140.50599}, {"name": "Collinsville", "address": "29 Garrick St", "locality": "Collinsville QLD", "type": "Urban", "state": "QLD", "lat": -20.552654, "lon": 147.84213}, {"name": "Coochiemudlo Island", "address": "45 Elizabeth St", "locality": "Coochiemudlo Island QLD", "type": "Urban", "state": "QLD", "lat": -27.569176, "lon": 153.33349}, {"name": "Cooktown", "address": "115 Hope St", "locality": "Cooktown QLD", "type": "Urban", "state": "QLD", "lat": -15.468249, "lon": 145.251465}, {"name": "Cooran", "address": "50 Queen St", "locality": "Cooran QLD", "type": "Urban", "state": "QLD", "lat": -26.336639, "lon": 152.833655}, {"name": "Cooroy", "address": "16 Myall St", "locality": "Cooroy QLD", "type": "Urban", "state": "QLD", "lat": -26.420369, "lon": 152.910776}, {"name": "Crows Nest", "address": "28 Creek St", "locality": "Crows Nest QLD", "type": "Urban", "state": "QLD", "lat": -27.262395, "lon": 152.056564}, {"name": "Dalby", "address": "21 New St", "locality": "Dalby QLD", "type": "Urban", "state": "QLD", "lat": -27.179643, "lon": 151.266742}, {"name": "Dayboro", "address": "27 Bradley St", "locality": "Dayboro QLD", "type": "Urban", "state": "QLD", "lat": -27.198605, "lon": 152.823019}, {"name": "Dimbulah", "address": "1 Raleigh St", "locality": "Dimbulah QLD", "type": "Urban", "state": "QLD", "lat": -17.150646, "lon": 145.107254}, {"name": "Dirranbandi", "address": "4 Cowildi St", "locality": "Dirranbandi QLD", "type": "Urban", "state": "QLD", "lat": -28.582634, "lon": 148.223367}, {"name": "Durack", "address": "506 Blunder Road", "locality": "Durack QLD", "type": "Urban", "state": "QLD", "lat": -27.587205, "lon": 152.985578}, {"name": "Dysart", "address": "27 Queen Elizabeth Dr", "locality": "Dysart QLD", "type": "Urban", "state": "QLD", "lat": -22.589956, "lon": 148.348214}, {"name": "Eatons Hill", "address": "3 Eatons Crossing Road", "locality": "Warner QLD", "type": "Urban", "state": "QLD", "lat": -27.336478, "lon": 152.960361}, {"name": "Eidsvold", "address": "35 Golden Spur St", "locality": "Eidsvold QLD", "type": "Urban", "state": "QLD", "lat": -25.371445, "lon": 151.121659}, {"name": "El Arish", "address": "7 Ryrie St", "locality": "El Arish QLD", "type": "Urban", "state": "QLD", "lat": -17.805596, "lon": 146.003757}, {"name": "Elliott Heads", "address": "100 Welch St", "locality": "Elliott Heads QLD", "type": "Urban", "state": "QLD", "lat": -24.90888, "lon": 152.488539}, {"name": "Forest Hill", "address": "4 William St", "locality": "Forest Hill QLD", "type": "Urban", "state": "QLD", "lat": -27.588769, "lon": 152.356346}, {"name": "Forrest Beach", "address": "Maple St", "locality": "Forrest Beach QLD", "type": "Urban", "state": "QLD", "lat": -18.70762, "lon": 146.297287}, {"name": "Gayndah", "address": "8 Pineapple St", "locality": "Gayndah QLD", "type": "Urban", "state": "QLD", "lat": -25.625959, "lon": 151.609339}, {"name": "Gin Gin", "address": "24 Mulgrave St", "locality": "Gin Gin QLD", "type": "Urban", "state": "QLD", "lat": -24.989104, "lon": 151.954638}, {"name": "Giru", "address": "12 Brookes St", "locality": "Giru QLD", "type": "Urban", "state": "QLD", "lat": -19.513566, "lon": 147.106899}, {"name": "Gladstone", "address": "3 Charles St", "locality": "West Gladstone QLD", "type": "Urban", "state": "QLD", "lat": -23.858418, "lon": 151.249554}, {"name": "Goombungee", "address": "4 Anvil Court", "locality": "Goombungee QLD", "type": "Urban", "state": "QLD", "lat": -27.315026, "lon": 151.848723}, {"name": "Goomeri", "address": "4 Moore St", "locality": "Goomeri QLD", "type": "Urban", "state": "QLD", "lat": -26.181312, "lon": 152.067311}, {"name": "Gympie", "address": "6 Bligh St", "locality": "Gympie QLD", "type": "Urban", "state": "QLD", "lat": -26.191914, "lon": 152.668193}, {"name": "Harrisville", "address": "50 Queen St", "locality": "Harrisville QLD", "type": "Urban", "state": "QLD", "lat": -27.811001, "lon": 152.668163}, {"name": "Helensvale", "address": "1 Discovery Dr", "locality": "Helensvale QLD", "type": "Urban", "state": "QLD", "lat": -27.921391, "lon": 153.337294}, {"name": "Helidon", "address": "13 Railway St", "locality": "Helidon QLD", "type": "Urban", "state": "QLD", "lat": -27.550685, "lon": 152.123226}, {"name": "Hendra", "address": "451 Nudgee Rd", "locality": "Hendra QLD", "type": "Urban", "state": "QLD", "lat": -27.415249, "lon": 153.074856}, {"name": "Highfields", "address": "49 O'Brien Road", "locality": "Highfields QLD", "type": "Urban", "state": "QLD", "lat": -27.45101, "lon": 151.947341}, {"name": "Hollywell", "address": "318 Bayview St", "locality": "Hollywell QLD", "type": "Urban", "state": "QLD", "lat": -27.895359, "lon": 153.398747}, {"name": "Home Hill", "address": "83 Tenth Av", "locality": "Home Hill QLD", "type": "Urban", "state": "QLD", "lat": -19.660958, "lon": 147.416043}, {"name": "Hughenden", "address": "4 Swanson St", "locality": "Hughenden QLD", "type": "Urban", "state": "QLD", "lat": -20.850257, "lon": 144.193673}, {"name": "Imbil", "address": "113 Yabba Rd", "locality": "Imbil QLD", "type": "Urban", "state": "QLD", "lat": -26.459102, "lon": 152.676503}, {"name": "Inglewood", "address": "32 Albert St", "locality": "Inglewood QLD", "type": "Urban", "state": "QLD", "lat": -28.413779, "lon": 151.082618}, {"name": "Injune", "address": "58 Ronald St", "locality": "Injune QLD", "type": "Urban", "state": "QLD", "lat": -25.845376, "lon": 148.562966}, {"name": "Jimboomba", "address": "22-24 Johanna St", "locality": "Jimboomba QLD", "type": "Urban", "state": "QLD", "lat": -27.829084, "lon": 153.02505}, {"name": "Kalbar", "address": "66 George St", "locality": "Kalbar QLD", "type": "Urban", "state": "QLD", "lat": -27.94077, "lon": 152.623833}, {"name": "Karana Downs", "address": "2 College Rd", "locality": "Karana Downs QLD", "type": "Urban", "state": "QLD", "lat": -27.55227, "lon": 152.80692}, {"name": "Kawana", "address": "194 Nicklin Way", "locality": "Warana QLD", "type": "Urban", "state": "QLD", "lat": -26.721092, "lon": 153.129143}, {"name": "Kemp Place", "address": "21 Martin Street", "locality": "Fortitude Valley QLD", "type": "Urban", "state": "QLD", "lat": -27.460617, "lon": 153.03578}, {"name": "Pullenvale", "address": "6 Pullenvale Rd", "locality": "Pullenvale QLD", "type": "Urban", "state": "QLD", "lat": -27.521419, "lon": 152.921518}, {"name": "Kilcoy", "address": "17 Mccauley St", "locality": "Kilcoy QLD", "type": "Urban", "state": "QLD", "lat": -26.941278, "lon": 152.565004}, {"name": "Killarney", "address": "29 Ivy St", "locality": "Killarney QLD", "type": "Urban", "state": "QLD", "lat": -28.332915, "lon": 152.29704}, {"name": "Kippa Ring", "address": "66 Boardman Road", "locality": "Kippa Ring QLD", "type": "Urban", "state": "QLD", "lat": -27.21929, "lon": 153.087876}, {"name": "Kirwan", "address": "84 Thuringowa Drive", "locality": "Thuringowa Central QLD", "type": "Urban", "state": "QLD", "lat": -19.309386, "lon": 146.731224}, {"name": "Kumbia", "address": "16 Gordon St", "locality": "Kumbia QLD", "type": "Urban", "state": "QLD", "lat": -26.691705, "lon": 151.651847}, {"name": "Laidley", "address": "56 William St", "locality": "Laidley QLD", "type": "Urban", "state": "QLD", "lat": -27.631762, "lon": 152.397548}, {"name": "Loganlea", "address": "739 Kingston Rd", "locality": "Waterford West QLD", "type": "Urban", "state": "QLD", "lat": -27.682485, "lon": 153.121461}, {"name": "Lowood", "address": "52 Main St", "locality": "Lowood QLD", "type": "Urban", "state": "QLD", "lat": -27.460656, "lon": 152.58138}, {"name": "Mackay", "address": "90 Sydney St", "locality": "Mackay QLD", "type": "Urban", "state": "QLD", "lat": -21.14583, "lon": 149.186226}, {"name": "Magnetic Island", "address": "54 Kelly St", "locality": "Nelly Bay QLD", "type": "Urban", "state": "QLD", "lat": -19.156358, "lon": 146.845418}, {"name": "Maryborough", "address": "98 Alice St", "locality": "Maryborough QLD", "type": "Urban", "state": "QLD", "lat": -25.540277, "lon": 152.698443}, {"name": "Meandarra", "address": "Lot 2, Olser St", "locality": "Meandarra QLD", "type": "Urban", "state": "QLD", "lat": -27.323155, "lon": 149.880652}, {"name": "Middlemount", "address": "85 Centenary Dr", "locality": "Middlemount QLD", "type": "Urban", "state": "QLD", "lat": -22.808086, "lon": 148.702406}, {"name": "Miles", "address": "46 Marian St", "locality": "Miles QLD", "type": "Urban", "state": "QLD", "lat": -26.658739, "lon": 150.18742}, {"name": "Millmerran", "address": "2 Attleigh St", "locality": "Millmerran QLD", "type": "Urban", "state": "QLD", "lat": -27.873735, "lon": 151.268538}, {"name": "Miriam Vale", "address": "65 Roe St", "locality": "Miriam Vale QLD", "type": "Urban", "state": "QLD", "lat": -24.326936, "lon": 151.554948}, {"name": "Mission Beach", "address": "4 Webb Rd", "locality": "Mission Beach QLD", "type": "Urban", "state": "QLD", "lat": -17.904753, "lon": 146.092173}, {"name": "Mitchell", "address": "66 Mary St", "locality": "Mitchell QLD", "type": "Urban", "state": "QLD", "lat": -26.486179, "lon": 147.977512}, {"name": "Monto", "address": "15 Kelvin St", "locality": "Monto QLD", "type": "Urban", "state": "QLD", "lat": -24.865631, "lon": 151.123111}, {"name": "Mooloolah", "address": "69 King Road", "locality": "Mooloolah QLD", "type": "Urban", "state": "QLD", "lat": -26.765829, "lon": 152.95865}, {"name": "Moranbah", "address": "13 Griffin St", "locality": "Moranbah QLD", "type": "Urban", "state": "QLD", "lat": -22.000702, "lon": 148.045197}, {"name": "Morven", "address": "29-31 Eurella St", "locality": "Morven QLD", "type": "Urban", "state": "QLD", "lat": -26.416238, "lon": 147.112492}, {"name": "Mount Ommaney", "address": "238 Arrabri Av", "locality": "Mount Ommaney QLD", "type": "Urban", "state": "QLD", "lat": -27.54807, "lon": 152.936432}, {"name": "Mundubbera", "address": "31 Bauer St", "locality": "Mundubbera QLD", "type": "Urban", "state": "QLD", "lat": -25.590733, "lon": 151.301769}, {"name": "Nambour", "address": "678 Bli Bli  Rd", "locality": "Nambour QLD", "type": "Urban", "state": "QLD", "lat": -26.616878, "lon": 152.97204}, {"name": "Nanango", "address": "14 Alfred St", "locality": "Nanango QLD", "type": "Urban", "state": "QLD", "lat": -26.672494, "lon": 151.998618}, {"name": "Nerang", "address": "139 Beaudesert-Nerang Rd", "locality": "Nerang QLD", "type": "Urban", "state": "QLD", "lat": -27.993044, "lon": 153.325172}, {"name": "Noosa Heads", "address": "2 Langura St", "locality": "Noosa Heads QLD", "type": "Urban", "state": "QLD", "lat": -26.408056, "lon": 153.090456}, {"name": "North Mackay", "address": "49 Beaconsfield Rd", "locality": "North Mackay QLD", "type": "Urban", "state": "QLD", "lat": -21.099719, "lon": 149.166081}, {"name": "North Rockhampton", "address": "753 Yaamba Road", "locality": "Parkhurst QLD", "type": "Urban", "state": "QLD", "lat": -23.314502, "lon": 150.515814}, {"name": "Oakey", "address": "5 Desmond St", "locality": "Oakey QLD", "type": "Urban", "state": "QLD", "lat": -27.433481, "lon": 151.722298}, {"name": "Petrie", "address": "4-6 Young St", "locality": "Petrie QLD", "type": "Urban", "state": "QLD", "lat": -27.268716, "lon": 152.978721}, {"name": "Craignish", "address": "67 Castles Road", "locality": "Craignish QLD", "type": "Urban", "state": "QLD", "lat": -25.28191, "lon": 152.726829}, {"name": "Pittsworth", "address": "5 Krinke St", "locality": "Pittsworth QLD", "type": "Urban", "state": "QLD", "lat": -27.714144, "lon": 151.627239}, {"name": "Point Lookout", "address": "85 East Coast Road", "locality": "Point Lookout QLD", "type": "Urban", "state": "QLD", "lat": -27.426458, "lon": 153.519992}, {"name": "Quilpie", "address": "61 Pegler St", "locality": "Quilpie QLD", "type": "Urban", "state": "QLD", "lat": -26.619407, "lon": 144.26709}, {"name": "Rainbow Beach", "address": "25 Rainbow Beach Road", "locality": "Rainbow Beach QLD", "type": "Urban", "state": "QLD", "lat": -25.905409, "lon": 153.090715}, {"name": "Rathdowney", "address": "Running Creek Rd", "locality": "Rathdowney QLD", "type": "Urban", "state": "QLD", "lat": -28.210803, "lon": 152.865234}, {"name": "Ravenshoe", "address": "16 Theta St", "locality": "Ravenshoe QLD", "type": "Urban", "state": "QLD", "lat": -17.609636, "lon": 145.486931}, {"name": "Redland Bay", "address": "33 Gordon Road", "locality": "Redland Bay QLD", "type": "Urban", "state": "QLD", "lat": -27.610897, "lon": 153.289048}, {"name": "Richmond", "address": "43 Goldring St", "locality": "Richmond QLD", "type": "Urban", "state": "QLD", "lat": -20.727719, "lon": 143.140799}, {"name": "Robina", "address": "54 Investigator Dr", "locality": "Robina QLD", "type": "Urban", "state": "QLD", "lat": -28.075644, "lon": 153.377519}, {"name": "Rockhampton", "address": "113 Kent St", "locality": "Rockhampton QLD", "type": "Urban", "state": "QLD", "lat": -23.379496, "lon": 150.508243}, {"name": "Rocklea", "address": "93 Medway St", "locality": "Rocklea QLD", "type": "Urban", "state": "QLD", "lat": -27.541489, "lon": 153.007019}, {"name": "Roma Street", "address": "279 Upper Roma St", "locality": "Brisbane City QLD", "type": "Urban", "state": "QLD", "lat": -27.465816, "lon": 153.015391}, {"name": "Sarina", "address": "12 Anzac St", "locality": "Sarina QLD", "type": "Urban", "state": "QLD", "lat": -21.420738, "lon": 149.214067}, {"name": "Southport", "address": "229 Nerang Rd", "locality": "Southport QLD", "type": "Urban", "state": "QLD", "lat": -27.974871, "lon": 153.39582}, {"name": "Springsure", "address": "52 Wood St", "locality": "Springsure QLD", "type": "Urban", "state": "QLD", "lat": -24.117449, "lon": 148.090274}, {"name": "St George", "address": "37-39 Henry St", "locality": "St George QLD", "type": "Urban", "state": "QLD", "lat": -28.036923, "lon": 148.58261}, {"name": "Stanthorpe", "address": "54 Lock St", "locality": "Stanthorpe QLD", "type": "Urban", "state": "QLD", "lat": -28.654183, "lon": 151.934651}, {"name": "Surat", "address": "45 Cordelia St", "locality": "Surat QLD", "type": "Urban", "state": "QLD", "lat": -27.156574, "lon": 149.06758}, {"name": "Surfers Paradise", "address": "2794 Gold Coast Hwy", "locality": "Surfers Paradise QLD", "type": "Urban", "state": "QLD", "lat": -28.01916, "lon": 153.428807}, {"name": "Tara", "address": "21 Fry St", "locality": "Tara QLD", "type": "Urban", "state": "QLD", "lat": -27.278259, "lon": 150.459861}, {"name": "Taringa", "address": "26 Whitmore St", "locality": "Taringa QLD", "type": "Urban", "state": "QLD", "lat": -27.491368, "lon": 152.987107}, {"name": "Taroom", "address": "12 Kinnoul St", "locality": "Taroom QLD", "type": "Urban", "state": "QLD", "lat": -25.639989, "lon": 149.796297}, {"name": "Texas", "address": "16 St John St", "locality": "Texas QLD", "type": "Urban", "state": "QLD", "lat": -28.852547, "lon": 151.167552}, {"name": "Thangool", "address": "25 Stanley St", "locality": "Thangool QLD", "type": "Urban", "state": "QLD", "lat": -24.487823, "lon": 150.574595}, {"name": "Theodore", "address": "31 Fifth Av", "locality": "Theodore QLD", "type": "Urban", "state": "QLD", "lat": -24.947917, "lon": 150.076569}, {"name": "Tieri", "address": "3 Malvern Av", "locality": "Tieri QLD", "type": "Urban", "state": "QLD", "lat": -23.037773, "lon": 148.344909}, {"name": "Toogoolawah", "address": "20 Cressbrook St", "locality": "Toogoolawah QLD", "type": "Urban", "state": "QLD", "lat": -27.086727, "lon": 152.377866}, {"name": "Toowoomba", "address": "11 Kitchener St", "locality": "Toowoomba QLD", "type": "Urban", "state": "QLD", "lat": -27.564388, "lon": 151.959897}, {"name": "Torquay", "address": "227 Torquay Tce", "locality": "Torquay QLD", "type": "Urban", "state": "QLD", "lat": -25.287146, "lon": 152.865613}, {"name": "Townsville", "address": "2-8 Morey St", "locality": "Townsville QLD", "type": "Urban", "state": "QLD", "lat": -19.263196, "lon": 146.820589}, {"name": "Walkerston", "address": "21 Dutton St", "locality": "Walkerston QLD", "type": "Urban", "state": "QLD", "lat": -21.161094, "lon": 149.068545}, {"name": "Wallangarra", "address": "53 Margetts St", "locality": "Wallangarra QLD", "type": "Urban", "state": "QLD", "lat": -28.920359, "lon": 151.930872}, {"name": "Wandoan", "address": "51 North St", "locality": "Wandoan QLD", "type": "Urban", "state": "QLD", "lat": -26.118212, "lon": 149.960932}, {"name": "West Logan", "address": "2 Orr Crt", "locality": "Hillcrest QLD", "type": "Urban", "state": "QLD", "lat": -27.67816, "lon": 153.030174}, {"name": "Windsor", "address": "7 Truro St", "locality": "Windsor QLD", "type": "Urban", "state": "QLD", "lat": -27.427715, "lon": 153.033196}, {"name": "Winton", "address": "69 Vindex St", "locality": "Winton QLD", "type": "Urban", "state": "QLD", "lat": -22.387239, "lon": 143.038337}, {"name": "Wishart", "address": "203 Dawson Rd", "locality": "Wishart QLD", "type": "Urban", "state": "QLD", "lat": -27.555077, "lon": 153.09067}, {"name": "Wondai", "address": "82 Mackenzie St", "locality": "Wondai QLD", "type": "Urban", "state": "QLD", "lat": -26.319253, "lon": 151.873017}, {"name": "Woodford", "address": "2366 D'Aguilar Highway", "locality": "Woodford QLD", "type": "Urban", "state": "QLD", "lat": -26.963454, "lon": 152.780374}, {"name": "Woodlands", "address": "1 Abattoir Road", "locality": "Woodlands QLD", "type": "Urban", "state": "QLD", "lat": -19.264696, "lon": 146.709547}, {"name": "Woodridge", "address": "95 Kingston Rd", "locality": "Woodridge QLD", "type": "Urban", "state": "QLD", "lat": -27.626824, "lon": 153.11694}, {"name": "Wooroolin", "address": "45 Alexander St", "locality": "Wooroolin QLD", "type": "Urban", "state": "QLD", "lat": -26.409838, "lon": 151.815237}, {"name": "Wulguru", "address": "171 Stuart Dr", "locality": "Wulguru QLD", "type": "Urban", "state": "QLD", "lat": -19.319617, "lon": 146.814379}, {"name": "Wynnum", "address": "2006 Wynnum Rd", "locality": "Wynnum West QLD", "type": "Urban", "state": "QLD", "lat": -27.456218, "lon": 153.153376}, {"name": "Yelarbon", "address": "32 Taloom St", "locality": "Yelarbon QLD", "type": "Urban", "state": "QLD", "lat": -28.5723, "lon": 150.75411}, {"name": "Ripley", "address": "338-396 Ripley Rd", "locality": "Ripley QLD", "type": "Urban", "state": "QLD", "lat": -27.659293, "lon": 152.779816}, {"name": "Brassall", "address": "Diamentina Boulevard", "locality": "Brassall QLD", "type": "Urban", "state": "QLD", "lat": -27.5851, "lon": 152.7247}, {"name": "Bollon", "address": "56-58 Main St", "locality": "Bollon QLD", "type": "Urban", "state": "QLD", "lat": -28.031714, "lon": 147.476561}, {"name": "Clifton", "address": "King St", "locality": "Clifton QLD", "type": "Urban", "state": "QLD", "lat": -27.926082, "lon": 151.906175}, {"name": "Cunnamulla", "address": "1 Emma Street", "locality": "Cunnamulla QLD", "type": "Urban", "state": "QLD", "lat": -28.067965, "lon": 145.684562}, {"name": "Jandowae", "address": "55 High St", "locality": "Jandowae QLD", "type": "Urban", "state": "QLD", "lat": -26.781748, "lon": 151.110622}, {"name": "Julia Creek", "address": "66 Burke St", "locality": "Julia Creek QLD", "type": "Urban", "state": "QLD", "lat": -20.65762, "lon": 141.742958}, {"name": "Mareeba", "address": "20 Mammino St", "locality": "Mareeba QLD", "type": "Urban", "state": "QLD", "lat": -17.011163, "lon": 145.425568}, {"name": "Pomona", "address": "9-13 Reserve St", "locality": "Pomona QLD", "type": "Urban", "state": "QLD", "lat": -26.365332, "lon": 152.854649}, {"name": "Ingham", "address": "15 Eleanor Street", "locality": "Ingham QLD", "type": "Urban", "state": "QLD", "lat": -18.649601, "lon": 146.162541}, {"name": "Port Douglas", "address": "5 Port Douglas Rd", "locality": "Port Douglas QLD", "type": "Urban", "state": "QLD", "lat": -16.499085, "lon": 145.463146}, {"name": "Charleville", "address": "96 Galatea St", "locality": "Charleville QLD", "type": "Urban", "state": "QLD", "lat": -26.401468, "lon": 146.241144}, {"name": "Augathella", "address": "65 Cavanagh St", "locality": "Augathella QLD", "type": "Urban", "state": "QLD", "lat": -25.795968, "lon": 146.586127}, {"name": "Esk", "address": "243 Ipswich Street", "locality": "Esk QLD", "type": "Urban", "state": "QLD", "lat": -27.235288, "lon": 152.41842}, {"name": "Tin Can Bay", "address": "Lot 1, Snapper Creek Rd", "locality": "Tin Can Bay QLD", "type": "Urban", "state": "QLD", "lat": -25.926271, "lon": 152.995366}, {"name": "Pimpama", "address": "1 Cox Road", "locality": "Pimpama QLD", "type": "Urban", "state": "QLD", "lat": -27.823121, "lon": 153.302625}, {"name": "Emerald", "address": "2A Andrews Rd", "locality": "Emerald QLD", "type": "Urban", "state": "QLD", "lat": -23.544476, "lon": 148.172509}, {"name": "Beaudesert", "address": "39 Brisbane St", "locality": "Beaudesert QLD", "type": "Urban", "state": "QLD", "lat": -27.989961, "lon": 152.996584}, {"name": "Gordonvale", "address": "27 Gilles Range Road", "locality": "Gordonvale QLD", "type": "Urban", "state": "QLD", "lat": -17.106857, "lon": 145.775002}, {"name": "Kingaroy", "address": "25 Edward Street", "locality": "Kingaroy QLD", "type": "Urban", "state": "QLD", "lat": -26.536968, "lon": 151.839432}, {"name": "Mount Isa", "address": "35 West St", "locality": "Mount Isa City QLD", "type": "Urban", "state": "QLD", "lat": -20.723699, "lon": 139.490042}, {"name": "Mount Morgan", "address": "32 Morgan St", "locality": "Mount Morgan QLD", "type": "Urban", "state": "QLD", "lat": -23.645753, "lon": 150.386588}, {"name": "Gatton", "address": "58 North St", "locality": "Gatton QLD", "type": "Urban", "state": "QLD", "lat": -27.557692, "lon": 152.27863}, {"name": "Bribie Island", "address": "10-12 Faraday St", "locality": "Bribie Island QLD", "type": "Urban", "state": "QLD", "lat": -27.063074, "lon": 153.154127}, {"name": "Yarraman", "address": "7 Toomey St", "locality": "Yarraman QLD", "type": "Urban", "state": "QLD", "lat": -26.83931, "lon": 151.979259}, {"name": "Kilkivan", "address": "Cnr Wide Bay Hwy And Crescent St", "locality": "Kilkivan QLD", "type": "Urban", "state": "QLD", "lat": -26.084328, "lon": 152.242671}, {"name": "Murgon", "address": "64 Gore St", "locality": "Murgon QLD", "type": "Urban", "state": "QLD", "lat": -26.243185, "lon": 151.940546}, {"name": "Proston", "address": "24 Collingwood St", "locality": "Proston QLD", "type": "Urban", "state": "QLD", "lat": -26.164711, "lon": 151.60263}, {"name": "Tewantin", "address": "2 Hilton Tce", "locality": "Tewantin QLD", "type": "Urban", "state": "QLD", "lat": -26.396323, "lon": 153.043839}, {"name": "Beerwah", "address": "23A Beerwah Parade", "locality": "Beerwah QLD", "type": "Urban", "state": "QLD", "lat": -26.855244, "lon": 152.959285}, {"name": "Caloundra", "address": "18 Industrial Av", "locality": "Caloundra West QLD", "type": "Urban", "state": "QLD", "lat": -26.795544, "lon": 153.11796}, {"name": "Maroochydore", "address": "1 North Buderim Bvd", "locality": "Maroochydore QLD", "type": "Urban", "state": "QLD", "lat": -26.662585, "lon": 153.06512}, {"name": "Charlton", "address": "17 Steger Rd", "locality": "Charlton QLD", "type": "Urban", "state": "QLD", "lat": -27.517913, "lon": 151.848024}, {"name": "Malanda", "address": "23 James St", "locality": "Malanda QLD", "type": "Urban", "state": "QLD", "lat": -17.353054, "lon": 145.595494}, {"name": "Herberton", "address": "38 Perkins St", "locality": "Herberton QLD", "type": "Urban", "state": "QLD", "lat": -17.389219, "lon": 145.387464}, {"name": "Smithfield", "address": "2-4 Ainslie Place", "locality": "Smithfield QLD", "type": "Urban", "state": "QLD", "lat": -16.832725, "lon": 145.694664}, {"name": "Thursday Island", "address": "50 Loban St", "locality": "Thursday Island QLD", "type": "Urban", "state": "QLD", "lat": -10.577056, "lon": 142.222278}, {"name": "Innisfail", "address": "48-50 Fitzgerald Esplanade", "locality": "Innisfail QLD", "type": "Urban", "state": "QLD", "lat": -17.521629, "lon": 146.030865}, {"name": "Kurrimine Beach", "address": "911 Murdering Pt Rd", "locality": "Kurrimine Beach QLD", "type": "Urban", "state": "QLD", "lat": -17.773398, "lon": 146.10141}, {"name": "Alpha", "address": "1 Burns St", "locality": "Alpha QLD", "type": "Urban", "state": "QLD", "lat": -23.649268, "lon": 146.633271}, {"name": "Beenleigh", "address": "35 Brigade Dr", "locality": "Beenleigh QLD", "type": "Urban", "state": "QLD", "lat": -27.703331, "lon": 153.201909}, {"name": "Burnett Heads", "address": "15 Brewer St", "locality": "Burnett Heads QLD", "type": "Urban", "state": "QLD", "lat": -24.763896, "lon": 152.409973}, {"name": "Dunwich", "address": "39 Mitchell Cr", "locality": "Dunwich QLD", "type": "Urban", "state": "QLD", "lat": -27.497694, "lon": 153.408665}, {"name": "Enoggera", "address": "224 Lloyd St", "locality": "Enoggera QLD", "type": "Urban", "state": "QLD", "lat": -27.425457, "lon": 152.988817}, {"name": "Goondiwindi", "address": "173 Marshall St", "locality": "Goondiwindi QLD", "type": "Urban", "state": "QLD", "lat": -28.547462, "lon": 150.312549}, {"name": "Halifax", "address": "5 Rosendahl St", "locality": "Halifax QLD", "type": "Urban", "state": "QLD", "lat": -18.584428, "lon": 146.28652}, {"name": "Kenilworth", "address": "10 Philip St", "locality": "Kenilworth QLD", "type": "Urban", "state": "QLD", "lat": -26.594654, "lon": 152.726684}, {"name": "Kooralbyn", "address": "13 Salisbury Av", "locality": "Kooralbyn QLD", "type": "Urban", "state": "QLD", "lat": -28.085723, "lon": 152.842055}, {"name": "Kuranda", "address": "12A Coondoo St", "locality": "Kuranda QLD", "type": "Urban", "state": "QLD", "lat": -16.820407, "lon": 145.634486}, {"name": "Millaa Millaa", "address": "1 Maple Av", "locality": "Millaa Millaa QLD", "type": "Urban", "state": "QLD", "lat": -17.511867, "lon": 145.61289}, {"name": "Moura", "address": "5 Gilchrist St", "locality": "Moura QLD", "type": "Urban", "state": "QLD", "lat": -24.570531, "lon": 149.97459}, {"name": "Proserpine", "address": "61 Hinschen St", "locality": "Proserpine QLD", "type": "Urban", "state": "QLD", "lat": -20.404324, "lon": 148.578614}, {"name": "Yungaburra", "address": "32 Eacham Rd", "locality": "Yungaburra QLD", "type": "Urban", "state": "QLD", "lat": -17.270832, "lon": 145.58466}, {"name": "Rosewood", "address": "41A Albert St", "locality": "Rosewood QLD", "type": "Urban", "state": "QLD", "lat": -27.6375, "lon": 152.590371}, {"name": "Maleny", "address": "2 Dixon Ave", "locality": "Maleny QLD", "type": "Urban", "state": "QLD", "lat": -26.755613, "lon": 152.836563}, {"name": "Bracken Ridge", "address": "223 Bracken Ridge Road", "locality": "Bracken Ridge QLD", "type": "Urban", "state": "QLD", "lat": -27.311752, "lon": 153.042603}, {"name": "Taigum", "address": "263 Beams Road", "locality": "Taigum QLD", "type": "Urban", "state": "QLD", "lat": -27.350896, "lon": 153.046566}, {"name": "Mossman", "address": "87-89 Front St", "locality": "Mossman QLD", "type": "Urban", "state": "QLD", "lat": -16.467253, "lon": 145.372501}, {"name": "Marburg", "address": "75 Edmond St", "locality": "Marburg QLD", "type": "Urban", "state": "QLD", "lat": -27.565705, "lon": 152.595685}, {"name": "Gracemere", "address": "9 Russell St", "locality": "Gracemere QLD", "type": "Urban", "state": "QLD", "lat": -23.438658, "lon": 150.455305}, {"name": "Longreach", "address": "107-111 Emu St", "locality": "Longreach QLD", "type": "Urban", "state": "QLD", "lat": -23.440782, "lon": 144.247477}, {"name": "Glenden", "address": "2 Bell Pl", "locality": "Glenden QLD", "type": "Urban", "state": "QLD", "lat": -21.358349, "lon": 148.11895}, {"name": "Yarrabilba", "address": "23-31 Adler Circuit", "locality": "Yarrabilba QLD", "type": "Urban", "state": "QLD", "lat": -27.802544, "lon": 153.099545}, {"name": "Tamborine Mountain", "address": "126 Main Western Rd", "locality": "Tamborine Mountain QLD", "type": "Urban", "state": "QLD", "lat": -27.936395, "lon": 153.180429}, {"name": "Moreton Bay Central", "address": "12 Steel Street", "locality": "Narangba QLD", "type": "Urban", "state": "QLD", "lat": -27.201447, "lon": 153.011131}, {"name": "Mount Cotton Road", "address": "Cnr Mt Cotton & Coorang Rds", "locality": "Carbrook QLD", "type": "Urban", "state": "QLD", "lat": -27.666064, "lon": 153.232688}, {"name": "Airlie Beach", "address": "2495 Shute Harbour Rd", "locality": "Airlie Beach QLD", "type": "Urban", "state": "QLD", "lat": -20.278044, "lon": 148.727462}, {"name": "Charters Towers", "address": "3-5 Enterprise Rd", "locality": "Charters Towers QLD", "type": "Urban", "state": "QLD", "lat": -20.07661, "lon": 146.270171}, {"name": "Cherbourg", "address": "1 Fisher St", "locality": "Cherbourg QLD", "type": "Urban", "state": "QLD", "lat": -26.289071, "lon": 151.956741}, {"name": "Coolum", "address": "19 Russell Street", "locality": "Coolum QLD", "type": "Urban", "state": "QLD", "lat": -26.528854, "lon": 153.087134}, {"name": "Emu Park", "address": "87 Hartley St", "locality": "Emu Park QLD", "type": "Urban", "state": "QLD", "lat": -23.266465, "lon": 150.820089}, {"name": "Roma", "address": "41 Mcdowall St", "locality": "Roma QLD", "type": "Urban", "state": "QLD", "lat": -26.571803, "lon": 148.792568}, {"name": "Tully", "address": "Lot 600 Murray St", "locality": "Tully QLD", "type": "Urban", "state": "QLD", "lat": -17.933202, "lon": 145.928389}, {"name": "Warwick", "address": "23 Canning St", "locality": "Warwick QLD", "type": "Urban", "state": "QLD", "lat": -28.215771, "lon": 152.036998}, {"name": "Yeppoon", "address": "16 Mcbean St", "locality": "Yeppoon QLD", "type": "Urban", "state": "QLD", "lat": -23.140666, "lon": 150.737121}, {"name": "Adelaide City Fire Station", "address": "99 Wakefield St", "locality": "Adelaide SA 5000", "type": "Urban", "state": "SA", "lat": -34.9271, "lon": 138.6059}, {"name": "Angle Park Fire Station", "address": "19 Port Rd", "locality": "Angle Park SA 5010", "type": "Urban", "state": "SA", "lat": -34.8854, "lon": 138.5752}, {"name": "Norwood Fire Station", "address": "65 The Parade", "locality": "Norwood SA 5067", "type": "Urban", "state": "SA", "lat": -34.9162, "lon": 138.6441}, {"name": "Edwardstown Fire Station", "address": "673 South Rd", "locality": "Edwardstown SA 5039", "type": "Urban", "state": "SA", "lat": -34.9937, "lon": 138.5738}, {"name": "Goodwood Fire Station", "address": "4 Young St", "locality": "Goodwood SA 5034", "type": "Urban", "state": "SA", "lat": -34.9475, "lon": 138.5788}, {"name": "Bowden Fire Station", "address": "5 Hawker St", "locality": "Bowden SA 5007", "type": "Urban", "state": "SA", "lat": -34.8975, "lon": 138.585}, {"name": "Prospect Fire Station", "address": "74 Churchill Rd", "locality": "Prospect SA 5082", "type": "Urban", "state": "SA", "lat": -34.8765, "lon": 138.6026}, {"name": "Glenelg Fire Station", "address": "5 Moseley St", "locality": "Glenelg SA 5045", "type": "Urban", "state": "SA", "lat": -34.9828, "lon": 138.516}, {"name": "Holden Hill Fire Station", "address": "180 North East Rd", "locality": "Holden Hill SA 5088", "type": "Urban", "state": "SA", "lat": -34.8588, "lon": 138.6665}, {"name": "Modbury Fire Station", "address": "960 North East Rd", "locality": "Modbury SA 5092", "type": "Urban", "state": "SA", "lat": -34.8382, "lon": 138.6895}, {"name": "Elizabeth Fire Station", "address": "1 Halsey Rd", "locality": "Elizabeth SA 5112", "type": "Urban", "state": "SA", "lat": -34.7189, "lon": 138.6746}, {"name": "Salisbury Fire Station", "address": "21 Commercial Rd", "locality": "Salisbury SA 5108", "type": "Urban", "state": "SA", "lat": -34.7626, "lon": 138.638}, {"name": "Christies Beach Fire Station", "address": "10 Dyson Rd", "locality": "Christies Beach SA 5165", "type": "Urban", "state": "SA", "lat": -35.1328, "lon": 138.4915}, {"name": "Morphett Vale Fire Station", "address": "146 Main South Rd", "locality": "Morphett Vale SA 5162", "type": "Urban", "state": "SA", "lat": -35.1225, "lon": 138.5241}, {"name": "Noarlunga Fire Station", "address": "Cnr Dyson & Ramsay Rds", "locality": "Noarlunga Centre SA 5168", "type": "Urban", "state": "SA", "lat": -35.1428, "lon": 138.4965}, {"name": "Port Adelaide Fire Station", "address": "3 St Vincent St", "locality": "Port Adelaide SA 5015", "type": "Urban", "state": "SA", "lat": -34.8476, "lon": 138.5198}, {"name": "Birkenhead Fire Station", "address": "86 Birkenhead Rd", "locality": "Birkenhead SA 5015", "type": "Urban", "state": "SA", "lat": -34.8432, "lon": 138.5048}, {"name": "Dry Creek Fire Station", "address": "2 Grand Trunkway", "locality": "Dry Creek SA 5094", "type": "Urban", "state": "SA", "lat": -34.8239, "lon": 138.6012}, {"name": "Woodville Fire Station", "address": "151 Woodville Rd", "locality": "Woodville SA 5011", "type": "Urban", "state": "SA", "lat": -34.8768, "lon": 138.5401}, {"name": "Mitcham Fire Station", "address": "254 Belair Rd", "locality": "Torrens Park SA 5062", "type": "Urban", "state": "SA", "lat": -35.0008, "lon": 138.5894}, {"name": "Marion Fire Station", "address": "836 Marion Rd", "locality": "Marion SA 5043", "type": "Urban", "state": "SA", "lat": -35.0148, "lon": 138.5498}, {"name": "Tea Tree Gully Fire Station", "address": "1097 North East Rd", "locality": "Tea Tree Gully SA 5091", "type": "Urban", "state": "SA", "lat": -34.8255, "lon": 138.7027}, {"name": "Port Lincoln Fire Station", "address": "Cnr Jubilee & Mortlock Tce", "locality": "Port Lincoln SA 5606", "type": "Urban", "state": "SA", "lat": -34.7208, "lon": 135.8555}, {"name": "Whyalla Fire Station", "address": "11 Ekblom St", "locality": "Whyalla SA 5600", "type": "Urban", "state": "SA", "lat": -33.0381, "lon": 137.5718}, {"name": "Mount Gambier Fire Station", "address": "30 Watson Tce", "locality": "Mount Gambier SA 5290", "type": "Urban", "state": "SA", "lat": -37.8301, "lon": 140.7815}, {"name": "Murray Bridge Fire Station", "address": "57 Seventh St", "locality": "Murray Bridge SA 5253", "type": "Urban", "state": "SA", "lat": -35.1193, "lon": 139.2749}, {"name": "Perth City Fire Station", "address": "420 Murray St", "locality": "Perth WA 6000", "type": "Urban", "state": "WA", "lat": -31.9524, "lon": 115.8613}, {"name": "Fremantle Fire Station", "address": "14 Phillimore St", "locality": "Fremantle WA 6160", "type": "Urban", "state": "WA", "lat": -32.0553, "lon": 115.7448}, {"name": "Midland Fire Station", "address": "152 Great Eastern Hwy", "locality": "Midland WA 6056", "type": "Urban", "state": "WA", "lat": -31.8913, "lon": 116.0055}, {"name": "Joondalup Fire Station", "address": "39 Boas Ave", "locality": "Joondalup WA 6027", "type": "Urban", "state": "WA", "lat": -31.7455, "lon": 115.7656}, {"name": "Belmont Fire Station", "address": "101 Abernethy Rd", "locality": "Belmont WA 6104", "type": "Urban", "state": "WA", "lat": -31.9464, "lon": 115.9371}, {"name": "Bull Creek Fire Station", "address": "71 Farrington Rd", "locality": "Bull Creek WA 6149", "type": "Urban", "state": "WA", "lat": -32.0504, "lon": 115.8456}, {"name": "Cannington Fire Station", "address": "21 Wharf St", "locality": "Cannington WA 6107", "type": "Urban", "state": "WA", "lat": -31.9827, "lon": 115.9397}, {"name": "Canning Vale Fire Station", "address": "41 Ranford Rd", "locality": "Canning Vale WA 6155", "type": "Urban", "state": "WA", "lat": -32.0466, "lon": 115.9124}, {"name": "Cockburn Fire Station", "address": "11 Lyon Rd", "locality": "Cockburn Central WA 6164", "type": "Urban", "state": "WA", "lat": -32.1053, "lon": 115.841}, {"name": "Ellenbrook Fire Station", "address": "6 Mornington Pky", "locality": "Ellenbrook WA 6069", "type": "Urban", "state": "WA", "lat": -31.7855, "lon": 115.9792}, {"name": "Forrestfield Fire Station", "address": "10 Fulton Rd", "locality": "Forrestfield WA 6058", "type": "Urban", "state": "WA", "lat": -31.9817, "lon": 116.0193}, {"name": "Girrawheen Fire Station", "address": "50 Mirrabooka Ave", "locality": "Girrawheen WA 6064", "type": "Urban", "state": "WA", "lat": -31.839, "lon": 115.841}, {"name": "Gosnells Fire Station", "address": "2177 Albany Hwy", "locality": "Gosnells WA 6110", "type": "Urban", "state": "WA", "lat": -32.0821, "lon": 115.9971}, {"name": "Hazelmere Fire Station", "address": "1 Division Rd", "locality": "Hazelmere WA 6055", "type": "Urban", "state": "WA", "lat": -31.9089, "lon": 115.9731}, {"name": "Karrinyup Fire Station", "address": "8 Moncrieff Rd", "locality": "Karrinyup WA 6018", "type": "Urban", "state": "WA", "lat": -31.8694, "lon": 115.7748}, {"name": "Malaga Fire Station", "address": "95 Collier Rd", "locality": "Malaga WA 6090", "type": "Urban", "state": "WA", "lat": -31.8561, "lon": 115.8874}, {"name": "Mandurah Fire Station", "address": "25 Pinjarra Rd", "locality": "Mandurah WA 6210", "type": "Urban", "state": "WA", "lat": -32.5275, "lon": 115.728}, {"name": "Morley Fire Station", "address": "396 Walter Rd", "locality": "Morley WA 6062", "type": "Urban", "state": "WA", "lat": -31.8964, "lon": 115.9096}, {"name": "Murdoch Fire Station", "address": "337 South St", "locality": "Murdoch WA 6150", "type": "Urban", "state": "WA", "lat": -32.0664, "lon": 115.841}, {"name": "Northbridge Fire Station", "address": "21 Fitzgerald St", "locality": "Northbridge WA 6003", "type": "Urban", "state": "WA", "lat": -31.9447, "lon": 115.8552}, {"name": "Ocean Reef Fire Station", "address": "133 Hodges Dr", "locality": "Ocean Reef WA 6027", "type": "Urban", "state": "WA", "lat": -31.7597, "lon": 115.7482}, {"name": "Osborne Park Fire Station", "address": "2 Scarborough Beach Rd", "locality": "Osborne Park WA 6017", "type": "Urban", "state": "WA", "lat": -31.902, "lon": 115.8208}, {"name": "Rockingham Fire Station", "address": "4 Chalgrove Ave", "locality": "Rockingham WA 6168", "type": "Urban", "state": "WA", "lat": -32.2795, "lon": 115.731}, {"name": "Scarborough Fire Station", "address": "103 Scarborough Beach Rd", "locality": "Scarborough WA 6019", "type": "Urban", "state": "WA", "lat": -31.8939, "lon": 115.7535}, {"name": "South Lake Fire Station", "address": "11 Gaebler Rd", "locality": "South Lake WA 6164", "type": "Urban", "state": "WA", "lat": -32.0966, "lon": 115.832}, {"name": "Success Fire Station", "address": "51 Troode St", "locality": "Success WA 6164", "type": "Urban", "state": "WA", "lat": -32.1129, "lon": 115.8412}, {"name": "Swan Fire Station", "address": "10 Weir St", "locality": "Midvale WA 6056", "type": "Urban", "state": "WA", "lat": -31.8855, "lon": 116.0208}, {"name": "Thornlie Fire Station", "address": "3 Discovery Rd", "locality": "Thornlie WA 6108", "type": "Urban", "state": "WA", "lat": -32.0521, "lon": 115.9738}, {"name": "Wangara Fire Station", "address": "9 Prindiville Dr", "locality": "Wangara WA 6065", "type": "Urban", "state": "WA", "lat": -31.8087, "lon": 115.8399}, {"name": "Wanneroo Fire Station", "address": "923 Wanneroo Rd", "locality": "Wanneroo WA 6065", "type": "Urban", "state": "WA", "lat": -31.7551, "lon": 115.8133}, {"name": "Welshpool Fire Station", "address": "112 Welshpool Rd", "locality": "Welshpool WA 6106", "type": "Urban", "state": "WA", "lat": -31.9913, "lon": 115.948}, {"name": "Kalgoorlie Fire Station", "address": "85 Burt St", "locality": "Kalgoorlie WA 6430", "type": "Urban", "state": "WA", "lat": -30.745, "lon": 121.4667}, {"name": "Boulder Fire Station", "address": "120 Burt St", "locality": "Boulder WA 6432", "type": "Urban", "state": "WA", "lat": -30.7819, "lon": 121.4883}, {"name": "Bunbury Fire Station", "address": "1 Forrest Ave", "locality": "Bunbury WA 6230", "type": "Urban", "state": "WA", "lat": -33.3295, "lon": 115.6404}, {"name": "Geraldton Fire Station", "address": "45 Fitzgerald St", "locality": "Geraldton WA 6530", "type": "Urban", "state": "WA", "lat": -28.776, "lon": 114.6093}, {"name": "Albany Fire Station", "address": "25 Serpentine Rd", "locality": "Albany WA 6330", "type": "Urban", "state": "WA", "lat": -35.0288, "lon": 117.8822}, {"name": "Karratha Fire Station", "address": "Lot 4000 Welcome Rd", "locality": "Karratha WA 6714", "type": "Urban", "state": "WA", "lat": -20.734, "lon": 116.8468}, {"name": "Port Hedland Fire Station", "address": "12 Edgar St", "locality": "Port Hedland WA 6721", "type": "Urban", "state": "WA", "lat": -20.315, "lon": 118.5772}, {"name": "Broome Fire Station", "address": "Cnr Weld & Barker St", "locality": "Broome WA 6725", "type": "Urban", "state": "WA", "lat": -17.9613, "lon": 122.2359}, {"name": "Esperance Fire Station", "address": "136 Dempster St", "locality": "Esperance WA 6450", "type": "Urban", "state": "WA", "lat": -33.8581, "lon": 121.892}, {"name": "Ainslie Fire Station", "address": "10 Rutherford Ave", "locality": "Ainslie ACT 2602", "type": "Urban", "state": "ACT", "lat": -35.2724, "lon": 149.1463}, {"name": "Belconnen Fire Station", "address": "152 Benjamin Way", "locality": "Belconnen ACT 2617", "type": "Urban", "state": "ACT", "lat": -35.2345, "lon": 149.0591}, {"name": "Canberra City Fire Station", "address": "13 Northbourne Ave", "locality": "Canberra ACT 2601", "type": "Urban", "state": "ACT", "lat": -35.2793, "lon": 149.131}, {"name": "Charnwood Fire Station", "address": "88 Starke St", "locality": "Charnwood ACT 2615", "type": "Urban", "state": "ACT", "lat": -35.1963, "lon": 149.0245}, {"name": "Fyshwick Fire Station", "address": "149 Gladstone St", "locality": "Fyshwick ACT 2609", "type": "Urban", "state": "ACT", "lat": -35.3265, "lon": 149.1642}, {"name": "Gungahlin Fire Station", "address": "20 Ernest Cavanagh St", "locality": "Gungahlin ACT 2912", "type": "Urban", "state": "ACT", "lat": -35.1822, "lon": 149.1321}, {"name": "Phillip Fire Station", "address": "71 Launceston St", "locality": "Phillip ACT 2606", "type": "Urban", "state": "ACT", "lat": -35.3478, "lon": 149.0984}, {"name": "Tuggeranong Fire Station", "address": "100 Athllon Dr", "locality": "Greenway ACT 2900", "type": "Urban", "state": "ACT", "lat": -35.4275, "lon": 149.0841}, {"name": "Weston Fire Station", "address": "Yarralumla Dr", "locality": "Weston ACT 2611", "type": "Urban", "state": "ACT", "lat": -35.3236, "lon": 149.0601}, {"name": "Darwin City Fire Station", "address": "51 McMinn St", "locality": "Darwin City NT 0800", "type": "Urban", "state": "NT", "lat": -12.4634, "lon": 130.8456}, {"name": "Palmerston Fire Station", "address": "12 Chung Wah Tce", "locality": "Palmerston NT 0830", "type": "Urban", "state": "NT", "lat": -12.4833, "lon": 130.9822}, {"name": "Winnellie Fire Station", "address": "33 Chung Wah Tce", "locality": "Winnellie NT 0820", "type": "Urban", "state": "NT", "lat": -12.4397, "lon": 130.8864}, {"name": "Casuarina Fire Station", "address": "25 Bradshaw Tce", "locality": "Casuarina NT 0810", "type": "Urban", "state": "NT", "lat": -12.3851, "lon": 130.8706}, {"name": "Katherine Fire Station", "address": "108 First St", "locality": "Katherine NT 0850", "type": "Urban", "state": "NT", "lat": -14.4626, "lon": 132.265}, {"name": "Alice Springs Fire Station", "address": "16 Parsons St", "locality": "Alice Springs NT 0870", "type": "Urban", "state": "NT", "lat": -23.6987, "lon": 133.8728}, {"name": "Tennant Creek Fire Station", "address": "Paterson St", "locality": "Tennant Creek NT 0860", "type": "Urban", "state": "NT", "lat": -19.6465, "lon": 134.1912}, {"name": "Hobart City Fire Station", "address": "4 Argyle St", "locality": "Hobart TAS 7000", "type": "Urban", "state": "TAS", "lat": -42.8821, "lon": 147.3272}, {"name": "Glenorchy Fire Station", "address": "243 Main Rd", "locality": "Glenorchy TAS 7010", "type": "Urban", "state": "TAS", "lat": -42.8344, "lon": 147.298}, {"name": "Kingston Fire Station", "address": "35 Channel Hwy", "locality": "Kingston TAS 7050", "type": "Urban", "state": "TAS", "lat": -42.9763, "lon": 147.3086}, {"name": "Rosny Fire Station", "address": "20 Bayfield St", "locality": "Rosny Park TAS 7018", "type": "Urban", "state": "TAS", "lat": -42.8799, "lon": 147.3726}, {"name": "Sorell Fire Station", "address": "7 Cole St", "locality": "Sorell TAS 7172", "type": "Urban", "state": "TAS", "lat": -42.7821, "lon": 147.5636}, {"name": "Bridgewater Fire Station", "address": "3 Green Point Rd", "locality": "Bridgewater TAS 7030", "type": "Urban", "state": "TAS", "lat": -42.7392, "lon": 147.2363}, {"name": "Launceston Fire Station", "address": "42 St John St", "locality": "Launceston TAS 7250", "type": "Urban", "state": "TAS", "lat": -41.4388, "lon": 147.1347}, {"name": "Kings Meadows Fire Station", "address": "124 Hobart Rd", "locality": "Kings Meadows TAS 7249", "type": "Urban", "state": "TAS", "lat": -41.4582, "lon": 147.1504}, {"name": "Newnham Fire Station", "address": "74 Ravenswood Rd", "locality": "Ravenswood TAS 7250", "type": "Urban", "state": "TAS", "lat": -41.4279, "lon": 147.1419}, {"name": "Riverside Fire Station", "address": "17 Albert Rd", "locality": "Riverside TAS 7250", "type": "Urban", "state": "TAS", "lat": -41.4134, "lon": 147.0941}, {"name": "Devonport Fire Station", "address": "22 Best St", "locality": "Devonport TAS 7310", "type": "Urban", "state": "TAS", "lat": -41.1761, "lon": 146.3504}, {"name": "Ulverstone Fire Station", "address": "2 South Rd", "locality": "Ulverstone TAS 7315", "type": "Urban", "state": "TAS", "lat": -41.1564, "lon": 146.1751}, {"name": "Burnie Fire Station", "address": "14 Ladbrooke St", "locality": "Burnie TAS 7320", "type": "Urban", "state": "TAS", "lat": -41.0531, "lon": 145.9046}, {"name": "Wynyard Fire Station", "address": "54 Goldie St", "locality": "Wynyard TAS 7325", "type": "Urban", "state": "TAS", "lat": -40.9925, "lon": 145.7247}, {"name": "Smithton Fire Station", "address": "46 Smith St", "locality": "Smithton TAS 7330", "type": "Urban", "state": "TAS", "lat": -40.8458, "lon": 145.1182}, {"name": "Penguin Fire Station", "address": "5 Main Rd", "locality": "Penguin TAS 7316", "type": "Urban", "state": "TAS", "lat": -41.1174, "lon": 146.0693}, {"name": "Queenstown Fire Station", "address": "1 Driffield St", "locality": "Queenstown TAS 7467", "type": "Urban", "state": "TAS", "lat": -42.0783, "lon": 145.5517}, {"name": "Strahan Fire Station", "address": "Cnr Harold & Innes St", "locality": "Strahan TAS 7468", "type": "Urban", "state": "TAS", "lat": -42.152, "lon": 145.3277}, {"name": "Huonville Fire Station", "address": "18 Wilmot Rd", "locality": "Huonville TAS 7109", "type": "Urban", "state": "TAS", "lat": -43.0311, "lon": 147.027}, {"name": "New Norfolk Fire Station", "address": "6 High St", "locality": "New Norfolk TAS 7140", "type": "Urban", "state": "TAS", "lat": -42.7818, "lon": 147.0593}, {"name": "Campbell Town Fire Station", "address": "102 High St", "locality": "Campbell Town TAS 7210", "type": "Urban", "state": "TAS", "lat": -41.9264, "lon": 147.4917}, {"name": "Oatlands Fire Station", "address": "103 High St", "locality": "Oatlands TAS 7120", "type": "Urban", "state": "TAS", "lat": -42.2982, "lon": 147.3683}, {"name": "George Town Fire Station", "address": "4 Regent St", "locality": "George Town TAS 7253", "type": "Urban", "state": "TAS", "lat": -41.107, "lon": 146.8262}, {"name": "St Helens Fire Station", "address": "29 Circassian St", "locality": "St Helens TAS 7216", "type": "Urban", "state": "TAS", "lat": -41.3294, "lon": 148.2439}];

// ── Runtime state ─────────────────────────────────────────────────────────────
let fsStations    = FS_BUILTIN_STATIONS; // replaced on upload
let fsMap         = null;
let fsSiteMarker  = null;
let fsStationMarkers = [];  // { marker, station, rank } — draggable
let fsPolylines   = [];     // L.polyline objects (routes + halos)
let fsRouteLayersByRank = {}; // rank → { layers:[], marker } for toggle control

// Route colours — 5 visually distinct, high-contrast colours
const FS_ROUTE_COLORS = ['#e63946','#1d7af3','#ff8800','#21a94f','#9b27af'];

// Station-type badge colours (pin body)
const FS_TYPE_COLOR = {
  'Urban':'#c0392b', 'Industrial':'#e67e22', 'Airport':'#8e44ad', 'default':'#1a56db'
};

// ── Haversine straight-line distance (km) ─────────────────────────────────────
function haversine(lat1,lon1,lat2,lon2){
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ── Geocode address → {lat,lon,display} via Nominatim ────────────────────────
async function geocodeAddress(addr){
  const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1&countrycodes=au`;
  const r=await fetch(url,{headers:{'Accept-Language':'en','User-Agent':'FireCalc/1.0'}});
  const d=await r.json();
  if(!d||!d.length) throw new Error('Address not found. Try a more specific Australian address.');
  return {lat:parseFloat(d[0].lat),lon:parseFloat(d[0].lon),display:d[0].display_name};
}

// ── Parse "(lat,lon)" or "lat,lon" string ─────────────────────────────────────
function parseCoords(s){
  const c=s.replace(/[()]/g,'').trim().split(',');
  if(c.length!==2) return null;
  const lat=parseFloat(c[0]),lon=parseFloat(c[1]);
  if(isNaN(lat)||isNaN(lon)||lat<-90||lat>90||lon<-180||lon>180) return null;
  return {lat,lon,display:`${lat.toFixed(5)}, ${lon.toFixed(5)}`};
}

// ── Resolve station position: geocode address first, fall back to lat/lon ─────
async function resolveStationPosition(station){
  // 1. Try geocoding full address string
  if(station.address && station.address.trim()){
    const query=`${station.address}, ${station.locality||''}, Australia`.replace(/,\s*,/g,',');
    try{
      const r=await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=au`,
        {headers:{'Accept-Language':'en','User-Agent':'FireCalc/1.0'}}
      );
      const d=await r.json();
      if(d&&d.length){
        return {lat:parseFloat(d[0].lat),lon:parseFloat(d[0].lon),source:'geocoded'};
      }
    } catch(_){}
  }
  // 2. Fall back to Excel coordinates
  return {lat:station.lat,lon:station.lon,source:'excel'};
}

// ── OSRM routing ──────────────────────────────────────────────────────────────
async function getOSRMRoute(fromLat,fromLon,toLat,toLon){
  // Try primary OSRM endpoint
  const url=`https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
  let res;
  try{
    res=await fetch(url);
  } catch(e){
    throw new Error('Network error reaching routing server');
  }
  if(!res.ok) throw new Error(`Routing server error ${res.status}`);
  const data=await res.json();
  if(data.code!=='Ok'||!data.routes||!data.routes.length)
    throw new Error(`No route: ${data.message||data.code}`);
  const route=data.routes[0];
  if(!route.geometry||!route.geometry.coordinates||route.geometry.coordinates.length<2)
    throw new Error('Empty route geometry');
  return {
    distance_km : route.distance/1000,
    duration_min: route.duration/60,
    coords      : route.geometry.coordinates  // [[lon,lat],...]
  };
}

// ── Initialise Leaflet map (first call only) ──────────────────────────────────
function initFSMap(lat,lon){
  const el=document.getElementById('fs-map');
  if(fsMap){
    fsMap.setView([lat,lon],12);
    return;
  }
  el.innerHTML='';
  fsMap=L.map(el,{attributionControl:false,scrollWheelZoom:false}).setView([lat,lon],12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(fsMap);
  L.control.attribution({position:'bottomright',prefix:false})
    .addAttribution('<a href="https://openstreetmap.org/copyright" style="font-size:10px">© OSM</a>')
    .addTo(fsMap);
  fsMap.getContainer().addEventListener('mouseenter',()=>fsMap.scrollWheelZoom.enable());
  fsMap.getContainer().addEventListener('mouseleave',()=>fsMap.scrollWheelZoom.disable());
}

// ── Site marker (draggable red teardrop) ─────────────────────────────────────
function makeSiteIcon(){
  return L.divIcon({
    className:'',
    html:`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.268 21.732 0 14 0z"
            fill="#c0392b" stroke="#fff" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="#fff"/>
    </svg>`,
    iconSize:[28,38], iconAnchor:[14,38], popupAnchor:[0,-40]
  });
}

function placeSiteMarker(lat,lon,label){
  if(fsSiteMarker){
    fsSiteMarker.setLatLng([lat,lon]);
  } else {
    fsSiteMarker=L.marker([lat,lon],{icon:makeSiteIcon(),draggable:true,zIndexOffset:2000}).addTo(fsMap);
    fsSiteMarker.on('dragend',async()=>{
      const p=fsSiteMarker.getLatLng();
      showFSStatus('⏳ Recalculating…');
      try{
        // reverse-geocode (best-effort)
        let lbl=`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
        try{
          const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${p.lat}&lon=${p.lng}&format=json`);
          const d=await r.json(); if(d&&d.display_name) lbl=d.display_name;
        }catch(_){}
        document.getElementById('fs-location').value=`${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
        fsSiteMarker.setPopupContent(sitePopupHtml(lbl));
        await recomputeRoutes({lat:p.lat,lon:p.lng,display:lbl});
        hideFSStatus();
      } catch(err){
        hideFSStatus();
        fsMsgShow(err.message,'danger');
      }
    });
  }
  fsSiteMarker.bindPopup(sitePopupHtml(label)).openPopup();
}

function sitePopupHtml(label){
  return `<strong>📍 Site</strong><br><span style="font-size:0.8em">${label}</span><br><em style="font-size:0.75em;color:#888">Drag to move</em>`;
}

// ── Station pin icon ──────────────────────────────────────────────────────────
function makeStationIcon(rank,color){
  return L.divIcon({
    className:'',
    html:`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
      <path d="M15 0C6.716 0 0 6.716 0 15c0 9.941 13.5 24.5 14.1 25.15a1.2 1.2 0 0 0 1.8 0
               C16.5 39.5 30 24.941 30 15 30 6.716 23.284 0 15 0z"
            fill="${color}" stroke="#fff" stroke-width="1.8"/>
      <text x="15" y="20" text-anchor="middle" dominant-baseline="middle"
            fill="#fff" font-family="sans-serif" font-size="12" font-weight="bold">${rank}</text>
    </svg>`,
    iconSize:[30,40], iconAnchor:[15,40], popupAnchor:[0,-42]
  });
}

// ── Draw one highlighted route (glow + solid colour + directional arrows) ─────
function drawPolyline(coords, color, weight, isTop){
  if(!coords||coords.length<2) return [];
  // OSRM returns [lon,lat]; Leaflet wants [lat,lon]
  const lls = coords.map(c=>[c[1],c[0]]);
  const layers = [];

  // Layer 1: broad outer glow (semi-transparent, wide)
  const glow=L.polyline(lls,{
    color, weight: weight+14, opacity: isTop ? 0.22 : 0.12,
    lineCap:'round', lineJoin:'round'
  }).addTo(fsMap);
  fsPolylines.push(glow);
  layers.push(glow);

  // Layer 2: white separation halo
  const halo=L.polyline(lls,{
    color:'#ffffff', weight: weight+5, opacity: isTop ? 0.9 : 0.7,
    lineCap:'round', lineJoin:'round'
  }).addTo(fsMap);
  fsPolylines.push(halo);
  layers.push(halo);

  // Layer 3: solid coloured line
  const line=L.polyline(lls,{
    color, weight, opacity:1,
    lineCap:'round', lineJoin:'round'
  }).addTo(fsMap);
  fsPolylines.push(line);
  layers.push(line);

  // Layer 4: dot markers along the route
  const dots = _addRouteDots(lls, color, weight, isTop);
  dots.forEach(d=>layers.push(d));

  return layers;
}

// ── Place circular dot markers along a polyline ────────────────────────────────
function _addRouteDots(lls, color, weight, isTop){
  if(lls.length < 2) return [];

  const dists = [0];
  for(let i=1;i<lls.length;i++){
    const dy=(lls[i][0]-lls[i-1][0])*111320;
    const dx=(lls[i][1]-lls[i-1][1])*111320*Math.cos(lls[i-1][0]*Math.PI/180);
    dists.push(dists[i-1]+Math.sqrt(dx*dx+dy*dy));
  }
  const totalLen = dists[dists.length-1];

  const spacing  = isTop ? 320 : 380;   // metres between dots
  const dotSize  = isTop ? weight*1.7 : weight*1.6;  // px diameter

  const targets = [];
  for(let d = spacing*0.5; d < totalLen - spacing*0.2; d += spacing){
    targets.push(d);
  }

  const dotMarkers = [];
  targets.forEach(targetDist=>{
    let segIdx=1;
    while(segIdx<dists.length-1 && dists[segIdx]<targetDist) segIdx++;
    const t=(targetDist-dists[segIdx-1])/(dists[segIdx]-dists[segIdx-1]);
    const lat=lls[segIdx-1][0]+t*(lls[segIdx][0]-lls[segIdx-1][0]);
    const lon=lls[segIdx-1][1]+t*(lls[segIdx][1]-lls[segIdx-1][1]);

    const sz = Math.round(dotSize);
    const dotIcon = L.divIcon({
      className:'',
      html:`<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="4" fill="${color}" stroke="#fff" stroke-width="1.5"/>
            </svg>`,
      iconSize:[sz,sz],
      iconAnchor:[sz/2,sz/2]
    });
    const m=L.marker([lat,lon],{icon:dotIcon,interactive:false,zIndexOffset:500}).addTo(fsMap);
    fsPolylines.push(m);
    dotMarkers.push(m);
  });
  return dotMarkers;
}

// ── Clear all route polylines and station markers ─────────────────────────────
function clearRoutes(){
  fsPolylines.forEach(l=>{ try{fsMap.removeLayer(l);}catch(_){} });
  fsPolylines=[];
  fsStationMarkers.forEach(o=>{ try{fsMap.removeLayer(o.marker);}catch(_){} });
  fsStationMarkers=[];
  fsRouteLayersByRank={};
}

// ── Fit map to all current features ──────────────────────────────────────────
function fitAll(){
  const pts=[];
  if(fsSiteMarker) pts.push(fsSiteMarker.getLatLng());
  fsStationMarkers.forEach(o=>pts.push(o.marker.getLatLng()));
  fsPolylines.forEach(l=>{
    if(typeof l.getLatLngs==='function'){
      const lls=l.getLatLngs();
      (Array.isArray(lls[0])?lls.flat():lls).forEach(p=>pts.push(p));
    }
  });
  if(pts.length>1) fsMap.fitBounds(L.latLngBounds(pts),{padding:[40,40]});
}

// ── Status / overlay helpers ──────────────────────────────────────────────────
function showFSStatus(msg){
  let ov=document.getElementById('fs-map-overlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='fs-map-overlay';
    document.getElementById('fs-map').insertAdjacentElement('afterend',ov);
  }
  ov.textContent=msg; ov.style.display='flex';
}
function hideFSStatus(){
  const ov=document.getElementById('fs-map-overlay');
  if(ov) ov.style.display='none';
}
function fsMsgShow(text,type='warning'){
  const el=document.getElementById('fs-msg');
  el.textContent=text; el.className=`safety-banner ${type}`; el.style.display='block';
}
function fsMsgHide(){
  const el=document.getElementById('fs-msg');
  el.style.display='none';
}
function formatDuration(min){
  if(min<60) return `${Math.round(min)} min`;
  return `${Math.floor(min/60)}h ${Math.round(min%60)}min`;
}

// ── Results table ─────────────────────────────────────────────────────────────
function renderFSTable(results){
  const box=document.getElementById('fs-results-box');
  const tbl=document.getElementById('fs-results-table');
  box.style.display='block';
  let html=`<table class="fs-table"><thead><tr>
    <th>#</th><th>Station</th><th>State</th><th>Type</th><th>Located via</th><th>Road Dist.</th><th>Travel Time</th>
  </tr></thead><tbody>`;
  results.forEach((r,i)=>{
    const col=FS_ROUTE_COLORS[i];
    const badge=`<span class="fs-rank-badge" style="background:${col}">${i+1}</span>`;
    const srcBadge=r.posSource==='geocoded'
      ? `<span style="color:#166534;font-size:0.75em">📍 Address</span>`
      : `<span style="color:#1a56db;font-size:0.75em">🌐 Coords</span>`;
    html+=`<tr>
      <td>${badge}</td>
      <td><strong>${r.station.name}</strong><br><small>${r.station.address||''}${r.station.locality?', '+r.station.locality:''}</small></td>
      <td>${r.station.state}</td>
      <td>${r.station.type||'–'}</td>
      <td>${srcBadge}</td>
      <td class="result-val">${r.distance_km.toFixed(2)} km</td>
      <td class="result-val green">${formatDuration(r.duration_min)}</td>
    </tr>`;
  });
  html+='</tbody></table>';
  tbl.innerHTML=html;
}

// ── Render station visibility toggles ────────────────────────────────────────
function renderFSVisibilityToggles(top5){
  const container=document.getElementById('fs-visibility-toggles');
  if(!container) return;
  container.innerHTML='';
  top5.forEach((r,i)=>{
    const rank=i+1;
    const color=FS_ROUTE_COLORS[i];
    const row=document.createElement('label');
    row.style.cssText='display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.83rem;user-select:none;';
    const cb=document.createElement('input');
    cb.type='checkbox';
    cb.checked=true;
    cb.style.cssText='width:15px;height:15px;accent-color:'+color+';cursor:pointer;';
    cb.id=`fs-vis-${rank}`;
    const dot=document.createElement('span');
    dot.style.cssText=`display:inline-block;width:14px;height:14px;border-radius:3px;background:${color};flex-shrink:0;`;
    const lbl=document.createElement('span');
    lbl.style.cssText='color:#1e2235;';
    lbl.innerHTML=`<strong>#${rank}</strong> ${r.station.name} <span style="color:#6b7280;font-size:0.75em">(${r.distance_km.toFixed(2)} km)</span>`;
    row.appendChild(cb);
    row.appendChild(dot);
    row.appendChild(lbl);
    cb.addEventListener('change',()=>{ fsToggleStationVisibility(rank, cb.checked); });
    container.appendChild(row);
  });
}

// ── Show / hide a station's route layers and marker ───────────────────────────
function fsToggleStationVisibility(rank, visible){
  const entry=fsRouteLayersByRank[rank];
  if(!entry) return;
  entry.layers.forEach(l=>{
    try{
      if(visible) l.addTo(fsMap);
      else fsMap.removeLayer(l);
    }catch(_){}
  });
  try{
    if(visible) entry.marker.addTo(fsMap);
    else fsMap.removeLayer(entry.marker);
  }catch(_){}
}

// ── Core: resolve stations, route, draw ──────────────────────────────────────
async function recomputeRoutes(site){
  fsMsgHide();
  clearRoutes();

  const radius=parseFloat(document.getElementById('fs-radius').value);

  // 1. Pre-filter by Haversine
  const candidates=fsStations
    .map(st=>({station:st,hvDist:haversine(site.lat,site.lon,st.lat,st.lon)}))
    .filter(x=>x.hvDist<=radius)
    .sort((a,b)=>a.hvDist-b.hvDist)
    .slice(0,15);

  if(!candidates.length)
    throw new Error(`No stations within ${radius} km. Try a larger radius.`);

  // 2. Resolve each station's position (geocode address → fallback to coords)
  //    and fetch OSRM route
  const routed=[];
  for(const c of candidates){
    try{
      const pos=await resolveStationPosition(c.station);
      const route=await getOSRMRoute(pos.lat,pos.lon,site.lat,site.lon);
      routed.push({
        station     : c.station,
        pos,
        posSource   : pos.source,
        distance_km : route.distance_km,
        duration_min: route.duration_min,
        coords      : route.coords
      });
    } catch(_){ /* skip stations that can't be routed */ }
  }

  if(!routed.length)
    throw new Error('Could not route to any nearby station. Check internet connection.');

  routed.sort((a,b)=>a.distance_km-b.distance_km);
  const top5=routed.slice(0,5);

  // 3. Draw routes (draw lower ranks first so #1 appears on top)
  [...top5].reverse().forEach((r,ri)=>{
    const rank=top5.length-ri;           // 5..1
    const color=FS_ROUTE_COLORS[rank-1];
    const weight=rank===1?7:5;
    const isTop=rank===1;
    const layers=drawPolyline(r.coords,color,weight,isTop);
    // Store layers; marker added below
    fsRouteLayersByRank[rank]={ layers, marker:null };
  });

  // 4. Place draggable station markers
  top5.forEach((r,i)=>{
    const rank=i+1;
    const color=FS_ROUTE_COLORS[i];
    const icon=makeStationIcon(rank,color);
    const marker=L.marker([r.pos.lat,r.pos.lon],{
      icon,
      draggable:true,
      zIndexOffset:1000-rank
    }).addTo(fsMap);

    // Register marker in layer store
    if(fsRouteLayersByRank[rank]) fsRouteLayersByRank[rank].marker=marker;

    const popupHtml=()=>`<strong>#${rank} ${r.station.name}</strong><br>
      ${r.station.address||''}${r.station.locality?', '+r.station.locality:''}<br>
      State: ${r.station.state} | Type: ${r.station.type||'–'}<br>
      📍 Located via: ${r.posSource==='geocoded'?'address geocode':'Excel coords'}<br>
      🚗 ${r.distance_km.toFixed(2)} km &nbsp; ⏱ ${formatDuration(r.duration_min)}<br>
      <em style="font-size:0.75em;color:#888">Drag to correct position</em>`;

    marker.bindPopup(popupHtml());
    fsStationMarkers.push({marker,station:r.station,rank});

    // Allow user to drag station pin to correct its position
    marker.on('dragend',async()=>{
      const p=marker.getLatLng();
      // Update internal position
      r.pos={lat:p.lat,lon:p.lng,source:'manual'};
      r.posSource='manual';
      try{
        showFSStatus('⏳ Updating route…');
        const route=await getOSRMRoute(p.lat,p.lng,site.lat,site.lon);
        r.distance_km=route.distance_km;
        r.duration_min=route.duration_min;
        r.coords=route.coords;
        // Re-sort and redraw everything
        routed.sort((a,b)=>a.distance_km-b.distance_km);
        const newTop5=routed.slice(0,5);
        renderFSTable(newTop5);
        renderFSVisibilityToggles(newTop5);
        // Redraw only polylines, keep markers; reset layer tracking
        fsPolylines.forEach(l=>{ try{fsMap.removeLayer(l);}catch(_){} });
        fsPolylines=[];
        fsRouteLayersByRank={};
        [...newTop5].reverse().forEach((rr,ri)=>{
          const rk=newTop5.length-ri;
          const layers=drawPolyline(rr.coords,FS_ROUTE_COLORS[rk-1],rk===1?7:5,rk===1);
          // Retrieve the existing marker for this rank from fsStationMarkers
          const mEntry=fsStationMarkers.find(o=>o.rank===rk);
          fsRouteLayersByRank[rk]={ layers, marker: mEntry?mEntry.marker:null };
        });
        marker.setPopupContent(popupHtml());
        hideFSStatus();
      } catch(err){ hideFSStatus(); fsMsgShow(err.message,'warning'); }
    });
  });

  // 5. Render table, toggles, and fit map
  renderFSTable(top5);
  renderFSVisibilityToggles(top5);
  fitAll();

  if(top5.length<5)
    fsMsgShow(`Only ${top5.length} stations could be routed. Try a larger radius.`,'warning');
}

// ── Main entry point ──────────────────────────────────────────────────────────
async function findFireStations(){
  fsMsgHide();
  document.getElementById('fs-results-box').style.display='none';
  const btn=document.querySelector('#fire-stations .calc-btn');
  btn.textContent='⏳ Searching…'; btn.disabled=true;

  try{
    const input=document.getElementById('fs-location').value.trim();
    if(!input) throw new Error('Please enter an address or coordinates.');

    let site=parseCoords(input);
    if(!site){
      btn.textContent='⏳ Geocoding address…';
      site=await geocodeAddress(input);
    }

    initFSMap(site.lat,site.lon);
    placeSiteMarker(site.lat,site.lon,site.display);
    showFSStatus('⏳ Calculating routes…');
    btn.textContent='⏳ Routing…';
    await recomputeRoutes(site);

  } catch(err){
    fsMsgShow(err.message||'An unexpected error occurred.','danger');
  } finally{
    hideFSStatus();
    btn.textContent='🔍 Find Nearest Fire Stations';
    btn.disabled=false;
  }
}

// ── Upload & apply new Excel database ────────────────────────────────────────
async function uploadFireStationDB(){
  const fileInput=document.getElementById('fs-upload-file');
  const statusEl=document.getElementById('fs-upload-status');
  const file=fileInput.files[0];
  if(!file){statusEl.textContent='⚠ Please select an Excel file first.';return;}
  statusEl.textContent='⏳ Uploading…';

  // Try server endpoint first
  try{
    const fd=new FormData(); fd.append('file',file);
    const res=await fetch('/api/upload-stations',{method:'POST',body:fd});
    if(res.ok){
      const data=await res.json();
      if(data.ok){
        document.getElementById('fs-db-status').textContent=`Server DB (${data.count} stations)`;
        statusEl.textContent=`✅ ${data.msg}`;
        fileInput.value=''; return;
      }
      throw new Error(data.error||'Server upload failed');
    }
    if(res.status!==404){const d=await res.json().catch(()=>({})); throw new Error(d.error||`Server error ${res.status}`);}
  } catch(e){
    if(!e.message.includes('Failed to fetch')&&!e.message.includes('404')){
      statusEl.textContent=`❌ ${e.message}`; return;
    }
  }

  // Client-side SheetJS fallback
  statusEl.textContent='⏳ Parsing file in browser…';
  try{
    if(typeof XLSX==='undefined') throw new Error('SheetJS not loaded. Wait a moment and retry.');
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const states=['NSW','VIC','QLD','SA','WA','ACT','NT','TAS'];
    const newStations=[];
    for(const sn of states){
      if(!wb.SheetNames.includes(sn)) continue;
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1});
      if(rows.length<2) continue;
      const hdr=rows[1].map(h=>String(h).trim().toUpperCase());
      const ci=(n)=>hdr.indexOf(n);
      for(let r=2;r<rows.length;r++){
        const row=rows[r];
        const lat=parseFloat(row[ci('LATITUDE')]),lon=parseFloat(row[ci('LONGITUDE')]);
        if(isNaN(lat)||isNaN(lon)) continue;
        newStations.push({
          name:String(row[ci('STATION')]||'').trim(),
          address:String(row[ci('ADDRESS')]||'').trim(),
          locality:String(row[ci('LOCALITY')]||'').trim(),
          type:String(row[ci('STATIONTYPE')]||'').trim(),
          state:sn, lat, lon
        });
      }
    }
    if(!newStations.length) throw new Error('No valid stations found. Check file format.');
    fsStations=newStations;
    document.getElementById('fs-db-status').textContent=`Uploaded (${newStations.length} stations)`;
    statusEl.textContent=`✅ Loaded ${newStations.length} stations from ${file.name}`;
    fileInput.value='';
  } catch(e){ statusEl.textContent=`❌ ${e.message}`; }
}

// Load SheetJS lazily for client-side Excel parsing
(function(){
  if(typeof XLSX!=='undefined') return;
  const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  document.head.appendChild(s);
})();
