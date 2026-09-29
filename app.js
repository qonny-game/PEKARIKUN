// ==========================================
// BIG 当たり種類 (10種類 / 200枚〜1000枚 + 2000枚が1つ)
// weight: 出現しやすさ, glow: GOGO!の発光色
// ==========================================
const BIG_TIERS = [
  { coins: 200,  weight: 20, glow: '#3b82f6', sub: 'CHANCE' },
  { coins: 300,  weight: 17, glow: '#22c55e', sub: 'CHANCE' },
  { coins: 400,  weight: 14, glow: '#f97316', sub: 'CHANCE!' },
  { coins: 500,  weight: 12, glow: '#ef4444', sub: 'CHANCE!' },
  { coins: 600,  weight: 10, glow: '#a855f7', sub: 'BIG CHANCE!' },
  { coins: 700,  weight: 8,  glow: '#facc15', sub: 'BIG CHANCE!' },
  { coins: 800,  weight: 7,  glow: '#22d3ee', sub: 'BIG CHANCE!!' },
  { coins: 900,  weight: 5,  glow: '#ff5a1f', sub: 'SUPER CHANCE!!' },
  { coins: 1000, weight: 4,  glow: '#ffd700', sub: '★ GRAND CHANCE ★', grand: true },
  { coins: 2000, weight: 1,  glow: '#ffffff', sub: '★★ MEGA JACKPOT ★★', grand: true, mega: true }
];

function pickTierIndex() {
  const total = BIG_TIERS.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < BIG_TIERS.length; i++) {
    r -= BIG_TIERS[i].weight;
    if (r < 0) return i;
  }
  return BIG_TIERS.length - 1;
}

// ゲーム状態変数
let totalGames = 0;       // 表示用G数 (ボーナス当選でリセット)
let cumulativeGames = 0;  // 合算確率計算用の累計G数
let bigCount = 0;
let regCount = 0;
let diffCoins = 0;

let isPekared = false;
let isBonusAligned = false;
let pendingBonusType = null; // 'BIG' | 'REG'
let pendingTierIndex = -1;         // 実際の当たり (枚数・図柄はこちら)
let pendingDisplayIndex = -1;      // GOGO!演出として見せる当たり (ペカリ中の演出・音はこちら)

// 「実は…」演出: 低めの演出(800枚未満)が、一定確率で実は800枚だった
const SURPRISE_RATE = 0.10;
const SURPRISE_TIER_INDEX = BIG_TIERS.findIndex(t => t.coins === 800);

// フリーズフェイク: ブルー脈動(200枚)で、レバーON後に画面が真っ暗 → 実は1000枚 or 2000枚
const FREEZE_RATE = 0.05;                                        // ブルー脈動が出たうち何%でフリーズするか
const FREEZE_MEGA_RATE = 0.2;                                    // フリーズのうち2000枚になる割合 (残りは1000枚)
const FREEZE_GRAND_INDEX = BIG_TIERS.findIndex(t => t.coins === 1000);
const FREEZE_MEGA_INDEX = BIG_TIERS.findIndex(t => t.coins === 2000);
let pendingFreezeIndex = -1;   // フリーズ発生時の本当の当たり (-1ならフリーズなし)
let isFreezing = false;
let freezeTimer = null;
let isDebugRun = false;        // デバッグ再生中は G数・BIG/REG回数・差枚数を変えない
let soundEnabled = true;
let isCooldown = false;
let lockInterval = null;
let alignStage = 0; // 0: 未 / 1: 図柄表示中(NEXT待ち) / 2: 枚数表示済み

const GOGO_BASE = 'gogo-lamp w-full h-56 flex flex-col items-center justify-center relative cursor-pointer';
const ALIGN_BTN_DEFAULT = 'w-full py-4 bg-gradient-to-b from-amber-400 to-amber-600 text-slate-900 font-black text-base tracking-wider rounded-xl shadow-md border-t border-amber-200 opacity-40 cursor-not-allowed transition-all';

