# ファイルマップ（自動生成・直接編集しない）

読み込み順（index.html）どおりに並べている。後ろのファイルほど前のものを上書き・拡張できる。

| # | ファイル | 役割 | 行数 | 主な名前 |
|---|---|---|---|---|
| 1 | `JS/data/config.js` | 定数・確率・設定値の表（ゲームの数字はここで編集する） | 116 | BIG_TIERS, TIER_LABELS, BASE_COINS, DEFAULT_SETTINGS, APP_VERSION, SETTINGS_KEY, LEVEL_VALUES, LEVEL_TIER_WEIGHTS …他4 |
| 2 | `JS/data/symimg.js` |  | 2 | SYM_IMG |
| 3 | `JS/core/settings.js` | 遊び方モード・機械割・設定の適用/保存/読み込み | 141 | PLAY_MODES, MODE_HITDENOM, MODE_RATES, DEFAULT_PROFILES, PROFILES_BY_MODE, mergeProfile, loadSettings, saveSettings …他14 |
| 4 | `JS/core/state.js` | ゲーム状態変数・UI要素の参照 | 82 | gameHistory, bonusLog, recordPoint, roleStat, totalGames, cumulativeGames, bigCount, atCount …他58 |
| 5 | `JS/core/audio.js` | 音声（効果音・ペカリ音・枚数表示のファンファーレ） | 282 | audioCtx, initAudio, SOUND_FILES, soundAudio, soundBuffers, VVV_MIN_COINS, SAMPLE_MAX_SEC, SAMPLE_FADE_SEC …他11 |
| 6 | `JS/core/effects.js` | 画面演出（フラッシュ・パーティクル・シェイク） | 136 | flashTimer, triggerFlash, tripleFlash, shakeMain, particles, particleMode, particleRAF, resizeCanvas …他7 |
| 7 | `JS/game/flow.js` | ゲーム進行の中心（レバーON・当選処理・ペカ演出・枚数表示） | 599 | PEKA_FX, pickPekaFx, pekaLater, clearPekaTimers, sideL, sideR, SIDE_COLOR, sideTok …他38 |
| 8 | `JS/game/reels.js` | リール表示・リール配列・役の組み合わせ | 131 | REEL_LINES, EMOJI, SYM_FALLBACK, symbolHTML, lineOf, STRIP_LEN, STRIPS, SEVENS …他13 |
| 9 | `JS/game/reel-spin.js` | リール回転・目押し停止・予告・役の結果 | 385 | OPT_KEY, AUTO_STOP, saveOpt, SPIN_SPEED, SLIP_MAX, CELL_H, reelSpin, isReelSpinning …他31 |
| 10 | `JS/game/bell.js` | ベル | 137 | BELL_TYPES, pickBellType, bellBadge, getPop, getRAF, rainCoins, playJaraJara, getRumbleLen …他6 |
| 11 | `JS/game/cherry.js` | チェリー | 170 | cherryStatus, cherryRemain, updateCherry, CHERRY_AT_CHOICES, pickCherryAtG, setBoost, cherryEffects, ROLE_INFO …他14 |
| 12 | `JS/game/at.js` | AT（ペカラッシュ）・PUSH演出 | 137 | atStatus, atRemain, atLabel, atToast, updateAT, updateAtGain, showAtToast, AT_CHOICES …他9 |
| 13 | `JS/game/bonus.js` | ボーナス消化・押し順ナビ・ドンドンドン | 406 | AURA_NAMES, AURA_WIN_W, AURA_LOSE_W, auraEl, atEntryRateFor, pickAuraLevel, ZONE_G_CHOICES, ZONE_G_WEIGHTS …他29 |
| 14 | `JS/game/at-result.js` | ATリザルト・獲得枚数OVER・次回示唆 | 371 | atResultEl, atResultGain, arHintBar, arHintText, atResultRAF, MODES, HINT_LABELS, decideNextMode …他27 |
| 15 | `JS/ui/display.js` | 電光掲示（LED・ランプ表示） | 219 | setOn, setLed, ledWinEl, ledCreditEl, ledTotalEl, ledWin, setLedWin, creditNow …他13 |
| 16 | `JS/game/auto.js` | オートプレイ・サウンドボタン | 168 | autoBtn, AUTO_KEY, AUTO_SPEEDS, AUTO_STOPS, AUTO_OPT, saveAutoOpt, AUTOPLAY, autoIdle …他20 |
| 17 | `JS/ui/settings-panel.js` | 確率設定パネル | 165 | settingsModal, settingsBody, displayRate, SETTING_ROWS, formLevel, secretBuf, buildSettingsForm, setMode …他6 |
| 18 | `JS/ui/graph.js` | 当選グラフ | 131 | graphModal, graphLine, graphBars, graphSummary, LEVEL_COLORS, bonusColor, setupCanvas, drawEmpty …他3 |
| 19 | `JS/ui/more-menu.js` | 下部バーの歯車メニュー (オート設定・リール配列・確率設定・称号 など) | 17 |  |
| 20 | `JS/ui/modal.js` | モーダル共通・版の表示 | 28 | openModal, closeModal, versionEl, cabVerEl |
| 21 | `JS/ui/reel-view.js` | リール配列の表示 | 26 | reelModal, reelView, miniSym, buildReelView |
| 22 | `JS/ui/boot.js` | 起動時の初期化（iOS対策・画面スリープ防止） | 29 | lastTouchEnd |
| 23 | `JS/ext/bgm.js` | BGMエンジン (1.20.24) | 249 |  |
| 24 | `JS/ext/fx.js` | 追加演出 | 1040 |  |
| 25 | `JS/ext/lcd.js` | 演出液晶 | 799 | fitReels |
| 26 | `JS/ext/trophy.js` | トロフィー / ミッション / ランキング | 218 |  |

## その他

| ファイル | 役割 |
|---|---|
| `index.html` | 本体の画面（PC/SP共通。読み込み順の定義） |
| `debug.html` | 演出確認用パネル（同じJSを読む） |
| `guide.html` | 攻略ガイド |
| `CSS/fx.css` | 追加演出のスタイル（カットイン・称号・コインの山など） |
| `CSS/layout4.css` | 4段構成の筐体レイアウト・ゾーン開始演出 |
| `CSS/lcd.css` | 演出液晶（ペカり君・飛来物・示唆）のスタイル |
| `CSS/modern.css` | 演出のスタイル刷新（1.20.19〜） |
| `CSS/neon.css` | 筐体デザイン（ネオン調） |
| `CSS/style.css` | 本体のスタイル（筐体・リール・電光掲示・設定画面） |
| `CSS/trophy.css` | トロフィー / ミッション / ランキングのスタイル |
| `assets/img/` | 図柄画像（元画像。JS/data/symimg.js に埋め込み済み）・ロゴ・パネル画像 |
| `assets/img/guide/` | 攻略ガイドの画像 |
| `assets/sound/` | 効果音・BGM・ボイス（mp3） |
