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
