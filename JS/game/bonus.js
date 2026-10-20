// ==========================================
// JS/game/bonus.js  —  ボーナス消化・押し順ナビ・ドンドンドン
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* ---------- ボーナス消化 (ATへのCZを兼ねる) ----------
   ボーナス枚数は、毎ゲーム揃うベルで少しずつ獲得する。
   消化中は画面の周りのオーラ色(白→青→黄→緑→赤→金→虹)でAT期待度を示す。
   ボーナス枚数が多いほどAT突入率が高い。一度も昇格しない白は逆に激アツ。 */
const AURA_NAMES = ['白', '青', '黄', '緑', '赤', '金', '虹'];
const AURA_WIN_W = [0, 8, 16, 22, 24, 20, 10];   // AT当選時の最終オーラ (白は auraWhite で別枠)
const AURA_LOSE_W = [2, 40, 28, 17, 9, 4, 0];    // AT非当選時の最終オーラ (虹は当選確定)
const auraEl = document.getElementById('aura');

function atEntryRateFor(coins, tier) {
  const lo = BIG_TIERS[0].coins, hi = BIG_TIERS[BIG_TIERS.length - 1].coins;
  // BIGは200枚固定。AT突入率は枚数ではなく「当選ランク(tier)」で決まる（高ランクほど虹オーラ・白7・SUPERが出やすい）
  const t = tier !== undefined ? Math.min(1, Math.max(0, tier / (BIG_TIERS.length - 1))) : Math.min(1, Math.max(0, (coins - lo) / (hi - lo)));
  return AT_ENTRY_MIN + (AT_ENTRY_MAX - AT_ENTRY_MIN) * t;
}
function pickAuraLevel(atWin, tier) {
  const k = tier || 0;   // 高ランクほど 白7(激アツ)・金・虹が出やすい
  if (atWin) return Math.random() < Math.min(0.5, AURA_WHITE * (1 + k * 0.6)) ? 0 : weightedPick(AURA_WIN_W.map((v, i) => i >= 5 ? v * (1 + k * 0.5) : v));
  return weightedPick(AURA_LOSE_W);
}
/* opts: {atWin, level, debug} (デバッグ用に結果を指定できる) */
/* ペカ!ペカ!マウンテン (AT中の当選): 5〜10G。ロゴの段階(0〜3)で上乗せの期待値が変わる */
const ZONE_G_CHOICES = [5, 10, 20, 30, 50, 100];
const ZONE_G_WEIGHTS = [[50, 30, 15, 5, 0, 0], [30, 30, 25, 12, 3, 0], [10, 20, 30, 25, 13, 2], [0, 5, 20, 30, 35, 10]];
function makeBonusPlan(coins, opts = {}) {
  const games = opts.zone ? 5 + Math.floor(Math.random() * 6) : Math.ceil(coins / BONUS_BELL_PAY);
  const up = opts.upgrade !== undefined ? opts.upgrade : (!!opts.reg && !opts.zone && !opts.debug && Math.random() < REG_UP_P);   // REG中にまれにBIGへ昇格（BONUS確定）
  const baseRate = atEntryRateFor(coins, opts.tier);
  const rate = baseRate >= 0.98 ? baseRate : Math.min(0.98, baseRate * THROUGH_MULT[Math.min(atThrough, THROUGH_MULT.length - 1)]);   // スルーするほどAT突入率UP（3スルーで3倍）
  const atWin = up ? false : (opts.atWin !== undefined ? opts.atWin : Math.random() < rate);   // 昇格する場合、このREG自体はAT非当選（BIGのほうでAT抽選）
  const level = Math.min(games, opts.level !== undefined ? opts.level : pickAuraLevel(atWin, opts.tier));
  // 昇格するゲームをランダムに決める (最終オーラ = 昇格した回数)
  const pool = Array.from({ length: games }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const promo = pool.slice(0, level).sort((a, b) => a - b);
  return { total: coins, paid: 0, games, played: 0, atWin, level, promo, aura: 0, debug: !!opts.debug, zone: !!opts.zone, reg: !!opts.reg, upgrade: up, superP: opts.superP !== undefined ? opts.superP : Math.min(0.5, 0.06 + 0.07 * (opts.tier || 0)), upAt: 1 + Math.floor(Math.random() * Math.max(1, games - 1)), zoneG: 0,
    zlv: opts.zlv !== undefined ? opts.zlv : weightedPick(AT_TYPES[atType].zlv), zonePay: Math.ceil(coins / games) };
}
function setAura(level, pop) {
  if (level === null) { auraEl.className = 'aura'; return; }
  auraEl.className = `aura on lv${level}`;
  if (pop) { void auraEl.offsetWidth; auraEl.classList.add('pop'); }
}
function playAuraUp(level) {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  const base = 523 * Math.pow(1.0595, level * 2);
  [0, 4, 7].forEach((st, i) => tone(base * Math.pow(1.0595, st), t + i * 0.07, 0.3, 'triangle', 0.14));
  if (level >= 5) [0, 4, 7, 12].forEach((st, i) => tone(base * 2 * Math.pow(1.0595, st), t + 0.25 + i * 0.07, 0.35, 'sine', 0.12));
}

/* PEKA CHANCE! ロゴ: ボーナス消化の開始から、最終ゲーム(ジャッジメント)の結果まで */
const chanceLogo = document.getElementById('chance-logo');
function setZoneLogoLevel(lv) {
  if (!chanceLogo) return;
  chanceLogo.classList.remove('z0', 'z1', 'z2', 'z3');
  chanceLogo.classList.add('z' + lv);
}
function showChance(zone, zlv) {
  if (!chanceLogo) return;
  chanceLogo.querySelector('.cl-peka').innerHTML = zone ? 'PEKA<br>PEKA' : 'PEKA';
  chanceLogo.querySelector('.cl-chance').textContent = zone ? 'MOUNTAIN!' : 'CHANCE!';
  chanceLogo.classList.toggle('zone', !!zone);
  if (zone) setZoneLogoLevel(zlv || 0);
  chanceLogo.classList.remove('on', 'judge');
  void chanceLogo.offsetWidth;
  chanceLogo.classList.add('on');
  if (!zone) playVoice('chance');   // CHANCE! の声
  else if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.06, 0.28, 'sawtooth', 0.07));
    tone(130, t, 0.4, 'sine', 0.2);
  }
  triggerFlash();
  if (!zone) showChanceIntro();
}
/* PEKA! CHANCE! の初回表示: 画面いっぱいにどでかく */
function showChanceIntro() {
  if (window.TRO) TRO.seen('chance_intro');
  let el = document.getElementById('chance-intro');
  if (!el) {
    el = document.createElement('div');
    el.id = 'chance-intro';
    el.className = 'chance-intro';
    el.innerHTML = '<span class="ci-1">PEKA!</span><span class="ci-2">CHANCE!</span>';
    (document.getElementById('lcd-stage') || document.body).appendChild(el);
  }
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}
/* ラスト3G: どでかいカウントダウン (3 → 2 → 1) */
function showLastCount(n) {
  if (window.TRO && n === 3) TRO.seen('last_count');
  let el = document.getElementById('chance-count');
  if (!el) {
    el = document.createElement('div');
    el.id = 'chance-count';
    el.className = 'chance-count';
    el.innerHTML = '<span class="cc-n"></span><span class="cc-s">LAST</span>';
    (document.getElementById('lcd-stage') || document.body).appendChild(el);   // 液晶の中に出す
  }
  el.querySelector('.cc-n').textContent = n;
  el.dataset.n = n;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  if (chanceLogo) chanceLogo.classList.add('counting');
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    tone(220 / n, t, 0.35, 'sine', 0.3);
    tone(660 + (4 - n) * 220, t, 0.12, 'square', 0.1);
  }
}
function hideLastCount() {
  const el = document.getElementById('chance-count');
  if (el) el.classList.remove('on');
  if (chanceLogo) chanceLogo.classList.remove('counting');
}
function hideChance() { if (chanceLogo) chanceLogo.classList.remove('on', 'judge', 'counting'); hideLastCount(); }

