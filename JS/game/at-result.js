// ==========================================
// JS/game/at-result.js  —  ATリザルト・獲得枚数OVER・次回示唆
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* ---------- ATリザルト ---------- */
const atResultEl = document.getElementById('at-result');
const atResultGain = document.getElementById('at-result-gain');
const arHintBar = document.getElementById('ar-hint-bar');
const arHintText = document.getElementById('ar-hint-text');
let atResultRAF = null;

/* 次回モードの抽選と、リザルトで見せる示唆 (示唆は一定確率でズレる) */
const MODES = [{ g: 0, mult: 1 }, { g: 30, mult: 2 }, { g: 40, mult: 4 }, { g: 50, mult: 8 }];
const HINT_LABELS = ['弱', '中', '強', '激アツ'];
function decideNextMode() {
  const m = weightedPick(MODE_WEIGHTS);
  modeGames = MODES[m].g;
  modeMult = MODES[m].mult;
  if (Math.random() < HINT_TRUE) return m;
  if (m === 0) return 1;
  if (m === 3) return 2;
  return Math.random() < 0.5 ? m - 1 : m + 1;
}

function maybeShowAtResult() {
  if (!atEnding || atGames > 0 || !atRun || isAtResult || bonusRun || isPushing) return;
  isAtResult = true;                       // 結果表示までレバーを止める
  const run = atRun;
  setTimeout(() => showAtResult(run), 900);
}

/* PEKA RUSH 開始から終了までの獲得枚数と、次回の当たりやすさ(示唆)を表示 */
/* ペカり君トロフィー: 総回転数が多いほど出やすく、色が設定を示唆 (設定を超える色は出ない) */
const TROPHIES = [
  { name: '銅', c: '#cd7f32' }, { name: '銀', c: '#d5dbe3' }, { name: '金', c: '#ffd23f' },
  { name: '青', c: '#38bdf8' }, { name: '赤', c: '#ff4040' }, { name: '虹', c: '#f0abfc' }
];
function pickTrophy(totalG) {
  const lv = Math.min(6, SETTINGS.level);
  if (Math.random() > Math.min(0.95, 0.08 + totalG / 1200)) return 0;
  const truth = Math.random() < Math.min(0.92, 0.3 + totalG / 2000);
  return truth ? lv : Math.max(1, lv - 1);
}
function trophySVG(c, rainbow) {
  const fill = rainbow ? 'url(#trg)' : c;
  return `<svg viewBox="0 0 24 24"><defs><linearGradient id="trg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a5a"/><stop offset=".25" stop-color="#ffd800"/><stop offset=".5" stop-color="#3be07a"/><stop offset=".75" stop-color="#38a8ff"/><stop offset="1" stop-color="#d946ef"/></linearGradient></defs><path fill="${fill}" d="M7 3h10v2h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v2h1v2H7v-2h1v-2h3v-2.1A5 5 0 0 1 7.3 11H7a4 4 0 0 1-4-4V6a1 1 0 0 1 1-1h3V3zm-2 4a2 2 0 0 0 2 2V7H5zm14 0h-2v2a2 2 0 0 0 2-2z"/></svg>`;
}

/* 獲得枚数の「OVER」表示: ボーナス開始からリザルトまでの合計が、この枚数に達した瞬間に出る。
   250/500/750/1000/1500/2000/3000 は通常。222/444/456/666 は設定示唆で、その設定以上のときだけ出る
   (222=設定2以上 / 444=設定4以上 / 456=設定5以上 / 666=設定6のみ) */
