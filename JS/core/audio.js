// ==========================================
// JS/core/audio.js  —  音声（効果音・ペカリ音・枚数表示のファンファーレ）
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
// ==========================================
// 音声
// ==========================================
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 効果音ファイル (事前読み込み: 再生時の遅延をなくす)
const SOUND_FILES = { gako: ASSET_DIR.sound + 'gako.mp3', vvv: ASSET_DIR.sound + 'vvv.mp3' };
const soundAudio = {};    // HTMLAudio (フォールバック用)
const soundBuffers = {};  // デコード済みバッファ (連続再生でも正確)

Object.keys(SOUND_FILES).forEach(name => {
  const a = new Audio(SOUND_FILES[name]);
  a.preload = 'auto';
  a.load();
  soundAudio[name] = a;

  try {
    fetch(SOUND_FILES[name])
      .then(r => r.arrayBuffer())
      .then(buf => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx.decodeAudioData(buf);
      })
      .then(b => { soundBuffers[name] = b; })
      .catch(() => { /* file:// などで失敗した場合は HTMLAudio で再生 */ });
  } catch (e) { /* 何もしない */ }
});

/* 長すぎる音は途中でフェードアウトして切る (秒)。vvv.mp3 はここで長さを調整できる */
const VVV_MIN_COINS = 350;   // この枚数以上の「枚数表示」で vvv.mp3 を鳴らす
const SAMPLE_MAX_SEC = { vvv: 2.8 };
const SAMPLE_FADE_SEC = 0.15;

function playSampleOnce(name) {
  if (!soundEnabled) return;
  const max = SAMPLE_MAX_SEC[name];
  const buf = soundBuffers[name];
  if (buf && audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const g = audioCtx.createGain();
    src.connect(g);
    g.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    if (max && buf.duration > max) {
      g.gain.setValueAtTime(1, t + max - SAMPLE_FADE_SEC);
      g.gain.linearRampToValueAtTime(0, t + max);
      src.start(t, 0, max);
    } else {
      src.start(t);
    }
    return;
  }
  const a = soundAudio[name].cloneNode();
  a.currentTime = 0;
  if (max) {
    const steps = 6;
    setTimeout(() => {
      let k = 0;
      const iv = setInterval(() => {
        k++;
        a.volume = Math.max(0, 1 - k / steps);
        if (k >= steps) { clearInterval(iv); a.pause(); }
      }, SAMPLE_FADE_SEC * 1000 / steps);
    }, (max - SAMPLE_FADE_SEC) * 1000);
  }
  a.play().catch(err => {
    console.warn(SOUND_FILES[name] + "の再生に失敗したため、プログラム合成音にフォールバックします:", err);
    playGakoSynth();
  });
}

/* ペカリ音 (name: 'gako' | 'vvv' を count回 gapミリ秒刻みで連続再生) */
function playGakoSound(name = 'gako', count = 1, gap = 100) {
  if (!soundEnabled) return;
  for (let i = 0; i < count; i++) {
    if (i === 0) playSampleOnce(name);
    else setTimeout(() => playSampleOnce(name), i * gap);
  }
}

/* ガコッ！フォールバック用合成音 */
function playGakoSynth() {
  initAudio();
  const now = audioCtx.currentTime;

  const bufferSize = audioCtx.sampleRate * 0.08;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 700;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(1.0, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(170, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);

  oscGain.gain.setValueAtTime(1.2, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);

  noise.start(now);
  osc.start(now);
  osc.stop(now + 0.22);
}

/* レバー/ボタンタップ音 */
function playClickSound() {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

function tone(freq, start, dur, type = 'sawtooth', vol = 0.2) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + dur);
}

/* 図柄が揃った瞬間の短いチャイム */
function playAlignChime() {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;
  tone(880, now, 0.18, 'triangle', 0.2);
  tone(1318.5, now + 0.1, 0.3, 'triangle', 0.2);
}

/* 枚数表示のファンファーレ。rank が上がるほど長く・厚く・豪華になる
   rank: 0=REG / 1〜10=BIG(200〜2000枚) / 9=777枚 / 11=7777枚 */
