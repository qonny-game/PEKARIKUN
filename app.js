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
  bellAt: 40,          // AT中: ハズレのうちベルが揃う割合
  replayAt: 35,        // AT中: ハズレのうちリプレイになる割合
  atHitMult: 0.4,      // AT中のボーナス当選確率の倍率 (低いほど当選しにくい)
  atW50: 80,           // AT継続G数の比率: +50G (ほとんどこれ)
  atW100: 14,          // +100G (稀)
  atW200: 5,           // +200G (稀)
  atW300: 1,           // +300G (ごく稀)
  bellStraight: 60,    // 通常時のベル比率: 直線 (6枚)
  bellDiagTL: 25,      // 斜め 左上から (1枚)
  bellDiagBL: 15,      // 斜め 左下から (15枚)
  atBellStraight: 45,  // AT中のベル比率: 直線 (6枚)
  atBellDiagTL: 15,    // 斜め 左上から (1枚)
  atBellDiagBL: 40,    // 斜め 左下から (15枚)
  cherry: 3,           // 通常時: ハズレのうちチェリーが揃う割合 (左列に1個で成立)
  cherryMult: 2,       // チェリー後 (内部高確率) のボーナス当選確率の倍率
  cherryG: 15,         // チェリー後の内部高確率の期間 (G)
  cherryAt: 3.5,       // AT中: ハズレのうちチェリーが揃う割合
  cherryAtSuccess: 70, // AT中のチェリーでG数が上乗せされる割合 (外れもある)
  cherryW10: 50,       // 上乗せ量の比率: +10G
  cherryW20: 30,       // +20G
  cherryW25: 15,       // +25G
  cherryW30: 5,        // +30G
  cherryCoins: 2,      // チェリーの払い出し枚数
  melon: 2,            // 通常時: ハズレのうちスイカが成立する割合 (中リールを狙わないと揃わない)
  melonAt: 2.5,        // AT中: ハズレのうちスイカが成立する割合 (揃うとG数上乗せ確定)
  melonCoins: 5,       // スイカの払い出し枚数
  modeW0: 55,          // AT終了後の次回モード比率: 通常 (示唆: 弱)
  modeW1: 28,          // 好調 (30G / 当選率2倍)
  modeW2: 14,          // 絶好調 (40G / 4倍)
  modeW3: 3,           // 天国 (50G / 8倍)
  hintTrue: 70         // リザルト示唆が実際のモードと一致する割合
};
const APP_VERSION = '1.10.0';
const SETTINGS_KEY = 'pekari-settings-v4';   // v4: 機械割の調整 (95〜115%) に合わせて保存データを作り直し

// ==========================================
// 設定 1〜6 (高設定ほど出玉が良い) と 設定7 (デバッグ用: すぐ当たる)
// 設定7は画面にボタンが無く、設定ボタンを 6 5 6 6 4 5 6 の順に押したときだけ入る
// ==========================================
const LEVEL_VALUES = {
  // 機械割 (シミュレーション値): 設定1=約96% / 2=約99% / 3=約102% / 4=約105% / 5=約109% / 6=約114% (設定7はデバッグ用)
  //                   S1    S2    S3    S4    S5    S6    S7
  hitDenom:        [379,  366,  354,  346,  332,  321,    5],   // ボーナス当選確率 1/N (基本。チェリー後はさらに上がる)
  cherry:          [3.2,  3.2,  3.2,  3.2,  3.2,  3.2,   30],   // チェリー確率
  melon:           [2.2,  2.2,  2.2,  2.2,  2.2,  2.2,   20],   // スイカ確率
  atHitMult:       [0.40, 0.40, 0.40, 0.40, 0.40, 0.40,   3],   // AT中のボーナス(ゾーン)当選確率の倍率
  replay:          [13.2, 13.4, 13.6, 13.8, 14.0, 14.3,   14],
  atEntryMin:      [20,   21,   22,   23,   24,   25,   100],   // AT突入率 (150枚時)
  atEntryMax:      [76,   77,   79,   80,   82,   84,   100],   // AT突入率 (400枚時)
  atW50:           [76,   76,   76,   76,   76,   76,    25],
  atW100:          [15,   15,   15,   15,   15,   15,    25],
  atW200:          [7,    7,    7,    7,    7,    7,     25],
  atW300:          [2,    2,    2,    2,    2,    2,     25],
  cherryAtSuccess: [65,   65,   65,   65,   65,   65,   100],   // AT中のチェリーで上乗せが成立する割合
  modeW0:          [56,   55,   54,   52,   50,   48,     0],
  modeW1:          [29,   29,   29,   30,   30,   30,     0],
  modeW2:          [11,   12,   12,   13,   14,   15,     0],
  modeW3:          [4,    4,    5,    5,    6,    7,   100]
};
const LEVEL_TIER_WEIGHTS = [
  [34, 26, 20, 11, 6, 3], [32, 25, 21, 12, 7, 3.5], [30, 25, 21, 13, 7.5, 4],
  [28, 24, 22, 14, 8.5, 4.5], [26, 23, 22, 15, 9, 5], [24, 22, 22, 16, 10, 6], [0, 0, 0, 10, 30, 60]
];
const DEFAULT_LEVEL = 4;
const SECRET_SEQ = [6, 5, 6, 6, 4, 5, 6];
const DEFAULT_PROFILES = {};
for (let l = 1; l <= 7; l++) {
  const p = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  Object.keys(LEVEL_VALUES).forEach(k => { p[k] = LEVEL_VALUES[k][l - 1]; });
  p.weights = LEVEL_TIER_WEIGHTS[l - 1].slice();
  DEFAULT_PROFILES[l] = p;
}

function mergeProfile(st, raw) {
  Object.keys(DEFAULT_SETTINGS).forEach(k => {
    if (k === 'weights') {
      if (Array.isArray(raw.weights) && raw.weights.length === st.weights.length &&
          raw.weights.every(v => Number.isFinite(+v) && +v >= 0)) st.weights = raw.weights.map(Number);
    } else if (Number.isFinite(+raw[k])) {
      st[k] = +raw[k];
    }
  });
}
function loadSettings() {
  const out = { level: DEFAULT_LEVEL, prev: DEFAULT_LEVEL, random: false, profiles: {} };
  for (let l = 1; l <= 7; l++) out.profiles[l] = JSON.parse(JSON.stringify(DEFAULT_PROFILES[l]));
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (raw && typeof raw === 'object' && raw.profiles) {
      for (let l = 1; l <= 7; l++) if (raw.profiles[l]) mergeProfile(out.profiles[l], raw.profiles[l]);
      if (raw.level >= 1 && raw.level <= 6) out.level = out.prev = raw.level | 0;
      if (raw.random === true) { out.random = true; out.level = out.prev = 1 + Math.floor(Math.random() * 6); }   // ランダム: 起動のたびに引き直す
    }
  } catch (e) { /* 保存データが無い/読めない場合は初期値 */ }
  return out;
}
function saveSettings() {
  try {
    // 設定7は保存しない (次に開いたときは直前の設定1〜6に戻る)
    const level = SETTINGS.level === 7 ? SETTINGS.prev : SETTINGS.level;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ level, random: !!SETTINGS.random, profiles: SETTINGS.profiles }));
  } catch (e) { /* 保存できなくても動作は続ける */ }
}
function activeProfile() { return SETTINGS.profiles[SETTINGS.level]; }

let SETTINGS = loadSettings();
let HIT_RATE, TIER_RATES;
let AT_ENTRY_MIN, AT_ENTRY_MAX, AURA_WHITE, BONUS_BELL_PAY;
let CHERRY_AT_RATE, CHERRY_AT_SUCCESS, CHERRY_AT_WEIGHTS = [40, 30, 20, 10], CHERRY_RATE, CHERRY_MULT, CHERRY_G, CHERRY_COINS;
let BELL_NORMAL_RATE, BELL_AT_RATE, AT_HIT_MULT, AT_WEIGHTS = [80, 14, 5, 1];
let BELL_WEIGHTS = [60, 25, 15], AT_BELL_WEIGHTS = [30, 10, 60];
let MODE_WEIGHTS = [55, 28, 14, 3], HINT_TRUE;
let REPLAY_AT_RATE, REPLAY_RATE, MELON_RATE, MELON_AT_RATE, MELON_COINS;

function applySettings() {
  const st = activeProfile();
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
  MELON_RATE = clampP(st.melon);
  MELON_AT_RATE = clampP(st.melonAt);
  MELON_COINS = Math.max(0, Math.round(st.melonCoins));
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
let pendingZone = false;           // AT中の当選: ペカチャンスではなく上乗せ特化ゾーンへ
let pendingPlan = null;            // 枚数表示のあとに始まる「ボーナス消化」の計画
let bonusRun = null;               // ボーナス消化中の状態 {total, paid, games, played, atWin, level, promo, aura}
let currentShownCoins = 0;
let isCounting = false;            // 数字カウントアップ中
let countRAF = null;
let sinceEnd = null;               // ボーナス/AT終了からのゲーム数 (32G以内の当選で左右ペカ)
let pekaSpecial = null;            // 'early' | 'heaven': 左右ペカ演出
let pekaTimers = [];
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

/* ---------- ペカ演出 (いろいろ) ----------
   normal: 通常点灯 / late: 後ペカ / gakkun: ガックン点灯 / hanabi: 花火 /
   double: Wペカ / rainbow: 虹ペカ / freeze: フリーズ風 */
const PEKA_FX = [['normal', 38], ['late', 16], ['gakkun', 14], ['hanabi', 12], ['double', 9], ['rainbow', 6], ['freeze', 5]];
function pickPekaFx(tierN) {
  const boost = 1 + tierN * 0.18;   // 大きい枚数ほどプレミア系が出やすい
  const w = PEKA_FX.map(([id, x]) => (id === 'rainbow' || id === 'freeze' || id === 'double') ? x * boost : x);
  return PEKA_FX[weightedPick(w)][0];
}
function pekaLater(fn, ms) { pekaTimers.push(setTimeout(fn, ms)); }
function clearPekaTimers() { pekaTimers.forEach(clearTimeout); pekaTimers = []; }

/* 左右のPEKAランプ (沖スロ風): ボーナス終了32G以内の当選 / 天国中の当選 */
const sideL = document.getElementById('side-l');
const sideR = document.getElementById('side-r');
function sideLampShow(kind) {
  [sideL, sideR].forEach(el => { el.classList.remove('on', 'heaven'); void el.offsetWidth; el.classList.add('on'); if (kind === 'heaven') el.classList.add('heaven'); });
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    const notes = kind === 'heaven' ? [523, 659, 784, 1047, 1319, 1568] : [784, 988, 1175, 1568];
    notes.forEach((f, i) => tone(f, t + i * 0.07, 0.22, 'square', 0.08));
  }
}
function sideLampOff() { [sideL, sideR].forEach(el => el && el.classList.remove('on', 'heaven')); }

