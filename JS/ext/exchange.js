/* =========================================================
   換金 / PEKA POINT (exchange.js)  ※ trophy.js と同様、最後のほうに読み込む
   - 100枚 = 2 POINT。メダル(差枚数) -> POINT、POINT -> メダル のどちらにも交換できる
   - 自動でPOINTに交換する設定 (差枚数が100枚以上になった分を、ゲームの合間に交換)
   - POINT は localStorage に保存: データリセットやブラウザを閉じても消えない
   ========================================================= */
(() => {
  'use strict';
  const KEY = 'pekari-point-v1';
  const RATE_COINS = 100, RATE_POINT = 2;   // 100枚 = 2 POINT
  const D = { pt: 0, auto: false, total: 0 };
  try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); if (Number.isFinite(o.pt)) D.pt = Math.floor(o.pt); /* 0以下もある */ D.auto = !!o.auto; if (Number.isFinite(o.total)) D.total = Math.max(0, Math.floor(o.total)); } catch (e) { /* 初期値 */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* 無視 */ } };

  /* メダル -> POINT (n セット = 100枚ずつ) */
  function toPoint(sets) {
    const n = Math.max(0, Math.min(sets, Math.floor(diffCoins / RATE_COINS)));
    if (!n) return 0;
    diffCoins -= n * RATE_COINS; D.pt += n * RATE_POINT; D.total += n * RATE_POINT; save(); refresh();
    return n;
  }
  /* メダル補充: -2 POINT で 100枚。POINT は 0 以下になってもよい */
  function toMedal(sets) {
    const n = Math.max(0, Math.floor(sets));
    if (!n) return 0;
    D.pt -= n * RATE_POINT; diffCoins += n * RATE_COINS; save(); refresh();
    return n;
  }

  /* ---------- 画面 ---------- */
  const modal = document.createElement('div');
  modal.id = 'ex-modal'; modal.className = 'modal';
  modal.innerHTML = `<div class="modal-card">
    <div class="modal-head"><span>換金 / POINT</span><button type="button" data-ex-close aria-label="閉じる">&times;</button></div>
    <div class="ex-now"><div><em>差枚数</em><b id="ex-diff">0</b><i>枚</i></div><div><em>POINT</em><b id="ex-pt">0</b><i>P</i></div></div>
    <div class="ex-rate">100枚 = 2 POINT</div>
    <div class="ex-row"><button type="button" id="ex-m1">100枚 → 2P</button><button type="button" id="ex-mall">すべてPOINTへ</button></div>
    <div class="ex-row"><button type="button" id="ex-p1">100枚補充 (-2P)</button><button type="button" id="ex-p5">500枚補充 (-10P)</button></div>
    <label class="ex-auto"><input type="checkbox" id="ex-auto"><span>POINTへ自動交換 (差枚数が100枚以上になった分を、ゲームの合間に交換)</span></label>
    <div class="ex-note">POINT はデータリセットやブラウザを閉じても消えません。この端末のブラウザに保存されます。<br>ブラウザのサイトデータを削除すると消えます。<br>メダルの補充は 100枚 = -2 POINT。POINT は 0 以下にもなります。</div>
  </div>`;
  document.body.appendChild(modal);
  const $ = id => modal.querySelector('#' + id);
  const close = () => modal.classList.remove('open');
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-ex-close]')) close(); });
  $('ex-m1').addEventListener('click', () => toPoint(1));
  $('ex-mall').addEventListener('click', () => toPoint(1e9));
  $('ex-p1').addEventListener('click', () => toMedal(1));
  $('ex-p5').addEventListener('click', () => toMedal(5));
  $('ex-auto').addEventListener('change', e => { D.auto = e.target.checked; save(); if (D.auto) autoTick(); refresh(); });

  /* 下バーのメニューと、画面上部の差枚数の横の表示 */
  const anchor = document.getElementById('reset-btn');
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'ex-btn'; btn.className = 'mm-item';
  if (anchor) anchor.parentNode.insertBefore(btn, anchor);
  btn.addEventListener('click', () => { refresh(); modal.classList.add('open'); });
  /* ゲーム数などのカウンタの上: 累計 PEKA POINT と換金ボタン */
  const counter = document.querySelector('.data-counter');
  const ptView = document.createElement('div');
  ptView.id = 'ex-bar';
  ptView.innerHTML = '<span class="ex-bl">累計 PEKA POINT</span><b class="digital-font">0</b><i>P</i><button type="button" id="ex-bar-btn">換金</button>';
  if (counter) counter.parentNode.insertBefore(ptView, counter);
  ptView.querySelector('#ex-bar-btn').addEventListener('click', () => { refresh(); modal.classList.add('open'); });

  function refresh() {
    btn.innerHTML = `<span class="mm-label">換金 / POINT ${D.pt}P</span>`;
    ptView.querySelector('b').textContent = D.pt;
    $('ex-diff').textContent = (diffCoins >= 0 ? '+' : '') + diffCoins;
    $('ex-pt').textContent = D.pt;
    $('ex-auto').checked = D.auto;
    $('ex-m1').disabled = $('ex-mall').disabled = diffCoins < RATE_COINS;
  }

  /* 自動交換: ゲームの合間 (リール停止中・演出なし) に、100枚単位で */
  function autoTick() {
    if (!D.auto || diffCoins < RATE_COINS) return;
    if (isReelSpinning || isPushing || (typeof isRushing !== 'undefined' && isRushing) || (typeof isAtResult !== 'undefined' && isAtResult)) return;
    const n = toPoint(1e9);
    if (n && typeof tickDiff === 'function') { /* 表示はtickDiffが追従 */ }
  }
  setInterval(() => { autoTick(); if (modal.classList.contains('open')) refresh(); }, 700);
  refresh();
  window.EXCH = { D, toPoint, toMedal };   // 今後の交換先を増やすとき用の入口
})();
