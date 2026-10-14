// ==========================================
// BIG 当たり種類 (150枚〜400枚の6種類)
// glow: GOGO!の発光色 / sub: ペカリ中のサブ表示
// ボーナス枚数は、ボーナス中のベルで少しずつ獲得する
// ==========================================
const BIG_TIERS = [
  { coins: 150, glow: '#3b82f6', sub: 'CHANCE' },
  { coins: 200, glow: '#22c55e', sub: 'CHANCE' },
  { coins: 250, glow: '#f97316', sub: 'CHANCE!' },
  { coins: 300, glow: '#ef4444', sub: 'CHANCE!' },
  { coins: 350, glow: '#a855f7', sub: 'BIG CHANCE!' },
  { coins: 400, glow: '#facc15', sub: 'BIG CHANCE!!', grand: true }
];

// ==========================================
// 確率設定 (画面の設定ボタンから手動で編集できる。値はブラウザに保存される)
//   weights : [150, 200, 250, 300, 350, 400] の比率 (合計が100でなくても比率として扱う)
//   その他  : 単位は %
// ==========================================
const TIER_LABELS = BIG_TIERS.map(t => String(t.coins));
const DEFAULT_SETTINGS = {
  hitDenom: 100,                                       // 通常時のボーナス当選確率 1/N (基本はチェリー→高確率で当てる)
  weights: [30, 25, 20, 13, 8, 4],                    // 当選枚数の比率
  atEntryMin: 20,      // ボーナス150枚のときのAT突入率 (枚数が多いほど高くなる)
  atEntryMax: 80,      // ボーナス400枚のときのAT突入率
  auraWhite: 15,       // AT当選時に、オーラが一度も昇格しない (白のまま) 割合
  bonusBellPay: 15,    // ボーナス中: 1ゲームのベル払い出し枚数
  replay: 13.7,        // ハズレのうちリプレイになる割合 (約1/7.3)
  bellNormal: 8,       // 通常時: ハズレのうちベルが揃う割合
  bellAt: 50,          // AT中: ハズレのうちベルが揃う割合
  replayAt: 35,        // AT中: ハズレのうちリプレイになる割合
  atHitMult: 0.1,      // AT中のボーナス当選確率の倍率 (低いほど当選しにくい)
  atW50: 80,           // AT継続G数の比率: +50G (ほとんどこれ)
  atW100: 14,          // +100G (稀)
  atW200: 5,           // +200G (稀)
  atW300: 1,           // +300G (ごく稀)
  bellStraight: 60,    // 通常時のベル比率: 直線 (6枚)
  bellDiagTL: 25,      // 斜め 左上から (1枚)
  bellDiagBL: 15,      // 斜め 左下から (15枚)
  atBellStraight: 30,  // AT中のベル比率: 直線 (6枚)
  atBellDiagTL: 10,    // 斜め 左上から (1枚)
  atBellDiagBL: 60,    // 斜め 左下から (15枚)
  cherry: 3,           // 通常時: ハズレのうちチェリーが揃う割合 (左列に1個で成立)
  cherryMult: 5,       // チェリー後 (内部高確率) のボーナス当選確率の倍率
  cherryG: 30,         // チェリー後の内部高確率の期間 (G)
  cherryAt: 6,         // AT中: ハズレのうちチェリーが揃う割合
  cherryAtSuccess: 70, // AT中のチェリーでG数が上乗せされる割合 (外れもある)
  cherryW10: 40,       // 上乗せ量の比率: +10G
  cherryW20: 30,       // +20G
  cherryW25: 20,       // +25G
  cherryW30: 10,       // +30G
  cherryCoins: 2,      // チェリーの払い出し枚数
  modeW0: 55,          // AT終了後の次回モード比率: 通常 (示唆: 弱)
  modeW1: 28,          // 好調 (30G / 当選率2倍)
  modeW2: 14,          // 絶好調 (40G / 4倍)
  modeW3: 3,           // 天国 (50G / 8倍)
  hintTrue: 70         // リザルト示唆が実際のモードと一致する割合
};
const SETTINGS_KEY = 'pekari-settings-v2';

function loadSettings() {
  const st = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      Object.keys(DEFAULT_SETTINGS).forEach(k => {
        if (k === 'weights') {
          if (Array.isArray(raw.weights) && raw.weights.length === st.weights.length &&
              raw.weights.every(v => Number.isFinite(+v) && +v >= 0)) st.weights = raw.weights.map(Number);
        } else if (Number.isFinite(+raw[k])) {
          st[k] = +raw[k];
        }
      });
    }
  } catch (e) { /* 保存データが無い/読めない場合は初期値 */ }
  return st;
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) { /* 保存できなくても動作は続ける */ }
}

let SETTINGS = loadSettings();
let HIT_RATE, TIER_RATES;
let AT_ENTRY_MIN, AT_ENTRY_MAX, AURA_WHITE, BONUS_BELL_PAY;
let CHERRY_AT_RATE, CHERRY_AT_SUCCESS, CHERRY_AT_WEIGHTS = [40, 30, 20, 10], CHERRY_RATE, CHERRY_MULT, CHERRY_G, CHERRY_COINS;
let BELL_NORMAL_RATE, BELL_AT_RATE, AT_HIT_MULT, AT_WEIGHTS = [80, 14, 5, 1];
let BELL_WEIGHTS = [60, 25, 15], AT_BELL_WEIGHTS = [30, 10, 60];
let MODE_WEIGHTS = [55, 28, 14, 3], HINT_TRUE;
let REPLAY_AT_RATE, REPLAY_RATE;

function applySettings() {
  const st = SETTINGS;
  const clampP = v => Math.min(1, Math.max(0, v / 100));
  const nz = v => Math.max(0, +v || 0);
  HIT_RATE = 1 / Math.max(1, st.hitDenom);
  TIER_RATES = st.weights.map(nz);          // BIG各枚数の比率 (抽選時に正規化)
  AT_ENTRY_MIN = clampP(st.atEntryMin);
  AT_ENTRY_MAX = clampP(st.atEntryMax);
  AURA_WHITE = clampP(st.auraWhite);
  BONUS_BELL_PAY = Math.max(1, Math.round(st.bonusBellPay));
  REPLAY_RATE = clampP(st.replay);
  REPLAY_AT_RATE = clampP(st.replayAt);
  CHERRY_RATE = clampP(st.cherry);
  CHERRY_AT_RATE = clampP(st.cherryAt);
  CHERRY_AT_SUCCESS = clampP(st.cherryAtSuccess);
  CHERRY_AT_WEIGHTS = [st.cherryW10, st.cherryW20, st.cherryW25, st.cherryW30].map(nz);
  CHERRY_MULT = Math.max(0, st.cherryMult);
  CHERRY_G = Math.max(0, Math.round(st.cherryG));
  CHERRY_COINS = Math.max(0, Math.round(st.cherryCoins));
  BELL_NORMAL_RATE = clampP(st.bellNormal);
  BELL_AT_RATE = clampP(st.bellAt);
  AT_HIT_MULT = Math.max(0, st.atHitMult);
  AT_WEIGHTS = [st.atW50, st.atW100, st.atW200, st.atW300].map(nz);
  BELL_WEIGHTS = [st.bellStraight, st.bellDiagTL, st.bellDiagBL].map(nz);
  AT_BELL_WEIGHTS = [st.atBellStraight, st.atBellDiagTL, st.atBellDiagBL].map(nz);
  MODE_WEIGHTS = [st.modeW0, st.modeW1, st.modeW2, st.modeW3].map(nz);
  HINT_TRUE = clampP(st.hintTrue);
}
applySettings();