/* ランプ点灯そのもの */
function lightLamp(extra) {
  const tier = BIG_TIERS[pendingDisplayIndex];
  const n = pendingDisplayIndex + 1;
  gogoBox.className = `${GOGO_BASE} peka tier-${n}${extra ? ' ' + extra : ''}`;
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
}
/* 次のレバーONで、同じ色の7を狙って揃える */
function armPekari() {
  reelLocked = false;
  spinBtn.disabled = false;
  spinBtn.innerText = '7を揃える (レバーON)';
}

/* ペカリ発生処理 */
function triggerPekari(forceFx) {
  isPekared = true;
  isBonusAligned = false;
  const n = pendingDisplayIndex + 1;
  const fx = forceFx || pickPekaFx(n);
  if (pekaSpecial) { sideLampShow(pekaSpecial); pekaSpecial = null; }
  reelLocked = true;           // 演出が終わるまでレバーは効かない
  clearPekaTimers();

  if (fx === 'late') {
    // 後ペカ: 止まってしばらく経ってから光る
    pekaLater(() => { lightLamp(); armPekari(); }, 1500);
  } else if (fx === 'gakkun') {
    // ガックン: ランプが点いたり消えたりして、最後にしっかり点灯
    gogoBox.className = `${GOGO_BASE} fx-gakkun`;
    playTick(0);
    pekaLater(() => playTick(1), 350);
    pekaLater(() => { lightLamp(); armPekari(); }, 950);
  } else if (fx === 'hanabi') {
    // 花火: 点灯と同時に連続で打ち上がる
    lightLamp();
    burstParticles('gold', 50);
    pekaLater(() => { burstParticles('gold', 50); triggerFlash(); }, 380);
    pekaLater(() => { burstParticles('mega', 70); triggerFlash(); }, 760);
    pekaLater(armPekari, 800);
  } else if (fx === 'double') {
    // Wペカ: 点灯 → 消灯 → もう一度点灯
    lightLamp();
    pekaLater(() => { gogoBox.className = `${GOGO_BASE} fx-dark`; fxOverlay.className = ''; }, 650);
    pekaLater(() => { lightLamp(); tripleFlash(); armPekari(); }, 1150);
  } else if (fx === 'rainbow') {
    // 虹ペカ
    lightLamp('peka-rainbow');
    playAuraUp(6);
    tripleFlash();
    pekaLater(armPekari, 500);
  } else if (fx === 'freeze') {
    // フリーズ風: 暗転 → 鼓動 → ドン! と点灯
    startTension('FREEZE');
    pekaLater(() => {
      stopTension();
      lightLamp('peka-rainbow');
      tripleFlash();
      shakeMain(600);
      burstParticles('mega', 110);
      playPayoutSound(5);
      armPekari();
    }, 2000);
  } else {
    lightLamp();
    armPekari();
  }
}

/* ---------- フリーズ → PEKA! PEKA! MOUNTAIN! 直撃 ---------- */
const FREEZE_RATE = 1 / 1500;   // 通常時1ゲームあたりのフリーズ確率
function freezeToZone(debug) {
  isSuspense = true;                       // フリーズ中はレバーが効かない
  startTension('FREEZE');
  suspenseTimer = setTimeout(() => {
    stopTension();
    isSuspense = false;
    tripleFlash();
    shakeMain(800);
    burstParticles('mega', 140);
    startParticles('gold');
    playGakoSound('gako');
    playPayoutSound(6);
    playPayoutFanfare(10);
    setTimeout(stopParticles, 1800);
    const idx = pickTierIndex();
    const coins = BIG_TIERS[idx].coins;
    if (!debug) {
      bigCount++;
      bonusLog.push({ g: cumulativeGames, type: 'BIG', coins });
      totalGames = 0;
      modeGames = 0;
      modeMult = 1;
      recordPoint();
      updateUI();
    }
    beginBonus(makeBonusPlan(coins, { zone: true, atWin: false, level: 0, debug: !!debug }));
  }, 2600);
}

/* ---------- 緊張演出 (ボーナス最終ゲームのジャッジメント / AT最終ゲーム) ---------- */
const judgeEl = document.getElementById('judge-overlay');
const judgeText = document.getElementById('judge-text');
function startTension(label) {
  judgeEl.classList.add('tense');
  judgeText.textContent = label;
  judgeText.classList.remove('show');
  void judgeText.offsetWidth;
  judgeText.classList.add('show');
  startHeartbeat(5000, 150);
}
function stopTension() {
  judgeEl.classList.remove('tense');
  judgeText.classList.remove('show');
  stopHeartbeat();
}
function playTick(level) {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  tone(660 + level * 90, t, 0.12, 'square', 0.1);
  tone(990 + level * 90, t + 0.1, 0.12, 'square', 0.1);
}
/* ATの残りG数が少ないとき */
function atTension(n) {
  if (n === 0) { startTension('FINAL'); }
  else if (n <= 3) { showAtToast(`LAST ${n}G`); playTick(4 - n); }
}

/* ボーナス揃い (7が揃った) */
function onBonusAligned() {
  alignStage = 1;
  const tier = BIG_TIERS[pendingTierIndex];
  markWin([3, 4, 5], tier.grand ? 'sym-glow-gold' : '');
  alignDisplay.classList.remove('show-lose');
  alignDisplay.classList.add('show-align');
  playAlignChime();
  triggerFlash();
  spinBtn.disabled = false;
  spinBtn.innerText = 'NEXT';
}

/* ペカっている間のレバーON: 7を狙って揃える (取りこぼしたら、もう一度) */
function attemptBonus() {
  playClickSound();
  setLedWin(0);
  if (!isDebugRun) {
    diffCoins -= 3;
    cumulativeGames++;
    recordPoint();
    updateUI();
  }
  startReels({ kind: 'seven', auto: true }, res => {
    if (res.success) {
      onBonusAligned();
    } else {
      showAtToast('MISS');
      reelLocked = true;
      setTimeout(() => {
        reelLocked = false;
        hideLoseReels();
        spinBtn.innerText = '7を揃える (レバーON)';
      }, 800);
    }
  });
}