const OVER_NUMS = [
  { n: 222, min: 2 }, { n: 250, min: 0 }, { n: 444, min: 4 }, { n: 456, min: 5 }, { n: 500, min: 0 },
  { n: 666, min: 6 }, { n: 750, min: 0 }, { n: 1000, min: 0 }, { n: 1500, min: 0 }, { n: 2000, min: 0 }, { n: 3000, min: 0 }
];
const HINT_OVER_RATE = 0.18;   // 設定示唆のOVERが出る確率 (条件を満たしたとき)
const overPop = document.getElementById('over-pop');
let overQueue = [];
let overBusy = false;
function showOver(n) {
  if (typeof AUTO_OPT !== 'undefined' && AUTO_OPT.stop.over && AUTOPLAY && [222, 444, 456, 666].includes(n) && !autoPending) autoPending = `OVER ${n}`;
  overQueue.push(n);
  drainOver();
}
function drainOver() {
  if (overBusy || !overQueue.length || !overPop) return;
  overBusy = true;
  const n = overQueue.shift();
  overPop.innerHTML = `${n}<span>OVER!</span>`;
  overPop.className = 'over-pop';
  void overPop.offsetWidth;
  overPop.classList.add('show');
  if (n >= 1000) overPop.classList.add('big');
  rainCoins(n >= 1000 ? 60 : 30);
  if (soundEnabled) { initAudio(); const t0 = audioCtx.currentTime; [784, 988, 1175, 1568].forEach((f, i) => tone(f, t0 + i * 0.07, 0.25, 'triangle', 0.12)); }
  setTimeout(() => { overPop.className = 'over-pop'; overBusy = false; drainOver(); }, 1500);
}
function checkOver() {
  if (!atRun) return;
  const total = diffCoins - atRun.startDiff;
  const prev = atRun.maxTotal || 0;
  if (total <= prev) return;
  atRun.maxTotal = total;
  // 設定示唆(min>0)は条件を満たしても稀にしか出ない。通常の枚数は必ず出る
  OVER_NUMS.filter(x => SETTINGS.level >= x.min && prev < x.n && x.n <= total)
    .filter(x => x.min === 0 || Math.random() < HINT_OVER_RATE)
    .forEach(x => showOver(x.n));
}

/* PEKA RUSH 開始から終了までの獲得枚数と、次回の当たりやすさ(示唆)を表示 */
function showAtResult(run) {
  isAtResult = true;
  const only = !!run.bonusOnly;
  let gain = run.gain !== undefined ? run.gain : diffCoins - run.startDiff;
  const hint = only ? 0 : (run.hint !== undefined ? run.hint : decideNextMode());
  const resType = run.type || 0;
  document.getElementById('at-result-title').textContent = only ? 'BONUS RESULT' : (resType ? `${AT_TYPES[resType].name}${atRun && atRun.super ? ' SUPER' : ''} RESULT` : 'AT RESULT');
  atResultEl.classList.toggle('t-heaven', !only && resType === 1);
  atResultEl.classList.toggle('t-death', !only && resType === 2);
  atType = 0;
  document.getElementById('ar-row-games').style.display = only ? 'none' : '';
  document.getElementById('ar-row-bells').style.display = only ? 'none' : '';
  document.getElementById('ar-hint-row').style.display = only ? 'none' : '';
  document.getElementById('ar-games').textContent = `${run.games} G`;
  document.getElementById('ar-bells').textContent = `${run.bells} 回`;
  document.getElementById('ar-bonus').textContent = `${run.bonuses} 回`;
  document.getElementById('ar-total').textContent = `${cumulativeGames} G`;
  const tr = run.trophy !== undefined ? run.trophy : pickTrophy(cumulativeGames);
  const trEl = document.getElementById('ar-trophy');
  trEl.className = 'ar-trophy' + (tr ? ` show t${tr}` : '');
  if (tr) {
    const T = TROPHIES[tr - 1];
    trEl.style.setProperty('--tc', T.c);
    trEl.innerHTML = `${trophySVG(T.c, tr === 6)}<span>ペカり君トロフィー</span><b>${T.name}</b>`;
  } else trEl.innerHTML = '';
  arHintBar.dataset.lv = hint;
  [...arHintBar.children].forEach((el, i) => el.classList.toggle('on', i <= hint));
  arHintText.textContent = HINT_LABELS[hint];
  arHintText.dataset.lv = hint;
  atResultGain.className = 'at-result-gain ' + (gain >= 0 ? 'plus' : 'minus');
  atResultEl.classList.remove('show');
  void atResultEl.offsetWidth;
  atResultEl.classList.add('show');

  // 獲得枚数を 0 から高速カウントアップ
  const fmt = v => (v >= 0 ? '+' : '') + v;
  cancelAnimationFrame(atResultRAF);
  const t0 = performance.now();
  const ms = 1300;
  const frame = now => {
    const p = Math.min(1, (now - t0) / ms);
    atResultGain.textContent = fmt(Math.round(gain * (1 - Math.pow(1 - p, 3))));
    if (p < 1) {
      atResultRAF = requestAnimationFrame(frame);
    } else if (gain > 0) {
      playPayoutSound(gain >= 1000 ? 6 : gain >= 300 ? 4 : 2);
      playPayoutFanfare(gain >= 1500 ? 10 : gain >= 800 ? 8 : gain >= 300 ? 5 : 2);
      if (gain >= 800) { tripleFlash(); burstParticles('gold', 90); }
    }
  };
  atResultRAF = requestAnimationFrame(frame);
}