function playPayoutFanfare(rank) {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;

  if (rank <= 0) {
    [440.00, 554.37, 659.25].forEach((f, i) => tone(f, now + i * 0.12, 0.35));
    return;
  }

  const r = Math.min(rank, 11);
  const root = 523.25 * Math.pow(2, Math.min(r, 10) / 24);   // 上位ほど音程も高く
  const vol = Math.max(0.07, 0.15 - r * 0.005);              // 音数が増える分、音量は少し下げて割れ防止
  const chord = (base, t, dur, ratios) =>
    ratios.forEach(x => tone(base * x, t, dur, 'sawtooth', vol));

  // ① 駆け上がるアルペジオ (音数が枚数とともに増える)
  const steps = Math.min(3 + r, 12);
  const gap = Math.max(0.05, 0.11 - r * 0.005);
  const arp = [1, 1.25, 1.5, 2];
  for (let i = 0; i < steps; i++) {
    tone(root * arp[i % 4] * Math.pow(2, Math.floor(i / 4)), now + i * gap, 0.22, 'sawtooth', vol);
  }

  // ② フィナーレの和音 (枚数が多いほど長く・音が厚く)
  const fin = now + steps * gap + 0.04;
  const finDur = 0.5 + r * 0.1;
  const ratios = [1, 1.25, 1.5, 2];
  if (r >= 4) ratios.push(2.5);
  if (r >= 6) ratios.push(3);
  chord(root * 2, fin, finDur, ratios);
  if (r >= 3) tone(root, fin, finDur, 'square', vol);           // 低音
  if (r >= 2) tone(root / 2, fin, finDur, 'sine', 0.22);         // 重低音

  // ③ キラキラ (5枚目以降)
  if (r >= 5) {
    const n = 6 + (r - 5) * 3;
    for (let i = 0; i < n; i++) {
      tone(1568 * Math.pow(2, (i % 5) / 5) * (i % 2 ? 1 : 1.5), fin + i * 0.06, 0.25, 'triangle', 0.1);
    }
  }

  // ④ 転調して2回目のフレーズ (800枚〜)
  if (r >= 7) {
    const t2 = fin + finDur * 0.55;
    [1.125, 1.25, 1.5].forEach((h, k) => chord(root * h * 2, t2 + k * 0.1, 0.14, [1, 1.25, 1.5, 2]));
    chord(root * 3, t2 + 0.4, 0.9 + (r - 7) * 0.15, [1, 1.25, 1.5, 2, 2.5]);
    tone(root * 1.5, t2 + 0.4, 0.9 + (r - 7) * 0.15, 'square', vol);
  }

  // ⑤ ティンパニのドロドロ (900枚〜)
  if (r >= 9) {
    for (let i = 0; i < 6 + (r - 9) * 2; i++) {
      const t = fin + i * 0.07;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + 0.14);
    }
  }

  // ⑥ 2000枚: 上昇グリッサンド + 3回目のフレーズ
  if (r >= 10) {
    for (let i = 0; i < 14; i++) {
      tone(1046.5 * Math.pow(2, i / 12 * 1.5), fin + 0.5 + i * 0.06, 0.25, 'triangle', 0.1);
    }
    const t3 = fin + finDur + 0.6;
    [1.5, 1.6875, 1.875].forEach((h, k) => chord(root * h * 2, t3 + k * 0.1, 0.14, [1, 1.25, 1.5, 2]));
    chord(root * 4, t3 + 0.4, 1.4, [1, 1.25, 1.5, 2, 3]);
  }

  // ⑦ 7777枚: さらに転調 + 長い余韻の大合唱
  if (r >= 11) {
    const t4 = fin + finDur + 1.9;
    [1, 1.125, 1.25, 1.5].forEach((h, k) => chord(root * h * 4, t4 + k * 0.1, 0.14, [1, 1.25, 1.5, 2]));
    chord(root * 6, t4 + 0.5, 2.6, [1, 1.25, 1.5, 2, 2.5, 3]);
    tone(root, t4 + 0.5, 2.6, 'square', vol);
    for (let i = 0; i < 24; i++) {
      tone(2093 * Math.pow(2, (i % 7) / 7), t4 + 0.5 + i * 0.08, 0.3, 'triangle', 0.09);
    }
  }
}