/* レバーON 処理 */
function handleSpin() {
  // PUSHボタン待ちのときは、レバーでもPUSHできる
  if (isPushing) {
    if (pushOverlay.classList.contains('waiting')) pushBtn.click();
    return;
  }
  // リール回転中は、止まっていないリールを左から止める
  if (isReelSpinning) { stopNextReel(); return; }
  if (isCooldown || isCounting || isSuspense || isRushing || isAtResult || reelLocked) return;

  // 枚数表示のあとのレバーON: ボーナス消化(ベルでの枚数獲得)が始まる
  if (isBonusAligned) {
    const wasDebug = isDebugRun;
    const plan = pendingPlan;
    resetPekaState();
    if (!wasDebug && plan) beginBonus(plan);
  }

  // ペカっている間: 7を揃える (揃ったらNEXTで枚数表示)
  if (isPekared && !isBonusAligned) {
    if (alignStage === 1) { showPayout(); return; }
    attemptBonus();
    return;
  }

  // ボーナス消化中: 毎ゲームベルが揃って枚数を獲得する
  if (bonusRun) {
    bonusGame();
    return;
  }

  playClickSound();
  setLedWin(0);

  totalGames++;
  cumulativeGames++;
  if (sinceEnd !== null) sinceEnd++;
  const inAT = atGames > 0;
  const inMode = !inAT && modeGames > 0;
  if (inAT) {
    atGames--;
    if (atRun) atRun.games++;
    if (atGames === 0) atEnding = true;   // リザルトはこのゲームの結果が出たあとに表示
    updateAT();
    atTension(atGames);
  } else if (inMode) {
    modeGames--;
  }
  if (replayPending) {
    replayPending = false;       // リプレイ: このゲームは投入なし
  } else {
    diffCoins -= 3;              // 3枚消費
  }
  recordPoint();
  updateUI();

  // 通常時のフリーズ: そのまま PEKA! PEKA! MOUNTAIN! へ直撃
  if (!inAT && Math.random() < FREEZE_RATE) { freezeToZone(); return; }

  const inCherry = cherryGames > 0;
  if (inCherry) { cherryGames--; updateCherry(); }
  // AT中は当選しにくい / 次回モード中は当選しやすい / チェリー後は当選しやすい
  const hitMult = (inAT ? AT_HIT_MULT : inMode ? modeMult : 1) * (inCherry ? CHERRY_MULT : 1);
  const isHit = Math.random() < Math.min(1, HIT_RATE * hitMult);

  if (isHit) {
    // 天国中の当選 / ボーナス終了後32G以内の当選: 左右のPEKAランプ
    pekaSpecial = (inMode && modeMult >= 8) ? 'heaven' : (sinceEnd !== null && sinceEnd <= 32) ? 'early' : null;
    sinceEnd = null;
    pendingZone = inAT;
    pendingBonusType = 'BIG';
    pendingDisplayIndex = pickTierIndex();
    pendingTierIndex = pendingDisplayIndex;
    pendingPlan = null;
    replayPending = false;
    if (inAT && atRun) atRun.bonuses++;
    cherryGames = 0;
    updateCherry();
    // 今回はハズレ目で止まり、止まったあとにGOGO!ランプが光る
    runRole('lose', () => {
      stopTension();
      totalGames = 0;
      updateUI();
      reelLocked = true;
      setTimeout(() => {
        reelLocked = false;
        hideLoseReels();
        triggerPekari();
      }, 600);
    });
  } else if (Math.random() < (inAT ? BELL_AT_RATE : BELL_NORMAL_RATE)) {
    // ベル揃い: 直線 / 斜め左上から1枚 / 斜め左下から15枚 (AT中は左下が出やすい)
    if (inAT && atRun) atRun.bells++;
    const type = pickBellType(inAT);
    runRole('bell' + type, () => {
      stopTension();
      diffCoins += BELL_TYPES[type].coins;
      setLedWin(BELL_TYPES[type].coins);
      recordPoint();
      showBellResult(BELL_TYPES[type].coins, inAT);
      updateUI();
      maybeShowAtResult();
    });
  } else if (Math.random() < (inAT ? MELON_AT_RATE : MELON_RATE)) {
    // スイカ: 中リールを狙って中段に揃える。取りこぼしたら何も起きない
    runRole('melon', res => {
      stopTension();
      if (res.success) {
        cherryEffects(inAT, true, MELON_COINS);
        showRoleBadge('MELON', MELON_COINS, MELON_NOTES);
      } else {
        missEffect();
      }
      updateUI();
      maybeShowAtResult();
    }, inAT ? naviFor('purple') : null);     // AT中のスイカ(上乗せ確定): 紫の押し順ナビ
  } else if (Math.random() < (inAT ? CHERRY_AT_RATE : CHERRY_RATE)) {
    // チェリー: 左列に1個あるだけで成立。通常時は30G間ボーナス高確率 (内部) / AT中はPUSHでG数上乗せ
    runRole('cherry', res => {
      stopTension();
      if (res.success) {
        cherryEffects(inAT, false, CHERRY_COINS);
        showRoleBadge('CHERRY', CHERRY_COINS, CHERRY_NOTES);
      } else {
        missEffect();
      }
      updateUI();
      maybeShowAtResult();
    }, inAT ? naviFor('red') : null);        // AT中のチェリー: 赤の押し順ナビ
  } else if (Math.random() < (inAT ? REPLAY_AT_RATE : REPLAY_RATE)) {
    // リプレイ: 図柄が揃って、次のゲームは投入枚数なし
    replayPending = true;
    runRole('replay', () => {
      stopTension();
      spinBtn.innerText = 'リプレイ (レバーON)';
      playReplayJingle();
      updateUI();
      maybeShowAtResult();
    });
  } else {
    runRole('lose', () => {
      stopTension();
      updateUI();
      maybeShowAtResult();
    });
  }
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

/* ---------- リール (3行3列) ---------- */
const REEL_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const EMOJI = { bell: '🔔', cherry: '🍒', melon: '🍉' };

function symbolHTML(key, glow) {
  if (key === 'replay') return '<div class="sym-replay">REPLAY</div>';
  if (key === 'bar') return '<div class="sym-bar">BAR</div>';
  if (EMOJI[key]) return `<div class="sym-emoji">${EMOJI[key]}</div>`;
  // 画像が無い場合は文字の7で代用
  return `<img class="sym-img ${glow || ''}" src="${key}.png" alt="7" onerror="if(this.parentNode)this.outerHTML='<div class=&quot;sym-seven&quot;>7</div>'">`;
}
const lineOf = (g, l) => g[l[0]] === g[l[1]] && g[l[1]] === g[l[2]];

/* ---------- リール配列 (各21コマ) ----------
   回転は下向き。windowOf(c, t) = [上段, 中段, 下段] = [t+1, t, t-1] 番目の図柄。
   7は各色1個ずつ。第1リールのBARの上下は必ずチェリーとスイカ。 */
const STRIP_LEN = 21;
const STRIPS = [
  ['7red', 'replay', 'bell', 'cherry', 'bar', 'melon', 'replay', 'bell', '7blue', 'replay', 'bell', 'melon', 'cherry', 'replay', 'bell', '7white', 'replay', 'bell', 'melon', 'replay', 'bell'],
  ['replay', 'bell', '7blue', 'replay', 'melon', 'bell', 'bar', 'replay', 'cherry', 'bell', '7white', 'replay', 'bell', 'melon', 'replay', '7red', 'bell', 'replay', 'cherry', 'bell', 'replay'],
  ['bell', '7white', 'replay', 'melon', 'bell', 'replay', 'bar', 'bell', 'melon', 'replay', '7red', 'bell', 'melon', 'replay', 'cherry', 'bell', 'melon', 'replay', '7blue', 'bell', 'replay']
];
const SEVENS = ['7red', '7blue', '7white'];
const isSeven = k => SEVENS.includes(k);
const mod = i => ((i % STRIP_LEN) + STRIP_LEN) % STRIP_LEN;
const stripSym = (c, i) => STRIPS[c][mod(i)];
const windowOf = (c, t) => [stripSym(c, t + 1), stripSym(c, t), stripSym(c, t - 1)];
function gridOf(ts) {
  const w = ts.map((t, c) => windowOf(c, t));
  return [w[0][0], w[1][0], w[2][0], w[0][1], w[1][1], w[2][1], w[0][2], w[1][2], w[2][2]];
}
function alignedLines(g) {
  const out = [];
  REEL_LINES.forEach((l, i) => { if (lineOf(g, l)) out.push({ i, sym: g[l[0]] }); });
  return out;
}
const leftCherries = g => [0, 3, 6].filter(i => g[i] === 'cherry').length;

/* 役ごとに、成立する停止位置の組み合わせ (3リール分の中段位置) を全部数えておく。
   ハズレ・ベル・リプレイ・チェリーは、必ずこの中から選ぶ (配列どおりの図柄で止まる) */
const ROLE_COMBOS = { lose: [], replay: [], cherry: [], bell0: [], bell1: [], bell2: [] };
(function buildCombos() {
  for (let a = 0; a < STRIP_LEN; a++) for (let b = 0; b < STRIP_LEN; b++) for (let c = 0; c < STRIP_LEN; c++) {
    const ts = [a, b, c];
    const g = gridOf(ts);
    const L = alignedLines(g);
    const lc = leftCherries(g);
    if (L.length === 0) {
      if (lc === 0) ROLE_COMBOS.lose.push(ts);
      else if (lc === 1) ROLE_COMBOS.cherry.push(ts);
    } else if (L.length === 1 && lc === 0) {
      const { i, sym } = L[0];
      if (sym === 'replay') ROLE_COMBOS.replay.push(ts);
      else if (sym === 'bell') {
        if (i <= 2) ROLE_COMBOS.bell0.push(ts);
        else if (i === 6) ROLE_COMBOS.bell1.push(ts);
        else if (i === 7) ROLE_COMBOS.bell2.push(ts);
      }
    }
  }
})();
const pickCombo = kind => { const l = ROLE_COMBOS[kind]; return l[Math.floor(Math.random() * l.length)]; };

/* スイカ: 中段に揃う。第1・第3リールは自動で揃うが、中リールは自分で狙わないと揃わない */
function pickMelonPlan() {
  const idxs = c => STRIPS[c].map((k, i) => (k === 'melon' ? i : -1)).filter(i => i >= 0);
  const opts = [];
  idxs(0).forEach(t0 => idxs(2).forEach(t2 => {
    const ok = idxs(1).every(t1 => {
      const g = gridOf([t0, t1, t2]);
      const L = alignedLines(g);
      return leftCherries(g) === 0 && L.length === 1 && L[0].i === 1 && L[0].sym === 'melon';
    });
    if (ok) opts.push([t0, t2]);
  }));
  const o = opts[Math.floor(Math.random() * opts.length)];
  return { kind: 'melon', t0: o[0], t2: o[1] };
}
function planFor(kind) {
  if (kind === 'cherry') return { kind: 'cherry', ts: pickCombo('cherry') };
  return kind === 'melon' ? pickMelonPlan() : { kind: 'fixed', ts: pickCombo(kind) };
}
function winIdxOf(kind, g) {
  if (kind === 'cherry') { const i = [0, 3, 6].find(k => g[k] === 'cherry'); return i === undefined ? null : [i]; }
  const L = alignedLines(g);
  return L.length ? REEL_LINES[L[0].i] : null;
}

/* winIdx: 揃ったマスの番号の配列 (null ならハズレ表示) */
function renderReels(grid, winIdx, glow) {
  reelsEl.innerHTML = grid.map((key, i) => {
    const isWin = !!winIdx && winIdx.includes(i);
    const cls = winIdx ? (isWin ? 'win' : 'dim') : '';
    return `<div class="reel ${cls}" style="--i:${i}">${symbolHTML(key, isWin ? glow : '')}</div>`;
  }).join('');
  drawPayline(winIdx);
}

/* ---------- リール回転: レバーONで回り、自分で3つ止める ---------- */
const OPT_KEY = 'pekari-opt-v1';
let AUTO_STOP = false;   // 自動停止 (目押しなし。7もスイカも必ず揃う)
try { AUTO_STOP = !!JSON.parse(localStorage.getItem(OPT_KEY) || '{}').autoStop; } catch (e) { /* 初期値 */ }
function saveOpt() { try { localStorage.setItem(OPT_KEY, JSON.stringify({ autoStop: AUTO_STOP })); } catch (e) { /* 無視 */ } }

const SPIN_SPEED = 18;    // 1秒に流れる図柄の数
const SLIP_MAX = 4;       // 目押し: 狙った図柄が中段の4コマ手前までなら引き込める
const CELL_H = 58;
let reelSpin = null;
let isReelSpinning = false;
let reelLocked = false;   // 停止直後の誤タップ防止

function reelsPrepareDOM() {
  reelsEl.innerHTML = Array.from({ length: 9 }, (_, i) => `<div class="reel" style="--i:${i}"></div>`).join('');
}
const colSym = (col, idx) => (col.ov[idx] !== undefined ? col.ov[idx] : stripSym(col.c, idx));

function startReels(plan, onDone) {
  if (!naviOrder) delete spinBtn.dataset.navi;
  reelsPrepareDOM();
  bellBadge.classList.remove('show');
  alignDisplay.classList.remove('show-align');
  alignDisplay.classList.add('show-lose');
  gogoTextContainer.classList.add('opacity-0');
  const cols = [0, 1, 2].map(c => {
    const el = document.createElement('div');
    el.className = 'reel-ov';
    el.style.left = `${c * 66}px`;
    el.innerHTML = '<div class="reel"></div><div class="reel"></div><div class="reel"></div><div class="reel"></div>';
    reelsEl.appendChild(el);
    return { c, el, cells: [...el.children], pos: Math.random() * STRIP_LEN, state: 'spin', ov: {}, T: 0, t: 0, final: null, shown: [null, null, null, null] };
  });
  reelSpin = { plan, cols, onDone, last: performance.now(), raf: 0, color: null, timers: [], order: [] };
  isReelSpinning = true;
  spinBtn.disabled = false;
  spinBtn.innerText = spinBtn.dataset.navi ? `ストップ ${spinBtn.dataset.navi}` : 'ストップ';
  cols.forEach(drawOverlay);
  reelSpin.raf = requestAnimationFrame(reelFrame);
  if (AUTO_STOP || plan.auto) [0, 1, 2].forEach(c => reelSpin.timers.push(setTimeout(() => stopCol(c, true), 380 + c * 260)));
}

function drawOverlay(col) {
  const mid = Math.floor(col.pos);
  const f = col.pos - mid;
  for (let j = 0; j < 4; j++) {
    const k = 2 - j;                       // 上のはみ出し(2) / 上段(1) / 中段(0) / 下段(-1)
    const idx = mid + k;
    if (col.shown[j] !== idx) {
      col.cells[j].innerHTML = symbolHTML(colSym(col, idx), '');
      col.shown[j] = idx;
    }
    col.cells[j].style.transform = `translateY(${(1 - k + f) * CELL_H}px)`;
  }
}

function reelFrame(now) {
  const rs = reelSpin;
  if (!rs) return;
  const dt = Math.min(0.05, (now - rs.last) / 1000);
  rs.last = now;
  rs.cols.forEach(col => {
    if (col.state === 'landed') return;
    col.pos += SPIN_SPEED * dt;
    if (col.state === 'slip' && col.pos >= col.T) { landCol(col); return; }
    drawOverlay(col);
  });
  if (rs.cols.every(col => col.state === 'landed')) { finishReels(); return; }
  rs.raf = requestAnimationFrame(reelFrame);
}

function landCol(col) {
  col.pos = col.T;
  col.state = 'landed';
  col.final = [colSym(col, col.T + 1), colSym(col, col.T), colSym(col, col.T - 1)];
  col.el.remove();
  const cells = reelsEl.querySelectorAll(':scope > .reel');
  col.final.forEach((k, r) => { cells[r * 3 + col.c].innerHTML = symbolHTML(k, ''); });
  playStopSound();
}

/* c番目のリールを止める。引き込める範囲(4コマ)で、役に合う位置を選ぶ */
function stopCol(c, auto) {
  const rs = reelSpin;
  if (!rs) return;
  if (rs.plan.auto) auto = true;     // ボーナスの7揃えは自動で揃う
  // 押し順ナビ付きのチェリー/スイカ: ナビ通りに止めれば取りこぼさない
  if (rs.plan.navi) {
    if (rs.naviOk === undefined) rs.naviOk = true;
    if (rs.plan.navi[rs.order.length] !== c) rs.naviOk = false;
    if (rs.naviOk) auto = true;
  }
  const col = rs.cols[c];
  if (!col || col.state !== 'spin') return;
  const s = Math.round(col.pos);
  const cands = [0, 1, 2, 3, 4].map(d => s + d);
  const p = rs.plan;
  let T = null, t = 0, tele = false;
  if (p.kind === 'fixed') {
    tele = true; t = p.ts[c];
  } else if (p.kind === 'melon') {
    if (c === 0) { tele = true; t = p.t0; }
    else if (c === 2) { tele = true; t = p.t2; }
    else {
      const a = cands.find(x => stripSym(1, x) === 'melon');
      if (a !== undefined) { T = a; t = mod(a); }
      else if (auto) { tele = true; t = STRIPS[1].indexOf('melon'); }
      else {
        const ok = cands.filter(x => alignedLines(gridOf([p.t0, mod(x), p.t2])).length === 0);
        T = (ok.length ? ok : cands)[0]; t = mod(T);
      }
    }
  } else if (p.kind === 'cherry') {   // チェリー: 左リールで狙う (取りこぼしあり)
    if (auto) { tele = true; t = p.ts[c]; }
    else if (c === 0) {
      const a = cands.find(x => windowOf(0, x).includes('cherry'));
      if (a !== undefined) { T = a; t = mod(a); }
      else {
        const ok = cands.filter(x => !windowOf(0, x).includes('cherry'));
        T = (ok.length ? ok : cands)[0]; t = mod(T);
      }
    } else {
      let pool = cands;
      const others = [0, 1, 2].filter(i => i !== c);
      if (others.every(i => rs.cols[i].state !== 'spin')) {
        const good = pool.filter(x => alignedLines(gridOf([0, 1, 2].map(i => (i === c ? mod(x) : rs.cols[i].t)))).length === 0);
        if (good.length) pool = good;
      }
      T = pool[0]; t = mod(T);
    }
  } else {   // seven: 同じ色の7を3つ揃える
    const want = rs.color;
    const a = cands.find(x => { const k = stripSym(c, x); return isSeven(k) && (!want || k === want); });
    if (a !== undefined) {
      T = a; t = mod(a);
      if (!rs.color) rs.color = stripSym(c, a);
    } else if (auto) {
      const color = want || SEVENS[Math.floor(Math.random() * 3)];
      tele = true; t = STRIPS[c].indexOf(color); rs.color = color;
    } else {
      let pool = cands.filter(x => c !== 0 || !windowOf(0, x).includes('cherry'));
      if (!pool.length) pool = cands;
      const others = [0, 1, 2].filter(i => i !== c);
      if (others.every(i => rs.cols[i].state !== 'spin')) {
        const good = pool.filter(x => alignedLines(gridOf([0, 1, 2].map(i => (i === c ? mod(x) : rs.cols[i].t)))).length === 0);
        if (good.length) pool = good;
      }
      T = pool[0]; t = mod(T);
    }
  }
  if (tele) {
    // 配列どおりの図柄(3コマ)が、4コマ先に流れてきて止まる
    T = Math.floor(col.pos) + SLIP_MAX;
    const w = windowOf(c, t);
    col.ov = { [T + 1]: w[0], [T]: w[1], [T - 1]: w[2] };
    col.shown = [null, null, null, null];
  }
  col.T = T; col.t = t; col.state = 'slip';
  rs.order.push(c);
  refreshNavi();
}

/* レバー/タップで、止まっていないリールを左から順に止める */
function stopNextReel() {
  if (!reelSpin) return;
  // 押し順ナビ中は、タップでもナビ通りの順に止まる
  if (naviOrder) {
    const nc = naviOrder.find(x => reelSpin.cols[x].state === 'spin');
    if (nc !== undefined) { stopCol(nc, false); return; }
  }
  const col = reelSpin.cols.find(x => x.state === 'spin');
  if (col) stopCol(col.c, false);
}
function stopByPointer(e) {
  const rs = reelSpin;
  if (!rs) return;
  const r = reelsEl.getBoundingClientRect();
  const c = Math.min(2, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 3)));
  if (rs.cols[c].state === 'spin') stopCol(c, false); else stopNextReel();
}

