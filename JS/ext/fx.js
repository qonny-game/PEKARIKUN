/* =========================================================
   追加演出 (fx.js)  ※ app.js のあとに読み込む
   既存の関数を包んで、予告・逆転・コンボ・ミッション・山登り・称号・BGM などを足す。
   演出中は FX.busy > 0 になり、レバー/オートは待つ。
   ========================================================= */
(() => {
  'use strict';
  const rnd = () => Math.random();
  const pick = a => a[Math.floor(rnd() * a.length)];
  const wait = (ms, fn) => setTimeout(fn, ms);

  /* ---------- 設定 (演出の頻度 / BGM) ---------- */
  const FXO_KEY = 'pekari-fx-v1';
  const FXO = { freq: 'normal', bgm: true, wait: 'normal', vib: true, bgmN: false, lite: false };
  const applyLite = () => document.body.classList.toggle('fx-lite', !!FXO.lite);
  setTimeout(applyLite, 0);
  window.vibrate = pat => { try { if (FXO.vib && navigator.vibrate) navigator.vibrate(pat); } catch (e) { /* 非対応 */ } };
  try { Object.assign(FXO, JSON.parse(localStorage.getItem(FXO_KEY) || '{}')); } catch (e) { /* 初期値 */ }
  const saveFxo = () => { try { localStorage.setItem(FXO_KEY, JSON.stringify(FXO)); } catch (e) { /* 無視 */ } };
  const freqMul = () => ({ off: 0, low: 0.5, normal: 1, high: 1.6 }[FXO.freq] ?? 1);
  window.FXO_FREQ = freqMul;

  /* ---------- 状態 ---------- */
  const FX = window.FX = { busy: 0, hold(ms) { FX.busy++; wait(ms, () => { FX.busy = Math.max(0, FX.busy - 1); }); } };
  const st = {
    rev: null,          // ハズレ目のあとの当選演出: 'rev' (ガッカリ→逆転) / 'tease' (消灯焦らし)
    saki: null,         // 左リール停止で光る: 'real' / 'fake'
    pseudo: 0,          // 残りの疑似連
    noOmen: false,
    combo: 0, bestCombo: 0,
    mission: null, missionDone: 0,
    chain: 0,           // 連チャン数 (32G以内の再当選)
    retro: 0,           // レトロ画面の残りG
    lastShownG: -1,
    fakeRush: false
  };

  /* ---------- DOM ---------- */
  const lcd = document.getElementById('lcd-stage');
  const cab = document.querySelector('.cabinet');
  if (!lcd || !cab) return;
  const layer = document.createElement('div');
  layer.id = 'fx-layer';
  lcd.appendChild(layer);
  function put(cls, html, ms) {
    const e = document.createElement('div');
    e.className = cls;
    e.innerHTML = html;
    layer.appendChild(e);
    if (window.TRO) {
      const m = /^fx-(cutin|step|talk|dark)\b(?: c-(\w+))?/.exec(cls);
      if (m) TRO.seen(m[1] === 'cutin' ? 'cutin:' + m[2] : m[1]);
      const pv = /^fx-pv fx-pv-(\w+)/.exec(cls);
      if (pv) TRO.seen('pv:' + pv[1]);
    }
    if (ms) wait(ms, () => e.remove());
    return e;
  }
  function snd(notes, step = 0.08, dur = 0.2, type = 'triangle', vol = 0.12, t0 = 0) {
    if (!soundEnabled) return;
    initAudio();
    const t = audioCtx.currentTime + t0;
    notes.forEach((f, i) => tone(f, t + i * step, dur, type, vol));
  }
  const sndUp = n => snd(Array.from({ length: n }, (_, i) => 523 * Math.pow(1.122, i * 1.6)), 0.07, 0.22);
  const sndDown = () => snd([392, 330, 262, 196], 0.1, 0.25, 'sawtooth', 0.08);
  const sndBig = () => { snd([98, 98], 0.0, 1.0, 'sine', 0.2); snd([523, 659, 784, 1047, 1319, 1568], 0.06, 0.3, 'square', 0.08, 0.05); };

  /* ---------- ペカり君 (マスコット) ---------- */
  const COSTUMES = ['', 'hat', 'glass', 'bow', 'crown', 'band', 'star'];
  const COSTUME_NAME = ['ノーマル', 'キャップ', 'めがね', 'ちょうネクタイ', 'おうかん', 'はちまき', 'スター'];
  const costumeIdx = () => new Date().getDay();
  function mascotSVG(mood, glow) {
    const eyes = { happy: '<path d="M21 33q4-6 8 0M35 33q4-6 8 0" stroke="#3b2200" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      sad: '<circle cx="25" cy="34" r="2.6" fill="#3b2200"/><circle cx="39" cy="34" r="2.6" fill="#3b2200"/><path d="M20 28l8 3M44 28l-8 3" stroke="#3b2200" stroke-width="2" stroke-linecap="round"/>',
      angry: '<path d="M18 26l13 6M46 26l-13 6" stroke="#3b0a00" stroke-width="3.2" stroke-linecap="round"/><circle cx="25" cy="35" r="2.9" fill="#3b2200"/><circle cx="39" cy="35" r="2.9" fill="#3b2200"/>',
      shock: '<circle cx="25" cy="33" r="4.4" fill="#fff" stroke="#3b2200" stroke-width="2"/><circle cx="39" cy="33" r="4.4" fill="#fff" stroke="#3b2200" stroke-width="2"/><circle cx="25" cy="33" r="1.6" fill="#3b2200"/><circle cx="39" cy="33" r="1.6" fill="#3b2200"/>' }[mood] || '';
    const mouth = { happy: '<path d="M25 42q7 9 14 0z" fill="#b3261e" stroke="#3b2200" stroke-width="1.6" stroke-linejoin="round"/>',
      sad: '<path d="M26 47q6-6 12 0" stroke="#3b2200" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
      angry: '<path d="M23 49q9-8 18 0" stroke="#3b2200" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M27 46l2 3M32 45l0 3M37 46l-2 3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
      shock: '<ellipse cx="32" cy="46" rx="4" ry="5" fill="#7a1a12" stroke="#3b2200" stroke-width="1.6"/>' }[mood] || '';
    const extra = { angry: '<circle cx="32" cy="38" r="22" fill="#ff2a1a" opacity=".38"/><path d="M45 12q5 0 5 5M55 12q-5 0-5 5M45 22q5 0 5-5M55 22q-5 0-5-5" stroke="#e11d48" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      sad: '<circle cx="32" cy="38" r="22" fill="#3b82f6" opacity=".16"/><path class="tear" d="M21 38q-3.5 6 0 8.5q3.5-2.5 0-8.5z" fill="#7dd3fc" stroke="#0369a1" stroke-width="1"/><path class="tear t2" d="M43 38q-3.5 6 0 8.5q3.5-2.5 0-8.5z" fill="#7dd3fc" stroke="#0369a1" stroke-width="1"/>' }[mood] || '';
    const c = COSTUMES[costumeIdx()];
    const acc = { hat: '<path d="M16 22q16-22 32 0z" fill="#e0342b" stroke="#7a1410" stroke-width="1.5"/><rect x="14" y="21" width="36" height="4" rx="2" fill="#7a1410"/>',
      glass: '<circle cx="25" cy="33" r="7" fill="none" stroke="#223" stroke-width="2"/><circle cx="39" cy="33" r="7" fill="none" stroke="#223" stroke-width="2"/><path d="M32 33h0" stroke="#223" stroke-width="2"/>',
      bow: '<path d="M32 54l-9-5v10zM32 54l9-5v10z" fill="#d946ef" stroke="#6b1a7a" stroke-width="1.3"/><circle cx="32" cy="54" r="2.5" fill="#6b1a7a"/>',
      crown: '<path d="M18 22l4-12 6 7 4-9 4 9 6-7 4 12z" fill="#ffd23f" stroke="#b8860b" stroke-width="1.5"/>',
      band: '<rect x="12" y="23" width="40" height="5" rx="2" fill="#e0342b"/><path d="M52 25l8-4M52 26l8 5" stroke="#e0342b" stroke-width="3" stroke-linecap="round"/>',
      star: '<path d="M32 4l3 7 8 .7-6 5 2 8-7-4-7 4 2-8-6-5 8-.7z" fill="#ffd23f" stroke="#b8860b" stroke-width="1.2"/>' }[c] || '';
    return `<svg viewBox="0 0 64 64"><circle cx="32" cy="38" r="22" fill="#ffd23f" stroke="#b8860b" stroke-width="2.5"/>`
      + `<circle cx="32" cy="38" r="22" fill="url(#none)"/><ellipse cx="22" cy="26" rx="7" ry="4" fill="#fff" opacity=".45"/>`
      + `<path d="M26 17h12v-5a6 6 0 0 0-12 0z" fill="${glow || '#ff8c1a'}" stroke="#7a4a00" stroke-width="1.5"/>`
      + `<circle cx="20" cy="41" r="3.2" fill="#ff8a8a" opacity=".7"/><circle cx="44" cy="41" r="3.2" fill="#ff8a8a" opacity=".7"/>${extra}${eyes}${mouth}${acc}</svg>`;
  }
  const mascot = (mood, glow) => `<span class="fx-m">${mascotSVG(mood, glow)}</span>`;
  FX.mascotSVG = mascotSVG; FX.outcomeClass = null;

  /* ---------- 称号 (実績) ---------- */
  const ACH_KEY = 'pekari-ach-v1';
  const ACHS = [
    ['first_peka', '初ペカ', '初めてGOGOランプが光った'], ['first_at', '初AT', 'はじめてATに突入した'],
    ['chain3', '連チャン3回', '32G以内の再当選を3連続'], ['chain5', '連チャン5回', '32G以内の再当選を5連続'], ['chain10', '連チャン10回', '32G以内の再当選を10連続'],
    ['aura_rainbow', '虹オーラ', 'ボーナス中に虹のオーラを見た'], ['peka_rainbow', '虹ペカ', '虹色にペカった'], ['freeze', 'フリーズ', 'フリーズを体験した'],
    ['over_hint', '数字の気配', '222 / 444 / 456 / 666 のどれかが出た'], ['over1000', '1000枚突破', 'OVER 1000 を見た'],
    ['combo20', 'コンボ20', 'ベル20連続'], ['combo50', 'コンボ50', 'ベル50連続'], ['mission3', 'ミッション3回', 'ミッションを3回達成'],
    ['step_clear', 'ステップ完走', 'ステップアップを最後まで進めた'], ['gyakuten', '大逆転', 'ガッカリのあとに逆転した'], ['gyakuten5', '逆転の達人', '逆転を5回経験した'],
    ['games1000', '1000G回した', '通算1000G'], ['games5000', '5000G回した', '通算5000G'], ['retro', 'レトロな画面', 'モノクロ画面に出会った'],
    ['whisper', '謎のささやき', '小さな声が聞こえた'], ['cutin_gold', '金カットイン', '金色のカットインを見た'], ['summit', '山頂', 'マウンテンの山頂に着いた'],
    ['heaven', '天国', 'HEAVEN に入った'], ['death', '悪魔', 'DEATH に入った'], ['strong_chance', '強チャンス目', '強チャンス目に出会った'], ['rare_combo', 'Wレア', 'チェリーやスイカを連続で引いた'],
    ['diff1000', '差枚+1000', '差枚が+1000枚に到達'], ['diff5000', '差枚+5000', '差枚が+5000枚に到達'], ['mujun', '矛盾演出', '強い予告と弱い予告が食い違った'], ['fake_rush', 'どんでん返し', 'ボーナス終了と思いきやATだった']
  ];
  FX.ACHS = ACHS;
  let ach = { got: {}, cnt: {} };
  try { const o = JSON.parse(localStorage.getItem(ACH_KEY) || '{}'); if (o.got) ach = { got: o.got, cnt: o.cnt || {} }; } catch (e) { /* 初期値 */ }
  const saveAch = () => { try { localStorage.setItem(ACH_KEY, JSON.stringify(ach)); } catch (e) { /* 無視 */ } };
  function unlock(id) {
    if (window.TRO && ACHS.some(x => x[0] === id)) TRO.seen('ach:' + id);
    if (ach.got[id]) return;
    const a = ACHS.find(x => x[0] === id);
    if (!a) return;
    ach.got[id] = Date.now();
    saveAch();
    // 称号の通知は液晶に出さない(称号・トロフィー画面で確認)
  }
  function count(id, n, target, unlockId) {
    ach.cnt[id] = (ach.cnt[id] || 0) + n;
    saveAch();
    if (ach.cnt[id] >= target) unlock(unlockId);
  }

  /* ---------- 演出の出現率 ---------- */
  function outcomeClass(kind) {
    if (kind === 'lose' && pendingBonusType === 'BIG' && !isPekared) return 'hit';
    if (kind === 'cherryS' || kind === 'melon' || kind === 'chanceS') return 'rare';
    if (kind === 'cherryW' || kind === 'melonW' || kind === 'chanceW') return 'mid';
    return 'none';
  }
  FX.outcomeClass = outcomeClass; FX.st = st;
  const PV_RATE = { hit: 0.62, rare: 0.4, mid: 0.2, none: 0.09 };
  const PV_SUCCESS = { hit: 0.72, rare: 0.5, mid: 0.3, none: 0.1 };

  /* ---------- 予告: カットイン ---------- */
  function cutinColor(cls, success, allowBlue = true) {
    const w = success ? { hit: [10, 40, 50], rare: [25, 45, 30], mid: [45, 40, 15], none: [60, 32, 8] }[cls]
      : { hit: [70, 25, 5], rare: [70, 25, 5], mid: [75, 22, 3], none: [80, 18, 2] }[cls];
    return ['blue', 'red', 'gold'][weightedPick(allowBlue ? w : [0, w[1], w[2]])];
  }
  function showCutin(color, success, done) {
    const TEXT = { blue: 'REPLAY', red: 'PEKA CHANCE', gold: 'PEKA!!', rainbow: 'GOGO!!', yellow: 'BELL', green: 'MELON', white: '??' };
    const el = put(`fx-cutin c-${color}`, `${mascot(success ? 'happy' : 'shock')}<b>${TEXT[color]}</b>`, 1550);
    if (color === 'gold' || color === 'rainbow') { unlock('cutin_gold'); triggerFlash(); sndUp(6); }
    else if (color === 'red') sndUp(4); else sndUp(3);
    if (!success) wait(900, () => {
      el.classList.add('fail'); el.querySelector('.fx-m').innerHTML = mascotSVG('sad');
      el.querySelector('b').textContent = '...'; sndDown();
    });
    FX.hold(1550);
    wait(1500, done);
  }

  /* ---------- 予告: ステップアップ ---------- */
  function showStep(success, hit, done) {
    const L = hit ? 4 : (rnd() < 0.5 ? 3 : 4);
    const failAt = success ? -1 : 1 + Math.floor(rnd() * (L - 1));   // 途中で止まる段
    const el = put('fx-step', Array.from({ length: L }, (_, i) => `<i class="${i === L - 1 ? 'last' : ''}"></i>`).join(''), 3500);
    const dots = [...el.children];
    let i = 0;
    FX.hold(failAt >= 0 ? 300 + (failAt + 1) * 620 + 1000 : 300 + L * 620 + 700 + 1700);
    const next = () => {
      if (i === failAt) { dots[i].classList.add('ng'); sndDown(); wait(900, done); return; }
      dots[i].classList.add('on'); snd([523 * Math.pow(1.19, i)], 0, 0.2, 'triangle', 0.14);
      i++;
      if (i >= L) {
        unlock('step_clear'); triggerFlash(); sndUp(5);
        wait(700, () => { showCutin(hit ? 'gold' : 'white', true, done); });
        return;
      }
      wait(620, next);
    };
    wait(300, next);
  }

  /* ---------- 予告: 会話 ---------- */
  const TALK = {
    good: ['なんだか、光りそうな気がする', 'ちょっとドキドキしてきた', '今のはいい感じだったかも', 'そろそろ来るかもしれない'],
    calm: ['今日はどんな日になるかな', 'ゆっくりいこう', 'リールがよく見えるね'],
    bad: ['うーん、もう少し先かも', '今回は静かだったね']
  };
  function showTalk(success, done) {
    const sad = !success && rnd() < 0.55;
    put(`fx-talk${sad ? ' sad' : ''}`, `${mascot(sad ? 'sad' : 'happy')}<span class="tk">${pick(success ? TALK.good : sad ? TALK.bad : TALK.calm)}</span>`, 2300);
    snd(success ? [784, 988] : [440, 392], 0.12, 0.2, 'sine', 0.1);
    FX.hold(2200);
    wait(2100, done);
  }

  /* ---------- 予告: 暗転 ---------- */
  function showDark(success, done) {
    put('fx-dark', '', 1550);
    snd([98], 0, 1.2, 'sine', 0.16);
    FX.hold(1600);
    wait(1250, () => {
      if (success) { put('fx-flash', '', 520); triggerFlash(); sndUp(5); } else { snd([262, 220], 0.12, 0.3, 'sine', 0.08); }
      wait(300, done);
    });
  }

  /* ---------- 予告: 矛盾演出 (強い予告と弱い予告が食い違う。結果は通常の抽選どおり) ---------- */
  function showContradict(hit, done) {
    unlock('mujun');
    if (hit && rnd() < 0.6) st.rev = 'rev';
    // 矛盾は文字を出さず、不可解な音だけで感じさせる
    const end = () => { snd([466, 392, 466, 311, 277], 0.11, 0.32, 'sawtooth', 0.08); FX.hold(1400); wait(1250, done); };
    const sadTalk = () => { FX.hold(1900); wait(1800, end); };   // 矛盾の台詞は出さず、間だけ置く
    const v = Math.floor(rnd() * 4);
    if (v === 0) {            // 金カットイン → 直後に暗転・静寂
      showCutin(hit ? 'gold' : 'white', true, () => { put('fx-dark', '', 1300); snd([98], 0, 1, 'sine', 0.16); FX.hold(1300); wait(1250, () => sadTalk('おかしいな、静かだ')); });
    } else if (v === 1) {     // 青カットインが崩れる → 突然のフラッシュ
      showCutin('white', false, () => { put('fx-flash', '', 520); triggerFlash(); sndUp(5); FX.hold(600); wait(550, end); });
    } else if (v === 2) {     // ステップ完走 → 会話は弱気
      showStep(true, hit, () => sadTalk('光りそうで光らない'));
    } else {                  // 消灯焦らし風: グローと暗転が同時
      cab.classList.add('fx-glow'); FX.hold(1700);
      put('fx-dark', '', 1400); snd([130, 98], 0, 0.8, 'sine', 0.15);
      wait(1500, () => { cab.classList.remove('fx-glow'); end(); });
    }
  }

  /* ---------- 予告: 通常時の追加演出 (パレード / ボタン / ルーレット / タイマー / 画面割れ / 雨 / コイン / メーター / おみくじ / ランプ) ---------- */
  function pvRun(name, html, T, tR, success, text, done) {
    const el = put(`fx-pv fx-pv-${name}`, `${html}<b class="pv-res"></b>`, T + 300);
    FX.hold(T + 150);
    wait(tR, () => {
      el.classList.add(success ? 'ok' : 'ng');
      el.querySelector('.pv-res').textContent = text;
      if (success) { triggerFlash(); sndUp(4); } else sndDown();
    });
    wait(T, done);
    return el;
  }
  /* 矛盾の色: 通常時の黄(ベル)のうち約4%だけ緑で止まる（緑=スイカの約束を破る矛盾。ボーナス確定のような不可解さ） */
  function mismatchColor() { return pvColor; }
  function mujunSound() { snd([466, 392, 466, 311, 277], 0.11, 0.32, 'sawtooth', 0.08); flashMarquee('hot', 2200); }
  let pvColor = null;   // 通常時の予告の色 (結果から決まる)。AT中など結果が無いときは null
  const PV = {
    parade(s, d) {
      const n = 5;
      pvRun('parade', Array.from({ length: n }, (_, i) => `<span class="pv-m${s && i === n - 1 ? ' big' : ''}" style="--d:${(i * 0.2).toFixed(2)}s">${mascotSVG(s && i === n - 1 ? 'happy' : 'happy', s && i === n - 1 ? '#ffd700' : '')}</span>`).join(''), 2400, 1600, s, '', d);
      snd([392, 440, 494, 523], 0.2, 0.15, 'square', 0.06);
    },
    button(s, d) {
      // タップで押せる。押さなくても1.4秒で自動で押される
      const T = 2800;
      const el = put('fx-pv fx-pv-button', '<i class="pv-btn">PUSH</i><i class="pv-tap">TAP!</i><b class="pv-res"></b>', T + 300);
      FX.hold(T + 150);
      let phase = 0, fin = false;
      const finish = () => { if (!fin) { fin = true; d(); } };
      const reveal = () => {
        if (phase > 1) return;
        phase = 2;
        el.classList.add(s ? 'ok' : 'ng');
        el.querySelector('.pv-res').textContent = s ? '' : '...';
        if (s) { triggerFlash(); sndUp(4); } else sndDown();
        wait(900, finish);
      };
      const press = () => { if (phase) return; phase = 1; el.classList.add('press'); snd([220], 0, 0.15, 'square', 0.12); wait(380, reveal); };
      const b = el.querySelector('.pv-btn');
      b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); press(); });
      wait(1400, press);
      wait(T, finish);
    },
    roulette(s, d) {
      // 通常時は結果の色で止まる。ごくまれに黄(ベル)の結果なのに緑で止まる（矛盾）
      const LBL = { blue: '青', green: '緑', red: '赤', gold: '金', yellow: '黄', rainbow: '虹', white: '白' };
      const SET = pvColor ? Object.keys(LBL) : ['blue', 'green', 'red', 'gold'];
      const land = pvColor ? mismatchColor() : null;
      const fin = pvColor ? SET.indexOf(land) : (s ? pick([2, 3]) : pick([0, 1]));
      const el = pvRun('roulette', `<i class="pv-roul" data-c="${SET[0]}">${LBL[SET[0]]}</i>`, 2100, 1300, s, '', d);
      const c = el.querySelector('.pv-roul');
      let k = 0;
      const iv = setInterval(() => { k++; const j = k % SET.length; c.textContent = LBL[SET[j]]; c.dataset.c = SET[j]; snd([300 + j * 80], 0, 0.04, 'square', 0.05); }, 90);
      wait(1250, () => { clearInterval(iv); c.textContent = LBL[SET[fin]]; c.dataset.c = SET[fin]; if (land !== pvColor) mujunSound(); });
    },
    timer(s, d) {
      const el = pvRun('timer', '<i class="pv-num">3</i>', 2000, 1500, s, s ? 'GET!' : '0', d);
      const n = el.querySelector('.pv-num');
      [2, 1].forEach((v, i) => wait(450 * (i + 1), () => { n.textContent = v; snd([440 + (2 - v) * 110], 0, 0.1, 'square', 0.08); }));
      wait(1350, () => { n.textContent = 0; });
    },
    crack(s, d) {
      pvRun('crack', '<svg viewBox="0 0 100 100" class="pv-cr"><path d="M50 0L46 22 56 36 44 54 54 70 48 100M46 22L26 30M56 36L78 32M44 54L22 62M54 70L76 78"/></svg>', 2100, 1200, s, s ? 'BREAK!' : '', d);
      wait(500, () => snd([150, 120], 0, 0.2, 'sawtooth', 0.1));
    },
    rain(s, d) {
      // 虹は大きな当たりの色。通常時は虹が出るのは大きな当たりのときだけ
      const rbw = pvColor === null || pvColor === 'rainbow' ? '<i class="pv-rbw"></i>' : '';
      pvRun('rain', `<i class="pv-rain"></i>${rbw}`, 2300, 1300, s, '', d);
      snd([196, 175], 0.3, 0.5, 'sine', 0.06);
    },
    coin(s, d) {
      const LBL = { blue: '青', red: '赤', gold: '金', green: '緑', yellow: '黄', rainbow: '虹', white: '白' };
      let labels = ['blue', 'red', 'gold'], slot = s ? pick([1, 2]) : 0, land = null;
      if (pvColor) {   // 通常時: 光る枠は結果の色。ほかの枠は別の色（約束にならない）
        land = mismatchColor();
        const others = Object.keys(LBL).filter(c => c !== land).sort(() => rnd() - 0.5).slice(0, 2);
        labels = [land, ...others].sort(() => rnd() - 0.5);
        slot = labels.indexOf(land);
      }
      const html = labels.map(c => `<em data-c="${c}">${LBL[c]}</em>`).join('');
      const el = pvRun('coin', `<i class="pv-coin"></i><span class="pv-slots">${html}</span>`, 2100, 1300, s, '', d);
      el.style.setProperty('--x', ((slot - 1) * 74) + 'px');
      wait(1250, () => { const e = el.querySelectorAll('.pv-slots em')[slot]; if (e) e.classList.add('hit'); snd([880, 1175], 0, 0.15, 'triangle', 0.1); if (land !== pvColor) mujunSound(); });
    },
    meter(s, d) {
      const L = s ? 3 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 2);
      const el = pvRun('meter', '<span class="pv-mt"><i></i><i></i><i></i><i></i></span>', 1500 + L * 350, 400 + L * 350, s, s ? 'MAX' : '', d);
      const segs = el.querySelectorAll('.pv-mt i');
      for (let i = 0; i < L; i++) wait(300 + i * 350, () => { segs[i].classList.add('on'); snd([392 * Math.pow(1.19, i)], 0, 0.15, 'triangle', 0.1); });
    },
    omikuji(s, d) {
      const text = s ? pick(['大吉', '大吉', '中吉']) : pick(['小吉', '末吉', '凶']);
      pvRun('omikuji', '<i class="pv-box"></i>', 2200, 1300, s, text, d);
      snd([200, 220, 200, 220], 0.12, 0.1, 'square', 0.06);
    },
    lamp(s, d) {
      const el = pvRun('lamp', '<span class="pv-lp"><i></i><i></i><i></i><i></i><i></i></span>', 2000, 1400, s, s ? 'PEKA' : '', d);
      const ls = [...el.querySelectorAll('.pv-lp i')];
      let k = 0;
      const iv = setInterval(() => { ls.forEach((x, i) => x.classList.toggle('on', i === k % 5)); k++; snd([500 + (k % 5) * 90], 0, 0.04, 'square', 0.05); }, 110);
      wait(1300, () => { clearInterval(iv); const n = s ? 5 : 2 + Math.floor(rnd() * 2); ls.forEach((x, i) => x.classList.toggle('on', i < n)); });
    }
  };
  delete PV.rain; delete PV.crack;   // 雨・ひび割れは液晶の「天候ステップアップ」に統合
  delete PV.button;   // PUSHは液晶側の「PUSH」(第2停止から押せる)に統合
  const PV_KEYS = Object.keys(PV); FX.PV = PV;

  /* ---------- 予告を決めて実行 ---------- */
  /* 色の予告: 色が出たら結果はそれで確定 (青=リプレイ / 黄=ベル / 緑=スイカ / 赤=チェリー / 金=当たり / 虹=大きな当たり)。白は何も約束しない */
  function cutinColorFor(kind) {
    if (kind === 'replay') return 'blue';
    if (String(kind).startsWith('bell')) return 'yellow';
    if (kind === 'melon' || kind === 'melonW') return 'green';
    if (kind === 'cherryS' || kind === 'cherryW') return 'red';
    if (kind === 'lose' && pendingBonusType === 'BIG' && !isPekared) return pendingTierIndex >= 4 ? 'rainbow' : 'gold';
    return 'white';
  }
  function playPreview(cls, hit, done, kind) {
    pvColor = kind === undefined ? null : cutinColorFor(kind);
    // 上部文字: 期待度が弱い予告は青、強い予告は赤（色は期待度だけ。役の約束にはしない）
    flashMarquee(cls === 'mid' || cls === 'none' ? 'chance' : 'hot', 1800);
    const success = hit ? rnd() < PV_SUCCESS.hit : rnd() < PV_SUCCESS[cls];
    const type = pick(['cutin', 'cutin', 'step', 'talk', 'dark', ...PV_KEYS, ...PV_KEYS]);
    // 当選なのに失敗の見せ方 → ガッカリのあとに逆転
    if (hit && !success) st.rev = 'rev';
    // 青（CHANCEカットイン）は必ずリプレイ。通常時は結果がリプレイのときだけ青を出す（AT中など kind 未指定は従来どおり）
    if (type === 'cutin') {
      if (kind === undefined) showCutin(cutinColor(cls, success), success, done);   // AT中など（従来どおり）
      else { const c = cutinColorFor(kind); showCutin(c, c === 'white' ? success : true, done); }
    }
    else if (type === 'step') showStep(success, hit, done);
    else if (PV[type]) PV[type](success, done);
    else if (type === 'talk') showTalk(success, done);
    else showDark(success, done);
  }

  /* ---------- runRole の包み: 予告 / 疑似連 / リール中の演出 / ゲーム後の処理 ---------- */
  const _runRole = runRole;
  const _omenThen = omenThen;
  omenThen = function (kind, go) { if (st.noOmen) { st.noOmen = false; go(); return; } _omenThen(kind, go); };

  runRole = function (kind, done, navi) {
    if (isDebugRun) return _runRole(kind, done, navi);
    // ドンドンドン!: 当選なら揺れが多い (通常/AT)。揺れ終わったら同じ役でもう一度ここに戻る
    if (st.donDone) { st.donDone = false; FX.don = false; }
    else if (!bonusRun) {
      const hit0 = outcomeClass(kind) === 'hit';
      const n = weightedPick(hit0 ? [78, 8, 6, 8] : [97, 2, 0.8, 0.2]);
      if (n > 0) { st.donDone = true; FX.don = true; donShake(n, () => runRole(kind, done, navi)); return; }
    }
    const inAT = atGames > 0 || atEnding;
    const inBonus = !!bonusRun;
    const cls = outcomeClass(kind);
    const hit = cls === 'hit';
    st.rev = null; st.saki = null; st.pseudo = 0;
    if (!inBonus) cumGames();
    const after = res => { gameAfter(kind, cls, inAT, inBonus); if (st.pseudoN && kind === 'lose' && !hit && window.LCDX) { LCDX.miss(); } st.pseudoN = 0; done(res); };
    const go = () => {
      if (!inBonus) {
        // 先ペカ / 疑似連 / 消灯焦らし / 全回転風のグロー
        if (hit) {
          if (!st.rev && rnd() < 0.18 * freqMul()) st.saki = 'real';
          if (!st.rev && rnd() < 0.22 * freqMul()) st.rev = 'tease';
        } else if (kind === 'lose' && rnd() < 0.012 * freqMul()) st.saki = 'fake';
        if (kind === 'lose' && !inAT) {
          const cz = !hit && window.czGameNow && (czLeft > 0 || window.czTimedOut);   // CZ中の外れゲーム
          const p = (hit ? 0.2 : cz ? 0.12 : 0.03) * freqMul();
          if (rnd() < p) {
            st.pseudo = rnd() < 0.4 ? 2 : 1; st.pseudoN = st.pseudo;
            if (cz) { czLeft = window.czTimedOut ? 1 : czLeft + 1; window.czTimedOut = false; window.czHoldNow = true; window.czRescued = Date.now(); if (window.onCzHold) window.onCzHold(); }   // 連続演出中はCZのゲーム数を消化しない(HOLD)
          }
        }
        if (!inAT && (hit ? rnd() < 0.25 : rnd() < 0.015) * 1) cab.classList.add('fx-glow');
      }
      _runRole(kind, res => {
        cab.classList.remove('fx-glow');
        if (st.pseudo > 0 && kind === 'lose') {
          st.pseudo--;
          showBanner(`連続演出 ${st.pseudoN - st.pseudo}/${st.pseudoN + 1}`, '', st.pseudoN - st.pseudo >= 2 ? 'red' : 'blue');
          if (window.LCDX) LCDX.story(st.pseudoN - st.pseudo, st.pseudoN + 1, false);
          FX.hold(1000);
          snd([660, 880, 1175], 0.07, 0.18, 'square', 0.08);
          wait(850, () => { st.noOmen = true; reRun(kind, after, navi); });
          return;
        }
        after(res);
      }, navi);
    };
    const reRun = (k, d, n) => _runRole(k, res => {
      if (st.pseudo > 0 && k === 'lose') {
        st.pseudo--; showBanner(`連続演出 ${st.pseudoN - st.pseudo}/${st.pseudoN + 1}`, '', 'red'); if (window.LCDX) LCDX.story(st.pseudoN - st.pseudo, st.pseudoN + 1, false); FX.hold(1000);
        wait(850, () => { st.noOmen = true; reRun(k, d, n); });
        return;
      }
      cab.classList.remove('fx-glow'); d(res);
    }, n);
    // ハズレ矛盾 = 当選確定のサイン (確定後の3〜5Gの間と、ランプが光るゲームに出る。ガセはなし)
    if (!inBonus && !inAT && kind === 'lose' && (zenchoLeft > 0 || hit) && rnd() < (zenchoLeft > 0 ? 0.5 : 0.2) * Math.max(0.5, freqMul())) { showContradict(hit, go); return; }
    // 予告
    if (!inBonus && !inAT && !isDebugRun) {
      if (rnd() < PV_RATE[cls] * freqMul()) { playPreview(cls, hit, go, kind); return; }
    } else if (!inBonus && inAT && hit) {
      if (rnd() < 0.5 * freqMul()) { playPreview('hit', true, go); return; }
    }
    go();
  };

  /* 先ペカ: 左リールが止まった瞬間にサイドランプ */
  const _landCol = landCol;
  landCol = function (col) {
    _landCol(col);
    if (st.saki) {
      const real = st.saki === 'real';
      st.saki = null;
      if (real) sideLampShow('early');
      showBanner(real ? 'PEKA?!' : 'PEKA...?', '', real ? 'red' : 'blue');
      if (!real) wait(600, () => sndDown());
      else sndUp(4);
    }
  };

  /* ---------- バナー ---------- */
  /* 上部のペカり君文字の色変化（チャンス=青 / 激熱=赤。こっそり一瞬だけ） */
  function flashMarquee(cls, ms) {
    const m = document.querySelector('.cab-marquee');
    if (!m) return;
    m.classList.remove('chance', 'hot');
    void m.offsetWidth;
    m.classList.add(cls);
    clearTimeout(m._fxT);
    m._fxT = setTimeout(() => m.classList.remove(cls), ms);
  }
  window.FXBanner = (...a) => showBanner(...a);   // 本体（サンド目など）から大きなバナーを出す
  function showBanner(text, sub, color, big, ms) {
    if (window.TRO) {
      const k = text === '連続演出' ? 'pseudo' : /^PEKA(\.\.\.)?\?/.test(text) ? 'saki' : text === '矛盾' ? 'mujun' : text === 'W RARE!' ? 'wrare' : /^\+\d+$/.test(text) ? 'milestone' : null;
      if (k) TRO.seen(k);
    }
    if (color === 'red' && big) flashMarquee('hot', 2200);
    return put(`fx-banner ${color || ''}${big ? ' big' : ''}`, `${text}${sub ? `<small>${sub}</small>` : ''}`, ms || 1750);
  }

  /* ---------- ペカり: 逆転 / 消灯焦らし / 音のバリエーション ---------- */
  const _triggerPekari = triggerPekari;
  triggerPekari = function (forceFx) {
    const mode = st.rev;
    st.rev = null;
    // 連チャン数
    if (pekaSpecial === 'early') st.chain++; else st.chain = 1;
    unlock('first_peka');
    if (st.chain >= 3) unlock('chain3');
    if (st.chain >= 5) unlock('chain5');
    if (st.chain >= 10) unlock('chain10');
    if (mode === 'rev' && !isDebugRun) {
      if (window.TRO) TRO.seen('rev');
      unlock('gyakuten'); count('rev', 1, 5, 'gyakuten5');
      reelLocked = true;
      FX.hold(3600);
      cab.classList.add('fx-gloom');
      showBanner('...', 'ざんねん', 'blue', false, 1500);
      sndDown();
      wait(1500, () => {
        cab.classList.remove('fx-gloom');
        put('fx-dark', '', 800);
        cab.classList.add('fx-rumble');
        snd([65], 0, 1.0, 'sine', 0.25);
      });
      wait(2200, () => {
        cab.classList.remove('fx-rumble');
        put('fx-flash', '', 520);
        showBanner('PEKA!!', '', 'red', true, 1700);
        tripleFlash(); shakeMain(600); burstParticles('mega', 90); sndBig();
        _triggerPekari(forceFx || (rnd() < 0.5 ? 'rainbow' : undefined));
      });
      return;
    }
    if (mode === 'tease' && !isDebugRun) {
      if (window.TRO) TRO.seen('tease');
      reelLocked = true;
      FX.hold(1900);
      gogoBox.className = `${GOGO_BASE} fx-dark`;
      snd([110, 110, 110], 0.4, 0.3, 'sine', 0.2);
      wait(1300, () => { _triggerPekari(forceFx); });
      return;
    }
    _triggerPekari(forceFx);
  };
  const _lightLamp = lightLamp;
  lightLamp = function (extra) {
    _lightLamp(extra);
    const n = Math.max(1, pendingDisplayIndex + 1);
    snd(Array.from({ length: n + 2 }, (_, i) => 659 * Math.pow(1.122, i * 1.5)), 0.06, 0.25, 'triangle', 0.1, 0.15);
    if (extra === 'peka-rainbow') unlock('peka_rainbow');
  };

  /* ---------- フリーズ ---------- */
  const _freezeToZone = freezeToZone;
  freezeToZone = function (debug) {
    unlock('freeze');
    cab.classList.add('fx-noise');
    wait(1100, () => cab.classList.remove('fx-noise'));
    showBanner('...!?', 'FREEZE', 'red', true, 1600);
    st.fromFreeze = true;
    _freezeToZone(debug);
  };

  /* ---------- ボーナス: ゾーン前カウントダウン / 山登り / 判定カウントダウン ---------- */
  const mount = document.createElement('div');
  mount.className = 'fx-mount';
  mount.style.display = 'none';
  mount.innerHTML = '<svg viewBox="0 0 120 38"><path class="mt-body" d="M2 36L34 10l12 10 18-16 22 20 10-6 22 18z"/><path class="mt-snow" d="M57 9l7-5 6 6-6-1-3 3z"/><circle class="mt-dot" cx="6" cy="34" r="3.6"/></svg>';
  layer.appendChild(mount);
  const MOUNT_PTS = [[6, 34], [34, 12], [46, 20], [64, 6]];
  function mountUpdate(b) {
    if (!b || !b.zone) { mount.style.display = 'none'; mount.classList.remove('top'); return; }
    mount.style.display = '';
    const r = Math.min(1, b.played / Math.max(1, b.games));
    const seg = r * 3, i = Math.min(2, Math.floor(seg)), f = seg - i;
    const x = MOUNT_PTS[i][0] + (MOUNT_PTS[i + 1][0] - MOUNT_PTS[i][0]) * f;
    const y = MOUNT_PTS[i][1] + (MOUNT_PTS[i + 1][1] - MOUNT_PTS[i][1]) * f;
    const dot = mount.querySelector('.mt-dot');
    dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    mount.classList.toggle('top', r >= 1);
  }
  const _beginBonus = beginBonus;
  beginBonus = function (plan) {
    st.combo = 0; hideCombo();
    if (!plan.zone) unlock('first_peka');
    _beginBonus(plan);
  };
  /* PEKA! PEKA! MOUNTAIN! の最初のゲームの前に、カウントダウン (レバー1回目をここで受ける) */
  const _bonusGame = bonusGame;
  bonusGame = function () {
    const b = bonusRun;
    if (b && b.zone && b.played === 0 && !b.intro && !b.debug && !isDebugRun) {
      b.intro = true;
      const fz = st.fromFreeze; st.fromFreeze = false;
      FX.hold(1300 + 3 * 750 + 200);
      showBanner('MOUNTAIN!', fz ? 'FREEZE BONUS' : 'ZONE START', 'blue', false, 1500);
      [3, 2, 1].forEach((n, i) => wait(1300 + i * 750, () => { put('fx-count warn', String(n), 800); snd([440 + n * 110], 0, 0.2, 'square', 0.12); }));
      wait(1300 + 3 * 750 + 100, () => { _bonusGame(); });
      return;
    }
    _bonusGame();
  };
  const _finishZone = finishZone;
  finishZone = function (b) {
    mountUpdate(Object.assign({}, b, { played: b.games }));
    unlock('summit');
    showBanner('SUMMIT!', `ZONE +${b.zoneG}G`, '', true, 1800);
    burstParticles('mega', 80); tripleFlash(); sndBig();
    st.keepMount = true;
    wait(2200, () => { st.keepMount = false; mountUpdate(null); });
    _finishZone(b);
  };
  const _finishBonus = finishBonus;
  finishBonus = function () {
    const b = bonusRun;
    _finishBonus();
    if (b && !b.zone && !b.debug) {
      [3, 2, 1].forEach((n, i) => wait(300 + i * 750, () => { put('fx-count warn', String(n), 800); snd([330 + n * 80], 0, 0.15, 'square', 0.1); }));
    }
  };
  /* ボーナス終了と思いきや…の逆転 (AT突入の前にひと芝居) */
  const _startAT = startAT;
  startAT = function (games, typeId) {
    if (!isDebugRun && games === undefined && rnd() < 0.28 * freqMul() && !st.fakeRush) {
      st.fakeRush = true;
      isRushing = true;
      FX.hold(3000);
      showBanner('BONUS END', '', 'blue', false, 1400);
      cab.classList.add('fx-gloom');
      sndDown();
      wait(1500, () => {
        cab.classList.remove('fx-gloom');
        put('fx-dark', '', 600);
      });
      wait(2100, () => {
        put('fx-flash', '', 520);
        showBanner('いや!!', '', 'red', true, 900);
        sndBig();
        unlock('fake_rush'); unlock('gyakuten'); count('rev', 1, 5, 'gyakuten5');
        st.fakeRush = false;
        isRushing = false;
        _startAT(games, typeId);
      });
      return;
    }
    unlock('first_at');
    _startAT(games, typeId);
    if (atType === 1) unlock('heaven');
    if (atType === 2) unlock('death');
  };

  /* ---------- PUSH: ガッカリ表示のあと急上昇 ---------- */
  const _pushReveal = pushReveal;
  pushReveal = function (text, premium, onDone) {
    const num = parseInt(String(text).replace(/[^0-9]/g, ''), 10) || 0;
    if (num >= 50 && !isDebugRun && rnd() < 0.5 * freqMul()) {
      isPushing = true;
      const decoy = `+${pick([5, 10, 10, 20])}G`;
      pushResult.textContent = decoy;
      pushOverlay.className = 'push-overlay show waiting';
      snd([988, 1319], 0.09, 0.2, 'triangle', 0.14);
      const handler = () => {
        pushBtn.removeEventListener('click', handler);
        pushOverlay.className = 'push-overlay show revealed';
        playPayoutSound(2);
        triggerFlash();
        wait(850, () => {
          // 急上昇
          pushResult.textContent = text;
          pushOverlay.className = 'push-overlay show revealed premium';
          playPayoutSound(6); playPayoutFanfare(8); tripleFlash(); burstParticles('gold', 100);
          showBanner('UP!!', '', 'red', true, 1500);
          unlock('gyakuten'); count('rev', 1, 5, 'gyakuten5');
        });
        wait(850 + 1900, () => { pushOverlay.className = 'push-overlay'; isPushing = false; if (onDone) onDone(); });
      };
      pushBtn.addEventListener('click', handler);
      return;
    }
    _pushReveal(text, premium, onDone);
  };

  /* ---------- コンボ ---------- */
  const comboEl = document.createElement('div');
  comboEl.className = 'fx-combo';
  comboEl.style.display = 'none';
  layer.appendChild(comboEl);
  function hideCombo() { comboEl.style.display = 'none'; }
  function bumpCombo() {
    st.combo++;
    if (st.combo > st.bestCombo) st.bestCombo = st.combo;
    if (st.combo < 2) return;
    comboEl.style.display = '';
    comboEl.className = 'fx-combo' + (st.combo >= 20 ? ' hot' : '');
    comboEl.innerHTML = `<b>${st.combo}</b><span>COMBO</span>`;
    void comboEl.offsetWidth;
    comboEl.classList.add('pop');
    if (st.combo >= 20) unlock('combo20');
    if (st.combo >= 50) unlock('combo50');
    if ([5, 10, 20, 30, 50, 80, 100].includes(st.combo)) {
      showBanner(`${st.combo} COMBO`, '', st.combo >= 20 ? 'red' : '', false, 1300);
      rainCoins(Math.min(60, 12 + st.combo)); sndUp(Math.min(7, 3 + (st.combo >= 20 ? 2 : 0)));
    }
  }
  function breakCombo() {
    if (st.combo >= 5) { comboEl.className = 'fx-combo break'; comboEl.innerHTML = `<b>${st.combo}</b><span>BREAK</span>`; wait(1300, hideCombo); } else hideCombo();
    st.combo = 0;
  }
  const _showBellResult = showBellResult;
  showBellResult = function (coins, inAT) {
    _showBellResult(coins, inAT);
    if (inAT) bumpCombo();
  };
  const _missEffect = missEffect;
  missEffect = function () { _missEffect(); if (atGames > 0 || bonusRun) breakCombo(); };

  /* ---------- ミッション (AT中・演出のみ) ---------- */
  const MISSIONS = [
    { id: 'bell5', text: n => `ベル 5回 (${n}G)`, g: 8, need: 5, ev: 'bell' },
    { id: 'rare1', text: n => `チェリーかスイカ (${n}G)`, g: 6, need: 1, ev: 'rare' },
    { id: 'bell3', text: n => `ベル 3回 (${n}G)`, g: 5, need: 3, ev: 'bell' }
  ];
  const missionEl = document.createElement('div');
  missionEl.className = 'fx-mission';
  missionEl.style.display = 'none';
  layer.appendChild(missionEl);
  function startMission() {
    const m = pick(MISSIONS);
    st.mission = { m, left: m.g, got: 0 };
    renderMission();
  }
  function renderMission() {
    const s = st.mission;
    if (!s) { missionEl.style.display = 'none'; return; }
    missionEl.style.display = '';
    missionEl.className = 'fx-mission';
    missionEl.textContent = `MISSION ${s.m.text(s.left)} ${s.got}/${s.m.need}`;
  }
  function missionEvent(ev) {
    const s = st.mission;
    if (!s) return;
    if (ev === s.m.ev) s.got++;
    s.left--;
    if (s.got >= s.m.need) {
      missionEl.className = 'fx-mission clear';
      missionEl.textContent = 'MISSION CLEAR';
      showBanner('MISSION CLEAR', '', '', false, 1500);
      rainCoins(30); sndUp(6);
      count('mission', 1, 3, 'mission3');
      st.mission = null;
      wait(1800, () => { if (atGames > 0) startMission(); else renderMission(); });
      return;
    }
    if (s.left <= 0) { st.mission = null; missionEl.style.display = 'none'; wait(600, () => { if (atGames > 0) startMission(); }); return; }
    renderMission();
  }

  /* ---------- ゲーム後の処理 (集計 / コンボ / ミッション / キリ番 / 隠し要素) ---------- */
  function cumGames() {
    if (cumulativeGames + 1 >= 1000) unlock('games1000');
    if (cumulativeGames + 1 >= 5000) unlock('games5000');
  }
  const isRepdigit = n => n >= 111 && /^(\d)\1+$/.test(String(n));
  function gameAfter(kind, cls, inAT, inBonus) {
    if (inBonus) return;
    // AT中のコンボ/ミッション
    if (inAT) {
      const bell = kind.startsWith('bell');
      if (!bell) breakCombo();
      if (!st.mission && atGames > 0) startMission();
      missionEvent(bell ? 'bell' : (cls === 'rare' || cls === 'mid') && !kind.startsWith('chance') ? 'rare' : 'other');
    } else {
      st.mission = null; renderMission();
      if (st.combo) { st.combo = 0; hideCombo(); }
    }
    // レアの連続 (チェリー/スイカが2回続けて成立)
    const rareNow = ['cherryW', 'cherryS', 'melonW', 'melon'].includes(kind);
    if (rareNow && st.lastRare) { showBanner('W RARE!', '', 'red', false, 1500); sndUp(5); rainCoins(24); unlock('rare_combo'); }
    st.lastRare = rareNow;
    // 小役のおしゃべり
    const say = { cherryW: ['いただきます', 'ナイス!'], cherryS: ['中段だよ!', 'これは大きいかも'], melonW: ['すいすい', 'ちょっと甘い'], melon: ['どーん!', 'これは…期待かも'], chanceW: ['おや?', 'ちょっと気になるね'], chanceS: ['これは…!', 'なにか来るかもしれない'] }[kind];
    if (say && rnd() < 0.5) put('fx-talk', `${mascot('shock')}<span class="tk">${pick(say)}</span>`, 2300);
    if (kind === 'chanceS') unlock('strong_chance');
    if (inAT) return;
    // キリ番 (ゾロ目 / 100G刻み)
    const g = totalGames;
    if (g !== st.lastShownG && (isRepdigit(g) || (g >= 100 && g % 100 === 0))) {
      st.lastShownG = g;
      showBanner(`${g} G`, isRepdigit(g) ? 'ゾロ目' : 'キリ番', '', false, 1700);
      snd([880, 1175, 1568], 0.08, 0.2, 'triangle', 0.1);
    }
    // 隠し要素
    if (st.retro > 0) { st.retro--; if (!st.retro) cab.classList.remove('fx-retro'); }
    else if (rnd() < 1 / 10000) { st.retro = 10; cab.classList.add('fx-retro'); unlock('retro'); showBanner('RETRO', '', '', false, 1500); }
    if (rnd() < 1 / 3000) { put('fx-whisper', 'ほほう…', 2700); unlock('whisper'); }
    // 示唆キャラ (設定が高いほど、ほんの少し出やすい)
    if (rnd() < (0.004 + 0.003 * Math.min(6, SETTINGS.level)) * freqMul()) put('fx-peek', mascot('happy'), 1550);
    // ゾーン前のざわつき (嘘もある)
    if (rnd() < 0.006 * freqMul()) { cab.classList.add('fx-noise'); wait(1200, () => cab.classList.remove('fx-noise')); }
  }

  /* ---------- OVER / オーラ / ゾーンロゴ ---------- */
  const _showOver = showOver;
  showOver = function (n) {
    _showOver(n);
    if ([222, 444, 456, 666].includes(n)) unlock('over_hint');
    if (n >= 1000) unlock('over1000');
  };
  const _setAura = setAura;
  setAura = function (level, pop) { _setAura(level, pop); if (level === 6) unlock('aura_rainbow'); };
  const _setZoneLogoLevel = setZoneLogoLevel;
  setZoneLogoLevel = function (lv) {
    _setZoneLogoLevel(lv);
    if (lv >= 1 && bonusRun && bonusRun.zone && bonusRun.played > 0) showBanner('UP!', ['', 'GREEN', 'GOLD', 'RAINBOW'][lv] || '', lv >= 3 ? 'redbow' : 'blue', false, 1300);
  };

  /* ---------- ATの残りG数: 増えたときはカウントアップ ---------- */
  let lastAt = 0;
  const _updateAT = updateAT;
  updateAT = function () {
    _updateAT();
    cab.classList.toggle('at-heaven', atGames > 0 && atType === 1);
    cab.classList.toggle('at-death', atGames > 0 && atType === 2);
    if (!st.keepMount) mountUpdate(bonusRun);
    if (!bonusRun && atGames - lastAt >= 10 && lastAt > 0) {
      const from = lastAt, to = atGames, t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / 700);
        atRemain.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    lastAt = atGames;
    if (atGames <= 0) { st.mission = null; renderMission(); st.combo = 0; hideCombo(); }
  };

  /* ---------- リザルトのひとこと ---------- */
  const _showAtResult = showAtResult;
  showAtResult = function (run) {
    _showAtResult(run);
    const row = document.getElementById('ar-hint-row');
    if (!row) return;
    let el = document.getElementById('ar-comment');
    if (!el) { el = document.createElement('div'); el.id = 'ar-comment'; el.className = 'ar-comment'; row.parentNode.insertBefore(el, row); }
    const gain = run.gain !== undefined ? run.gain : diffCoins - run.startDiff;
    let t;
    if (run.bonusOnly) t = pick(['まずは一息。次はどうだろう', 'ここからが本番かもしれない']);
    else if (gain >= 2000) t = pick(['すごい出玉だったね。夢みたいな時間だった', '今日はなにか持っている気がする']);
    else if (gain >= 800) t = pick(['いい波に乗れたかもしれない', 'この調子なら、まだ続くかも']);
    else if (gain >= 300) t = pick(['まずまずの流れ。次を楽しみに', 'ここからどう転ぶか、ちょっと楽しみ']);
    else t = pick(['少し静かだったね。そんな日もある', 'これから巻き返せるかもしれない']);
    el.textContent = t;
  };

  /* ---------- BGM (ボーナス/AT/ゾーンで鳴る簡易ループ) ---------- */
  const BGM = { mode: null, lvl: 0, step: 0, timer: null };
  const SCALE = [0, 2, 4, 7, 9];
  const note = (root, deg, oct = 0) => root * Math.pow(2, (SCALE[((deg % 5) + 5) % 5] + 12 * (Math.floor(deg / 5) + oct)) / 12);
  const ARP = [0, 2, 4, 2, 3, 2, 1, 2, 0, 2, 4, 6, 5, 4, 3, 2];
  function kick(t, v) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.17);
  }
  let hatBuf = null;
  function hat(t, v) {
    if (!hatBuf) { hatBuf = audioCtx.createBuffer(1, 2205, audioCtx.sampleRate); const d = hatBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const src = audioCtx.createBufferSource(), g = audioCtx.createGain(), f = audioCtx.createBiquadFilter();
    src.buffer = hatBuf; f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(f); f.connect(g); g.connect(audioCtx.destination); src.start(t);
  }
  function bgmStep() {
    if (!soundEnabled || !FXO.bgm || !BGM.mode) return;
    initAudio();
    const t = audioCtx.currentTime;
    if (BGM.mode === 'normal' || BGM.mode === 'zencho') {
      // 通常時: 静かなパッド風 / 前兆: 低音の脈動が速くなっていく
      const j = BGM.step++ % 16, r0 = BGM.mode === 'zencho' ? 196 : 220, v0 = BGM.mode === 'zencho' ? 0.06 : 0.035;
      if (j % 4 === 0) tone(note(r0, [0, 2, 3, 1][(j / 4) | 0] - 5), t, 0.9, 'sine', v0 * 2);
      if (BGM.mode === 'zencho') {
        if (j % 2 === 0) tone(note(r0, ARP[j], 0), t, 0.2, 'sawtooth', v0 * 0.8);
        if (j % 4 === 0) kick(t, v0 * 3);
      } else if (j % 8 === 4) tone(note(r0, ARP[j], 1), t, 0.5, 'triangle', v0);
      return;
    }
    const root = { bonus: 261.6, zone: 293.7, at: 329.6 }[BGM.mode] * (atType === 2 ? 0.84 : 1);
    const i = BGM.step++ % 16;
    const vol = 0.07 + BGM.lvl * 0.012;
    const lead = BGM.mode === 'zone' ? 'square' : atType === 2 ? 'sawtooth' : 'triangle';
    tone(note(root, ARP[i], 1), t, 0.16, lead, vol);
    if (i % 4 === 0) { tone(note(root, [0, 3, 4, 2][(i / 4) | 0] - 5), t, 0.34, 'sine', vol * 2); kick(t, vol * 3); }
    else if (i % 4 === 2) hat(t, vol * 1.6);
    if (BGM.mode !== 'bonus' && i % 8 === 4) kick(t, vol * 2.2);
    if (BGM.lvl >= 1 && i % 2 === 1) tone(note(root, ARP[i] + 5, 1), t, 0.08, 'square', vol * 0.5);
    if (BGM.lvl >= 2 && i % 4 === 2) tone(note(root, ARP[i], 2), t, 0.12, 'triangle', vol * 0.8);
    if (BGM.mode === 'zone' && i % 2 === 0) hat(t, vol * 1.2);
  }
  function bgmSet(mode, lvl) {
    if (BGM.mode === mode && BGM.lvl === lvl) return;
    const restart = BGM.mode !== mode || BGM.lvl !== lvl;
    BGM.mode = mode; BGM.lvl = lvl;
    clearInterval(BGM.timer); BGM.timer = null;
    if (mode && restart) BGM.timer = setInterval(bgmStep, Math.round(60000 / (112 + lvl * 14) / 2));
  }
  setInterval(() => {
    let mode = null, lvl = 0;
    if (isAtResult) mode = null;
    else if (bonusRun) { mode = bonusRun.zone ? 'zone' : 'bonus'; lvl = bonusRun.zone ? bonusRun.zlv : Math.min(3, bonusRun.aura >> 1); }
    else if (atGames > 0) { mode = 'at'; lvl = Math.min(3, (st.combo >= 10 ? 1 : 0) + (st.combo >= 25 ? 1 : 0) + (atGames <= 5 ? 1 : 0) + (atType ? 1 : 0)); }
    else if (zenchoLeft > 0 || fakeZencho > 0 || czLeft > 0) { mode = FXO.bgm ? 'zencho' : null; lvl = 1; }
    else if (FXO.bgmN && !isDebugRun && !isAtResult) { mode = 'normal'; lvl = 0; }
    if (!soundEnabled || !(FXO.bgm || (mode === 'normal' && FXO.bgmN))) mode = null;
    bgmSet(mode, lvl);
  }, 400);

  /* ---------- 設定画面に演出の項目を足す / 実績画面 ---------- */
  const _buildSettingsForm = buildSettingsForm;
  buildSettingsForm = function (...args) {
    _buildSettingsForm(...args);
    const body = document.getElementById('settings-body');
    if (!body || body.querySelector('#fx-freq')) return;
    const opt = (v, n) => `<option value="${v}"${FXO.freq === v ? ' selected' : ''}>${n}</option>`;
    body.insertAdjacentHTML('beforeend', `
      <div class="set-title">演出</div>
      <div class="set-group">
        <label class="set-row set-opt"><span class="set-label">予告の出やすさ</span><span class="set-field"><select id="fx-freq">${opt('low', '少なめ')}${opt('normal', '標準')}${opt('high', '多め')}${opt('off', 'なし')}</select></span></label>
        <label class="set-row set-opt"><span class="set-label">ウェイト (レバー間隔)</span><span class="set-field"><select id="fx-wait"><option value="normal"${FXO.wait === 'normal' ? ' selected' : ''}>標準 (4.1秒)</option><option value="short"${FXO.wait === 'short' ? ' selected' : ''}>短縮 (2秒)</option><option value="off"${FXO.wait === 'off' ? ' selected' : ''}>なし</option></select></span></label>
        <label class="set-row set-opt"><span class="set-label">振動 (対応端末のみ)</span><span class="set-field"><input type="checkbox" id="fx-vib"${FXO.vib ? ' checked' : ''}></span></label>
        <label class="set-row set-opt"><span class="set-label">通常時のBGM</span><span class="set-field"><input type="checkbox" id="fx-bgmn"${FXO.bgmN ? ' checked' : ''}></span></label>
        <label class="set-row set-opt"><span class="set-label">軽量モード (演出を減らす)</span><span class="set-field"><input type="checkbox" id="fx-lite"${FXO.lite ? ' checked' : ''}></span></label>
        <label class="set-row set-opt"><span class="set-label">BGM (ボーナス・AT中)</span><span class="set-field"><input type="checkbox" id="fx-bgm"${FXO.bgm ? ' checked' : ''}></span></label>
        <div class="set-note">今日のペカり君: ${COSTUME_NAME[costumeIdx()]}</div>
      </div>`);
    body.querySelector('#fx-freq').addEventListener('change', e => { FXO.freq = e.target.value; saveFxo(); });
    body.querySelector('#fx-wait').addEventListener('change', e => { FXO.wait = e.target.value; saveFxo(); });
    body.querySelector('#fx-bgmn').addEventListener('change', e => { FXO.bgmN = e.target.checked; saveFxo(); });
    body.querySelector('#fx-lite').addEventListener('change', e => { FXO.lite = e.target.checked; saveFxo(); applyLite(); });
    body.querySelector('#fx-vib').addEventListener('change', e => { FXO.vib = e.target.checked; saveFxo(); });
    body.querySelector('#fx-bgm').addEventListener('change', e => { FXO.bgm = e.target.checked; saveFxo(); });
  };

  const achModal = document.createElement('div');
  achModal.id = 'ach-modal';
  achModal.className = 'modal';
  achModal.innerHTML = '<div class="modal-card"><div class="modal-head"><span>称号</span><button type="button" data-close-modal aria-label="閉じる">&times;</button></div><div id="ach-body"></div></div>';
  document.body.appendChild(achModal);
  achModal.querySelector('[data-close-modal]').addEventListener('click', () => achModal.classList.remove('open'));
  function openAch() {
    const n = ACHS.filter(a => ach.got[a[0]]).length;
    document.getElementById('ach-body').innerHTML = `<div class="ach-sum">${n} / ${ACHS.length} 獲得</div><div class="ach-list">` +
      ACHS.map(a => `<div class="ach-row${ach.got[a[0]] ? ' got' : ''}"><i>&#10003;</i><div><b>${a[1]}</b><span>${a[2]}</span></div></div>`).join('') + '</div>';
    achModal.classList.add('open');
  }
  const autoOpt = document.getElementById('auto-opt-btn');
  if (autoOpt) {
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'ach-btn'; b.innerHTML = '<span class="mm-label">称号</span>';
    b.className = 'mm-item';
    autoOpt.parentNode.appendChild(b);
    b.addEventListener('click', openAch);
  }

  /* ---------- 出球感: 大当たり枚数表示のコイン雨 / 差枚マイルストーン / コインの山 ---------- */
  const _showPayout = showPayout;
  showPayout = function () {
    _showPayout();
    if (isDebugRun) return;
    const rank = Math.max(1, pendingTierIndex + 1);
    wait(1250, () => {
      rainCoins(40 + rank * 14);
      put('fx-talk', `${mascot('happy')}<span class="tk">${rank >= 5 ? 'すごい枚数だね!' : rank >= 3 ? 'いい枚数!' : 'ナイスペカ!'}</span>`, 2300);
    });
  };
  let maxDiff = 0;
  const pile = document.createElement('div');
  pile.className = 'fx-pile';
  pile.style.display = 'none';
  layer.appendChild(pile);
  setInterval(() => {
    // 差枚マイルストーン (上向きだけ)
    if (diffCoins > maxDiff) {
      const prev = maxDiff;
      maxDiff = diffCoins;
      [300, 500, 1000, 2000, 3000, 5000, 10000].filter(m => prev < m && diffCoins >= m).forEach(m => {
        showBanner(`+${m}`, '差枚', m >= 1000 ? 'red' : '', true, 1800);
        rainCoins(Math.min(80, 20 + m / 100)); sndUp(m >= 1000 ? 7 : 4);
        if (m >= 1000) unlock('diff1000');
        if (m >= 5000) unlock('diff5000');
      });
    }
    // コインの山: ボーナス/AT中の獲得枚数に応じて下から積もる
    const gain = (atRun && (bonusRun || atGames > 0 || atEnding)) ? diffCoins - atRun.startDiff : 0;
    if (gain > 20) { pile.style.display = ''; pile.style.height = Math.min(46, 4 + Math.sqrt(gain) * 1.0) + 'px'; } else pile.style.display = 'none';
  }, 500);

  /* ---------- レバー: 演出中は受け付けない ---------- */
  const _handleSpin = handleSpin;
  /* ウェイト: 実機は1ゲーム約4.1秒。前のレバーから間隔が足りなければ残り時間だけ待ってから回す */
  const WAIT_MS = { normal: 4100, short: 2000, off: 0 };
  let lastLeverAt = 0, leverTimer = null;
  window.leverWaiting = false;
  handleSpin = function () {
    if (FX.busy > 0 && !isReelSpinning && !isPushing) return;
    if (isReelSpinning || isPushing || isAtResult) { _handleSpin(); return; }
    const wait = WAIT_MS[FXO.wait] ?? 4100;
    const rest = lastLeverAt + wait - Date.now();
    if (rest > 0 && !reelLocked) {
      if (leverTimer) return;              // 待機中の連打は無視
      window.leverWaiting = true;
      leverTimer = setTimeout(() => { leverTimer = null; window.leverWaiting = false; lastLeverAt = Date.now(); _handleSpin(); }, rest);
      return;
    }
    if (reelLocked) { _handleSpin(); return; }
    lastLeverAt = Date.now();
    _handleSpin();
  };
  spinBtn.removeEventListener('click', _handleSpin);
  spinBtn.addEventListener('click', handleSpin);

  /* ---------- fxRunning: 演出中はオートを待たせる ---------- */
  const _fxRunning = fxRunning;
  fxRunning = function () { return FX.busy > 0 || _fxRunning(); };

  try { buildSettingsForm(); } catch (e) { /* 設定画面は開いたときに作り直される */ }

  /* デバッグ用に呼べるようにする */
  FX.debug = { cutin: (c, ok) => showCutin(c, ok !== false, () => {}), step: ok => showStep(ok !== false, true, () => {}), talk: ok => showTalk(ok !== false, () => {}),
    dark: ok => showDark(ok !== false, () => {}), banner: showBanner, unlock, combo: bumpCombo, mission: startMission, mount: mountUpdate };
})();
