// ==========================================
// JS/data/config.js  —  定数・確率・設定値の表（ゲームの数字はここで編集する）
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
// ==========================================
// BIG 当たり種類 (150枚〜400枚の6種類)
// glow: GOGO!の発光色 / sub: ペカリ中のサブ表示
// ボーナス枚数は、ボーナス中のベルで少しずつ獲得する
// ==========================================
const BIG_TIERS = [
  { coins: 150, glow: '#3b82f6', sub: 'CHANCE' },
  { coins: 200, glow: '#22c55e', sub: 'CHANCE' },
  { coins: 250, glow: '#f97316', sub: 'CHANCE!' },
  { coins: 300, glow: '#ef4444', sub: 'CHANCE!' },
  { coins: 350, glow: '#a855f7', sub: 'BIG CHANCE!' },
  { coins: 400, glow: '#facc15', sub: 'BIG CHANCE!!', grand: true }
];

// ==========================================
// 確率設定 (画面の設定ボタンから手動で編集できる。値はブラウザに保存される)
//   weights : [150, 200, 250, 300, 350, 400] の比率 (合計が100でなくても比率として扱う)
//   その他  : 単位は %
// ==========================================
const TIER_LABELS = BIG_TIERS.map(t => String(t.coins));
const BASE_COINS = BIG_TIERS.map(t => t.coins);   // 遊モードでは BIG_TIERS[i].coins を倍率で書き換える
const DEFAULT_SETTINGS = {
  hitDenom: 100,                                       // 通常時のボーナス当選確率 1/N (基本はチェリー→高確率で当てる)
  weights: [30, 25, 20, 13, 8, 4],                    // 当選枚数の比率
  atEntryMin: 20,      // ボーナス150枚のときのAT突入率 (枚数が多いほど高くなる)
  atEntryMax: 80,      // ボーナス400枚のときのAT突入率
  auraWhite: 15,       // AT当選時に、オーラが一度も昇格しない (白のまま) 割合
  bonusBellPay: 15,    // ボーナス中: 1ゲームのベル払い出し枚数
  replay: 13.7,        // ハズレのうちリプレイになる割合 (約1/7.3)
  bellNormal: 13.3,       // 通常時: ハズレのうちベルが揃う割合
  bellAt: 55,          // AT中: ハズレのうちベルが揃う割合
  replayAt: 35,        // AT中: ハズレのうちリプレイになる割合
  atHitMult: 0.4,      // AT中のボーナス当選確率の倍率 (低いほど当選しにくい)
  atW50: 80,           // AT継続G数の比率: +50G (ほとんどこれ)
  atW100: 14,          // +100G (稀)
  atW200: 5,           // +200G (稀)
  atW300: 1,           // +300G (ごく稀)
  bellStraight: 15,    // 通常時のベル比率: 直線 (6枚)
  bellDiagTL: 74,      // 斜め 左上から (1枚)
  bellDiagBL: 11,      // 斜め 左下から (15枚)
  atBellStraight: 30,  // AT中のベル比率: 直線 (6枚)
  atBellDiagTL: 5,     // 斜め 左上から (1枚)
  atBellDiagBL: 65,    // 斜め 左下から (15枚)
  cherry: 3,           // 通常時: ハズレのうちチェリーが揃う割合 (左列に1個で成立)
  cherryMult: 2,       // チェリー後 (内部高確率) のボーナス当選確率の倍率
  cherryG: 15,         // チェリー後の内部高確率の期間 (G)
  cherryAt: 3.5,       // AT中: ハズレのうちチェリーが揃う割合
  cherryAtSuccess: 80, // AT中の弱チェリーでG数が上乗せされる割合 (外れもある)
  cherryW10: 50,       // 上乗せ量の比率: +10G
  cherryW20: 30,       // +20G
  cherryW25: 15,       // +25G
  cherryW30: 5,        // +30G
  cherryCoins: 2,      // チェリーの払い出し枚数
  melon: 2,            // 通常時: ハズレのうちスイカが成立する割合 (中リールを狙わないと揃わない)
  melonAt: 2.5,        // AT中: ハズレのうちスイカが成立する割合 (揃うとG数上乗せ確定)
  melonCoins: 5,       // スイカの払い出し枚数
  modeW0: 55,          // AT終了後の次回モード比率: 通常 (示唆: 弱)
  modeW1: 28,          // 好調 (30G / 当選率2倍)
  modeW2: 14,          // 絶好調 (40G / 4倍)
  modeW3: 3,           // 天国 (50G / 8倍)
  hintTrue: 70,        // リザルト示唆が実際のモードと一致する割合
  coinScale: 1,        // ボーナス枚数の倍率 (遊モードは0.5)
  gScale: 1,           // ATの獲得G数の倍率 (遊モードは0.5)
  typeW0: 84,          // ATタイプの比率: RUSH
  typeW1: 12,          // HEAVEN
  typeW2: 4            // DEATH
};
const APP_VERSION = '1.37.13';
const SETTINGS_KEY = 'pekari-settings-v5';   // v5: モード (本気/極楽/遊) を追加。機械割は100〜130%