function beginBonus(plan) {
  bonusRun = plan;
  pendingZone = false;
  showChance(plan.zone, plan.zlv);
  if (plan.zone && window.TRO) TRO.seen('zone');
  sinceEnd = null;
  // ボーナス開始からリザルトまでの獲得枚数を数える
  if (!atRun && !plan.debug) atRun = { startDiff: diffCoins, games: 0, bells: 0, bonuses: 0 };
  if (!plan.zone) setAura(0);
  updateAT();
}

/* ---------- 押し順ナビ (ボーナス中: 1→2→3 の順に押すとベルが揃う) ---------- */
const naviEl = document.getElementById('navi');
let naviOrder = null;   // 例: [1, 2, 0] = 中→右→左の順に止める
let naviPartial = false;   // 1だけナビ: 最初に押すリールだけ表示 (残りは自由)
/* 赤・紫のナビ = レアが揃うサイン。警告音で知らせる */
function rareWarn(style) {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  if (style === 'purple') {
    // 紫(強レア): 低い和音がせり上がって重く鳴る
    [220, 277, 330].forEach(f => tone(f, t, 0.9, 'sawtooth', 0.09));
    [440, 554, 659].forEach(f => tone(f, t + 0.45, 0.7, 'sawtooth', 0.1));
    tone(65, t, 1.2, 'sine', 0.3);
  } else {
    // 赤(弱レア): 高い単音を2回、短く鋭く
    for (let i = 0; i < 2; i++) tone(1175, t + i * 0.2, 0.16, 'square', 0.1);
  }
}
let naviVoiceIdx = -1;   // 押し順ボイス: 次に鳴らす番号 (止めるたびに次のリールの声)
function naviVoice(c) { playVoice(['left', 'center', 'right'][c]); }
function showNavi(order, style = '', partial = false, seven = false) {
  naviVoiceIdx = 0; naviVoice(order[0]);
  if (style === 'red' || style === 'purple') rareWarn(style);
  document.body.dataset.navi = style || 'y';
  naviOrder = order;
  naviPartial = !!partial;
  naviEl.className = 'navi on ' + style + (partial ? ' partial' : '');     // red: チェリー / purple: スイカ (上乗せ確定)
  const sevenNavi = !!seven && atSuper && atGames > 0 && !bonusRun;   // SUPERのベルのナビだけ。レア役・サンド目は 1-2-3 のまま   // SUPER中: 第1停止の「1」を7の画像に（色もいろいろ）
  const sevenImg = () => { const k = SEVENS[Math.floor(Math.random() * SEVENS.length)]; return `<img class="navi-7" src="${SYM_IMG[k] || ASSET_DIR.img + k + '.png'}" alt="1">`; };
  [...naviEl.children].forEach((el, c) => {
    el.textContent = partial ? (c === order[0] ? '1' : '') : (order.indexOf(c) + 1) + (style === 'purple' ? '!' : '');
    if (sevenNavi && c === order[0]) el.innerHTML = sevenImg();
    el.className = '';
  });
  refreshNavi();
  spinBtn.dataset.navi = (partial ? [order[0]] : order).map(c => ['左', '中', '右'][c]).join('→');
}
function refreshNavi() {
  if (!naviOrder || !naviEl) return;
  const done = reelSpin ? reelSpin.order : [];
  if (isReelSpinning && !naviPartial && done.length > 0 && done.length < 3 && done.length > naviVoiceIdx) { naviVoiceIdx = done.length; naviVoice(naviOrder[done.length]); }   // 1つ止めるたびに、次に押すリールを声で知らせる
  [...naviEl.children].forEach((el, c) => {
    el.classList.toggle('done', done.includes(c));
    el.classList.toggle('next', !done.includes(c) && naviOrder[done.length] === c && (!naviPartial || done.length === 0));
  });
}
function hideNavi() { delete document.body.dataset.navi; naviOrder = null; naviPartial = false; if (naviEl) naviEl.className = 'navi'; }
function sameOrder(a, b) { return !!a && a.length === b.length && a.every((v, i) => v === b[i]); }