/* 比率の配列から1つ選んで、その番号を返す */
function weightedPick(w) {
  const sum = w.reduce((x, y) => x + y, 0);
  if (sum <= 0) return 0;
  let r = Math.random() * sum;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r < 0) return i;
  }
  return w.length - 1;
}

/* BIGに当選したときの種類(枚数)を抽選 */
function pickTierIndex() { return weightedPick(TIER_RATES); }

// ゲーム状態変数
const gameHistory = [];   // グラフ用: {g: 累計G数, diff: 差枚数}
const bonusLog = [];      // グラフ用: {g, type, coins}
function recordPoint() {
  if (isDebugRun) return;
  gameHistory.push({ g: cumulativeGames, diff: diffCoins });
  if (gameHistory.length > 20000) gameHistory.shift();
}
let totalGames = 0;       // 表示用G数 (ボーナス当選でリセット)
let cumulativeGames = 0;  // 合算確率計算用の累計G数
let bigCount = 0;
let atCount = 0;          // AT突入回数
let diffCoins = 0;

let isPekared = false;
let isBonusAligned = false;
let pendingBonusType = null;       // 'BIG'
let pendingTierIndex = -1;         // 当たりの枚数・図柄
let pendingDisplayIndex = -1;      // GOGO!演出として見せる当たり
let pendingPlan = null;            // 枚数表示のあとに始まる「ボーナス消化」の計画
let bonusRun = null;               // ボーナス消化中の状態 {total, paid, games, played, atWin, level, promo, aura}
let currentShownCoins = 0;
let isCounting = false;            // 数字カウントアップ中
let countRAF = null;
let modeGames = 0;                 // AT終了後の「次回モード」の残りG数 (当選率アップ・画面には出さない)
let modeMult = 1;                  // 次回モードの当選確率の倍率
let atRun = null;                  // いまのAT中の集計 {startDiff, games, bells, bonuses}
let atEnding = false;              // ATのG数が0になった (リザルト待ち)
let isAtResult = false;            // リザルト表示中 (レバー無効)
let cherryGames = 0;               // チェリー後の当選しやすい期間 (残りG)
let atGames = 0;                   // AT残りG数 (0なら通常時)
let replayPending = false;         // 次のゲームはリプレイ (3枚を消費しない)
let isRushing = false;             // PEKA RUSH!!! 演出中 (レバー無効)
let isSuspense = false;            // 鼓動演出中 (レバー無効)
let isPushing = false;             // PUSHボタン演出中 (レバー無効)
let suspenseTimer = null;
let isDebugRun = false;            // デバッグ再生中は G数・回数・差枚数を変えない
let soundEnabled = true;
let isCooldown = false;
let lockInterval = null;
let alignStage = 0; // 0: 未 / 1: 図柄表示中(NEXT待ち) / 2: 枚数表示済み

const GOGO_BASE = 'gogo-lamp w-full flex flex-col items-center justify-center relative cursor-pointer';
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

/* 長すぎる音は途中でフェードアウトして切る (秒)。vvv.mp3 はここで長さを調整できる */
const VVV_MIN_COINS = 350;   // この枚数以上の「枚数表示」で vvv.mp3 を鳴らす
const SAMPLE_MAX_SEC = { vvv: 2.8 };
const SAMPLE_FADE_SEC = 0.15;