// ==========================================
// 設定 1〜6 (高設定ほど出玉が良い) と 設定7 (デバッグ用: すぐ当たる)
// 設定7は画面にボタンが無く、設定ボタンを 6 5 6 6 4 5 6 の順に押したときだけ入る
// ==========================================
const LEVEL_VALUES = {
  // 機械割 (シミュレーション値): 設定1=約96% / 2=約99% / 3=約102% / 4=約105% / 5=約109% / 6=約114% (設定7はデバッグ用)
  //                   S1    S2    S3    S4    S5    S6    S7
  hitDenom:        [597,  579,  576,  567,  551,  543,    5],   // ボーナス当選確率 1/N (基本。チェリー後はさらに上がる)
  cherry:          [3.4,  3.4,  3.4,  3.4,  3.4,  3.4,   30],   // チェリー確率
  melon:           [2.33, 2.33, 2.33, 2.33, 2.33, 2.33,  20],   // スイカ確率
  atHitMult:       [0.40, 0.40, 0.40, 0.40, 0.40, 0.40,   3],   // AT中のボーナス(ゾーン)当選確率の倍率
  replay:          [16.0, 16.3, 16.5, 16.8, 17.0, 17.4,   14],
  atEntryMin:      [20,   21,   22,   23,   24,   25,   100],   // AT突入率 (150枚時)
  atEntryMax:      [76,   77,   79,   80,   82,   84,   100],   // AT突入率 (400枚時)
  atW50:           [76,   76,   76,   76,   76,   76,    25],
  atW100:          [15,   15,   15,   15,   15,   15,    25],
  atW200:          [7,    7,    7,    7,    7,    7,     25],
  atW300:          [2,    2,    2,    2,    2,    2,     25],
  cherryAtSuccess: [80,   80,   80,   80,   80,   80,   100],   // AT中のチェリーで上乗せが成立する割合
  modeW0:          [56,   55,   54,   52,   50,   48,     0],
  modeW1:          [29,   29,   29,   30,   30,   30,     0],
  modeW2:          [11,   12,   12,   13,   14,   15,     0],
  modeW3:          [4,    4,    5,    5,    6,    7,   100]
};
const LEVEL_TIER_WEIGHTS = [
  [34, 26, 20, 11, 6, 3], [32, 25, 21, 12, 7, 3.5], [30, 25, 21, 13, 7.5, 4],
  [28, 24, 22, 14, 8.5, 4.5], [26, 23, 22, 15, 9, 5], [24, 22, 22, 16, 10, 6], [0, 0, 0, 10, 30, 60]
];
const DEFAULT_LEVEL = 4;
const SECRET_SEQ = [6, 5, 6, 6, 4, 5, 6];

// アセットの場所（画像・音声をフォルダ移動するときはここだけ直す）
const ASSET_DIR = { img: 'assets/img/', sound: 'assets/sound/' };

/* サイドランプの色と対応役（ここだけ直せば全体が変わる）
   color: 色名→色  /  omen: 予告の種類→色（リール回転前）  /  win: 揃った役→色（揃ったあと一瞬）  /  rainbow: 虹色にする場面は sideLampShow('heaven') */
const LAMP_TABLE = {
  color: { red: '#ff3b30', green: '#22c55e', blue: '#3b82f6', yellow: '#facc15', pink: '#d946ef', early: '#facc15' },
  pattern: { red: 'chase', green: 'sweep', pink: 'pulse', blue: 'solid', yellow: 'solid', early: 'chase' },   // 点灯パターン
  omen: { cherry: 'red', melon: 'green', chance: 'pink' },
  win: { replay: 'blue', bell0: 'yellow', bell1: 'yellow', bell2: 'yellow', melon: 'green', melonW: 'green', cherryW: 'red', cherryS: 'red' }
};
