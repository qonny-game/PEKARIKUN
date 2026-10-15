# ペカり君 プロジェクトコンテキスト

修正依頼の前に該当節を見て、同じ調査・同じ失敗を繰り返さないようにする。**随時更新する**（コードと同じ版で）。

**関連ファイル（`md/`）**：`PROJECT_CONTEXT.md`（このファイル）／`FILE_MAP.md`（ファイル一覧・自動生成）／`DOM_ID_REFERENCE.md`（id・保存キー・自動生成）／`WORKFLOW_RULES.md`（進め方）／`GOTCHAS_GENERAL.md`（共通の落とし穴）／`GOTCHAS.md`（このアプリの落とし穴）／`UI_TERMINOLOGY.md`（呼び方→要素）／`CHANGELOG.md`
**道具（`md/tools/`）**：`file_map.py`（目次とID一覧を再生成）／`regress.py`（旧版・新版を同じ操作で動かして比較）／`pack.py`（パッチZIP作成）

## 1. ファイルマップ
```text
index.html        本体の画面。<script> の並び（＝読み込み順）もここで決まる
debug.html        演出確認パネル（同じJSを読む）
guide.html        攻略ガイド
CSS/              style.css（本体）/ fx.css / lcd.css / trophy.css
JS/data/          config.js … 数字の表（確率・枚数・設定値・リール配列・バージョン・ASSET_DIR）
JS/core/          settings（設定の適用・保存） / state（状態変数） / audio（音） / effects（画面演出）
JS/game/          flow（ゲーム進行の中心） / reels / reel-spin / bell / cherry / at / bonus / at-result / auto
JS/ui/            display（電光掲示） / settings-panel / graph / modal / reel-view / boot（起動処理）
JS/ext/           fx / lcd / trophy … 本体の関数を包んで拡張する追加層（本体の後に読む）
assets/img/       7red / 7blue / 7white（図柄）
assets/img/guide/ 攻略ガイドの画像
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
