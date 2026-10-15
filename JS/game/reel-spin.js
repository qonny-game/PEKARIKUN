// ==========================================
// JS/game/reel-spin.js  —  リール回転・目押し停止・予告・役の結果
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
/* ---------- リール回転: レバーONで回り、自分で3つ止める ---------- */
const OPT_KEY = 'pekari-opt-v1';
let AUTO_STOP = false;   // 自動停止 (目押しなし。7もスイカも必ず揃う)
try { AUTO_STOP = !!JSON.parse(localStorage.getItem(OPT_KEY) || '{}').autoStop; } catch (e) { /* 初期値 */ }
function saveOpt() { try { localStorage.setItem(OPT_KEY, JSON.stringify({ autoStop: AUTO_STOP })); } catch (e) { /* 無視 */ } }

const SPIN_SPEED = 28;    // 1秒に流れる図柄の数 (日本機と同じ: 80回転/分 = 1周0.75秒 = 21コマ/0.75秒)
const SLIP_MAX = 4;       // 目押し: 狙った図柄が中段の4コマ手前までなら引き込める
const CELL_H = 42;   // 絵柄1コマの高さ(px)。CSS の .reels / .reel-ov の高さと揃える
let reelSpin = null;
let isReelSpinning = false;
let reelLocked = false;   // 停止直後の誤タップ防止

function reelsPrepareDOM() {
  reelsEl.innerHTML = Array.from({ length: 9 }, (_, i) => `<div class="reel" style="--i:${i}"></div>`).join('');
}
const colSym = (col, idx) => (col.ov[idx] !== undefined ? col.ov[idx] : stripSym(col.c, idx));

function startReels(plan, onDone) {
  if (!naviOrder) delete spinBtn.dataset.navi;
  reelsPrepareDOM();
  bellBadge.classList.remove('show');
  alignDisplay.classList.remove('show-align');
  alignDisplay.classList.add('show-lose');
  gogoTextContainer.classList.add('opacity-0');
  const cols = [0, 1, 2].map(c => {
    const el = document.createElement('div');
    el.className = 'reel-ov';
    el.style.left = `${c * 66}px`;
    el.innerHTML = '<div class="reel"></div><div class="reel"></div><div class="reel"></div><div class="reel"></div>';
    reelsEl.appendChild(el);
    return { c, el, cells: [...el.children], pos: Math.random() * STRIP_LEN, state: 'spin', ov: {}, T: 0, t: 0, final: null, shown: [null, null, null, null] };
  });
  reelSpin = { plan, cols, onDone, last: performance.now(), raf: 0, color: null, timers: [], order: [] };
  isReelSpinning = true;
  spinBtn.disabled = false;
  spinBtn.innerText = spinBtn.dataset.navi ? `ストップ ${spinBtn.dataset.navi}` : 'ストップ';
  cols.forEach(drawOverlay);
  reelSpin.raf = requestAnimationFrame(reelFrame);
  if (AUTO_STOP || plan.auto) [0, 1, 2].forEach(c => reelSpin.timers.push(setTimeout(() => stopCol(c, true), 380 + c * 260)));
}

function drawOverlay(col) {
  const mid = Math.floor(col.pos);
  const f = col.pos - mid;
  for (let j = 0; j < 4; j++) {
    const k = 2 - j;                       // 上のはみ出し(2) / 上段(1) / 中段(0) / 下段(-1)
    const idx = mid + k;
    if (col.shown[j] !== idx) {
      col.cells[j].innerHTML = symbolHTML(colSym(col, idx), '');
      col.shown[j] = idx;
    }
    col.cells[j].style.transform = `translate3d(0,${(1 - k + f) * CELL_H}px,0)`;
  }
}

function reelFrame(now) {
  const rs = reelSpin;
  if (!rs) return;
  const dt = Math.min(0.05, (now - rs.last) / 1000);
  rs.last = now;
  rs.cols.forEach(col => {
    if (col.state === 'landed') return;
    col.pos += SPIN_SPEED * dt;
    if (col.state === 'slip' && col.pos >= col.T) { landCol(col); return; }
    drawOverlay(col);
  });
  if (rs.cols.every(col => col.state === 'landed')) { finishReels(); return; }
  rs.raf = requestAnimationFrame(reelFrame);
}

function landCol(col) {
  col.pos = col.T;
  col.state = 'landed';
  col.final = [colSym(col, col.T + 1), colSym(col, col.T), colSym(col, col.T - 1)];
  col.el.remove();
  const cells = reelsEl.querySelectorAll(':scope > .reel');
  col.final.forEach((k, r) => { cells[r * 3 + col.c].innerHTML = symbolHTML(k, ''); });
  playStopSound(col.c);
}