// UI Element参照
const mainEl = document.querySelector('main');
const spinBtn = document.getElementById('spin-btn');
const alignBtn = document.getElementById('align-btn');
const gogoBox = document.getElementById('gogo-box');
const gogoSubtext = document.getElementById('gogo-subtext');
const gogoTextContainer = document.getElementById('gogo-text-container');
const alignDisplay = document.getElementById('align-display');
const reelsEl = document.getElementById('reels');
const payoutDisplay = document.getElementById('payout-display');
const payoutLabel = document.getElementById('payout-label');
const payoutNum = document.getElementById('payout-num');
const payoutValue = document.getElementById('payout-value');
const flashOverlay = document.getElementById('flash-overlay');
const fxOverlay = document.getElementById('fx-overlay');
const freezeOverlay = document.getElementById('freeze-overlay');
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas.getContext('2d');

const displayGames = document.getElementById('display-games');
const displayBig = document.getElementById('display-big');
const displayReg = document.getElementById('display-reg');
const displayProb = document.getElementById('display-prob');
const displayDiff = document.getElementById('display-diff');

// ==========================================
// 音声
// ==========================================
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 効果音ファイル (事前読み込み: 再生時の遅延をなくす)
const SOUND_FILES = { gako: 'gako.mp3', vvv: 'vvv.mp3' };
const soundAudio = {};    // HTMLAudio (フォールバック用)
const soundBuffers = {};  // デコード済みバッファ (連続再生でも正確)

Object.keys(SOUND_FILES).forEach(name => {
  const a = new Audio(SOUND_FILES[name]);
  a.preload = 'auto';
  a.load();
  soundAudio[name] = a;

  try {
    fetch(SOUND_FILES[name])
      .then(r => r.arrayBuffer())
      .then(buf => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx.decodeAudioData(buf);
      })
      .then(b => { soundBuffers[name] = b; })
      .catch(() => { /* file:// などで失敗した場合は HTMLAudio で再生 */ });
  } catch (e) { /* 何もしない */ }
});

function playSampleOnce(name) {
  if (!soundEnabled) return;
  const buf = soundBuffers[name];
  if (buf && audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start();
    return;
  }
  const a = soundAudio[name].cloneNode();
  a.currentTime = 0;
  a.play().catch(err => {
    console.warn(SOUND_FILES[name] + "の再生に失敗したため、プログラム合成音にフォールバックします:", err);
    playGakoSynth();
  });
}

/* ペカリ音 (name: 'gako' | 'vvv' を count回 gapミリ秒刻みで連続再生) */
function playGakoSound(name = 'gako', count = 1, gap = 100) {
  if (!soundEnabled) return;
  for (let i = 0; i < count; i++) {
    if (i === 0) playSampleOnce(name);
    else setTimeout(() => playSampleOnce(name), i * gap);
  }
}

/* ガコッ！フォールバック用合成音 */
function playGakoSynth() {
  initAudio();
  const now = audioCtx.currentTime;

  const bufferSize = audioCtx.sampleRate * 0.08;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 700;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(1.0, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(170, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);

  oscGain.gain.setValueAtTime(1.2, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);

  noise.start(now);
  osc.start(now);
  osc.stop(now + 0.22);
}

/* レバー/ボタンタップ音 */
function playClickSound() {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

function tone(freq, start, dur, type = 'sawtooth', vol = 0.2) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + dur);
}

/* ファンファーレ音: tier=null なら REG */
function playFanfare(tier, tierIndex) {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;

  if (!tier) {
    // REG
    [440.00, 554.37, 659.25].forEach((f, i) => tone(f, now + i * 0.12, 0.35));
    return;
  }

  if (!tier.grand) {
    // 通常BIG: ティアが上がるほど音程が上がる
    const root = 523.25 * Math.pow(2, tierIndex / 12);
    [1, 1.25, 1.5, 2].forEach((r, i) => tone(root * r, now + i * 0.12, 0.35));
    return;
  }

  // 豪華 (1000枚 / 2000枚): 0.1秒刻みの3連打 → 長い和音
  const root = 523.25;
  const hits = [1, 1.125, 1.25];
  hits.forEach((h, k) => {
    const t = now + k * 0.1;
    [1, 1.25, 1.5, 2].forEach(r => tone(root * h * r, t, 0.14, 'sawtooth', 0.16));
  });
  const finale = now + 0.35;
  [1, 1.25, 1.5, 2, 2.5].forEach(r => tone(root * 1.25 * r, finale, 1.0, 'sawtooth', 0.14));

  if (tier.mega) {
    // 2000枚: キラキラ上昇アルペジオ + もう一段の3連打
    for (let i = 0; i < 12; i++) {
      tone(1046.5 * Math.pow(2, i / 12 * 1.5), finale + i * 0.07, 0.25, 'triangle', 0.12);
    }
    [1.5, 1.6875, 1.875].forEach((h, k) => {
      const t = finale + 0.9 + k * 0.1;
      [1, 1.25, 1.5, 2].forEach(r => tone(root * h * r, t, 0.14, 'sawtooth', 0.14));
    });
    [1, 1.25, 1.5, 2, 3].forEach(r => tone(root * 2 * r, finale + 1.2, 1.4, 'sawtooth', 0.12));
  }
}