function finishReels() {
  const rs = reelSpin;
  reelSpin = null;
  isReelSpinning = false;
  rs.timers.forEach(clearTimeout);
  const f = rs.cols.map(col => col.final);
  const grid = [f[0][0], f[1][0], f[2][0], f[0][1], f[1][1], f[2][1], f[0][2], f[1][2], f[2][2]];
  let success = false;
  if (rs.plan.kind === 'seven') success = isSeven(f[0][1]) && f[1][1] === f[0][1] && f[2][1] === f[0][1];
  else if (rs.plan.kind === 'cherry') success = f[0].includes('cherry');
  else if (rs.plan.kind === 'melon') success = f[0][1] === 'melon' && f[1][1] === 'melon' && f[2][1] === 'melon';
  spinBtn.innerText = 'レバーON';
  reelLocked = true;
  setTimeout(() => { reelLocked = false; }, 300);
  setTimeout(() => rs.onDone({ grid, success, order: rs.order }), 220);
}

function cancelReels() {
  if (reelSpin) { cancelAnimationFrame(reelSpin.raf); reelSpin.timers.forEach(clearTimeout); }
  reelSpin = null;
  isReelSpinning = false;
  reelLocked = false;
}

/* 取りこぼし演出: 暗転 + 下降音 + 「取りこぼし」 */
function missEffect() {
  showAtToast('取りこぼし');
  atToast.classList.add('miss');
  cabinetEl.classList.remove('omen-miss');
  void cabinetEl.offsetWidth;
  cabinetEl.classList.add('omen-miss');
  pekaLater(() => cabinetEl.classList.remove('omen-miss'), 900);
  if (soundEnabled) {
    initAudio();
    const t0 = audioCtx.currentTime;
    [392, 330, 262, 196].forEach((f, i) => tone(f, t0 + i * 0.09, 0.22, 'sawtooth', 0.08));
  }
}