function playSampleOnce(name) {
  if (!soundEnabled) return;
  const max = SAMPLE_MAX_SEC[name];
  const buf = soundBuffers[name];
  if (buf && audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const g = audioCtx.createGain();
    src.connect(g);
    g.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    if (max && buf.duration > max) {
      g.gain.setValueAtTime(1, t + max - SAMPLE_FADE_SEC);
      g.gain.linearRampToValueAtTime(0, t + max);
      src.start(t, 0, max);
    } else {
      src.start(t);
    }
    return;
  }
  const a = soundAudio[name].cloneNode();
  a.currentTime = 0;
  if (max) {
    const steps = 6;
    setTimeout(() => {
      let k = 0;
      const iv = setInterval(() => {
        k++;
        a.volume = Math.max(0, 1 - k / steps);
        if (k >= steps) { clearInterval(iv); a.pause(); }
      }, SAMPLE_FADE_SEC * 1000 / steps);
    }, (max - SAMPLE_FADE_SEC) * 1000);
  }
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

/* 図柄が揃った瞬間の短いチャイム */
function playAlignChime() {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;
  tone(880, now, 0.18, 'triangle', 0.2);
  tone(1318.5, now + 0.1, 0.3, 'triangle', 0.2);
}

/* 枚数表示のファンファーレ。rank が上がるほど長く・厚く・豪華になる
   rank: 0=REG / 1〜10=BIG(200〜2000枚) / 9=777枚 / 11=7777枚 */
function playPayoutFanfare(rank) {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;

  if (rank <= 0) {
    [440.00, 554.37, 659.25].forEach((f, i) => tone(f, now + i * 0.12, 0.35));
    return;
  }

  const r = Math.min(rank, 11);
  const root = 523.25 * Math.pow(2, Math.min(r, 10) / 24);   // 上位ほど音程も高く
  const vol = Math.max(0.07, 0.15 - r * 0.005);              // 音数が増える分、音量は少し下げて割れ防止
  const chord = (base, t, dur, ratios) =>
    ratios.forEach(x => tone(base * x, t, dur, 'sawtooth', vol));

  // ① 駆け上がるアルペジオ (音数が枚数とともに増える)
  const steps = Math.min(3 + r, 12);
  const gap = Math.max(0.05, 0.11 - r * 0.005);
  const arp = [1, 1.25, 1.5, 2];
  for (let i = 0; i < steps; i++) {
    tone(root * arp[i % 4] * Math.pow(2, Math.floor(i / 4)), now + i * gap, 0.22, 'sawtooth', vol);
  }

  // ② フィナーレの和音 (枚数が多いほど長く・音が厚く)
  const fin = now + steps * gap + 0.04;
  const finDur = 0.5 + r * 0.1;
  const ratios = [1, 1.25, 1.5, 2];
  if (r >= 4) ratios.push(2.5);
  if (r >= 6) ratios.push(3);
  chord(root * 2, fin, finDur, ratios);
  if (r >= 3) tone(root, fin, finDur, 'square', vol);           // 低音
  if (r >= 2) tone(root / 2, fin, finDur, 'sine', 0.22);         // 重低音

  // ③ キラキラ (5枚目以降)
  if (r >= 5) {
    const n = 6 + (r - 5) * 3;
    for (let i = 0; i < n; i++) {
      tone(1568 * Math.pow(2, (i % 5) / 5) * (i % 2 ? 1 : 1.5), fin + i * 0.06, 0.25, 'triangle', 0.1);
    }
  }

  // ④ 転調して2回目のフレーズ (800枚〜)
  if (r >= 7) {
    const t2 = fin + finDur * 0.55;
    [1.125, 1.25, 1.5].forEach((h, k) => chord(root * h * 2, t2 + k * 0.1, 0.14, [1, 1.25, 1.5, 2]));
    chord(root * 3, t2 + 0.4, 0.9 + (r - 7) * 0.15, [1, 1.25, 1.5, 2, 2.5]);
    tone(root * 1.5, t2 + 0.4, 0.9 + (r - 7) * 0.15, 'square', vol);
  }

  // ⑤ ティンパニのドロドロ (900枚〜)
  if (r >= 9) {
    for (let i = 0; i < 6 + (r - 9) * 2; i++) {
      const t = fin + i * 0.07;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + 0.14);
    }
  }

  // ⑥ 2000枚: 上昇グリッサンド + 3回目のフレーズ
  if (r >= 10) {
    for (let i = 0; i < 14; i++) {
      tone(1046.5 * Math.pow(2, i / 12 * 1.5), fin + 0.5 + i * 0.06, 0.25, 'triangle', 0.1);
    }
    const t3 = fin + finDur + 0.6;
    [1.5, 1.6875, 1.875].forEach((h, k) => chord(root * h * 2, t3 + k * 0.1, 0.14, [1, 1.25, 1.5, 2]));
    chord(root * 4, t3 + 0.4, 1.4, [1, 1.25, 1.5, 2, 3]);
  }

  // ⑦ 7777枚: さらに転調 + 長い余韻の大合唱
  if (r >= 11) {
    const t4 = fin + finDur + 1.9;
    [1, 1.125, 1.25, 1.5].forEach((h, k) => chord(root * h * 4, t4 + k * 0.1, 0.14, [1, 1.25, 1.5, 2]));
    chord(root * 6, t4 + 0.5, 2.6, [1, 1.25, 1.5, 2, 2.5, 3]);
    tone(root, t4 + 0.5, 2.6, 'square', vol);
    for (let i = 0; i < 24; i++) {
      tone(2093 * Math.pow(2, (i % 7) / 7), t4 + 0.5 + i * 0.08, 0.3, 'triangle', 0.09);
    }
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

  const tier = BIG_TIERS[pendingDisplayIndex];
  const n = pendingDisplayIndex + 1;

  // 表示と音を同じタイミングで実行 (GOGO!ランプが光る音は gako.mp3)
  gogoBox.className = `${GOGO_BASE} peka tier-${n}`;
  gogoBox.style.setProperty('--glow', tier.glow);
  fxOverlay.className = '';   // 背景エフェクトは枚数表示の時だけ。ペカリ中は文字ランプが光る
  gogoSubtext.textContent = tier.sub;
  gogoSubtext.style.opacity = '1';

  playGakoSound('gako');
  if (tier.grand) {
    tripleFlash();
    startParticles('gold');
  } else {
    triggerFlash();
  }

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
  // PUSHボタン待ちのときは、レバーでもPUSHできる
  if (isPushing) {
    if (pushOverlay.classList.contains('waiting')) pushBtn.click();
    return;
  }
  if (isCooldown || isCounting || isSuspense || isRushing || isAtResult) return;

  // 枚数表示のあとのレバーON: ボーナス消化(ベルでの枚数獲得)が始まる
  if (isBonusAligned) {
    const wasDebug = isDebugRun;
    const plan = pendingPlan;
    resetPekaState();
    if (!wasDebug && plan) beginBonus(plan);
  }

  // ペカっている途中の誤操作防止
  if (isPekared && !isBonusAligned) {
    alert("GOGO!ランプが点灯しています！「ボーナスを揃える！」を押してください。");
    return;
  }

  // ボーナス消化中: 毎ゲームベルが揃って枚数を獲得する
  if (bonusRun) {
    bonusGame();
    return;
  }

  playClickSound();

  totalGames++;
  cumulativeGames++;
  const inAT = atGames > 0;
  const inMode = !inAT && modeGames > 0;
  if (inAT) {
    atGames--;
    if (atRun) atRun.games++;
    if (atGames === 0) atEnding = true;   // リザルトはこのゲームの結果が出たあとに表示
    updateAT();
  } else if (inMode) {
    modeGames--;
  }
  if (replayPending) {
    replayPending = false;       // リプレイ: このゲームは投入なし
    spinBtn.innerText = 'レバーON';
  } else {
    diffCoins -= 3;              // 3枚消費
  }
  recordPoint();

  const inCherry = cherryGames > 0;
  if (inCherry) { cherryGames--; updateCherry(); }
  // AT中は当選しにくい / 次回モード中は当選しやすい / チェリー後は当選しやすい
  const hitMult = (inAT ? AT_HIT_MULT : inMode ? modeMult : 1) * (inCherry ? CHERRY_MULT : 1);
  const isHit = Math.random() < Math.min(1, HIT_RATE * hitMult);

  if (isHit) {
    pendingBonusType = 'BIG';
    pendingDisplayIndex = pickTierIndex();
    pendingTierIndex = pendingDisplayIndex;
    pendingPlan = null;
    replayPending = false;
    if (inAT && atRun) atRun.bonuses++;
    cherryGames = 0;
    updateCherry();

    // ボーナス当選でG数リセット
    totalGames = 0;
    updateUI();
    hideLoseReels();
    triggerPekari();
  } else if (Math.random() < (inAT ? BELL_AT_RATE : BELL_NORMAL_RATE)) {
    // ベル揃い: 直線 / 斜め左上から1枚 / 斜め左下から15枚 (AT中は左下が出やすい)
    if (inAT && atRun) atRun.bells++;
    hitBell(undefined, inAT);
    updateUI();
  } else if (Math.random() < (inAT ? CHERRY_AT_RATE : CHERRY_RATE)) {
    // チェリー: 左列に1個あるだけで成立。通常時は30G間ボーナス高確率 (内部) / AT中はPUSHでG数上乗せ
    hitCherry(false, inAT);
    updateUI();
  } else if (Math.random() < (inAT ? REPLAY_AT_RATE : REPLAY_RATE)) {
    // リプレイ: 図柄が揃って、次のゲームは投入枚数なし
    replayPending = true;
    showReplayReels();
    spinBtn.innerText = 'リプレイ (レバーON)';
    playReplayJingle();
    updateUI();
  } else {
    showLoseReels();
    updateUI();
  }

  if (!isHit) maybeShowAtResult();   // ATの最終ゲームがボーナス以外ならここでリザルト
}

/* 当選枚数に応じた表示レベル (1〜6。枚数が大きいほど派手) */
function payLevel(coins) {
  const i = BIG_TIERS.findIndex(t => t.coins >= coins);
  return i < 0 ? BIG_TIERS.length : i + 1;
}

/* 枚数表示の「ドドーン」音 */
function playPayoutSound(level) {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;

  for (let i = 0; i < 1; i++) {
    const t = now;
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

/* ---------- リール (3行3列) ---------- */
const REEL_SYMBOLS = ['7red', '7blue', '7white', 'bar', 'bell', 'cherry', 'melon'];
const REEL_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const EMOJI = { bell: '🔔', cherry: '🍒', melon: '🍉' };

function symbolHTML(key, glow) {
  if (key === 'replay') return '<div class="sym-replay">REPLAY</div>';
  if (key === 'bar') return '<div class="sym-bar">BAR</div>';
  if (EMOJI[key]) return `<div class="sym-emoji">${EMOJI[key]}</div>`;
  // 画像が無い場合は文字の7で代用
  return `<img class="sym-img ${glow || ''}" src="${key}.png" alt="7" onerror="this.outerHTML='<div class=&quot;sym-seven&quot;>7</div>'">`;
}
const randSym = () => REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)];
// チェリーは左列に1個あるだけで揃い扱い。だから左列には、チェリー役のとき以外チェリーを出さない
const LEFT_COL = [0, 3, 6];
function randSymAt(i) {
  let k;
  do { k = randSym(); } while (k === 'cherry' && LEFT_COL.includes(i));
  return k;
}
const lineOf = (g, l) => g[l[0]] === g[l[1]] && g[l[1]] === g[l[2]];

/* ハズレ: どの列・行・斜めも揃わない9マス */
function loseGrid() {
  let g;
  do { g = Array.from({ length: 9 }, (_, i) => randSymAt(i)); } while (REEL_LINES.some(l => lineOf(g, l)));
  return g;
}
/* 当たり: 中段だけが揃い、残りの6マスは別の図柄で埋める */
function winGrid(key) {
  let g;
  do {
    g = Array.from({ length: 9 }, (_, i) => randSymAt(i));
    g[3] = g[4] = g[5] = key;
  } while (REEL_LINES.some((l, i) => i !== 1 && lineOf(g, l)));
  return g;
}

/* winIdx: 揃ったマスの番号の配列 (null ならハズレ表示) */
function renderReels(grid, winIdx, glow) {
  reelsEl.innerHTML = grid.map((key, i) => {
    const isWin = !!winIdx && winIdx.includes(i);
    const cls = winIdx ? (isWin ? 'win' : 'dim') : '';
    return `<div class="reel ${cls}" style="--i:${i}">${symbolHTML(key, isWin ? glow : '')}</div>`;
  }).join('');
}

/* リプレイ: ランダムな1ラインにREPLAYが揃う */
function showReplayReels() {
  bellBadge.classList.remove('show');
  const line = REEL_LINES[Math.floor(Math.random() * REEL_LINES.length)];
  let g;
  do {
    g = Array.from({ length: 9 }, (_, i) => randSymAt(i));
    line.forEach(i => { g[i] = 'replay'; });
  } while (REEL_LINES.some(l => l !== line && lineOf(g, l)));
  renderReels(g, line, '');
  alignDisplay.classList.remove('show-align');
  alignDisplay.classList.add('show-lose');
  gogoTextContainer.classList.add('opacity-0');
}

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
function showGet(coins) {
  getPop.innerHTML = `${coins}<span>枚 GET</span>`;
  getPop.className = 'get-pop ' + (coins >= 15 ? 'g-big' : coins >= 6 ? 'g-mid' : 'g-small');
  void getPop.offsetWidth;
  getPop.classList.add('show');
}
function showBellResult(coins, inAT) {
  bellBadge.classList.remove('show');
  if (inAT) {
    showGet(coins);
  } else {
    bellBadge.textContent = `BELL +${coins}`;
    void bellBadge.offsetWidth;
    bellBadge.classList.add('show');
  }
  playBellSound(coins);
}

function renderBellGrid(type) {
  const lines = BELL_LINES[type];
  const line = lines[Math.floor(Math.random() * lines.length)];
  let g;
  do {
    g = Array.from({ length: 9 }, (_, i) => randSymAt(i));
    line.forEach(i => { g[i] = 'bell'; });
  } while (REEL_LINES.some(l => l.join() !== line.join() && lineOf(g, l)));
  renderReels(g, line, '');
  alignDisplay.classList.remove('show-align');
  alignDisplay.classList.add('show-lose');
  gogoTextContainer.classList.add('opacity-0');
}

/* forceType: デバッグ再生 (差枚数は変えない) / inAT: AT中 (でっかく表示) */
function hitBell(forceType, inAT) {
  const isDebugCall = forceType !== undefined;
  const type = isDebugCall ? forceType : pickBellType(inAT);
  renderBellGrid(type);
  const coins = BELL_TYPES[type].coins;
  if (!isDebugCall) {
    diffCoins += coins;
    recordPoint();
  }
  showBellResult(coins, inAT);
}

/* ボーナス中のベル (斜め左下から揃う)。枚数は残りの枚数を超えない */
function hitBonusBell(coins) {
  renderBellGrid(2);
  showBellResult(coins, true);
}

function playBellSound(coins) {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  const n = coins >= 15 ? 5 : coins >= 6 ? 3 : 2;   // 枚数が多いほど長いチャイム
  for (let i = 0; i < n; i++) tone(1568 * Math.pow(1.122, i), t + i * 0.07, 0.35, 'sine', 0.16);
}

/* ---------- チェリー ---------- */
const cherryStatus = document.getElementById('cherry-status');
const cherryRemain = document.getElementById('cherry-remain');
function updateCherry() {
  if (!cherryStatus) return;
  cherryStatus.classList.toggle('on', cherryGames > 0 && window.SHOW_INTERNAL === true);   // 内部状態なので通常は表示しない
  cherryRemain.textContent = cherryGames;
}
const CHERRY_AT_CHOICES = [10, 20, 25, 30];
function pickCherryAtG() {
  const sum = CHERRY_AT_WEIGHTS.reduce((x, y) => x + y, 0);
  if (sum <= 0) return CHERRY_AT_CHOICES[0];
  let r = Math.random() * sum;
  for (let i = 0; i < CHERRY_AT_WEIGHTS.length; i++) {
    r -= CHERRY_AT_WEIGHTS[i];
    if (r < 0) return CHERRY_AT_CHOICES[i];
  }
  return CHERRY_AT_CHOICES[0];
}

function hitCherry(isDebugCall, inAT) {
  let addG = 0;
  const row = Math.floor(Math.random() * 3);
  const idx = row * 3;                                 // 左列のどれか1マス
  let g;
  do {
    g = Array.from({ length: 9 }, (_, i) => randSymAt(i));
    g[idx] = 'cherry';
  } while (REEL_LINES.some(l => lineOf(g, l)));
  renderReels(g, [idx], '');
  alignDisplay.classList.remove('show-align');
  alignDisplay.classList.add('show-lose');
  gogoTextContainer.classList.add('opacity-0');

  if (!isDebugCall) {
    diffCoins += CHERRY_COINS;
    recordPoint();
    if (inAT) {
      // AT中のチェリー: 70%でPUSHボタン → ATのG数が +10/+20/+25/+30G (外れもある)。最終ゲームなら終了を取り消して延長
      if (Math.random() < CHERRY_AT_SUCCESS) {
        addG = pickCherryAtG();
        atEnding = false;
        pushReveal(`+${addG}G`, false, () => { atGames += addG; updateAT(); });
      }
    } else {
      cherryGames = CHERRY_G;        // 内部的にボーナス高確率 (画面には出さない)
      updateCherry();
    }
  }
  bellBadge.textContent = 'CHERRY' + (CHERRY_COINS > 0 ? ` +${CHERRY_COINS}` : '');
  bellBadge.classList.remove('show');
  void bellBadge.offsetWidth;
  bellBadge.classList.add('show');
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    [1319, 1760, 2349].forEach((f, i) => tone(f, t + i * 0.06, 0.25, 'triangle', 0.14));
  }
}