/* c番目のリールを止める。引き込める範囲(4コマ)で、役に合う位置を選ぶ */
function stopCol(c, auto) {
  const rs = reelSpin;
  if (!rs) return;
  if (rs.plan.auto) auto = true;     // ボーナスの7揃えは自動で揃う
  // 押し順ナビ付きのチェリー/スイカ: ナビ通りに止めれば取りこぼさない
  if (rs.plan.navi) {
    if (rs.naviOk === undefined) rs.naviOk = true;
    if (rs.plan.navi[rs.order.length] !== c) rs.naviOk = false;
    if (rs.naviOk) auto = true;
  }
  const col = rs.cols[c];
  if (!col || col.state !== 'spin') return;
  const s = Math.round(col.pos);
  const cands = [0, 1, 2, 3, 4].map(d => s + d);
  const p = rs.plan;
  let T = null, t = 0, tele = false;
  if (p.kind === 'fixed') {
    tele = true; t = p.ts[c];
  } else if (p.kind === 'melon') {
    if (c === 0) { tele = true; t = p.t0; }
    else if (c === 2) { tele = true; t = p.missed ? p.t2mid : p.t2; }
    else {
      const a = cands.find(x => stripSym(1, x + 1) === 'melon');   // 上段にスイカが来る位置
      if (a !== undefined) { T = a; t = mod(a); }
      else if (auto) { tele = true; t = mod(STRIPS[1].indexOf('melon') - 1); }
      else { p.missed = true; tele = true; t = p.t1miss; }   // 外し: 弱チャンス目の形で止まる（取りこぼし）
    }
  } else if (p.kind === 'sand') {   // サンド目: 第2リールを目押し (バー・チェリー・バー)。左右は自動
    if (auto || c !== 1) { tele = true; t = p.ts[c]; }
    else {
      const a = cands.find(x => windowOf(1, x).join() === 'bar,cherry,bar');
      if (a !== undefined) { T = a; t = mod(a); }
      else { T = cands[0]; t = mod(T); }   // 取りこぼし
    }
  } else if (p.kind === 'cherry') {   // チェリー: 左リールで狙う (取りこぼしあり)
    if (auto) { tele = true; t = p.ts[c]; }
    else if (c === 0) {
      const a = (p.strong ? cands.find(x => stripSym(0, x) === 'cherry') : cands.find(x => { const w = windowOf(0, x); return w.includes('cherry') && w[1] !== 'cherry'; }))
        ?? cands.find(x => windowOf(0, x).includes('cherry'));
      if (a !== undefined) { T = a; t = mod(a); }
      else {
        const ok = cands.filter(x => !windowOf(0, x).includes('cherry'));
        T = (ok.length ? ok : cands)[0]; t = mod(T);
      }
    } else {
      let pool = cands;
      const others = [0, 1, 2].filter(i => i !== c);
      if (others.every(i => rs.cols[i].state !== 'spin')) {
        const good = pool.filter(x => alignedLines(gridOf([0, 1, 2].map(i => (i === c ? mod(x) : rs.cols[i].t)))).length === 0);
        if (good.length) pool = good;
      }
      T = pool[0]; t = mod(T);
    }
  } else {   // seven: 同じ色の7を3つ揃える
    const want = rs.color;
    const a = cands.find(x => { const k = stripSym(c, x); return isSeven(k) && (!want || k === want); });
    if (a !== undefined) {
      T = a; t = mod(a);
      if (!rs.color) rs.color = stripSym(c, a);
    } else if (auto) {
      const color = want || SEVENS[Math.floor(Math.random() * 3)];
      tele = true; t = STRIPS[c].indexOf(color); rs.color = color;
    } else {
      let pool = cands.filter(x => c !== 0 || !windowOf(0, x).includes('cherry'));
      if (!pool.length) pool = cands;
      const others = [0, 1, 2].filter(i => i !== c);
      if (others.every(i => rs.cols[i].state !== 'spin')) {
        const good = pool.filter(x => alignedLines(gridOf([0, 1, 2].map(i => (i === c ? mod(x) : rs.cols[i].t)))).length === 0);
        if (good.length) pool = good;
      }
      T = pool[0]; t = mod(T);
    }
  }
  if (tele) {
    // 配列どおりの図柄(3コマ)が、4コマ先に流れてきて止まる
    T = Math.floor(col.pos) + SLIP_MAX;
    const w = windowOf(c, t);
    col.ov = { [T + 1]: w[0], [T]: w[1], [T - 1]: w[2] };
    col.shown = [null, null, null, null];
  }
  col.T = T; col.t = t; col.state = 'slip';
  rs.order.push(c);
  refreshNavi();
}

