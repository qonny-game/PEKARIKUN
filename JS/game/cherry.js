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
const ROLE_INFO = {
  cherryW: { label: '弱チェリー',   coins: () => CHERRY_COINS, m: () => CHERRY_MULT, g: 15, upM: 1, atP: () => CHERRY_AT_SUCCESS, notes: [1319, 1760, 2349] },
  cherryS: { label: '強チェリー',   coins: () => CHERRY_COINS * 2, m: () => CHERRY_MULT * 2.5, g: 15, upM: 2, atP: () => 1, notes: [1319, 1760, 2349, 2637] },
  melonW:  { label: '弱スイカ',     coins: () => Math.max(1, MELON_COINS - 2), m: () => 2, g: 15, upM: 1.2, atP: () => 0.8, notes: [1047, 1319, 1568] },
  melon:   { label: '強スイカ',     coins: () => MELON_COINS, m: () => 4, g: 15, upM: 2.5, atP: () => 1, notes: [1047, 1319, 1568, 2093] },
  chanceW: { label: '弱チャンス目', coins: () => 0, m: () => 3, g: 8, upM: 1, atP: () => 0, notes: [523, 659, 784] },
  chanceS: { label: '強チャンス目', coins: () => 0, m: () => 8, g: 8, upM: 1, atP: () => 0, notes: [523, 659, 784, 1047, 1319] }
};
const CHERRY_STRONG_P = 0.12;   // チェリーのうち強の割合
const MELON_STRONG_P = 0.35;    // スイカのうち強の割合
const CHANCE_S_P = 0.0088, CHANCE_W_P = 0.0386;   // ハズレ目のうち強/弱チャンス目になる割合 (通常時のみ)
const SAND_REACH_P = 0.006;   // 通常時にサンド目（リーチ目）が出る割合。出たらボーナス確定
let sandReachNow = false;     // このゲームがリーチ目（通常時）か
/* サンド目までの残りゲーム (AT中: スイカ・チェリー成立の次から3G以内) */
let sandLeft = 0;
const SAND_UP = [5, 10, 15, 20, 25, 30, 50];   // 揃えたときの上乗せG数 (どれか抽選)
/* サンド目: 第2リールを目押しで止める (バー・チェリー・バー)。揃えたら AT に上乗せ、外れは何も無し */
function playSand() {
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
  }, naviFor('', 1));   // 中リールから押す。左右のリールは薄暗くして中リールに視線を集める
}
function roleEffects(role, inAT) {
  const R = ROLE_INFO[role];
  const coins = R.coins();
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
  const aimed = role === 'cherryW' || role === 'cherryS' || role === 'melon';
  const navi = inAT ? (role === 'melon' || role === 'cherryS' ? naviFor('purple', 0) : (role === 'cherryW' || role === 'melonW') ? naviFor('red', 0) : null) : null;   // 赤=レア / 紫=強レア
  runRole(role, res => {
    stopTension();
    if (!aimed || res.success) {
      roleEffects(role, inAT);
      showRoleBadge(R.label, R.coins(), R.notes);
      if (inAT && /^(melon|cherry)/.test(role)) sandLeft = 1 + Math.floor(Math.random() * 3);
    } else {
      missEffect();
    }
    updateUI();
    maybeShowAtResult();
  }, navi);
}
function showRoleBadge(label, coins, notes) {
  bellBadge.textContent = label + (coins > 0 ? ` +${coins}` : '');
  bellBadge.classList.remove('show');
  void bellBadge.offsetWidth;
  bellBadge.classList.add('show');
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    notes.forEach((f, i) => tone(f, t + i * 0.06, 0.25, 'triangle', 0.14));
  }
}
const CHERRY_NOTES = [1319, 1760, 2349];
const MELON_NOTES = [1047, 1319, 1568, 2093];

/* デバッグ用: 回さずに、止まった状態でチェリーを表示 */
function hitCherry(isDebugCall, inAT) {
  const g = gridOf(pickCombo('cherry'));
  showStatic(g, winIdxOf('cherry', g));
  if (!isDebugCall) cherryEffects(inAT, false, CHERRY_COINS);
  showRoleBadge('CHERRY', CHERRY_COINS, CHERRY_NOTES);
}

