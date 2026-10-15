// ==========================================
// JS/core/state.js  —  ゲーム状態変数・UI要素の参照
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
// ゲーム状態変数
const gameHistory = [];   // グラフ用: {g: 累計G数, diff: 差枚数}
const bonusLog = [];      // グラフ用: {g, type, coins}
function recordPoint() {
  if (isDebugRun) return;
  gameHistory.push({ g: cumulativeGames, diff: diffCoins });
  if (gameHistory.length > 20000) gameHistory.shift();
}
const roleStat = { bell: 0, replay: 0, melon: 0, cherry: 0, chance: 0 };   // 小役カウント（グラフ画面に表示）
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
let zenchoLeft = 0;               // 当選確定後、ランプが光るまでの残りG数 (3〜5G遅らせる。ハズレ矛盾が出たら確定)
const ZENCHO_P = 0.45;
let modeGames = 0;                 // AT終了後の「次回モード」の残りG数 (当選率アップ・画面には出さない)
let modeMult = 1;                  // 次回モードの当選確率の倍率
let atRun = null;                  // いまのAT中の集計 {startDiff, games, bells, bonuses}
let atEnding = false;              // ATのG数が0になった (リザルト待ち)
let isAtResult = false;            // リザルト表示中 (レバー無効)
let cherryGames = 0;               // チェリー後の当選しやすい期間 (残りG)
let cherryM = 1;                   // その期間のボーナス当選倍率 (役の強さで変わる)
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