document.getElementById('at-result-close').addEventListener('click', () => {
  cancelAnimationFrame(atResultRAF);
  atResultEl.classList.remove('show');
  stopParticles();
  isAtResult = false;
  atRun = null;
  atGrade = 0;
  atUpLeft = 0;
  atEnding = false;
  sinceEnd = 0;          // ここからボーナス終了後のゲーム数を数える
  updateAT();
});

function playReplayJingle() {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  [784, 988, 1175].forEach((f, i) => tone(f, t + i * 0.07, 0.18, 'triangle', 0.16));
}

function hideLoseReels() {
  alignDisplay.classList.remove('show-lose');
  gogoTextContainer.classList.remove('opacity-0');
}

/* 枚数の数字の大きさ: 枚数(レベル)が大きいほどデカく、桁数に合わせて画面幅いっぱいまで */
const lcdW = () => (document.getElementById('lcd-stage') || gogoBox).clientWidth;   // 演出液晶の幅
const PAY_BASE_PX = { 1: 92, 2: 104, 3: 116, 4: 128, 5: 140, 6: 152, 7: 164 };
function applyPayoutStyle(coins, level) {
  payoutNum.className = `payout-num pay-l${level}`;
  const avail = Math.max(120, lcdW() - 16);
  const digits = String(coins).length;
  const fit = avail / (digits * 0.78 + 0.55);            // 桁数ぶんが横幅に収まる最大サイズ
  payoutNum.style.setProperty('--fs', Math.min((PAY_BASE_PX[level] || 100) * 0.62, fit) + 'px');
}

/* 枚数表示のアニメーションを最初から再生 */
function restartPayAnim() {
  payoutDisplay.classList.remove('show-pay');
  void payoutDisplay.offsetWidth;
  payoutDisplay.classList.add('show-pay');
}

/* 数字を from → to まで高速で増やす (だんだん減速。カチカチ音つき) */
function countUp(from, to, ms, onDone) {
  isCounting = true;
  cancelAnimationFrame(countRAF);
  const t0 = performance.now();
  let lastTick = 0;
  payoutValue.textContent = from;

  const frame = now => {
    const p = Math.min(1, (now - t0) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    payoutValue.textContent = Math.round(from + (to - from) * eased);
    setLedWin(Math.round(from + (to - from) * eased));
    if (now - lastTick > 45 && p < 1 && soundEnabled && audioCtx) {
      lastTick = now;
      tone(900 + 900 * p, audioCtx.currentTime, 0.04, 'square', 0.05);
    }
    if (p < 1) {
      countRAF = requestAnimationFrame(frame);
    } else {
      payoutValue.textContent = to;
      setLedWin(to);
      isCounting = false;
      countRAF = null;
      if (onDone) onDone();
    }
  };
  countRAF = requestAnimationFrame(frame);
}

/* 2回目(NEXT): 獲得するボーナス枚数をドドーンと派手に表示 (実際の獲得は、このあとのベルで少しずつ) */
function showPayout() {
  alignStage = 2;
  isBonusAligned = true;
  initAudio();

  const tier = BIG_TIERS[pendingTierIndex];
  const reg = pendingReg && !pendingZone;
  const coins = reg ? regCoins() : bigCoins();   // REG=100枚 / BIG=200枚（固定）
  const styleCoins = reg ? coins : tier.coins;   // 表示の派手さは当選ランクで決める
  if (!isDebugRun) {
    if (reg) regCount++; else bigCount++;
    pendingPlan = makeBonusPlan(pendingZone ? 0 : coins, pendingZone ? { zone: true, atWin: false, level: 0 } : Object.assign({ reg, tier: reg ? 0 : pendingTierIndex }, pendingWhiteDiag ? { atWin: true, superP: 0.6 } : {}));   // ラッシュ中の7揃いはG数上乗せのみ (枚数なし)
    bonusLog.push({ g: cumulativeGames, type: reg ? 'REG' : 'BIG', coins: pendingZone ? 0 : coins });
    recordPoint();
  }

  currentShownCoins = pendingZone ? 0 : coins;
  fxOverlay.className = `fx-t${pendingTierIndex + 1}`;   // 枚数表示で背景が豪華に
  const level = payLevel(styleCoins);
  payoutLabel.textContent = pendingZone ? 'PEKA! PEKA! MOUNTAIN!' : reg ? 'REG BONUS' : 'BIG BONUS';
  applyPayoutStyle(styleCoins, level);

  // 図柄を消して枚数を表示 (アニメーションを最初から再生)
  alignDisplay.classList.remove('show-align');
  restartPayAnim();

  const rank = pendingTierIndex + 1;
  if (styleCoins >= VVV_MIN_COINS) playGakoSound('vvv'); // 大きい枚数のときだけ枚数表示で vvv.mp3
  // 0 から高速カウントアップ → 数字が決まった瞬間にドドーン+ファンファーレ
  const onCounted = () => {
    playPayoutSound(level);
    playPayoutFanfare(rank);
    if (tier.grand) {
      tripleFlash();
      burstParticles('gold', 90);
      shakeMain(800);
    } else {
      triggerFlash();
      shakeMain(350);
    }
  };
  payoutNum.classList.toggle('no-unit', !!pendingZone);   // 「G UP!」のときは「枚」を付けない
  if (pendingZone) {
    // ラッシュ中: 枚数は出ない。G数の上乗せチャンスのみ
    payoutNum.style.setProperty('--fs', Math.min((PAY_BASE_PX[level] || 100) * 0.62, Math.max(120, lcdW() - 16) / 3.4) + 'px');
    payoutValue.textContent = 'G UP!';
    setLedWin(0);
    setTimeout(onCounted, 700);
  } else {
    countUp(0, coins, 1100, onCounted);
  }

  // NEXTボタンを無効化し、レバーを「ボーナス開始」に
  alignBtn.disabled = true;
  alignBtn.className = ALIGN_BTN_DEFAULT;

  spinBtn.disabled = false;
  spinBtn.innerText = "ボーナス開始 (レバーON)";

  updateUI();
}

/* 心音 (ドクン…ドクン): フリーズ中に鳴らす。だんだん速く・大きくなる */
let heartbeatTimer = null;
let heartbeatOn = false;

function thump(t, vol) {
  // 低音の本体 + スマホスピーカーでも聞こえる少し高い成分
  [[90, 45, 'sine', vol], [200, 80, 'triangle', vol * 0.5]].forEach(([f0, f1, type, v]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.18);
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  });
}

