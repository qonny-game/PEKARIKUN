#!/usr/bin/env python3
"""
回帰比較: 2つのプロジェクトフォルダ（旧版・新版）を同じ乱数・同じ操作で動かし、
表示・保存データ・定数が一致するかを確認する。構成の整理（見た目・動作を変えない作業）の確認用。

使い方（プロジェクトのルートで）:
  python3 -I md/tools/regress.py <旧版フォルダ> <新版フォルダ> [--spins 30]

判定:
  - 両方で pageerror が 0 件であること
  - 起動直後のスクリーンショットがバイト一致すること
  - 定数（配列・表）の値が一致すること（APP_VERSION は比較しない）
  - 各ゲーム後の表示・localStorage が一致すること（タイミング由来の差は出ることがある）
必要: Python 3, Playwright(Python) + Chromium
"""
import json, sys, argparse, hashlib
from playwright.sync_api import sync_playwright

SEED_JS = """
(() => { let s = 20240601; Math.random = () => {
  s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
"""

CONST_NAMES = ["BIG_TIERS", "LEVEL_VALUES", "DEFAULT_SETTINGS", "PLAY_MODES", "MODE_RATES",
               "STRIPS", "AT_TYPES", "ROLE_INFO", "CHERRY_NOTES", "REEL_LINES"]  # 1.20.55 で未使用の BELL_LINES / MELON_NOTES を外した

SNAP_JS = """
(names) => {
  const t = id => { const e = document.getElementById(id); return e ? e.textContent : null; };
  const consts = {};
  for (const n of names) { try { consts[n] = eval(n); } catch (e) { consts[n] = '(none)'; } }
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
  return {
    display: ['display-games','display-big','display-reg','display-diff','display-rate','display-prob',
              'led-total','led-credit','led-win','payout-value','at-remain','at-gain','cherry-remain',
              'pl-start','pl-wait','pl-bet','tap-hint'].map(t),
    consts: JSON.stringify(consts), ls
  };
}
"""

def run(root, spins, shot_path):
    errors, logs = [], []
    snaps = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 390, "height": 844})
        pg.add_init_script(SEED_JS)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: logs.append(m.text) if m.type == "error" else None)
        # 外部通信（CDN・フォント）は遮断。両方の版で同じ条件にする
        pg.route("http*://**", lambda r: r.abort())
        pg.goto("file://" + root + "/index.html")
        pg.wait_for_timeout(800)
        pg.screenshot(path=shot_path)
        snaps.append(("load", pg.evaluate(SNAP_JS, CONST_NAMES)))
        for i in range(spins):
            pg.evaluate("document.getElementById('spin-btn').click()")
            pg.wait_for_timeout(250)
            for k in range(3):
                pg.wait_for_timeout(350)
                pg.evaluate(f"(() => {{ const b = document.querySelector('.stop-btn[data-stop=\"{k}\"]'); if (b) b.click(); }})()")
            pg.wait_for_timeout(900)
            pg.evaluate("""() => {
              const al = document.getElementById('align-btn');
              if (al && !al.disabled && !al.hidden) al.click();
              for (const id of ['push-btn', 'at-result-close']) {
                const el = document.getElementById(id);
                if (el && el.offsetParent !== null) el.click();
              }
            }""")
            pg.wait_for_timeout(900)
            snaps.append((f"spin{i+1}", pg.evaluate(SNAP_JS, CONST_NAMES)))
        b.close()
    return snaps, errors, logs

def digest(x):
    return hashlib.sha1(json.dumps(x, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:10]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("old"); ap.add_argument("new")
    ap.add_argument("--spins", type=int, default=30)
    a = ap.parse_args()
    out = "/tmp/regress_shots"  # 比較用の一時スクショ（作業フォルダ外。テスト専用）
    import os; os.makedirs(out, exist_ok=True)
    sa, ea, la = run(a.old, a.spins, f"{out}/old.png")
    sb, eb, lb = run(a.new, a.spins, f"{out}/new.png")
    ok = True
    print(f"pageerror: old={len(ea)} new={len(eb)}")
    for e in eb[:5]: print("  new error:", e)
    if ea or eb: ok = False
    same_shot = open(f"{out}/old.png", "rb").read() == open(f"{out}/new.png", "rb").read()
    print("load screenshot identical:", same_shot)
    ok &= same_shot
    # 定数（APP_VERSION 以外）
    c_old = json.loads(sa[0][1]["consts"]); c_new = json.loads(sb[0][1]["consts"])
    bad = [n for n in CONST_NAMES if c_old.get(n) != c_new.get(n)]
    print("constants compared:", len(CONST_NAMES), "mismatch:", bad or "none")
    ok &= not bad
    # 各ゲーム後の状態
    mism = []
    for (name, x), (_, y) in zip(sa, sb):
        if x["display"] != y["display"] or x["ls"] != y["ls"]:
            mism.append((name, x["display"], y["display"]))
    print(f"steps: {len(sa)} / mismatched steps: {len(mism)}")
    for name, x, y in mism[:3]:
        print("  first mismatch at", name, "\n    old:", x, "\n    new:", y)
    ok &= not mism
    print("RESULT:", "PASS" if ok else "CHECK")
    print("last state digest old/new:", digest(sa[-1][1]), digest(sb[-1][1]))
    print("last displayed (new):", sb[-1][1]["display"][:4])
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
