# ファイルマップ（自動生成・直接編集しない）

読み込み順（index.html）どおりに並べている。後ろのファイルほど前のものを上書き・拡張できる。

| # | ファイル | 役割 | 行数 | 主な名前 |
|---|---|---|---|---|
| 1 | `JS/data/config.js` | 定数・確率・設定値の表（ゲームの数字はここで編集する） | 107 | BIG_TIERS, TIER_LABELS, BASE_COINS, DEFAULT_SETTINGS, APP_VERSION, SETTINGS_KEY, LEVEL_VALUES, LEVEL_TIER_WEIGHTS …他3 |
| 2 | `JS/core/settings.js` | 遊び方モード・機械割・設定の適用/保存/読み込み | 141 | PLAY_MODES, MODE_HITDENOM, MODE_RATES, DEFAULT_PROFILES, PROFILES_BY_MODE, mergeProfile, loadSettings, saveSettings …他14 |
| 3 | `JS/core/state.js` | ゲーム状態変数・UI要素の参照 | 81 | gameHistory, bonusLog, recordPoint, totalGames, cumulativeGames, bigCount, atCount, diffCoins …他57 |
| 4 | `JS/core/audio.js` | 音声（効果音・ペカリ音・枚数表示のファンファーレ） | 269 | audioCtx, initAudio, SOUND_FILES, soundAudio, soundBuffers, VVV_MIN_COINS, SAMPLE_MAX_SEC, SAMPLE_FADE_SEC …他7 |
| 5 | `JS/core/effects.js` | 画面演出（フラッシュ・パーティクル・シェイク） | 133 | flashTimer, triggerFlash, tripleFlash, shakeMain, particles, particleMode, particleRAF, resizeCanvas …他7 |
| 6 | `JS/game/flow.js` | ゲーム進行の中心（レバーON・当選処理・ペカ演出・枚数表示） | 408 | PEKA_FX, pickPekaFx, pekaLater, clearPekaTimers, sideL, sideR, sideLampShow, sideLampOff …他19 |
| 7 | `JS/game/reels.js` | リール表示・リール配列・役の組み合わせ | 115 | REEL_LINES, EMOJI, symbolHTML, lineOf, STRIP_LEN, STRIPS, SEVENS, isSeven …他13 |
| 8 | `JS/game/reel-spin.js` | リール回転・目押し停止・予告・役の結果 | 342 | OPT_KEY, AUTO_STOP, saveOpt, SPIN_SPEED, SLIP_MAX, CELL_H, reelSpin, isReelSpinning …他26 |
| 9 | `JS/game/bell.js` | ベル | 81 | BELL_TYPES, BELL_LINES, pickBellType, bellBadge, getPop, getRAF, rainCoins, showGet …他3 |
| 10 | `JS/game/cherry.js` | チェリー | 138 | cherryStatus, cherryRemain, updateCherry, CHERRY_AT_CHOICES, pickCherryAtG, setBoost, cherryEffects, ROLE_INFO …他12 |
| 11 | `JS/game/at.js` | AT（ペカラッシュ）・PUSH演出 | 129 | atStatus, atRemain, atLabel, atToast, updateAT, updateAtGain, showAtToast, AT_CHOICES …他9 |
| 12 | `JS/game/bonus.js` | ボーナス消化・押し順ナビ・ドンドンドン | 350 | AURA_NAMES, AURA_WIN_W, AURA_LOSE_W, auraEl, atEntryRateFor, pickAuraLevel, ZONE_G_CHOICES, ZONE_G_WEIGHTS …他25 |
| 13 | `JS/game/at-result.js` | ATリザルト・獲得枚数OVER・次回示唆 | 367 | atResultEl, atResultGain, arHintBar, arHintText, atResultRAF, MODES, HINT_LABELS, decideNextMode …他26 |
| 14 | `JS/ui/display.js` | 電光掲示（LED・ランプ表示） | 167 | setLed, ledWinEl, ledCreditEl, ledTotalEl, ledWin, setLedWin, creditNow, totalGetNow …他11 |
| 15 | `JS/game/auto.js` | オートプレイ・サウンドボタン | 168 | autoBtn, AUTO_KEY, AUTO_SPEEDS, AUTO_STOPS, AUTO_OPT, saveAutoOpt, AUTOPLAY, autoIdle …他20 |
| 16 | `JS/ui/settings-panel.js` | 確率設定パネル | 165 | settingsModal, settingsBody, displayRate, SETTING_ROWS, formLevel, secretBuf, buildSettingsForm, setMode …他6 |
| 17 | `JS/ui/graph.js` | 当選グラフ | 128 | graphModal, graphLine, graphBars, graphSummary, LEVEL_COLORS, bonusColor, setupCanvas, drawEmpty …他3 |
| 18 | `JS/ui/modal.js` | モーダル共通・版の表示 | 26 | openModal, closeModal, versionEl |
| 19 | `JS/ui/reel-view.js` | リール配列の表示 | 28 | reelModal, reelView, miniSym, buildReelView |
| 20 | `JS/ui/boot.js` | 起動時の初期化（iOS対策・画面スリープ防止） | 29 | lastTouchEnd |
| 21 | `JS/ext/fx.js` | 追加演出 | 933 |  |
| 22 | `JS/ext/lcd.js` | 演出液晶 | 153 |  |
| 23 | `JS/ext/trophy.js` | トロフィー / ミッション / ランキング | 217 |  |

## その他

| ファイル | 役割 |
|---|---|
| `index.html` | 本体の画面（PC/SP共通。読み込み順の定義） |
| `debug.html` | 演出確認用パネル（同じJSを読む） |
| `guide.html` | 攻略ガイド |
| `CSS/style.css` | 本体のスタイル |
| `CSS/fx.css` / `CSS/lcd.css` / `CSS/trophy.css` | 追加演出・液晶・トロフィーのスタイル |
| `assets/img/` | 図柄画像（7red / 7blue / 7white） |
| `assets/img/guide/` | 攻略ガイドの画像 |
| `assets/sound/` | 効果音（gako / vvv） |
