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
  el.innerHTML = '<div class="sl-stars"></div><div class="sl-body"></div><div class="sl-aurora"></div><div class="sl-weather"></div><div class="sl-ground"></div><div class="sl-fg"></div><div class="sl-actor"></div><div class="sl-msg"><b></b><small></small></div>';
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
    const a = actor.animate(frames, { duration: ms, easing: ease || 'ease-in-out' });
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
  window.LCDX = { act, say: (a, b, ms, md) => say(a, b, ms, md), spawn: (t, l) => spawn(t, l || 0) };
  let hold = 0;
  function say(a, b, ms, md, an) {
    m1.textContent = a || ''; m2.textContent = b || '';
    msg.classList.remove('pop'); void msg.offsetWidth; msg.classList.add('pop');
    hold = Date.now() + (ms || 1800);
    if (md) { setMood(md); setTimeout(() => { if (Date.now() >= hold - 50) setMood('happy'); }, ms || 1800); }
    if (an) anim(an);
  }

  /* ---------- リールを枠いっぱいに拡大 (液晶の下の余白をなくす) ---------- */
  const box = document.getElementById('gogo-box'), reelsEl = document.getElementById('reels');
  function fitReels() {
    if (!box || !reelsEl) return;
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    const top = (parseFloat(el.style.height) || el.offsetHeight || 186) + 4 + 2;
    const sc = Math.max(1, Math.min(w / 198, (h - top - 2) / 126));
    reelsEl.style.transform = `scale(${sc.toFixed(3)})`;
    reelsEl.style.marginTop = top + 'px';
  }
  fitReels();
  window.addEventListener('resize', fitReels);
  if (window.ResizeObserver && box) new ResizeObserver(fitReels).observe(box);
  window.fitReels = fitReels;

  /* 起動直後は停止リールを表示する (リール欄が空白にならないように)。あいさつにペカり君がひょっこり出る */
  try {
    if (typeof showStatic === 'function' && !isReelSpinning && cumulativeGames === 0) showStatic(gridOf([0, 1, 2].map(() => Math.floor(rnd() * STRIP_LEN))), null);
  } catch (e) { /* 表示だけなので無視 */ }
  setTimeout(() => { if (!isDebugRun) { say('PEKARI-KUN', 'レバーをタップ', 2600, 'happy', 'peek'); } }, 700);

  /* ---------- 飛来物 ---------- */
  const SPRITES = { leaf: 3600, whale: 5200, bird: 3000, bat: 2600, flock: 3400, coin: 1000, ripple: 1000, star: 900, ufo: 2000, rocket: 1400, balloon: 2600, rainbow: 2200, cloud: 3200, thunder: 3200, fire: 1100, chest: 1900, eye: 1800 };
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
    setTimeout(() => d.remove(), SPRITES[type] + 100);
    if (window.TRO) TRO.seen('lcd:' + type);
    return d;
  }
  const NAMES = { leaf: '葉', whale: 'クジラ', bird: '鳥', bat: 'コウモリ', flock: '鳥の群れ', coin: 'コイン', ripple: '波紋', star: '流れ星', ufo: 'UFO', rocket: 'ロケット', balloon: '気球', rainbow: '虹', cloud: '雲', thunder: '雷雲', fire: '花火', chest: '宝箱', eye: '目' };
  const LVW = { hit: [18, 30, 32, 20], rare: [30, 36, 24, 10], mid: [50, 35, 12, 3], none: [72, 24, 4, 0] };
  const wpick = w => { let x = rnd() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i; } return 0; };
  function preview(cls) {
    const lv = wpick(LVW[cls]);
    const type = pick(['star', 'star', 'ufo', 'rocket', 'balloon', 'rainbow', 'thunder', 'fire', 'chest', 'eye']);
    if (type === 'star') { for (let i = 0; i <= lv; i++) setTimeout(() => spawn('star', lv), i * 220); }
    else spawn(type, lv);
    if (lv >= 2) { say(['', '', '', 'HOT!!'][lv], NAMES[type], 1600, 'shock', lv >= 3 ? 'jump' : 'shake'); }
    return lv;
  }
  const ROLE_MSG = { cherryW: ['弱チェリー', 'CHERRY'], cherryS: ['強チェリー', 'CHERRY!!'], melonW: ['弱スイカ', 'MELON'], melon: ['強スイカ', 'MELON!!'], chanceW: ['弱チャンス目', 'CHANCE'], chanceS: ['強チャンス目', 'CHANCE!!'] };

  /* ---------- 小役の成立とペカり ---------- */
  const _rr = runRole;
  runRole = function (kind, done, navi) {
    if (!isDebugRun && !bonusRun && !FX.don) {
      const cls = FX.outcomeClass(kind);
      const p = ({ hit: 0.5, rare: 0.38, mid: 0.2, none: 0.09 }[cls] || 0) * freq();
      if (rnd() < p) preview(cls);
    }
    return _rr(kind, res => {
      const WIN_LAMP = LAMP_TABLE.win;
      const aimedRole = kind === 'cherryW' || kind === 'cherryS' || kind === 'melon';   // 狙う役だけ成否がある（ベル・リプレイ・弱スイカは success が付かない）
      if (WIN_LAMP[kind] && (!aimedRole || (res && res.success))) sideLampFlash(WIN_LAMP[kind], 1500);   // 当たった役の色
      if (!isDebugRun) {
        const r = ROLE_MSG[kind];
        if (r) { const strong = kind === 'cherryS' || kind === 'melon' || kind === 'chanceS'; say(r[1], r[0], 1700, strong ? 'shock' : 'happy', strong ? 'jump' : null); }
        else if (kind === 'replay') say('REPLAY', '', 900);
        normalPlay(kind);
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
    if (!isDebugRun) {
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
    if (atGames > 0 || atEnding) return atType === 1 ? 'heaven' : atType === 2 ? 'death' : 'at';
    if (zenchoLeft > 0 || fakeZencho > 0) return 'zencho';
    if (czLeft > 0) return 'cz';
    return stageNow();
  }
  /* 前兆の連続演出: 毎ゲーム一言ずつ進む。本物もガセも同じ流れで、最後のゲームだけ結果が分かれる */
  const ZSTEPS = ['ようすが…', 'ざわざわ…', '何かが近づいてる', 'チャンス！', '来るか…！'];
  window.onZenchoStep = function (z) {
    if (isDebugRun) return;
    if (z.end && !z.real) { say('', 'あれ…？', 2800, 'sad', 'sad'); return; }
    const t = ZSTEPS[z.i >= z.n ? 4 : Math.min(3, z.i - 1)];
    say(`STORY ${z.i}/${z.n}`, t, 2000, z.i >= 3 ? 'shock' : 'happy');
  };
  window.onCzEnd = function () { if (!isDebugRun) say('', 'ゾーン終了…', 2800, 'sad', 'sad'); };
  /* ハマり中のひとこと: ペカり君が励ます。250G超えで救済(当選率UP)が始まる */
  const HAMARI = [[150, 'ちょっとハマり気味…', 'sad'], [250, '救済スタート！', 'jump'], [400, 'がんばれ！', 'jump'], [600, '絶対くるよ！', 'cross'], [800, 'もう少し…！', 'jump']];
  let hamariG = 0;
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
  let last = '';
  setInterval(() => {
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
    else if (czLeft > 0) { m1.textContent = 'CHANCE ZONE'; m2.textContent = `残り ${czLeft}G`; }
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
  setInterval(() => {
    if (isDebugRun || bonusRun || FX.busy) return;
    const sc = scene();
    if (sc === 'day') { spawn(pick(['cloud', 'cloud', 'balloon', 'bird', 'flock', 'leaf']), 0); if (rnd() < 0.5) setTimeout(() => spawn('leaf', 0), 500); }
    else if (sc === 'death') spawn(rnd() < 0.6 ? 'bat' : 'cloud', 2);
    else if (sc === 'night') spawn(rnd() < 0.25 ? 'whale' : 'star', 0);
    else if (sc === 'dusk') spawn('cloud', 0);
    else if (atGames > 0 && rnd() < 0.5) spawn(pick(['star', 'fire', 'rocket']), sc === 'death' ? 2 : 1);
  }, 6500);
  /* ---------- デモ画面: 45秒操作がないと、ランプと液晶が客寄せ表示になる。触れたら戻る ---------- */
  let lastInput = Date.now(), demoOn = false, demoStep = 0;
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => {
    lastInput = Date.now();
    if (demoOn) { demoOn = false; sideLampOff(); cabinetOnly(false); }
  }, { passive: true }));
  const cabinetOnly = on => { const c = document.querySelector('.cabinet'); if (c) c.classList.toggle('demo', on); };
  setInterval(() => {
    const busy = isDebugRun || bonusRun || atGames > 0 || isReelSpinning || isPekared || isBonusAligned || isAtResult || isPushing || FX.busy > 0 || zenchoLeft > 0 || fakeZencho > 0 || czLeft > 0 || (typeof AUTOPLAY !== 'undefined' && AUTOPLAY);
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
