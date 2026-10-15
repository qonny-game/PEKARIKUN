// ==========================================
// JS/game/auto.js  —  オートプレイ・サウンドボタン
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* ---------- オートプレイ ----------
   レバー・停止・NEXT・PUSH・結果画面の閉じる、までを自動で行う。
   演出(フラグ/アニメーション/オーバーレイ)が終わって少し経ってから次の操作をする。
   停止は自動停止と同じ (目押しなし。押し順ナビがあればその順)。
   速度と「どこで止めるか」はオート設定で選べる。 */
const autoBtn = document.getElementById('auto-btn');
const AUTO_KEY = 'pekari-auto-v1';
const AUTO_SPEEDS = {
  slow:   { name: 'ゆっくり', idle: 6, stop: 1.5,  res: 18, push: 6 },
  normal: { name: '標準',     idle: 4, stop: 1,    res: 12, push: 4 },
  fast:   { name: '高速',     idle: 2, stop: 0.5,  res: 6,  push: 2 },
  max:    { name: '最速',     idle: 1, stop: 0.25, res: 3,  push: 1 }
};
const AUTO_STOPS = [
  { key: 'peka',   label: 'ペカ点灯 (ランプが光ったところ)' },
  { key: 'bonus',  label: 'ボーナス開始前 (枚数表示のあと)' },
  { key: 'at',     label: 'AT突入' },
  { key: 'zone',   label: 'ゾーン (MOUNTAIN) 突入' },
  { key: 'result', label: 'リザルト表示' },
  { key: 'over',   label: '設定示唆のOVER (222 / 444 / 456 / 666)' }
];
let AUTO_OPT = { speed: 'normal', stop: {}, games: 0, plus: 0, minus: 0 };
try {
  const o = JSON.parse(localStorage.getItem(AUTO_KEY) || '{}');
  if (AUTO_SPEEDS[o.speed]) AUTO_OPT.speed = o.speed;
  if (o.stop && typeof o.stop === 'object') AUTO_OPT.stop = o.stop;
  ['games', 'plus', 'minus'].forEach(k => { if (+o[k] > 0) AUTO_OPT[k] = Math.floor(+o[k]); });
} catch (e) { /* 初期値 */ }
function saveAutoOpt() { try { localStorage.setItem(AUTO_KEY, JSON.stringify(AUTO_OPT)); } catch (e) { /* 無視 */ } }

let AUTOPLAY = false;
let autoIdle = 0;          // 演出が何もない状態が続いたティック数
let autoResultWait = 0;
let autoPushWait = 0;
let autoGames = 0;         // オートで回したゲーム数
let autoStartDiff = 0;
let autoPending = '';      // 停止条件を満たしたが、演出が終わるのを待っている理由
let autoPrev = { at: false, zone: false };
const AUTO_TICK = 200;
function setAutoPlay(on, reason) {
  AUTOPLAY = !!on;
  autoIdle = autoResultWait = autoPushWait = 0;
  autoPending = '';
  if (AUTOPLAY) { autoGames = 0; autoStartDiff = diffCoins; autoPrev = { at: atGames > 0, zone: !!(bonusRun && bonusRun.zone) }; }
  if (autoBtn) autoBtn.setAttribute('aria-pressed', AUTOPLAY ? 'true' : 'false');
  if (!AUTOPLAY && reason) showAtToast(`オート停止: ${reason}`);
}
function fxRunning() {
  // 有限回のCSSアニメーションが動いている間は演出中とみなす
  return document.getAnimations().some(a => a.constructor.name === 'CSSAnimation' && a.playState === 'running' &&
    a.effect && a.effect.getComputedTiming().iterations !== Infinity);
}
function autoModalOpen() { return !!document.querySelector('.modal.open'); }
/* 停止条件: 状態の変化を拾い、演出が終わった時点で止める */
function autoWatch() {
  const st = AUTO_OPT.stop;
  const atNow = atGames > 0;
  const zoneNow = !!(bonusRun && bonusRun.zone);
  if (st.at && atNow && !autoPrev.at && !autoPending) autoPending = 'AT突入';
  if (st.zone && zoneNow && !autoPrev.zone && !autoPending) autoPending = 'ゾーン突入';
  autoPrev = { at: atNow, zone: zoneNow };
}
function autoCheckIdle() {
  const st = AUTO_OPT.stop;
  if (autoPending) return autoPending;
  if (st.peka && isPekared && !isBonusAligned && alignStage === 0) return 'ペカ点灯';
  if (st.bonus && isBonusAligned) return 'ボーナス開始前';
  if (AUTO_OPT.games && autoGames >= AUTO_OPT.games) return `${AUTO_OPT.games}G消化`;
  const d = diffCoins - autoStartDiff;
  if (AUTO_OPT.plus && d >= AUTO_OPT.plus) return `+${AUTO_OPT.plus}枚到達`;
  if (AUTO_OPT.minus && d <= -AUTO_OPT.minus) return `-${AUTO_OPT.minus}枚到達`;
  return '';
}
function autoTick() {
  if (!AUTOPLAY || isDebugRun || autoModalOpen()) { autoIdle = 0; return; }
  const sp = AUTO_SPEEDS[AUTO_OPT.speed];
  autoWatch();
  // リザルト画面: 少し眺めてから閉じる (停止条件があれば閉じずに止まる)
  if (isAtResult) {
    autoIdle = 0;
    if (autoPending) { setAutoPlay(false, autoPending); return; }
    if (AUTO_OPT.stop.result && !fxRunning()) { setAutoPlay(false, 'リザルト表示'); return; }
    if (++autoResultWait >= sp.res) { autoResultWait = 0; document.getElementById('at-result-close').click(); }
    return;
  }
  autoResultWait = 0;
  // PUSH待ち: 少し間をおいて押す
  if (isPushing) {
    autoIdle = 0;
    if (pushOverlay.classList.contains('waiting')) { if (++autoPushWait >= sp.push) { autoPushWait = 0; pushBtn.click(); } }
    return;
  }
  autoPushWait = 0;
  // リール回転中: 自動停止を仕込む (演出待ちではない)
  if (isReelSpinning) {
    autoIdle = 0;
    if (reelSpin && !reelSpin.autoArmed) {
      reelSpin.autoArmed = true;
      const order = naviOrder ? naviOrder.slice() : [0, 1, 2];
      order.forEach((c, i) => reelSpin.timers.push(setTimeout(() => stopCol(c, true), Math.round((350 + i * 260) * sp.stop))));
    }
    return;
  }
  const busy = reelLocked || isCooldown || isCounting || isSuspense || isRushing ||
    spinBtn.disabled || overBusy || overQueue.length > 0 || fxRunning();
  if (busy) { autoIdle = 0; return; }
  if (++autoIdle < sp.idle) return;
  autoIdle = 0;
  const why = autoCheckIdle();
  if (why) { setAutoPlay(false, why); return; }
  autoGames++;
  handleSpin();
}
setInterval(autoTick, AUTO_TICK);
if (autoBtn) autoBtn.addEventListener('click', () => setAutoPlay(!AUTOPLAY));

