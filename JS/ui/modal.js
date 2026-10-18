// ==========================================
// JS/ui/modal.js  —  モーダル共通・版の表示
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
// ==========================================
// モーダル共通 / ボタン
// ==========================================
function openModal(m) { m.classList.add('open'); }
function closeModal(m) { m.classList.remove('open'); }

document.getElementById('settings-btn').addEventListener('click', () => { secretBuf = []; buildSettingsForm(SETTINGS.level); openModal(settingsModal); });
document.getElementById('settings-apply').addEventListener('click', applySettingsForm);
document.getElementById('settings-default').addEventListener('click', () => {
  buildSettingsForm(formLevel, PROFILES_BY_MODE[SETTINGS.mode][formLevel]);   // 入力欄だけ、この設定の初期値に戻す (適用を押すまで反映されない)
});
document.getElementById('graph-btn').addEventListener('click', () => { openModal(graphModal); drawGraphs(); });
document.querySelectorAll('[data-close-modal]').forEach(el =>
  el.addEventListener('click', () => closeModal(el.closest('.modal'))));
document.querySelectorAll('.modal').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) closeModal(m); }));
window.addEventListener('resize', () => { if (graphModal.classList.contains('open')) drawGraphs(); });
refreshRateLabel();

const versionEl = document.getElementById('app-version');
if (versionEl) versionEl.textContent = `v${APP_VERSION}`;
const cabVerEl = document.getElementById('cab-version');
if (cabVerEl) cabVerEl.textContent = `v${APP_VERSION}`;