/* ---------- AT ---------- */
const atStatus = document.getElementById('at-status');
const atRemain = document.getElementById('at-remain');
const atLabel = document.getElementById('at-label');
const atToast = document.getElementById('at-toast');

function updateAT() {
  if (!atStatus) return;
  if (bonusRun) {
    atStatus.classList.add('on', 'bonus');
    atLabel.textContent = 'BONUS';
    atRemain.textContent = Math.max(0, bonusRun.games - bonusRun.played);
    return;
  }
  atStatus.classList.remove('bonus');
  atStatus.classList.toggle('on', atGames > 0);
  atLabel.textContent = 'AT';
  atRemain.textContent = atGames;
}
function showAtToast(text) {
  if (!atToast) return;
  atToast.textContent = text;
  atToast.classList.remove('show');
  void atToast.offsetWidth;
  atToast.classList.add('show');
}
/* AT継続G数を比率から抽選: +50G (基本) / +100G・+200G・+300G (プレミア) */
const AT_CHOICES = [50, 100, 200, 300];
function pickAtGames() { return AT_CHOICES[weightedPick(AT_WEIGHTS)]; }

/* ---------- PUSHボタン演出: G数獲得時、PUSHを押すと「+10G」などがでかでかと出る ---------- */
const pushOverlay = document.getElementById('push-overlay');
const pushBtn = document.getElementById('push-btn');
const pushResult = document.getElementById('push-result');

