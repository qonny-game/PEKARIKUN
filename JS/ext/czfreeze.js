// ==========================================
// JS/ext/czfreeze.js  —  CHANCE ZONE当選ゲームのまれな演出「フリーズ」
//   確定系の演出(下パネル消灯・白7スイカ白7・確定のサインなど)が1つも出ていない当選ゲームで、まれに起こる。
//   第2リールの停止ボタンが効かなくなる → 押してから3秒後に液晶がブツンと消えて真っ暗 → 2秒後に「BONUS確定」が出る。
//   抽選は flow.js (CZ_FREEZE_P)。ここは演出だけ。
// ==========================================
(function () {
  const stage = document.getElementById('lcd-stage');
  let st = null;   // { started, timers[] }

  function clearAll() { if (st) st.timers.forEach(clearTimeout); }

  function blackout() {
    if (!st || st.cut) return;
    st.cut = true;
    const F = document.createElement('div');
    F.className = 'lcd-freeze';
    if (stage) stage.appendChild(F);
    st.el = F;
    if (typeof soundEnabled !== 'undefined' && soundEnabled && typeof initAudio === 'function') {
      try {
        initAudio();
        const t = audioCtx.currentTime;
        tone(70, t, 0.18, 'square', 0.28);        // ブツン
        tone(1200, t, 0.03, 'square', 0.16);
        tone(48, t + 0.02, 0.5, 'sine', 0.3);
      } catch (e) { /* 音が出せなくても続ける */ }
    }
    // 真っ暗のまま約2秒: 「BONUS確定」(表示は呼び出しの0.4秒後) が出る頃に暗転を外す
    st.timers.push(setTimeout(() => { if (window.onCzSuccess) window.onCzSuccess(); }, 1600));
    st.timers.push(setTimeout(release, 2050));
  }

  function release() {
    const s = st;
    st = null;
    if (!s) return;
    clearAll.call(null);
    if (s.el) s.el.remove();
    // 第2リールがまだ回っていて、自動で止める設定のときは、ここから止める
    const auto = (typeof AUTOPLAY !== 'undefined' && AUTOPLAY) || (typeof AUTO_STOP !== 'undefined' && AUTO_STOP);
    if (auto) setTimeout(() => { if (reelSpin && reelSpin.cols[1] && reelSpin.cols[1].state === 'spin') stopCol(1, true); }, 900);
  }

  // 第2リール(中)の停止ボタンを無効にする。最初に押された(押そうとした)ときから数秒でブツン
  const _sc = stopCol;
  stopCol = function (c, auto) {
    if (st && c === 1 && reelSpin && reelSpin.cols[1] && reelSpin.cols[1].state === 'spin') {
      if (!st.started) {
        st.started = true;
        st.timers.push(setTimeout(blackout, 3000));
      }
      return;
    }
    return _sc.apply(this, arguments);
  };

  // 当選ゲームのレバーON時に flow.js から呼ばれる
  window.czFreezeArm = function () {
    if (st) clearAll();
    st = { started: false, cut: false, el: null, timers: [] };
    st.timers.push(setTimeout(() => { if (st && !st.started) { st.started = true; blackout(); } }, 9000));   // 押されなくても、そのうち起こる
  };
  window.CZFREEZE = { active: () => !!st };
})();
