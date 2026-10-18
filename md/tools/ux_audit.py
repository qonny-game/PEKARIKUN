#!/usr/bin/env python3
"""
UX の機械チェック（UX_REVIEW_TEMPLATE.md の手順 1）。PC 1280x800 と SP 390x844 で index.html を開き、
  - 文字が 9px 未満の表示（読みにくい）
  - 押せる要素が 32px 未満（タップしにくい）
  - 横スクロールが出ているか
  - 起動直後の pageerror
を一覧にする。何も書き換えない。

使い方（プロジェクトのルートで）:
  TW_JS=<tailwind の index.global.js へのパス> python3 -I md/tools/ux_audit.py
  （TW_JS は任意。無いと Tailwind が効かず、見た目の判定が実機とずれる）
  Tailwind v4 のブラウザ版: npm i @tailwindcss/browser@4 → node_modules/@tailwindcss/browser/dist/index.global.js
必要: Python 3, Playwright(Python) + Chromium
"""
import os, pathlib
from playwright.sync_api import sync_playwright

ROOT = str(pathlib.Path(__file__).resolve().parents[2])
TW = open(os.environ['TW_JS'], encoding='utf-8').read() if os.environ.get('TW_JS') else ''

JS_AUDIT = """() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    const name = el.id || String(el.className).slice(0, 40);
    if (own && parseFloat(cs.fontSize) < 9) out.push(['小さい文字', cs.fontSize, own.slice(0, 20), name]);
    if (el.matches('button, [role=button], a') && (r.width < 32 || r.height < 32))
      out.push(['小さいタップ先', Math.round(r.width) + 'x' + Math.round(r.height), own.slice(0, 20), name]);
  }
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth) out.push(['横スクロール', de.scrollWidth + '>' + de.clientWidth, '', '']);
  return out;
}"""

def route(r):
    u = r.request.url
    if 'cdn.tailwindcss.com' in u and TW:
        r.fulfill(body=TW, content_type='application/javascript')
    elif u.startswith('http'):
        r.abort()
    else:
        r.continue_()

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, w, h in [('PC', 1280, 800), ('SP', 390, 844)]:
            pg = b.new_page(viewport={'width': w, 'height': h})
            errs = []
            pg.route('**/*', route)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('file://' + ROOT + '/index.html')
            pg.wait_for_timeout(1500)
            res = pg.evaluate(JS_AUDIT)
            print(f'== {name} {w}x{h}  pageerror {len(errs)}件' + (f'  {errs[:3]}' if errs else ''))
            seen = set()
            for row in res:
                key = tuple(row)
                if key in seen:
                    continue
                seen.add(key)
                print('  ', ' | '.join(row))
            if not res:
                print('   指摘なし')
            pg.close()
        b.close()

if __name__ == '__main__':
    main()