/* ドンドンドン!: 画面が揺れた回数で期待度を示す。3回揺れたら発展 (ボーナス中は次のオーラ昇格のサイン) */
/* ドンドンドン: 液晶の外の揺れではなく「停止ボタンごとに1回ドン」。第1停止から連続でドンが出て、
   第3停止でもドンが出れば成功(発展)。途中で止まったらそこまで。ここでは予定(n回)を仕込むだけで、実際は停止のたびに donStop が鳴らす */
function donShake(n, done) {
  if (window.TRO) TRO.seen('don' + Math.min(3, n));
  window.donArm = { n, end: false, normal: !bonusRun };
  setTimeout(done, 0);
}
function donStop(k, plan) {
  const d = window.donArm;
  if (!d) return;
  if (k >= 3) window.donArm = null;
  if (k > d.n) {
    return;
  }
  const el = document.createElement('div');
  el.className = 'don-pop';
  el.textContent = 'DON';
  el.style.setProperty('--i', k);
  (document.getElementById('lcd-stage') || document.body).appendChild(el);
  setTimeout(() => el.remove(), 600);
  shakeMain(300);
  if (soundEnabled) { initAudio(); thump(audioCtx.currentTime, 0.7 + k * 0.12); }
  if (k === 3 && d.n >= 3) {
    showAtToast('発展');
    triggerFlash();
    if (soundEnabled) { initAudio(); [523, 659, 784, 1047].forEach((f, q) => tone(f, audioCtx.currentTime + q * 0.06, 0.25, 'square', 0.1)); }
    if (d.normal && window.LCDX && LCDX.donWin) LCDX.donWin(plan && plan.role);
  }
}
/* BIG(PEKA CHANCE)中のレア役: 弱=オーラ1段UP / 強=2段UP。AT当選の期待も上がる */
function bonusRare(b) {
  const strong = Math.random() < 0.3, n = strong ? 2 : 1;
  const name = strong ? ['強チェリー', '強スイカ'][Math.floor(Math.random() * 2)] : ['弱チェリー', '弱スイカ'][Math.floor(Math.random() * 2)];
  b.aura = Math.min(6, b.aura + n);
  if (b.aura >= 6) b.atWin = true;   // 虹オーラはAT確定 (レア役で虹になってもAT非当選にならない)
  setAura(b.aura, true);
  if (!b.confirmShown) playAuraUp(b.aura);
  if (!b.atWin && Math.random() < 0.15 * n) b.atWin = true;
  if (window.LCDX && !b.confirmShown) { LCDX.say(name, strong ? 'LEVEL UP x2!!' : 'LEVEL UP!', 1800, 'happy', 'jump'); LCDX.tag(strong ? 'オーラ 2段階UP' : 'オーラ UP', strong ? 'f3' : 'f2', 1800); }
  if (strong) triggerFlash();
}
/* BIG中のサンド目: 揃えたら一発でPEKA RUSH確定。SUPERも優遇 */
function bonusSand(b) {
  if (window.FXBanner) window.FXBanner('サンド目をそろえろ！！！', '', 'red', true, 1700);
  reelsEl.classList.add('focus-mid');
  runRole('sand', res => {
    reelsEl.classList.remove('focus-mid');
    stopTension();
    if (res.success) {
      b.atWin = true; b.superP = 0.7; b.aura = 6;
      setAura(6, true); playAuraUp(6);
      markWin([1, 4, 7], '');
      triggerFlash();
      sideLampFlash('heaven', 2000);
      if (window.LCDX) { LCDX.say('サンド目!!', '', 2600, 'happy', 'jump'); }
    } else missEffect();
    updateAT(); updateUI();
  });   // 押し順ナビは出さない (中リールから止める)
}
const BONUS_RARE_P = 0.12, BONUS_SAND_P = 0.05;
/* JUDGEMENT最終G: 「レバーを叩け！！！」の文字色で期待度が分かる（白=通常 / 赤=80%以上 / 金=96%以上でAT性能が良い / 虹=AT確定で性能最高） */
function judgeColor(b) {
  b.superRoll = Math.random() < (b.superP || 0);
  b.atTypeRoll = pickAtType();
  if (b.atWin && b.superRoll && b.aura >= 5) { b.atTypeRoll = Math.max(1, b.atTypeRoll); return 'rainbow'; }
  if (b.atWin && (b.superRoll || b.atTypeRoll > 0)) return 'gold';
  if (!b.atWin) return Math.random() < 0.06 ? 'red' : 'white';
  return b.aura >= 3 ? 'red' : 'white';
}
function bonusGame() {
  const b = bonusRun;
  if (b.leverWait) { b.leverWait = false; if (window.LCDX && LCDX.leverCallOff) LCDX.leverCallOff(); bonusGameMain(); return; }   // 叩かれた: 最終Gのリール回転へ
  if (!b.zone && !b.debug && !b.sandDone && b.played + 1 < b.games && Math.random() < BONUS_SAND_P) { b.sandDone = true; bonusSand(b); return; }
  if (!b.zone && !b.debug && b.atWin && !b.panelDone && Math.random() < PANEL_P_CHANCE) { window.panelPlan = 'chance'; b.panelDone = true; }   // 1回のボーナスで最大1回(レア演出)
  //   // 下パネル消灯 = RUSH突入(JUDGEMENT勝利)確定
  // ドンドンドン!: 昇格するゲームほど多く揺れる (ガセもある)
  const promo = !b.zone && b.promo.includes(b.played + 1);
  const don = weightedPick(promo ? [0, 0, 0, 100] : [80, 12, 8, 0]);   // 昇格するゲームは必ず第3停止までドンが続く / 昇格しないゲームは1〜2回で止まる
  if (don > 0 && !b.debug) {
    spinBtn.disabled = true;
    donShake(don, () => { spinBtn.disabled = false; bonusGameMain(); });
    return;
  }
  bonusGameMain();
}
/* JUDGEMENT直前: 演出を順番に1つずつ見せる(約5秒)。この間はレバー・リールは動かない
   0.0s JUDGEMENT文字 + 鼓動 / 1.8s 「勝てばRUSH」 / 3.4s 現在のオーラ / 5.0s リール回転 */