function startHeartbeat(totalMs, delay = 350) {
  stopHeartbeat();
  heartbeatOn = true;
  const startedAt = performance.now();
  const beat = () => {
    if (!heartbeatOn) return;
    const p = Math.min(1, (performance.now() - startedAt) / totalMs); // 0→1 (エンド間際ほど1)
    if (soundEnabled) {
      initAudio();
      const t = audioCtx.currentTime;
      const vol = 0.55 + p * 0.45;
      thump(t, vol);            // ドクン
      thump(t + 0.17, vol * 0.75); // …ドクン
    }
    heartbeatTimer = setTimeout(beat, 950 - 450 * p); // だんだん速く
  };
  heartbeatTimer = setTimeout(beat, delay);
}

function stopHeartbeat() {
  heartbeatOn = false;
  clearTimeout(heartbeatTimer);
  heartbeatTimer = null;
}

/* ランプ状態をリセットして通常状態に戻す */
function resetPekaState() {
  window.bonusSure = false; window.flag7Game = false;
  if (window.czKeepClear) czKeepClear();
  window.pekaLit = false; window.pekaAt = null; window.sideGogo = false; window.sideAt = null; window.sideConfirm = false; window.sideRb = 0;
  isPekared = false;
  isBonusAligned = false;
  pendingBonusType = null;
  pendingReg = false;
  pendingWhiteDiag = null;
  pendingTierIndex = -1;
  pendingDisplayIndex = -1;
  pendingPlan = null;
  cancelReels();
  hideChance();
  hideNavi();
  clearPekaTimers();
  omenOff();
  stopTension();
  clearTimeout(suspenseTimer);
  isSuspense = false;
  stopHeartbeat();
  cancelAnimationFrame(countRAF);
  countRAF = null;
  isCounting = false;
  currentShownCoins = 0;
  isDebugRun = false;

  // ロック中にリセットされた場合の後始末
  clearInterval(lockInterval);
  lockInterval = null;
  isCooldown = false;
  spinBtn.disabled = false;
  alignBtn.disabled = true;
  alignBtn.className = ALIGN_BTN_DEFAULT;
  alignBtn.textContent = 'ボーナスを揃える！';
  alignStage = 0;

  gogoBox.className = GOGO_BASE;
  fxOverlay.className = '';
  gogoSubtext.style.opacity = '0';
  gogoSubtext.textContent = 'CHANCE';

  alignDisplay.classList.remove('show-align', 'show-lose');
  payoutDisplay.classList.remove('show-pay');
  gogoTextContainer.classList.remove('opacity-0');

  stopParticles();
  mainEl.classList.remove('shake-main');

  spinBtn.innerText = "レバーON";
}

