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
function sideLampShow(kind, quiet) {
  sideTok++;
  [sideL, sideR].forEach(el => {
    el.classList.remove('on', 'heaven', 'lit', 'pat-chase', 'pat-sweep', 'pat-pulse', 'pat-solid'); void el.offsetWidth; el.classList.add('on');
    if (kind !== 'heaven') el.classList.add('pat-' + (LAMP_TABLE.pattern[kind] || 'chase'));
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
function sideLampFlash(kind, ms) {
  sideLampShow(kind, true);
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
    startTension('FREEZE');
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
  zenchoLeft = 0;
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
  const tier = BIG_TIERS[pendingTierIndex];
  markWin([3, 4, 5], tier.grand ? 'sym-glow-gold' : '');
  alignDisplay.classList.remove('show-lose');
  alignDisplay.classList.add('show-align');
  playAlignChime();
  triggerFlash();
  spinBtn.disabled = false;
  spinBtn.innerText = 'NEXT';
}

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
  startReels({ kind: 'seven', auto: true }, res => {
    if (res.success) {
      onBonusAligned();
    } else {
      showAtToast('MISS');
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
  // 通常時のフリーズ: そのまま PEKA! PEKA! MOUNTAIN! へ直撃
  if (!inAT && Math.random() < FREEZE_RATE) { freezeToZone(); return; }

  const inCherry = cherryGames > 0;
  if (inCherry) { cherryGames--; updateCherry(); }
  // AT中は当選しにくい / 次回モード中は当選しやすい / チェリー後は当選しやすい
  const inCZ = czLeft > 0 && !inAT && !bonusRun;
  if (inCZ) {
    czLeft--;
    if (czNew) { czNew = false; if (window.FXBanner) window.FXBanner('CHANCE ZONE', `${CZ_G}G`, 'red', true, 1700); }
  } else czLeft = 0;
  const hitMult = (inAT ? AT_HIT_MULT * AT_TYPES[atType].hit : inMode ? modeMult : 1) * (inCherry ? cherryM : 1) * (inCZ ? CZ_MULT : 1) * droughtMult(inAT);
  let isHit = false;
  // ガセ前兆: 前兆ステージに入るが当選はしない（本前兆と同じ3〜5G。ハズレの期待感を作る）
  let zStep = null;   // 前兆の連続演出（本物・ガセ共通の見た目。最後だけ結果が分かれる）
  if (inAT || bonusRun) fakeZencho = 0;
  else if (fakeZencho > 0) { fakeZencho--; zStep = { real: false, i: fakeTotal - fakeZencho + 1, n: fakeTotal, end: fakeTotal - fakeZencho + 1 >= fakeTotal }; if (fakeZencho === 0) zStep = null; }
  else if (zenchoLeft === 0 && Math.random() < FAKE_ZENCHO_P) { fakeZencho = fakeTotal = 3 + Math.floor(Math.random() * 3); zStep = { real: false, i: 1, n: fakeTotal, end: false }; }
  if (zenchoLeft > 0) {
    zenchoLeft--;
    isHit = zenchoLeft === 0;
    if (zenchoLeft > 0) zStep = { real: true, i: zenchoTotal - zenchoLeft + 1, n: zenchoTotal, end: false };
  } else {
    isHit = Math.random() < Math.min(1, HIT_RATE * hitMult);
    // 当選が決まっても、すぐには光らせず3〜5G遅らせることがある (その間のハズレ矛盾は確定のサイン)
    if (isHit && !inAT && Math.random() < ZENCHO_P) { zenchoLeft = zenchoTotal = 3 + Math.floor(Math.random() * 3); isHit = false; fakeZencho = 0; zStep = { real: true, i: 1, n: zenchoTotal, end: false }; }
  }

  if (zStep && typeof window.onZenchoStep === 'function') window.onZenchoStep(zStep);

  if (inCZ && (isHit || zenchoLeft > 0)) czLeft = 0;     // 当選(前兆に入った場合も)でゾーン終了
  else if (inCZ && czLeft === 0 && window.onCzEnd) window.onCzEnd(false);

  // 通常時のサンド目（リーチ目）: ボーナス確定。当選と同じ流れで、サンド目の形で止まる
  const reach = !inAT && !isHit && zenchoLeft === 0 && Math.random() < SAND_REACH_P;
  if (reach) isHit = true;
  // 小役は1回の乱数で決める（実機と同じ。確率は従来の順番抽選と同じ配分）
  const role = isHit ? 'hit' : drawRole(inAT);
  // CHANCE ZONE の突入抽選: 強レアは入りやすい。突入は次ゲームから
  if (!inAT && !bonusRun && !isHit && czLeft === 0 && zenchoLeft === 0 && fakeZencho === 0) {
    const strong = ['cherryS', 'melonS', 'chanceS'].includes(role);
    const weak = ['cherryW', 'melonW', 'chanceW'].includes(role);
    if ((strong && Math.random() < CZ_ENTRY_STRONG) || (weak && Math.random() < CZ_ENTRY_WEAK)) { czLeft = CZ_G; czNew = true; }
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
    pendingDisplayIndex = pickTierIndex();
    pendingTierIndex = pendingDisplayIndex;
    pendingPlan = null;
    replayPending = false;
    if (inAT && atRun) atRun.bonuses++;
    cherryGames = 0;
    updateCherry();
    // 今回はハズレ目で止まり、止まったあとにGOGO!ランプが光る
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