function judgeIntro(b, cb) {
  isSuspense = true;
  hideNavi();
  hideLastCount();
  if (window.TRO) TRO.seen('judge');
  startTension('JUDGEMENT');
  if (chanceLogo) chanceLogo.classList.add('judge');
  if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; tone(110, t, 1.4, 'sawtooth', 0.14); tone(165, t + 0.1, 1.2, 'sawtooth', 0.08); }
  setTimeout(() => playTick(2), 1200);
  setTimeout(() => { if (window.LCDX) LCDX.tag(`現在 ${AURA_NAMES[Math.min(6, b.aura)]}オーラ`, b.aura >= 4 ? 'f3' : 'f1', 1500); playTick(3); shakeMain(200); }, 2300);
  setTimeout(() => { isSuspense = false; cb(); }, 3500);
}
/* REG中のBIG昇格: BONUS確定画面を出す（ボーナス終了後にGOGO!ランプ→7揃え） */
function regUpgradeShow() {
  if (window.onCzSuccess) { window.onCzSuccess(); setTimeout(() => { if (window.czKeepClear) czKeepClear(); }, 4200); }
  triggerFlash();
}
function startUpgradeBig() {
  pendingBonusType = 'BIG'; pendingReg = false; pendingZone = false;
  pendingDisplayIndex = pickTierIndex(); pendingTierIndex = pendingDisplayIndex; pendingPlan = null; replayPending = false; pekaSpecial = null;
  window.pekaAt = 'end'; window.pekaLit = false; window.sideAt = null; window.sideGogo = false;
  isPekared = false; isBonusAligned = false; alignStage = 0;
  triggerPekari();
  if (window.onSevenHint) setTimeout(() => { if (!window.czKeep && isPekared && !isBonusAligned) window.onSevenHint(); }, 1800);   // 揃えるまで、狙う7を液晶に出しておく
}
function bonusGameMain() {
  const b = bonusRun;
  if (!b.zone && !b.debug && b.played + 1 >= b.games && !b.judgeDone) { b.judgeDone = true; judgeIntro(b, () => { b.leverWait = true; spinBtn.disabled = false; if (window.LCDX && LCDX.leverCall) LCDX.leverCall(judgeColor(b)); else { b.leverWait = false; bonusGameMain(); } }); return; }
  playClickSound();
  setLedWin(0);
  const isFinal = !b.zone && b.played + 1 >= b.games;   // 最終ゲームはジャッジメント (ここでATの当否が決まる)
  const navi = [0, 1, 2].sort(() => Math.random() - 0.5);   // 押し順ナビ
  const partial = Math.random() < 0.3;                       // 1だけナビ (最初の1つだけ表示)
  showNavi(navi, '', partial);
  if (partial && window.TRO) TRO.seen('navi_partial');
  if (!b.zone && b.games - b.played <= 3 && !isFinal) showLastCount(b.games - b.played); else hideLastCount();
  if (isFinal && !judgeEl.classList.contains('tense')) { startTension('JUDGEMENT'); if (chanceLogo) chanceLogo.classList.add('judge'); }   // デバッグ時や押し順ミスのやり直し時(通常は judgeIntro で表示済み)
  updateAT();
  if (!b.zone && !b.debug && !b.wmDone && ((b.atWin && !b.reg) || (b.reg && b.upgrade && b.played + 1 >= b.upAt)) && Math.random() < 0.12) { window.wmNext = true; b.wmDone = true; }   // 白7・スイカ・白7: AT当選確定 / REG中はBIG昇格確定
  if (isFinal && !b.debug && !isDebugRun && !b.judgeStarted && window.LCDX && LCDX.judgeReveal) {   // レバーON直後(リールが回り出すと同時)に判定。リールを止める前に結果を出す
    b.judgeStarted = true; b.judgeRunning = true;
    setTimeout(() => LCDX.judgeReveal(b.atWin, () => {
      b.judgeRunning = false; b.judgeShown = true;
      if (b.judgeWaitFinish) { const f = b.judgeWaitFinish; b.judgeWaitFinish = null; f(); }
    }), 250);
  }
  runRole('bell2', res => {
    hideNavi();
    // 押し順を間違えた: ベルこぼし (1枚だけ。ゲーム数は消化されない)
    if (!AUTO_STOP && !(partial ? res.order[0] === navi[0] : sameOrder(res.order, navi))) {
      const pay1 = Math.max(0, Math.min(1, b.total - b.paid - 1));
      b.paid += pay1;
      if (!b.debug && pay1) { diffCoins += pay1; recordPoint(); }
      setLedWin(pay1);
      if (isFinal) { stopTension(); if (chanceLogo) chanceLogo.classList.remove('judge'); }
      missEffect();
      updateAT();
      updateUI();
      return;
    }
    b.played++;
    if (!b.zone && !b.debug && b.played < b.games && Math.random() < BONUS_RARE_P) bonusRare(b);
    if (b.upgrade && !b.upShown && b.played >= b.upAt && !b.debug) { b.upShown = true; regUpgradeShow(); }
    // ゾーンは5〜10Gで枚数を均等に払い出し、最終ゲームで残りを払う
    const pay = b.zone
      ? (b.played >= b.games ? b.total - b.paid : Math.min(b.zonePay, b.total - b.paid))
      : Math.min(BONUS_BELL_PAY, b.total - b.paid);
    b.paid += pay;
    if (!b.debug) {
      diffCoins += pay;
      recordPoint();
    }
    setLedWin(pay);
    if ((pay > 0 || !b.zone) && !(!b.zone && b.played >= b.games)) showBellResult(pay, true);   // 最終G(ジャッジメント)は「枚 GET」を出さない（PAYOUTだけ）
    if (b.promo.includes(b.played)) {
      b.aura = Math.min(6, b.aura + 1);
      if (b.aura >= 6) b.atWin = true;   // 虹オーラはAT確定
      setAura(b.aura, true);
      if (!b.confirmShown) playAuraUp(b.aura);
      if (b.aura >= 4 && !b.confirmShown) triggerFlash();
    }
    updateAT();
    updateUI();
    if (b.zone) {
      // ペカ!ペカ!マウンテン: リールを止めるたびにPUSHで +5G〜+100G を上乗せ。ロゴが昇格すると期待値アップ
      if (b.zlv < 3 && Math.random() < 0.14) {
        b.zlv++;
        setZoneLogoLevel(b.zlv);
        playAuraUp(b.zlv + 2);
        triggerFlash();
      }
      const g = scaleG(Math.round(ZONE_G_CHOICES[weightedPick(ZONE_G_WEIGHTS[b.zlv])] * AT_TYPES[atType].zg));
      b.zoneG += g;
      const last = b.played >= b.games;
      pushReveal(`+${g}G`, g >= 50, () => {
        if (!b.debug) atGames += g;
        atEnding = false;
        updateAT();
        if (last) finishZone(b);
      });
      return;
    }
    if (b.paid >= b.total) {
      finishBonus();
    } else if (!b.zone) {
      // 残りが少ないときの演出: 残り枚数を表示。次がジャッジメント
      const rem = b.games - b.played;
      if (rem <= 3) {
        showAtToast(rem === 1 ? 'NEXT JUDGEMENT' : `REMAIN ${b.total - b.paid}`);
        playTick(4 - rem);
      }
    }
  });
}