/* オート設定画面 */
const autoModal = document.getElementById('auto-modal');
const autoBody = document.getElementById('auto-body');
function buildAutoForm() {
  const speeds = Object.keys(AUTO_SPEEDS).map(k =>
    `<button type="button" class="auto-speed${AUTO_OPT.speed === k ? ' on' : ''}" data-speed="${k}">${AUTO_SPEEDS[k].name}</button>`).join('');
  const stops = AUTO_STOPS.map(x =>
    `<label class="set-row set-opt"><span class="set-label">${x.label}</span><span class="set-field"><input type="checkbox" data-astop="${x.key}"${AUTO_OPT.stop[x.key] ? ' checked' : ''}></span></label>`).join('');
  const num = (k, label, suf) =>
    `<div class="set-row"><span class="set-label">${label}</span><span class="set-field"><input type="number" min="0" step="1" inputmode="numeric" data-anum="${k}" value="${AUTO_OPT[k] || ''}" placeholder="なし">${suf}</span></div>`;
  autoBody.innerHTML = `
    <div class="set-title">速度 (演出が終わるまで待つのは共通)</div>
    <div class="auto-speeds">${speeds}</div>
    <div class="set-title">自動で止める条件 (演出が終わってから止まる)</div>
    <div class="set-group">${stops}</div>
    <div class="set-title">数値で止める (空欄は無効)</div>
    <div class="set-group">
      ${num('games', 'オートで回したゲーム数', 'G')}
      ${num('plus', '差枚数 プラス', '枚')}
      ${num('minus', '差枚数 マイナス', '枚')}
    </div>
    <div class="set-note">オートボタンを押した時点から数えます。設定は保存されます。</div>`;
  autoBody.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
    AUTO_OPT.speed = b.dataset.speed; saveAutoOpt();
    autoBody.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('on', x === b));
  }));
  autoBody.querySelectorAll('[data-astop]').forEach(c => c.addEventListener('change', () => {
    AUTO_OPT.stop[c.dataset.astop] = c.checked; saveAutoOpt();
  }));
  autoBody.querySelectorAll('[data-anum]').forEach(c => c.addEventListener('input', () => {
    AUTO_OPT[c.dataset.anum] = Math.max(0, Math.floor(+c.value) || 0); saveAutoOpt();
  }));
}
const autoOptBtn = document.getElementById('auto-opt-btn');
if (autoOptBtn) autoOptBtn.addEventListener('click', () => { buildAutoForm(); openModal(autoModal); });


// 音声ON/OFF (アイコン表示)
const ICON_SOUND_ON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>`;
const ICON_SOUND_OFF = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

const soundToggleBtn = document.getElementById('sound-toggle-btn');
soundToggleBtn.innerHTML = ICON_SOUND_ON;
soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.innerHTML = soundEnabled ? ICON_SOUND_ON : ICON_SOUND_OFF;
});

