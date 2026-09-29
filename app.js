// ==========================================
// BIG 当たり種類 (10種類 / 200枚〜1000枚 + 2000枚が1つ)
// glow: GOGO!の発光色 / sub: ペカリ中のサブ表示
// ==========================================
const BIG_TIERS = [
  { coins: 200,  glow: '#3b82f6', sub: 'CHANCE' },
  { coins: 300,  glow: '#22c55e', sub: 'CHANCE' },
  { coins: 400,  glow: '#f97316', sub: 'CHANCE!' },
  { coins: 500,  glow: '#ef4444', sub: 'CHANCE!' },
  { coins: 600,  glow: '#a855f7', sub: 'BIG CHANCE!' },
  { coins: 700,  glow: '#facc15', sub: 'BIG CHANCE!' },
  { coins: 800,  glow: '#22d3ee', sub: 'BIG CHANCE!!' },
  { coins: 900,  glow: '#ff5a1f', sub: 'SUPER CHANCE!!' },
  { coins: 1000, glow: '#ffd700', sub: '★ GRAND CHANCE ★', grand: true },
  { coins: 2000, glow: '#ffffff', sub: '★★ MEGA JACKPOT ★★', grand: true, mega: true }
];

// ==========================================
// ボーナス確率 (当選1回あたり)
//   REG・200枚・300枚 : 3つとも同じ確率 (LOW_RATE)
//   400枚以上の8種類  : 残りを均等に分配
// ==========================================
const LOW_RATE = 0.20;  // REG / 200 / 300 それぞれの確率 (ここを変えれば調整できる)
const LOW_MAX_COINS = 300;
const REG_RATE = LOW_RATE;

const HIGH_TIERS_COUNT = BIG_TIERS.filter(t => t.coins > LOW_MAX_COINS).length;
const HIGH_RATE = (1 - LOW_RATE * 3) / HIGH_TIERS_COUNT; // 400枚以上の各確率
const TIER_RATES = BIG_TIERS.map(t => (t.coins <= LOW_MAX_COINS ? LOW_RATE : HIGH_RATE));

/* BIGに当選したときの種類(枚数)を抽選 */
function pickTierIndex() {
  const sum = TIER_RATES.reduce((s, p) => s + p, 0); // = 1 - REG_RATE
  let r = Math.random() * sum;
  for (let i = 0; i < TIER_RATES.length; i++) {
    r -= TIER_RATES[i];
    if (r < 0) return i;
  }
  return BIG_TIERS.length - 1;
}

// ゲーム状態変数
let totalGames = 0;       // 表示用G数 (ボーナス当選でリセット)
let cumulativeGames = 0;  // 合算確率計算用の累計G数
let bigCount = 0;
let regCount = 0;
let diffCoins = 0;

let isPekared = false;
let isBonusAligned = false;
let pendingBonusType = null; // 'BIG' | 'REG'
let pendingTierIndex = -1;         // 実際の当たり (枚数・図柄はこちら)
let pendingDisplayIndex = -1;      // GOGO!演出として見せる当たり (ペカリ中の演出・音はこちら)

// 「実は…」演出: 低めの演出(800枚未満)が、一定確率で実は800枚だった
const SURPRISE_RATE = 0.10;
const SURPRISE_TIER_INDEX = BIG_TIERS.findIndex(t => t.coins === 800);

// フリーズフェイク: ブルー脈動(200枚)で、レバーON後に画面が真っ暗 → 実は1000枚 or 2000枚
const FREEZE_RATE = 0.05;                                        // ブルー脈動が出たうち何%でフリーズするか
const FREEZE_MEGA_RATE = 0.2;                                    // フリーズのうち2000枚になる割合 (残りは1000枚)
const FREEZE_GRAND_INDEX = BIG_TIERS.findIndex(t => t.coins === 1000);
const FREEZE_MEGA_INDEX = BIG_TIERS.findIndex(t => t.coins === 2000);
const REG_FREEZE_RATE = 0.05;   // REGが出たうち何%で「REG→フリーズ→777枚」になるか
const CHAIN_7777_RATE = 0.25;   // 777枚フリーズのあと、さらにフリーズして7777枚になる割合
let currentShownCoins = 0;      // いま画面に見せている枚数 (フリーズ時の差枚数計算用)

