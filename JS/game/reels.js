// ==========================================
// JS/game/reels.js  —  リール表示・リール配列・役の組み合わせ
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* ---------- リール (3行3列) ---------- */
const REEL_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const EMOJI = { bell: '🔔', cherry: '🍒', melon: '🍉' };

const SYM_FALLBACK = { replay: '<div class="sym-replay">REPLAY</div>', bar: '<div class="sym-bar">BAR</div>', bell: '<div class="sym-emoji">🔔</div>', cherry: '<div class="sym-emoji">🍒</div>', melon: '<div class="sym-emoji">🍉</div>' };
/* 図柄はすべて画像 (assets/img/<key>.png)。読み込めないときだけ文字・絵文字で代用する */
function symbolHTML(key, glow) {
  const fb = (SYM_FALLBACK[key] || '<div class="sym-seven">7</div>').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const alt = key.startsWith('7') ? '7' : key;
  return `<img class="sym-img ${glow || ''}" src="${SYM_IMG[key] || ASSET_DIR.img + key + '.png?v=' + APP_VERSION}" alt="${alt}" draggable="false" onerror="if(this.parentNode)this.outerHTML='${fb}'">`;
}
const lineOf = (g, l) => g[l[0]] === g[l[1]] && g[l[1]] === g[l[2]];

/* ---------- リール配列 (各21コマ) ----------
   回転は下向き。windowOf(c, t) = [上段, 中段, 下段] = [t+1, t, t-1] 番目の図柄。
   7は各色1個ずつ。第1リールのBARの上下は必ずチェリーとスイカ。 */
const STRIP_LEN = 21;
const STRIPS = [
  ['7red', 'replay', 'bell', 'cherry', 'bar', 'melon', 'replay', 'bell', '7blue', 'replay', 'bell', 'melon', 'cherry', 'replay', 'bell', '7white', 'replay', 'bell', 'melon', 'replay', 'bell'],
  ['replay', 'bell', '7blue', 'replay', 'melon', 'bell', 'bar', 'cherry', 'bar', 'bell', '7white', 'replay', 'bell', 'melon', 'replay', '7red', 'bell', 'replay', 'cherry', 'bell', 'replay'],
  ['bell', '7white', 'replay', 'melon', 'bell', 'replay', 'bar', 'bell', 'melon', 'replay', '7red', 'bell', 'melon', 'replay', 'cherry', 'bell', 'melon', 'replay', '7blue', 'bell', 'replay']
];
const SEVENS = ['7red', '7blue', '7white'];
const isSeven = k => SEVENS.includes(k);
const mod = i => ((i % STRIP_LEN) + STRIP_LEN) % STRIP_LEN;
const stripSym = (c, i) => STRIPS[c][mod(i)];
const windowOf = (c, t) => [stripSym(c, t + 1), stripSym(c, t), stripSym(c, t - 1)];
function gridOf(ts) {
  const w = ts.map((t, c) => windowOf(c, t));
  return [w[0][0], w[1][0], w[2][0], w[0][1], w[1][1], w[2][1], w[0][2], w[1][2], w[2][2]];
}
function alignedLines(g) {
  const out = [];
  REEL_LINES.forEach((l, i) => { if (lineOf(g, l)) out.push({ i, sym: g[l[0]] }); });
  return out;
}
const leftCherries = g => [0, 3, 6].filter(i => g[i] === 'cherry').length;

/* 役ごとに、成立する停止位置の組み合わせ (3リール分の中段位置) を全部数えておく。
   ハズレ・ベル・リプレイ・チェリーは、必ずこの中から選ぶ (配列どおりの図柄で止まる) */
const ROLE_COMBOS = { lose: [], replay: [], cherry: [], cherryW: [], cherryS: [], melonW: [], chanceW: [], chanceS: [], sand: [], bell0: [], bell1: [], bell2: [] };
/* 上段のスイカ（第1リール上段）は、スイカ系（弱=左上→右下の斜め / 強=上段横）か強チャンス目の確定のときだけ。それ以外の役・ハズレでは出さない
   強チャンス目: 第1リール上段スイカ・第2リール中段スイカ・第3リール中段スイカ（揃わない）/ 弱チャンス目: 中段リプレイ・リプレイ・ベル（揃わない） */
const colHas = (g, c, f) => [c, 3 + c, 6 + c].some(i => f(g[i]));

