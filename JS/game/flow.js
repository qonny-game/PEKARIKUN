// ==========================================
// JS/game/flow.js  —  ゲーム進行の中心（レバーON・当選処理・ペカ演出・枚数表示）
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
// ==========================================
// ゲーム進行
// ==========================================

/* ---------- ペカ演出 (いろいろ) ----------
   normal: 通常点灯 / late: 後ペカ / gakkun: ガックン点灯 / hanabi: 花火 /
   double: Wペカ / rainbow: 虹ペカ / freeze: フリーズ風 */
const PEKA_FX = [['normal', 38], ['late', 16], ['gakkun', 14], ['hanabi', 12], ['double', 9], ['rainbow', 6], ['freeze', 5]];
function pickPekaFx(tierN) {
  const boost = 1 + tierN * 0.18;   // 大きい枚数ほどプレミア系が出やすい
  const w = PEKA_FX.map(([id, x]) => (id === 'rainbow' || id === 'freeze' || id === 'double') ? x * boost : x);
  return PEKA_FX[weightedPick(w)][0];
}
function pekaLater(fn, ms) { pekaTimers.push(setTimeout(fn, ms)); }
function clearPekaTimers() { pekaTimers.forEach(clearTimeout); pekaTimers = []; }

/* 左右のPEKAランプ (沖スロ風): ボーナス終了32G以内の当選 / 天国中の当選 */
const sideL = document.getElementById('side-l');
const sideR = document.getElementById('side-r');
const SIDE_COLOR = LAMP_TABLE.color;   // 色は JS/data/config.js の LAMP_TABLE
let sideTok = 0;   // 点灯のたびに変わる。古い消灯予約を無効にする
function sideLampShow(kind, quiet, pat) {
  sideTok++;
  [sideL, sideR].forEach(el => {
    el.classList.remove('on', 'heaven', 'lit', 'pat-chase', 'pat-sweep', 'pat-pulse', 'pat-solid', 'pat-strobe'); void el.offsetWidth; el.classList.add('on');
    if (kind !== 'heaven') el.classList.add('pat-' + (pat || LAMP_TABLE.pattern[kind] || 'chase'));
    if (kind === 'heaven') el.classList.add('heaven');
    else { el.classList.add('lit'); el.style.setProperty('--sl', SIDE_COLOR[kind] || SIDE_COLOR.red); }
  });
  if (soundEnabled && !quiet) {
    initAudio();
    const t = audioCtx.currentTime;
    const notes = kind === 'heaven' ? [523, 659, 784, 1047, 1319, 1568] : [784, 988, 1175, 1568];
    notes.forEach((f, i) => tone(f, t + i * 0.07, 0.22, 'square', 0.08));
  }
}
/* 当たった役の色で一定時間だけ光らせる（ほかの点灯が来たら消さない） */
function sideLampFlash(kind, ms, pat) {
  sideLampShow(kind, true, pat);
  const tok = sideTok;
  setTimeout(() => { if (tok === sideTok) sideLampOff(); }, ms);
}
/* 2択予告: 左右のサイドランプを別の色で同時に点灯。2つの役のどちらかが成立している */
function sideLampPair(colorL, colorR) {
  sideTok++;
  [[sideL, colorL], [sideR, colorR]].forEach(([el, c]) => {
    if (!el) return;
    el.classList.remove('on', 'heaven', 'lit', 'pat-chase', 'pat-sweep', 'pat-pulse', 'pat-solid'); void el.offsetWidth;
    el.classList.add('on', 'lit', 'pat-solid');
    el.style.setProperty('--sl', SIDE_COLOR[c] || SIDE_COLOR.red);
  });
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    [660, 880].forEach((f, i) => tone(f, t + i * 0.12, 0.2, 'triangle', 0.1));
  }
}
function sideLampOff() { sideTok++; [sideL, sideR].forEach(el => el && el.classList.remove('on', 'heaven', 'lit')); }

/* ランプ点灯そのもの */
function lightLamp(extra) {
  const tier = BIG_TIERS[pendingDisplayIndex];
  const n = pendingDisplayIndex + 1;
  gogoBox.className = `${GOGO_BASE} peka tier-${n}${extra ? ' ' + extra : ''}`;
  gogoBox.style.setProperty('--glow', tier.glow);
  fxOverlay.className = '';   // 背景エフェクトは枚数表示の時だけ。ペカリ中は文字ランプが光る
  gogoSubtext.textContent = tier.sub;
  gogoSubtext.style.opacity = '1';
  playGakoSound('gako');
  if (tier.grand) {
    tripleFlash();
    startParticles('gold');
  } else {
    triggerFlash();
  }
}
/* GOGOランプが点灯するタイミング: レバーON / 演出後(回転開始直前) / 第2停止 / 第3停止 / 全停止後(従来) */
window.pekaAt = null; window.pekaLit = false;
function pickPekaAt() {
  const w = [['lever', 12], ['fx', 18], ['s2', 22], ['s3', 18], ['end', 30]];
  let x = Math.random() * w.reduce((a, b) => a + b[1], 0);
  for (const [k, v] of w) { x -= v; if (x < 0) return k; }
  return 'end';
}
/* サイドのGOGO!ランプだけが、液晶のランプより先に光ることがある (ボーナス確定のゲームだけ) */
window.sideAt = null; window.sideGogo = false;
function sideEarly(at) {
  if (window.sideAt !== at || window.sideGogo) return;
  window.sideGogo = true;
  if (soundEnabled) { initAudio(); tone(1568, audioCtx.currentTime, 0.3, 'triangle', 0.08); tone(2093, audioCtx.currentTime + 0.1, 0.4, 'triangle', 0.06); }
}
function lampEarly(at) {   // 先に点灯させる(ボーナス確定のゲームだけ)
  sideEarly(at);
  if (window.pekaAt !== at || window.pekaLit || isPekared || pendingBonusType !== 'BIG') return;
  window.pekaLit = true;
  lightLamp();
}
/* 次のレバーONで、同じ色の7を狙って揃える */
function armPekari() {
  reelLocked = false;
  spinBtn.disabled = false;
  spinBtn.innerText = '7を揃える (レバーON)';
}