/* チェリー/スイカ成立時: リール回転の前に、筐体まわりのランプが光って予告する */
const cabinetEl = document.querySelector('.cabinet');
function omenOff() {
  if (cabinetEl) cabinetEl.classList.remove('omen', 'omen-melon', 'omen-cherry', 'omen-miss');
  sideLampOff();
}
const FAKE_OMEN_RATE = 0.07;   // ハズレ時のフェイク予告 (外れても予告だけ出ることがある)
function omenThen(kind, go) {
  let shown = kind;
  if (kind === 'lose' && Math.random() < FAKE_OMEN_RATE) shown = Math.random() < 0.7 ? 'cherry' : 'melon';
  if (shown !== 'melon' && shown !== 'cherry') { go(); return; }
  const melon = shown === 'melon';
  reelLocked = true;                       // 予告の間はレバー/タップを受けない
  cabinetEl.classList.remove('omen', 'omen-melon', 'omen-cherry');
  void cabinetEl.offsetWidth;
  cabinetEl.classList.add('omen', melon ? 'omen-melon' : 'omen-cherry');
  sideLampShow(melon ? 'heaven' : 'early');
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    const notes = melon ? [392, 494, 587, 784, 988, 1175, 1568] : [880, 1109, 1319];
    notes.forEach((f, i) => tone(f, t + 0.08 + i * (melon ? 0.16 : 0.2), 0.2, 'triangle', 0.1));
    if (melon) tone(98, t, 1.2, 'sine', 0.18);
  }
  pekaLater(() => { reelLocked = false; go(); }, melon ? 1500 : 1000);   // ランプはリールが止まるまで点灯したまま
}

/* 役の抽選結果を持って回転開始。止まったら done(結果) */
function runRole(kind, done, navi) {
  omenThen(kind, () => {
    const plan = planFor(kind);
    if (navi) { plan.navi = navi.order; showNavi(navi.order, navi.style); }
    startReels(plan, res => {
      omenOff();
      if (navi) hideNavi();
      markWin(winIdxOf(kind, res.grid), '');
      done(res);
    });
  });
}
const naviFor = style => ({ order: [0, 1, 2].sort(() => Math.random() - 0.5), style });

/* 揃ったマスを光らせる / ほかを暗くする */
function markWin(winIdx, glow) {
  reelsEl.querySelectorAll(':scope > .reel').forEach((el, i) => {
    const w = !!winIdx && winIdx.includes(i);
    el.classList.toggle('win', w);
    el.classList.toggle('dim', !!winIdx && !w);
    const img = el.querySelector('.sym-img');
    if (img && glow) img.classList.toggle(glow, w);
  });
  drawPayline(winIdx);
}
/* 揃ったラインを光る線で示す (チェリーは1コマなので線なし) */
function drawPayline(winIdx) {
  const old = reelsEl.querySelector(':scope > .payline');
  if (old) old.remove();
  if (!winIdx || winIdx.length < 3) return;
  const c = i => [(i % 3) * 66 + 33, Math.floor(i / 3) * 58 + 29];
  const [x1, y1] = c(winIdx[0]);
  const [x2, y2] = c(winIdx[winIdx.length - 1]);
  const dx = (x2 - x1) * 0.28, dy = (y2 - y1) * 0.28;   // 両端を少し延ばす
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'payline');
  svg.setAttribute('viewBox', '0 0 198 174');
  const ln = document.createElementNS(ns, 'line');
  ln.setAttribute('x1', x1 - dx); ln.setAttribute('y1', y1 - dy);
  ln.setAttribute('x2', x2 + dx); ln.setAttribute('y2', y2 + dy);
  svg.appendChild(ln);
  reelsEl.appendChild(svg);
}

/* 回さずに、止まった状態で表示 (デバッグ用) */
function showStatic(g, winIdx, glow) {
  bellBadge.classList.remove('show');
  renderReels(g, winIdx, glow || '');
  alignDisplay.classList.remove('show-align');
  alignDisplay.classList.add('show-lose');
  gogoTextContainer.classList.add('opacity-0');
}

function playStopSound() {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  tone(180, t, 0.07, 'square', 0.16);
  tone(90, t, 0.1, 'sine', 0.3);
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

/* チェリー/スイカの効果: 払い出し + 通常時は30G間ボーナス高確率 (内部) / AT中はPUSH → G数上乗せ
   strong: スイカ (AT中の上乗せが確定) */
function cherryEffects(inAT, strong, coins) {
  diffCoins += coins;
  setLedWin(coins);
  recordPoint();
  if (inAT) {
    if (strong || Math.random() < CHERRY_AT_SUCCESS) {
      const addG = pickCherryAtG();
      atEnding = false;     // 最終ゲームなら終了を取り消して延長
      pushReveal(`+${addG}G`, false, () => { atGames += addG; updateAT(); });
      return addG;
    }
  } else {
    cherryGames = CHERRY_G;
    updateCherry();
  }
  return 0;
}
function showRoleBadge(label, coins, notes) {
  bellBadge.textContent = label + (coins > 0 ? ` +${coins}` : '');
  bellBadge.classList.remove('show');
  void bellBadge.offsetWidth;
  bellBadge.classList.add('show');
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    notes.forEach((f, i) => tone(f, t + i * 0.06, 0.25, 'triangle', 0.14));
  }
}
const CHERRY_NOTES = [1319, 1760, 2349];
const MELON_NOTES = [1047, 1319, 1568, 2093];

/* デバッグ用: 回さずに、止まった状態でチェリーを表示 */
function hitCherry(isDebugCall, inAT) {
  const g = gridOf(pickCombo('cherry'));
  showStatic(g, winIdxOf('cherry', g));
  if (!isDebugCall) cherryEffects(inAT, false, CHERRY_COINS);
  showRoleBadge('CHERRY', CHERRY_COINS, CHERRY_NOTES);
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
    atLabel.textContent = bonusRun.zone ? 'ZONE' : 'BONUS';
    atRemain.textContent = Math.max(0, bonusRun.games - bonusRun.played);
    atStatus.classList.toggle('low', !bonusRun.zone && bonusRun.games - bonusRun.played <= 3);
    return;
  }
  atStatus.classList.remove('bonus');
  atStatus.classList.toggle('low', atGames > 0 && atGames <= 5);
  atStatus.classList.toggle('on', atGames > 0);
  atLabel.textContent = 'AT';
  atRemain.textContent = atGames;
}
function showAtToast(text) {
  if (!atToast) return;
  atToast.textContent = text;
  atToast.classList.remove('show', 'miss', 'advice');
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
  sinceEnd = null;
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
/* ペカ!ペカ!マウンテン (AT中の当選): 5〜10G。ロゴの段階(0〜3)で上乗せの期待値が変わる */
const ZONE_G_CHOICES = [5, 10, 20, 30, 50, 100];
const ZONE_G_WEIGHTS = [[50, 30, 15, 5, 0, 0], [30, 30, 25, 12, 3, 0], [10, 20, 30, 25, 13, 2], [0, 5, 20, 30, 35, 10]];
const ZONE_LOGO_NAMES = ['青', '緑', '金', '虹'];
function makeBonusPlan(coins, opts = {}) {
  const games = opts.zone ? 5 + Math.floor(Math.random() * 6) : Math.ceil(coins / BONUS_BELL_PAY);
  const atWin = opts.atWin !== undefined ? opts.atWin : Math.random() < atEntryRateFor(coins);
  const level = Math.min(games, opts.level !== undefined ? opts.level : pickAuraLevel(atWin));
  // 昇格するゲームをランダムに決める (最終オーラ = 昇格した回数)
  const pool = Array.from({ length: games }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const promo = pool.slice(0, level).sort((a, b) => a - b);
  return { total: coins, paid: 0, games, played: 0, atWin, level, promo, aura: 0, debug: !!opts.debug, zone: !!opts.zone, zoneG: 0,
    zlv: opts.zlv !== undefined ? opts.zlv : weightedPick([50, 30, 15, 5]), zonePay: Math.ceil(coins / games) };
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

/* PEKA CHANCE! ロゴ: ボーナス消化の開始から、最終ゲーム(ジャッジメント)の結果まで */
const chanceLogo = document.getElementById('chance-logo');
function setZoneLogoLevel(lv) {
  if (!chanceLogo) return;
  chanceLogo.classList.remove('z0', 'z1', 'z2', 'z3');
  chanceLogo.classList.add('z' + lv);
}
function showChance(zone, zlv) {
  if (!chanceLogo) return;
  chanceLogo.querySelector('.cl-peka').textContent = zone ? 'PEKA! PEKA!' : 'PEKA';
  chanceLogo.querySelector('.cl-chance').textContent = zone ? 'MOUNTAIN!' : 'CHANCE!';
  chanceLogo.classList.toggle('zone', !!zone);
  if (zone) setZoneLogoLevel(zlv || 0);
  chanceLogo.classList.remove('on', 'judge');
  void chanceLogo.offsetWidth;
  chanceLogo.classList.add('on');
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.06, 0.28, 'sawtooth', 0.07));
    tone(130, t, 0.4, 'sine', 0.2);
  }
  triggerFlash();
}
function hideChance() { if (chanceLogo) chanceLogo.classList.remove('on', 'judge'); }

