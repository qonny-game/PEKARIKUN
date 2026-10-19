/* AT中のポイントメーター(10個)と上乗せバトル
   レア役で+1P / 強レア役で+2〜3P / AT中のサンド目で G上乗せ + 3〜4P。10個たまると上乗せバトル(10G)。
   バトル: 10G以内に敵を倒せば G数を上乗せ。役ごとにダメージ。 */
(function () {
  const stage = document.getElementById('lcd-stage');
  if (!stage) return;
  let pt = 0, battle = null;
  const DMG = { lose: 0, replay: 1, bell: 1, cherryW: 2, melonW: 2, chanceW: 2, cherryS: 3, melon: 3, chanceS: 3, sand: 4 };
  const PT = { cherryW: 1, melonW: 1, chanceW: 1, cherryS: 2, melon: 2, chanceS: 3 };
  const WIN_G = [20, 30, 30, 50, 50, 100];
  /* 敵は5種類。期待度(★)が高いほど倒しやすい */
  const ENEMIES = [
    { n: 'DRAGON', s: 1, hp: 9, w: 30 }, { n: 'GOLEM', s: 2, hp: 8, w: 28 }, { n: 'WOLF', s: 3, hp: 7, w: 22 },
    { n: 'GOBLIN', s: 4, hp: 5, w: 13 }, { n: 'SLIME', s: 5, hp: 3, w: 7 }
  ];
  const stars = k => '\u2605'.repeat(k) + '\u2606'.repeat(5 - k);
  /* 敵のグラフィック (簡易SVG) */
  const SVG = {
    DRAGON: '<svg viewBox="0 0 100 100"><path d="M10 70 L30 30 L40 50 L60 20 L65 50 L90 40 L80 80 Q50 95 20 80Z" fill="#c0392b" stroke="#fff" stroke-width="3"/><circle cx="40" cy="58" r="5" fill="#ff0"/><circle cx="62" cy="58" r="5" fill="#ff0"/><path d="M35 75 L45 68 L50 75 L55 68 L65 75" fill="none" stroke="#fff" stroke-width="3"/></svg>',
    GOLEM: '<svg viewBox="0 0 100 100"><rect x="22" y="18" width="56" height="64" rx="8" fill="#7f8c8d" stroke="#fff" stroke-width="3"/><rect x="34" y="38" width="10" height="10" fill="#0ff"/><rect x="56" y="38" width="10" height="10" fill="#0ff"/><rect x="38" y="64" width="24" height="6" fill="#2c3e50"/></svg>',
    WOLF: '<svg viewBox="0 0 100 100"><path d="M18 20 L38 38 L62 38 L82 20 L88 60 Q50 98 12 60Z" fill="#5d6d7e" stroke="#fff" stroke-width="3"/><circle cx="38" cy="56" r="5" fill="#ff0"/><circle cx="62" cy="56" r="5" fill="#ff0"/><path d="M42 74 L50 80 L58 74" fill="none" stroke="#fff" stroke-width="3"/></svg>',
    GOBLIN: '<svg viewBox="0 0 100 100"><path d="M6 40 L28 46 L72 46 L94 40 L78 58 L78 78 Q50 92 22 78 L22 58Z" fill="#27ae60" stroke="#fff" stroke-width="3"/><circle cx="38" cy="60" r="5" fill="#fff"/><circle cx="62" cy="60" r="5" fill="#fff"/><path d="M38 76 L50 70 L62 76" fill="none" stroke="#fff" stroke-width="3"/></svg>',
    SLIME: '<svg viewBox="0 0 100 100"><path d="M50 18 Q86 30 88 74 Q88 86 74 86 L26 86 Q12 86 12 74 Q14 30 50 18Z" fill="#3ec6e0" stroke="#fff" stroke-width="3"/><circle cx="38" cy="56" r="5" fill="#123"/><circle cx="62" cy="56" r="5" fill="#123"/><path d="M42 68 Q50 76 58 68" fill="none" stroke="#123" stroke-width="3"/></svg>'
  };
  const BG = ['blue', 'yellow', 'green', 'red', 'purple'];   // 背景色 = 期待度 (青 < 黄 < 緑 < 赤 < 紫)
  const root = document.createElement('div');
  root.id = 'atp'; root.className = 'atp';
  root.innerHTML = '<div class="atp-row"><span class="atp-l" id="atp-l">POINT</span><span class="atp-c" id="atp-c"></span></div><div class="atp-hp" id="atp-hp"><i></i></div>';
  stage.appendChild(root);
  const helpBtn = document.createElement('button');   // ? ボタン: バトルの説明をもう一度見る
  helpBtn.type = 'button'; helpBtn.className = 'atp-helpbtn'; helpBtn.textContent = '?'; helpBtn.setAttribute('aria-label', '上乗せバトルの説明');
  root.appendChild(helpBtn);
  const cells = root.querySelector('#atp-c');
  for (let i = 0; i < 10; i++) cells.appendChild(document.createElement('b'));
  const lab = root.querySelector('#atp-l'), hpEl = root.querySelector('#atp-hp');
  const inAT = () => typeof atGames !== 'undefined' && atGames > 0 && !bonusRun && !window.isDebugRun;
  function render() {
    const on = inAT();
    root.classList.toggle('on', on);
    if (!on) { if (pt || battle) { pt = 0; battle = null; } removeEnemy(true); document.body.classList.remove('atp-fighting'); return; }
    root.classList.toggle('battle', !!battle);
    document.body.classList.toggle('atp-fighting', !!battle);   // バトル中: ペカり君と敵を画面中央に寄せる
    [...cells.children].forEach((c, i) => c.classList.toggle('lit', battle ? i < battle.left : i < pt));
    lab.textContent = battle ? `${battle.e.n} ${stars(battle.e.s)} ${battle.left}G` : 'POINT';
    if (battle) hpEl.firstChild.style.width = Math.max(0, battle.hp / battle.max * 100) + '%';
  }
  setInterval(render, 250);
  function banner(t, s, col, ms) { if (window.FXBanner) window.FXBanner(t, s || '', col || 'red', true, ms || 1800); }
  function addPt(n) {
    if (!inAT() || battle || pending || n <= 0) return;
    pt = Math.min(10, pt + n); render();
    if (pt >= 10) { pending = true; waitThenBattle(); }
  }
  /* バトルの説明 (タップで閉じる) */
  function showHelp(ms) {
    if (!stage || stage.querySelector('.atp-helpcard')) return;
    const E = document.createElement('div');
    E.className = 'atp-helpcard';
    E.innerHTML = `<div class="ah-t">上乗せバトル</div>
      <ul><li>ポイントが10個たまると開始</li><li>10G以内に敵のHPを0にすると、G数を上乗せ</li><li>役でダメージ: ベル・リプレイ 1 / 弱レア役 2 / 強レア役 3 / サンド目 4 / ハズレ 0</li><li>期待度(★)が高い敵ほど倒しやすい。背景色は 青 ＜ 黄 ＜ 緑 ＜ 赤 ＜ 紫 の順に期待大</li></ul>
      <div class="ah-c">タップで閉じる</div>`;
    const close = () => { E.remove(); clearTimeout(tm); };
    const tm = ms ? setTimeout(close, ms) : 0;
    E.addEventListener('pointerdown', ev => ev.stopPropagation());   // 液晶のタップ=レバーON/リール停止 にならないように
    E.addEventListener('click', close);
    stage.appendChild(E);
  }
  helpBtn.addEventListener('pointerdown', e => e.stopPropagation());   // ?を押してもレバーONにならない
  helpBtn.addEventListener('click', e => { e.stopPropagation(); const c = stage.querySelector('.atp-helpcard'); if (c) c.click(); else showHelp(0); });
  /* バトル中: 画面に敵を出して、ペカり君と戦っている感じにする */
  let enemyEl = null;
  function showEnemy(e) {
    removeEnemy(true);
    enemyEl = document.createElement('div');
    enemyEl.className = 'atp-enemy';
    enemyEl.innerHTML = SVG[e.n];
    stage.appendChild(enemyEl);
  }
  function removeEnemy(now, down) {
    const el = enemyEl; enemyEl = null;
    if (!el) return;
    if (now) { el.remove(); return; }
    el.classList.add(down ? 'down' : 'gone');
    setTimeout(() => el.remove(), 900);
  }
  function hitFx(dmg) {
    if (window.LCDX && LCDX.act) LCDX.act('jump');   // ペカり君が攻撃
    if (!enemyEl) return;
    enemyEl.classList.remove('hit'); void enemyEl.offsetWidth; enemyEl.classList.add('hit');
    const P = document.createElement('div');
    P.className = 'atp-dmg' + (dmg === 0 ? ' miss' : dmg >= 3 ? ' big' : '');
    P.textContent = dmg === 0 ? 'MISS' : '-' + dmg;
    enemyEl.appendChild(P);
    setTimeout(() => P.remove(), 900);
  }
  function intro(e, bg, withHelp) {
    if (!stage) return;
    const E = document.createElement('div');
    E.className = 'atp-intro bg-' + BG[bg];
    E.innerHTML = `<div class="ai-t">上乗せバトル</div><div class="ai-g">${SVG[e.n]}</div><div class="ai-n">${e.n}</div><div class="ai-s">期待度 ${stars(e.s)}</div>`;
    stage.appendChild(E);
    setTimeout(() => E.classList.add('out'), 2300);
    setTimeout(() => E.remove(), 2700);
    if (withHelp) setTimeout(() => showHelp(4500), 2750);
  }
  /* 上乗せ演出(サンド目・PUSH表示など)が終わってから、順番にバトルを始める */
  let pending = false;
  function waitThenBattle() {
    const busy = () => document.querySelector('.lcd-sandwin, .lcd-czwin, .lcd-bigintro') || (typeof isPushing !== 'undefined' && isPushing) || isSuspense || isCounting;
    const iv = setInterval(() => {
      if (!inAT()) { clearInterval(iv); pending = false; return; }
      if (busy()) return;
      clearInterval(iv); setTimeout(() => { pending = false; if (inAT() && !battle) startBattle(); }, 500);
    }, 300);
  }
  function startBattle() {
    let r = Math.random() * 100, e = ENEMIES[0];
    for (const x of ENEMIES) { if ((r -= x.w) < 0) { e = x; break; } }
    // 背景色: 基本は星と同じ。ときどき矛盾 (星1なのに紫 = 熱い / 星5なのに青 = 冷める)。背景のほうが高ければその期待度で戦う
    let bg = e.s - 1; const q = Math.random();
    if (q < 0.16 && bg < 4) bg = Math.min(4, bg + 1 + Math.floor(Math.random() * (4 - bg)));
    else if (q < 0.26 && bg > 0) bg = Math.floor(Math.random() * bg);
    const eff = ENEMIES[Math.max(bg, e.s - 1)].hp;
    battle = { left: 10, hp: eff, max: eff, e }; pt = 0; render();
    showEnemy(e);
    intro(e, bg, true);
  }
  function hit(kind) {
    if (!battle) return;
    const dmg = DMG[kind] || 0;
    battle.left--; battle.hp -= dmg; hitFx(dmg);
    if (battle.hp <= 0) {
      const g = WIN_G[Math.floor(Math.random() * WIN_G.length)];
      const G = typeof scaleG === 'function' ? scaleG(g) : g;
      battle = null; removeEnemy(false, true); render();
      banner('ENEMY DOWN', `+${G}G`, 'gold', 2200);
      atEnding = false;
      pushReveal(`+${G}G`, G >= 50, () => { atGames += G; updateAT(); });
    } else if (battle.left <= 0) {
      battle = null; removeEnemy(false, false); render();
      banner('BATTLE LOSE', '', 'blue', 1500);
    } else render();
  }
  window.atpAddPt = addPt;
  window.atpIntro = (i, bg) => intro(ENEMIES[i], bg);   // ガイド用スクリーンショット・確認用
  /* 役の結果: AT中のゲーム終了時 */
  const rr = runRole;
  runRole = function (kind0, done, navi) {
    const kind = /^bell/.test(kind0) ? 'bell' : kind0;   // 実際の種類は bell0/bell1/bell2 (直線・斜め)。ダメージは「ベル」としてまとめる
    return rr(kind0, function (res) {
      const wasAT = inAT();
      done(res);
      if (!wasAT) return;
      const ok = kind === 'lose' || kind === 'bell' || kind === 'replay' || kind === 'sand' || !res || res.success !== false;
      if (battle) { hit(ok ? kind : 'lose'); return; }
      if (ok && PT[kind]) addPt(PT[kind] === 2 ? 2 + (Math.random() < 0.4 ? 1 : 0) : PT[kind]);
    }, navi);
  };
  /* AT中のサンド目: 3〜4P */
  const sw = LCDX.sandWin;
  LCDX.sandWin = function (n) { sw(n); if (!battle && !pending) setTimeout(() => addPt(3 + (Math.random() < 0.5 ? 1 : 0)), 1200); };
  const sa = startAT;
  startAT = function () { pt = 0; battle = null; return sa.apply(this, arguments); };
})();
