// ==========================================
// JS/ui/display.js  —  電光掲示（LED・ランプ表示）
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* UIデータ更新 */
/* クラスは状態が変わった時だけ書く（50msごとの同期で無駄な再描画を出さない） */
function setOn(el, cls, on) {
  if (el && el.classList.contains(cls) !== !!on) el.classList.toggle(cls, !!on);
}
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
  if (box) setOn(box, 'counting', s !== target);
  return s;
}
function tickDiff() {
  let s = ledShown.diff;
  if (diffCoins < s) s = diffCoins;
  else if (diffCoins > s) s = Math.min(diffCoins, s + Math.max(1, Math.ceil((diffCoins - s) / 5)));
  ledShown.diff = s;
  const txt = s >= 0 ? `+${s}` : `${s}`;
  if (displayDiff.textContent !== txt) displayDiff.textContent = txt;
  const cls = `digital-font font-bold text-sm ${diffCoins >= 0 ? 'text-green-400' : 'text-red-400'}`;
  if (displayDiff.className !== cls) displayDiff.className = cls;
}
/* STOPボタン: 押せる列は青丸、停止済み・待機中は赤丸 */
const STOP_BTNS = [...document.querySelectorAll('.stop-btn')];
function syncStopButtons() {
  STOP_BTNS.forEach((b, i) => setOn(b, 'ready', !!isReelSpinning && !!reelSpin && !reelSpin.order.includes(i)));
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
  setOn(plIds.insert, 'on', idle && !replayPending && !bonusRun);
  setOn(plIds.bet, 'on', isReelSpinning && !bonusRun && !isDebugRun);
  setOn(plIds.replay, 'on', replayPending);
  setOn(plIds.start, 'on', idle);
  setOn(plIds.wait, 'on', reelLocked || isCounting || isSuspense || isRushing || isPushing || window.leverWaiting);
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
// リールの段(リール・左右のモード表示)をタップしても、回転中ならリールが止まる (左から順に。ナビ等の順番指定があればその順)
const reelRowEl = document.querySelector('.cab-reelrow');
if (reelRowEl) reelRowEl.addEventListener('pointerdown', e => {
  if (!isReelSpinning) return;
  e.preventDefault();
  stopNextReel();   // 位置に関わらず左から順に止まる(押し順ナビなど順番指定があるときはその順番どおり)
});
// 画面のどこをタップしても、レバーON / リール停止ができる (ボタン・メニュー・モーダル・上部のデータ表示は除く。液晶とリール段は専用の処理)
document.addEventListener('pointerdown', e => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.closest('button, a, input, select, textarea, label, .modal, .more-menu, .data-counter, #gogo-box, #push-overlay, .at-result')) return;
  if (isReelSpinning && t.closest('.cab-reelrow')) return;   // リール段の回転中タップは専用の処理(押した位置のリールが止まる)
  if (document.querySelector('.modal.open')) return;
  const mm = document.getElementById('more-menu');
  if (mm && !mm.hidden) return;   // メニューを開いているときは、閉じるだけ
  if (isReelSpinning) { stopNextReel(); return; }
  if (!spinBtn.disabled) handleSpin();
});
// レバーボタン (リール停止エリアの左): タップでレバーON
const leverBtn = document.getElementById('lever-btn');
if (leverBtn) leverBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (isReelSpinning) { stopNextReel(); return; }
  if (!spinBtn.disabled) handleSpin();
});
// 長押し = 自動でレバーON・リール停止を繰り返す (連打の代わり)。指を離すと止まる。PUSHボタンなどは自動では押さない
(function () {
  let t0 = 0, t1 = 0;
  const HOLD_MS = 380, STEP_MS = 230;
  const stop = () => { clearTimeout(t0); clearInterval(t1); t0 = t1 = 0; };
  const step = () => {
    if (document.querySelector('.modal.open')) { stop(); return; }
    if (isPushing || isAtResult || window.leverWaiting) return;
    if (isReelSpinning) { stopNextReel(); return; }
    if (!spinBtn.disabled) handleSpin();
  };
  document.addEventListener('pointerdown', e => {
    stop();
    const t = e.target;
    if (!(t instanceof Element)) return;
    const play = t.closest('#gogo-box, .cab-reelrow, #lever-btn, .stop-btn');
    if (!play) {
      if (t.closest('button, a, input, select, textarea, label, .modal, .more-menu, .data-counter, #push-overlay, .at-result')) return;
      const mm = document.getElementById('more-menu');
      if (mm && !mm.hidden) return;
    }
    t0 = setTimeout(() => { step(); t1 = setInterval(step, STEP_MS); }, HOLD_MS);
  });
  ['pointerup', 'pointercancel', 'blur'].forEach(ev => (ev === 'blur' ? window : document).addEventListener(ev, stop));
})();
document.getElementById('reset-btn').addEventListener('click', resetData);