function pushReveal(text, premium, onDone) {
  isPushing = true;
  pushResult.textContent = text;
  pushOverlay.className = 'push-overlay show waiting' + (premium ? ' premium' : '');
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    [988, 1319].forEach((f, i) => tone(f, t + i * 0.09, 0.2, 'triangle', 0.14));
  }
  const handler = () => {
    pushBtn.removeEventListener('click', handler);
    pushOverlay.className = 'push-overlay show revealed' + (premium ? ' premium' : '');
    playPayoutSound(premium ? 6 : 3);
    playPayoutFanfare(premium ? 8 : 3);
    if (premium) { tripleFlash(); burstParticles('gold', 100); } else { triggerFlash(); burstParticles('gold', 40); }
    setTimeout(() => {
      pushOverlay.className = 'push-overlay';
      isPushing = false;
      if (onDone) onDone();
    }, premium ? 1900 : 1400);
  };
  pushBtn.addEventListener('click', handler);
}

const rushOverlay = document.getElementById('rush-overlay');
const rushSub = document.getElementById('rush-sub');

/* AT突入 (PEKA RUSH!!!): 演出のあとPUSHボタン → 獲得G数をでかでかと表示 */
function startAT(games) {
  const n = games || pickAtGames();
  const premium = n >= 100;   // +100G以上はプレミア演出
  atEnding = false;
  if (!atRun) atRun = { startDiff: diffCoins, games: 0, bells: 0, bonuses: 0 };
  isRushing = true;
  rushSub.textContent = '';
  rushOverlay.classList.remove('show', 'premium');
  void rushOverlay.offsetWidth;
  rushOverlay.classList.add('show');
  if (premium) rushOverlay.classList.add('premium');

  playGakoSound('gako');
  playPayoutSound(premium ? 6 : 4);
  playPayoutFanfare(premium ? 10 : 6);
  tripleFlash();
  if (premium) {
    burstParticles('mega', 160);
    startParticles('gold');
    shakeMain();
  } else {
    burstParticles('gold', 70);
  }

  const ms = premium ? 3000 : 2200;
  setTimeout(() => {
    rushOverlay.classList.remove('show', 'premium');
    stopParticles();
    mainEl.classList.remove('shake-main');
    isRushing = false;
    pushReveal(`+${n}G`, premium, () => {
      atGames += n;
      modeGames = 0;
      modeMult = 1;
      updateAT();
    });
  }, ms);
}

/* ---------- ボーナス消化 (ATへのCZを兼ねる) ----------
   ボーナス枚数は、毎ゲーム揃うベルで少しずつ獲得する。
   消化中は画面の周りのオーラ色(白→青→黄→緑→赤→金→虹)でAT期待度を示す。
   ボーナス枚数が多いほどAT突入率が高い。一度も昇格しない白は逆に激アツ。 */
const AURA_NAMES = ['白', '青', '黄', '緑', '赤', '金', '虹'];
const AURA_WIN_W = [0, 8, 16, 22, 24, 20, 10];   // AT当選時の最終オーラ (白は auraWhite で別枠)
const AURA_LOSE_W = [2, 40, 28, 17, 9, 4, 0];    // AT非当選時の最終オーラ (虹は当選確定)
const auraEl = document.getElementById('aura');

