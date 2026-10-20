/* =========================================================
   演出液晶 (lcd.js)  ※ fx.js のあとに読み込む
   リール上部のサブ液晶。背景シーン / マスコット / 飛来物の予告 / ひとこと を表示する。
   表示だけで、抽選やゲーム進行には関与しない (演出中のロックもしない)。
   ========================================================= */
(() => {
  'use strict';
  const el = document.getElementById('sub-lcd');
  if (!el || !window.FX) return;
  const rnd = Math.random;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const freq = () => (window.FXO_FREQ ? window.FXO_FREQ() : 1);
  el.innerHTML = '<div class="sl-photo"></div><div class="sl-stars"></div><div class="sl-body"></div><div class="sl-aurora"></div><div class="sl-weather"></div><div class="sl-ground"></div><div class="sl-fg"></div><div class="sl-actor"></div><div class="sl-msg"><b></b><small></small></div>';
  const fg = el.querySelector('.sl-fg'), actor = el.querySelector('.sl-actor');
  const m1 = el.querySelector('.sl-msg b'), m2 = el.querySelector('.sl-msg small'), msg = el.querySelector('.sl-msg');

  let mood = '';
  function setMood(m) { if (m !== mood) { mood = m; actor.innerHTML = FX.mascotSVG(m); } }
  setMood('happy');
  function anim(c) {
    if (ACTS[c]) { act(c); return; }
    actor.classList.remove('hop', 'spin', 'shake'); void actor.offsetWidth; actor.classList.add(c);
  }
  /* ---------- ペカり君の動き: 液晶を横切る / 跳ねる / 怒る / 落ち込む / ひょっこり ---------- */
  const lcdW = () => el.clientWidth || 340;
  const selfW = () => actor.offsetWidth || 68;
  let actId = 0;
  function runAnim(frames, ms, ease, done) {
    actor.classList.remove('hop', 'spin', 'shake');
    actor.getAnimations().forEach(a => a.cancel());
    const a = actor.animate(frames, { duration: Math.round(ms * 0.6), easing: ease || 'ease-in-out' });   // ペカり君の動きも速く
    const id = ++actId;
    a.onfinish = () => { if (id === actId && done) done(); };
    return a;
  }
  const back = () => { if (Date.now() >= hold) setMood('happy'); };
  const ACTS = {
    // 右へ駆け抜けて、左から戻ってくる
    cross() {
      setMood('happy');
      const W = lcdW() + 20, fr = [];
      for (let i = 0; i <= 10; i++) fr.push({ transform: `translate(${Math.round(W * i / 10)}px, ${i % 2 ? -26 : 0}px) rotate(${i % 2 ? 10 : -6}deg)` });
      runAnim(fr, 1900, 'linear', () => runAnim([{ transform: `translateX(${-selfW() - 20}px)` }, { transform: 'translateX(0)' }], 800, 'ease-out'));
    },
    // 左右どちらかから猛ダッシュ (回転しながら)
    dash() {
      setMood('shock');
      const W = lcdW() + 20;
      runAnim([{ transform: 'translate(0, 0) rotate(0)' }, { transform: `translate(${W / 2}px, -50px) rotate(360deg) scale(1.3)` }, { transform: `translate(${W}px, 0) rotate(720deg)` }], 1000, 'ease-in',
        () => { back(); runAnim([{ transform: `translateX(${-selfW() - 20}px)` }, { transform: 'translateX(0)' }], 600, 'ease-out'); });
    },
    // 液晶の真ん中まで大ジャンプ
    jump() {
      setMood('happy');
      const cx = Math.max(0, lcdW() / 2 - selfW() / 2 - 6);
      runAnim([{ transform: 'translate(0, 0) scale(1)' }, { transform: `translate(${cx}px, -70px) scale(1.6) rotate(180deg)`, offset: .45 }, { transform: `translate(${cx}px, -78px) scale(1.7) rotate(360deg)`, offset: .6 }, { transform: 'translate(0, 0) scale(1)' }], 1300, 'ease-out');
    },
    // 怒り: 真ん中に出てきて大きくなり、ぷるぷる震える
    angry() {
      setMood('angry');
      const cx = Math.max(0, lcdW() / 2 - selfW() / 2 - 6), fr = [{ transform: 'translate(0, 0) scale(1)' }, { transform: `translate(${cx}px, -40px) scale(2)`, offset: .2 }];
      for (let i = 0; i < 8; i++) fr.push({ transform: `translate(${cx + (i % 2 ? 7 : -7)}px, -40px) scale(${2.05 + (i % 2) * .08}) rotate(${i % 2 ? 4 : -4}deg)`, offset: .2 + (i + 1) * .09 });
      fr.push({ transform: 'translate(0, 0) scale(1)' });
      if (window.vibrate) window.vibrate([60, 30, 60]);
      runAnim(fr, 2300, 'linear', () => { setMood('happy'); });
    },
    // 残念: しょんぼり歩いて、うなだれる
    sad() {
      setMood('sad');
      const x = lcdW() * .4;
      runAnim([{ transform: 'translate(0, 0) rotate(0)' }, { transform: `translate(${x * .5}px, -4px) rotate(-6deg)`, offset: .25 }, { transform: `translate(${x}px, 0) rotate(-9deg)`, offset: .5 }, { transform: `translate(${x}px, 8px) rotate(-16deg) scale(.92)`, offset: .75 }, { transform: 'translate(0, 0) rotate(0)' }], 2800, 'ease-in-out', back);
    },
    // 下からひょっこり
    peek() {
      setMood('happy');
      runAnim([{ transform: 'translateY(90px) rotate(-12deg)' }, { transform: 'translateY(-6px) rotate(8deg)', offset: .3 }, { transform: 'translateY(0) rotate(-8deg)', offset: .5 }, { transform: 'translateY(0) rotate(6deg)', offset: .7 }, { transform: 'translateY(90px) rotate(-12deg)' }], 1700, 'ease-out',
        () => runAnim([{ transform: 'translateY(90px)' }, { transform: 'translateY(0)' }], 400, 'ease-out'));
    }
  };
  function act(name) { if (isDebugRun) return; const f = ACTS[name]; if (f) f(); }
  /* ---------- 図柄ヒント: 2択予告の2図柄 / 停止時にフラグの図柄を液晶へ出す ---------- */
  const stageEl = document.getElementById('lcd-stage');
  const hintEl = document.createElement('div');
  hintEl.id = 'lcd-hint'; hintEl.className = 'lcd-hint';
  if (stageEl) stageEl.appendChild(hintEl);
  let hintTimer = 0, hintPair = false;
  const symSrc = k => (typeof SYM_IMG !== 'undefined' && SYM_IMG[k]) || `assets/img/${k}.png`;
  function hintShow(keys, ms, big) {
    if (!stageEl) return;
    clearTimeout(hintTimer);
    hintEl.className = 'lcd-hint';
    hintEl.innerHTML = keys.map(k => k[0] === '@' ? `<span class="lh-txt">${k.slice(1)}</span>` : `<img src="${symSrc(k)}" alt="" draggable="false">`).join('<i>OR</i>');
    void hintEl.offsetWidth;
    hintEl.classList.add('on', keys.length > 1 ? 'pair' : 'one');
    if (big) hintEl.classList.add('big');
    if (ms) hintTimer = setTimeout(hintClear, ms);
    if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; (keys.length > 1 ? [784, 988] : [988, 1319]).forEach((f, i) => tone(f, t + i * 0.09, 0.18, 'triangle', 0.09)); }
  }
  let symHint = null, hintHoldUntil = 0;   // 今ゲームの図柄示唆の予定 {sym, big, T} / 第3停止後の示唆を残す期限
  function hintClear(force) {
    if (!force && Date.now() < hintHoldUntil) { setTimeout(hintClear, hintHoldUntil - Date.now() + 30); return; }
    clearTimeout(hintTimer); hintPair = false; hintEl.classList.remove('on');
  }
  const PAIR_SYM = { bell: 'bell', replay: 'replay', cherry: 'cherry', melon: 'melon', chance: '@CHANCE' };   // チャンス目はスイカ図柄にしない（揃ったように見えるため）
  function pair(a, b) { if (pushPlan && !pushPlan.done) return; const sv = SEVENS[Math.floor(Math.random() * SEVENS.length)]; hintShow([a === 'seven' ? sv : (PAIR_SYM[a] || a), b === 'seven' ? sv : (PAIR_SYM[b] || b)], 0); hintPair = true; }
  /* 通常時のみ: 成立役に応じて、決まった停止順で図柄を出す (たまにガセ) */
  const HINT_AT = { replay: [1, 'replay'], cherryW: [1, 'cherry'], cherryS: [1, 'cherry'], melon: [2, 'melon'], melonW: [2, 'melon'], chanceW: [2, '@CHANCE'], chanceS: [2, '@CHANCE'], bell0: [2, 'bell'], bell1: [2, 'bell'], bell2: [2, 'bell'] };
  const HINT_RATE = { replay: 0.7, bell0: 0.7, bell1: 0.7, bell2: 0.7, cherryW: 0.9, cherryS: 1, melon: 0.9, melonW: 0.9, chanceW: 0.8, chanceS: 1 };
  /* 図柄示唆の出るタイミング(5パターン): T=0 回転前(演出のあと回転) / 1 回転中・停止前 / 2 第1停止時 / 3 第2停止時 / 4 第3停止後 */
  function planSymHint(kind) {
    let sym = null, rate = 0, big = false;
    const d = HINT_AT[kind];
    if (d) { sym = d[1]; rate = HINT_RATE[kind] || 0.7; big = kind === 'cherryS' || kind === 'chanceS'; }
    else if (kind === 'lose' && typeof pendingBonusType !== 'undefined' && pendingBonusType) { sym = pick(['replay', 'bell']); rate = 0.3; }   // ボーナス確定中だけ、ハズレ目でも図柄が出ることがある
    if (!sym || rnd() >= rate) return null;
    return { sym, big, T: Math.floor(rnd() * 5) };
  }
  const symShow = h => hintShow([h.sym], 0, h.big);
  function preHint() {   // 回転前: 図柄を見せてから回転を始める(待ち時間を返す)
    if (symHint && symHint.T === 0 && !hintPair && !(pushPlan && !pushPlan.done)) { const h = symHint; symHint = null; symShow(h); return 780; }
    return 0;
  }
  /* 下パネル消灯演出: 回転中にパネルが消えたら確定 (CZ/PEKA CHANCE=当選確定 / RUSH中=100G以上の上乗せ確定) */
  const panelEl = document.querySelector('.cab-label');
  function panelDark() {
    if (!panelEl || !window.panelPlan || isDebugRun) return;
    const was = panelEl.classList.contains('off');
    panelEl.classList.remove('flash'); panelEl.classList.add('off');
    panelMode = window.panelPlan; panelSeen = false; window.panelUpDone = false;
    if (!was && soundEnabled) { initAudio(); const t = audioCtx.currentTime; tone(220, t, 0.5, 'sawtooth', 0.08); tone(110, t + 0.15, 0.7, 'sine', 0.16); }
  }
  let panelMode = null, panelSeen = false;
  /* 消灯したら、そのモードが終わるまで消えたまま */
  setInterval(() => {
    if (!panelEl || !panelMode || !panelEl.classList.contains('off')) return;
    let end = false;
    if (panelMode === 'cz') end = !!window.panelUpDone || !!bonusRun;   // BONUS確定画面が出る / CZの最終ゲームが終わる / ボーナス開始 で元に戻す
    else if (panelMode === 'chance') { if (bonusRun) panelSeen = true; end = (!!bonusRun && !bonusRun.zone && bonusRun.played >= bonusRun.games) || !!isRushing || (panelSeen && !bonusRun); }   // 最終ゲーム(JUDGEMENT)が終わる / RUSH突入の確定画面
    else if (panelMode === 'at') { if (atGames > 0) panelSeen = true; end = !!window.panelUpDone || (panelSeen || !atRun) && atGames <= 0 && !atEnding && !isAtResult; }
    if (end) { panelMode = null; panelLight(); }
  }, 250);
  function panelLight() {
    if (!panelEl) return;
    if (panelEl.classList.contains('off')) { panelEl.classList.remove('off'); panelEl.classList.add('flash'); setTimeout(() => panelEl.classList.remove('flash'), 1200); }
  }
  function spinStart() {
    panelDark();   // 回転中・第1停止の前
    if (!symHint || symHint.T !== 1) return;
    const h = symHint;
    setTimeout(() => { if (symHint === h && !hintPair && !pushPlan && typeof reelSpin !== 'undefined' && reelSpin && reelSpin.order && reelSpin.order.length === 0) { symHint = null; symShow(h); } }, 650);
  }
  function hintStop(plan, n) {
    if (n === 2) pushReady();
    if (wxPlan) { wxStep(n); return; }
    if (!symHint || hintPair || pushPlan) return;   // PUSH中は押すまで図柄を出さない
    const normal = !(typeof bonusRun !== 'undefined' && bonusRun) && !(typeof atGames !== 'undefined' && atGames > 0) && !(typeof atEnding !== 'undefined' && atEnding);
    if (!normal) return;
    if (symHint.T >= 2 && symHint.T - 1 === n) {
      const h = symHint; symHint = null;
      if (n === 3) { if (window.hideGet) hideGet(); hintHoldUntil = Date.now() + 1800; setTimeout(() => symShow(h), 250); }   // 第3停止後は少し間を置いて出し、結果表示のあとも残す
      else symShow(h);
    }
  }
  /* PEKA PEKA MOUNTAIN 開始: ロゴをどどどーんと大きく、集中線の豪華な背景で (約3.4秒) */
  function zoneIntro() {
    if (isDebugRun || !stageEl) return;
    const E = document.createElement('div');
    E.className = 'lcd-zoneintro';
    E.innerHTML = '<i class="zi-img"></i><i class="zi-glint"></i>';
    stageEl.appendChild(E);
    setTimeout(() => E.remove(), 3500);
    const at = (ms, f) => setTimeout(f, ms);
    const don = (lv) => { if (window.shakeMain) shakeMain(260 + lv * 120); burst(); if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; tone(70 - lv * 8, t, 0.5, 'sine', 0.35); tone(150 + lv * 40, t, 0.14, 'square', 0.12); } };
    at(150, () => don(0)); at(650, () => don(1)); at(1250, () => { don(2); swoosh(3); act('jump'); });
    [1250, 1600, 2000, 2500].forEach((t, i) => at(t, () => spawn(i % 2 ? 'star' : 'fire', 3)));
    for (let i = 0; i < 18; i++) at(1300 + i * 80, () => spawn('coin', 3));
    if (soundEnabled) { initAudio(); const t0 = audioCtx.currentTime + 1.25; [523, 659, 784, 1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(f, t0 + i * 0.07, 0.4, 'triangle', 0.12)); }
  }
  /* PEKA CHANCE(ボーナス)突入: BIG BONUS / REG BONUS をどどーんと大きく (約3.2秒) */
  function bigIntro(reg) {
    if (isDebugRun || !stageEl) return;
    const E = document.createElement('div');
    E.className = 'lcd-bigintro' + (reg ? ' reg' : '');
    E.innerHTML = `<i class="bi-bg"></i><i class="bi-ray"></i><div class="bi-a">${reg ? 'REG' : 'BIG'}</div><div class="bi-b">BONUS</div><i class="bi-glint"></i>`;
    stageEl.appendChild(E);
    setTimeout(() => E.classList.add('out'), 2800);
    setTimeout(() => E.remove(), 3300);
    const at = (ms, f) => setTimeout(f, ms);
    const don = (lv) => { if (window.shakeMain) shakeMain(240 + lv * 120); burst(); if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; tone(70 - lv * 8, t, 0.5, 'sine', 0.35); tone(140 + lv * 40, t, 0.12, 'square', 0.1); } };
    at(150, () => don(0)); at(600, () => don(1)); at(1100, () => { don(2); swoosh(3); act('jump'); });
    [1100, 1500, 1900].forEach((t, i) => at(t, () => spawn(i % 2 ? 'star' : 'fire', 3)));
    for (let i = 0; i < 12; i++) at(1200 + i * 80, () => spawn('coin', 3));
    if (soundEnabled) { initAudio(); const t0 = audioCtx.currentTime + 1.1; [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, t0 + i * 0.07, 0.4, 'triangle', 0.12)); }
  }
  /* JUDGEMENT最終G: 「レバーを叩け！！！」をでかでかと。文字色で期待度（白=通常 / 赤=80%以上 / 金=96%以上でAT性能良好 / 虹=AT確定・性能最高） */
  let leverCallEl = null;
  function leverCall(color) {
    if (!stageEl) return;
    leverCallOff(true);
    const E = document.createElement('div');
    E.className = 'lcd-levercall lc-' + (color || 'white');
    E.innerHTML = '<i class="lc-bg"></i><div class="lc-t"><span>レバーを</span><span>叩け！！！</span></div>';
    stageEl.appendChild(E);
    leverCallEl = E;
    if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; tone(82, t, 0.5, 'sine', 0.32); tone(165, t + 0.02, 0.1, 'square', 0.1); if (color === 'gold' || color === 'rainbow') [784, 988, 1319, 1568].forEach((f, i) => tone(f, t + 0.15 + i * 0.07, 0.3, 'triangle', 0.12)); }
    if (window.shakeMain) shakeMain(260);
    if (color === 'rainbow' || color === 'gold') { burst(); if (window.triggerFlash) triggerFlash(); }
  }
  function leverCallOff(quick) {
    const E = leverCallEl; leverCallEl = null;
    if (!E) return;
    if (quick) { E.remove(); return; }
    E.classList.add('out'); setTimeout(() => E.remove(), 300);
  }
  /* JUDGEMENT結果: AT当選=BONUS確定の画像をドーン / 非当選=液晶が割れる */
  function judgeReveal(win, cb) {
    if (!stageEl) { cb(); return; }
    const E = document.createElement('div');
    if (win) {
      E.className = 'lcd-czwin';
      E.innerHTML = '<i class="cw-bg"></i><i class="cw-pic"></i>';
      stageEl.appendChild(E);
      act('jump'); swoosh(3);
      for (let i = 0; i < 7; i++) setTimeout(() => { if (window.shakeMain) shakeMain(140); burst(); if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; tone(72 + (i % 3) * 10, t, 0.3, 'sine', 0.3); tone(160 + i * 18, t, 0.08, 'square', 0.1); } }, 100 + i * 150);
      for (let i = 0; i < 10; i++) setTimeout(() => spawn('coin', 3), 700 + i * 90);
      if (soundEnabled) { initAudio(); const t0 = audioCtx.currentTime + 1.0; [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, t0 + i * 0.07, 0.4, 'triangle', 0.12)); }
      setTimeout(() => { E.classList.add('out'); }, 2300);
      setTimeout(() => { E.remove(); cb(); }, 2700);
    } else {
      E.className = 'lcd-crackfx';
      E.innerHTML = '<i class="cf-flash"></i><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="cf-svg"><path d="M50 0L46 18 58 34 42 52 56 68 47 100M46 18L24 26 12 24M58 34L80 30 96 38M42 52L20 60 4 58M56 68L78 76 92 74M24 26L18 40M80 30L84 46"/></svg><i class="cf-dark"></i>';
      stageEl.appendChild(E);
      if (window.shakeMain) shakeMain(300);
      if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; tone(130, t, 0.15, 'sawtooth', 0.2); tone(95, t + 0.08, 0.3, 'sawtooth', 0.18); for (let i = 0; i < 6; i++) tone(2400 - i * 260, t + 0.12 + i * 0.05, 0.1, 'square', 0.06); }
      setTimeout(() => { E.classList.add('break'); if (window.shakeMain) shakeMain(420); if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; for (let i = 0; i < 8; i++) tone(3000 - i * 300, t + i * 0.03, 0.08, 'square', 0.07); tone(70, t, 0.5, 'sine', 0.3); } }, 700);
      setTimeout(() => { E.classList.add('out'); }, 1700);
      setTimeout(() => { E.remove(); cb(); }, 2100);
    }
  }
  /* 白7・スイカ・白7 が第1リールに止まった: 当選確定（通常=ボーナス / CZ=成功 / AT=MOUNTAIN / BIG中=AT / REG中=BIG昇格） */
  function wmWin() {
    if (isDebugRun || !stageEl) return;
    let t = 'BONUS当選確定';
    if (typeof bonusRun !== 'undefined' && bonusRun && !bonusRun.zone) t = bonusRun.reg ? 'BIG昇格確定' : 'AT当選確定';
    else if (atGames > 0) t = 'MOUNTAIN当選確定';
    else if (window.czGameNow) t = 'BONUS確定';
    say('白7 スイカ 白7', '', 3000, 'happy', 'jump');
    burst(); swoosh(3); act('jump');
    spawn('fire', 3); spawn('star', 3);
    for (let i = 0; i < 8; i++) setTimeout(() => spawn('coin', 3), 200 + i * 90);
    if (typeof sideLampFlash === 'function') sideLampFlash('heaven', 2400);
    if (window.triggerFlash) triggerFlash();
  }
  /* サンド目が揃った: BARの次にすごい役。スイカ・チェリーより豪華に */
  function sandWin(n) {
    if (isDebugRun || !stageEl) return;
    if (window.hideGet) hideGet();
    const E = document.createElement('div');
    E.className = 'lcd-sandwin';
    E.innerHTML = `<i class="sw-bg"></i><span class="sw-t">SAND</span><b class="sw-n">+${n}G</b><em class="sw-s">UP!!</em>`;
    stageEl.appendChild(E);
    setTimeout(() => E.remove(), 3600);
    act('jump'); burst(); swoosh(3);
    if (window.shakeMain) shakeMain(700);
    [0, 350, 700, 1100].forEach((t, i) => setTimeout(() => { burst(); spawn(i % 2 ? 'star' : 'fire', 3); }, t));
    for (let i = 0; i < 14; i++) setTimeout(() => spawn('coin', 3), i * 110);
    if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.08, 0.35, 'triangle', 0.12)); tone(131, t, 0.9, 'sawtooth', 0.12); }
  }
  /* 新しい回転の開始前: 直前の液晶演出をすべて消す */
  function clearAll() {
    window.panelPlan = null;
    if (window.hideGet) hideGet();
    hintHoldUntil = 0; symHint = null; hintClear(true);
    clearTimeout(tagT); tagEl.classList.remove('on');
    wxPlan = null; wxClear();
    if (stageEl) stageEl.querySelectorAll('.lcd-miss, .lcd-lvup, .lcd-burst, .don-pop, .sp').forEach(e => e.remove());
    hold = 0; m1.textContent = ''; m2.textContent = ''; msg.classList.remove('pop');
    if (!(pushPlan && !pushPlan.done)) pushEl.className = 'lcd-push';
  }
  window.LCDX = { act, say: (a, b, ms, md) => say(a, b, ms, md), spawn: (t, l) => spawn(t, l || 0), pair, hintStop, clearAll, sandWin, zoneIntro, bigIntro, wmWin, leverCall, leverCallOff, judgeReveal, preHint, spinStart, hintClear, hint: hintShow, tag, miss: () => missMark(), story: (i, n, l) => story(i, n, l), don: n => { if (n >= 3) forceLv = 2; }, donWin: role => { forceLv = 2; const h = planHint(role || 'lose'); if (h) { hints.push(h); showHint(h); } } };
  let hold = 0;
  function say(a, b, ms, md, an) {
    ms = ms ? Math.round(ms * 0.72) : ms;   // 全体にテンポ良く
    m1.textContent = a || ''; m2.textContent = b || '';
    msg.classList.remove('pop'); void msg.offsetWidth; msg.classList.add('pop');
    hold = Date.now() + (ms || 1800);
    if (md) { setMood(md); setTimeout(() => { if (Date.now() >= hold - 50) setMood('happy'); }, ms || 1800); }
    if (an) anim(an);
  }

  /* ---------- リールを枠いっぱいに拡大 (液晶の下の余白をなくす) ---------- */
  const box = document.getElementById('gogo-box'), reelsEl = document.getElementById('reels');
  /* 4段構成: 液晶(幅いっぱい・上下すき間なし) / リール(液晶幅の80%) をそれぞれ幅から計算する */
  const slotEl = document.getElementById('align-display');
  const LCD_BLEED_T = 3, LCD_BLEED_B = 2;   // 液晶と上下の段区切り線の間にあった余白(px)
  const REEL_PAD = 16;   // 旧い上下の余白（8px×2）。リールの枠を線いっぱいまで広げるため、この分を高さに足す