/* ペカリ発生処理 */
function triggerPekari(forceFx) {
  isPekared = true;
  isBonusAligned = false;
  const n = pendingDisplayIndex + 1;
  const fx = forceFx || pickPekaFx(n);
  if (pekaSpecial) { sideLampShow(pekaSpecial); pekaSpecial = null; }
  reelLocked = true;           // 演出が終わるまでレバーは効かない
  clearPekaTimers();

  if (fx === 'late') {
    // 後ペカ: 止まってしばらく経ってから光る
    pekaLater(() => { lightLamp(); armPekari(); }, 1500);
  } else if (fx === 'gakkun') {
    // ガックン: ランプが点いたり消えたりして、最後にしっかり点灯
    gogoBox.className = `${GOGO_BASE} fx-gakkun`;
    playTick(0);
    pekaLater(() => playTick(1), 350);
    pekaLater(() => { lightLamp(); armPekari(); }, 950);
  } else if (fx === 'hanabi') {
    // 花火: 点灯と同時に連続で打ち上がる
    lightLamp();
    burstParticles('gold', 50);
    pekaLater(() => { burstParticles('gold', 50); triggerFlash(); }, 380);
    pekaLater(() => { burstParticles('mega', 70); triggerFlash(); }, 760);
    pekaLater(armPekari, 800);
  } else if (fx === 'double') {
    // Wペカ: 点灯 → 消灯 → もう一度点灯
    lightLamp();
    pekaLater(() => { gogoBox.className = `${GOGO_BASE} fx-dark`; fxOverlay.className = ''; }, 650);
    pekaLater(() => { lightLamp(); tripleFlash(); armPekari(); }, 1150);
  } else if (fx === 'rainbow') {
    // 虹ペカ
    lightLamp('peka-rainbow');
    playAuraUp(6);
    tripleFlash();
    pekaLater(armPekari, 500);
  } else if (fx === 'freeze') {
    // フリーズ風: 暗転 → 鼓動 → ドン! と点灯
    startTension('');
    pekaLater(() => {
      stopTension();
      lightLamp('peka-rainbow');
      tripleFlash();
      shakeMain(600);
      burstParticles('mega', 110);
      playPayoutSound(5);
      armPekari();
    }, 2000);
  } else {
    lightLamp();
    armPekari();
  }
}

/* ---------- ATの出玉タイプ (平均獲得枚数が3種類) ----------
   RUSH: 標準 / HEAVEN: 天国的出玉 / DEATH: 悪魔的出玉 (ごく稀。荒れる)
   hit: ゾーン当選の倍率 / up: チェリー・スイカ上乗せG数の倍率 / zg: ゾーンのG数の倍率 / minG: 突入時の最低G数 */
const AT_TYPES = [
  { id: 'rush',   name: 'AT',     line1: 'PEKA',       line2: 'RUSH!!!',  hit: 1,   up: 1,   zg: 1,   minG: 0,   zlv: [50, 30, 15, 5] },
  { id: 'heaven', name: 'HEAVEN', line1: 'PEKA RUSH!', line2: 'HEAVEN!',  hit: 1.15, up: 1, zg: 1.15, minG: 150, zlv: [20, 30, 30, 20] },
  { id: 'death',  name: 'DEATH',  line1: 'PEKA RUSH!', line2: 'DEATH!',   hit: 1.2, up: 1,   zg: 1.2, minG: 250, zlv: [5, 20, 35, 40] }
];
// ATタイプの出現比率 [RUSH, HEAVEN, DEATH] (設定1〜6 / 設定7)
let atType = 0;   // いまのATのタイプ (0:RUSH 1:HEAVEN 2:DEATH)
function pickAtType() { return weightedPick(AT_TYPE_W); }