function beginBonus(plan) {
  bonusRun = plan;
  pendingZone = false;
  showChance(plan.zone, plan.zlv);
  sinceEnd = null;
  // ボーナス開始からリザルトまでの獲得枚数を数える
  if (!atRun && !plan.debug) atRun = { startDiff: diffCoins, games: 0, bells: 0, bonuses: 0 };
  if (!plan.zone) setAura(0);
  updateAT();
}

/* ---------- 押し順ナビ (ボーナス中: 1→2→3 の順に押すとベルが揃う) ---------- */
const naviEl = document.getElementById('navi');
let naviOrder = null;   // 例: [1, 2, 0] = 中→右→左の順に止める
function showNavi(order, style = '') {
  naviOrder = order;
  naviEl.className = 'navi on ' + style;     // red: チェリー / purple: スイカ (上乗せ確定)
  [...naviEl.children].forEach((el, c) => { el.textContent = (order.indexOf(c) + 1) + (style === 'purple' ? '!' : ''); el.className = ''; });
  refreshNavi();
  spinBtn.dataset.navi = order.map(c => ['左', '中', '右'][c]).join('→');
}
function refreshNavi() {
  if (!naviOrder || !naviEl) return;
  const done = reelSpin ? reelSpin.order : [];
  [...naviEl.children].forEach((el, c) => {
    el.classList.toggle('done', done.includes(c));
    el.classList.toggle('next', !done.includes(c) && naviOrder[done.length] === c);
  });
}
function hideNavi() { naviOrder = null; if (naviEl) naviEl.className = 'navi'; }
function sameOrder(a, b) { return !!a && a.length === b.length && a.every((v, i) => v === b[i]); }

function bonusGame() {
  const b = bonusRun;
  playClickSound();
  setLedWin(0);
  const isFinal = !b.zone && b.played + 1 >= b.games;   // 最終ゲームはジャッジメント (ここでATの当否が決まる)
  const navi = [0, 1, 2].sort(() => Math.random() - 0.5);   // 押し順ナビ
  showNavi(navi);
  if (isFinal) { startTension('JUDGEMENT'); if (chanceLogo) chanceLogo.classList.add('judge'); }
  updateAT();
  runRole('bell2', res => {
    hideNavi();
    // 押し順を間違えた: ベルこぼし (1枚だけ。ゲーム数は消化されない)
    if (!AUTO_STOP && !sameOrder(res.order, navi)) {
      const pay1 = Math.max(0, Math.min(1, b.total - b.paid - 1));
      b.paid += pay1;
      if (!b.debug && pay1) { diffCoins += pay1; recordPoint(); }
      setLedWin(pay1);
      if (isFinal) { stopTension(); if (chanceLogo) chanceLogo.classList.remove('judge'); }
      missEffect();
      updateAT();
      updateUI();
      return;
    }
    b.played++;
    // ゾーンは5〜10Gで枚数を均等に払い出し、最終ゲームで残りを払う
    const pay = b.zone
      ? (b.played >= b.games ? b.total - b.paid : Math.min(b.zonePay, b.total - b.paid))
      : Math.min(BONUS_BELL_PAY, b.total - b.paid);
    b.paid += pay;
    if (!b.debug) {
      diffCoins += pay;
      recordPoint();
    }
    setLedWin(pay);
    showBellResult(pay, true);
    if (b.promo.includes(b.played)) {
      b.aura++;
      setAura(b.aura, true);
      playAuraUp(b.aura);
      if (b.aura >= 4) triggerFlash();
    }
    updateAT();
    updateUI();
    if (b.zone) {
      // ペカ!ペカ!マウンテン: リールを止めるたびにPUSHで +5G〜+100G を上乗せ。ロゴが昇格すると期待値アップ
      if (b.zlv < 3 && Math.random() < 0.14) {
        b.zlv++;
        setZoneLogoLevel(b.zlv);
        playAuraUp(b.zlv + 2);
        triggerFlash();
      }
      const g = ZONE_G_CHOICES[weightedPick(ZONE_G_WEIGHTS[b.zlv])];
      b.zoneG += g;
      const last = b.played >= b.games;
      pushReveal(`+${g}G`, g >= 50, () => {
        if (!b.debug) atGames += g;
        atEnding = false;
        updateAT();
        if (last) finishZone(b);
      });
      return;
    }
    if (b.paid >= b.total) {
      finishBonus();
    } else if (!b.zone) {
      // 残りが少ないときの演出: 残り枚数を表示。次がジャッジメント
      const rem = b.games - b.played;
      if (rem <= 3) {
        showAtToast(rem === 1 ? 'NEXT JUDGEMENT' : `REMAIN ${b.total - b.paid}`);
        playTick(4 - rem);
      }
    }
  });
}

/* 全ゲーム消化: 鼓動のあと、AT突入かどうかを見せる */
/* 上乗せ特化ゾーン終了: ゾーン中に貯めたG数をATに上乗せ (PUSHで表示) */
function finishZone(b) {
  bonusRun = null;
  hideChance();
  updateAT();
  showAtToast(`ZONE END +${b.zoneG}G`);
}

function finishBonus() {
  const b = bonusRun;
  if (b.zone) { finishZone(b); return; }
  isSuspense = true;
  startHeartbeat(2400, 400);
  suspenseTimer = setTimeout(() => {
    stopHeartbeat();
    stopTension();
    isSuspense = false;
    bonusRun = null;
    hideChance();
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
      if (atRun && atRun.games === 0 && !b.debug) { atRun.bonusOnly = true; atEnding = true; }
      maybeShowAtResult();
    }
  }, 2800);
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
/* ペカり君トロフィー: 総回転数が多いほど出やすく、色が設定を示唆 (設定を超える色は出ない) */
const TROPHIES = [
  { name: '銅', c: '#cd7f32' }, { name: '銀', c: '#d5dbe3' }, { name: '金', c: '#ffd23f' },
  { name: '青', c: '#38bdf8' }, { name: '赤', c: '#ff4040' }, { name: '虹', c: '#f0abfc' }
];
function pickTrophy(totalG) {
  const lv = Math.min(6, SETTINGS.level);
  if (Math.random() > Math.min(0.95, 0.08 + totalG / 1200)) return 0;
  const truth = Math.random() < Math.min(0.92, 0.3 + totalG / 2000);
  return truth ? lv : Math.max(1, lv - 1);
}
function trophySVG(c, rainbow) {
  const fill = rainbow ? 'url(#trg)' : c;
  return `<svg viewBox="0 0 24 24"><defs><linearGradient id="trg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a5a"/><stop offset=".25" stop-color="#ffd800"/><stop offset=".5" stop-color="#3be07a"/><stop offset=".75" stop-color="#38a8ff"/><stop offset="1" stop-color="#d946ef"/></linearGradient></defs><path fill="${fill}" d="M7 3h10v2h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v2h1v2H7v-2h1v-2h3v-2.1A5 5 0 0 1 7.3 11H7a4 4 0 0 1-4-4V6a1 1 0 0 1 1-1h3V3zm-2 4a2 2 0 0 0 2 2V7H5zm14 0h-2v2a2 2 0 0 0 2-2z"/></svg>`;
}

/* 獲得枚数の「OVER」表示: ボーナス開始からリザルトまでの合計が、この枚数に達した瞬間に出る。
   250/500/750/1000/1500/2000/3000 は通常。222/444/456/666 は設定示唆で、その設定以上のときだけ出る
   (222=設定2以上 / 444=設定4以上 / 456=設定5以上 / 666=設定6のみ) */
const OVER_NUMS = [
  { n: 222, min: 2 }, { n: 250, min: 0 }, { n: 444, min: 4 }, { n: 456, min: 5 }, { n: 500, min: 0 },
  { n: 666, min: 6 }, { n: 750, min: 0 }, { n: 1000, min: 0 }, { n: 1500, min: 0 }, { n: 2000, min: 0 }, { n: 3000, min: 0 }
];
const HINT_OVER_RATE = 0.18;   // 設定示唆のOVERが出る確率 (条件を満たしたとき)
const overPop = document.getElementById('over-pop');
let overQueue = [];
let overBusy = false;
function showOver(n) {
  overQueue.push(n);
  drainOver();
}
function drainOver() {
  if (overBusy || !overQueue.length || !overPop) return;
  overBusy = true;
  const n = overQueue.shift();
  overPop.innerHTML = `${n}<span>OVER!</span>`;
  overPop.className = 'over-pop';
  void overPop.offsetWidth;
  overPop.classList.add('show');
  if (n >= 1000) overPop.classList.add('big');
  rainCoins(n >= 1000 ? 60 : 30);
  if (soundEnabled) { initAudio(); const t0 = audioCtx.currentTime; [784, 988, 1175, 1568].forEach((f, i) => tone(f, t0 + i * 0.07, 0.25, 'triangle', 0.12)); }
  setTimeout(() => { overPop.className = 'over-pop'; overBusy = false; drainOver(); }, 1500);
}
function checkOver() {
  if (!atRun) return;
  const total = diffCoins - atRun.startDiff;
  const prev = atRun.maxTotal || 0;
  if (total <= prev) return;
  atRun.maxTotal = total;
  // 設定示唆(min>0)は条件を満たしても稀にしか出ない。通常の枚数は必ず出る
  OVER_NUMS.filter(x => SETTINGS.level >= x.min && prev < x.n && x.n <= total)
    .filter(x => x.min === 0 || Math.random() < HINT_OVER_RATE)
    .forEach(x => showOver(x.n));
}