function fitReels() {
    if (!box || !reelsEl) return;
    const w = box.clientWidth;
    if (!w) return;
    const lcdH = Math.round(w * 1.02 * 2 / 3);               // 液晶: 高さを2/3に (下に5段目ラベルパネルを増設)
    const sc = Math.max(0.6, Math.min(w * 0.8 / 198, 2));    // リール: 従来(液晶幅いっぱい)の80%
    // 液晶は上下の段区切り線まで（すき間が出ないよう、上下の余白ぶんを足して、その分だけ上下にずらす）
    box.style.height = (lcdH + LCD_BLEED_T + LCD_BLEED_B) + 'px';
    box.style.marginTop = (-LCD_BLEED_T) + 'px';
    box.style.marginBottom = (-LCD_BLEED_B) + 'px';
    box.style.setProperty('--lcd-h', (lcdH + LCD_BLEED_T + LCD_BLEED_B) + 'px');
    // リールは段の線いっぱいまで上下に広げる（幅は sc のまま、高さだけ REEL_PAD 分を足して伸ばす）
    const H = 102 * sc + REEL_PAD;
    reelsEl.style.transform = `scale(${sc.toFixed(3)}, ${(H / 102).toFixed(4)})`;
    reelsEl.style.marginTop = '0px';
    if (slotEl) { slotEl.style.width = (198 * sc).toFixed(1) + 'px'; slotEl.style.height = H.toFixed(1) + 'px'; }
    window.REEL_SC = sc * (window.devicePixelRatio || 1);
    document.documentElement.style.setProperty('--side-h2', Math.floor(lcdH / 2) + 'px');
    document.documentElement.style.setProperty('--side-fs', Math.max(18, Math.min(34, Math.floor((lcdH - 32) / 9 / 0.8))) + 'px');   // サイドのPEKARIKUN: 9文字が液晶の高さにぴったり収まる大きさ(行間を詰める)
    document.documentElement.style.setProperty('--reel-w', (198 * sc).toFixed(1) + 'px');   // STOPボタンをリールの真下に合わせる
    document.documentElement.style.setProperty('--reel-h', H.toFixed(1) + 'px');
  }
  fitReels();
  window.addEventListener('resize', fitReels);
  if (window.ResizeObserver && box) new ResizeObserver(fitReels).observe(box);
  window.fitReels = fitReels;

  /* 起動直後は停止リールを表示する (リール欄が空白にならないように)。あいさつにペカり君がひょっこり出る */
  try {
    if (typeof showStatic === 'function' && !isReelSpinning && cumulativeGames === 0) showStatic(gridOf([0, 1, 2].map(() => Math.floor(rnd() * STRIP_LEN))), null);
  } catch (e) { /* 表示だけなので無視 */ }

  /* ---------- 飛来物 ---------- */
  const SPRITES = { firefly: 4200, leaf: 3600, whale: 5200, bird: 3000, bat: 2600, flock: 3400, coin: 1000, ripple: 1000, star: 900, ufo: 2000, rocket: 1400, balloon: 2600, rainbow: 2200, cloud: 3200, thunder: 3200, fire: 1100, chest: 1900, eye: 1800 };
  function spawn(type, lv) {
    const d = document.createElement('div');
    const base = type === 'thunder' ? 'cloud' : type;
    d.className = `sp sp-${base}${type === 'thunder' ? ' dark' : ''}`;
    d.dataset.lv = lv;
    d.style.setProperty('--dy', Math.round(rnd() * 90) + 'px');
    d.style.setProperty('--dx', (12 + Math.round(rnd() * 62)) + '%');
    if (base === 'coin') d.style.left = (8 + Math.round(rnd() * 82)) + '%';
    fg.appendChild(d);
    if (type === 'chest') setTimeout(() => { d.classList.add('open'); for (let i = 0; i < 4 + lv * 2; i++) setTimeout(() => spawn('coin', Math.min(3, lv)), i * 90); }, 900);
    setTimeout(() => d.remove(), SPRITES[type] * 0.7 + 100);
    if (window.TRO) TRO.seen('lcd:' + type);
    return d;
  }
  const NAMES = { firefly: 'ホタル', leaf: '葉', whale: 'クジラ', bird: '鳥', bat: 'コウモリ', flock: '鳥の群れ', coin: 'コイン', ripple: '波紋', star: '流れ星', ufo: 'UFO', rocket: 'ロケット', balloon: '気球', rainbow: '虹', cloud: '雲', thunder: '雷雲', fire: '花火', chest: '宝箱', eye: '目' };
  const wpick = w => { let x = rnd() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i; } return 0; };
  /* ---------- 液晶の予告: 飛来物は「役・フラグの示唆」のときだけ出す ----------
     役示唆      : クジラ=スイカ / 風船=ベル / 雲=リプレイ / 鳥=チェリー / UFO=チャンス目  (その役 or ハズレ)
     ボーナス示唆: 流れ星=★ / ロケット・花火=★★ / 目・宝箱・虹=★★★  (ボーナスかチャンスゾーン or ハズレ)
     ハズレだったときは、灰色のペカり君マーク「ハズレ」が出る */
  const ROLE_SPR = { melon: 'whale', bell: 'balloon', replay: 'cloud', cherry: 'bird', chance: 'ufo' };
  const ROLE_JP = { melon: 'スイカ', bell: 'ベル', replay: 'リプレイ', cherry: 'チェリー', chance: 'チャンス目' };
  const ROLE_COL = { melon: '#4ade80', bell: '#fde047', replay: '#60a5fa', cherry: '#f87171', chance: '#e879f9' };
  const groupOf = k => /^melon/.test(k) ? 'melon' : /^cherry/.test(k) ? 'cherry' : /^chance/.test(k) ? 'chance' : /^bell/.test(k) ? 'bell' : k === 'replay' ? 'replay' : '';
  const roleHintP = k => ({ cherryS: .55, cherryW: .3, melon: .6, melonW: .3, chanceS: .6, chanceW: .3 }[k] ?? (/^bell/.test(k) || k === 'replay' ? .1 : 0));
  const FLAG_SPR = [null, ['star'], ['rocket', 'fire'], ['eye', 'chest', 'rainbow']];
  const FLAG_TAG = ['', 'ボーナス示唆 ★', 'ボーナス示唆 ★★', 'ボーナス示唆 ★★★'];
  const FLAG_W = { hit: [0, 26, 36, 38], zone: [0, 46, 38, 16], none: [0, 86, 13, 1] };
  let forceLv = 0;   // ドン3回の「発展」: 次に強めのボーナス示唆が必ず出る
  const tagEl = document.createElement('div');
  tagEl.id = 'lcd-tag'; tagEl.className = 'lcd-tag';
  if (stageEl) stageEl.appendChild(tagEl);
  let tagT = 0;
  function tag(text, cls, ms) {
    if (!text) { tagEl.classList.remove('on'); return; }
    clearTimeout(tagT);
    tagEl.textContent = text; tagEl.className = 'lcd-tag on ' + (cls || '');
    void tagEl.offsetWidth;
    tagT = setTimeout(() => tagEl.classList.remove('on'), ms || 2400);
  }
  function missMark() {
    if (!stageEl || missGame) return;
    missGame = true;
    const d = document.createElement('div');
    d.className = 'lcd-miss';
    d.innerHTML = `<span class="lm-m">${FX.mascotSVG('sad')}</span>`;
    stageEl.appendChild(d);
    setTimeout(() => d.remove(), 1800);
    if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; tone(247, t, 0.2, 'triangle', 0.08); tone(185, t + 0.14, 0.34, 'triangle', 0.08); }
  }
  /* ---------- PUSH: 第2停止から押せる。押すと対応役 / CHANCE ZONE / ボーナス濃厚 が出る(出ないときはハズレ) ---------- */
  const pushEl = document.createElement('button');
  pushEl.id = 'lcd-push'; pushEl.type = 'button'; pushEl.className = 'lcd-push'; pushEl.textContent = 'PUSH';
  if (stageEl) stageEl.appendChild(pushEl);
  let pushPlan = null, pushOff = 0, missGame = false;
  function pushArm(plan) { clearTimeout(pushOff); pushPlan = plan; pushEl.className = 'lcd-push'; }   // 押せるようになるまで隠す
  function pushReady() {
    if (!pushPlan || pushPlan.done) return;
    pushEl.className = 'lcd-push on ready';
    if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; [1047, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.14, 'triangle', 0.1)); }
  }
  function pushResult(pl) {
    const g = pl.group;
    if (pl.hit0) { say('PEKA!!', 'GOGOランプ 点灯濃厚', 2200, 'shock', 'jump'); tag('ボーナス濃厚', 'f3', 2600); burst(); swoosh(3); for (let i = 0; i < 6; i++) setTimeout(() => spawn('coin', 3), i * 90); }
    else if (pl.cz) { say('CHANCE ZONE', '突入！', 2400, 'shock', 'jump'); tag('CHANCE ZONE 突入', 'f3', 2600); burst(); swoosh(2); spawn('fire', 2); for (let i = 0; i < 4; i++) setTimeout(() => spawn('coin', 2), i * 90); }
    else if (g) { hintShow([ROLE_SYM[g]], 1100, pl.rare); swoosh(pl.rare ? 2 : 1);   // 図柄が出ているので文字説明は出さない
    if (pl.rare) spawn('fire', 1); }
    else missMark();
  }
  function pushFire(auto) {
    if (!pushPlan || pushPlan.done) return;
    if (!auto && !pushEl.classList.contains('ready')) return;
    const pl = pushPlan; pl.done = true;
    pushEl.className = 'lcd-push on pressed';
    if (soundEnabled) { initAudio(); tone(196, audioCtx.currentTime, 0.12, 'square', 0.14); }
    pushOff = setTimeout(() => { pushEl.className = 'lcd-push'; }, 450);
    setTimeout(() => pushResult(pl), auto ? 150 : 240);
  }
  pushEl.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); pushFire(false); });
  const ROLE_SYM = { melon: 'melon', bell: 'bell', replay: 'replay', cherry: 'cherry', chance: '@CHANCE' };
  /* ---------- 天候ステップアップ: 停止ボタンを押すたびに 雨 → 豪雨 → 雷+ひび割れ と発展する。
     雷まで発展(第3停止)したら、CHANCE ZONE(高確率ゾーン)かボーナスが確定。途中で止まったときは何も約束しない ---------- */
  const wxEl = document.createElement('div');
  wxEl.className = 'lcd-wx';
  wxEl.innerHTML = '<i class="wx-r1"></i><i class="wx-r2"></i><svg class="wx-bolt" viewBox="0 0 60 120"><path d="M38 0 L12 62 L28 62 L16 120 L52 48 L33 48 L46 0 Z"/></svg><svg class="wx-crack" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M50 0 L46 18 L58 30 L42 48 L56 64 L47 82 L52 100 M46 18 L24 26 L10 40 M58 30 L80 26 L96 38 M42 48 L18 58 L4 74 M56 64 L78 72 L94 66 M47 82 L30 90"/></svg>';
  if (stageEl) stageEl.appendChild(wxEl);
  let wxPlan = null, wxT = 0, czTipShown = false;
  function noiseBurst(dur, vol, type, freq) {
    if (!soundEnabled) return;
    initAudio();
    const n = Math.floor(audioCtx.sampleRate * dur), buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
    src.buffer = buf; f.type = type; f.frequency.value = freq; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(audioCtx.destination);
    src.start();
  }
  function wxClear() { clearTimeout(wxT); wxEl.className = 'lcd-wx'; }
  function wxStep(n) {
    if (!wxPlan) return;
    const L = wxPlan.L;
    if (n <= L) {
      wxEl.className = 'lcd-wx on w' + n;
      clearTimeout(wxT); wxT = setTimeout(() => { wxPlan = null; wxClear(); }, 3200);   // 念のため自動で消す
      void wxEl.offsetWidth;
      tag(['', '雨 1/3', '豪雨 2/3', '雷! 3/3'][n], n >= 3 ? 'f3' : 'f' + n, 1500);
      if (n === 1) noiseBurst(0.7, 0.07, 'highpass', 3500);
      if (n === 2) { noiseBurst(1, 0.14, 'highpass', 2500); noiseBurst(0.8, 0.12, 'lowpass', 300); }
      if (n === 3) {
        burst(); swoosh(3);
        noiseBurst(1.4, 0.3, 'lowpass', 700);
        if (soundEnabled) { tone(52, audioCtx.currentTime, 0.9, 'sine', 0.35); }
        if (window.shakeMain) shakeMain(600);
        act('shock' in ACTS ? 'shock' : 'jump');
      }
    } else if (n === L + 1) {
      wxClear();
      if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; tone(330, t, 0.2, 'triangle', 0.07); tone(262, t + 0.12, 0.3, 'triangle', 0.07); }
    }
  }
  function planWeather(kind, hit0) {
    const flagGame = hit0 || czNew;   // 雷(3)は、CHANCE ZONE突入かボーナスのゲームでしか出ない
    let p, w;
    if (flagGame) { p = .5; w = [0, 15, 30, 55]; }
    else {
      const rare = /^(cherryS|melon$|chanceS)/.test(kind), mid = /^(cherryW|melonW|chanceW)/.test(kind);
      p = rare ? .18 : mid ? .1 : .04;
      w = rare ? [0, 60, 40, 0] : [0, 85, 15, 0];
    }
    if (rnd() >= p * freq()) return null;
    return { L: Math.max(1, wpick(w)), flag: flagGame };
  }
  function planHint(kind) {
    const hit = FX.outcomeClass(kind) === 'hit';
    const zone = czLeft > 0 || czNew || zenchoLeft > 0 || fakeZencho > 0;
    const pf = (hit ? .6 : zone ? .4 : .025) * freq();
    if (forceLv || rnd() < pf) {
      let lv = wpick(FLAG_W[hit ? 'hit' : zone ? 'zone' : 'none']);
      if (forceLv) { lv = Math.max(lv, forceLv); forceLv = 0; }
      lv = Math.max(1, lv);
      return { t: 'flag', lv, type: pick(FLAG_SPR[lv]) };
    }
    const g = groupOf(kind);
    if (g && rnd() < roleHintP(kind) * freq()) return { t: 'role', g };
    if (kind === 'lose' && rnd() < (hit ? .15 : .03) * freq()) return { t: 'role', g: pick(Object.keys(ROLE_SPR)) };
    return null;
  }
  function flagSprite(type, lv) {
    if (type === 'star') { for (let i = 0; i <= lv; i++) setTimeout(() => spawn('star', lv), i * 220); }
    else spawn(type, lv);
  }
  /* ぎゅわーん: 音程が一気に駆け上がる音 (lv が高いほど長く高く) */
  function swoosh(lv) {
    if (!soundEnabled) return;
    initAudio();
    const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(900 + lv * 500, t + 0.18 + lv * 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28 + lv * 0.08);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.4 + lv * 0.08);
    tone(70, t, 0.22, 'sine', 0.22);
  }
  function burst() {
    if (!stageEl) return;
    const b = document.createElement('div');
    b.className = 'lcd-burst';
    stageEl.appendChild(b);
    setTimeout(() => b.remove(), 800);
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200);
  }
  function showHint(h) {
    if (h.t === 'role') {
      const d = spawn(ROLE_SPR[h.g], 1);
      d.style.setProperty('--sc', ROLE_COL[h.g]);
      if (h.g !== 'replay' && h.g !== 'bell') tag(`${ROLE_JP[h.g]}示唆`, 'role', 2800);   // リプレイ・ベルは文字なし
      swoosh(0);
      if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; [660, 880].forEach((f, i) => tone(f, t + i * 0.1, 0.18, 'triangle', 0.08)); }
    } else {
      flagSprite(h.type, h.lv);
      tag(FLAG_TAG[h.lv], 'f' + h.lv, 2800);
      swoosh(h.lv);
      if (h.lv >= 3) burst();
      if (h.lv >= 2) say(h.lv >= 3 ? 'HOT!!' : '', FLAG_TAG[h.lv].replace('ボーナス示唆 ', ''), 1600, 'shock', h.lv >= 3 ? 'jump' : 'shake');
      if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; for (let i = 0; i <= h.lv; i++) tone(523 * Math.pow(1.26, i), t + i * 0.08, 0.2, 'triangle', 0.09); }
    }
  }
  function resolveHints(hints, kind, hit0) {
    if (!hints.length || hit0 && hints.every(x => x.t === 'role')) return;
    const flagOK = hit0 || czNew;
    let missed = false;
    hints.forEach(h => {
      if (h.t === 'flag') { if (flagOK) say('CHANCE!', h.lv >= 3 ? 'ボーナス濃厚' : 'いい予感…', 1800, 'happy', 'jump'); else missed = true; }
      else if (groupOf(kind) !== h.g && !hit0) missed = true;
    });
    if (missed && !(hit0 || czNew)) setTimeout(missMark, 450);
  }
  /* 連続演出(前兆・疑似連)の段階表示。i/n: 何話目か */
  function story(i, n, last) {
    const lv = Math.max(1, Math.min(3, Math.ceil(i * 3 / Math.max(1, n))));
    tag(`連続演出 ${'●'.repeat(Math.min(i, n))}${'○'.repeat(Math.max(0, n - i))}`, 'f' + lv, 3000);
    flagSprite(pick(FLAG_SPR[lv]), lv);
    swoosh(lv);
    if (lv >= 3) burst();
    if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; for (let k = 0; k < 2 + i; k++) tone(392 * Math.pow(1.19, k + i), t + k * 0.07, 0.16, 'triangle', 0.09); tone(80, t, 0.3, 'sine', 0.2 + 0.05 * i); }
    if (lv >= 3 || last) { act('jump'); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500); }
  }
  const ROLE_MSG = { cherryW: ['弱チェリー', 'CHERRY'], cherryS: ['強チェリー', 'CHERRY!!'], melonW: ['弱スイカ', 'MELON'], melon: ['強スイカ', 'MELON!!'], chanceW: ['弱チャンス目', 'CHANCE'], chanceS: ['強チャンス目', 'CHANCE!!'] };

  /* ---------- 小役の成立とペカり ---------- */
  const _rr = runRole;
  let hints = [];
  runRole = function (kind, done, navi) {
    let hit0 = false;
    const normalNow = !isDebugRun && !bonusRun && atGames === 0 && !atEnding && !window.pekaLit;   // GOGO!ランプが光ったあとは、液晶の予告・示唆を出さない
    if (normalNow) {
      const second = FX.don;   // ドン演出のあとの再突入
      if (!second) { hints = []; missGame = false; wxPlan = null; wxClear(); symHint = null; hintHoldUntil = 0; hintClear(true); }
      hit0 = FX.outcomeClass(kind) === 'hit';
      // PUSHが出るゲームは、押す前に図柄や示唆は出さない（押したときに結果を見せる）
      let armed = false;
      if (!second) {
        pushPlan = null;
      if (wxPlan) { wxPlan = null; wxT = setTimeout(wxClear, 800); }
        const rare = /^(cherryS|melon$|chanceS)/.test(kind);
        const pp = hit0 ? .5 : czNew ? .6 : ({ cherryS: .5, cherryW: .25, melon: .5, melonW: .25, chanceS: .5, chanceW: .25 }[kind] ?? (/^bell/.test(kind) || kind === 'replay' ? .05 : kind === 'lose' ? .03 : 0));
        if (!forceLv && rnd() < pp * freq()) { pushArm({ hit0, cz: !!czNew, group: groupOf(kind), rare }); armed = true; }
      } else armed = !!pushPlan && !pushPlan.done;
      if (!armed && !second && !forceLv) wxPlan = planWeather(kind, hit0);
      if (!second) symHint = (!armed && !wxPlan) ? planSymHint(kind) : null;
      if (!armed && !wxPlan && (!second || forceLv)) { const h = planHint(kind); if (h) { hints.push(h); showHint(h); } }
      if (!second && czLeft > 0) { spawn('star', 1); if (!czTipShown) { czTipShown = true; tag('ボーナス当選か前兆で成功', 'role', 3000); } }
    }
    return _rr(kind, res => {
      const hintsNow = hints; hints = [];
      if (pushPlan && !pushPlan.done) pushFire(true);
      pushPlan = null;
      const WIN_LAMP = LAMP_TABLE.win;
      const aimedRole = kind === 'cherryW' || kind === 'cherryS' || kind === 'melon';   // 狙う役だけ成否がある（ベル・リプレイ・弱スイカは success が付かない）
      if (WIN_LAMP[kind] && (!aimedRole || (res && res.success))) { const rareK = /^(cherry|melon|chance)/.test(kind); sideLampFlash(WIN_LAMP[kind], rareK ? 1700 : 1100, 'strobe'); }   // 当たった役の色で高速点滅(レア役は長め)
      if (!isDebugRun) {
        const r = ROLE_MSG[kind];
        if (r) { const strong = kind === 'cherryS' || kind === 'melon' || kind === 'chanceS'; say(r[1], r[0], 1700, strong ? 'shock' : 'happy', strong ? 'jump' : null); }
        else if (kind === 'replay') say('REPLAY', '', 900);
        normalPlay(kind);
        if (normalNow) {
          resolveHints(hintsNow, kind, hit0);
          if (czNew) czTipShown = false;
          if (czNew) setTimeout(() => { say('CHANCE ZONE', '6G以内にボーナス当選で成功', 3000, 'shock', 'jump'); spawn('fire', 2); tag('CHANCE ZONE 突入', 'f3', 2800); }, 900);
        }
      }
      done(res);
    }, navi);
  };
  /* 通常時のベル / リプレイ: 連続すると派手になる */
  let nb = 0, nr = 0;
  function chime(f0, n) { if (soundEnabled && audioCtx) { const t = audioCtx.currentTime; for (let i = 0; i < n; i++) tone(f0 * Math.pow(1.26, i), t + i * 0.07, 0.18, 'triangle', 0.09); } }
  function normalPlay(kind) {
    if (bonusRun || atGames > 0 || atEnding) { nb = nr = 0; return; }
    if (kind.startsWith('bell')) {
      nr = 0; nb++;
      say('BELL', nb >= 2 ? `x${nb}` : '', 1000, 'happy', 'hop');
      for (let i = 0; i < Math.min(5, nb); i++) setTimeout(() => spawn('coin', Math.min(3, nb >> 1)), i * 120);
      chime(880, Math.min(4, nb));
      if (nb === 3) { say('BELL COMBO', 'x3', 1700, 'happy', 'spin'); spawn('fire', 1); if (window.TRO) TRO.seen('bell3'); }
      if (nb === 6) { say('BELL COMBO', 'x6', 1900, 'happy', 'spin'); spawn('fire', 2); spawn('rainbow', 2); }
    } else if (kind === 'replay') {
      nb = 0; nr++;
      say('REPLAY', nr >= 2 ? `x${nr}` : 'もう1回', 1000, 'happy', nr >= 2 ? 'hop' : null);
      spawn('ripple', Math.min(3, nr - 1));
      chime(660, 2);
      if (nr === 3) { say('REPLAY RUSH', 'x3', 1700, 'happy', 'spin'); spawn('ripple', 3); if (window.TRO) TRO.seen('replay3'); }
    } else { nb = nr = 0; }
  }
  const _tp = triggerPekari;
  triggerPekari = function (...a) {
    if (!isDebugRun && !window.pekaLit) {   // ランプが先に光っていたら、液晶のGOGO演出は出さない
      if (window.vibrate) window.vibrate([80, 40, 80, 40, 200]);
      el.classList.add('flash', 'rainbow');
      say('PEKA!!', 'GOGO LAMP', 2400, 'happy', 'jump');
      spawn('fire', 3);
      setTimeout(() => el.classList.remove('flash', 'rainbow'), 2600);
    }
    return _tp.apply(this, a);
  };

  /* ---------- 背景シーンと状態表示 ---------- */
  const IDLE = {
    day: ['いい天気だね', '雲がゆっくり流れてる', 'のんびり回そう', '風が気持ちいい'],
    dusk: ['夕焼けがきれい', '空の色が変わってきた', '日が傾いてきたよ'],
    night: ['星がきれいだよ', '静かな夜だね', '月が明るい', '流れ星、来るかな']
  };
  /* ステージ: 昼=通常 / 夕=高確示唆 / 夜=超高確示唆。AT後の隠れモードをにおわせる（示唆はズレることがあり、当選確率は変えない） */
  let stage = 'day', stageLeft = 0, stageMode = 0, stageGame = -1;
  function stageNow() {
    if (stageGame !== cumulativeGames) {
      stageGame = cumulativeGames;
      if (modeGames > 0 && stageMode === 0) {
        // モード突入: 倍率に応じてステージを決める（20%はズレる）
        let lv = modeMult >= 8 ? 2 : modeMult >= 4 ? 1.5 : 1;
        if (Math.random() < 0.2) lv = Math.max(0, lv - 1) + (Math.random() < 0.5 ? 0 : 1);
        stage = lv >= 2 ? 'night' : lv >= 1 ? 'dusk' : 'day';
        stageLeft = modeGames;
      }
      stageMode = modeGames;
      if (stageLeft > 0) stageLeft--;
      else if (stage !== 'day' && modeGames === 0) stage = 'day';
      // 通常時にもたまに夕・夜に変わる（ガセ。10〜20G）
      if (stage === 'day' && modeGames === 0 && stageLeft === 0 && !isDebugRun) {
        const r = Math.random();
        if (r < 1 / 140) { stage = 'dusk'; stageLeft = 10 + Math.floor(Math.random() * 11); }
        else if (r < 1 / 140 + 1 / 700) { stage = 'night'; stageLeft = 10 + Math.floor(Math.random() * 11); }
      }
      if (stageLeft === 0 && modeGames === 0) stage = 'day';
    }
    return stage;
  }
  function scene() {
    if (bonusRun) return bonusRun.zone ? 'zone' : 'bonus';
    if (rushNow()) return atType === 1 ? 'heaven' : atType === 2 ? 'death' : 'at';
    if (zenchoLeft > 0 || fakeZencho > 0) return 'zencho';
    if (czLeft > 0) return 'cz';
    return stageNow();
  }
  /* 前兆の連続演出: 毎ゲーム一言ずつ進む。本物もガセも同じ流れで、最後のゲームだけ結果が分かれる */
  const ZSTEPS = ['ようすが…', 'ざわざわ…', '何かが近づいてる', 'チャンス！', '来るか…！'];
  window.onZenchoStep = function (z) {
    if (isDebugRun) return;
    if (z.end && !z.real) { say('', 'あれ…？', 2800, 'sad', 'sad'); missMark(); return; }
    const t = ZSTEPS[z.i >= z.n ? 4 : Math.min(3, z.i - 1)];
    say(`STORY ${z.i}/${z.n}`, t, 2000, z.i >= 3 ? 'shock' : 'happy');
    story(z.i, z.n, z.i >= z.n);
  };
  window.onCzEnd = function () { if (isDebugRun) return; setTimeout(() => { window.panelUpDone = true; if (czLeft === 0 && !window.czHoldNow) say('', 'ゾーン終了…', 2800, 'sad', 'sad'); }, 400); };   // 連続演出でHOLDされたら終了しない
  window.onCzHold = function () { if (isDebugRun) return; setTimeout(() => { act('hop'); }, 100); };
  window.czKeepClear = function () { const E = window.czKeep; window.czKeep = null; if (E) { E.classList.add('out'); setTimeout(() => E.remove(), 400); } };
