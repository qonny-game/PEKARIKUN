// ==========================================
// JS/ext/bgm.js  —  BGMエンジン (1.20.24)
// 16ステップ・シーケンサー + コード進行 + ベース/ドラム/パッド/アルペジオ/リード + ディレイ + サイドチェイン風ポンピング
// モード: normal(通常) / zencho(前兆・CZ) / bonus(PEKA CHANCE) / zone(PEKA PEKA MOUNTAIN) / at(PEKA RUSH) / heaven / death
// lvl(0〜3)が上がるほど音が増える。fx.js の bgmSet から BGM2.set(mode, lvl) で呼ばれる
// ==========================================
(() => {
  'use strict';
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
  const rngOf = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
  const TONES = { maj: [0, 4, 7, 11], min: [0, 3, 7, 10] };

  /* ---------- 曲の定義 ---------- */
  // prog: [根音(キーからの半音), 'maj'|'min'] ×8小節 / lead: 音色 / drums: kick・snare・hat のパターン種別
  const SONGS = {
    normal: { bpm: 92,  key: 57, scale: MIN, seed: 11, prog: [[0, 'min'], [8, 'maj'], [3, 'maj'], [10, 'maj'], [0, 'min'], [8, 'maj'], [3, 'maj'], [7, 'maj']], lead: 'pluck', bass: 'sparse', drums: 'none', vol: 0.55 },
    zencho: { bpm: 144, key: 50, scale: MIN, seed: 23, prog: [[0, 'min'], [8, 'maj'], [10, 'maj'], [7, 'maj'], [0, 'min'], [8, 'maj'], [10, 'maj'], [7, 'maj']], lead: 'none', bass: 'pulse', drums: 'tense', vol: 0.8 },
    bonus:  { bpm: 128, key: 60, scale: MAJ, seed: 31, prog: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj'], [0, 'maj'], [7, 'maj'], [5, 'maj'], [7, 'maj']], lead: 'saw', bass: 'drive', drums: 'four', vol: 0.85 },
    zone:   { bpm: 156, key: 62, scale: MAJ, seed: 47, prog: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj'], [0, 'maj'], [7, 'maj'], [5, 'maj'], [7, 'maj']], lead: 'super', bass: 'offbeat', drums: 'rush', vol: 0.9 },
    at:     { bpm: 140, key: 64, scale: MAJ, seed: 59, prog: [[5, 'maj'], [7, 'maj'], [4, 'min'], [9, 'min'], [5, 'maj'], [7, 'maj'], [0, 'maj'], [0, 'maj']], lead: 'brass', bass: 'drive', drums: 'four', vol: 0.9 },
    heaven: { bpm: 144, key: 67, scale: MAJ, seed: 71, prog: [[5, 'maj'], [7, 'maj'], [4, 'min'], [9, 'min'], [5, 'maj'], [7, 'maj'], [0, 'maj'], [0, 'maj']], lead: 'super', bass: 'drive', drums: 'four', vol: 0.9, sparkle: true },
    death:  { bpm: 148, key: 52, scale: MIN, seed: 83, prog: [[0, 'min'], [8, 'maj'], [10, 'maj'], [7, 'min'], [0, 'min'], [8, 'maj'], [5, 'min'], [7, 'maj']], lead: 'dark', bass: 'pulse', drums: 'rush', vol: 0.9 }
  };
  // リズム(メロディの発音位置): 16分音符の何個目で鳴らすか
  const RHY = [[0, 3, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 14], [0, 4, 8, 12], [0, 3, 6, 10, 12, 14], [0, 6, 8, 14], [0, 2, 6, 8, 11, 14]];

  const built = {};
  function build(name) {
    if (built[name]) return built[name];
    const S = SONGS[name], rnd = rngOf(S.seed);
    const pool = [];
    for (let n = S.key + 12; n <= S.key + 31; n++) if (S.scale.includes(((n - S.key) % 12 + 12) % 12)) pool.push(n);
    const bars = [];
    let prev = pool[Math.floor(pool.length / 2)];
    const motifR = RHY[Math.floor(rnd() * RHY.length)];
    S.prog.forEach(([off, q], b) => {
      const ct = TONES[q].map(x => (S.key + off + x) % 12);
      const rhy = (b % 4 === 0 || b % 4 === 2) ? motifR : RHY[Math.floor(rnd() * RHY.length)];
      const notes = [];
      rhy.forEach((st, k) => {
        const strong = st % 4 === 0;
        let cand = pool.filter(n => !strong || ct.includes(n % 12));
        if (!cand.length) cand = pool;
        let pick;
        if (strong) pick = cand.reduce((a, c) => Math.abs(c - prev) < Math.abs(a - prev) ? c : a, cand[0]);
        else { const idx = pool.indexOf(prev); const d = [-2, -1, 1, 2][Math.floor(rnd() * 4)]; pick = pool[Math.max(0, Math.min(pool.length - 1, idx + d))]; }
        if (b === S.prog.length - 1 && k === rhy.length - 1) pick = pool.find(n => (n - S.key) % 12 === 0 && n > S.key + 12) || pick;   // 最後は主音で終わる
        notes.push([st, pick]); prev = pick;
      });
      bars.push(notes);
    });
    return (built[name] = bars);
  }

  /* ---------- 音の出口 (コンプレッサー + ディレイ + ポンピング用ゲイン) ---------- */
  let ctxRef = null, bus = null;
  function makeBus(ctx) {
    const out = ctx.createGain(); out.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.18;
    out.connect(comp); comp.connect(ctx.destination);
    const pump = ctx.createGain(); pump.connect(out);                 // パッド/アルペジオ/リード: キックのたびに沈む
    const dry = ctx.createGain(); dry.connect(out);                   // ドラム/ベース
    const dly = ctx.createDelay(1); dly.delayTime.value = 0.32;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    const wet = ctx.createGain(); wet.gain.value = 0.28;
    dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(wet); wet.connect(out);
    const send = ctx.createGain(); send.gain.value = 1; send.connect(dly);
    return { ctx, out, pump, dry, send, noise: null };
  }
  function getBus(ctx) { if (!bus || bus.ctx !== ctx) bus = makeBus(ctx); return bus; }
  function noiseBuf(ctx) { if (!bus.noise) { const n = ctx.sampleRate; const b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; bus.noise = b; } return bus.noise; }

  /* ---------- 楽器 ---------- */
  function voice(ctx, o) {   // {f,t,d,type,vol,to:'pump'|'dry',det,atk,rel,lp,dly}
    const B = getBus(ctx);
    const g = ctx.createGain();
    const atk = o.atk === undefined ? 0.006 : o.atk, rel = o.rel === undefined ? 0.06 : o.rel;
    g.gain.setValueAtTime(0.0001, o.t);
    g.gain.linearRampToValueAtTime(o.vol, o.t + atk);
    g.gain.setValueAtTime(o.vol, o.t + Math.max(atk, o.d));
    g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.d + rel);
    let node = g;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, o.t); if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, o.t + o.d); g.connect(f); node = f; }
    node.connect(o.to === 'dry' ? B.dry : B.pump);
    if (o.dly) node.connect(B.send);
    const dets = o.det ? [-o.det, 0, o.det] : [0];
    dets.forEach(c => {
      const osc = ctx.createOscillator(); osc.type = o.type || 'sawtooth'; osc.frequency.value = o.f; osc.detune.value = c;
      osc.connect(g); osc.start(o.t); osc.stop(o.t + o.d + rel + 0.02);
    });
  }
  function kick(ctx, t, v) {
    const B = getBus(ctx), o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(B.dry); o.start(t); o.stop(t + 0.22);
    B.pump.gain.cancelScheduledValues(t); B.pump.gain.setValueAtTime(0.42, t); B.pump.gain.linearRampToValueAtTime(1, t + 0.2);   // ポンピング
  }
  function noiseHit(ctx, t, v, dur, type, freq) {
    const B = getBus(ctx), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf(ctx); f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(B.dry); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const snare = (ctx, t, v) => { noiseHit(ctx, t, v, 0.16, 'highpass', 1800); voice(ctx, { f: 190, t, d: 0.05, type: 'triangle', vol: v * 0.7, to: 'dry', rel: 0.06 }); };
  const clap = (ctx, t, v) => { [0, 0.012, 0.024].forEach(o => noiseHit(ctx, t + o, v * 0.7, 0.09, 'bandpass', 1500)); };
  const hat = (ctx, t, v, open) => noiseHit(ctx, t, v, open ? 0.14 : 0.04, 'highpass', 7500);
  const crash = (ctx, t, v) => noiseHit(ctx, t, v, 1.1, 'highpass', 4500);

  /* ---------- 1ステップ(16分音符)を鳴らす ---------- */
  function playStep(ctx, name, lvl, step, t) {
    const S = SONGS[name], bars = build(name);
    const bar = Math.floor(step / 16) % S.prog.length, i = step % 16;
    const [off, q] = S.prog[bar];
    const root = S.key + off - 12;            // 根音(低め)
    const ch = TONES[q];
    const sd = 60 / S.bpm / 4;                 // 16分の長さ
    const V = S.vol;
    const lastBar = bar === S.prog.length - 1;
    const lead = S.lead !== 'none' && name !== 'normal';

    /* ドラム */
    if (S.drums !== 'none') {
      const kickAt = S.drums === 'tense' ? [0, 6, 8, 14] : [0, 4, 8, 12];
      if (kickAt.includes(i)) kick(ctx, t, 0.26 * V);
      if (S.drums === 'tense') { if (i % 2 === 0) hat(ctx, t, 0.03 * V); if (lastBar && i >= 8) snare(ctx, t, 0.04 * V * (i - 6) / 4); }
      else {
        if (i === 4 || i === 12) { snare(ctx, t, 0.1 * V); if (lvl >= 1) clap(ctx, t, 0.06 * V); }
        if (i % 4 === 2) hat(ctx, t, 0.04 * V, true);
        if (lvl >= 1 && i % 2 === 1) hat(ctx, t, 0.022 * V);
        if (lvl >= 2 && lastBar && i >= 8) snare(ctx, t, 0.05 * V * (1 + (i - 8) / 4));   // 8小節目の最後はスネアロール
      }
      if (i === 0 && bar === 0) crash(ctx, t, 0.07 * V);
      if (lvl >= 3 && i === 0 && bar % 2 === 0) crash(ctx, t, 0.05 * V);
    }
    /* ベース */
    const bf = mtof(root);
    if (S.bass === 'drive') { if ([0, 3, 6, 8, 10, 12, 14].includes(i)) voice(ctx, { f: i === 6 || i === 14 ? bf * 2 : bf, t, d: sd * 1.4, type: 'sawtooth', vol: 0.13 * V, to: 'dry', lp: 520, rel: 0.05 }); }
    else if (S.bass === 'offbeat') { if (i % 4 === 2) voice(ctx, { f: bf, t, d: sd * 1.6, type: 'sawtooth', vol: 0.14 * V, to: 'dry', lp: 600, rel: 0.05 }); if (i % 4 === 0) voice(ctx, { f: bf / 2, t, d: sd * 1.5, type: 'sine', vol: 0.14 * V, to: 'dry' }); }
    else if (S.bass === 'pulse') { if (i % 2 === 0) voice(ctx, { f: bf * (i % 8 === 6 ? 1.5 : 1), t, d: sd * 1.3, type: 'sawtooth', vol: 0.11 * V, to: 'dry', lp: 420, rel: 0.04 }); }
    else if (S.bass === 'sparse') { if (i % 8 === 0) voice(ctx, { f: bf, t, d: sd * 6, type: 'sine', vol: 0.12 * V, to: 'dry', atk: 0.02, rel: 0.3 }); }
    /* パッド(和音を小節の頭で伸ばす) */
    if (i === 0) {
      ch.slice(0, 3).forEach(x => voice(ctx, { f: mtof(root + 12 + x), t, d: sd * 15, type: 'sawtooth', det: 9, vol: (name === 'normal' ? 0.016 : 0.022) * V, lp: 1400, atk: 0.06, rel: 0.4, dly: false }));
    }
    /* アルペジオ */
    const arpOn = name === 'normal' ? (i % 2 === 0) : (lvl >= 1 && (lvl >= 2 || i % 2 === 0)) || name === 'zone' || name === 'zencho';
    if (arpOn && name !== 'zencho') {
      const seq = [0, 1, 2, 1, 0, 1, 2, 3];
      const x = ch[seq[(i / (lvl >= 2 || name === 'zone' ? 1 : 2) | 0) % 8] % ch.length];
      voice(ctx, { f: mtof(S.key + off + 12 + x + (name === 'normal' ? 12 : 12)), t, d: sd * 0.9, type: name === 'normal' ? 'triangle' : 'square', vol: (name === 'normal' ? 0.03 : 0.022) * V, lp: 3800, dly: true, rel: 0.05 });
    }
    if (name === 'zencho' && i % 2 === 1) voice(ctx, { f: mtof(S.key + off + 24 + ch[(i >> 1) % 3]), t, d: sd * 0.6, type: 'square', vol: 0.014 * V, lp: 3000, dly: true });
    /* リード(メロディ) */
    if (lead) {
      bars[bar].forEach(([st, n]) => {
        if (st !== i) return;
        const nextSt = (bars[bar].find(x => x[0] > st) || [16])[0];
        const len = Math.max(1.5, (nextSt - st) * 0.92) * sd;
        const f = mtof(n);
        const L = S.lead;
        if (L === 'saw') voice(ctx, { f, t, d: len, type: 'sawtooth', det: 8, vol: 0.05 * V, lp: 4200, dly: true, rel: 0.08 });
        else if (L === 'super') voice(ctx, { f, t, d: len, type: 'sawtooth', det: 16, vol: 0.055 * V, lp: 5200, dly: true, rel: 0.1 });
        else if (L === 'brass') { voice(ctx, { f, t, d: len, type: 'sawtooth', det: 6, vol: 0.05 * V, lp: 600, lpTo: 3600, atk: 0.02, dly: true, rel: 0.08 }); }
        else if (L === 'dark') voice(ctx, { f, t, d: len, type: 'sawtooth', det: 10, vol: 0.05 * V, lp: 2200, dly: true, rel: 0.08 });
        if (lvl >= 2) voice(ctx, { f: f * 2, t, d: len, type: 'triangle', vol: 0.026 * V, lp: 5000, dly: true, rel: 0.08 });
        if (S.sparkle && lvl >= 1) voice(ctx, { f: f * 4, t: t + sd * 0.5, d: 0.08, type: 'sine', vol: 0.02 * V, dly: true });
      });
      /* ブラスのスタブ(裏拍) */
      if (S.lead === 'brass' && lvl >= 1 && (i === 6 || i === 14)) ch.slice(0, 3).forEach(x => voice(ctx, { f: mtof(S.key + off + 12 + x), t, d: sd * 1.6, type: 'sawtooth', det: 7, vol: 0.02 * V, lp: 2600, atk: 0.01, rel: 0.05 }));
    }
    if (name === 'normal' && i % 8 === 4) voice(ctx, { f: mtof(S.key + off + 24 + ch[1]), t, d: sd * 3, type: 'sine', vol: 0.03 * V, dly: true, rel: 0.4 });   // 通常時のベル
  }

  /* ---------- スケジューラ ---------- */
  const ST = { name: null, lvl: 0, step: 0, next: 0, timer: 0 };
  function tick() {
    if (!ST.name || typeof audioCtx === 'undefined' || !audioCtx) return;
    const ctx = audioCtx, S = SONGS[ST.name];
    while (ST.next < ctx.currentTime + 0.18) {
      playStep(ctx, ST.name, ST.lvl, ST.step, Math.max(ST.next, ctx.currentTime));
      ST.next += 60 / S.bpm / 4; ST.step++;
    }
  }
  function nameOf(mode) { return mode === 'at' ? (atType === 1 ? 'heaven' : atType === 2 ? 'death' : 'at') : mode; }
  function set(mode, lvl) {
    const name = mode ? nameOf(mode) : null;
    if (name === ST.name) { ST.lvl = lvl || 0; return; }
    clearInterval(ST.timer); ST.timer = 0; ST.name = name; ST.lvl = lvl || 0; ST.step = 0;
    if (!name) return;
    if (typeof initAudio === 'function') initAudio();
    if (typeof audioCtx === 'undefined' || !audioCtx) return;
    ST.next = audioCtx.currentTime + 0.06;
    ST.timer = setInterval(tick, 40);
    tick();
  }
  /* 書き出しテスト用: 指定の曲を ctx に先頭から sec 秒ぶん予約する */
  function renderTest(ctx, name, lvl, sec) {
    bus = null;
    const sd = 60 / SONGS[name].bpm / 4;
    for (let s = 0, t = 0.05; t < sec; s++, t += sd) playStep(ctx, name, lvl, s, t);
  }
  window.BGM2 = { set, renderTest, SONGS };
})();
