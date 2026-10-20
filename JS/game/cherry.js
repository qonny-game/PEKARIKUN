// ==========================================
// JS/game/cherry.js  —  チェリー
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* ---------- チェリー ---------- */
const cherryStatus = document.getElementById('cherry-status');
const cherryRemain = document.getElementById('cherry-remain');
function updateCherry() {
  if (!cherryStatus) return;
  cherryStatus.classList.toggle('on', cherryGames > 0 && window.SHOW_INTERNAL === true);   // 内部状態なので通常は表示しない
  cherryRemain.textContent = cherryGames;
}
const CHERRY_AT_CHOICES = [10, 20, 25, 30];
function pickCherryAtG() {
  const sum = CHERRY_AT_WEIGHTS.reduce((x, y) => x + y, 0);
  if (sum <= 0) return CHERRY_AT_CHOICES[0];
  let r = Math.random() * sum;
  for (let i = 0; i < CHERRY_AT_WEIGHTS.length; i++) {
    r -= CHERRY_AT_WEIGHTS[i];
    if (r < 0) return CHERRY_AT_CHOICES[i];
  }
  return CHERRY_AT_CHOICES[0];
}

/* チェリー/スイカの効果: 払い出し + 通常時は30G間ボーナス高確率 (内部) / AT中はPUSH → G数上乗せ
   strong: スイカ (AT中の上乗せが確定) */