/* BONUS確定: ビガビガ!と鳴って、強烈にフラッシュ (液晶いっぱいに白と色を交互に) */
  window.bigaFlash = function () {
    if (isDebugRun || !stageEl) return;
    const F = document.createElement('div');
    F.className = 'lcd-biga';
    stageEl.appendChild(F);
    setTimeout(() => F.remove(), 1700);
    if (window.shakeMain) shakeMain(500);
    if (!soundEnabled) return;
    initAudio();
    const t0 = audioCtx.currentTime + 0.01;
    for (let i = 0; i < 30; i++) {   // ビガビガ: 高い音と低い音を速く交互に (約1.4秒)
      const t = t0 + i * 0.047, hi = i % 2 === 0;
      tone(hi ? 2093 : 1175, t, 0.04, 'square', 0.16);
      tone(hi ? 1568 : 880, t, 0.04, 'sawtooth', 0.1);
      if (i % 4 === 0) tone(90, t, 0.1, 'sine', 0.3);
    }
    tone(55, t0, 0.9, 'sine', 0.42);   // 腹に響く低音
    tone(2637, t0 + 1.42, 0.5, 'triangle', 0.12);
  };
  window.onCzSuccess = function () {
    if (isDebugRun || !stageEl) return;
    window.czSevenColor = SEVENS[Math.floor(Math.random() * SEVENS.length)];   // 予告の7の色（揃えるときも同じ色を狙う）
    window.sideConfirm = true;   // 確定したら、以降サイドのGOGO!ランプは(ボーナス開始まで)光り続ける
    setTimeout(() => {   // 液晶に「BONUS 確定!」だけを
      window.panelUpDone = true;   // 確定画面が出たら下パネルを元に戻す、どどどどどん!と連打で大きく表示 (トーストなし)
      const E = document.createElement('div');
      E.className = 'lcd-czwin';
      E.innerHTML = '<i class="cw-bg"></i><i class="cw-pic"></i>';   // 「BONUS 確定」の画像をズームで出す
      stageEl.appendChild(E);
      window.czKeep = E;   // 777が揃うまで液晶に残す
      setTimeout(() => { if (window.czKeep !== E) return; E.classList.add('keep'); const im = SYM_IMG[window.czSevenColor] || ASSET_DIR.img + window.czSevenColor + '.png'; E.insertAdjacentHTML('beforeend', `<div class="cw-sev"><div class="cw-imgs"><img src="${im}"><img src="${im}"><img src="${im}"></div></div>`); }, 2200);
      act('jump'); swoosh(3); if (window.bigaFlash) bigaFlash();
      window.sideRb = Date.now() + 3200;   // 確定表示の間は、サイドのGOGO!がちかちか虹色
      for (let i = 0; i < 9; i++) setTimeout(() => {
        if (window.shakeMain) shakeMain(140); burst();
        if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; tone(72 + (i % 3) * 10, t, 0.3, 'sine', 0.3); tone(160 + i * 18, t, 0.08, 'square', 0.1); }
      }, 100 + i * 150);
      for (let i = 0; i < 10; i++) setTimeout(() => spawn('coin', 3), 900 + i * 90);
      if (soundEnabled) { initAudio(); const t0 = audioCtx.currentTime + 1.4; [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, t0 + i * 0.07, 0.4, 'triangle', 0.12)); }
    }, 400);
  };
  /* 7が何度も揃えられないとき: 狙う色の777を液晶に出し続ける（揃うまで）。色は以降の7揃えにも使う */
  window.showSevenGuide = function () {
    if (isDebugRun || !stageEl || window.czKeep) return;
    const diag = typeof pendingWhiteDiag !== 'undefined' && pendingWhiteDiag;
    const reg = typeof pendingReg !== 'undefined' && pendingReg;
    if (!window.czSevenColor) window.czSevenColor = SEVENS[Math.floor(Math.random() * SEVENS.length)];
    const col = diag ? '7white' : window.czSevenColor;
    const NM = { '7red': '赤7', '7blue': '青7', '7white': '白7' };
    const imgOf = k => SYM_IMG[k] || ASSET_DIR.img + k + '.png';
    const keys = reg ? [col, col, 'bar'] : [col, col, col];
    const text = diag ? '白7を斜めに揃えろ' : reg ? `${NM[col]}・${NM[col]}・BAR を揃えろ` : `${NM[col]}を揃えろ`;
    const E = document.createElement('div');
    E.className = 'lcd-sevhint';
    E.innerHTML = `<i class="sh-bg"></i><div class="sh-box"><em>${text}</em><div class="sh-imgs">${keys.map(k => `<img src="${imgOf(k)}">`).join('')}</div></div>`;
    stageEl.appendChild(E);
    window.czKeep = E;   // 揃ったら czKeepClear で消える
    if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; [784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.08, 0.3, 'triangle', 0.1)); }
  };
  window.onSevenHint = window.showSevenGuide;   // 7を何度も外したときも同じ表示
  /* ハマり中のひとこと: ペカり君が励ます。250G超えで救済(当選率UP)が始まる */
  const HAMARI = [[150, 'ちょっとハマり気味…', 'sad'], [250, '救済スタート！', 'jump'], [400, 'がんばれ！', 'jump'], [600, '絶対くるよ！', 'cross'], [800, 'もう少し…！', 'jump']];
  let hamariG = 0;
  window.HAMARIX = { get: () => hamariG, set: v => { hamariG = v | 0; } };   // セーブ/ロード用
  setInterval(() => {
    if (isDebugRun) return;
    if (totalGames < hamariG) hamariG = 0;
    HAMARI.forEach(h => {
      if (hamariG < h[0] && totalGames >= h[0] && !bonusRun && atGames === 0) {
        hamariG = h[0];
        say(`${h[0]}G`, h[1], 2800, h[2] === 'sad' ? 'sad' : 'happy', h[2]);
      }
    });
  }, 500);
  /* 本当にRUSH中か: PEKA CHANCE中・ボーナスだけで終わったリザルト(RUSHに入らなかった)は含めない */
  function rushNow() {
    if (bonusRun && !bonusRun.zone) return false;
    if (atGames > 0) return true;
    return !!atEnding && !(atRun && atRun.bonusOnly);
  }
  /* サイドの PEKA RUSH / PEKA CHANCE ランプ: AT中 / ボーナス中だけ光る */
  let sideRushG = null, sideMtnG = null;
  const rlRush = [...document.querySelectorAll('.rl.rush')], rlChance = [...document.querySelectorAll('.rl.chance')];
  setInterval(() => {
    if (document.hidden) return;   // 見えていない間は表示だけの更新を止める
    const rush0 = rushNow();   // PEKA CHANCE中は光らせない (RUSH突入から)
    const mtn0 = !!(bonusRun && bonusRun.zone);
    /* RUSH / MOUNTAIN のロゴ: 突入から2ゲームで消す */
    const gNow = (typeof cumulativeGames === 'number') ? cumulativeGames : 0;
    if (!rush0) sideRushG = null; else if (sideRushG == null) sideRushG = gNow;
    if (!mtn0) sideMtnG = null; else if (sideMtnG == null) sideMtnG = gNow;
    const rush = rush0;   // 右パネルのRUSHランプ: RUSH中ずっと点灯
    const rushLogo = rush0 && (gNow - sideRushG) < 2;   // 中央液晶のRUSHロゴ: 突入から2ゲームで消す
    const mtnLit = mtn0 && (gNow - sideMtnG) < 2;
    /* 液晶側のロゴ: 突入演出のあと、2ゲームのあいだ背景に残して消す */
    const lbMode = (rushLogo && !isPushing && !isRushing) ? 'rush' : (mtnLit && !document.querySelector('.lcd-zoneintro')) ? 'mtn' : '';
    if (stageEl) {
      let lb = stageEl.querySelector('.lcd-logobg');
      if (lbMode && !lb) { lb = document.createElement('div'); lb.className = 'lcd-logobg'; stageEl.insertBefore(lb, stageEl.firstChild); }
      if (lb) { if (lbMode) lb.dataset.m = lbMode; else lb.remove(); }
    }
    const chance = !!bonusRun && !bonusRun.zone;
    rlRush.forEach(e => e.classList.toggle('lit', !!rush));
    rlChance.forEach(e => e.classList.toggle('lit', chance));
    const inBonus = typeof bonusRun !== 'undefined' && bonusRun;
    const cz = !inBonus && !rush0 && (czLeft > 0 || (window.czFrozen != null && zenchoLeft > 0));
    document.querySelectorAll('.rl.cz').forEach(e => e.classList.toggle('lit', !!cz));
    document.querySelectorAll('.rl.mtn').forEach(e => e.classList.toggle('lit', mtnLit));
    const cabEl = document.querySelector('.cabinet'); if (cabEl) cabEl.classList.toggle('in-zone', !!(inBonus && bonusRun.zone));   // PEKA PEKA MOUNTAIN中は筐体を緑ベースに
    /* サイドのGOGO!ランプ: 液晶のGOGO!と同じ見た目・同じ色。液晶より先に光ることもある(ボーナス確定のゲームだけ) */
    const gl = !!(gogoBox.classList.contains('peka') || window.sideGogo || window.sideConfirm);
    const rb = Date.now() < (window.sideRb || 0);
    document.querySelectorAll('.rl.gogo').forEach(e => {
      const tn = Math.max(1, (typeof pendingDisplayIndex === 'number' ? pendingDisplayIndex : 0) + 1);
      const cls = gl ? `rl gogo lit peka tier-${tn}${rb ? ' rb' : ''}` : 'rl gogo';
      if (e.className !== cls) e.className = cls;
      if (gl && typeof BIG_TIERS !== 'undefined' && BIG_TIERS[tn - 1]) e.style.setProperty('--glow', BIG_TIERS[tn - 1].glow);
    });
    document.querySelectorAll('.rl.rush .rk').forEach(e => { const t = rush ? (['', 'HEAVEN', 'DEATH'][atType] || '') : ''; if (e.textContent !== t) e.textContent = t; e.className = 'rk' + (atType === 1 ? ' hv' : atType === 2 ? ' dt' : ''); });
  }, 100);
  /* PEKA CHANCE中、背景(オーラ)の色が昇格したら LEVEL UP! */
  const AURA_NAME = ['白', '青', '黄', '緑', '赤', '金', '虹'];
  const _setAura = window.setAura;
  if (typeof _setAura === 'function') window.setAura = setAura = function (level, pop) {
    const r = _setAura.apply(this, arguments);
    if (pop && level > 0 && !isDebugRun && bonusRun && !bonusRun.zone && !bonusRun.confirmShown) {
      const lv = Math.min(level, 6);
      const L = document.createElement('div');   // 液晶の中央に大きく表示。表示中に色が変わる
      L.className = 'lcd-lvup';
      L.innerHTML = '<span>LEVEL</span><b>UP!!</b>';
      stageEl.appendChild(L);
      if (window.hideGet) hideGet();   // 15枚GETは出さない
      setTimeout(() => L.remove(), 2400);
      act('jump');
      burst(); swoosh(lv >= 4 ? 3 : lv >= 2 ? 2 : 1);
      for (let i = 0; i < 2 + lv; i++) setTimeout(() => spawn('coin', 2), i * 80);
      if (lv >= 3) spawn('star', 2);
      if (soundEnabled) { initAudio(); const t = audioCtx.currentTime; [523, 659, 784, 1047, 1319].slice(0, 2 + Math.min(3, lv)).forEach((f, i) => tone(f, t + i * 0.07, 0.2, 'triangle', 0.1)); }
    }
    return r;
  };
  setInterval(() => { if (bonusRun || atGames > 0 || atEnding || isAtResult) { wxPlan = null; if (wxEl.classList.contains('on')) wxClear(); } }, 200);   // ボーナス/AT中は天候演出を残さない
  /* CHANCE ZONE 残りゲーム数: 液晶の左上に常時表示。連続演出中は HOLD (消化ストップ) */
  const czEl = document.createElement('div');
  czEl.className = 'lcd-cz';
  czEl.innerHTML = '<span class="cz-l">LAST</span><em class="cz-h">HOLD</em><b class="cz-n">00</b><span class="cz-g">G</span><em class="cz-z">前兆中</em>';
  if (stageEl) stageEl.appendChild(czEl);
  const czN = czEl.querySelector('.cz-n');
  setInterval(() => {
    if (zenchoLeft === 0 || bonusRun || atGames > 0) window.czFrozen = null;   // 前兆が終われば(=ボーナス)CZ表示も終わる
    const zen = window.czFrozen != null && zenchoLeft > 0;
    const on = (czLeft > 0 || zen) && !(typeof bonusRun !== 'undefined' && bonusRun) && !(atGames > 0);
    czEl.classList.toggle('on', on);
    if (on) { czN.textContent = String(zen ? window.czFrozen : czLeft).padStart(2, '0'); czEl.classList.toggle('hold', zen || !!window.czHoldNow); czEl.classList.toggle('zen', zen); }
  }, 100);
  /* PEKA CHANCE中は、RUSHに入る条件を常時表示 */
  const capEl = document.createElement('div');
  capEl.className = 'lcd-cap';
  capEl.textContent = '最終GのJUDGEMENTに勝てばPEKA RUSH';
  if (stageEl) stageEl.appendChild(capEl);
  setInterval(() => { if (!document.hidden) capEl.classList.toggle('on', !!(typeof bonusRun !== 'undefined' && bonusRun && !bonusRun.zone && !isDebugRun)) }, 200);
  /* 筐体上部の表示(PEKARI-KUN)に、いまのゲーム種類を1行で出す */
  const mqText = document.querySelector('.cab-marquee > span');
  const MQ_BASE = mqText ? mqText.textContent : 'PEKARI-KUN';
  let mqLast = '';
  setInterval(() => {
    if (!mqText || document.hidden) return;
    let t = MQ_BASE, c = '';
    if (typeof bonusRun !== 'undefined' && bonusRun) { t = bonusRun.zone ? 'PEKA PEKA MOUNTAIN!' : 'PEKA CHANCE!'; c = bonusRun.zone ? 'mq-zone' : 'mq-chance'; }
    else if (rushNow()) { t = ['PEKA RUSH', 'PEKA RUSH  HEAVEN', 'PEKA RUSH  DEATH'][atType] || 'PEKA RUSH'; c = ['mq-rush', 'mq-heaven', 'mq-death'][atType] || 'mq-rush'; }
    else if (zenchoLeft > 0 || fakeZencho > 0) { t = 'ZENCHO'; c = 'mq-zencho'; }
    else if (czLeft > 0) { t = 'CHANCE ZONE'; c = 'mq-cz'; }
    if (t === mqLast) return;
    mqLast = t;
    mqText.textContent = t;
    mqText.className = c;
  }, 200);
  let last = '';
  setInterval(() => {
    if (document.hidden) return;
    const sc = scene();
    if (sc !== last) {
      last = sc; el.dataset.scene = sc;
      const cab = document.querySelector('.cabinet'); if (cab) cab.dataset.scene = sc;
      if (sc === 'day') say('NEW DAY', '', 1500);
      if (sc === 'dusk') say('DUSK', '', 1200);
      if (sc === 'night') say('NIGHT', '', 1200);
      if (sc === 'zencho') say('ZENCHO', '', 1500, 'shock', 'peek');
      if (sc === 'cz') say('CHANCE ZONE', '', 1500, 'happy', 'dash');
      if (sc === 'at' || sc === 'heaven') say('', '', 1, 'happy', 'cross');
      if (sc === 'death') say('DEATH', '', 1500, 'angry', 'angry');
      if (sc === 'bonus' || sc === 'zone') act('jump');

    }
    if (Date.now() < hold) return;
    if (bonusRun) {
      const b = bonusRun;
      if (b.zone) { m1.textContent = 'MOUNTAIN'; m2.textContent = `上乗せ +${b.zoneG}G`; }
      else { m1.textContent = 'BONUS'; m2.textContent = `残り ${Math.max(0, b.games - b.played)}G`; }
    } else if (atGames > 0) {
      m1.textContent = ['RUSH', 'HEAVEN', 'DEATH'][atType] || 'RUSH';
      const gain = atRun ? diffCoins - atRun.startDiff : 0;
      m2.textContent = `残り ${atGames}G  ${gain >= 0 ? '+' : ''}${gain}`;
    } else if (zenchoLeft > 0 || fakeZencho > 0) { m1.textContent = 'ZENCHO'; m2.textContent = ''; }
    else { m1.textContent = ''; m2.textContent = ''; }
  }, 300);
  /* AT / ボーナスの結果に合わせてペカり君が反応する */
  const _sar = showAtResult;
  showAtResult = function (run) {
    if (!isDebugRun && run) {
      const gain = run.gain !== undefined ? run.gain : diffCoins - run.startDiff;
      if (gain >= 600) { say('GREAT!', `+${gain}`, 3000, 'happy', 'jump'); for (let i = 0; i < 8; i++) setTimeout(() => spawn('coin', 3), i * 110); spawn('fire', 3); }
      else if (gain >= 0) say('NICE', `+${gain}`, 2600, 'happy', 'cross');
      else say('', '次こそ…', 2800, 'sad', 'sad');
    }
    return _sar.apply(this, arguments);
  };
  const _sat = startAT;
  startAT = function () { const r = _sat.apply(this, arguments); if (!isDebugRun) { say('AT START', '', 1800, 'shock', 'dash'); spawn('rocket', 2); spawn('fire', 2); } return r; };
  const _miss = missEffect;
  missEffect = function () { _miss(); if (!isDebugRun) say('', '残念…', 2200, 'sad', 'sad'); };
  /* ときどき画面を横切ったり、ひょっこり出てくる */
  setInterval(() => {
    if (isDebugRun || FX.busy || Date.now() < hold || document.hidden) return;
    if (rnd() < 0.5 * freq()) act(pick(['cross', 'peek', 'jump', 'peek', 'cross']));
  }, 11000);
  /* 通常時のひとこと / 背景の動き */
  setInterval(() => {
    if (isDebugRun || bonusRun || atGames > 0 || Date.now() < hold || FX.busy) return;
    if (rnd() < 0.55) { const sc = scene(); say('', pick(IDLE[sc] || IDLE.day), 2600); }
  }, 7000);
  /* 飛来物は予告(役・フラグの示唆)のときだけ。背景として勝手には出さない */
  /* ---------- デモ画面: 45秒操作がないと、ランプと液晶が客寄せ表示になる。触れたら戻る ---------- */
  let lastInput = Date.now(), demoOn = false, demoStep = 0;
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => {
    lastInput = Date.now();
    if (demoOn) { demoOn = false; sideLampOff(); cabinetOnly(false); }
  }, { passive: true }));
  const cabinetOnly = on => { const c = document.querySelector('.cabinet'); if (c) c.classList.toggle('demo', on); };
  setInterval(() => {
    const busy = isDebugRun || bonusRun || atGames > 0 || isReelSpinning || isPekared || isBonusAligned || isAtResult || isPushing || FX.busy > 0 || zenchoLeft > 0 || fakeZencho > 0 || czLeft > 0 || window.bonusSure || (typeof AUTOPLAY !== 'undefined' && AUTOPLAY);
    if (busy) { lastInput = Date.now(); return; }
    if (!demoOn && Date.now() - lastInput > 45000) { demoOn = true; demoStep = 0; cabinetOnly(true); }
    if (!demoOn) return;
    const seq = ['red', 'green', 'blue', 'yellow', 'pink'];
    sideLampShow(seq[demoStep % seq.length], true);
    const texts = [['PEKARI-KUN', 'LEVER ON'], ['PEKA!', 'GOGO LAMP'], ['TAP TO PLAY', '']];
    const t = texts[demoStep % texts.length];
    say(t[0], t[1], 2600);
    demoStep++;
  }, 3000);
})();
