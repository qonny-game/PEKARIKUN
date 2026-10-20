# ペカり君 プロジェクトコンテキスト

修正依頼の前に該当節を見て、同じ調査・同じ失敗を繰り返さないようにする。**随時更新する**（コードと同じ版で）。

**関連ファイル（`md/`）**：`PROJECT_CONTEXT.md`（このファイル）／`FILE_MAP.md`（ファイル一覧・自動生成）／`DOM_ID_REFERENCE.md`（id・保存キー・自動生成）／`WORKFLOW_RULES.md`（進め方）／`GOTCHAS_GENERAL.md`（共通の落とし穴）／`GOTCHAS.md`（このアプリの落とし穴）／`UI_TERMINOLOGY.md`（呼び方→要素）／`CHANGELOG.md`
**道具（`md/tools/`）**：`file_map.py`（目次とID一覧を再生成）／`regress.py`（旧版・新版を同じ操作で動かして比較）／`pack.py`（パッチZIP作成）／`dead_scan.py`（整理の下調べ：未使用の名前・CSS・重複宣言）／`ux_audit.py`（UXの機械チェック）。UXレビューの手順は `UX_REVIEW_TEMPLATE.md`

## 1. ファイルマップ
```text
index.html        本体の画面。<script> の並び（＝読み込み順）もここで決まる
debug.html        演出確認パネル（同じJSを読む）
guide.html        攻略ガイド
CSS/              style.css（本体）/ fx.css / lcd.css / trophy.css / layout4.css（4段筐体）/ modern.css・neon.css（演出・筐体のデザイン層）
JS/data/          config.js … 数字の表（確率・枚数・設定値・リール配列・バージョン・ASSET_DIR） / symimg.js … 図柄画像のdata URI（自動生成）
JS/core/          settings（設定の適用・保存） / state（状態変数） / audio（音） / effects（画面演出）
JS/game/          flow（ゲーム進行の中心） / reels / reel-spin / bell / cherry / at / bonus / at-result / auto
JS/ui/            display（電光掲示） / settings-panel / graph / modal / reel-view / boot（起動処理）
JS/ext/           bgm / fx / lcd / trophy … 本体の関数を包んで拡張する追加層（本体の後に読む）
assets/img/       7red / 7blue / 7white / bar / bell / cherry / replay / melon（図柄 360x180。本体は JS/data/symimg.js に埋め込み済み）
assets/img/guide/ 攻略ガイドの画像 (md/tools/guide_shots.py で撮り直せる。仕様を変えたらガイドの文章と画像も更新する)
assets/sound/     gako.mp3 / vvv.mp3
md/               このフォルダ
```
詳細と各ファイルの主な名前は `FILE_MAP.md`。

**読み込み順（index.html）**：`JS/data/config.js` → `core/*` → `game/*` → `ui/*` → `ext/*`
（順序で上書き・グローバル参照が決まる。変えない。ext は本体の後）