function atEntryRateFor(coins) {
  const lo = BIG_TIERS[0].coins, hi = BIG_TIERS[BIG_TIERS.length - 1].coins;
  const t = Math.min(1, Math.max(0, (coins - lo) / (hi - lo)));
  return AT_ENTRY_MIN + (AT_ENTRY_MAX - AT_ENTRY_MIN) * t;
}
function pickAuraLevel(atWin) {
  if (atWin) return Math.random() < AURA_WHITE ? 0 : weightedPick(AURA_WIN_W);
  return weightedPick(AURA_LOSE_W);
}
/* opts: {atWin, level, debug} (デバッグ用に結果を指定できる) */
function makeBonusPlan(coins, opts = {}) {
  const games = Math.ceil(coins / BONUS_BELL_PAY);
  const atWin = opts.atWin !== undefined ? opts.atWin : Math.random() < atEntryRateFor(coins);
  const level = Math.min(games, opts.level !== undefined ? opts.level : pickAuraLevel(atWin));
  // 昇格するゲームをランダムに決める (最終オーラ = 昇格した回数)
  const pool = Array.from({ length: games }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const promo = pool.slice(0, level).sort((a, b) => a - b);
  return { total: coins, paid: 0, games, played: 0, atWin, level, promo, aura: 0, debug: !!opts.debug };
}
function setAura(level, pop) {
  if (level === null) { auraEl.className = 'aura'; return; }
  auraEl.className = `aura on lv${level}`;
  if (pop) { void auraEl.offsetWidth; auraEl.classList.add('pop'); }
}
function playAuraUp(level) {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  const base = 523 * Math.pow(1.0595, level * 2);
  [0, 4, 7].forEach((st, i) => tone(base * Math.pow(1.0595, st), t + i * 0.07, 0.3, 'triangle', 0.14));
  if (level >= 5) [0, 4, 7, 12].forEach((st, i) => tone(base * 2 * Math.pow(1.0595, st), t + 0.25 + i * 0.07, 0.35, 'sine', 0.12));
}

function beginBonus(plan) {
  bonusRun = plan;
  setAura(0);
  updateAT();
}

function bonusGame() {
  const b = bonusRun;
  playClickSound();
  b.played++;
  const pay = Math.min(BONUS_BELL_PAY, b.total - b.paid);
  b.paid += pay;
  if (!b.debug) {
    diffCoins += pay;
    recordPoint();
  }
  hitBonusBell(pay);
  if (b.promo.includes(b.played)) {
    b.aura++;
    setAura(b.aura, true);
    playAuraUp(b.aura);
    if (b.aura >= 4) triggerFlash();
  }
  updateAT();
  updateUI();
  if (b.paid >= b.total) finishBonus();
}

/* 全ゲーム消化: 鼓動のあと、AT突入かどうかを見せる */
function finishBonus() {
  const b = bonusRun;
  isSuspense = true;
  startHeartbeat(1700, 500);
  suspenseTimer = setTimeout(() => {
    stopHeartbeat();
    isSuspense = false;
    bonusRun = null;
    updateAT();
    if (b.atWin) {
      setAura(b.aura, true);
      setTimeout(() => setAura(null), 1500);
      if (!b.debug) atCount++;
      updateUI();
      startAT();
    } else {
      setAura(null);
      showAtToast('BONUS END');
      maybeShowAtResult();
    }
  }, 2000);
}

/* ---------- ATリザルト ---------- */
const atResultEl = document.getElementById('at-result');
const atResultGain = document.getElementById('at-result-gain');
const arHintBar = document.getElementById('ar-hint-bar');
const arHintText = document.getElementById('ar-hint-text');
let atResultRAF = null;

/* 次回モードの抽選と、リザルトで見せる示唆 (示唆は一定確率でズレる) */
const MODES = [{ g: 0, mult: 1 }, { g: 30, mult: 2 }, { g: 40, mult: 4 }, { g: 50, mult: 8 }];
const HINT_LABELS = ['弱', '中', '強', '激アツ'];
function decideNextMode() {
  const m = weightedPick(MODE_WEIGHTS);
  modeGames = MODES[m].g;
  modeMult = MODES[m].mult;
  if (Math.random() < HINT_TRUE) return m;
  if (m === 0) return 1;
  if (m === 3) return 2;
  return Math.random() < 0.5 ? m - 1 : m + 1;
}

function maybeShowAtResult() {
  if (!atEnding || atGames > 0 || !atRun || isAtResult || bonusRun || isPushing) return;
  isAtResult = true;                       // 結果表示までレバーを止める
  const run = atRun;
  setTimeout(() => showAtResult(run), 900);
}

/* PEKA RUSH 開始から終了までの獲得枚数と、次回の当たりやすさ(示唆)を表示 */
function showAtResult(run) {
  isAtResult = true;
  const gain = run.gain !== undefined ? run.gain : diffCoins - run.startDiff;
  const hint = run.hint !== undefined ? run.hint : decideNextMode();
  document.getElementById('ar-games').textContent = `${run.games} G`;
  document.getElementById('ar-bells').textContent = `${run.bells} 回`;
  document.getElementById('ar-bonus').textContent = `${run.bonuses} 回`;
  arHintBar.dataset.lv = hint;
  [...arHintBar.children].forEach((el, i) => el.classList.toggle('on', i <= hint));
  arHintText.textContent = HINT_LABELS[hint];
  arHintText.dataset.lv = hint;
  atResultGain.className = 'at-result-gain ' + (gain >= 0 ? 'plus' : 'minus');
  atResultEl.classList.remove('show');
  void atResultEl.offsetWidth;
  atResultEl.classList.add('show');

  // 獲得枚数を 0 から高速カウントアップ
  const fmt = v => (v >= 0 ? '+' : '') + v;
  cancelAnimationFrame(atResultRAF);
  const t0 = performance.now();
  const ms = 1300;
  const frame = now => {
    const p = Math.min(1, (now - t0) / ms);
    atResultGain.textContent = fmt(Math.round(gain * (1 - Math.pow(1 - p, 3))));
    if (p < 1) {
      atResultRAF = requestAnimationFrame(frame);
    } else if (gain > 0) {
      playPayoutSound(gain >= 1000 ? 6 : gain >= 300 ? 4 : 2);
      playPayoutFanfare(gain >= 1500 ? 10 : gain >= 800 ? 8 : gain >= 300 ? 5 : 2);
      if (gain >= 800) { tripleFlash(); burstParticles('gold', 90); }
    }
  };
  atResultRAF = requestAnimationFrame(frame);
}

document.getElementById('at-result-close').addEventListener('click', () => {
  cancelAnimationFrame(atResultRAF);
  atResultEl.classList.remove('show');
  stopParticles();
  isAtResult = false;
  atRun = null;
  atEnding = false;
  updateAT();
});

function playReplayJingle() {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  [784, 988, 1175].forEach((f, i) => tone(f, t + i * 0.07, 0.18, 'triangle', 0.16));
}

/* ハズレ時: 9マスをランダムに埋めて表示 */
function showLoseReels() {
  bellBadge.classList.remove('show');
  renderReels(loseGrid(), null, '');
  alignDisplay.classList.remove('show-align');
  alignDisplay.classList.add('show-lose');
  gogoTextContainer.classList.add('opacity-0');
}
function hideLoseReels() {
  alignDisplay.classList.remove('show-lose');
  gogoTextContainer.classList.remove('opacity-0');
}

/* 1回目: 777 または BAR BAR BAR をリール風に大きく表示 */
function showSymbols() {
  alignStage = 1;
  initAudio(); // 音の再生準備を先に済ませる

  const tier = pendingBonusType === 'BIG' ? BIG_TIERS[pendingTierIndex] : null;

  // グレード順: 赤(150〜200) < 青(250〜300) < 白(350〜400)
  const winKey = pendingTierIndex <= 1 ? '7red' : pendingTierIndex <= 3 ? '7blue' : '7white';
  const glow = tier.grand ? 'sym-glow-gold' : '';
  renderReels(winGrid(winKey), [3, 4, 5], glow);
  alignDisplay.classList.remove('show-lose');

  alignDisplay.classList.add('show-align');
  gogoTextContainer.classList.add('opacity-0');

  // 揃った瞬間にファンファーレ
  playAlignChime();
  triggerFlash();

  // ボタンを NEXT に切替 (もう一度押すと枚数表示)
  alignBtn.textContent = 'NEXT';
}

/* 枚数の数字の大きさ: 枚数(レベル)が大きいほどデカく、桁数に合わせて画面幅いっぱいまで */
const PAY_BASE_PX = { 1: 92, 2: 104, 3: 116, 4: 128, 5: 140, 6: 152, 7: 164 };
function applyPayoutStyle(coins, level) {
  payoutNum.className = `payout-num pay-l${level}`;
  const avail = Math.max(200, mainEl.clientWidth - 24);
  const digits = String(coins).length;
  const fit = avail / (digits * 0.78 + 0.55);            // 桁数ぶんが横幅に収まる最大サイズ
  payoutNum.style.setProperty('--fs', Math.min(PAY_BASE_PX[level] || 100, fit) + 'px');
}

/* 枚数表示のアニメーションを最初から再生 */
function restartPayAnim() {
  payoutDisplay.classList.remove('show-pay');
  void payoutDisplay.offsetWidth;
  payoutDisplay.classList.add('show-pay');
}

/* 数字を from → to まで高速で増やす (だんだん減速。カチカチ音つき) */
function countUp(from, to, ms, onDone) {
  isCounting = true;
  cancelAnimationFrame(countRAF);
  const t0 = performance.now();
  let lastTick = 0;
  payoutValue.textContent = from;

  const frame = now => {
    const p = Math.min(1, (now - t0) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    payoutValue.textContent = Math.round(from + (to - from) * eased);
    if (now - lastTick > 45 && p < 1 && soundEnabled && audioCtx) {
      lastTick = now;
      tone(900 + 900 * p, audioCtx.currentTime, 0.04, 'square', 0.05);
    }
    if (p < 1) {
      countRAF = requestAnimationFrame(frame);
    } else {
      payoutValue.textContent = to;
      isCounting = false;
      countRAF = null;
      if (onDone) onDone();
    }
  };
  countRAF = requestAnimationFrame(frame);
}

/* 2回目(NEXT): 獲得するボーナス枚数をドドーンと派手に表示 (実際の獲得は、このあとのベルで少しずつ) */
function showPayout() {
  alignStage = 2;
  isBonusAligned = true;
  initAudio();

  const tier = BIG_TIERS[pendingTierIndex];
  const coins = tier.coins;
  if (!isDebugRun) {
    bigCount++;
    pendingPlan = makeBonusPlan(coins);
    bonusLog.push({ g: cumulativeGames, type: 'BIG', coins });
    recordPoint();
  }

  currentShownCoins = coins;
  fxOverlay.className = `fx-t${pendingTierIndex + 1}`;   // 枚数表示で背景が豪華に
  const level = payLevel(coins);
  payoutLabel.textContent = 'BIG BONUS';
  applyPayoutStyle(coins, level);

  // 図柄を消して枚数を表示 (アニメーションを最初から再生)
  alignDisplay.classList.remove('show-align');
  restartPayAnim();

  const rank = pendingTierIndex + 1;
  if (coins >= VVV_MIN_COINS) playGakoSound('vvv'); // 大きい枚数のときだけ枚数表示で vvv.mp3
  // 0 から高速カウントアップ → 数字が決まった瞬間にドドーン+ファンファーレ
  countUp(0, coins, 1100, () => {
    playPayoutSound(level);
    playPayoutFanfare(rank);
    if (tier.grand) {
      tripleFlash();
      burstParticles('gold', 90);
      shakeMain(800);
    } else {
      triggerFlash();
      shakeMain(350);
    }
  });

  // NEXTボタンを無効化し、レバーを「ボーナス開始」に
  alignBtn.disabled = true;
  alignBtn.className = ALIGN_BTN_DEFAULT;

  spinBtn.disabled = false;
  spinBtn.innerText = "ボーナス開始 (レバーON)";

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
    if (!isSuspense) return;
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

/* ランプ状態をリセットして通常状態に戻す */
function resetPekaState() {
  isPekared = false;
  isBonusAligned = false;
  pendingBonusType = null;
  pendingTierIndex = -1;
  pendingDisplayIndex = -1;
  pendingPlan = null;
  clearTimeout(suspenseTimer);
  isSuspense = false;
  stopHeartbeat();
  cancelAnimationFrame(countRAF);
  countRAF = null;
  isCounting = false;
  currentShownCoins = 0;
  isDebugRun = false;

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

  alignDisplay.classList.remove('show-align', 'show-lose');
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
  displayReg.textContent = atCount;

  displayProb.textContent = bigCount > 0 ? `1/${(cumulativeGames / bigCount).toFixed(1)}` : `1/0`;

  displayDiff.textContent = (diffCoins >= 0 ? `+${diffCoins}` : `${diffCoins}`);
  displayDiff.className = `digital-font font-bold text-sm ${diffCoins >= 0 ? 'text-green-400' : 'text-red-400'}`;
}

/* データリセット */
function resetData() {
  if (confirm("ゲームデータをリセットしますか？")) {
    totalGames = 0;
    cumulativeGames = 0;
    bigCount = 0;
    atCount = 0;
    diffCoins = 0;
    replayPending = false;
    atGames = 0;
    modeGames = 0;
    modeMult = 1;
    cherryGames = 0;
    updateCherry();
    atRun = null;
    atEnding = false;
    isAtResult = false;
    atResultEl.classList.remove('show');
    bonusRun = null;
    setAura(null);
    isPushing = false;
    pushOverlay.className = 'push-overlay';
    updateAT();
    gameHistory.length = 0;
    bonusLog.length = 0;
    resetPekaState();
    updateUI();
  }
}

// イベントリスナー
spinBtn.addEventListener('click', handleSpin);
// リール表示エリアをタップ = レバーON (ボタンが無効のときは何もしない)
gogoBox.addEventListener('click', () => { if (!spinBtn.disabled) handleSpin(); });
// 操作ガイド: 状態管理用ボタンの文言を、リール下の表示に反映
const tapHint = document.getElementById('tap-hint');
function syncTapHint() {
  tapHint.textContent = spinBtn.disabled ? spinBtn.innerText : `タップ: ${spinBtn.innerText}`;
  tapHint.classList.toggle('off', spinBtn.disabled);
}
new MutationObserver(syncTapHint).observe(spinBtn, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
syncTapHint();
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

// ==========================================
// 確率設定パネル
// ==========================================
const settingsModal = document.getElementById('settings-modal');
const settingsBody = document.getElementById('settings-body');
const displayRate = document.getElementById('display-rate');

const SETTING_ROWS = [
  { key: 'hitDenom', label: 'ボーナス当選確率 (1/N)', min: 1, max: 100000, step: 1, prefix: '1/' },
  { key: 'atEntryMin', label: 'AT突入率 ボーナス150枚', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'atEntryMax', label: 'AT突入率 ボーナス400枚', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'auraWhite', label: 'AT当選時にオーラ白のまま', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'bonusBellPay', label: 'ボーナス中のベル (枚/G)', min: 1, max: 400, step: 1, suffix: '' },
  { key: 'replay', label: 'リプレイ (ハズレのうち)', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'bellNormal', label: 'ベル揃い 通常時', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'bellAt', label: 'ベル揃い AT中', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'replayAt', label: 'リプレイ AT中', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'atHitMult', label: 'AT中のボーナス当選確率 (倍)', min: 0, max: 100, step: 0.01, suffix: '' },
  { key: 'atW50', label: 'AT比率: +50G (基本)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atW100', label: 'AT比率: +100G (稀)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atW200', label: 'AT比率: +200G (稀)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atW300', label: 'AT比率: +300G (ごく稀)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'bellStraight', label: '通常ベル比率: 直線 (6枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'bellDiagTL', label: '通常ベル比率: 斜め左上から (1枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'bellDiagBL', label: '通常ベル比率: 斜め左下から (15枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atBellStraight', label: 'AT中ベル比率: 直線 (6枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atBellDiagTL', label: 'AT中ベル比率: 斜め左上から (1枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atBellDiagBL', label: 'AT中ベル比率: 斜め左下から (15枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherry', label: 'チェリー (ハズレのうち)', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'cherryMult', label: 'チェリー後の当選確率 (倍)', min: 0, max: 100, step: 0.1, suffix: '' },
  { key: 'cherryG', label: 'チェリー後の期間 (G)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherryAt', label: 'チェリー AT中 (ハズレのうち)', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'cherryAtSuccess', label: 'AT中チェリーの上乗せ率', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'cherryW10', label: 'チェリー上乗せ比率: +10G', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherryW20', label: 'チェリー上乗せ比率: +20G', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherryW25', label: 'チェリー上乗せ比率: +25G', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherryW30', label: 'チェリー上乗せ比率: +30G', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherryCoins', label: 'チェリーの払い出し (枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW0', label: 'AT後の次回モード比率: 通常', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW1', label: '次回モード比率: 好調 (30G / 2倍)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW2', label: '次回モード比率: 絶好調 (40G / 4倍)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW3', label: '次回モード比率: 天国 (50G / 8倍)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'hintTrue', label: 'リザルト示唆の的中率', min: 0, max: 100, step: 0.1, suffix: '%' }
];

function buildSettingsForm(src = SETTINGS) {
  const rows = SETTING_ROWS.map(r => `
    <label class="set-row">
      <span class="set-label">${r.label}</span>
      <span class="set-field">${r.prefix || ''}<input type="number" data-key="${r.key}" min="${r.min}" max="${r.max}" step="${r.step}" value="${src[r.key]}">${r.suffix || ''}</span>
    </label>`).join('');
  const weights = TIER_LABELS.map((l, i) => `
    <label class="set-row">
      <span class="set-label">${l}枚</span>
      <span class="set-field"><input type="number" data-w="${i}" min="0" step="0.1" value="${src.weights[i]}"><span class="set-pct" data-pct="${i}"></span></span>
    </label>`).join('');
  settingsBody.innerHTML = `
    <div class="set-group">
      ${rows}
    </div>
    <div class="set-title">当選内訳 (比率。合計が100でなくても自動で換算)</div>
    <div class="set-group">
      ${weights}
      <div class="set-row set-total"><span class="set-label">合計</span><span class="set-field" id="set-total"></span></div>
    </div>`;
  settingsBody.querySelectorAll('input[data-w]').forEach(el => el.addEventListener('input', refreshWeightPct));
  refreshWeightPct();
}

function readWeightInputs() {
  return [...settingsBody.querySelectorAll('input[data-w]')].map(el => Math.max(0, parseFloat(el.value) || 0));
}

function refreshWeightPct() {
  const w = readWeightInputs();
  const total = w.reduce((x, y) => x + y, 0);
  w.forEach((v, i) => {
    settingsBody.querySelector(`[data-pct="${i}"]`).textContent = total > 0 ? `${(v / total * 100).toFixed(1)}%` : '-';
  });
  document.getElementById('set-total').textContent = total.toFixed(1);
}

function applySettingsForm() {
  const next = JSON.parse(JSON.stringify(SETTINGS));
  settingsBody.querySelectorAll('input[data-key]').forEach(el => {
    const v = parseFloat(el.value);
    if (Number.isFinite(v)) next[el.dataset.key] = Math.min(+el.max, Math.max(+el.min, v));
  });
  const w = readWeightInputs();
  if (w.reduce((x, y) => x + y, 0) > 0) next.weights = w;
  SETTINGS = next;
  saveSettings();
  applySettings();
  refreshRateLabel();
  closeModal(settingsModal);
}

function refreshRateLabel() {
  if (displayRate) displayRate.textContent = `1/${SETTINGS.hitDenom}`;
}

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

// ==========================================
// モーダル共通 / ボタン
// ==========================================
function openModal(m) { m.classList.add('open'); }
function closeModal(m) { m.classList.remove('open'); }

document.getElementById('settings-btn').addEventListener('click', () => { buildSettingsForm(); openModal(settingsModal); });
document.getElementById('settings-apply').addEventListener('click', applySettingsForm);
document.getElementById('settings-default').addEventListener('click', () => {
  buildSettingsForm(DEFAULT_SETTINGS);   // 入力欄だけ初期値に戻す (適用を押すまで反映されない)
});
document.getElementById('graph-btn').addEventListener('click', () => { openModal(graphModal); drawGraphs(); });
document.querySelectorAll('[data-close-modal]').forEach(el =>
  el.addEventListener('click', () => closeModal(el.closest('.modal'))));
document.querySelectorAll('.modal').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) closeModal(m); }));
window.addEventListener('resize', () => { if (graphModal.classList.contains('open')) drawGraphs(); });
refreshRateLabel();
