// ==========================================
// JS/ext/urmode.js  —  裏モード
// CHANCE ZONE中、レバーONの前に下パネルのPUSHボタンを長押しすると ON/OFF が切り替わる。
// 切り替わると下パネルが点滅して知らせる (ON: 速い点滅を3回 / OFF: ゆっくり1回)。
// 裏モードON中は、当選フラグが入った瞬間に下パネルが必ず消える (抽選は flow.js の panelPlan)。
// ==========================================
(function () {
  const btn = document.getElementById('hw-push');
  const panel = document.querySelector('.cab-label');
  if (!btn || !panel) return;
  window.urMode = !!window.urMode;
  const HOLD_MS = 800;
  let timer = 0, blinkT = 0;
  /* CHANCE ZONE中・レバーONの前だけ切り替えられる (パネルが消灯中は不可) */
  const canToggle = () => !isDebugRun && czLeft > 0 && !bonusRun && !isReelSpinning && !isPushing && !isRushing && !isSuspense && !isAtResult &&
    !window.leverWaiting && !spinBtn.disabled && !panel.classList.contains('off');
  function blink(on) {
    clearTimeout(blinkT);
    panel.classList.remove('ur-on', 'ur-off');
    void panel.offsetWidth;
    panel.classList.add(on ? 'ur-on' : 'ur-off');
    blinkT = setTimeout(() => panel.classList.remove('ur-on', 'ur-off'), on ? 1000 : 1300);
    if (soundEnabled) {
      try {
        initAudio(); const t = audioCtx.currentTime;
        if (on) [660, 880, 1320].forEach((f, i) => tone(f, t + i * 0.12, 0.2, 'triangle', 0.12));
        else { tone(330, t, 0.3, 'triangle', 0.12); tone(220, t + 0.15, 0.4, 'triangle', 0.12); }
      } catch (e) { /* 音は無くても動く */ }
    }
  }
  function toggle() {
    window.urMode = !window.urMode;
    blink(window.urMode);
  }
  const clear = () => { clearTimeout(timer); timer = 0; };
  btn.addEventListener('pointerdown', () => {
    clear();
    if (!canToggle()) return;
    timer = setTimeout(() => { timer = 0; if (canToggle()) toggle(); }, HOLD_MS);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => btn.addEventListener(ev, clear));
  window.URMODE = { toggle, get on() { return !!window.urMode; } };   // デバッグ用
})();