// ==========================================
// 演出: フラッシュ / パーティクル / シェイク
// ==========================================
let flashTimer = null;
function triggerFlash() {
  clearTimeout(flashTimer);
  flashOverlay.classList.remove('flash-screen');
  void flashOverlay.offsetWidth; // アニメーション再始動
  flashOverlay.classList.add('flash-screen');
  flashTimer = setTimeout(() => flashOverlay.classList.remove('flash-screen'), 250);
}

function tripleFlash() {
  triggerFlash();
  setTimeout(triggerFlash, 100);
  setTimeout(triggerFlash, 200);
}

function shakeMain(ms) {
  mainEl.classList.add('shake-main');
  if (ms) setTimeout(() => mainEl.classList.remove('shake-main'), ms);
}

// パーティクル (金貨 / 紙吹雪)
let particles = [];
let particleMode = null; // 'gold' | 'mega' | null
let particleRAF = null;

function resizeCanvas() {
  fxCanvas.width = window.innerWidth;
  fxCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function makeParticle(mode, x, y, vx, vy, g) {
  return {
    x, y, vx, vy, g,
    r: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    kind: mode === 'gold' ? 'coin' : 'confetti',
    color: mode === 'gold'
      ? (Math.random() < 0.7 ? '#ffd700' : '#fff3a0')
      : `hsl(${Math.floor(Math.random() * 360)}, 100%, 60%)`
  };
}

function drawParticle(p) {
  fxCtx.save();
  fxCtx.translate(p.x, p.y);
  if (p.kind === 'coin') {
    fxCtx.scale(Math.max(0.15, Math.abs(Math.cos(p.rot))), 1);
    fxCtx.beginPath();
    fxCtx.arc(0, 0, p.r * 1.3, 0, Math.PI * 2);
    fxCtx.fillStyle = p.color;
    fxCtx.fill();
    fxCtx.lineWidth = 2;
    fxCtx.strokeStyle = '#b8860b';
    fxCtx.stroke();
  } else {
    fxCtx.rotate(p.rot);
    fxCtx.fillStyle = p.color;
    fxCtx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
  }
  fxCtx.restore();
}

function tickParticles() {
  particleRAF = null;
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

  if (particleMode) {
    const n = particleMode === 'mega' ? 4 : 2;
    for (let k = 0; k < n; k++) {
      particles.push(makeParticle(
        particleMode,
        Math.random() * fxCanvas.width, -20,
        (Math.random() - 0.5) * 1.5, 2 + Math.random() * 3, 0
      ));
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    if (p.y > fxCanvas.height + 40 || p.x < -100 || p.x > fxCanvas.width + 100) {
      particles.splice(i, 1);
      continue;
    }
    drawParticle(p);
  }

  if (particleMode || particles.length) {
    particleRAF = requestAnimationFrame(tickParticles);
  }
}

function ensureParticleLoop() {
  if (!particleRAF) particleRAF = requestAnimationFrame(tickParticles);
}

function startParticles(mode) {
  particleMode = mode;
  ensureParticleLoop();
}

function burstParticles(mode, count) {
  const cx = fxCanvas.width / 2;
  const cy = fxCanvas.height * 0.45;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 4 + Math.random() * 9;
    particles.push(makeParticle(mode, cx, cy, Math.cos(a) * s, Math.sin(a) * s, 0.22));
  }
  ensureParticleLoop();
}

function stopParticles() {
  particleMode = null;
  particles = [];
  if (particleRAF) cancelAnimationFrame(particleRAF);
  particleRAF = null;
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
}

// ==========================================
// ゲーム進行
// ==========================================

/* ペカリ発生処理 */
function triggerPekari() {
  isPekared = true;
  isBonusAligned = false;

  // ペカリ中の演出・音は「見せかけの当たり(display)」で決める。枚数はまだ分からない
  const isBig = pendingBonusType === 'BIG';
  const tier = isBig ? BIG_TIERS[pendingDisplayIndex] : null;
  const n = pendingDisplayIndex + 1;
  // 800枚以上は vvv.mp3、それ未満は gako.mp3
  const snd = tier && tier.coins >= 800 ? 'vvv' : 'gako';

  // 表示と音を同じタイミングで実行
  gogoBox.className = `${GOGO_BASE} peka ${isBig ? 'tier-' + n : 'tier-reg'}`;
  gogoBox.style.setProperty('--glow', tier ? tier.glow : '#ff007f');
  fxOverlay.className = isBig ? `fx-t${n}` : 'fx-reg';
  gogoSubtext.textContent = tier ? tier.sub : 'CHANCE';
  gogoSubtext.style.opacity = '1';

  if (tier && tier.grand) {
    // 豪華演出: ガコッ音を0.1秒刻みで3連続 + 3連フラッシュ + パーティクル
    playGakoSound(snd, 3, 100);
    tripleFlash();
    startParticles(tier.mega ? 'mega' : 'gold');
    if (tier.mega) shakeMain();
  } else {
    playGakoSound(snd);
    triggerFlash();
  }

  // 4秒間ボタンロック
  start4SecLock();
}

/* ペカり直後: レバーを止めて「揃える」ボタンだけ押せるようにする */
function start4SecLock() {
  spinBtn.disabled = true;
  spinBtn.innerText = "ボーナスを揃えてください";
  alignBtn.disabled = false;
  alignBtn.classList.remove('opacity-40', 'cursor-not-allowed');
  alignBtn.classList.add('animate-bounce', 'from-yellow-400', 'to-amber-500', 'text-black');
}

/* レバーON 処理 */
function handleSpin() {
  if (isCooldown || isFreezing) return;

  // フリーズフェイク: 200枚を見せたあとのレバーONで暗転する
  if (isBonusAligned && pendingFreezeIndex >= 0) {
    startFreeze();
    return;
  }

  // ボーナス揃え後に次へ進む場合
  if (isBonusAligned) {
    resetPekaState();
  }

  // ペカっている途中の誤操作防止
  if (isPekared && !isBonusAligned) {
    alert("GOGO!ランプが点灯しています！「ボーナスを揃える！」を押してください。");
    return;
  }

  playClickSound();

  totalGames++;
  cumulativeGames++;
  diffCoins -= 3; // 3枚消費

  // 1/30の超高確率で抽選
  const isHit = Math.random() < (1 / 30);

  if (isHit) {
    pendingBonusType = Math.random() < 0.6 ? 'BIG' : 'REG';
    pendingDisplayIndex = pendingBonusType === 'BIG' ? pickTierIndex() : -1;
    pendingTierIndex = pendingDisplayIndex;
    pendingFreezeIndex = -1;

    if (pendingBonusType === 'BIG' && BIG_TIERS[pendingDisplayIndex].coins < 800) {
      if (pendingDisplayIndex === 0 && Math.random() < FREEZE_RATE) {
        // ブルー脈動(200枚): 200枚を見せたあとレバーONでフリーズ → 1000枚 or 2000枚
        pendingFreezeIndex = Math.random() < FREEZE_MEGA_RATE ? FREEZE_MEGA_INDEX : FREEZE_GRAND_INDEX;
      } else if (Math.random() < SURPRISE_RATE) {
        // 10%の確率で、演出は控えめなのに実は800枚だった…!
        pendingTierIndex = SURPRISE_TIER_INDEX;
      }
    }

    // ボーナス当選でG数リセット
    totalGames = 0;
    updateUI();
    triggerPekari();
  } else {
    updateUI();
  }
}

/* 当選枚数に応じた表示レベル (1:青 2:黄 3:緑 4:赤 5:虹 6:特大虹) */
function payLevel(coins) {
  if (coins <= 300) return 1;
  if (coins <= 500) return 2;
  if (coins <= 700) return 3;
  if (coins <= 900) return 4;
  if (coins <= 1000) return 5;
  return 6;
}

/* 枚数表示の「ドドーン」音 (豪華枠は0.1秒刻みで3連続) */
function playPayoutSound(tier, level) {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;
  const hits = tier && tier.grand ? 3 : 1;

  for (let i = 0; i < hits; i++) {
    const t = now + i * 0.1;
    const vol = 0.5 + level * 0.1;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.45);

    // 打撃のアタック感
    tone(900 - i * 150, t, 0.06, 'square', 0.12);
  }

  // 高レベルはキラッと余韻を足す
  if (level >= 4) {
    [1568, 2093, 2637].forEach((f, i) => tone(f, now + 0.3 + i * 0.08, 0.3, 'triangle', 0.12));
  }
}

