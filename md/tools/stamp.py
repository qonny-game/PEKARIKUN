#!/usr/bin/env python3
"""index.html / debug.html の自前の JS・CSS に ?v=<APP_VERSION> を付ける（ブラウザのキャッシュで古いファイルが残らないように）。
使い方: python3 -I md/tools/stamp.py   (プロジェクト直下で実行。パックの前に毎回実行する)"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
ver = re.search(r"APP_VERSION\s*=\s*'([^']+)'", (root / 'JS/data/config.js').read_text(encoding='utf-8')).group(1)
for name in ('index.html', 'debug.html'):
    p = root / name
    if not p.exists(): continue
    s = p.read_text(encoding='utf-8')
    s2 = re.sub(r'((?:src|href)="(?:JS|CSS)/[^"?]+)(?:\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={ver}"', s)
    if s2 != s: p.write_text(s2, encoding='utf-8')
    print(name, 'stamped', ver)
