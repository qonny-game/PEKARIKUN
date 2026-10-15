# DOM ID / 保存キー 一覧（自動生成・直接編集しない）

index.html の id と、どのJSで取得しているかの対応。id を足した・変えたら `python3 -I md/tools/file_map.py` で更新する。

| id | 使っているJS | 備考 |
|---|---|---|
| `fx-overlay` | `JS/core/state.js` |  |
| `fx-canvas` | `JS/core/state.js` |  |
| `flash-overlay` | `JS/core/state.js` |  |
| `aura` | `JS/game/bonus.js` |  |
| `judge-overlay` | `JS/game/flow.js` |  |
| `judge-text` | `JS/game/flow.js` |  |
| `display-games` | `JS/core/state.js` |  |
| `display-big` | `JS/core/state.js` |  |
| `display-reg` | `JS/core/state.js` |  |
| `display-prob` | `JS/core/state.js` |  |
| `display-diff` | `JS/core/state.js` |  |
| `display-rate` | `JS/ui/settings-panel.js` |  |
| `side-l` | `JS/game/flow.js` |  |
| `at-status` | `JS/game/at.js` |  |
| `at-label` | `JS/game/at.js` |  |
| `at-remain` | `JS/game/at.js` |  |
| `at-gain` | `JS/game/at.js` |  |
| `cherry-status` | `JS/game/cherry.js` |  |
| `cherry-remain` | `JS/game/cherry.js` |  |
| `gogo-box` | `JS/core/state.js` |  |
| `gogo-text-container` | `JS/core/state.js` |  |
| `gogo-text` | （HTMLのみ） |  |
| `gogo-subtext` | `JS/core/state.js` |  |
| `sub-lcd` | `JS/ext/lcd.js` |  |
| `at-toast` | `JS/game/at.js` |  |
| `get-pop` | `JS/game/bell.js` |  |
| `navi` | `JS/game/bonus.js` |  |
| `over-pop` | `JS/game/at-result.js` |  |
| `chance-logo` | `JS/game/bonus.js` |  |
| `align-display` | `JS/core/state.js` |  |
| `reels` | `JS/core/state.js` |  |
| `next-hint` | （HTMLのみ） |  |
| `bell-badge` | `JS/game/bell.js` |  |
| `payout-display` | `JS/core/state.js` |  |
| `payout-label` | `JS/core/state.js` |  |
| `payout-num` | `JS/core/state.js` |  |
| `payout-value` | `JS/core/state.js` |  |
| `side-r` | `JS/game/flow.js` |  |
| `pl-insert` | （HTMLのみ） |  |
| `pl-bet` | （HTMLのみ） |  |
| `pl-replay` | （HTMLのみ） |  |
| `pl-start` | （HTMLのみ） |  |
| `pl-wait` | （HTMLのみ） |  |
| `led-win` | `JS/ui/display.js` |  |
| `led-credit` | `JS/ui/display.js` |  |
| `led-total` | `JS/ui/display.js` |  |
| `spin-btn` | `JS/core/state.js` |  |
| `align-btn` | `JS/core/state.js` |  |
| `auto-btn` | `JS/game/auto.js` |  |
| `auto-opt-btn` | `JS/game/auto.js`, `JS/ext/fx.js`, `JS/ext/trophy.js` |  |
| `sound-toggle-btn` | `JS/game/auto.js` |  |
| `graph-btn` | `JS/ui/modal.js` |  |
| `reel-btn` | `JS/ui/reel-view.js` |  |
| `settings-btn` | `JS/ui/modal.js` |  |
| `reset-btn` | `JS/ui/display.js` |  |
| `app-version` | `JS/ui/modal.js` |  |
| `graph-modal` | `JS/ui/graph.js` |  |
| `graph-summary` | `JS/ui/graph.js` |  |
| `graph-line` | `JS/ui/graph.js` |  |
| `graph-bars` | `JS/ui/graph.js` |  |
| `reel-modal` | `JS/ui/reel-view.js` |  |
| `reel-view` | `JS/ui/reel-view.js` |  |
| `auto-modal` | `JS/game/auto.js` |  |
| `auto-body` | `JS/game/auto.js` |  |
| `settings-modal` | `JS/ui/settings-panel.js` |  |
| `settings-body` | `JS/ui/settings-panel.js`, `JS/ext/fx.js` |  |
| `settings-default` | `JS/ui/modal.js` |  |
| `settings-apply` | `JS/ui/modal.js` |  |
| `rush-overlay` | `JS/game/at.js` |  |
| `rush-sub` | `JS/game/at.js` |  |
| `push-overlay` | `JS/game/at.js`, `JS/ui/display.js`, `JS/ext/fx.js` |  |
| `push-btn` | `JS/game/at.js` |  |
| `push-result` | `JS/game/at.js` |  |
| `at-result` | `JS/game/at-result.js` |  |
| `at-result-title` | `JS/game/at-result.js` |  |
| `at-result-gain` | `JS/game/at-result.js` |  |
| `ar-row-games` | `JS/game/at-result.js` |  |
| `ar-games` | `JS/game/at-result.js` |  |
| `ar-row-bells` | `JS/game/at-result.js` |  |
| `ar-bells` | `JS/game/at-result.js` |  |
| `ar-bonus` | `JS/game/at-result.js` |  |
| `ar-total` | `JS/game/at-result.js` |  |
| `ar-trophy` | `JS/game/at-result.js` |  |
| `ar-hint-row` | `JS/game/at-result.js`, `JS/ext/fx.js` |  |
| `ar-hint-bar` | `JS/game/at-result.js` |  |
| `ar-hint-text` | `JS/game/at-result.js` |  |
| `at-result-close` | `JS/game/at-result.js`, `JS/game/auto.js` |  |

## 保存キー（localStorage）

| キー | 使っているJS | 内容 |
|---|---|---|
| `pekari-ach-v1` | `JS/ext/fx.js` |  |
| `pekari-auto-v1` | `JS/game/auto.js` |  |
| `pekari-fx-v1` | `JS/ext/fx.js` |  |
| `pekari-opt-v1` | `JS/game/reel-spin.js` |  |
| `pekari-settings-v5` | `JS/data/config.js` |  |
| `pekari-tro-v1` | `JS/ext/trophy.js` |  |

※ 保存キーは互換性のため変えない（変えると既存ユーザーの設定・記録が消える）。