(function buildCombos() {
  for (let a = 0; a < STRIP_LEN; a++) for (let b = 0; b < STRIP_LEN; b++) for (let c = 0; c < STRIP_LEN; c++) {
    const ts = [a, b, c];
    const g = gridOf(ts);
    const L = alignedLines(g);
    const lc = leftCherries(g);
    const topMelon = g[0] === 'melon';   // 第1リール上段のスイカ
    if (L.length === 0) {
      if (lc === 0) {
        if (topMelon) {
          if (g[4] === 'melon' && g[5] === 'melon' && g[8] !== 'melon') ROLE_COMBOS.chanceS.push(ts);   // 強チャンス目: 上段・中段・中段のスイカ
        }
        else if (g[3] === 'replay' && g[4] === 'replay' && g[5] === 'bell') ROLE_COMBOS.chanceW.push(ts);   // 中段リプレイ・リプレイ・ベル=弱チャンス目
        else if (g[1] === 'bar' && g[4] === 'cherry' && g[7] === 'bar') ROLE_COMBOS.sand.push(ts);   // サンド目 (第2リール: バー・チェリー・バー)
        else ROLE_COMBOS.lose.push(ts);
      } else if (lc === 1 && !topMelon) {
        ROLE_COMBOS.cherry.push(ts);
        (g[3] === 'cherry' ? ROLE_COMBOS.cherryS : ROLE_COMBOS.cherryW).push(ts);   // 中段=強 / 上下段=弱
      }
    } else if (L.length === 1 && lc === 0) {
      const { i, sym } = L[0];
      if (sym === 'melon' && i === 6 && topMelon) ROLE_COMBOS.melonW.push(ts);   // 左上→右下の斜め=弱スイカ（強スイカは上段横で pickMelonPlan が作る）
      if (topMelon) { /* スイカ系の揃いはここでは扱わない */ }
      else if (sym === 'replay') ROLE_COMBOS.replay.push(ts);
      else if (sym === 'bell') {
        if (i <= 2) ROLE_COMBOS.bell0.push(ts);
        else if (i === 6) ROLE_COMBOS.bell1.push(ts);
        else if (i === 7) ROLE_COMBOS.bell2.push(ts);
      }
    }
  }
})();
const pickCombo = kind => { const l = ROLE_COMBOS[kind]; return l[Math.floor(Math.random() * l.length)]; };

/* 強スイカ: 上段の横に揃う。第1・第3リールは上段にスイカで自動停止、第2リールは自分で狙わないと揃わない
   windowOf の上段 = strip[t+1] なので、上段にスイカが来る停止位置は t = 図柄の位置 - 1 */
function pickMelonPlan() {
  const tops = c => STRIPS[c].map((k, i) => (k === 'melon' ? mod(i - 1) : -1)).filter(t => t >= 0);
  // 外したときの形: 第1リール上段スイカ・第2リール中段スイカ。第3リールは強チャンス目の形（中段スイカ）にならない停止位置（強チャンス目と見分けがつくように）
  const midMelonNoTop = c => STRIPS[c].map((k, i) => (k === 'melon' && STRIPS[c][mod(i + 1)] !== 'melon' && STRIPS[c][mod(i - 1)] !== 'melon' ? i : -1)).filter(i => i >= 0);
  const opts = [];
  tops(0).forEach(t0 => tops(2).forEach(t2 => {
    const ok = tops(1).every(t1 => {
      const g = gridOf([t0, t1, t2]);
      const L = alignedLines(g);
      return leftCherries(g) === 0 && L.length === 1 && L[0].i === 0 && L[0].sym === 'melon';
    });
    if (ok) opts.push([t0, t2]);
  }));
  // 外しの形は、同じ第1リールの上段スイカのまま、揃いが無い組み合わせを選ぶ
  const m1 = midMelonNoTop(1), m2 = STRIPS[2].map((_, i) => i);   // 第3リールは何でもよいが、強チャンス目の形（上段・中段・中段のスイカ）だけは作らない
  const cand = opts.map(o => ({ o, pairs: m1.flatMap(t1 => m2.map(t2 => [t1, t2])).filter(([t1, t2]) => {
    const g = gridOf([o[0], t1, t2]);
    return alignedLines(g).length === 0 && leftCherries(g) === 0 && !(g[4] === 'melon' && g[5] === 'melon');
  }) })).filter(x => x.pairs.length);
  const pick = cand[Math.floor(Math.random() * cand.length)];
  const [t1miss, t2mid] = pick.pairs[Math.floor(Math.random() * pick.pairs.length)];
  return { kind: 'melon', t0: pick.o[0], t2: pick.o[1], t1miss, t2mid };
}
function planFor(kind) {
  if (kind === 'sand') return { kind: 'sand', ts: pickCombo('sand') };
  if (kind === 'lose' && sandReachNow) return { kind: 'fixed', ts: pickCombo('sand') };   // 通常時のリーチ目（サンド目の形で止まる）
  if (kind === 'cherry' || kind === 'cherryW' || kind === 'cherryS') return { kind: 'cherry', ts: pickCombo(kind), strong: kind === 'cherryS' };
  return kind === 'melon' ? pickMelonPlan() : { kind: 'fixed', ts: pickCombo(kind) };
}
function winIdxOf(kind, g) {
  if (kind === 'cherry' || kind === 'cherryW' || kind === 'cherryS') { const i = [0, 3, 6].find(k => g[k] === 'cherry'); return i === undefined ? null : [i]; }
  if (kind === 'chanceW' || kind === 'chanceS') return null;
  const L = alignedLines(g);
  return L.length ? REEL_LINES[L[0].i] : null;
}

/* winIdx: 揃ったマスの番号の配列 (null ならハズレ表示) */
function renderReels(grid, winIdx, glow) {
  reelsEl.innerHTML = grid.map((key, i) => {
    const isWin = !!winIdx && winIdx.includes(i);
    const cls = winIdx ? (isWin ? 'win' : 'dim') : '';
    return `<div class="reel ${cls}" style="--i:${i}">${symbolHTML(key, isWin ? glow : '')}</div>`;
  }).join('');
  drawPayline(winIdx);
}

