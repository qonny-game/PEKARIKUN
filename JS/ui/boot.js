// ==========================================
// JS/ui/boot.js  —  起動時の初期化（iOS対策・画面スリープ防止）
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* iOS: ピンチ拡大と、連打によるダブルタップズームを禁止 */
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd < 350 && !(e.target.closest && e.target.closest('button, input, textarea, select, label'))) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });


/* ---------- 画面スリープ防止 (Wake Lock) ---------- */
(() => {
  let lock = null;
  async function acquire() {
    try {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || lock) return;
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } catch (e) { lock = null; /* 非対応・拒否は無視 */ }
  }
  acquire();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') acquire(); });
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, acquire, { passive: true }));
})();