/* ボーナスを揃える！ ボタン処理: 1回目=図柄表示 / 2回目(NEXT)=枚数表示 */
function handleAlignBonus() {
  if (!isPekared || !pendingBonusType) return;
  if (alignStage === 0) showSymbols();
  else if (alignStage === 1) showPayout();
}

/* 1回目: 777 または BAR BAR BAR をリール風に大きく表示 */
function showSymbols() {
  alignStage = 1;
  initAudio(); // 音の再生準備を先に済ませる

  const tier = pendingBonusType === 'BIG' ? BIG_TIERS[pendingTierIndex] : null;

  let cell;
  if (!tier) {
    cell = '<div class="sym-bar">BAR</div>';
  } else {
    // グレード順: 赤(200〜400) < 青(500〜700) < 白(800〜2000)
    const img = pendingTierIndex <= 2 ? '7red.png' : pendingTierIndex <= 5 ? '7blue.png' : '7white.png';
    const glow = tier.mega ? 'sym-glow-mega' : tier.grand ? 'sym-glow-gold' : '';
    // 画像が無い場合は文字の7で代用
    cell = `<img class="sym-img ${glow}" src="${img}" alt="7" onerror="this.outerHTML='<div class=&quot;sym-seven&quot;>7</div>'">`;
  }
  reelsEl.innerHTML = `<div class="reel">${cell}</div>`.repeat(3);

  alignDisplay.classList.add('show-align');
  gogoTextContainer.classList.add('opacity-0');

  // 揃った瞬間にファンファーレ
  playFanfare(tier, pendingTierIndex);
  triggerFlash();

  // ボタンを NEXT に切替 (もう一度押すと枚数表示)
  alignBtn.textContent = 'NEXT';
}

