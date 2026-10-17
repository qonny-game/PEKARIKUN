"""ヘッドレスChromiumで index.html を開いて画面を撮る/関数を呼ぶ例（Playwright）。
index.html は Tailwind CDN を使うため、オフライン環境ではローカルの Tailwind v4 ブラウザ版をCDNの代わりに差し込む。
  事前: npm i @tailwindcss/browser  → 環境変数 TW_JS にそのindex.global.jsのパスを入れる
  使い方: python3 -I md/tools/harness_example.py   (プロジェクト直下で実行)
"""
import os, pathlib
from playwright.sync_api import sync_playwright
ROOT = str(pathlib.Path(__file__).resolve().parents[2]) + '/'
TW = open(os.environ['TW_JS']).read() if os.environ.get('TW_JS') else ''
def route(r):
    u = r.request.url
    if 'cdn.tailwindcss.com' in u and TW: r.fulfill(body=TW, content_type='application/javascript')
    elif u.startswith('http'): r.abort()
    else: r.continue_()
def open_page(p, w=400, h=860):
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': w, 'height': h}); errs = []
    pg.route('**/*', route); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + 'index.html'); pg.wait_for_timeout(1500)
    return b, pg, errs
if __name__ == '__main__':
    with sync_playwright() as p:
        b, pg, errs = open_page(p)
        pg.screenshot(path='/tmp/pekari_shot.png')
        print('pageerror:', errs)