## 2. 最重要の設計事実
- 通常の `<script>`（モジュールではない）。トップレベルの `const` / `let` / `function` は**全ファイルで共有されるグローバル**。ファイルを分けても同じ変数名を2回宣言しない。
- 主な数字（確率・枚数・機械割・設定値）は `JS/data/config.js` に集めている。リール配列は `JS/game/reels.js` の `STRIPS`、チェリー・スイカ周りの確率は各ファイル先頭の定数（`FILE_MAP.md` で探す）。
- 画像・音声のパスは `config.js` の `ASSET_DIR` を通す（フォルダを動かすときはここだけ直す）。
- ext/（fx・lcd・trophy）は本体の関数を後から包む。本体側の関数名を変えると ext 側が効かなくなるので注意。
- 設定7（デバッグ用・すぐ当たる）は画面にボタンが無い。設定ボタンを 6 5 6 6 4 5 6 の順に押すと入る（`SECRET_SEQ`）。
- デバッグモード: 設定ボタンを 3 2 3 3 1 2 3 の順に押すとON/OFF（`DEBUG_SEQ`, JS/ext/debug.js）。下パネル下のDEBUGから演出を選ぶと、次のレバーONでその演出になる。
- BIGは200枚・REGは100枚固定（`bigCoins()` / `regCoins()`）。AT突入率・オーラ・SUPER率は当選ランク(tier)で決まる（makeBonusPlan の opts.tier）。SUPER: `atSuper`（startAT 第3引数）。CHANCE ZONE の むげんLOOP: `czLoop` / `CZ_LOOP_P`。BIG中のレア役・サンド目は bonus.js の bonusRare / bonusSand。
- ゲームフロー: 通常→前兆(`zenchoToCz`)→CHANCE ZONE→BIG(PEKA CHANCE)→AT→MOUNTAIN。前兆の契機はスイカ・チェリー・チャンス目（`ZEN_TO_CZ`）。まれな直行: 直CZ(`CZ_DIRECT`) / 直BIG(7との2択, `playDirectBig`) / 直AT(`directAT`) / 直MOUNTAIN(`freezeToZone`)。JUDGEMENT最終Gは bonus.js の judgeColor / LCDX.leverCall / LCDX.judgeReveal。停止ボタン右の常設PUSHは JS/ext/pushspoil.js。 前兆なしのBONUSフラグは潜伏(`latentLeft`, flow.js `contraRole`)で8〜12G矛盾目を出してからランプ点灯。白7スイカ白7・色違い7揃いは通常時の目から除外(reels.js `ROLE_COMBOS.mixed7`は矛盾演出専用)。AT中のポイントメーター/上乗せバトルは JS/ext/atpoint.js。
- REG: 7・7・BAR揃い（`pendingReg`, kind:'reg'）。REG後 `regBoostG` ゲームはBIGが当たりやすい。REG中に `REG_UP_P` でBIG昇格（plan.upgrade → finishBonus後に startUpgradeBig）。AT非当選が続くと `atThrough` でAT突入率UP（THROUGH_MULT）。
- 外部: Tailwind CDN と Google Fonts を読む。オフラインだと見た目が一部崩れる。

## 3. 保存するもの（localStorage）
| キー | 内容 | 場所 | 互換性 |
|---|---|---|---|
| `pekari-settings-v5` | 確率設定・遊び方モード | config.js | 変えない（v5は版の印） |
| `pekari-opt-v1` | 自動停止などの操作オプション | reel-spin.js | 変えない |
| `pekari-auto-v1` | オート設定 | auto.js | 変えない |
| `pekari-fx-v1` | 演出の設定 | ext/fx.js | 変えない |
| `pekari-ach-v1` | 実績 | ext/fx.js | 変えない |
| `pekari-tro-v1` | トロフィー・記録 | ext/trophy.js | 変えない |

キーを変えると既存ユーザーの設定・記録が消える。新しい保存を足したら `DOM_ID_REFERENCE.md` を再生成する。

## 4. 外部サービス・規約
- 外部通信は CDN（Tailwind）とフォントのみ。音声は同梱の mp3。

## 5. 未解決・保留
- この再構築（1.16.1）より前の変更履歴は手元に無いので、CHANGELOG は 1.16.1 から書いている。
- kit の `release.py` / `qa.py` は QNPLAYER 専用の部分が多いので未導入。代わりに `pack.py`（パッチZIP）と `regress.py`（回帰比較）を使う。
- 回帰テストは通常のスピンのみを流す。ボーナス・AT突入などの経路は運任せで届きにくいので、変更がその周辺なら `debug.html` で手動確認する。