/* 2回目(NEXT): 獲得枚数をドドーンと派手に表示 */
function showPayout() {
  alignStage = 2;
  isBonusAligned = true;
  initAudio();

  const tier = pendingBonusType === 'BIG' ? BIG_TIERS[pendingTierIndex] : null;
  let coins, label;

  if (tier) {
    if (!isDebugRun) bigCount++;
    coins = tier.coins;
    label = 'BIG BONUS';
    if (tier.mega) label = '🌈 MEGA BIG BONUS 🌈';
    else if (tier.grand) label = '✨ GRAND BIG BONUS ✨';
  } else {
    if (!isDebugRun) regCount++;
    coins = 104;
    label = 'REG BONUS';
  }
  if (!isDebugRun) diffCoins += coins;

  const level = payLevel(coins);
  payoutLabel.textContent = label;
  payoutValue.textContent = coins;
  payoutNum.className = `payout-num pay-l${level}`;

  // 図柄を消して枚数を表示 (アニメーションを最初から再生)
  alignDisplay.classList.remove('show-align');
  payoutDisplay.classList.remove('show-pay');
  void payoutDisplay.offsetWidth;
  payoutDisplay.classList.add('show-pay');

  playPayoutSound(tier, level);

  // 豪華演出: 3連フラッシュ + 紙吹雪/金貨の大放出 + シェイク
  if (tier && tier.grand) {
    tripleFlash();
    burstParticles(tier.mega ? 'mega' : 'gold', tier.mega ? 160 : 90);
    if (tier.mega) shakeMain(); else shakeMain(800);
  } else {
    triggerFlash();
  }

  // NEXTボタンを無効化し、レバーを「次へ」に
  alignBtn.disabled = true;
  alignBtn.className = ALIGN_BTN_DEFAULT;

  spinBtn.disabled = false;
  spinBtn.innerText = "次へ (レバーON)";

  updateUI();
}

