// ==========================================
// JS/core/settings.js  —  遊び方モード・機械割・設定の適用/保存/読み込み
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* ---------- 遊び方モード (本気 / 極楽 / 遊本気 / 遊極楽) × 設定1〜6 ----------
   本気: 機械割 100〜120% / 極楽: 機械割 110〜130% (AT突入しやすく、HEAVEN/DEATHも多め)
   遊: 当たりやすさ2倍・ボーナス枚数とATのG数は半分 (演出をたくさん見たい人向け。機械割は本気/極楽と同じ)
   hitDenom はシミュレーションで機械割に合わせて調整した値 (tools/tune_modes.js) */
const PLAY_MODES = [
  { name: '本気',   entryAdd: 0, coinScale: 1,   gScale: 1,   typeW: [[84, 12, 4], [83, 13, 4], [81, 14, 5], [79, 15, 6], [76, 17, 7], [72, 20, 8]] },
  { name: '極楽',   entryAdd: 8, coinScale: 1,   gScale: 1,   typeW: [[66, 24, 10], [63, 26, 11], [60, 28, 12], [56, 30, 14], [52, 32, 16], [48, 34, 18]] },
  { name: '遊本気', entryAdd: 0, coinScale: 0.5, gScale: 0.5, typeW: [[84, 12, 4], [83, 13, 4], [81, 14, 5], [79, 15, 6], [76, 17, 7], [72, 20, 8]] },
  { name: '遊極楽', entryAdd: 8, coinScale: 0.5, gScale: 0.5, typeW: [[66, 24, 10], [63, 26, 11], [60, 28, 12], [56, 30, 14], [52, 32, 16], [48, 34, 18]] }
];
// ボーナス当選確率 1/N (基本。チェリー・チャンス目などで当たりやすくなる前の値)
const MODE_HITDENOM = [[772, 745, 724, 673, 639, 623], [742, 709, 676, 655, 631, 599], [220, 216, 213, 206, 198, 194], [210, 205, 199, 191, 185, 182]];
// 画面に出す機械割の目安 (%)
const MODE_RATES = [[100, 103, 106, 110, 115, 120], [110, 114, 118, 122, 126, 130], [100, 103, 106, 110, 115, 120], [110, 114, 118, 122, 126, 130]];
const DEFAULT_PROFILES = {};          // 本気モード (従来の形)
const PROFILES_BY_MODE = [{}, {}, {}, {}];
for (let l = 1; l <= 7; l++) {
  const p = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  Object.keys(LEVEL_VALUES).forEach(k => { p[k] = LEVEL_VALUES[k][l - 1]; });
  p.weights = LEVEL_TIER_WEIGHTS[l - 1].slice();
  PLAY_MODES.forEach((m, mi) => {
    const q = JSON.parse(JSON.stringify(p));
    if (l <= 6) {
      q.hitDenom = MODE_HITDENOM[mi][l - 1];
      q.atEntryMin = Math.min(95, q.atEntryMin + m.entryAdd);
      q.atEntryMax = Math.min(98, q.atEntryMax + m.entryAdd);
      q.coinScale = m.coinScale;
      q.gScale = m.gScale;
      [q.typeW0, q.typeW1, q.typeW2] = m.typeW[l - 1];
    } else {
      [q.typeW0, q.typeW1, q.typeW2] = [34, 33, 33];
    }
    PROFILES_BY_MODE[mi][l] = q;
  });
  DEFAULT_PROFILES[l] = PROFILES_BY_MODE[0][l];
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
  const out = { level: DEFAULT_LEVEL, prev: DEFAULT_LEVEL, random: false, mode: 0, profiles: {} };
  for (let l = 1; l <= 7; l++) out.profiles[l] = JSON.parse(JSON.stringify(PROFILES_BY_MODE[0][l]));
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (raw && typeof raw === 'object' && raw.profiles) {
      if (raw.mode >= 0 && raw.mode <= 3) {
        out.mode = raw.mode | 0;
        for (let l = 1; l <= 7; l++) out.profiles[l] = JSON.parse(JSON.stringify(PROFILES_BY_MODE[out.mode][l]));
      }
      if (raw.profiles[7]) mergeProfile(out.profiles[7], raw.profiles[7]);   // 数値を編集できるのは設定7だけ
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
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ level, mode: SETTINGS.mode, random: !!SETTINGS.random, profiles: SETTINGS.profiles }));
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
let AT_G_SCALE = 1, AT_TYPE_W = [84, 12, 4];
/* ATのG数を倍率で調整 (遊モード: 半分。最低5G) */
const scaleG = g => (AT_G_SCALE === 1 ? g : Math.max(5, Math.round(g * AT_G_SCALE / 5) * 5));

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
  AT_G_SCALE = Math.max(0.1, +st.gScale || 1);
  AT_TYPE_W = [st.typeW0, st.typeW1, st.typeW2].map(nz);
  const cs = Math.max(0.1, +st.coinScale || 1);
  BIG_TIERS.forEach((t, i) => { t.coins = Math.max(1, Math.round(BASE_COINS[i] * cs)); });
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

