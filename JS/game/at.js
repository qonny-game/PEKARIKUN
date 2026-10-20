// ==========================================
// JS/game/at.js  —  AT（ペカラッシュ）・PUSH演出
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* ---------- AT ---------- */
const atStatus = document.getElementById('at-status');
const atRemain = document.getElementById('at-remain');
const atLabel = document.getElementById('at-label');
const atToast = document.getElementById('at-toast');

function updateAT() {
  if (!atStatus) return;
  if (bonusRun) {
    atStatus.classList.add('on', 'bonus');
    atLabel.textContent = bonusRun.zone ? 'ZONE' : 'BONUS';
    atRemain.textContent = String(Math.max(0, bonusRun.games - bonusRun.played)).padStart(2, '0');   // LAST 00G 表記
    const gainEl = document.getElementById('at-gain');   // ボーナス中の獲得枚数（右上）
    if (gainEl) { gainEl.textContent = bonusRun.paid; gainEl.parentNode.classList.add('has-gain'); }
    atStatus.classList.toggle('low', !bonusRun.zone && bonusRun.games - bonusRun.played <= 3);
    updateAtGrade();
    return;
  }
  atStatus.classList.remove('bonus');
  atStatus.classList.toggle('low', atGames > 0 && atGames <= 5);
  atStatus.classList.toggle('on', atGames > 0);
  atLabel.textContent = AT_TYPES[atType].name;
  atStatus.classList.toggle('heaven', atType === 1);
  atStatus.classList.toggle('death', atType === 2);
  atRemain.textContent = String(atGames).padStart(2, '0');   // LAST 00G 表記
  updateAtGain();
  updateAtGrade();
}
/* ATグレードの表示: デバッグ版(SHOW_INTERNAL)のときだけ。通常版は要素が無い/隠れたまま */
function updateAtGrade() {
  const el = document.getElementById('at-grade');
  if (!el) return;
  const on = window.SHOW_INTERNAL === true && atGames > 0 && !bonusRun && atGrade > 0;
  el.hidden = !on;
  if (on) el.textContent = `GRADE ${atGrade}`;
}
/* ペカラッシュ中の合計獲得枚数 */
function updateAtGain() {
  const el = document.getElementById('at-gain');
  if (!el) return;
  const on = !!atRun && !bonusRun && atGames > 0 && !atRun.bonusOnly;
  el.parentNode.classList.toggle('has-gain', on);
  if (on) el.textContent = (diffCoins - atRun.startDiff >= 0 ? '+' : '') + (diffCoins - atRun.startDiff);
}
function showAtToast(text) {
  if (!atToast) return;
  atToast.textContent = text;
  atToast.classList.remove('show', 'miss', 'advice');
  void atToast.offsetWidth;
  atToast.classList.add('show');
}
/* AT継続G数を比率から抽選: +50G (基本) / +100G・+200G・+300G (プレミア) */
const AT_CHOICES = [50, 100, 200, 300];
function pickAtGames() { return AT_CHOICES[weightedPick(AT_WEIGHTS)]; }

/* ---------- PUSHボタン演出: G数獲得時、PUSHを押すと「+10G」などがでかでかと出る ---------- */
const pushOverlay = document.getElementById('push-overlay');
const pushBtn = document.getElementById('push-btn');
const pushResult = document.getElementById('push-result');

function pushReveal(text, premium, onDone) {
  isPushing = true;
  if (window.hideGet) hideGet();   // 背面の「15枚 GET」は消す
  pushResult.textContent = text;
  // 虹色PUSH / 超特大PUSH: 100G以上の上乗せが確定しているときだけ出る(期待大のサイン)
  const num = parseInt(String(text).replace(/[^0-9]/g, ''), 10) || 0;
  const vc = (num >= 100 && !isDebugRun && Math.random() < 0.6) ? (Math.random() < 0.5 ? ' pv-rainbow' : ' pv-huge') : '';
  pushOverlay.className = 'push-overlay show waiting' + (premium ? ' premium' : '') + vc;
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    (vc ? [784, 988, 1319, 1568, 2093] : [988, 1319]).forEach((f, i) => tone(f, t + i * 0.09, vc ? 0.3 : 0.2, 'triangle', vc ? 0.18 : 0.14));
  }
  const handler = () => {
    pushBtn.removeEventListener('click', handler);
    rushOverlay.classList.remove('show', 'held', 'premium', 't-heaven', 't-death');
    pushOverlay.className = 'push-overlay show revealed' + (premium ? ' premium' : '');
    playPayoutSound(premium ? 6 : 3);
    playPayoutFanfare(premium ? 8 : 3);
    if (premium) { tripleFlash(); burstParticles('gold', 100); } else { triggerFlash(); burstParticles('gold', 40); }
    setTimeout(() => {
      pushOverlay.className = 'push-overlay';
      isPushing = false;
      if (onDone) onDone();
    }, premium ? 1300 : 900);
  };
  pushBtn.addEventListener('click', handler);
}

const rushOverlay = document.getElementById('rush-overlay');
const rushSub = document.getElementById('rush-sub');
const rushLines = rushOverlay.querySelectorAll('.rush-line');

/* AT突入 (PEKA RUSH!!!): 演出のあとPUSHボタン → 獲得G数をでかでかと表示 */
function startAT(games, typeId, superFlag) {
  atType = typeId !== undefined ? typeId : pickAtType();
  atSuper = !!superFlag;   // SUPER: 純増が多い
  atGrade = pickAtGrade(atType, atSuper);   // 内部グレード（上乗せの出やすさ）
  if (window.TRO && atType > 0) TRO.seen(atType === 1 ? 'heaven' : 'death');
  const T = AT_TYPES[atType];
  const base = Math.max(games || pickAtGames(), T.minG);
  const n = games ? base : scaleG(base);
  const premium = n >= 100 || atType > 0 || atSuper;   // +100G以上・HEAVEN/DEATH はプレミア演出
  atEnding = false;
  sinceEnd = null;
  if (!atRun) atRun = { startDiff: diffCoins, games: 0, bells: 0, bonuses: 0 };
  atRun.type = atType;
  atRun.super = atSuper;
  isRushing = true;
  rushSub.textContent = '';
  rushLines[0].textContent = atSuper ? 'PEKA RUSH' : T.line1;
  rushLines[1].textContent = atSuper ? (atType === 1 ? 'HEAVEN SUPER' : atType === 2 ? 'DEATH SUPER' : 'SUPER') : T.line2;
  rushOverlay.classList.remove('show', 'held', 'premium', 't-heaven', 't-death');
  if (atType > 0) rushOverlay.classList.add('t-' + T.id);
  void rushOverlay.offsetWidth;
  rushOverlay.classList.add('show');
  if (premium) rushOverlay.classList.add('premium');

  playGakoSound('gako');
  playPayoutSound(premium ? 6 : 4);
  playPayoutFanfare(premium ? 10 : 6);
  tripleFlash();
  if (premium) {
    burstParticles('mega', 160);
    startParticles('gold');
    shakeMain();
  } else {
    burstParticles('gold', 70);
  }

  const ms = premium ? 2200 : 1500;
  setTimeout(() => {
    rushOverlay.classList.remove('premium');
    rushOverlay.classList.add('held');   // ロゴはPUSHを押すまで出したまま (PUSHの背面に回す)
    stopParticles();
    mainEl.classList.remove('shake-main');
    isRushing = false;
    pushReveal(`+${n}G`, premium, () => {
      atGames += n;
      modeGames = 0;
      modeMult = 1;
      updateAT();
    });
  }, ms);
}

