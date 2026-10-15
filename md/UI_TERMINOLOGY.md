# UI用語集（呼び方 → 実際の要素）

ユーザーの呼び方と、実際の要素・コード上の名前の対応。呼び方が食い違うと手戻りになる。**迷ったらスクリーンショットを最優先で見る**。新しい行き違いが起きたら1行足す。

| 呼び方 | 要素/ID | 補足 |
|---|---|---|
| 筐体 | `.cabinet` | 機械全体の枠 |
| 液晶（上部の画面） | `.cab-lcd` | AT残り・チェリー状態・GOGO!ランプを含む |
| GOGO!ランプ | `#gogo-box` / `#gogo-text` | 液晶の中央。光る文字 |
| サブ液晶（演出液晶） | `#sub-lcd` | リール上部。ext/lcd.js が描く |
| 左右のペカランプ（P・E・K・A・!） | `#side-l` / `#side-r` | 沖スロ風のペカ点灯 |
| 図柄・リール | `#reels` | 3×3の窓 |
| NEXT（次へ） | `#next-hint` | 揃い図柄表示のあとの案内 |
| 枚数表示（払い出し） | `#payout-display` / `#payout-num` | 獲得枚数を大きく出す |
| ベルバッジ | `#bell-badge` | ベル成立の表示 |
| 取りこぼし | （演出） `reel-spin.js` | 暗転＋下降音＋「取りこぼし」 |
| 押し順ナビ | `#navi` | ボーナス中の 1→2→3 表示 |
| オーラ（周囲の色） | `#aura` | ボーナス消化中のAT期待度の色 |
| ボーナスを揃える | `#align-btn` | 揃い表示のボタン |
| レバー | 画面の液晶部をタップ | `#spin-btn` は状態管理用の**非表示**ボタン |
| STOP（停止ボタン） | `.stop-btn`（data-stop 0〜2） | 左・中・右のリール停止 |
| 電光掲示 | `.cab-panel` | INSERT / BET / START などのランプ |
| LED（PAYOUT・MEDAL・TOTAL GET） | `#led-win` / `#led-credit` / `#led-total` | 数字の表示 |
| データカウンタ（G数・BIG・AT・合算・差枚数・確率） | `.data-counter` | 画面上部 |
| AT残り・獲得 | `#at-status` | AT中のみ |
| チェリー状態（当選率UP） | `#cherry-status` | チェリー後の期間 |
| PUSHボタン | `#push-overlay` / `#push-btn` | G数獲得時 |
| PEKA RUSH!!! | `#rush-overlay` | AT突入の演出 |
| ATリザルト | `#at-result` | 獲得枚数・次回示唆 |
| 次回示唆 | `#ar-hint-bar` / `#ar-hint-text` | 弱〜強 |
| OVER（獲得枚数の上限表示） | `#over-pop` | ボーナス中の合計が一定に達したとき |
| ドンドンドン | （演出） `bonus.js` | 画面が揺れる期待度演出 |
| 当選グラフ | `#graph-modal` / `#graph-btn` | 差枚数の推移と当選枚数 |
| リール配列 | `#reel-modal` / `#reel-btn` | 各リールの並び |
| 確率設定（設定ボタン） | `#settings-modal` / `#settings-btn` | 設定1〜6（7は隠し） |
| オート設定 | `#auto-modal` / `#auto-opt-btn` | AUTOの細かい設定 |
| AUTO | `#auto-btn` | 自動プレイのON/OFF |
| 音声ON/OFF | `#sound-toggle-btn` | |
| トロフィー | ext/trophy.js（`#ar-trophy`） | ATリザルトに出る色付きの称号 |
| 攻略ガイド | `guide.html`（フッターのリンク） | |
