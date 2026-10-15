// ==========================================
// JS/ui/more-menu.js  —  下部バーの歯車メニュー (オート設定・リール配列・確率設定・称号 など)
// ==========================================
(() => {
  const btn = document.getElementById('more-btn');
  const menu = document.getElementById('more-menu');
  if (!btn || !menu) return;
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    btn.setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu.addEventListener('click', () => setTimeout(close, 0));   // 項目を押したら閉じる
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();
