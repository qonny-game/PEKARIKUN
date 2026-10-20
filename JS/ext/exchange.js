/* =========================================================
   換金 / PEKA MONEY (exchange.js)  ※ trophy.js と同様、最後のほうに読み込む
   - 100枚 = 2000 MONEY (1枚 = 20 MONEY)。メダル(差枚数) -> MONEY、MONEY -> メダル のどちらにも交換できる
   - 自動補充のみ行う: メダルが0枚になったら -1000M で 50枚。MONEY への自動交換(100枚=2000M)は行わない (1.37.15 で停止。交換は手動のみ)
   - MONEY は localStorage に保存: データリセットやブラウザを閉じても消えない
   - 旧 PEKA POINT (1P = 50枚相当 / 100枚 = 2P) の残高は、初回読み込み時に 1000倍して MONEY に移す
   ========================================================= */
(() => {
  'use strict';
  const KEY = 'pekari-money-v1';
  const OLD_KEY = 'pekari-point-v1';   // 旧 PEKA POINT の保存先 (移行元)
  const RATE_COINS = 100, RATE_MONEY = 2000;   // 100枚 = 2000 MONEY
  const OLD_TO_NEW = 1000;                     // 旧 2P = 新 2000 MONEY
  const D = { pt: 0, auto: false, total: 0 };
  let loaded = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const o = JSON.parse(raw || '{}');
      if (Number.isFinite(o.pt)) D.pt = Math.floor(o.pt); /* 0以下もある */
      D.auto = !!o.auto;
      if (Number.isFinite(o.total)) D.total = Math.max(0, Math.floor(o.total));
      loaded = true;
    }
  } catch (e) { /* 初期値 */ }
  if (!loaded) {   // 新しい保存先がまだ無い: 旧 PEKA POINT を移行
    try {
      const o = JSON.parse(localStorage.getItem(OLD_KEY) || '{}');
      if (Number.isFinite(o.pt)) D.pt = Math.floor(o.pt) * OLD_TO_NEW;
      D.auto = !!o.auto;
      if (Number.isFinite(o.total)) D.total = Math.max(0, Math.floor(o.total)) * OLD_TO_NEW;
    } catch (e) { /* 初期値 */ }
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* 無視 */ } };
  save();   // 移行した残高を新しい保存先に書いておく

  /* メダル -> MONEY (n セット = 100枚ずつ) */
  function toMoney(sets) {
    const n = Math.max(0, Math.min(sets, Math.floor(diffCoins / RATE_COINS)));
    if (!n) return 0;
    diffCoins -= n * RATE_COINS; D.pt += n * RATE_MONEY; D.total += n * RATE_MONEY; save(); refresh();
    return n;
  }
  /* メダル補充: -2000 MONEY で 100枚。MONEY は 0 以下になってもよい */
  function toMedal(sets) {
    const n = Math.max(0, Math.floor(sets));
    if (!n) return 0;
    D.pt -= n * RATE_MONEY; diffCoins += n * RATE_COINS; save(); refresh();
    return n;
  }

  /* ---------- 画面 ---------- */
  const modal = document.createElement('div');
  modal.id = 'ex-modal'; modal.className = 'modal';
  modal.innerHTML = `<div class="modal-card">
    <div class="modal-head"><span>換金 / PEKA MONEY</span><button type="button" data-ex-close aria-label="閉じる">&times;</button></div>
    <div class="ex-now"><div><em>差枚数</em><b id="ex-diff">0</b><i>枚</i></div><div><em>PEKA MONEY</em><b id="ex-pt">0</b><i>M</i></div></div>
    <div class="ex-rate">100枚 = 2000 MONEY (1枚 = 20 MONEY)</div>
    <div class="ex-row"><button type="button" id="ex-m1">100枚 → 2000M</button><button type="button" id="ex-mall">すべてMONEYへ</button></div>
    <div class="ex-row"><button type="button" id="ex-p1">100枚補充 (-2000M)</button><button type="button" id="ex-p5">500枚補充 (-10000M)</button></div>
    <div class="ex-note">PEKA MONEY はデータリセットやブラウザを閉じても消えません。この端末のブラウザに保存されます。<br>ブラウザのサイトデータを削除すると消えます。<br>メダルの補充は 100枚 = -2000 MONEY。MONEY は 0 以下にもなります。</div>
  </div>`;
  document.body.appendChild(modal);
  const $ = id => modal.querySelector('#' + id);
  const close = () => modal.classList.remove('open');
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-ex-close]')) close(); });
  $('ex-m1').addEventListener('click', () => toMoney(1));
  $('ex-mall').addEventListener('click', () => toMoney(1e9));
  $('ex-p1').addEventListener('click', () => toMedal(1));
  $('ex-p5').addEventListener('click', () => toMedal(5));

  /* 下バーのメニューと、画面上部の差枚数の横の表示 */
  const anchor = document.getElementById('reset-btn');
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'ex-btn'; btn.className = 'mm-item';
  if (anchor) anchor.parentNode.insertBefore(btn, anchor);
  btn.addEventListener('click', () => { refresh(); modal.classList.add('open'); });
  /* ゲーム数などのカウンタの上: 累計 PEKA MONEY と換金ボタン */
  const counter = document.querySelector('.data-counter');
  const ptView = document.createElement('div');
  ptView.id = 'ex-bar';
  ptView.innerHTML = '<span class="ex-bl">累計 PEKA MONEY</span><b class="digital-font">0</b><i>M</i><button type="button" id="ex-bar-btn">換金</button>';
  if (counter) counter.parentNode.insertBefore(ptView, counter);
  ptView.querySelector('#ex-bar-btn').addEventListener('click', () => { refresh(); modal.classList.add('open'); });

  function refresh() {
    btn.innerHTML = `<span class="mm-label">換金 / PEKA MONEY ${D.pt}M</span>`;
    ptView.querySelector('b').textContent = D.pt;
    $('ex-diff').textContent = (diffCoins >= 0 ? '+' : '') + diffCoins;
    $('ex-pt').textContent = D.pt;
    $('ex-m1').disabled = $('ex-mall').disabled = diffCoins < RATE_COINS;
  }

  /* 画面上部バーでMONEYの増減を目立たせる + トースト */
  const toastEl = document.createElement('div');
  toastEl.id = 'ex-toast';
  document.body.appendChild(toastEl);
  let toastT = 0;
  function notify(msg, up) {
    toastEl.textContent = msg; toastEl.classList.remove('show'); void toastEl.offsetWidth; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 3200);
    ptView.classList.remove('up', 'down'); void ptView.offsetWidth; ptView.classList.add(up ? 'up' : 'down');
    setTimeout(() => ptView.classList.remove('up', 'down'), 2200);
  }
  /* 自動補充だけ行う: メダル(50枚+差枚数)が0以下 -> 50枚補充(-1000M)。ゲームの合間だけ。
     100枚ごとの MONEY への自動交換は行わない (1.37.15 で停止。交換は手動のみ) */
  const REFILL_COINS = 50, REFILL_MONEY = 1000;
  function autoTick() {
    if (isReelSpinning || isPushing || (typeof isRushing !== 'undefined' && isRushing) || (typeof isAtResult !== 'undefined' && isAtResult)) return;
    if (50 + diffCoins <= 0) {
      D.pt -= REFILL_MONEY; diffCoins += REFILL_COINS; save(); refresh();
      notify('メダルが0枚になったので 50枚補充: -1000M', false);
    }
  }
  setInterval(() => { autoTick(); if (modal.classList.contains('open')) refresh(); }, 700);
  refresh();
  window.EXCH = { D, toMoney, toMedal };   // 今後の交換先を増やすとき用の入口
})();
