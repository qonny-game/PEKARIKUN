/* =========================================================
   トロフィー / ミッション / ランキング (trophy.js)  ※ lcd.js のあとに読み込む
   - 各演出・各称号を見た回数に応じて、銅 / 銀 / 金のトロフィー
   - 経験値とレベル、毎日のミッション、連続プレイ日数
   - 記録ランキング (この端末内)
   ========================================================= */
(() => {
  'use strict';
  const KEY = 'pekari-tro-v1';
  const D = { c: {}, t: {}, xp: 0, last: '', streak: 0, days: 0, daily: null, lb: {} };
  try { Object.assign(D, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* 初期値 */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* 無視 */ } };
  const dateStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isDbg = () => (typeof isDebugRun !== 'undefined' && isDebugRun) || (typeof SETTINGS !== 'undefined' && SETTINGS.level === 7);

  /* ---------- トロフィーの定義 ---------- */
  const TIER_NAMES = ['銅', '銀', '金'];
  const TIER_COLORS = ['#cd7f32', '#cbd5e1', '#fcd34d'];
  const TIER_XP = [100, 300, 1000];
  const EFF_TH = [1, 10, 50], ACH_TH = [1, 5, 25];
  const EFF = {
    'cutin:blue': 'カットイン 青', 'cutin:red': 'カットイン 赤', 'cutin:gold': 'カットイン 金', 'cutin:rainbow': 'カットイン 虹',
    step: 'ステップアップ', talk: '会話予告', dark: '暗転予告', mujun: '矛盾演出', pseudo: '連続演出', saki: '先ペカ', rev: 'ガッカリからの逆転', tease: '消灯焦らし',
    don1: 'ドン', don2: 'ドンドン', don3: 'ドンドンドン 発展', navi_partial: '1だけナビ', chance_intro: 'PEKA! CHANCE! 表示', last_count: 'ラスト3G カウントダウン',
    zone: 'MOUNTAIN 突入', freeze: 'フリーズ', heaven: 'PEKA RUSH! HEAVEN!', death: 'PEKA RUSH! DEATH!', wrare: 'W RARE!', milestone: '差枚マイルストーン',
    'pv:parade': '予告 パレード', 'pv:button': '予告 ボタン', 'pv:roulette': '予告 ルーレット', 'pv:timer': '予告 タイマー', 'pv:crack': '予告 画面割れ', 'pv:rain': '予告 雨', 'pv:coin': '予告 コイン', 'pv:meter': '予告 メーター', 'pv:omikuji': '予告 おみくじ', 'pv:lamp': '予告 ランプ',
    'lcd:star': '液晶 流れ星', 'lcd:ufo': '液晶 UFO', 'lcd:rocket': '液晶 ロケット', 'lcd:balloon': '液晶 気球', 'lcd:rainbow': '液晶 虹',
    'lcd:coin': '液晶 コイン', 'lcd:firefly': '液晶 ホタル', 'lcd:bird': '液晶 鳥', 'lcd:flock': '液晶 鳥の群れ', 'lcd:bat': '液晶 コウモリ', 'lcd:leaf': '液晶 葉', 'lcd:whale': '液晶 クジラ', 'lcd:ripple': '液晶 波紋', bell3: 'ベルコンボ x3', replay3: 'リプレイ連続 x3', 'lcd:cloud': '液晶 雲', 'lcd:thunder': '液晶 雷雲', 'lcd:fire': '液晶 花火', 'lcd:chest': '液晶 宝箱', 'lcd:eye': '液晶 目'
  };
  const achName = id => { const a = (window.FX && FX.ACHS || []).find(x => x[0] === id); return a ? a[1] : id; };
  const nameOf = k => k.startsWith('ach:') ? achName(k.slice(4)) : (EFF[k] || k);
  const thOf = k => k.startsWith('ach:') ? ACH_TH : EFF_TH;
  const allKeys = () => [...Object.keys(EFF), ...((window.FX && FX.ACHS) || []).map(a => 'ach:' + a[0])];

  /* ---------- 経験値 / レベル ---------- */
  const lvOf = xp => Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2));
  const xpAt = l => 50 * l * (l - 1);
  const TITLES = ['見習い', 'ペカ好き', '常連', '熟練', '達人', '名人', '伝説', 'ペカり神'];
  const titleOf = l => TITLES[Math.min(TITLES.length - 1, Math.floor((l - 1) / 5))];
  function addXp(n) {
    const before = lvOf(D.xp);
    D.xp += n;
    const after = lvOf(D.xp);
    if (after > before) toast('LEVEL UP', `Lv.${after}  ${titleOf(after)}`, '#38bdf8', 'lv');
    refreshBtn();
  }

  /* ---------- トースト ---------- */
  const CUP = c => `<svg viewBox="0 0 32 32" width="30" height="30"><path d="M9 4h14v7a7 7 0 0 1-14 0z" fill="${c}" stroke="#fff" stroke-width="1.2"/><path d="M9 7H4q0 7 6 8M23 7h5q0 7-6 8" fill="none" stroke="${c}" stroke-width="2"/><rect x="14" y="17" width="4" height="6" fill="${c}"/><rect x="9" y="23" width="14" height="4" rx="1.5" fill="${c}" stroke="#fff" stroke-width="1"/></svg>`;
  const wrap = document.createElement('div');
  wrap.className = 'tro-wrap';
  (document.getElementById('lcd-stage') || document.body).appendChild(wrap);   // 液晶の中に出す
  const q = []; let showing = false;
  function toast(head, body, color, kind) { q.push({ head, body, color, kind }); if (!showing) next(); }
  function next() {
    const t = q.shift();
    if (!t) { showing = false; return; }
    showing = true;
    const e = document.createElement('div');
    e.className = 'tro-toast' + (t.kind === 'lv' ? ' lv' : '');
    e.style.setProperty('--tc', t.color);
    e.innerHTML = `${t.kind === 'lv' ? '' : CUP(t.color)}<div><b>${t.head}</b><span>${t.body}</span></div>`;
    wrap.appendChild(e);
    if (typeof soundEnabled !== 'undefined' && soundEnabled && typeof tone === 'function' && typeof audioCtx !== 'undefined' && audioCtx) {
      const t0 = audioCtx.currentTime; [784, 988, 1319, 1568].forEach((f, i) => tone(f, t0 + i * 0.07, 0.25, 'triangle', 0.1));
    }
    setTimeout(() => e.classList.add('out'), 2600);
    setTimeout(() => { e.remove(); next(); }, 3000);
  }

  /* ---------- 見た回数の記録 ---------- */
  const todaySeen = new Set();
  function seen(key) {
    if (isDbg()) return;
    D.c[key] = (D.c[key] || 0) + 1;
    const th = thOf(key);
    const cur = D.t[key] || 0;
    if (cur < 3 && D.c[key] >= th[cur]) {
      D.t[key] = cur + 1;
      toast(`トロフィー獲得 (${TIER_NAMES[cur]})`, nameOf(key), TIER_COLORS[cur]);
      addXp(TIER_XP[cur]);
      progress('trophy', 1);
    }
    if (!todaySeen.has(key)) { todaySeen.add(key); progress('fx', 1); }
    save();
  }

  /* ---------- 毎日のミッション ---------- */
  const MISSIONS = [
    { id: 'game', t: 'ゲームを回す', n: [50, 100, 200] }, { id: 'hit', t: 'ペカらせる', n: [1, 2, 3] }, { id: 'at', t: 'ATに突入する', n: [1, 2] },
    { id: 'fx', t: '違う種類の演出を見る', n: [5, 8, 12] }, { id: 'trophy', t: 'トロフィーを獲得する', n: [1, 2] }, { id: 'combo', t: 'ベルのコンボを出す', n: [10, 20] }
  ];
  function seedPick() {
    const s = dateStr(); let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pool = MISSIONS.slice(), out = [];
    for (let i = 0; i < 3; i++) { h = (h * 1103515245 + 12345) >>> 0; const m = pool.splice(h % pool.length, 1)[0]; out.push({ id: m.id, t: m.t, n: m.n[(h >> 8) % m.n.length], p: 0, done: false }); }
    return out;
  }
  function ensureDaily() {
    const today = dateStr();
    if (!D.daily || D.daily.date !== today) { D.daily = { date: today, tasks: seedPick(), all: false }; todaySeen.clear(); }
  }
  function progress(id, n) {
    ensureDaily();
    D.daily.tasks.forEach(t => {
      if (t.id !== id || t.done) return;
      t.p = (id === 'combo') ? Math.max(t.p, n) : t.p + n;
      if (t.p >= t.n) {
        t.done = true; t.p = t.n;
        toast('ミッション達成', `${t.t} ${t.n}`, '#4ade80');
        addXp(150);
        if (D.daily.tasks.every(x => x.done) && !D.daily.all) { D.daily.all = true; toast('本日のミッション完了', '経験値ボーナス', '#fde047'); addXp(300); }
      }
    });
  }

  /* ---------- ログイン (連続プレイ日数) ---------- */
  (function login() {
    ensureDaily();
    const today = dateStr();
    if (D.last === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    D.streak = D.last === dateStr(y) ? D.streak + 1 : 1;
    D.days++; D.last = today;
    save();
    setTimeout(() => { toast(`連続プレイ ${D.streak} 日目`, `経験値 +${20 * Math.min(D.streak, 7)}`, '#a78bfa'); addXp(20 * Math.min(D.streak, 7)); save(); }, 1500);
  })();

  /* ---------- ランキング (この端末の記録) ---------- */
  const CATS = [
    { id: 'maxdiff', n: '最大差枚', u: '枚' }, { id: 'atgain', n: 'AT 獲得枚数 (1回)', u: '枚' }, { id: 'atgames', n: 'AT ゲーム数 (1回)', u: 'G' },
    { id: 'chain', n: '最大連チャン', u: '連' }, { id: 'combo', n: '最大コンボ', u: '' }, { id: 'hamari', n: '最大ハマり', u: 'G' }
  ];
  const sid = 's' + Date.now();
  function rec(cat, v, key) {
    if (isDbg() || !(v > 0)) return;
    const arr = D.lb[cat] || (D.lb[cat] = []);
    let e = arr.find(x => x.k === key);
    if (e) { if (v <= e.v) return; e.v = v; e.t = Date.now(); }
    else { if (arr.length >= 5 && v <= arr[arr.length - 1].v) return; arr.push({ k: key, v, t: Date.now() }); }
    arr.sort((a, b) => b.v - a.v);
    if (arr.length > 5) arr.length = 5;
  }
  let prevG = 0, hamN = 0, maxDiffS = 0;
  setInterval(() => {
    if (isDbg()) return;
    if (typeof totalGames !== 'undefined') {
      if (totalGames < prevG) rec('hamari', prevG, `h${Date.now()}${hamN++}`);
      prevG = totalGames;
    }
    if (typeof diffCoins !== 'undefined' && diffCoins > maxDiffS) { maxDiffS = diffCoins; rec('maxdiff', maxDiffS, sid); }
    if (typeof atRun !== 'undefined' && atRun && !atRun.bonusOnly) {
      if (!atRun._id) atRun._id = 'a' + Date.now();
      rec('atgain', Math.max(0, diffCoins - atRun.startDiff), atRun._id);
      rec('atgames', atRun.games, atRun._id);
    }
    const st = window.FX && FX.st;
    if (st) { rec('chain', st.chain, sid); rec('combo', Math.max(st.bestCombo || 0, st.combo || 0), sid); progress('combo', st.combo || 0); }
    save();
  }, 1000);

  /* ---------- ゲーム進行のフック ---------- */
  const _rr = runRole;
  runRole = function (kind, done, navi) {
    if (!isDbg() && !bonusRun && !(window.FX && FX.don)) { progress('game', 1); D.xp += 1; }
    return _rr(kind, done, navi);
  };
  const _tp = triggerPekari;
  triggerPekari = function (...a) { if (!isDbg()) { progress('hit', 1); addXp(20); } return _tp.apply(this, a); };
  const _sa = startAT;
  startAT = function (...a) { if (!isDbg()) { progress('at', 1); addXp(50); } return _sa.apply(this, a); };

  /* ---------- 画面 ---------- */
  const modal = document.createElement('div');
  modal.id = 'tro-modal'; modal.className = 'modal';
  modal.innerHTML = '<div class="modal-card"><div class="modal-head"><span>記録</span><button type="button" data-close-modal aria-label="閉じる">&times;</button></div><div class="tro-tabs"><button data-tab="tro" class="on">トロフィー</button><button data-tab="mis">ミッション</button><button data-tab="rank">ランキング</button></div><div id="tro-body"></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('[data-close-modal]').addEventListener('click', () => modal.classList.remove('open'));
  let tab = 'tro';
  modal.querySelectorAll('.tro-tabs button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  const fmt = v => v.toLocaleString('ja-JP');
  const dt = ts => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };
  function render() {
    modal.querySelectorAll('.tro-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const body = document.getElementById('tro-body');
    const lv = lvOf(D.xp), cur = D.xp - xpAt(lv), need = xpAt(lv + 1) - xpAt(lv);
    const head = `<div class="tro-lv"><b>Lv.${lv}</b><span>${titleOf(lv)}</span><div class="tro-bar"><i style="width:${Math.min(100, cur / need * 100)}%"></i></div><small>次のレベルまで ${fmt(need - cur)} / 連続プレイ ${D.streak} 日 / 通算 ${D.days} 日</small></div>`;
    if (tab === 'tro') {
      const keys = allKeys();
      const tot = [0, 0, 0]; keys.forEach(k => { for (let i = 0; i < (D.t[k] || 0); i++) tot[i]++; });
      const rows = k => { const t = D.t[k] || 0, th = thOf(k), c = D.c[k] || 0; return `<div class="tro-row${t ? ' got' : ''}">${CUP(t ? TIER_COLORS[t - 1] : '#475569')}<div><b>${nameOf(k)}</b><span>${c} 回${t < 3 ? ` / 次は ${th[t]} 回` : ' / コンプリート'}</span></div><em style="color:${t ? TIER_COLORS[t - 1] : '#64748b'}">${t ? TIER_NAMES[t - 1] : '-'}</em></div>`; };
      body.innerHTML = head + `<div class="tro-sum">${TIER_NAMES.map((n, i) => `<span style="color:${TIER_COLORS[i]}">${n} ${tot[i]}</span>`).join('')}<span>合計 ${tot[0] + tot[1] + tot[2]} / ${keys.length * 3}</span></div>`
        + '<h4>演出</h4>' + Object.keys(EFF).map(rows).join('') + '<h4>称号</h4>' + keys.filter(k => k.startsWith('ach:')).map(rows).join('');
    } else if (tab === 'mis') {
      ensureDaily();
      body.innerHTML = head + '<h4>今日のミッション</h4>' + D.daily.tasks.map(t => `<div class="tro-row${t.done ? ' got' : ''}"><div><b>${t.t} ${t.n}</b><div class="tro-bar s"><i style="width:${t.p / t.n * 100}%"></i></div><span>${t.p} / ${t.n}</span></div><em style="color:${t.done ? '#4ade80' : '#64748b'}">${t.done ? '達成' : '経験値 150'}</em></div>`).join('')
        + `<p class="tro-note">3つすべて達成すると経験値ボーナス。ミッションは毎日入れ替わります。${D.daily.all ? '本日は完了しました。' : ''}</p>`;
    } else {
      body.innerHTML = head + '<p class="tro-note">この端末に保存された記録です。</p>' + CATS.map(c => {
        const a = D.lb[c.id] || [];
        return `<h4>${c.n}</h4>` + (a.length ? a.map((e, i) => `<div class="tro-rank"><i style="color:${TIER_COLORS[[2, 1, 0][i]] || '#94a3b8'}">${i + 1}</i><b>${fmt(e.v)}${c.u}</b><span>${dt(e.t)}</span></div>`).join('') : '<div class="tro-empty">記録なし</div>');
      }).join('');
    }
  }
  let btn = null;
  function refreshBtn() { if (btn) btn.innerHTML = `<span class="mm-label">記録 Lv.${lvOf(D.xp)}</span>`; }
  const anchor = document.getElementById('ach-btn') || document.getElementById('auto-opt-btn');
  if (anchor) {
    btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'tro-btn';
    btn.className = 'mm-item';
    anchor.parentNode.appendChild(btn);
    btn.addEventListener('click', () => { render(); modal.classList.add('open'); });
    refreshBtn();
  }
  window.TRO = { seen, event: progress, D };
})();