/* 全ゲーム消化: 鼓動のあと、AT突入かどうかを見せる */
/* 上乗せ特化ゾーン終了: ゾーン中に貯めたG数をATに上乗せ (PUSHで表示) */
function finishZone(b) {
  bonusRun = null;
  hideChance();
  updateAT();
  showZoneEnd(b.zoneG);
}
/* ZONE END: ゾーンで上乗せした合計ゲーム数を、でかでかとカウントアップ表示 */
function showZoneEnd(total) {
  let el = document.getElementById('zone-end');
  if (!el) {
    el = document.createElement('div');
    el.id = 'zone-end';
    el.className = 'zone-end';
    el.innerHTML = '<span class="ze-t">ZONE END</span><span class="ze-n"><i>+</i><b>0</b><em>G</em></span><span class="ze-s"></span>';
    (document.getElementById('lcd-stage') || document.body).appendChild(el);
  }
  const num = el.querySelector('.ze-n b');
  el.dataset.rank = total >= 100 ? 3 : total >= 50 ? 2 : total >= 20 ? 1 : 0;
  el.querySelector('.ze-s').textContent = `AT 残り ${atGames} G`;
  num.textContent = '0';
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  if (window.FX) FX.hold(3600);
  const t0 = performance.now(), dur = 1100;
  const frame = now => {
    const p = Math.min(1, (now - t0) / dur);
    num.textContent = Math.round(total * (1 - Math.pow(1 - p, 3)));
    if (soundEnabled && audioCtx && p < 1 && Math.floor(p * 24) !== Math.floor(((now - 16 - t0) / dur) * 24)) tone(700 + 900 * p, audioCtx.currentTime, 0.04, 'square', 0.05);
    if (p < 1) requestAnimationFrame(frame);
    else {
      triggerFlash();
      if (total >= 50) burstParticles('gold', 70);
      if (soundEnabled) { initAudio(); [523, 659, 784, 1047].forEach((f, k) => tone(f, audioCtx.currentTime + k * 0.07, 0.3, 'triangle', 0.14)); }
    }
  };
  requestAnimationFrame(frame);
  setTimeout(() => el.classList.remove('on'), 3400);
}

