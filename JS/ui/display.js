// ==========================================
// JS/ui/display.js  —  電光掲示（LED・ランプ表示）
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
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
/* STOPボタン: 押せる列は青丸、停止済み・待機中は赤丸 */
function syncStopButtons() {
  document.querySelectorAll('.stop-btn').forEach((b, i) => {
    b.classList.toggle('ready', !!isReelSpinning && !!reelSpin && !reelSpin.order.includes(i));
  });
}
/* 画面の空気感: BIG中=赤金 / AT中=橙 / 通常時。body の data-mode で CSS を切り替える */
function syncModeTheme() {
  const m = bonusRun ? 'big' : (atGames > 0 || atEnding) ? 'at' : 'normal';
  if (document.body.dataset.mode !== m) document.body.dataset.mode = m;
}
function syncPanel() {
  syncStopButtons();
  syncModeTheme();
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
  plIds.wait.classList.toggle('on', reelLocked || isCounting || isSuspense || isRushing || isPushing || window.leverWaiting);
}
setInterval(syncPanel, 50);
document.querySelectorAll('.stop-btn').forEach(b => {
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    hideLastCount();   // STOP を押したら LAST カウントダウンは消す
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
  if (typeof updateAtGain === 'function') updateAtGain();
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
    Object.keys(roleStat).forEach(k => { roleStat[k] = 0; });
    replayPending = false;
    zenchoLeft = 0;
    czLeft = 0;
    fakeZencho = 0;
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
document.getElementById('reset-btn').addEventListener('click', resetData);

