// ==========================================
// JS/game/bell.js  —  ベル
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* ---------- ベル ---------- */
const BELL_TYPES = [
  { name: '直線', coins: 6 },          // 横一列 (3段のどれか)
  { name: '斜め左上から', coins: 1 },   // 左上 → 右下
  { name: '斜め左下から', coins: 15 }   // 左下 → 右上
];
const BELL_LINES = {
  0: [[0, 1, 2], [3, 4, 5], [6, 7, 8]],
  1: [[0, 4, 8]],
  2: [[2, 4, 6]]
};
function pickBellType(inAT) {
  return weightedPick(inAT ? AT_BELL_WEIGHTS : BELL_WEIGHTS);
}
const bellBadge = document.getElementById('bell-badge');
const getPop = document.getElementById('get-pop');

/* ボーナス中・AT中のベル払い出し: 「15枚 GET」とでっかく表示 */
let getRAF = null;
/* コインをばら撒く (画面の上から降ってくる) */
function rainCoins(n) {
  const w = fxCanvas.width;
  for (let i = 0; i < n; i++) {
    particles.push(makeParticle('gold', Math.random() * w, -10 - Math.random() * 140, (Math.random() - 0.5) * 2.4, 2 + Math.random() * 4, 0.28));
  }
  ensureParticleLoop();
  if (soundEnabled) {
    initAudio();
    const t0 = audioCtx.currentTime;
    for (let i = 0; i < 6; i++) tone(2093 + Math.random() * 900, t0 + 0.05 + i * 0.06, 0.12, 'triangle', 0.06);
  }
}
function showGet(coins) {
  getPop.innerHTML = `0<span>枚 GET</span>`;
  cancelAnimationFrame(getRAF);
  const g0 = performance.now();
  const gfr = now => {
    const pr = Math.min(1, (now - g0) / 420);
    getPop.firstChild.nodeValue = Math.round(coins * (1 - Math.pow(1 - pr, 3)));
    if (pr < 1) getRAF = requestAnimationFrame(gfr);
  };
  getRAF = requestAnimationFrame(gfr);
  getPop.className = 'get-pop ' + (coins >= 15 ? 'g-big' : coins >= 6 ? 'g-mid' : 'g-small');
  void getPop.offsetWidth;
  getPop.classList.add('show');
}
function showBellResult(coins, inAT) {
  bellBadge.classList.remove('show');
  if (inAT) {
    showGet(coins);
    rainCoins(Math.min(44, coins * 2));     // ボーナス/AT中のベル: コインをばら撒く
  } else {
    bellBadge.textContent = `BELL +${coins}`;
    void bellBadge.offsetWidth;
    bellBadge.classList.add('show');
  }
  playBellSound(coins);
}

/* デバッグ用: 回さずに、止まった状態でベルを表示 (forceType 指定時は差枚数を変えない) */
function hitBell(forceType, inAT) {
  const type = forceType !== undefined ? forceType : pickBellType(inAT);
  const g = gridOf(pickCombo('bell' + type));
  showStatic(g, winIdxOf('bell' + type, g));
  const coins = BELL_TYPES[type].coins;
  if (forceType === undefined) { diffCoins += coins; setLedWin(coins); recordPoint(); }
  showBellResult(coins, inAT);
}

function playBellSound(coins) {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  const n = coins >= 15 ? 5 : coins >= 6 ? 3 : 2;   // 枚数が多いほど長いチャイム
  for (let i = 0; i < n; i++) tone(1568 * Math.pow(1.122, i), t + i * 0.07, 0.35, 'sine', 0.16);
}