/* フリーズ明け: 実は1000枚 / 2000枚 / 777枚 / 7777枚 が急に発生! */
function erupt() {
  const st = pendingFreezeStages.shift();
  const n = st.fxN;
  const gorgeous = { grand: true, mega: st.mega };
  const kind = st.mega ? 'mega' : 'gold';

  // 暗転を解除し、本当の当たりの演出に切り替える (心音はここでぷつっと止まる)
  stopHeartbeat();
  endCrtOff();
  isFreezing = false;

  if (!isDebugRun) diffCoins += st.coins - currentShownCoins;
  currentShownCoins = st.coins;
  gogoBox.className = `${GOGO_BASE} peka tier-${n}`;
  gogoBox.style.setProperty('--glow', st.glow);
  fxOverlay.className = `fx-t${n}`;

  // 枚数をドドーンと再表示
  const level = st.level || payLevel(st.coins);
  payoutLabel.textContent = st.label;
  payoutValue.textContent = st.coins;
  payoutNum.className = `payout-num pay-l${level}`;
  payoutDisplay.classList.remove('show-pay');
  void payoutDisplay.offsetWidth;
  payoutDisplay.classList.add('show-pay');

  // 音: vvv.mp3 を0.1秒刻みで連打 + ドドーン、少し遅れてファンファーレ
  playGakoSound('vvv', st.ultra ? 5 : 3, 100);
  playPayoutSound(gorgeous, level);
  setTimeout(() => playFanfare(gorgeous, n - 1), 500);

  // 3連フラッシュ + 金貨/紙吹雪 + シェイク
  tripleFlash();
  startParticles(kind);
  burstParticles(kind, st.mega ? 160 : 90);
  if (st.mega) shakeMain(); else shakeMain(800);

  if (st.ultra) {
    // 7777枚: 追撃の花火! 
    setTimeout(tripleFlash, 700);
    setTimeout(() => burstParticles('mega', 160), 500);
    setTimeout(() => burstParticles('mega', 160), 1000);
    setTimeout(() => { burstParticles('gold', 120); shakeMain(); }, 1500);
  }

  updateUI();
}

/* ランプ状態をリセットして通常状態に戻す */
function resetPekaState() {
  isPekared = false;
  isBonusAligned = false;
  pendingBonusType = null;
  pendingTierIndex = -1;
  pendingDisplayIndex = -1;
  pendingFreezeStages = [];
  currentShownCoins = 0;

  // フリーズ中にリセットされた場合の後始末
  clearTimeout(freezeTimer);
  stopHeartbeat();
  isFreezing = false;
  isDebugRun = false;
  endCrtOff();

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

  alignDisplay.classList.remove('show-align');
  payoutDisplay.classList.remove('show-pay');
  gogoTextContainer.classList.remove('opacity-0');

  stopParticles();
  mainEl.classList.remove('shake-main');

  spinBtn.innerText = "レバーON";
}

/* UIデータ更新 */
function updateUI() {
  displayGames.textContent = totalGames;
  displayBig.textContent = bigCount;
  displayReg.textContent = regCount;

  const totalBonus = bigCount + regCount;
  displayProb.textContent = totalBonus > 0 ? `1/${(cumulativeGames / totalBonus).toFixed(1)}` : `1/0`;

  displayDiff.textContent = (diffCoins >= 0 ? `+${diffCoins}` : `${diffCoins}`);
  displayDiff.className = `digital-font font-bold text-sm ${diffCoins >= 0 ? 'text-green-400' : 'text-red-400'}`;
}

/* データリセット */
function resetData() {
  if (confirm("ゲームデータをリセットしますか？")) {
    totalGames = 0;
    cumulativeGames = 0;
    bigCount = 0;
    regCount = 0;
    diffCoins = 0;
    resetPekaState();
    updateUI();
  }
}

// イベントリスナー
spinBtn.addEventListener('click', handleSpin);
alignBtn.addEventListener('click', handleAlignBonus);
document.getElementById('reset-btn').addEventListener('click', resetData);

// 音声ON/OFF (アイコン表示)
const ICON_SOUND_ON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>`;
const ICON_SOUND_OFF = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

const soundToggleBtn = document.getElementById('sound-toggle-btn');
soundToggleBtn.innerHTML = ICON_SOUND_ON;
soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.innerHTML = soundEnabled ? ICON_SOUND_ON : ICON_SOUND_OFF;
});
