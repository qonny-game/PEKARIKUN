#!/usr/bin/env python3
"""
目次の自動生成（プロジェクトのルートで実行）:
  python3 -I md/tools/file_map.py

出力:
  md/FILE_MAP.md        ファイル一覧（読み込み順・役割・主な関数/定数・行数）
  md/DOM_ID_REFERENCE.md  index.html のid と、どのJSから触っているか / 保存キー一覧

ファイル先頭のヘッダ（「// JS/xxx.js  —  役割」）を役割として読む。
ヘッダを直したら、このツールを回して目次も直す。
"""
import re, os, glob

ROOT = os.getcwd()

def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()

def script_order():
    html = read("index.html")
    return re.findall(r'<script src="(JS/[^"]+)"></script>', html)

def describe(text):
    m = re.search(r"^// (\S+)\s+—\s+(.+)$", text, re.M)
    if m:
        return m.group(2).strip()
    m = re.search(r"^/\*\s*=+\s*\n\s*(.+?)\s*\(", text, re.M)  # 既存の ext 系ヘッダ
    return m.group(1).strip() if m else ""

def top_names(text, limit=8):
    names = re.findall(r"^(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)", text, re.M)
    seen, out = set(), []
    for n in names:
        if n not in seen:
            seen.add(n); out.append(n)
    more = len(out) - limit
    return ", ".join(out[:limit]) + (f" …他{more}" if more > 0 else "")

def file_map():
    rows = ["# ファイルマップ（自動生成・直接編集しない）", "",
            "読み込み順（index.html）どおりに並べている。後ろのファイルほど前のものを上書き・拡張できる。", "",
            "| # | ファイル | 役割 | 行数 | 主な名前 |", "|---|---|---|---|---|"]
    for i, p in enumerate(script_order(), 1):
        t = read(p)
        rows.append(f"| {i} | `{p}` | {describe(t)} | {t.count(chr(10))} | {top_names(t)} |")
    rows += ["", "## その他", "",
             "| ファイル | 役割 |", "|---|---|",
             "| `index.html` | 本体の画面（PC/SP共通。読み込み順の定義） |",
             "| `debug.html` | 演出確認用パネル（同じJSを読む） |",
             "| `guide.html` | 攻略ガイド |",
             "| `CSS/style.css` | 本体のスタイル |",
             "| `CSS/fx.css` / `CSS/lcd.css` / `CSS/trophy.css` | 追加演出・液晶・トロフィーのスタイル |",
             "| `assets/img/` | 図柄画像（7red / 7blue / 7white） |",
             "| `assets/img/guide/` | 攻略ガイドの画像 |",
             "| `assets/sound/` | 効果音（gako / vvv） |", ""]
    return "\n".join(rows)

def dom_ref():
    html = read("index.html")
    ids = re.findall(r'\bid="([^"]+)"', html)
    js_all = {p: read(p) for p in script_order()}
    rows = ["# DOM ID / 保存キー 一覧（自動生成・直接編集しない）", "",
            "index.html の id と、どのJSで取得しているかの対応。id を足した・変えたら `python3 -I md/tools/file_map.py` で更新する。", "",
            "| id | 使っているJS | 備考 |", "|---|---|---|"]
    for i in ids:
        users = [p for p, t in js_all.items() if f"'{i}'" in t or f'"{i}"' in t]
        rows.append(f"| `{i}` | {', '.join('`'+u+'`' for u in users) or '（HTMLのみ）'} |  |")
    rows += ["", "## 保存キー（localStorage）", "", "| キー | 使っているJS | 内容 |", "|---|---|---|"]
    keys = {}
    for p, t in js_all.items():
        for k in re.findall(r"['\"](pekari-[\w-]+)['\"]", t):
            keys.setdefault(k, set()).add(p)
    for k in sorted(keys):
        rows.append(f"| `{k}` | {', '.join('`'+u+'`' for u in sorted(keys[k]))} |  |")
    rows += ["", "※ 保存キーは互換性のため変えない（変えると既存ユーザーの設定・記録が消える）。", ""]
    return "\n".join(rows)

if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "md"), exist_ok=True)
    with open(os.path.join(ROOT, "md/FILE_MAP.md"), "w", encoding="utf-8") as f:
        f.write(file_map())
    with open(os.path.join(ROOT, "md/DOM_ID_REFERENCE.md"), "w", encoding="utf-8") as f:
        f.write(dom_ref())
    print("wrote md/FILE_MAP.md, md/DOM_ID_REFERENCE.md")
