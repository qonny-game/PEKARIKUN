// ==========================================
// JS/game/bell.js  —  ベル
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* ---------- ベル ---------- */
const BELL_TYPES = [
  { name: '直線', coins: 6 },          // 横一列 (3段のどれか)
  { name: '斜め左上から', coins: 1 },   // 左上 → 右下
  { name: '斜め左下から', get coins() { return atSuper && atGames > 0 ? 15 : 11; } }   // 左下 → 右上 (通常11枚。SUPER中のATだけ15枚)
];
function pickBellType(inAT) {
  if (inAT && atSuper && Math.random() < 0.8) return 2;   // SUPER中は左下からが出やすい（純増UP）
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
  if (soundEnabled && n < 30) {
    initAudio();
    const t0 = audioCtx.currentTime;
    for (let i = 0; i < 6; i++) tone(2093 + Math.random() * 900, t0 + 0.05 + i * 0.06, 0.12, 'triangle', 0.06);
  }
}
/* 15枚GET: コインがじゃらじゃらと大量に出てくる音 (約2.6秒) */
function playJaraJara(len) {
  if (!soundEnabled) return;
  initAudio();
  const t0 = audioCtx.currentTime + 0.02;
  const n = Math.round(len * 26);
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const t = t0 + len * Math.pow(k, 0.85) + Math.random() * 0.025;
    const f = 2200 + Math.random() * 2600;
    const v = 0.07 * (1 - k * 0.55) * (0.6 + Math.random() * 0.4);
    tone(f, t, 0.05 + Math.random() * 0.05, 'triangle', v);
    tone(f * 1.51, t + 0.012, 0.04, 'square', v * 0.35);
    if (i % 3 === 0) tone(380 + Math.random() * 260, t, 0.07, 'sine', v * 1.4);   // 山積みのコインが落ちる低い音
  }
  tone(1568, t0 + len, 0.5, 'triangle', 0.07);   // 最後の余韻
}
/* GET時の低音「ドゴドゴドゴドゴ!!」: キックを連打してゴロゴロ迫ってくる。枚数が多いほど長く・重く。長さは getRumbleLen (ジャラジャラも同じ長さに合わせる) */
function getRumbleLen(coins) { return coins >= 15 ? 1.5 : coins >= 6 ? 1.0 : 0.7; }
function getRumble(coins, ctx) {
  if (!soundEnabled && !ctx) return;
  initAudio();
  const ac = ctx || audioCtx;
  const len = getRumbleLen(coins);
  const n = coins >= 15 ? 19 : coins >= 6 ? 12 : 8;       // 打つ回数
  const peak = coins >= 15 ? 0.78 : coins >= 6 ? 0.68 : 0.56;
  const t0 = ac.currentTime + 0.01;
  const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.06), ac.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const t = t0 + len * Math.pow(k, 0.85) * (1 - 1 / n);      // 少しずつ間隔が詰まる = ゴロゴロと転がる
    const amp = peak * (0.55 + 0.45 * Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.5)) * (k > 0.85 ? 1 - (k - 0.85) * 2.2 : 1);   // だんだん大きく、最後に少し引く
    // キックの胴: 高いところから一気に下がる
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(170 + (i % 2) * 18, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + 0.2);
    // 打撃のアタック(ドゴッの「ゴ」): 短いノイズ
    const src = ac.createBufferSource(); src.buffer = nb;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = ac.createGain(); ng.gain.setValueAtTime(amp * 0.55, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(lp); lp.connect(ng); ng.connect(ac.destination); src.start(t);
  }
  // 下で鳴り続ける地鳴り
  const o2 = ac.createOscillator(), g2 = ac.createGain();
  o2.type = 'sine'; o2.frequency.value = 46;
  g2.gain.setValueAtTime(0.0001, t0); g2.gain.linearRampToValueAtTime(peak * 0.5, t0 + 0.1); g2.gain.linearRampToValueAtTime(0.0001, t0 + len + 0.3);
  o2.connect(g2); g2.connect(ac.destination); o2.start(t0); o2.stop(t0 + len + 0.35);
}
function showGet(coins) {
  // 演出を優先する場面では「枚 GET」を出さない（PAYOUTの数字だけ）
  if (isSuspense || (window.FX && FX.busy > 0) || document.querySelector('.lcd-czwin,.lcd-crackfx,.lcd-levercall,.lcd-bigintro,.lcd-zoneintro,.lcd-sandwin,.lcd-sevhint,.lcd-lvup')) { cancelAnimationFrame(getRAF); getPop.classList.remove('show'); return; }
  playVoice('get');   // GET の声
  getRumble(coins);
  if (coins >= 15) playJaraJara(getRumbleLen(coins));   // ドゴドゴと同じ長さに合わせる
  getPop.innerHTML = `0<span>枚 GET</span>`;
  cancelAnimationFrame(getRAF);
  const g0 = performance.now();
  const gfr = now => {
    const pr = Math.min(1, (now - g0) / 300);
    getPop.firstChild.nodeValue = Math.round(coins * (1 - Math.pow(1 - pr, 3)));
    if (pr < 1) getRAF = requestAnimationFrame(gfr);
  };
  getRAF = requestAnimationFrame(gfr);
  getPop.className = 'get-pop ' + (coins >= 15 ? 'g-big' : coins >= 6 ? 'g-mid' : 'g-small');
  void getPop.offsetWidth;
  getPop.classList.add('show');
}
/* 獲得枚数表示を消す (次の回転開始時 / 第3停止後に演出が入る時) */
function hideGet() { cancelAnimationFrame(getRAF); getPop.classList.remove('show'); }
window.hideGet = hideGet;
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