/* レバー/タップで、止まっていないリールを左から順に止める */
function stopNextReel() {
  if (!reelSpin) return;
  // 押し順ナビ中は、タップでもナビ通りの順に止まる
  if (naviOrder) {
    const nc = naviOrder.find(x => reelSpin.cols[x].state === 'spin');
    if (nc !== undefined) { stopCol(nc, false); return; }
  }
  const col = reelSpin.cols.find(x => x.state === 'spin');
  if (col) stopCol(col.c, false);
}
function stopByPointer(e) {
  const rs = reelSpin;
  if (!rs) return;
  const r = reelsEl.getBoundingClientRect();
  const c = Math.min(2, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 3)));
  if (rs.cols[c].state === 'spin') stopCol(c, false); else stopNextReel();
}

function finishReels() {
  const rs = reelSpin;
  reelSpin = null;
  isReelSpinning = false;
  rs.timers.forEach(clearTimeout);
  const f = rs.cols.map(col => col.final);
  const grid = [f[0][0], f[1][0], f[2][0], f[0][1], f[1][1], f[2][1], f[0][2], f[1][2], f[2][2]];
  let success = false;
  if (rs.plan.kind === 'seven') success = isSeven(f[0][1]) && f[1][1] === f[0][1] && f[2][1] === f[0][1];
  else if (rs.plan.kind === 'cherry') success = f[0].includes('cherry');
  else if (rs.plan.kind === 'melon') success = f[0][0] === 'melon' && f[1][0] === 'melon' && f[2][0] === 'melon';
  else if (rs.plan.kind === 'sand') success = f[1][0] === 'bar' && f[1][1] === 'cherry' && f[1][2] === 'bar';
  spinBtn.innerText = 'レバーON';
  reelLocked = true;
  setTimeout(() => { reelLocked = false; }, 300);
  setTimeout(() => rs.onDone({ grid, success, order: rs.order }), 220);
}

function cancelReels() {
  if (reelSpin) { cancelAnimationFrame(reelSpin.raf); reelSpin.timers.forEach(clearTimeout); }
  reelSpin = null;
  isReelSpinning = false;
  reelLocked = false;
}

/* 取りこぼし演出: 暗転 + 下降音 + 「取りこぼし」 */
function missEffect() {
  showAtToast('取りこぼし');
  atToast.classList.add('miss');
  cabinetEl.classList.remove('omen-miss');
  void cabinetEl.offsetWidth;
  cabinetEl.classList.add('omen-miss');
  pekaLater(() => cabinetEl.classList.remove('omen-miss'), 900);
  if (soundEnabled) {
    initAudio();
    const t0 = audioCtx.currentTime;
    [392, 330, 262, 196].forEach((f, i) => tone(f, t0 + i * 0.09, 0.22, 'sawtooth', 0.08));
  }
}

/* チェリー/スイカ成立時: リール回転の前に、筐体まわりのランプが光って予告する */
const cabinetEl = document.querySelector('.cabinet');
function omenOff() {
  if (cabinetEl) cabinetEl.classList.remove('omen', 'omen-melon', 'omen-cherry', 'omen-chance', 'omen-miss');
  sideLampOff();
}
const FAKE_OMEN_RATE = 0.07;   // ハズレ時のフェイク予告 (外れても予告だけ出ることがある)
/* 役ごとの予告: 弱は軽い(チェリー予告) / 強は重い(スイカ予告) */
/* 赤ランプ(チェリー予告)は、チェリー当選の確定か、ボーナス確定中のハズレ（矛盾）のときだけ */
const OMEN_OF = { cherryW: 'cherry', cherryS: 'cherry', melonW: 'melon', chanceW: 'chance', chanceS: 'chance' };
const OMEN_LAMP = LAMP_TABLE.omen;   // 予告の色（赤=チェリー / 緑=スイカ / 紫ピンク=チャンス目）
function omenThen(kind, go) {
  let shown = OMEN_OF[kind] === undefined ? kind : OMEN_OF[kind];
  if (kind === 'lose' && Math.random() < FAKE_OMEN_RATE) shown = pendingBonusType && Math.random() < 0.7 ? 'cherry' : 'melon';
  if (!OMEN_LAMP[shown]) { go(); return; }
  const melon = shown === 'melon', chance = shown === 'chance';
  reelLocked = true;                       // 予告の間はレバー/タップを受けない
  cabinetEl.classList.remove('omen', 'omen-melon', 'omen-cherry', 'omen-chance');
  void cabinetEl.offsetWidth;
  cabinetEl.classList.add('omen', melon ? 'omen-melon' : chance ? 'omen-chance' : 'omen-cherry');
  sideLampShow(OMEN_LAMP[shown]);
  if (soundEnabled) {
    initAudio();
    const t = audioCtx.currentTime;
    const notes = melon ? [392, 494, 587, 784, 988, 1175, 1568] : [880, 1109, 1319];
    notes.forEach((f, i) => tone(f, t + 0.08 + i * (melon ? 0.16 : 0.2), 0.2, 'triangle', 0.1));
    if (melon) tone(98, t, 1.2, 'sine', 0.18);
  }
  pekaLater(() => { reelLocked = false; go(); }, melon ? 1500 : 1000);   // ランプはリールが止まるまで点灯したまま
}