/* PEKA RUSH 開始から終了までの獲得枚数と、次回の当たりやすさ(示唆)を表示 */
function showAtResult(run) {
  isAtResult = true;
  const only = !!run.bonusOnly;
  let gain = run.gain !== undefined ? run.gain : diffCoins - run.startDiff;
  const hint = only ? 0 : (run.hint !== undefined ? run.hint : decideNextMode());
  document.getElementById('at-result-title').textContent = only ? 'BONUS RESULT' : 'AT RESULT';
  document.getElementById('ar-row-games').style.display = only ? 'none' : '';
  document.getElementById('ar-row-bells').style.display = only ? 'none' : '';
  document.getElementById('ar-hint-row').style.display = only ? 'none' : '';
  document.getElementById('ar-games').textContent = `${run.games} G`;
  document.getElementById('ar-bells').textContent = `${run.bells} 回`;
  document.getElementById('ar-bonus').textContent = `${run.bonuses} 回`;
  document.getElementById('ar-total').textContent = `${cumulativeGames} G`;
  const tr = run.trophy !== undefined ? run.trophy : pickTrophy(cumulativeGames);
  const trEl = document.getElementById('ar-trophy');
  trEl.className = 'ar-trophy' + (tr ? ` show t${tr}` : '');
  if (tr) {
    const T = TROPHIES[tr - 1];
    trEl.style.setProperty('--tc', T.c);
    trEl.innerHTML = `${trophySVG(T.c, tr === 6)}<span>ペカり君トロフィー</span><b>${T.name}</b>`;
  } else trEl.innerHTML = '';
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
  sinceEnd = 0;          // ここからボーナス終了後のゲーム数を数える
  updateAT();
});

function playReplayJingle() {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  [784, 988, 1175].forEach((f, i) => tone(f, t + i * 0.07, 0.18, 'triangle', 0.16));
}

function hideLoseReels() {
  alignDisplay.classList.remove('show-lose');
  gogoTextContainer.classList.remove('opacity-0');
}

/* 枚数の数字の大きさ: 枚数(レベル)が大きいほどデカく、桁数に合わせて画面幅いっぱいまで */
const PAY_BASE_PX = { 1: 92, 2: 104, 3: 116, 4: 128, 5: 140, 6: 152, 7: 164 };
function applyPayoutStyle(coins, level) {
  payoutNum.className = `payout-num pay-l${level}`;
  const avail = Math.max(180, gogoBox.clientWidth - 16);
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
    setLedWin(Math.round(from + (to - from) * eased));
    if (now - lastTick > 45 && p < 1 && soundEnabled && audioCtx) {
      lastTick = now;
      tone(900 + 900 * p, audioCtx.currentTime, 0.04, 'square', 0.05);
    }
    if (p < 1) {
      countRAF = requestAnimationFrame(frame);
    } else {
      payoutValue.textContent = to;
      setLedWin(to);
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
    pendingPlan = makeBonusPlan(coins, pendingZone ? { zone: true, atWin: false, level: 0 } : {});
    bonusLog.push({ g: cumulativeGames, type: 'BIG', coins });
    recordPoint();
  }

  currentShownCoins = coins;
  fxOverlay.className = `fx-t${pendingTierIndex + 1}`;   // 枚数表示で背景が豪華に
  const level = payLevel(coins);
  payoutLabel.textContent = pendingZone ? 'PEKA! PEKA! MOUNTAIN!' : 'BIG BONUS';
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
let heartbeatOn = false;

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
  heartbeatOn = true;
  const startedAt = performance.now();
  const beat = () => {
    if (!heartbeatOn) return;
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
  heartbeatOn = false;
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
  cancelReels();
  hideChance();
  hideNavi();
  clearPekaTimers();
  omenOff();
  stopTension();
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
/* ---------- 電光掲示 (7セグ風) ---------- */
function setLed(el, n, digits) {
  if (!el) return;
  const s = String(Math.max(0, Math.min(Math.pow(10, digits) - 1, Math.round(n))));
  const key = digits + ':' + s;
  if (el.dataset.v === key) return;
  el.dataset.v = key;
  let html = '';
  for (let i = 0; i < digits; i++) {
    const k = i - (digits - s.length);
    html += k < 0 ? '<span class="dg off"><b>0</b></span>' : `<span class="dg"><b>${s[k]}</b></span>`;
  }
  el.innerHTML = html;
}
const ledWinEl = document.getElementById('led-win');
const ledCreditEl = document.getElementById('led-credit');
const ledTotalEl = document.getElementById('led-total');
let ledWin = 0;
function setLedWin(n) { ledWin = n; tweenLed('win', ledWinEl, n, 3); }
/* メダル枚数: 50枚から。足りなくなったら50枚ずつ補充した扱い */
function creditNow() {
  let v = 50 + diffCoins;
  if (v < 0) v += 50 * Math.ceil(-v / 50);
  return v;
}
/* 獲得枚数: ボーナス開始からの合計 */
function totalGetNow() {
  if (atRun) return Math.max(0, diffCoins - atRun.startDiff);
  if (bonusRun) return bonusRun.paid;
  return 0;
}
const plIds = ['insert', 'bet', 'replay', 'start', 'wait'].reduce((o, k) => (o[k] = document.getElementById('pl-' + k), o), {});
/* 枚数が増えるときは、カウントアップで表示する (減るとき・リセットは即時) */
const ledShown = { win: 0, credit: null, total: 0, diff: 0 };
function tweenLed(key, el, target, digits) {
  let s = ledShown[key];
  if (s === null || target < s) s = target;
  else if (target > s) s = Math.min(target, s + Math.max(1, Math.ceil((target - s) / 5)));
  ledShown[key] = s;
  setLed(el, s, digits);
  const box = el.parentElement;
  if (box) box.classList.toggle('counting', s !== target);
  return s;
}
function tickDiff() {
  let s = ledShown.diff;
  if (diffCoins < s) s = diffCoins;
  else if (diffCoins > s) s = Math.min(diffCoins, s + Math.max(1, Math.ceil((diffCoins - s) / 5)));
  ledShown.diff = s;
  displayDiff.textContent = s >= 0 ? `+${s}` : `${s}`;
  displayDiff.className = `digital-font font-bold text-sm ${diffCoins >= 0 ? 'text-green-400' : 'text-red-400'}`;
}
function syncPanel() {
  tweenLed('credit', ledCreditEl, creditNow(), 4);
  tweenLed('total', ledTotalEl, totalGetNow(), 4);
  tweenLed('win', ledWinEl, ledWin, 3);
  tickDiff();
  const idle = !isReelSpinning && !spinBtn.disabled && !reelLocked;
  const betting = isReelSpinning || (replayPending ? false : false);
  plIds.insert.classList.toggle('on', idle && !replayPending && !bonusRun);
  plIds.bet.classList.toggle('on', isReelSpinning && !bonusRun && !isDebugRun);
  plIds.replay.classList.toggle('on', replayPending);
  plIds.start.classList.toggle('on', idle);
  plIds.wait.classList.toggle('on', reelLocked || isCounting || isSuspense || isRushing || isPushing);
}
setInterval(syncPanel, 50);
document.querySelectorAll('.stop-btn').forEach(b => {
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!isReelSpinning) return;
    const c = +b.dataset.stop;
    const rs = reelSpin;
    // 第一停止が左以外: 左から押すことを推奨 (ボーナス中は押し順ナビが優先)
    if (rs && rs.order.length === 0 && c !== 0 && !naviOrder && rs.plan.kind !== 'seven') {
      showAtToast('左リールから停止を推奨');
      atToast.classList.add('advice');
    }
    stopCol(c, false);
  });
});