/* ---------- フリーズ → PEKA! PEKA! MOUNTAIN! 直撃 ---------- */
const FREEZE_RATE = 1 / 1500;   // 通常時1ゲームあたりのフリーズ確率
function freezeToZone(debug) {
  zenchoLeft = 0; zenchoToCz = false; latentLeft = 0;
  if (window.TRO && !debug) TRO.seen('freeze');
  isSuspense = true;                       // フリーズ中はレバーが効かない
  startTension('FREEZE');
  // フリーズ: 暗転して静まる → ドン! ×3 (だんだん強く) → 弾ける
  // 暗転するのは液晶だけ。リールは見えたまま、図柄のバックランプだけ落とす
  const mainEl = document.getElementById('sub-lcd') || document.body;
  const cabEl = document.querySelector('.cabinet');
  mainEl.classList.add('freeze-dark');
  if (cabEl) cabEl.classList.add('freeze-dim');
  sideLampOff();
  const thud = (lv) => {
    shakeMain(180 + lv * 120);
    if (window.vibrate) window.vibrate(60 + lv * 80);
    if (!soundEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;
    tone(70 - lv * 8, t, 0.5, 'sine', 0.3 + lv * 0.08);
    tone(140 + lv * 30, t, 0.12, 'square', 0.1 + lv * 0.03);
  };
  const dons = [1100, 1900, 2700].map((ms, i) => setTimeout(() => {
    thud(i);
    if (i === 2) { mainEl.classList.remove('freeze-dark'); if (cabEl) cabEl.classList.remove('freeze-dim'); }
  }, ms));
  suspenseTimer = setTimeout(() => {
    dons.forEach(clearTimeout);
    mainEl.classList.remove('freeze-dark');
    if (cabEl) cabEl.classList.remove('freeze-dim');
    stopTension();
    isSuspense = false;
    tripleFlash();
    shakeMain(800);
    burstParticles('mega', 140);
    startParticles('gold');
    playGakoSound('gako');
    playPayoutSound(6);
    playPayoutFanfare(10);
    setTimeout(stopParticles, 1800);
    const idx = pickTierIndex();
    const coins = BIG_TIERS[idx].coins;
    if (!debug) {
      bigCount++;
      bonusLog.push({ g: cumulativeGames, type: 'BIG', coins });
      totalGames = 0;
      modeGames = 0;
      modeMult = 1;
      recordPoint();
      updateUI();
    }
    beginBonus(makeBonusPlan(coins, { zone: true, atWin: false, level: 0, debug: !!debug }));
  }, 3500);
}

/* ---------- 緊張演出 (ボーナス最終ゲームのジャッジメント / AT最終ゲーム) ---------- */
const judgeEl = document.getElementById('judge-overlay');
const judgeText = document.getElementById('judge-text');
function startTension(label) {
  judgeEl.classList.add('tense');
  judgeText.textContent = label;
  judgeText.classList.remove('show');
  void judgeText.offsetWidth;
  judgeText.classList.add('show');
  startHeartbeat(5000, 150);
}
function stopTension() {
  judgeEl.classList.remove('tense');
  judgeText.classList.remove('show');
  stopHeartbeat();
}
function playTick(level) {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  tone(660 + level * 90, t, 0.12, 'square', 0.1);
  tone(990 + level * 90, t + 0.1, 0.12, 'square', 0.1);
}
/* ATの残りG数が少ないとき */
function atTension(n) {
  if (n === 0) { startTension('FINAL'); }
  else if (n <= 3) { showAtToast(`LAST ${n}G`); playTick(4 - n); }
}

/* ボーナス揃い (7が揃った) */
function onBonusAligned() {
  alignStage = 1;
  window.sevenMiss = 0; window.czSevenColor = null;
  if (window.czKeepClear) czKeepClear();
  const tier = BIG_TIERS[pendingTierIndex];
  if (pendingWhiteDiag) { markWin(pendingWhiteDiag[0] === 0 ? [0, 4, 8] : [6, 4, 2], 'sym-glow-gold'); if (window.LCDX) LCDX.say('白7 斜め揃い', '', 3000, 'happy', 'jump'); }
  else markWin([3, 4, 5], tier.grand ? 'sym-glow-gold' : '');
  alignDisplay.classList.remove('show-lose');
  alignDisplay.classList.add('show-align');
  playAlignChime();
  triggerFlash();
  spinBtn.disabled = false;
  spinBtn.innerText = 'NEXT';
}

/* REG(レギュラーボーナス): 7・7・BAR 揃い。枚数は小さく、AT突入率も低め。終わったあとしばらくBIGが当たりやすい */
let pendingReg = false;       // 今回の当選はREGか
let regBoostG = 0;            // REG後、BIG当選しやすい残りG数
let atThrough = 0;            // AT非当選のボーナスが続いた回数（スルー）
const REG_UP_P = 0.08;        // REG中にBIGへ昇格する割合
const REG_P = 0.25, REG_BOOST_G = 30, REG_BOOST_MULT = 3;
const THROUGH_MULT = [1, 1.4, 1.8, 3];   // スルー0/1/2/3回以上のAT突入率の倍率
const coinScaleNow = () => BIG_TIERS[0].coins / BASE_COINS[0];   // 遊モードの枚数倍率
const regCoins = () => Math.max(1, Math.round(100 * coinScaleNow()));   // REGは100枚固定
const bigCoins = () => Math.max(1, Math.round(200 * coinScaleNow()));   // BIGは200枚固定（AT性能は当選ランクで差をつける）
/* 直BIG: 7との2択（7/BELLなど）から、7が揃ってそのままBIG。ランプを待たずに即当選 */
const WM_P = 0.1;            // 当選ゲームのうち、白7・スイカ・白7 が出る割合
const WHITE_DIAG_P = 0.04;   // BIG当選のうち、白7斜め揃い(BIG+AT確定)になる割合
let pendingWhiteDiag = null;  // 白7斜め揃いの形 ([0,1,2]=左上→右下 / [2,1,0]=左下→右上)
const DIRECT_BIG_P = 0.12;   // ランプ「最終」のBIG当選のうち、直BIGになる割合
function playDirectBig() {
  const other = ['bell', 'replay', 'cherry'][Math.floor(Math.random() * 3)];
  const ord = Math.random() < 0.5 ? ['seven', other] : [other, 'seven'];
  reelLocked = true;
  sideLampPair(OMEN_PAIR_COLOR[ord[0]], OMEN_PAIR_COLOR[ord[1]]);
  if (window.LCDX && LCDX.pair) LCDX.pair(ord[0], ord[1]);
  pekaLater(() => {
    reelLocked = false;
    startReels({ kind: 'seven', assist: true, color: null }, res => {
      omenOff();
      stopTension();
      totalGames = 0;
      isPekared = true; isBonusAligned = false;
      window.pekaLit = true;
      lightLamp();
      if (window.LCDX) { LCDX.say('PEKA!!', '直BIG!!', 2400, 'happy', 'jump'); LCDX.spawn('fire', 3); }
      updateUI();
      if (res.success) onBonusAligned(); else armPekari();
    });
  }, 700);
}
/* 直AT: 通常時からいきなりPEKA RUSH */
const DIRECT_AT_P = 1 / 3000;
function directAT() {
  isSuspense = true;
  tripleFlash(); shakeMain(500); playGakoSound('gako');
  if (window.FXBanner) window.FXBanner('PEKA RUSH', '直撃!!', 'red', true, 1700);
  setTimeout(() => {
    isSuspense = false;
    totalGames = 0; modeGames = 0; modeMult = 1;
    atCount++;
    updateUI();
    startAT(undefined, undefined, Math.random() < 0.25);
  }, 1900);
}
/* 前兆: スイカ・チェリー・チャンス目が契機。前兆のあとCHANCE ZONEへ（通常→前兆→CZ→BIG→AT→MOUNTAIN）。まれに前兆なしの直CZ */
let zenchoToCz = false;
/* 潜伏: 前兆に行かずボーナスフラグが立ったとき、すぐにはランプを光らせず、数ゲームの間「通常時には出ない矛盾した目」を出す。
   (2択なのに2択以外が揃う / 白7・スイカ・白7 / サンド目 / 色違いの7)。最後のゲームでGOGO!ランプ(BONUS確定) */
let latentLeft = 0;
const LATENT_MIN = 8, LATENT_MAX = 12;
function contraRole() {
  sandReachNow = false; window.contraMixed = false; window.contraPair = null;
  if (window.pushSpoilArm && Math.random() < 0.5) window.pushSpoilArm('bonus');
  const r = Math.random();
  if (r < 0.22) { window.wmNext = true; return 'lose'; }              // 白7・スイカ・白7
  if (r < 0.38) { sandReachNow = true; return 'lose'; }               // サンド目
  if (r < 0.50) { window.contraMixed = true; return 'lose'; }         // 色違いの7が揃う
  const role = ['bell', 'replay', 'cherryW', 'melonW', 'chanceW', 'lose'][Math.floor(Math.random() * 6)];
  if (Math.random() < 0.7) {   // 2択を出すが、結果はその2つのどちらでもない
    const grp = { bell: 'bell', replay: 'replay', cherryW: 'cherry', melonW: 'melon', chanceW: 'chance' }[role];
    const cands = OMEN_PAIRS.filter(p => !p.includes(grp));
    window.contraPair = cands[Math.floor(Math.random() * cands.length)].slice().sort(() => Math.random() - 0.5);
  }
  return role;
}
const ZEN_TO_CZ = { strong: 0.7, weak: 0.17 }, CZ_DIRECT = { strong: 0.1, weak: 0.03 };
const SEVEN_HINT_MISS = 3;   // 7を何回外したら液晶に777を出すか
/* ペカっている間のレバーON: 7を狙って揃える (取りこぼしたら、もう一度) */
function attemptBonus() {
  playClickSound();
  setLedWin(0);
  if (!isDebugRun) {
    diffCoins -= 3;
    cumulativeGames++;
    recordPoint();
    updateUI();
  }
  startReels({ kind: pendingReg ? 'reg' : 'seven', assist: true, color: pendingWhiteDiag ? '7white' : (window.czSevenColor || null), diag: pendingWhiteDiag }, res => {
    if (res.success) {
      onBonusAligned();
    } else {
      showAtToast('MISS');
      window.sevenMiss = (window.sevenMiss || 0) + 1;
      if (window.sevenMiss >= SEVEN_HINT_MISS && window.onSevenHint) window.onSevenHint();   // 何度も外したら液晶に狙う7を出す
      reelLocked = true;
      setTimeout(() => {
        reelLocked = false;
        hideLoseReels();
        spinBtn.innerText = '7を揃える (レバーON)';
      }, 800);
    }
  });
}

/* レバーON 処理 */
/* 小役の抽選: 乱数1つを役テーブル(累積)に当てる。従来の「ベル→スイカ→チェリー→リプレイ→チャンス目」の順番抽選と同じ確率配分 */
function roleTable(inAT) {
  const pB = inAT ? BELL_AT_RATE : BELL_NORMAL_RATE;
  const pM = inAT ? MELON_AT_RATE : MELON_RATE;
  const pC = inAT ? CHERRY_AT_RATE : CHERRY_RATE;
  const pR = inAT ? REPLAY_AT_RATE : REPLAY_RATE;
  let left = 1;
  const take = p => { const v = left * p; left -= v; return v; };
  const bell = take(pB), melon = take(pM), cherry = take(pC), replay = take(pR);
  const chS = inAT ? 0 : take(CHANCE_S_P);
  const chW = inAT ? 0 : take(CHANCE_W_P / (1 - CHANCE_S_P));
  return [
    ['bell', bell], ['melonS', melon * MELON_STRONG_P], ['melonW', melon * (1 - MELON_STRONG_P)],
    ['cherryS', cherry * CHERRY_STRONG_P], ['cherryW', cherry * (1 - CHERRY_STRONG_P)],
    ['replay', replay], ['chanceS', chS], ['chanceW', chW], ['lose', left]
  ];
}
function drawRole(inAT) {
  const t = roleTable(inAT);
  let r = Math.random();
  for (let i = 0; i < t.length; i++) { if (r < t[i][1]) return t[i][0]; r -= t[i][1]; }
  return 'lose';
}

const AT_REVIVE_P = 0.3;            // AT最終ゲームで復活する確率
/* CHANCE ZONE: 強レア等で突入する6G。ボーナス当選確率が大きく上がる（楽しむための設計。機械割は実機より高め） */
let czLeft = 0, czNew = false;
const CZ_LOOP_P = 0.06;   // CHANCE ZONE が むげんLOOP になる割合
const CZ_MULT = 8, CZ_G = 6, CZ_ENTRY_STRONG = 0.8, CZ_ENTRY_WEAK = 0.2;
let zenchoTotal = 0, fakeTotal = 0;   // 前兆の長さ（連続演出の何話目かの表示用）
let fakeZencho = 0;                 // ガセ前兆の残りG数（当選しない）
const FAKE_ZENCHO_P = 1 / 160;      // 通常時1Gごとにガセ前兆へ入る確率

/* ハマり救済: 通常時にボーナスが長く当たらないとき、当選確率を少しずつ上げる（楽しむための設計） */
const DROUGHT_START = 250, DROUGHT_STEP = 150, DROUGHT_MAX = 4;
function droughtMult(inAT) {
  if (inAT || bonusRun || totalGames <= DROUGHT_START) return 1;
  return Math.min(DROUGHT_MAX, 1 + (totalGames - DROUGHT_START) / DROUGHT_STEP);
}

const PANEL_P_CZ = 0.2, PANEL_P_AT = 0.008, PANEL_P_CHANCE = 0.04;   // 下パネル消灯の抽選率
/* 消灯で確定した上乗せ: 回転が止まり、他のPUSH演出が終わってから表示 (ゲーム数は消灯の時点で加算済み) */
function awardPanelUp(n) {
  const iv = setInterval(() => {
    if (isPushing || isReelSpinning || isRushing || isAtResult) return;
    clearInterval(iv);
    pushReveal(`+${n}G`, true, () => { updateAT(); window.panelUpDone = true; });   // 上乗せ演出が済んだら下パネルを元に戻す
  }, 400);
}

function handleSpin() {
  hideLastCount();   // レバーを押したら LAST カウントダウンは消す
  // PUSHボタン待ちのときは、レバーでもPUSHできる
  if (isPushing) {
    if (pushOverlay.classList.contains('waiting')) pushBtn.click();
    return;
  }
  // リール回転中は、止まっていないリールを左から止める
  if (isReelSpinning) { stopNextReel(); return; }
  if (isCooldown || isCounting || isSuspense || isRushing || isAtResult || reelLocked) return;
  if (window.LCDX && LCDX.clearAll) LCDX.clearAll();   // 新しい回転を始める前に、直前の演出(液晶の図柄・ハズレ・文字・キャラなど)をすべて消す

  // 枚数表示のあとのレバーON: ボーナス消化(ベルでの枚数獲得)が始まる
  if (isBonusAligned) {
    const wasDebug = isDebugRun;
    const plan = pendingPlan;
    resetPekaState();
    if (!wasDebug && plan) beginBonus(plan);
  }

  // ペカっている間: 7を揃える (揃ったらNEXTで枚数表示)
  if (isPekared && !isBonusAligned) {
    if (alignStage === 1) { showPayout(); return; }
    attemptBonus();
    return;
  }

  // ボーナス消化中: 毎ゲームベルが揃って枚数を獲得する
  if (bonusRun) {
    bonusGame();
    return;
  }

  playClickSound();
  setLedWin(0);

  totalGames++;
  cumulativeGames++;
  if (sinceEnd !== null) sinceEnd++;
  const inAT = atGames > 0;
  const inMode = !inAT && modeGames > 0;
  if (inAT) {
    atGames--;
    if (atRun) atRun.games++;
    if (atGames === 0) {
      if (atRun && Math.random() < AT_REVIVE_P) {
        // 最終ゲームで復活: 数ゲーム延長してATが続く
        atGames = 3 + Math.floor(Math.random() * 5);
        atRun.revives = (atRun.revives || 0) + 1;
        const rg = atGames;
        setTimeout(() => { if (window.FXBanner) window.FXBanner('復活！', `+${rg}G`, 'red', true, 1800); if (window.vibrate) window.vibrate([60, 40, 160]); }, 900);
      } else atEnding = true;   // リザルトはこのゲームの結果が出たあとに表示
    }
    updateAT();
    atTension(atGames);
  } else if (inMode) {
    modeGames--;
  }
  if (replayPending) {
    replayPending = false;       // リプレイ: このゲームは投入なし
  } else {
    diffCoins -= 3;              // 3枚消費
  }
  recordPoint();
  updateUI();

  // サンド目: AT中、スイカ・チェリー成立の次から3G以内に出す（ゲームの代わりに第2リールを目押し）
  if (!inAT) sandLeft = 0;
  else if (sandLeft > 0 && !atEnding && --sandLeft === 0) { playSand(); return; }
  // 通常時の直AT: いきなりPEKA RUSH
  if (!inAT && !bonusRun && czLeft === 0 && zenchoLeft === 0 && pendingBonusType === null && latentLeft === 0 && Math.random() < DIRECT_AT_P) { directAT(); return; }
  // 通常時のフリーズ: そのまま PEKA! PEKA! MOUNTAIN! へ直撃
  if (!inAT && Math.random() < FREEZE_RATE) { freezeToZone(); return; }

  const inCherry = cherryGames > 0;
  if (inCherry) { cherryGames--; updateCherry(); }
  // AT中は当選しにくい / 次回モード中は当選しやすい / チェリー後は当選しやすい
  const inCZ = czLeft > 0 && !inAT && !bonusRun;
  window.czGameNow = inCZ; window.czTimedOut = false; window.czHoldNow = false;   // CZ中のゲームか / 最終Gで時間切れか / 連続演出でHOLD中か
  if (inCZ) {
    czLeft--;
    if (czNew) { czNew = false; if (window.FXBanner) window.FXBanner(czLoop ? 'むげんLOOP' : 'CHANCE ZONE', czLoop ? 'CHANCE ZONE' : `${CZ_G}G`, 'red', true, 1700); }
  } else czLeft = 0;
  const regBoost = !inAT && !bonusRun && regBoostG > 0;
  if (regBoost) regBoostG--;   // REG後のBIG当選しやすい期間
  const hitMult = (regBoost ? REG_BOOST_MULT : 1) * (inAT ? AT_HIT_MULT * AT_TYPES[atType].hit * (atSuper ? 1.3 : 1) : inMode ? modeMult : 1) * (inCherry ? cherryM : 1) * (inCZ ? CZ_MULT : 1) * droughtMult(inAT);
  let isHit = false;
  // ガセ前兆: 前兆ステージに入るが当選はしない（本前兆と同じ3〜5G。ハズレの期待感を作る）
  let zStep = null;   // 前兆の連続演出（本物・ガセ共通の見た目。最後だけ結果が分かれる）
  if (inAT || bonusRun || latentLeft > 0) fakeZencho = 0;
  else if (fakeZencho > 0) { fakeZencho--; zStep = { real: false, i: fakeTotal - fakeZencho + 1, n: fakeTotal, end: fakeTotal - fakeZencho + 1 >= fakeTotal }; if (fakeZencho === 0) zStep = null; }
  else if (zenchoLeft === 0 && Math.random() < FAKE_ZENCHO_P) { fakeZencho = fakeTotal = 3 + Math.floor(Math.random() * 3); zStep = { real: false, i: 1, n: fakeTotal, end: false }; }
  let contraGame = false;   // 潜伏中: 矛盾した目を出すゲーム
  if (latentLeft > 0 && !inAT && !bonusRun) {
    latentLeft--;
    if (latentLeft === 0) isHit = true;   // 最後のゲーム: ここでボーナス当選(ランプ点灯)
    else contraGame = true;
  } else if (zenchoLeft > 0 && zenchoToCz) {   // 前兆のあとはCHANCE ZONEへ（ボーナスには直接ならない）
    zenchoLeft--;
    if (zenchoLeft > 0) zStep = { real: true, i: zenchoTotal - zenchoLeft + 1, n: zenchoTotal, end: false };
    else { zenchoToCz = false; czLeft = CZ_G; czNew = true; czLoop = Math.random() < CZ_LOOP_P; zStep = { real: true, i: zenchoTotal, n: zenchoTotal, end: true }; }
  } else if (zenchoLeft > 0) {
    zenchoLeft--;
    isHit = zenchoLeft === 0;
    if (zenchoLeft > 0) zStep = { real: true, i: zenchoTotal - zenchoLeft + 1, n: zenchoTotal, end: false };
  } else {
    isHit = Math.random() < Math.min(1, HIT_RATE * hitMult);
    // 当選が決まっても、すぐには光らせず3〜5G遅らせることがある (その間のハズレ矛盾は確定のサイン)
    if (isHit && !inAT && !inCZ && !isDebugRun && Math.random() >= ZENCHO_P) { latentLeft = LATENT_MIN + Math.floor(Math.random() * (LATENT_MAX - LATENT_MIN + 1)); isHit = false; contraGame = true; }   // 前兆なしのボーナスフラグ: 潜伏
    else if (isHit && !inAT && Math.random() < ZENCHO_P) { zenchoLeft = zenchoTotal = 3 + Math.floor(Math.random() * 3); isHit = false; fakeZencho = 0; zStep = { real: true, i: 1, n: zenchoTotal, end: false }; }
  }

  // CHANCE ZONE中に当選が決まったら、前兆(連続演出)は省略して、そのまま当選画面へ
  const czWin = inCZ && (isHit || zenchoLeft > 0);
  if (czWin && !isHit) { zenchoLeft = 0; zenchoTotal = 0; isHit = true; zStep = null; }
  if (zStep && typeof window.onZenchoStep === 'function') window.onZenchoStep(zStep);
  // 下パネル消灯: 回転中にパネルが消えたら確定。CZ=当選確定 / RUSH中=100G以上の上乗せ確定 (確定でないゲームでは絶対に消えない)
  if (!isDebugRun) {
    if (inCZ && (isHit || zenchoLeft > 0) && Math.random() < PANEL_P_CZ) window.panelPlan = 'cz';
    else if (inAT && !isHit && Math.random() < PANEL_P_AT) {
      window.panelPlan = 'at';
      const bigG = scaleG([100, 100, 150, 200, 300, 500][Math.floor(Math.random() * 6)]);
      atGames += bigG; atEnding = false;
      awardPanelUp(bigG);
    }
  }

  if (inCZ && (isHit || zenchoLeft > 0)) { window.czFrozen = (!isHit && zenchoLeft > 0) ? czLeft : null; czLeft = 0; czLoop = false; if (window.onCzSuccess) window.onCzSuccess(); }   // 前兆に入った場合は、CZの残りGを止めたまま表示し続ける(czFrozen)     // 当選(前兆に入った場合も)でゾーン終了=成功
  else if (inCZ && czLeft === 0 && czLoop) {   // むげんLOOP: 0Gで当たっていなければ、最初から（当たるまで繰り返す）
    czLeft = CZ_G;
    if (window.FXBanner) window.FXBanner('LOOP!!!!', 'もう一度 ' + CZ_G + 'G', 'red', true, 1700);
    if (soundEnabled) { initAudio(); const t0 = audioCtx.currentTime; [523, 784, 1047, 1568].forEach((f, i) => tone(f, t0 + i * 0.08, 0.3, 'triangle', 0.12)); }
  }
  else if (inCZ && czLeft === 0) { window.czTimedOut = true; if (window.onCzEnd) window.onCzEnd(false); }

  // 小役は1回の乱数で決める（実機と同じ。確率は従来の順番抽選と同じ配分）
  const role = isHit ? 'hit' : (contraGame ? contraRole() : drawRole(inAT));
  // CHANCE ZONE の突入抽選: 強レアは入りやすい。突入は次ゲームから
  if (!inAT && !bonusRun && !isHit && !contraGame && czLeft === 0 && zenchoLeft === 0 && fakeZencho === 0) {
    const strong = ['cherryS', 'melonS', 'chanceS'].includes(role);
    const weak = ['cherryW', 'melonW', 'chanceW'].includes(role);
    const kindR = strong ? 'strong' : weak ? 'weak' : null;
    if (kindR) {
      const r = Math.random();
      if (r < ZEN_TO_CZ[kindR]) {   // 前兆（3〜5G）→ CHANCE ZONE
        zenchoLeft = zenchoTotal = 3 + Math.floor(Math.random() * 3); zenchoToCz = true; fakeZencho = 0;
        if (typeof window.onZenchoStep === 'function') window.onZenchoStep({ real: true, i: 1, n: zenchoTotal, end: false });
      } else if (r < ZEN_TO_CZ[kindR] + CZ_DIRECT[kindR]) { czLeft = CZ_G; czNew = true; czLoop = Math.random() < CZ_LOOP_P; }   // 直CZ（まれに むげんLOOP）
    }
  }
  if (!isDebugRun) {
    const rk = role === 'bell' ? 'bell' : role === 'replay' ? 'replay' : /^melon/.test(role) ? 'melon' : /^cherry/.test(role) ? 'cherry' : /^chance/.test(role) ? 'chance' : null;
    if (rk) roleStat[rk]++;
  }

  if (isHit) {
    // 天国中の当選 / ボーナス終了後32G以内の当選: 左右のPEKAランプ
    pekaSpecial = (inMode && modeMult >= 8) ? 'heaven' : (sinceEnd !== null && sinceEnd <= 32) ? 'early' : null;
    sinceEnd = null;
    pendingZone = inAT;
    pendingBonusType = 'BIG';
    pendingWhiteDiag = null;
    pendingReg = !inAT && !czWin && !isDebugRun && !regBoost && regBoostG === 0 && Math.random() < REG_P;   // REG後の優遇期間はBIGだけ
    pendingDisplayIndex = pendingReg ? 0 : pickTierIndex();
    pendingTierIndex = pendingDisplayIndex;
    if (!pendingReg) regBoostG = 0;
    if (!inAT && !pendingReg && !isDebugRun && Math.random() < WHITE_DIAG_P) pendingWhiteDiag = Math.random() < 0.5 ? [0, 1, 2] : [2, 1, 0];
    pendingPlan = null;
    replayPending = false;
    window.pekaAt = isDebugRun ? 'end' : (czWin ? 'end' : pickPekaAt()); window.pekaLit = false;   // CZ成功は「BONUS確定!」を見せたあとにランプ
    {
      const ORD = ['lever', 'fx', 's2', 's3', 'end'], pi = ORD.indexOf(window.pekaAt);
      window.sideGogo = false;
      window.sideAt = (!isDebugRun && !czWin && pi > 0 && Math.random() < 0.4) ? ORD[Math.floor(Math.random() * pi)] : null;   // 液晶より前のタイミングで、サイドだけ光る
    }
    // 通常時のサンド目（リーチ目）: ボーナス当選済みで、GOGO!ランプがまだ光っていないゲームだけ（ランプが先に光るゲームでは出ない）
    const reach = !inAT && !czWin && !isDebugRun && window.pekaAt === 'end' && !window.sideAt && Math.random() < SAND_REACH_P;
    lampEarly('lever');
    if (inAT && atRun) atRun.bonuses++;
    cherryGames = 0;
    updateCherry();
    // 今回はハズレ目で止まり、止まったあとにGOGO!ランプが光る
    const directBig = !reach && !inAT && !czWin && !pendingReg && !isDebugRun && window.pekaAt === 'end' && !window.sideAt && Math.random() < DIRECT_BIG_P;
    if (directBig) { playDirectBig(); return; }   // 7との2択 → 7が揃ってそのままBIG
    if (!reach && Math.random() < WM_P) window.wmNext = true;   // 白7・スイカ・白7 が第1リールに止まる（当選確定の演出）
    sandReachNow = reach;
    runRole('lose', () => {
      sandReachNow = false;
      stopTension();
      totalGames = 0;
      updateUI();
      reelLocked = true;
      setTimeout(() => {
        reelLocked = false;
        hideLoseReels();
        triggerPekari();
      }, 600);
    });
  } else if (role === 'bell') {
    // ベル揃い: 直線 / 斜め左上から1枚 / 斜め左下から15枚 (AT中は左下が出やすい)
    if (inAT && atRun) atRun.bells++;
    const type = pickBellType(inAT);
    // AT中のベル: 揃いやすいが、ナビが出ないことがあり、ナビなしのときはハズレ目になることもある
    const atNavi = inAT && Math.random() < 0.85 ? naviFor('') : null;   // ベルのナビは黄
    const atBellMiss = inAT && !atNavi && Math.random() < 0.1;
    runRole(atBellMiss ? 'lose' : 'bell' + type, () => {
      if (atBellMiss) { stopTension(); updateUI(); maybeShowAtResult(); return; }
      stopTension();
      diffCoins += BELL_TYPES[type].coins;
      setLedWin(BELL_TYPES[type].coins);
      recordPoint();
      showBellResult(BELL_TYPES[type].coins, inAT);
      updateUI();
      maybeShowAtResult();
    }, atNavi);
  } else if (role === 'melonS' || role === 'melonW') {
    // スイカ: 強=中段(中リールを狙う。取りこぼしあり) / 弱=斜め(自動で揃う)
    playRole(role === 'melonS' ? 'melon' : 'melonW', inAT);
  } else if (role === 'cherryS' || role === 'cherryW') {
    // チェリー: 強=中段 / 弱=上下段 (左リールを狙う。取りこぼしあり)
    playRole(role, inAT);
  } else if (role === 'replay') {
    // リプレイ: 図柄が揃って、次のゲームは投入枚数なし
    replayPending = true;
    runRole('replay', () => {
      stopTension();
      spinBtn.innerText = 'リプレイ (レバーON)';
      playReplayJingle();
      updateUI();
      maybeShowAtResult();
    });
  } else if (role === 'chanceS') {
    playRole('chanceS', false);     // 強チャンス目
  } else if (role === 'chanceW') {
    playRole('chanceW', false);     // 弱チャンス目
  } else {
    runRole('lose', () => {
      sandReachNow = false; window.contraMixed = false;
      stopTension();
      updateUI();
      maybeShowAtResult();
    });
  }
}

/* 当選枚数に応じた表示レベル (1〜6。枚数が大きいほど派手) */
function payLevel(coins) {
  const i = BIG_TIERS.findIndex(t => t.coins >= coins);
  return i < 0 ? BIG_TIERS.length : i + 1;
}

/* 枚数表示の「ドドーン」音 */
function playPayoutSound(level) {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;

  for (let i = 0; i < 1; i++) {
    const t = now;
    const vol = 0.5 + level * 0.1;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.45);

    // 打撃のアタック感
    tone(900 - i * 150, t, 0.06, 'square', 0.12);
  }

  // 高レベルはキラッと余韻を足す
  if (level >= 4) {
    [1568, 2093, 2637].forEach((f, i) => tone(f, now + 0.3 + i * 0.08, 0.3, 'triangle', 0.12));
  }
}

