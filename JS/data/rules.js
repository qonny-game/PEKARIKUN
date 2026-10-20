// ==========================================
// JS/data/rules.js  —  停止順・取りこぼし・各種恩恵のルール (ここに集約)
// 読み込み: settings.js の次。reel-spin.js / auto.js / cherry.js / bonus.js から参照する。
// STOP_RULES = 停止順・滑り・取りこぼし / BENEFITS = 役ごとの恩恵・ボーナス中のレア役・サンド目の恩恵。
// ルールを変えるときは、まずこのファイルを見る。
// ==========================================
const STOP_RULES = {
  /* ---------- 押し順 ----------
     下パネルの停止ボタン: 押した通りに止まる (制限なし)。
     画面タップ・レバーボタン・長押し連打・オートプレイ・設定の「自動停止」:
       押し順ナビがあればナビ順 / なければ 左→中→右 / サンド目は 中→左→右 */
  isSandLike(plan) { return !!plan && (plan.kind === 'sand' || !!plan.sandMid); },
  autoOrder(plan, navi) {
    if (navi && navi.length) return navi.slice();
    return this.isSandLike(plan) ? [1, 0, 2] : [0, 1, 2];
  },
  /* タップ等で次に止めるリール (止まっていないもののうち、autoOrder の先頭) */
  nextCol(rs, navi) {
    return this.autoOrder(rs.plan, navi).find(c => rs.cols[c] && rs.cols[c].state === 'spin');
  },

  /* ---------- 滑り (目押しで引き込めるコマ数) ---------- */
  slip: {
    normal: 4,    // 通常
    super7: 12,   // SUPERの15枚役の7: 大きめ。それでも外すと取りこぼし
    seven: 20     // 7揃え・REG: 激アマ (1周) 。ランプや確定画面が出ていても7は自力で揃える
  },

  /* ---------- 取りこぼし ----------
     sand      : なし (疑似遊戯。中を押せば必ず揃う)
     superbell : 7を外すと15枚を取りこぼす (MISS)。7の位置は 左下・中段・右上 のランダム
     cherry / melon (強スイカ・強/弱チェリー): 取りこぼしあり。枚数だけ取りこぼし、恩恵 (上乗せ・当選率UP・オーラUP) はもらえる
     bonusRare (ボーナス中のチェリー/スイカ): 同上。押し順ナビは出ず「!!!」の文字だけ
     強スイカは第3リールだけ自動で停止 (第1・第2リールは目押し) */
  isAimedRole(role) { return role === 'cherryW' || role === 'cherryS' || role === 'melon'; },   // 取りこぼしがある役 (恩恵は BENEFITS.onMiss)

  /* オートプレイ・自動停止 (目押しなし) で、必ず揃う役。チェリー・スイカは自動では揃わない */
  autoAlign: { sand: true, seven: true, reg: true, superbell: true, cherry: false, melon: false }
};

/* ==========================================
   恩恵 (役が成立したときにもらえるもの)
   ========================================== */
const BENEFITS = {
  /* 取りこぼしたとき: 枚数だけ取りこぼす。恩恵 (上乗せ・当選率UP・オーラUP) はもらえる */
  onMiss: { coins: 0, effects: true },

  /* 役ごとの恩恵
     coins: 払い出し枚数 (取りこぼすと onMiss.coins)
     m / g: 通常時の「当選率UP」の倍率 / 期間(G)
     atP / upM: AT中の上乗せ抽選率 / 上乗せG数の倍率 */
  role: {
  cherryW: { label: '弱チェリー',   coins: () => CHERRY_COINS, m: () => CHERRY_MULT, g: 15, upM: 1, atP: () => CHERRY_AT_SUCCESS, notes: [1319, 1760, 2349] },
  cherryS: { label: '強チェリー',   coins: () => CHERRY_COINS * 2, m: () => CHERRY_MULT * 2.5, g: 15, upM: 2, atP: () => 1, notes: [1319, 1760, 2349, 2637] },
  melonW:  { label: '弱スイカ',     coins: () => Math.max(1, MELON_COINS - 2), m: () => 2, g: 15, upM: 1.2, atP: () => 0.8, notes: [1047, 1319, 1568] },
  melon:   { label: '強スイカ',     coins: () => MELON_COINS, m: () => 4, g: 15, upM: 2.5, atP: () => 1, notes: [1047, 1319, 1568, 2093] },
  chanceW: { label: '弱チャンス目', coins: () => 0, m: () => 3, g: 8, upM: 1, atP: () => 0, notes: [523, 659, 784] },
  chanceS: { label: '強チャンス目', coins: () => 0, m: () => 8, g: 8, upM: 1, atP: () => 0, notes: [523, 659, 784, 1047, 1319] }
  },

  /* ボーナス中のチェリー/スイカ (押し順ナビは出ず「!!!」だけ)
     p: 1Gあたりの発生率 / strongP: 強の割合 / aura: オーラの上昇段数 / atWinP: AT当選の追加抽選 (×段数) */
  bonusRare: { p: 0.12, strongP: 0.3, aura: { weak: 1, strong: 2 }, atWinP: 0.15 },

  /* サンド目
     upG: AT中に揃えたときの上乗せG数 (どれか抽選)
     bonusP: ボーナス中のサンド目発生率 / bonusWin: ボーナス中に揃えたときの恩恵 (AT確定・SUPER率・オーラ) */
  sand: { upG: [5, 10, 15, 20, 25, 30, 50], bonusP: 0.05, bonusWin: { superP: 0.7, aura: 6 } }
};

/* ATグレード（内部用・非表示。デバッグ版 debug.html の AT表示にだけ出す）
   AT開始時に 1〜20 を抽選。高グレードほど 上乗せ（チェリー・スイカ・サンド目・ポイント・バトルの取りやすさ）が多い。
   SKEW: 大きいほど低グレードが多い / TYPE_BONUS: HEAVEN・DEATH は高グレードが出やすい / SUPER_BONUS: SUPER はさらに上がる
   UP_MIN〜UP_MAX: 上乗せ抽選にかける倍率（グレード1で UP_MIN、グレード20で UP_MAX）。UP_POW: 中ほどの伸び方 */
const AT_GRADE = { MAX: 20, SKEW: 1.8, TYPE_BONUS: [0, 3, 6], SUPER_BONUS: 2, UP_MIN: 0.03, UP_MAX: 1.6, UP_POW: 1.2 };
function pickAtGrade(type, sup) {
  const A = AT_GRADE;
  let g = 1 + Math.floor(Math.pow(Math.random(), A.SKEW) * A.MAX);
  g += (A.TYPE_BONUS[type] || 0) + (sup ? A.SUPER_BONUS : 0);
  return Math.min(A.MAX, g);
}
/* 上乗せ抽選の倍率。ATの外（グレード0）から呼ばれたときは中くらい(10)として扱う */
function atUpMult() {
  const A = AT_GRADE;
  const g = (typeof atGrade !== 'undefined' && atGrade > 0) ? atGrade : 10;
  return A.UP_MIN + (A.UP_MAX - A.UP_MIN) * Math.pow((g - 1) / (A.MAX - 1), A.UP_POW);
}

