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
function sideLampShow(kind) {
  [sideL, sideR].forEach(el => { el.classList.remove('on', 'heaven'); void el.offsetWidth; el.classList.add('on'); if (kind === 'heaven') el.classList.add('heaven'); });
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    const notes = kind === 'heaven' ? [523, 659, 784, 1047, 1319, 1568] : [784, 988, 1175, 1568];
    notes.forEach((f, i) => tone(f, t + i * 0.07, 0.22, 'square', 0.08));
  }
}
function sideLampOff() { [sideL, sideR].forEach(el => el && el.classList.remove('on', 'heaven')); }

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
  suspenseTimer = setTimeout(() => {
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
  }, 2600);
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
    if (atGames === 0) atEnding = true;   // リザルトはこのゲームの結果が出たあとに表示
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
  const hitMult = (inAT ? AT_HIT_MULT * AT_TYPES[atType].hit : inMode ? modeMult : 1) * (inCherry ? cherryM : 1);
  let isHit = false;
  if (zenchoLeft > 0) {
    zenchoLeft--;
    isHit = zenchoLeft === 0;
  } else {
    isHit = Math.random() < Math.min(1, HIT_RATE * hitMult);
    // 当選が決まっても、すぐには光らせず3〜5G遅らせることがある (その間のハズレ矛盾は確定のサイン)
    if (isHit && !inAT && Math.random() < ZENCHO_P) { zenchoLeft = 3 + Math.floor(Math.random() * 3); isHit = false; }
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
    runRole('lose', () => {
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
  } else if (Math.random() < (inAT ? BELL_AT_RATE : BELL_NORMAL_RATE)) {
    // ベル揃い: 直線 / 斜め左上から1枚 / 斜め左下から15枚 (AT中は左下が出やすい)
    if (inAT && atRun) atRun.bells++;
    const type = pickBellType(inAT);
    // AT中のベル: 揃いやすいが、ナビが出ないことがあり、ナビなしのときはハズレ目になることもある
    const atNavi = inAT && Math.random() < 0.6 ? naviFor('red') : null;
    const atBellMiss = inAT && !atNavi && Math.random() < 0.3;
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
  } else if (Math.random() < (inAT ? MELON_AT_RATE : MELON_RATE)) {
    // スイカ: 強=中段(中リールを狙う。取りこぼしあり) / 弱=斜め(自動で揃う)
    playRole(Math.random() < MELON_STRONG_P ? 'melon' : 'melonW', inAT);
  } else if (Math.random() < (inAT ? CHERRY_AT_RATE : CHERRY_RATE)) {
    // チェリー: 強=中段 / 弱=上下段 (左リールを狙う。取りこぼしあり)
    playRole(Math.random() < CHERRY_STRONG_P ? 'cherryS' : 'cherryW', inAT);
  } else if (Math.random() < (inAT ? REPLAY_AT_RATE : REPLAY_RATE)) {
    // リプレイ: 図柄が揃って、次のゲームは投入枚数なし
    replayPending = true;
    runRole('replay', () => {
      stopTension();
      spinBtn.innerText = 'リプレイ (レバーON)';
      playReplayJingle();
      updateUI();
      maybeShowAtResult();
    });
  } else if (!inAT && Math.random() < CHANCE_S_P) {
    playRole('chanceS', false);     // 強チャンス目
  } else if (!inAT && Math.random() < CHANCE_W_P / (1 - CHANCE_S_P)) {
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