function updateUI() {
  checkOver();
  syncPanel();
  displayGames.textContent = totalGames;
  displayBig.textContent = bigCount;
  displayReg.textContent = atCount;

  displayProb.textContent = bigCount > 0 ? `1/${(cumulativeGames / bigCount).toFixed(1)}` : `1/0`;

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
    overQueue = [];
    sinceEnd = null;
    pekaSpecial = null;
    setLedWin(0);
    atEnding = false;
    isAtResult = false;
    atResultEl.classList.remove('show');
    bonusRun = null;
    setAura(null);
    cancelReels();
    stopTension();
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
// (タップの遅れをなくすため pointerdown で受ける。回転中はタップした位置のリールが止まる)
gogoBox.addEventListener('pointerdown', e => {
  if (isReelSpinning) { stopNextReel(); return; }   // タップは左から順に止まる
  if (!spinBtn.disabled) handleSpin();
});
// 操作ガイド: 状態管理用ボタンの文言を、リール下の表示に反映
const tapHint = document.getElementById('tap-hint');
function syncTapHint() {
  tapHint.textContent = spinBtn.disabled ? spinBtn.innerText : `タップ: ${spinBtn.innerText}`;
  tapHint.classList.toggle('off', spinBtn.disabled);
}
new MutationObserver(syncTapHint).observe(spinBtn, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
syncTapHint();
document.getElementById('reset-btn').addEventListener('click', resetData);

/* ---------- オートプレイ ----------
   レバー・停止・NEXT・PUSH・結果画面の閉じる、までを自動で行う。
   演出(フラグ/アニメーション/オーバーレイ)が終わって少し経ってから次の操作をする。
   停止は自動停止と同じ (目押しなし。押し順ナビがあればその順)。 */
const autoBtn = document.getElementById('auto-btn');
let AUTOPLAY = false;
let autoIdle = 0;          // 演出が何もない状態が続いたティック数
let autoResultWait = 0;
let autoPushWait = 0;
const AUTO_TICK = 200;
const AUTO_IDLE_TICKS = 4; // 0.8秒 演出なしが続いたら次の操作
function setAutoPlay(on) {
  AUTOPLAY = !!on;
  autoIdle = autoResultWait = autoPushWait = 0;
  if (autoBtn) autoBtn.setAttribute('aria-pressed', AUTOPLAY ? 'true' : 'false');
}
function fxRunning() {
  // 有限回のCSSアニメーションが動いている間は演出中とみなす
  return document.getAnimations().some(a => a.constructor.name === 'CSSAnimation' && a.playState === 'running' &&
    a.effect && a.effect.getComputedTiming().iterations !== Infinity);
}
function autoModalOpen() { return !!document.querySelector('.modal.open'); }
function autoTick() {
  if (!AUTOPLAY || isDebugRun || autoModalOpen()) { autoIdle = 0; return; }
  // リザルト画面: 少し眺めてから閉じる
  if (isAtResult) {
    autoIdle = 0;
    if (++autoResultWait >= 12) { autoResultWait = 0; document.getElementById('at-result-close').click(); }
    return;
  }
  autoResultWait = 0;
  // PUSH待ち: 少し間をおいて押す
  if (isPushing) {
    autoIdle = 0;
    if (pushOverlay.classList.contains('waiting')) { if (++autoPushWait >= 4) { autoPushWait = 0; pushBtn.click(); } }
    return;
  }
  autoPushWait = 0;
  // リール回転中: 自動停止を仕込む (演出待ちではない)
  if (isReelSpinning) {
    autoIdle = 0;
    if (reelSpin && !reelSpin.autoArmed) {
      reelSpin.autoArmed = true;
      const order = naviOrder ? naviOrder.slice() : [0, 1, 2];
      order.forEach((c, i) => reelSpin.timers.push(setTimeout(() => stopCol(c, true), 350 + i * 260)));
    }
    return;
  }
  const busy = reelLocked || isCooldown || isCounting || isSuspense || isRushing ||
    spinBtn.disabled || overBusy || overQueue.length > 0 || fxRunning();
  if (busy) { autoIdle = 0; return; }
  if (++autoIdle < AUTO_IDLE_TICKS) return;
  autoIdle = 0;
  handleSpin();
}
setInterval(autoTick, AUTO_TICK);
if (autoBtn) autoBtn.addEventListener('click', () => setAutoPlay(!AUTOPLAY));


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
  { key: 'melon', label: 'スイカ 通常時 (ハズレのうち)', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'melonAt', label: 'スイカ AT中 (ハズレのうち)', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'melonCoins', label: 'スイカの払い出し (枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW0', label: 'AT後の次回モード比率: 通常', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW1', label: '次回モード比率: 好調 (30G / 2倍)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW2', label: '次回モード比率: 絶好調 (40G / 4倍)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW3', label: '次回モード比率: 天国 (50G / 8倍)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'hintTrue', label: 'リザルト示唆の的中率', min: 0, max: 100, step: 0.1, suffix: '%' }
];

let formLevel = DEFAULT_LEVEL;   // 設定パネルで編集中の設定
let secretBuf = [];             // 設定ボタンの押した順 (裏コマンド判定用)

function buildSettingsForm(level = formLevel, src = SETTINGS.profiles[level]) {
  formLevel = level;
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
  const isSeven = SETTINGS.level === 7;
  const levels = [1, 2, 3, 4, 5, 6].map(l =>
    `<button type="button" data-level="${l}" class="${!SETTINGS.random && l === SETTINGS.level ? 'on' : ''}">設定${l}</button>`).join('')
    + `<button type="button" data-random="1" class="set-random ${SETTINGS.random ? 'on' : ''}">ランダム</button>`;
  settingsBody.innerHTML = `
    <div class="set-levels">${levels}</div>
    <label class="set-row set-opt"><span class="set-label">リール停止を自動にする (目押しなし)</span><span class="set-field"><input type="checkbox" id="opt-auto"></span></label>
    ${isSeven ? `<div class="set-group">
      ${rows}
    </div>
    <div class="set-title">当選内訳 (比率。合計が100でなくても自動で換算)</div>
    <div class="set-group">
      ${weights}
      <div class="set-row set-total"><span class="set-label">合計</span><span class="set-field" id="set-total"></span></div>
    </div>` : ''}`;
  // 数値入力 (と適用ボタン) は設定7のときだけ
  const foot = document.querySelector('#settings-modal .modal-foot');
  if (foot) foot.style.display = isSeven ? '' : 'none';
  settingsBody.querySelectorAll('input[data-w]').forEach(el => el.addEventListener('input', refreshWeightPct));
  const optAuto = document.getElementById('opt-auto');
  optAuto.checked = AUTO_STOP;
  optAuto.addEventListener('change', () => { AUTO_STOP = optAuto.checked; saveOpt(); });
  settingsBody.querySelectorAll('button[data-level]').forEach(el =>
    el.addEventListener('click', () => pressLevelButton(+el.dataset.level)));
  const rb = settingsBody.querySelector('button[data-random]');
  if (rb) rb.addEventListener('click', () => { secretBuf = []; setLevel(1 + Math.floor(Math.random() * 6), true); });
  if (isSeven) refreshWeightPct();
}

/* 設定を切り替える (1〜7)。7は裏コマンドからのみ */
function setLevel(l, random = false) {
  if (SETTINGS.level !== 7) SETTINGS.prev = SETTINGS.level;
  SETTINGS.level = l;
  SETTINGS.random = random && l !== 7;
  if (l !== 7) SETTINGS.prev = l;
  saveSettings();
  applySettings();
  refreshRateLabel();
  buildSettingsForm(l);
}
function pressLevelButton(l) {
  secretBuf.push(l);
  if (secretBuf.length > SECRET_SEQ.length) secretBuf.shift();
  if (secretBuf.join() === SECRET_SEQ.join()) {
    setLevel(7);
    secretBuf = [];
    if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; [1047, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.08, 0.2, 'triangle', 0.14)); }
  } else {
    setLevel(l);
  }
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
  const next = JSON.parse(JSON.stringify(SETTINGS.profiles[formLevel]));
  settingsBody.querySelectorAll('input[data-key]').forEach(el => {
    const v = parseFloat(el.value);
    if (Number.isFinite(v)) next[el.dataset.key] = Math.min(+el.max, Math.max(+el.min, v));
  });
  const w = readWeightInputs();
  if (w.reduce((x, y) => x + y, 0) > 0) next.weights = w;
  SETTINGS.profiles[formLevel] = next;
  saveSettings();
  applySettings();
  refreshRateLabel();
  closeModal(settingsModal);
}

function refreshRateLabel() {
  if (displayRate) displayRate.textContent = SETTINGS.random ? '---' : `1/${activeProfile().hitDenom}`;
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

document.getElementById('settings-btn').addEventListener('click', () => { secretBuf = []; buildSettingsForm(SETTINGS.level); openModal(settingsModal); });
document.getElementById('settings-apply').addEventListener('click', applySettingsForm);
document.getElementById('settings-default').addEventListener('click', () => {
  buildSettingsForm(formLevel, DEFAULT_PROFILES[formLevel]);   // 入力欄だけ、この設定の初期値に戻す (適用を押すまで反映されない)
});
document.getElementById('graph-btn').addEventListener('click', () => { openModal(graphModal); drawGraphs(); });
document.querySelectorAll('[data-close-modal]').forEach(el =>
  el.addEventListener('click', () => closeModal(el.closest('.modal'))));
document.querySelectorAll('.modal').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) closeModal(m); }));
window.addEventListener('resize', () => { if (graphModal.classList.contains('open')) drawGraphs(); });
refreshRateLabel();

const versionEl = document.getElementById('app-version');
if (versionEl) versionEl.textContent = `v${APP_VERSION}`;

// ==========================================
// リール配列の表示
// ==========================================
const reelModal = document.getElementById('reel-modal');
const reelView = document.getElementById('reel-view');
function miniSym(k) {
  if (isSeven(k)) return `<img class="rv-img" src="${k}.png" alt="7" onerror="this.outerHTML='<span class=&quot;rv-txt rv-${k}&quot;>7</span>'">`;
  if (k === 'bar') return '<span class="rv-txt rv-bar">BAR</span>';
  if (k === 'replay') return '<span class="rv-txt rv-replay">RE</span>';
  return `<span class="rv-emoji">${EMOJI[k]}</span>`;
}
function buildReelView() {
  const names = ['左', '中', '右'];
  reelView.innerHTML = STRIPS.map((strip, c) => {
    const cells = [];
    for (let i = STRIP_LEN - 1; i >= 0; i--) {       // 上が先に流れ落ちてくる側。回転は下向き
      cells.push(`<div class="rv-cell"><i>${i + 1}</i>${miniSym(strip[i])}</div>`);
    }
    return `<div class="rv-col"><div class="rv-head">${names[c]}</div>${cells.join('')}</div>`;
  }).join('');
}
document.getElementById('reel-btn').addEventListener('click', () => { buildReelView(); openModal(reelModal); });


/* iOS: ピンチ拡大と、連打によるダブルタップズームを禁止 */
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd < 350 && !(e.target.closest && e.target.closest('button, input, textarea, select, label'))) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