/* 役の抽選結果を持って回転開始。止まったら done(結果) */
function runRole(kind, done, navi) {
  clearChance();
  omenThen(kind, () => {
    const plan = planFor(kind);
    if (navi) { plan.navi = navi.order; showNavi(navi.order, navi.style); }
    startReels(plan, res => {
      omenOff();
      if (navi) {
        hideNavi();
        // 押し順がナビと違ったとき: 一言と下降音でわかるようにする
        if (res.order && res.order.some((c, i) => c !== navi.order[i])) {
          showAtToast('ナビ違い');
          if (soundEnabled) { initAudio(); const t0 = audioCtx.currentTime; [330, 247].forEach((f, i) => tone(f, t0 + i * 0.1, 0.18, 'triangle', 0.1)); }
        }
      }
      markWin(winIdxOf(kind, res.grid), '');
      markChance(kind, res.grid);
      done(res);
    });
  });
}
const naviFor = style => ({ order: [0, 1, 2].sort(() => Math.random() - 0.5), style });

/* 揃ったマスを光らせる / ほかを暗くする */
function markWin(winIdx, glow) {
  reelsEl.querySelectorAll(':scope > .reel').forEach((el, i) => {
    const w = !!winIdx && winIdx.includes(i);
    el.classList.toggle('win', w);
    el.classList.toggle('dim', !!winIdx && !w);
    const img = el.querySelector('.sym-img');
    if (img && glow) img.classList.toggle(glow, w);
  });
  drawPayline(winIdx);
}
/* チャンス目: 対象の絵柄だけ光らせ、ほかは暗くする (弱=スイカ / 強=7) */
function markChance(kind, grid) {
  const want = kind === 'chanceW' || kind === 'chanceS' ? 'melon' : null;   // チャンス目はスイカの絵柄だけ光らせる
  reelsEl.classList.toggle('has-chance', !!want);
  reelsEl.querySelectorAll(':scope > .reel').forEach((el, i) => {
    const sym = grid[i];
    el.classList.toggle('chance-sym', !!want && sym === want);
  });
}
function clearChance() {
  reelsEl.classList.remove('has-chance');
  reelsEl.querySelectorAll('.chance-sym').forEach(el => el.classList.remove('chance-sym'));
}
/* 揃ったラインを光る線で示す (チェリーは1コマなので線なし) */
function drawPayline(winIdx) {
  const old = reelsEl.querySelector(':scope > .payline');
  if (old) old.remove();
  if (!winIdx || winIdx.length < 3) return;
  const c = i => [(i % 3) * 66 + 33, Math.floor(i / 3) * CELL_H + CELL_H / 2];
  const [x1, y1] = c(winIdx[0]);
  const [x2, y2] = c(winIdx[winIdx.length - 1]);
  const dx = (x2 - x1) * 0.28, dy = (y2 - y1) * 0.28;   // 両端を少し延ばす
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'payline');
  svg.setAttribute('viewBox', `0 0 198 ${CELL_H * 3}`);
  const ln = document.createElementNS(ns, 'line');
  ln.setAttribute('x1', x1 - dx); ln.setAttribute('y1', y1 - dy);
  ln.setAttribute('x2', x2 + dx); ln.setAttribute('y2', y2 + dy);
  svg.appendChild(ln);
  reelsEl.appendChild(svg);
}

/* 回さずに、止まった状態で表示 (デバッグ用) */
function showStatic(g, winIdx, glow) {
  bellBadge.classList.remove('show');
  renderReels(g, winIdx, glow || '');
  alignDisplay.classList.remove('show-align');
  alignDisplay.classList.add('show-lose');
  gogoTextContainer.classList.add('opacity-0');
}

function playStopSound(c = 0) {
  if (!soundEnabled) return;
  initAudio();
  const t = audioCtx.currentTime;
  const k = [1, 1.06, 0.94][c] || 1;   // 左・中・右で音程をわずかに変える
  tone(180 * k, t, 0.07, 'square', 0.16);
  tone(90 * k, t, 0.1 + (c === 2 ? 0.04 : 0), 'sine', c === 2 ? 0.36 : 0.3);
}

