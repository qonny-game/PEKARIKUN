#!/usr/bin/env python3
"""
整理の下調べ（プロジェクトのルートで実行。何も書き換えない）:
  python3 -I md/tools/dead_scan.py

出力:
  1. 参照されていないトップレベルの名前（JS の function / const / let）
  2. 同じ名前の再宣言（グローバル共有なので後勝ちになって危ない）
  3. 参照されていない @keyframes
  4. 参照されていない CSS クラス（※ `tier-${n}` のように JS で組み立てる名前は誤検出するので、
     出てきたものは必ず grep で確かめてから消す）
  5. index.html の id のうち JS から触っていないもの（※ CSS だけで使う見た目用の id もある）
"""
import re, glob, os

ROOT = os.getcwd()
JS_FILES = sorted(glob.glob(os.path.join(ROOT, 'JS/**/*.js'), recursive=True))
HTML_FILES = ['index.html', 'debug.html', 'guide.html']
CSS_FILES = sorted(glob.glob(os.path.join(ROOT, 'CSS/*.css')))
SYMIMG = 'symimg.js'  # 図柄の data URI 一覧。検索対象から外す（巨大で誤検出の元）

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

def code_text(exclude_symimg=True):
    parts = [read(p) for p in JS_FILES if not (exclude_symimg and os.path.basename(p) == SYMIMG)]
    return '\n'.join(parts + [read(os.path.join(ROOT, h)) for h in HTML_FILES if os.path.exists(os.path.join(ROOT, h))])

def count_word(word, text):
    return len(re.findall(r'(?<![\w-])' + re.escape(word) + r'(?![\w-])', text))

def strip_css_comments(s):
    return re.sub(r'/\*.*?\*/', '', s, flags=re.S)

def main():
    alltext = code_text()

    print('## 1. 参照されていないトップレベルの名前')
    names = []
    for p in JS_FILES:
        if os.path.basename(p) == SYMIMG:
            continue
        for m in re.finditer(r'^(?:function\s+(\w+)|(?:const|let|var)\s+(\w+))', read(p), re.M):
            names.append((m.group(1) or m.group(2), os.path.relpath(p, ROOT)))
    for n, f in names:
        if count_word(n, alltext) <= 1:
            print(f'  {n}  ({f})')

    print('\n## 2. 同じ名前の再宣言')
    seen = {}
    for n, f in names:
        seen.setdefault(n, []).append(f)
    dup = {k: v for k, v in seen.items() if len(v) > 1}
    for k, v in dup.items():
        print(f'  {k}  {v}')
    if not dup:
        print('  なし')

    print('\n## 3. 参照されていない @keyframes')
    css_all = '\n'.join(strip_css_comments(read(p)) for p in CSS_FILES)
    for k in sorted(set(re.findall(r'@keyframes\s+([\w-]+)', css_all))):
        if count_word(k, css_all + '\n' + alltext) <= 1:
            print(f'  {k}')

    print('\n## 4. 参照されていない CSS クラス（動的に組み立てる名前は誤検出あり）')
    src = alltext
    for p in CSS_FILES:
        s = strip_css_comments(read(p))
        classes = set(re.findall(r'\.([A-Za-z_][\w-]*)', s))
        unused = sorted(c for c in classes if not re.search(r'(?<![\w-])' + re.escape(c) + r'(?![\w-])', src)
                        and not c.isdigit() and c not in ('jpg', 'png', 'mp3', 'webp', 'gif', 'svg'))
        print(f'  {os.path.relpath(p, ROOT)}: {", ".join(unused) if unused else "なし"}')

    print('\n## 5. index.html の id で JS から触っていないもの（見た目用の id は正常）')
    html = read(os.path.join(ROOT, 'index.html'))
    js_all = '\n'.join(read(p) for p in JS_FILES if os.path.basename(p) != SYMIMG)
    for i in sorted(set(re.findall(r'\bid="([^"]+)"', html))):
        if f"'{i}'" not in js_all and f'"{i}"' not in js_all and f'`{i}`' not in js_all:
            print(f'  {i}')

if __name__ == '__main__':
    main()
