// ==========================================
// JS/ui/graph.js  —  当選グラフ
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
// ==========================================
// 当選グラフ (差枚数の推移 + 当選枚数)
// ==========================================
const graphModal = document.getElementById('graph-modal');
const graphLine = document.getElementById('graph-line');
const graphBars = document.getElementById('graph-bars');
const graphSummary = document.getElementById('graph-summary');

const LEVEL_COLORS = { 1: '#2f8dff', 2: '#ffd800', 3: '#1fe05a', 4: '#ff2b2b', 5: '#d946ef', 6: '#fb923c', 7: '#fde047' };
function bonusColor(b) {
  return LEVEL_COLORS[payLevel(b.coins)];
}

function setupCanvas(cv) {
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  c.font = '10px sans-serif';
  return { c, w, h };
}

function drawEmpty(c, w, h) {
  c.fillStyle = '#94a3b8';
  c.textAlign = 'center';
  c.fillText('データがありません', w / 2, h / 2);
}

function drawDiffGraph() {
  const { c, w, h } = setupCanvas(graphLine);
  if (gameHistory.length < 2) { drawEmpty(c, w, h); return; }
  const padL = 46, padR = 8, padT = 10, padB = 18;
  let minY = 0, maxY = 0;
  gameHistory.forEach(p => { if (p.diff < minY) minY = p.diff; if (p.diff > maxY) maxY = p.diff; });
  if (maxY === minY) maxY = minY + 1;
  const maxX = Math.max(1, gameHistory[gameHistory.length - 1].g);
  const X = g => padL + (g / maxX) * (w - padL - padR);
  const Y = v => padT + (1 - (v - minY) / (maxY - minY)) * (h - padT - padB);

  // 当選ごとの縦線
  bonusLog.forEach(b => {
    c.strokeStyle = bonusColor(b) + '66';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(X(b.g), padT);
    c.lineTo(X(b.g), h - padB);
    c.stroke();
  });

  // 0ライン
  c.strokeStyle = '#64748b';
  c.setLineDash([4, 4]);
  c.beginPath();
  c.moveTo(padL, Y(0));
  c.lineTo(w - padR, Y(0));
  c.stroke();
  c.setLineDash([]);

  // 差枚数の線
  c.strokeStyle = '#4ade80';
  c.lineWidth = 1.5;
  c.beginPath();
  gameHistory.forEach((p, i) => {
    if (i === 0) c.moveTo(X(p.g), Y(p.diff)); else c.lineTo(X(p.g), Y(p.diff));
  });
  c.stroke();

  // 軸ラベル
  c.fillStyle = '#cbd5e1';
  c.textAlign = 'right';
  c.fillText(String(maxY), padL - 4, padT + 8);
  c.fillText(String(minY), padL - 4, h - padB);
  if (minY < 0 && maxY > 0) c.fillText('0', padL - 4, Y(0) + 3);
  c.textAlign = 'left';
  c.fillText('0G', padL, h - 4);
  c.textAlign = 'right';
  c.fillText(`${maxX}G`, w - padR, h - 4);
}

function drawBonusBars() {
  const { c, w, h } = setupCanvas(graphBars);
  const list = bonusLog.slice(-40);
  if (list.length === 0) { drawEmpty(c, w, h); return; }
  const padL = 46, padR = 8, padT = 14, padB = 16;
  const maxV = Math.max(...list.map(b => b.coins));
  const slot = (w - padL - padR) / Math.max(list.length, 10);
  const barW = Math.max(3, slot * 0.7);

  c.fillStyle = '#cbd5e1';
  c.textAlign = 'right';
  c.fillText(String(maxV), padL - 4, padT + 8);
  c.fillText('0', padL - 4, h - padB);
  c.strokeStyle = '#64748b';
  c.beginPath();
  c.moveTo(padL, h - padB);
  c.lineTo(w - padR, h - padB);
  c.stroke();

  list.forEach((b, i) => {
    const bh = (b.coins / maxV) * (h - padT - padB);
    const x = padL + i * slot + (slot - barW) / 2;
    c.fillStyle = bonusColor(b);
    c.fillRect(x, h - padB - bh, barW, bh);
    if (b.coins === maxV) {
      c.fillStyle = '#e2e8f0';
      c.textAlign = 'center';
      c.fillText(String(b.coins), x + barW / 2, h - padB - bh - 3);
    }
  });
  c.fillStyle = '#94a3b8';
  c.textAlign = 'left';
  c.fillText(`直近${list.length}回`, padL, h - 3);
}

function drawGraphs() {
  const best = bonusLog.reduce((m, b) => Math.max(m, b.coins), 0);
  graphSummary.textContent = `BIG ${bigCount}  AT ${atCount}  最高 ${best}枚  差枚数 ${diffCoins >= 0 ? '+' : ''}${diffCoins}  総G ${cumulativeGames}`;
  drawDiffGraph();
  drawBonusBars();
}

