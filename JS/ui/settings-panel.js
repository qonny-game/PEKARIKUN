// ==========================================
// JS/ui/settings-panel.js  —  確率設定パネル
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
// ==========================================
// 確率設定パネル
// ==========================================
const settingsModal = document.getElementById('settings-modal');
const settingsBody = document.getElementById('settings-body');
const displayRate = document.getElementById('display-rate');

const SETTING_ROWS = [
  { key: 'hitDenom', label: 'ボーナス当選確率 (1/N)', min: 1, max: 100000, step: 1, prefix: '1/' },
  { key: 'atEntryMin', label: 'AT突入率 ボーナス150枚', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'atEntryMax', label: 'AT突入率 ボーナス400枚', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'auraWhite', label: 'AT当選時にオーラ白のまま', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'bonusBellPay', label: 'ボーナス中のベル (枚/G)', min: 1, max: 400, step: 1, suffix: '' },
  { key: 'replay', label: 'リプレイ (ハズレのうち)', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'bellNormal', label: 'ベル揃い 通常時', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'bellAt', label: 'ベル揃い AT中', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'replayAt', label: 'リプレイ AT中', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'atHitMult', label: 'AT中のボーナス当選確率 (倍)', min: 0, max: 100, step: 0.01, suffix: '' },
  { key: 'atW50', label: 'AT比率: +50G (基本)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atW100', label: 'AT比率: +100G (稀)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atW200', label: 'AT比率: +200G (稀)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atW300', label: 'AT比率: +300G (ごく稀)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'bellStraight', label: '通常ベル比率: 直線 (6枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'bellDiagTL', label: '通常ベル比率: 斜め左上から (1枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'bellDiagBL', label: '通常ベル比率: 斜め左下から (15枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atBellStraight', label: 'AT中ベル比率: 直線 (6枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atBellDiagTL', label: 'AT中ベル比率: 斜め左上から (1枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'atBellDiagBL', label: 'AT中ベル比率: 斜め左下から (15枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherry', label: 'チェリー (ハズレのうち)', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'cherryMult', label: 'チェリー後の当選確率 (倍)', min: 0, max: 100, step: 0.1, suffix: '' },
  { key: 'cherryG', label: 'チェリー後の期間 (G)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherryAt', label: 'チェリー AT中 (ハズレのうち)', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'cherryAtSuccess', label: 'AT中チェリーの上乗せ率', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'cherryW10', label: 'チェリー上乗せ比率: +10G', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherryW20', label: 'チェリー上乗せ比率: +20G', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherryW25', label: 'チェリー上乗せ比率: +25G', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherryW30', label: 'チェリー上乗せ比率: +30G', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'cherryCoins', label: 'チェリーの払い出し (枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'melon', label: 'スイカ 通常時 (ハズレのうち)', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'melonAt', label: 'スイカ AT中 (ハズレのうち)', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'melonCoins', label: 'スイカの払い出し (枚)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW0', label: 'AT後の次回モード比率: 通常', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW1', label: '次回モード比率: 好調 (30G / 2倍)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW2', label: '次回モード比率: 絶好調 (40G / 4倍)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'modeW3', label: '次回モード比率: 天国 (50G / 8倍)', min: 0, max: 1000, step: 1, suffix: '' },
  { key: 'hintTrue', label: 'リザルト示唆の的中率', min: 0, max: 100, step: 0.1, suffix: '%' }
];

let formLevel = DEFAULT_LEVEL;   // 設定パネルで編集中の設定
let lvHist = [];                // 押す前の設定（デバッグを開いたとき、押す前の設定に戻すため）
const DEBUG_SEQ = [3, 2, 3, 3, 1, 2, 3];   // デバッグモードの合言葉（設定ボタンを押す順）
let secretBuf = [];             // 設定ボタンの押した順 (裏コマンド判定用)

function buildSettingsForm(level = formLevel, src = SETTINGS.profiles[level]) {
  formLevel = level;
  const rows = SETTING_ROWS.map(r => `
    <label class="set-row">
      <span class="set-label">${r.label}</span>
      <span class="set-field">${r.prefix || ''}<input type="number" data-key="${r.key}" min="${r.min}" max="${r.max}" step="${r.step}" value="${src[r.key]}">${r.suffix || ''}</span>
    </label>`).join('');
  const weights = TIER_LABELS.map((l, i) => `
    <label class="set-row">
      <span class="set-label">${l}枚</span>
      <span class="set-field"><input type="number" data-w="${i}" min="0" step="0.1" value="${src.weights[i]}"><span class="set-pct" data-pct="${i}"></span></span>
    </label>`).join('');
  const isSeven = SETTINGS.level === 7;
  const levels = [1, 2, 3, 4, 5, 6].map(l =>
    `<button type="button" data-level="${l}" class="${!SETTINGS.random && l === SETTINGS.level ? 'on' : ''}">設定${l}</button>`).join('')
    + `<button type="button" data-random="1" class="set-random ${SETTINGS.random ? 'on' : ''}">ランダム</button>`;
  const modes = PLAY_MODES.map((m, i) => `<button type="button" data-mode="${i}" class="${i === SETTINGS.mode ? 'on' : ''}">${m.name}</button>`).join('');
  const rateLine = SETTINGS.random ? '機械割 ---' : SETTINGS.level === 7 ? '' : `機械割 約${MODE_RATES[SETTINGS.mode][SETTINGS.level - 1]}%以上`;
  settingsBody.innerHTML = `
    <div class="set-modes">${modes}</div>
    <div class="set-levels">${levels}</div>
    <div class="set-note" style="margin:2px 0 8px">${rateLine}${SETTINGS.mode >= 2 ? ' / 当たりやすさ約2.5倍・出玉は半分' : ''}</div>
    <label class="set-row set-opt"><span class="set-label">リール停止を自動にする (目押しなし)</span><span class="set-field"><input type="checkbox" id="opt-auto"></span></label>
    ${isSeven ? `<div class="set-group">
      ${rows}
    </div>
    <div class="set-title">当選内訳 (比率。合計が100でなくても自動で換算)</div>
    <div class="set-group">
      ${weights}
      <div class="set-row set-total"><span class="set-label">合計</span><span class="set-field" id="set-total"></span></div>
    </div>` : ''}`;
  // 数値入力 (と適用ボタン) は設定7のときだけ
  const foot = document.querySelector('#settings-modal .modal-foot');
  if (foot) foot.style.display = isSeven ? '' : 'none';
  settingsBody.querySelectorAll('input[data-w]').forEach(el => el.addEventListener('input', refreshWeightPct));
  const optAuto = document.getElementById('opt-auto');
  optAuto.checked = AUTO_STOP;
  optAuto.addEventListener('change', () => { AUTO_STOP = optAuto.checked; saveOpt(); });
  settingsBody.querySelectorAll('button[data-mode]').forEach(el => el.addEventListener('click', () => setMode(+el.dataset.mode)));
  settingsBody.querySelectorAll('button[data-level]').forEach(el =>
    el.addEventListener('click', () => pressLevelButton(+el.dataset.level)));
  const rb = settingsBody.querySelector('button[data-random]');
  if (rb) rb.addEventListener('click', () => { secretBuf = []; setLevel(1 + Math.floor(Math.random() * 6), true); });
  if (isSeven) refreshWeightPct();
}

/* モードを切り替える (本気/極楽/遊本気/遊極楽)。設定1〜6の中身をそのモードの値に作り直す */
function setMode(m) {
  SETTINGS.mode = m;
  for (let l = 1; l <= 6; l++) SETTINGS.profiles[l] = JSON.parse(JSON.stringify(PROFILES_BY_MODE[m][l]));
  saveSettings();
  applySettings();
  refreshRateLabel();
  buildSettingsForm(SETTINGS.level);
}
/* 設定を切り替える (1〜7)。7は裏コマンドからのみ */
function setLevel(l, random = false) {
  if (SETTINGS.level !== 7) SETTINGS.prev = SETTINGS.level;
  SETTINGS.level = l;
  SETTINGS.random = random && l !== 7;
  if (l !== 7) SETTINGS.prev = l;
  saveSettings();
  applySettings();
  refreshRateLabel();
  buildSettingsForm(l);
}
function pressLevelButton(l) {
  if (secretBuf.length === 0) lvHist = [];
  lvHist.push({ l: SETTINGS.level, r: SETTINGS.random });
  secretBuf.push(l);
  if (secretBuf.length > SECRET_SEQ.length) { secretBuf.shift(); lvHist.shift(); }
  if (secretBuf.join() === DEBUG_SEQ.join() && window.toggleDebugMode) {   // デバッグモードの開閉。設定は押す前に戻す
    const b = lvHist[0];
    if (b && (b.l !== SETTINGS.level || b.r !== SETTINGS.random)) setLevel(b.l, b.r);
    secretBuf = []; lvHist = [];
    const on = window.toggleDebugMode();
    const mc = document.querySelector('#settings-modal [data-close-modal]'); if (mc) mc.click();
    if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; (on ? [880, 1175, 1568] : [1568, 1175, 880]).forEach((f, i) => tone(f, t + i * 0.08, 0.16, 'triangle', 0.12)); }
    return;
  }
  if (secretBuf.join() === SECRET_SEQ.join()) {
    setLevel(7);
    secretBuf = [];
    if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; [1047, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.08, 0.2, 'triangle', 0.14)); }
  } else {
    setLevel(l);
  }
}

function readWeightInputs() {
  return [...settingsBody.querySelectorAll('input[data-w]')].map(el => Math.max(0, parseFloat(el.value) || 0));
}

function refreshWeightPct() {
  const w = readWeightInputs();
  const total = w.reduce((x, y) => x + y, 0);
  w.forEach((v, i) => {
    settingsBody.querySelector(`[data-pct="${i}"]`).textContent = total > 0 ? `${(v / total * 100).toFixed(1)}%` : '-';
  });
  document.getElementById('set-total').textContent = total.toFixed(1);
}

function applySettingsForm() {
  const next = JSON.parse(JSON.stringify(SETTINGS.profiles[formLevel]));
  settingsBody.querySelectorAll('input[data-key]').forEach(el => {
    const v = parseFloat(el.value);
    if (Number.isFinite(v)) next[el.dataset.key] = Math.min(+el.max, Math.max(+el.min, v));
  });
  const w = readWeightInputs();
  if (w.reduce((x, y) => x + y, 0) > 0) next.weights = w;
  SETTINGS.profiles[formLevel] = next;
  saveSettings();
  applySettings();
  refreshRateLabel();
  closeModal(settingsModal);
}

function refreshRateLabel() {
  if (displayRate) displayRate.textContent = SETTINGS.random ? '---' : `1/${activeProfile().hitDenom}`;
}