## 6. 1.19系の構造メモ（引き継ぎ）
- **演出ステージ `#lcd-stage`**（index.html の `#gogo-box` 内）: 数字・文字・キャラが動く演出はすべてここに入れる（演出液晶 `#sub-lcd` と同じ範囲、overflow hidden）。動的に作る要素も `document.getElementById('lcd-stage').appendChild(el)`。高さは CSS 変数 `--lcd-h`。
- **`fitReels()`（ext/lcd.js）**: リールを幅に合わせて拡大し（`scale`）、残りの高さを `--lcd-h` に回す。`--reel-w` も設定する（STOPボタンをリールの真下に合わせるのに使用）。`#gogo-box` を ResizeObserver で監視。
- **リール**: 1マス 66x34（`CELL_H`）、3x3 で 198x102。図柄は `symbolHTML(key)`（reels.js）が `<img>` を返す。画像は `SYM_IMG[key]`（data URI。JS/data/symimg.js）、無ければ `assets/img/<key>.png?v=版`、読めなければ文字/絵文字で代用。キー: 7red 7blue 7white bar bell cherry replay melon。画像を差し替えたら symimg.js を作り直す（240x120にリサイズしてbase64化）。
- **キャッシュ対策**: パック前に必ず `python3 -I md/tools/stamp.py`（index.html/debug.html の JS/CSS に `?v=<APP_VERSION>`）。
- **ペカり君（演出液晶）**: ext/lcd.js。`window.LCDX = {act, say, spawn, pair, hintStop, hintClear, hint}`。`act` は cross/dash/jump/angry/sad/peek（WAAPI）。
- **図柄ヒント**: 2択予告で `LCDX.pair(a,b)`（reel-spin.js の omenThen から）、通常時の停止ヒントは `stopCol` → `LCDX.hintStop(plan, 停止数)`。停止順は `HINT_AT`、確率は `HINT_RATE`（ext/lcd.js）。成立役は `plan.role`（runRole が設定）。
- **停止音「ドン」**: `playStopSound(c)`（reel-spin.js）。`stopCol` で押した瞬間に鳴らす（着地時ではない）。
- **15枚GETの音**: `playJaraJara`（game/bell.js）。AT/ボーナス中のベルで 15枚以上のとき。
- **ハマり救済**: `droughtMult(inAT)`（game/flow.js）。通常時250G超えから段階的に当選率UP（最大4倍）。
- **電光掲示**: INSERT〜WAIT は3列2行、PAYOUT/MEDAL/TOTAL GET と同じ1段。アイコン（音・グラフ・歯車）は上のデータカウンタの右。
- **揃ったラインの線**は出さない（`drawPayline` は即 return）。
- **検証**: `md/tools/harness_example.py`（Playwrightで起動・撮影・関数呼び出し）。起動直後の pageerror 0件を毎回確認する。
- **液晶の示唆システム（1.19.35〜、ext/lcd.js）**: 飛来物は役・フラグの示唆のときだけ出す（背景として勝手に出さない）。役示唆=クジラ(スイカ)/風船(ベル)/雲(リプレイ)/鳥(チェリー)/UFO(チャンス目)、ボーナス示唆=星★/ロケット・花火・雷★★/目・宝箱・虹★★★。「その役 or ハズレ」で、外れたら灰色のペカり君マーク `LCDX.miss()`。定義は `ROLE_SPR` `FLAG_SPR` `FLAG_W`、抽選は `planHint(kind)`。矛盾させない原則: サイドランプ・停止ヒントは必ず役と一致（ボーナス確定中のみ例外）。
- **PUSH（液晶内 `#lcd-push`）**: 第2停止(`hintStop` n=2)から押せる。結果は `pushResult`（対応役 / CHANCE ZONE突入 / ボーナス濃厚 / ハズレ）。押さなくてもリール停止後に自動で出る。ドン3回=発展は `LCDX.don(3)` で次の強示唆を確定させる。
- **通常時のチェリー・スイカは取りこぼさない**（`stopCol` で auto。ナビ付き(AT)だけ従来どおり）。
- **ATグレード（1.39.0〜、内部用）**: `startAT` で `atGrade`（1〜20）を抽選（`pickAtGrade`、rules.js の `AT_GRADE`）。`atUpMult()` を、チェリー/スイカの上乗せ成立（cherry.js の cherryEffects / roleEffects）・サンド目の発生（playRole の sandLeft）・ポイント加算（atpoint.js の runRole wrapper）・バトルの敵HP（startBattle）に掛ける。画面には出さず、`window.SHOW_INTERNAL`（debug.html のみ true）のときだけ `#at-grade` を表示。ATの終了で0に戻す（at-result / display.js）。セーブ対象。