function finishBonus() {
  const b = bonusRun;
  if (b.zone) { finishZone(b); return; }
  isSuspense = true;
  /* 結果発表: 「レバーを叩け」のあとはカウントダウンなし。すぐにBONUS確定 / 失敗を出す */
  const T = b.debug ? 900 : 0;
  const timers = [];
  const revealThen = fn => {   // 結果: AT当選=BONUS確定の画像 / 非当選=液晶が割れる (レバーON直後に出し済みなら、そのまま次へ)
    if (b.judgeShown) { fn(); return; }
    if (b.judgeRunning) { b.judgeWaitFinish = fn; return; }
    if (b.debug || isDebugRun || !window.LCDX || !LCDX.judgeReveal) { fn(); return; }
    LCDX.judgeReveal(b.atWin, fn);
  };
  suspenseTimer = setTimeout(() => { stopHeartbeat(); stopTension(); revealThen(() => {
    timers.forEach(clearTimeout); timers.forEach(clearInterval);
    stopHeartbeat();
    stopTension();
    isSuspense = false;
    bonusRun = null;
    hideChance();
    updateAT();
    if (!b.debug) { atThrough = b.atWin ? 0 : atThrough + 1; if (b.reg) regBoostG = REG_BOOST_G; }
    if (b.atWin) {
      setAura(b.aura, true);
      setTimeout(() => setAura(null), 1500);
      if (!b.debug) atCount++;
      updateUI();
      startAT(undefined, b.atTypeRoll, b.superRoll !== undefined ? b.superRoll : Math.random() < (b.superP || 0));   // SUPERは高ランク・サンド目で出やすい
    } else if (b.upgrade && !b.debug) {
      setAura(null);
      showAtToast('BONUS END');
      setTimeout(startUpgradeBig, 900);
    } else {
      setAura(null);
      showAtToast('BONUS END');
      if (atRun && atRun.games === 0 && !b.debug) { atRun.bonusOnly = true; atEnding = true; }
      maybeShowAtResult();
    }
  }); }, T);
}