/* 当選しやすい期間 (内部): 強い役ほど倍率が高い。重ねたときは強いほうの倍率を残し、期間は長いほうに揃える */
function setBoost(m, g) {
  if (cherryGames <= 0 || m >= cherryM) cherryM = m;
  cherryGames = Math.max(cherryGames, g);
  updateCherry();
}
function cherryEffects(inAT, strong, coins) {
  diffCoins += coins;
  setLedWin(coins);
  recordPoint();
  if (inAT) {
    if (strong || Math.random() < CHERRY_AT_SUCCESS) {
      const addG = scaleG(Math.round(pickCherryAtG() * AT_TYPES[atType].up));
      atEnding = false;     // 最終ゲームなら終了を取り消して延長
      pushReveal(`+${addG}G`, false, () => { atGames += addG; updateAT(); });
      return addG;
    }
  } else {
    setBoost(CHERRY_MULT, CHERRY_G);
    updateCherry();
  }
  return 0;
}
/* 弱/強の役: 払い出し・通常時の当選しやすさ(倍率/G数)・AT中の上乗せ成立率 */
const ROLE_INFO = BENEFITS.role;   // 役ごとの恩恵は JS/data/rules.js に集約
const CHERRY_STRONG_P = 0.12;   // チェリーのうち強の割合
const MELON_STRONG_P = 0.35;    // スイカのうち強の割合
const CHANCE_S_P = 0.0088, CHANCE_W_P = 0.0386;   // ハズレ目のうち強/弱チャンス目になる割合 (通常時のみ)
const SAND_REACH_P = 0.25;   // 通常時、ボーナス当選済み＆ランプ未点灯のゲームのうち、サンド目で止まる割合
let sandReachNow = false;     // このゲームがリーチ目（通常時）か
/* サンド目までの残りゲーム (AT中: スイカ・チェリー成立の次から3G以内) */
let sandLeft = 0;
const SAND_UP = BENEFITS.sand.upG;   // 揃えたときの上乗せG数 (どれか抽選)
/* サンド目が揃った瞬間: リール全体をビカビカ光らせる（光の点滅・虹色の縁・上昇音） */
function sandFlash() {
  if (!reelsEl) return;
  reelsEl.classList.remove('sand-flash');
  void reelsEl.offsetWidth;
  reelsEl.classList.add('sand-flash');
  setTimeout(() => reelsEl.classList.remove('sand-flash'), 1700);
  sandSound();
}
/* サンド目の音: ブシュー(蒸気) → ドゴドゴ(低い連打) → 上昇音 */
function sandSound() {
  if (!soundEnabled) return;
  initAudio();
  const c = audioCtx, t = c.currentTime;
  const len = Math.floor(c.sampleRate * 1.1), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  n.buffer = buf; f.type = 'highpass';
  f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(1800, t + 1.0);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
  n.connect(f); f.connect(g); g.connect(c.destination); n.start(t);
  [0.05, 0.19, 0.33, 0.5, 0.64, 0.78].forEach(dt => {
    const o = c.createOscillator(), og = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t + dt); o.frequency.exponentialRampToValueAtTime(42, t + dt + 0.16);
    og.gain.setValueAtTime(0.55, t + dt); og.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.2);
    o.connect(og); og.connect(c.destination); o.start(t + dt); o.stop(t + dt + 0.22);
  });
  [784, 988, 1319, 1568, 1976].forEach((fr, i) => tone(fr, t + 0.95 + i * 0.06, 0.2, 'square', 0.1));
}
/* サンド目: 第2リールを目押しで止める (バー・チェリー・バー)。揃えたら AT に上乗せ、外れは何も無し */
function playSand() {
  hideNavi();
  const N = SAND_UP[Math.floor(Math.random() * SAND_UP.length)];
  if (window.FXBanner) window.FXBanner('サンド目をそろえろ！！！', '', 'red', true, 1700);   // 液晶いっぱいにあおる
  reelsEl.classList.add('focus-mid');
  runRole('sand', res => {
    reelsEl.classList.remove('focus-mid');
    stopTension();
    if (res.success) {
      atGames += N;
      markWin([1, 4, 7], '');
      showAtToast(`サンド目 上乗せ +${N}G`);
      triggerFlash();
      sideLampFlash('heaven', 2000);   // 揃えたら虹色のランプ
      if (window.LCDX && LCDX.sandWin) LCDX.sandWin(N);   // 液晶も豪華に
    } else {
      missEffect();
    }
    updateAT();
    updateUI();
    maybeShowAtResult();
  });   // 中リールから止める。押し順ナビは出さない (左右は自動)
}
function roleEffects(role, inAT, paid = true) {
  const R = ROLE_INFO[role];
  const coins = paid ? R.coins() : BENEFITS.onMiss.coins;   // 取りこぼしは枚数だけ。恩恵はもらえる
  diffCoins += coins;
  setLedWin(coins);
  recordPoint();
  if (inAT) {
    if (R.atP() > 0 && Math.random() < R.atP()) {
      const addG = scaleG(Math.round(pickCherryAtG() * AT_TYPES[atType].up * R.upM));   // レア役ほど上乗せが多い
      atEnding = false;
      pushReveal(`+${addG}G`, false, () => { atGames += addG; updateAT(); });
    }
  } else if (R.m() > 0) {
    setBoost(R.m(), R.g);
  }
}
/* 役の実行: リールを回し、止まったら払い出し・演出。チェリー/強スイカは目押し成否あり */
function playRole(role, inAT) {
  const R = ROLE_INFO[role];
  const aimed = STOP_RULES.isAimedRole(role);
  const navi = null;   // チェリー・スイカの押し順ナビは無い
  runRole(role, res => {
    stopTension();
    const hit = !aimed || res.success;
    roleEffects(role, inAT, hit);   // 取りこぼしても恩恵(上乗せ・当選率UP)はもらえる。枚数だけ取りこぼす
    if (hit) showRoleBadge(R.label, R.coins(), R.notes, role); else missEffect();
    if (inAT && /^(melon|cherry)/.test(role)) sandLeft = 1 + Math.floor(Math.random() * 3);
    updateUI();
    maybeShowAtResult();
  }, navi);
}
/* 揃ったときの音: スイカ・チェリーは「期待」系 / チャンス目は「警告 + チャンス」系 */
function playRoleSound(role) {
  initAudio();
  const t = audioCtx.currentTime;
  const strong = role === 'cherryS' || role === 'melon' || role === 'chanceS';
  if (role === 'cherryW' || role === 'cherryS') {
    // きらきら駆け上がる期待音: 高音のアルペジオ + 鈴の倍音
    const up = strong ? [1047, 1319, 1568, 2093, 2637, 3136, 3951] : [1319, 1568, 2093, 2637];
    up.forEach((f, i) => { tone(f, t + i * 0.045, 0.22, 'triangle', 0.12); tone(f * 2.01, t + i * 0.045 + 0.01, 0.12, 'sine', 0.05); });
    tone(up[up.length - 1], t + up.length * 0.045 + 0.05, 0.5, 'sine', 0.1);
  } else if (role === 'melonW' || role === 'melon') {
    // じわっと膨らむ期待音: ゆっくり上がるグリッサンド + 和音のクレッシェンド
    const n = strong ? 16 : 10;
    for (let i = 0; i < n; i++) tone(392 * Math.pow(2, (i / n) * (strong ? 1.6 : 1.1)), t + i * 0.03, 0.09, 'triangle', 0.05 + i * 0.004);
    const c0 = t + n * 0.03;
    (strong ? [784, 988, 1175, 1568] : [784, 988, 1175]).forEach(f => { tone(f, c0, 0.55, 'triangle', 0.1); tone(f / 2, c0, 0.55, 'sine', 0.06); });
  } else if (role === 'chanceW' || role === 'chanceS') {
    // 警告のサイレン(2音を交互) → 不穏な低音 → チャンスを思わせる上昇音
    const rep = strong ? 4 : 2;
    for (let i = 0; i < rep * 2; i++) tone(i % 2 ? 622 : 880, t + i * 0.1, 0.1, 'square', 0.1);
    tone(65, t, 0.08 + rep * 0.2, 'sawtooth', 0.14);
    const c0 = t + rep * 0.2 + 0.05;
    (strong ? [523, 659, 784, 1047, 1319] : [523, 659, 784]).forEach((f, i) => tone(f, c0 + i * 0.08, 0.3, 'triangle', 0.12));
  }
}
function showRoleBadge(label, coins, notes, role) {
  bellBadge.textContent = label + (coins > 0 ? ` +${coins}` : '');
  bellBadge.classList.remove('show');
  void bellBadge.offsetWidth;
  bellBadge.classList.add('show');
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    if (role && /^(cherry|melon|chance)/.test(role)) playRoleSound(role);
    else notes.forEach((f, i) => tone(f, t + i * 0.06, 0.25, 'triangle', 0.14));
  }
}
const CHERRY_NOTES = [1319, 1760, 2349];

/* デバッグ用: 回さずに、止まった状態でチェリーを表示 */
function hitCherry(isDebugCall, inAT) {
  const g = gridOf(pickCombo('cherry'));
  showStatic(g, winIdxOf('cherry', g));
  if (!isDebugCall) cherryEffects(inAT, false, CHERRY_COINS);
  showRoleBadge('CHERRY', CHERRY_COINS, CHERRY_NOTES);
}