/* 心音 (ドクン…ドクン): フリーズ中に鳴らす。だんだん速く・大きくなる */
let heartbeatTimer = null;

function thump(t, vol) {
  // 低音の本体 + スマホスピーカーでも聞こえる少し高い成分
  [[90, 45, 'sine', vol], [200, 80, 'triangle', vol * 0.5]].forEach(([f0, f1, type, v]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.18);
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  });
}

function startHeartbeat(totalMs, delay = 350) {
  stopHeartbeat();
  const startedAt = performance.now();
  const beat = () => {
    if (!isFreezing) return;
    const p = Math.min(1, (performance.now() - startedAt) / totalMs); // 0→1 (エンド間際ほど1)
    if (soundEnabled) {
      initAudio();
      const t = audioCtx.currentTime;
      const vol = 0.55 + p * 0.45;
      thump(t, vol);            // ドクン
      thump(t + 0.17, vol * 0.75); // …ドクン
    }
    heartbeatTimer = setTimeout(beat, 950 - 450 * p); // だんだん速く
  };
  heartbeatTimer = setTimeout(beat, delay);
}

function stopHeartbeat() {
  clearTimeout(heartbeatTimer);
  heartbeatTimer = null;
}

/* ブラウン管テレビの電源OFF音 (ブーン↓ → ブチッ → ピュ〜ン) */
function playCrtOffSound() {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;

  // ① 画面が潰れる間の急降下する電子音「ブーン↓」
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.32);
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.36);

  // ② 横線になる瞬間の「ブチッ」というノイズ
  const size = Math.floor(audioCtx.sampleRate * 0.12);
  const buf = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(0.5, t + 0.28);
  ng.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
  noise.connect(filter);
  filter.connect(ng);
  ng.connect(audioCtx.destination);
  noise.start(t + 0.28);

  // ③ 光点に収束して消える「ピュ〜ン」
  const ping = audioCtx.createOscillator();
  const pg = audioCtx.createGain();
  ping.type = 'sine';
  ping.frequency.setValueAtTime(4000, t + 0.42);
  ping.frequency.exponentialRampToValueAtTime(300, t + 0.95);
  pg.gain.setValueAtTime(0.13, t + 0.42);
  pg.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
  ping.connect(pg);
  pg.connect(audioCtx.destination);
  ping.start(t + 0.42);
  ping.stop(t + 0.95);
}

/* ブラウン管OFF演出: 画面全体を縦に潰して、光る線 → 点 → 真っ暗 */
let crtBlackTimer = null;

function crtTargets() {
  return [mainEl, document.querySelector('footer'), fxOverlay, fxCanvas];
}

function startCrtOff() {
  crtTargets().forEach(el => {
    // 画面の中心(縦横とも)に向かって潰れるよう、変形の基準点を合わせる
    const r = el.getBoundingClientRect();
    el.style.transformOrigin = `${window.innerWidth / 2 - r.left}px ${window.innerHeight / 2 - r.top}px`;
    el.classList.add('crt-off');
  });
  freezeOverlay.classList.add('show-freeze');
  crtBlackTimer = setTimeout(() => freezeOverlay.classList.add('black'), 300);
}

function endCrtOff() {
  clearTimeout(crtBlackTimer);
  crtTargets().forEach(el => {
    el.classList.remove('crt-off');
    el.style.transformOrigin = '';
  });
  freezeOverlay.classList.remove('show-freeze', 'black');
}

/* フリーズ開始: ブラウン管の電源が切れるように消えて、2〜3秒まっ暗 */
function startFreeze() {
  isFreezing = true;
  startCrtOff();
  playCrtOffSound();

  const wait = 2000 + Math.random() * 1000; // 真っ暗になってからの待ち時間
  const crtMs = 1000;                       // ブラウン管OFF演出の長さ
  startHeartbeat(wait + crtMs, crtMs + 100); // 心音はOFF演出のあとから
  freezeTimer = setTimeout(erupt, crtMs + wait);
}

