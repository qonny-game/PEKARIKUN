// ==========================================
// JS/ext/pushspoil.js  —  停止ボタンの右の常設PUSHボタン（先ばれ）
// 押すタイミングが合うと、液晶左右のサイドランプが虹色に光ってボーナス系が先ばれする。
//   先ばれのチャンス: ボーナス当選済み(ランプ未点灯)のゲーム / CHANCE ZONE成功のゲーム / BIG(PEKA CHANCE)中のオーラ上昇(LEVEL UP)・AT当選のゲーム
//   チャンスは本当に確定しているときだけ出る（ガセなし）。押すのが遅れると消える。
//   液晶のPUSH(演出)が出ているときは、そちらを押したことになる。
// ==========================================
(function () {
  const btn = document.getElementById('hw-push');
  if (!btn) return;
  let until = 0, kind = null;
  const SPAN = 9000;
  const arm = k => { kind = k; until = Date.now() + SPAN; };
  const armed = () => kind && Date.now() < until;

  // CHANCE ZONE成功 (ボーナス当選のゲーム)
  const _cz = window.onCzSuccess;
  if (typeof _cz === 'function') window.onCzSuccess = function () { if (!isDebugRun) arm('bonus'); return _cz.apply(this, arguments); };
  // 通常時: ボーナス当選済みでランプがまだ光っていないゲーム（ランプが先に光るゲームでは出ない）
  const _rr = runRole;
  runRole = function (k, done, navi) {
    if (!isDebugRun && k === 'lose' && pendingBonusType === 'BIG' && !isPekared && !window.pekaLit && !bonusRun && atGames === 0 && Math.random() < 0.6) arm('bonus');
    return _rr.apply(this, arguments);
  };
  // BIG(PEKA CHANCE)中: オーラ上昇(LEVEL UP)したとき、AT当選なら先ばれできる。それ以外のゲームでも時々
  const _au = playAuraUp;
  playAuraUp = function () {
    if (bonusRun && !bonusRun.zone && !bonusRun.debug && bonusRun.atWin) arm('levelup');
    return _au.apply(this, arguments);
  };
  const _bg = bonusGameMain;
  bonusGameMain = function () {
    if (bonusRun && !bonusRun.zone && !bonusRun.debug && bonusRun.atWin && Math.random() < 0.3) arm('at');
    return _bg.apply(this, arguments);
  };

  function press() {
    btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
    try { initAudio(); } catch (e) {}
    // 演出のPUSHが出ているときは、そちらを押す
    const po = document.getElementById('push-overlay');
    if (po && po.classList.contains('waiting') && typeof pushBtn !== 'undefined') { pushBtn.click(); return; }
    const lp = document.getElementById('lcd-push');
    if (lp && lp.classList.contains('ready')) { lp.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); return; }
    if (soundEnabled) { initAudio(); tone(196, audioCtx.currentTime, 0.1, 'square', 0.12); }
    if (!armed() || isDebugRun) return;
    kind = null;
    if (typeof sideLampFlash === 'function') sideLampFlash('heaven', 3200);   // 左右のランプが虹色に光る
    if (soundEnabled) { const t = audioCtx.currentTime + 0.12; [784, 988, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.3, 'triangle', 0.12)); }
  }
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); press(); });
  window.pushSpoilArm = arm;   // デバッグ用
})();
