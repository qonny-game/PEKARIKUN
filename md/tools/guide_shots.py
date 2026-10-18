#!/usr/bin/env python3
"""攻略ガイド(guide.html)用のスクリーンショットを撮り直す。
使い方(プロジェクト直下で): python3 -I md/tools/guide_shots.py [Tailwindのオフラインjs]
- Playwright + /opt/pw-browsers/chromium が必要。Tailwind CDN はオフラインのjsで置き換える(第1引数、省略時はネット不要の空)
- 出力: assets/img/guide/*.png (main big chance result navi_red navi_purple aura push judge meter battle)"""
import sys, pathlib, os
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parents[2]
out = root / 'assets/img/guide'; out.mkdir(parents=True, exist_ok=True)
TW = open(sys.argv[1]).read() if len(sys.argv) > 1 else ''
def route(r):
    u = r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(body=TW, content_type='application/javascript')
    elif u.startswith('http'): r.abort()
    else: r.continue_()
def fresh(b):
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1.5)
    pg.on('pageerror', lambda e: print('pageerror', e)); pg.route('**/*', route)
    pg.goto('file://' + str(root / 'index.html')); pg.wait_for_timeout(1500)
    pg.evaluate("()=>{soundEnabled=false;}"); return pg
def shot(pg, sel, name):
    pg.locator(sel).screenshot(path=str(out / (name + '.png'))); print('saved', name)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--no-sandbox'])
    pg = fresh(b); pg.screenshot(path=str(out / 'main.png')); print('saved main')            # 通常時
    pg.evaluate("()=>{beginBonus(makeBonusPlan(250,{}));}"); pg.wait_for_timeout(1300); shot(pg, '.cab-lcd', 'big')   # BIG突入
    pg.wait_for_timeout(4500); pg.evaluate("()=>handleSpin()"); pg.wait_for_timeout(600); pg.screenshot(path=str(out / 'chance.png')); print('saved chance')                                  # ボーナス中
    pg.close()
    pg = fresh(b); pg.evaluate("()=>showAtResult({gain:1234,games:50,bells:21,bonuses:1,hint:3})"); pg.wait_for_timeout(2600); shot(pg, '.cab-lcd', 'result')
    pg.close()
    pg = fresh(b); pg.evaluate("()=>{atGames=50;atType=0;updateAT();playRole('cherryW',true);}"); pg.wait_for_timeout(450); shot(pg, '#reels', 'navi_red')
    pg.close()
    pg = fresh(b); pg.evaluate("()=>{atGames=50;atType=0;updateAT();playRole('melon',true);}"); pg.wait_for_timeout(450); shot(pg, '#reels', 'navi_purple')
    pg.close()
    pg = fresh(b); pg.evaluate("()=>{atGames=50;atType=1;updateAT();beginBonus(makeBonusPlan(0,{zone:true,atWin:false,level:0}));}"); pg.wait_for_timeout(3500); shot(pg, '.cab-lcd', 'aura')
    for i in range(30):
        if pg.evaluate("()=>{const l=document.getElementById('lcd-push');return !!(l&&l.classList.contains('ready'))}"): break
        pg.evaluate("()=>{if(!isReelSpinning&&!reelLocked&&!isSuspense&&!isCounting&&!isPushing)handleSpin(); else if(isReelSpinning) stopNextReel();}"); pg.wait_for_timeout(400)
    shot(pg, '.cab-lcd', 'push'); pg.close()
    pg = fresh(b); pg.evaluate("()=>{atGames=300;atType=0;updateAT();atpAddPt(6);}"); pg.wait_for_timeout(700); shot(pg, '.cab-lcd', 'meter')
    pg.evaluate("()=>atpIntro(0,4)"); pg.wait_for_timeout(1000); shot(pg, '.cab-lcd', 'battle'); pg.close()   # 期待度1なのに紫背景 = 矛盾演出
    pg = fresh(b); pg.evaluate("()=>{BONUS_SAND_P_OFF=1;beginBonus(makeBonusPlan(30,{atWin:true,level:5,superP:1}));}")
    for i in range(160):
        if pg.evaluate("()=>!!document.querySelector('.lcd-levercall')"): pg.wait_for_timeout(500); shot(pg, '.cab-lcd', 'judge'); break
        s = pg.evaluate("()=>({wait:bonusRun&&bonusRun.leverWait,spin:isReelSpinning,lock:reelLocked||isSuspense||isCounting})")
        if s['spin']: pg.evaluate("()=>{if(reelSpin){(naviOrder||[0,1,2]).forEach(c=>{if(reelSpin&&reelSpin.cols[c].state==='spin')stopCol(c,false);});}}"); pg.wait_for_timeout(500)
        elif s['wait'] or not s['lock']: pg.evaluate("()=>handleSpin()"); pg.wait_for_timeout(500)
        else: pg.wait_for_timeout(400)
    b.close()