/* フリーズ明け: 実は1000枚 or 2000枚が急に発生! */
function erupt() {
  const idx = pendingFreezeIndex;
  const real = BIG_TIERS[idx];
  const shown = BIG_TIERS[pendingTierIndex].coins; // 直前に見せていた枚数(200)
  const n = idx + 1;

  // 暗転を解除し、本当の当たりの演出に切り替える (心音はここでぷつっと止まる)
  stopHeartbeat();
  endCrtOff();
  isFreezing = false;
  pendingFreezeIndex = -1;

  if (!isDebugRun) diffCoins += real.coins - shown;
  gogoBox.className = `${GOGO_BASE} peka tier-${n}`;
  gogoBox.style.setProperty('--glow', real.glow);
  fxOverlay.className = `fx-t${n}`;

  // 枚数をドドーンと再表示
  const level = payLevel(real.coins);
  payoutLabel.textContent = real.mega ? '🌈 FREEZE!! MEGA BIG BONUS 🌈' : '✨ FREEZE!! GRAND BIG BONUS ✨';
  payoutValue.textContent = real.coins;
  payoutNum.className = `payout-num pay-l${level}`;
  payoutDisplay.classList.remove('show-pay');
  void payoutDisplay.offsetWidth;
  payoutDisplay.classList.add('show-pay');

  // 音: vvv.mp3 を0.1秒刻みで3連続 + ドドーン、少し遅れてファンファーレ
  playGakoSound('vvv', 3, 100);
  playPayoutSound(real, level);
  setTimeout(() => playFanfare(real, idx), 500);

  // 3連フラッシュ + 金貨/紙吹雪 + シェイク
  tripleFlash();
  startParticles(real.mega ? 'mega' : 'gold');
  burstParticles(real.mega ? 'mega' : 'gold', real.mega ? 160 : 90);
  if (real.mega) shakeMain(); else shakeMain(800);

  updateUI();
}

/* ランプ状態をリセットして通常状態に戻す */
function resetPekaState() {
  isPekared = false;
  isBonusAligned = false;
  pendingBonusType = null;
  pendingTierIndex = -1;
  pendingDisplayIndex = -1;
  pendingFreezeIndex = -1;

  // フリーズ中にリセットされた場合の後始末
  clearTimeout(freezeTimer);
  stopHeartbeat();
  isFreezing = false;
  isDebugRun = false;
  endCrtOff();

  // ロック中にリセットされた場合の後始末
  clearInterval(lockInterval);
  lockInterval = null;
  isCooldown = false;
  spinBtn.disabled = false;
  alignBtn.disabled = true;
  alignBtn.className = ALIGN_BTN_DEFAULT;
  alignBtn.textContent = 'ボーナスを揃える！';
  alignStage = 0;

  gogoBox.className = GOGO_BASE;
  fxOverlay.className = '';
  gogoSubtext.style.opacity = '0';
  gogoSubtext.textContent = 'CHANCE';

  alignDisplay.classList.remove('show-align');
  payoutDisplay.classList.remove('show-pay');
  gogoTextContainer.classList.remove('opacity-0');

  stopParticles();
  mainEl.classList.remove('shake-main');

  spinBtn.innerText = "レバーON";
}

/* UIデータ更新 */
function updateUI() {
  displayGames.textContent = totalGames;
  displayBig.textContent = bigCount;
  displayReg.textContent = regCount;

  const totalBonus = bigCount + regCount;
  displayProb.textContent = totalBonus > 0 ? `1/${(cumulativeGames / totalBonus).toFixed(1)}` : `1/0`;

  displayDiff.textContent = (diffCoins >= 0 ? `+${diffCoins}` : `${diffCoins}`);
  displayDiff.className = `digital-font font-bold text-sm ${diffCoins >= 0 ? 'text-green-400' : 'text-red-400'}`;
}

/* データリセット */
function resetData() {
  if (confirm("ゲームデータをリセットしますか？")) {
    totalGames = 0;
    cumulativeGames = 0;
    bigCount = 0;
    regCount = 0;
    diffCoins = 0;
    resetPekaState();
    updateUI();
  }
}

// イベントリスナー
spinBtn.addEventListener('click', handleSpin);
alignBtn.addEventListener('click', handleAlignBonus);
document.getElementById('reset-btn').addEventListener('click', resetData);

// 音声ON/OFF (アイコン表示)
const ICON_SOUND_ON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>`;
const ICON_SOUND_OFF = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

const soundToggleBtn = document.getElementById('sound-toggle-btn');
soundToggleBtn.innerHTML = ICON_SOUND_ON;
soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.innerHTML = soundEnabled ? ICON_SOUND_ON : ICON_SOUND_OFF;
});
