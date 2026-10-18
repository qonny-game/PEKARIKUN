// ==========================================
// JS/ext/debug.js  —  デバッグモード（設定ボタンを 3→2→3→3→1→2→3 の順に押すと開く／もう一度で閉じる）
// 下パネルの下に DEBUG ボタンが出る。押すと演出の一覧。ボタンを押すと「次のレバーON」でその演出になる（予約）。
//   pre    : レバーON直後にその演出を出し、そのまま通常のゲームを回す（リールは演出が終わってから回る）
//   role   : 次のゲームの小役を強制する
//   direct : レバーONで、その演出を直接出す（ゲームは回さない）
// 読み込みは ext の最後。本体の関数を包んで使うだけで、デバッグを開かなければ何も変わらない。
// ==========================================
(function () {
  if (typeof handleSpin !== 'function' || typeof drawRole !== 'function') return;
  const DBG = window.DBG = { on: false, next: null, role: null };
  const noop = () => {};

  /* ---------- 小役の強制: 次の1回だけ drawRole の結果を差し替える ---------- */
  const _drawRole = drawRole;
  drawRole = function (inAT) {
    if (DBG.role) { const r = DBG.role; DBG.role = null; return r; }
    return _drawRole(inAT);
  };

  /* ---------- 全クリア: 表示中の演出と状態フラグを片づける ---------- */
  function clearAll() {
    DBG.role = null;
    document.querySelectorAll('.lcd-czwin, .lcd-sandwin, .lcd-zoneintro, .fx-cutin, .fx-step, .fx-talk, .fx-dark, .fx-banner, .fx-flash, .fx-pv').forEach(e => e.remove());
    window.czKeep = null; window.sideConfirm = false; window.czHoldNow = false; window.czFrozen = null;
    if (typeof czLeft !== 'undefined') czLeft = 0;
    try { if (window.LCDX && LCDX.clearAll) LCDX.clearAll(); } catch (e) { /* 表示だけ */ }
    try { sideLampOff(); hideNavi(); omenOff(); } catch (e) { /* 表示だけ */ }
    const ro = document.getElementById('rush-overlay'); if (ro) ro.classList.remove('show');
  }

  /* ---------- 直接出す系の下ごしらえ（debug.html の関数を本体に取り込み） ---------- */
  function debugStart(fx) {
    if (bonusRun || isRushing || isPushing || isAtResult || isSuspense || isReelSpinning) return;
    resetPekaState(); isDebugRun = true;
    pendingBonusType = 'BIG'; pendingDisplayIndex = 2; pendingTierIndex = 2;
    initAudio(); triggerPekari(fx);
  }
  function debugBonus(coins, level, atWin) {
    if (bonusRun || isRushing || isPushing || isAtResult || isSuspense || isPekared) return;
    initAudio(); beginBonus(makeBonusPlan(coins, { level, atWin, debug: true }));
  }
  const idle = () => !bonusRun && !isRushing && !isPushing && !isAtResult && !isSuspense && !isReelSpinning;

  /* ---------- 演出の一覧 ----------  [種類, ラベル, 実行] */
  const G = [];
  const grp = (name, items) => G.push({ name, items: items.filter(Boolean) });
  const pre = (label, fire) => ({ kind: 'pre', label, fire });
  const role = (label, r) => ({ kind: 'role', label, role: r });
  const direct = (label, fire) => ({ kind: 'direct', label, fire });

  if (window.FX && FX.debug) {
    const cut = { blue: '青(リプレイ)', red: '赤(チェリー)', gold: '金(当選)', rainbow: '虹(大当選)', yellow: '黄(ベル)', green: '緑(スイカ)' };
    const pvKeys = FX.PV ? Object.keys(FX.PV) : [];
    grp('予告（レバーONで出る）', [
      ...Object.keys(cut).map(c => pre('カットイン ' + cut[c], () => FX.debug.cutin(c, true))),
      pre('カットイン 白(成功)', () => FX.debug.cutin('white', true)),
      pre('カットイン 白(失敗)', () => FX.debug.cutin('white', false)),
      pre('ステップ 成功', () => FX.debug.step(true)), pre('ステップ 失敗', () => FX.debug.step(false)),
      pre('会話 成功', () => FX.debug.talk(true)), pre('会話 失敗', () => FX.debug.talk(false)),
      pre('暗転 成功', () => FX.debug.dark(true)), pre('暗転 失敗', () => FX.debug.dark(false)),
      ...pvKeys.map(k => pre('予告 ' + k, () => FX.PV[k](true, noop))),
      pre('バナー PEKA?!', () => FX.debug.banner('PEKA?!', '', 'red', true)),
      pre('バナー 連続演出', () => FX.debug.banner('連続演出 1/3', '', 'blue'))
    ]);
  }
  const RL = [['replay', 'リプレイ'], ['bell', 'ベル'], ['cherryW', '弱チェリー'], ['cherryS', '強チェリー'], ['melonW', '弱スイカ'], ['melon', '強スイカ'], ['chanceW', '弱チャンス目'], ['chanceS', '強チャンス目'], ['lose', 'ハズレ']];
  grp('小役を強制（次のゲーム）', RL.map(([k, l]) => role(l, k)));
  grp('ペカり・ランプ', [
    ...[['normal', '通常ペカ'], ['late', '後ペカ'], ['gakkun', 'ガックン'], ['hanabi', '花火ペカ'], ['double', 'Wペカ'], ['rainbow', '虹ペカ'], ['freeze', 'フリーズ風']].map(([id, l]) => direct(l, () => debugStart(id))),
    direct('左右ペカ(32G内)', () => sideLampShow('early')), direct('左右ペカ(天国)', () => sideLampShow('heaven')), direct('左右ペカ消灯', () => sideLampOff())
  ]);
  grp('CHANCE ZONE・BONUS確定', [
    pre('BONUSフラグ潜伏(矛盾が続く)', () => { latentLeft = 6; }),
    pre('前兆→CZ', () => { zenchoLeft = zenchoTotal = 4; zenchoToCz = true; fakeZencho = 0; }),
    direct('直AT', () => { if (idle() && !isPekared) directAT(); }),
    direct('直BIG (7/BELL 2択)', () => { if (idle() && !isPekared) { resetPekaState(); pendingBonusType = 'BIG'; pendingReg = false; pendingDisplayIndex = pendingTierIndex = 3; initAudio(); playDirectBig(); } }),
    direct('CZ突入(6G)', () => { czLeft = 6; czNew = true; }),
    direct('CZ突入 むげんLOOP', () => { czLeft = 6; czNew = true; czLoop = true; }),
    direct('CZ HOLD表示', () => { czLeft = 5; window.czHoldNow = true; }),
    direct('BONUS確定(画像)', () => { isDebugRun = false; if (window.onCzSuccess) window.onCzSuccess(); }),
    direct('CZ失敗(ゾーン終了)', () => { isDebugRun = false; if (window.onCzEnd) window.onCzEnd(false); })
  ]);
  grp('PEKA RUSH・MOUNTAIN', [
    direct('RUSH突入 +100G', () => { if (idle()) startAT(100, 0); }),
    direct('RUSH突入 HEAVEN', () => { if (idle()) startAT(100, 1); }),
    direct('RUSH突入 DEATH', () => { if (idle()) startAT(100, 2); }),
    direct('RUSH突入 SUPER', () => { if (idle()) startAT(100, 0, true); }),
    direct('RUSH突入 HEAVEN SUPER', () => { if (idle()) startAT(100, 1, true); }),
    direct('RUSH突入 DEATH SUPER', () => { if (idle()) startAT(100, 2, true); }),
    ...['青', '緑', '金', '虹'].map((n, lv) => direct('MOUNTAIN ' + n, () => { if (idle()) { initAudio(); beginBonus(makeBonusPlan(300, { zone: true, zlv: lv, atWin: false, level: 0, debug: true })); } })),
    direct('BIG BONUS 突入', () => { if (idle()) { initAudio(); beginBonus(makeBonusPlan(250, { atWin: false, level: 0, debug: true })); } }),
    direct('REG BONUS 突入', () => { if (idle()) { initAudio(); beginBonus(makeBonusPlan(regCoins(), { reg: true, atWin: false, level: 0, debug: true })); } }),
    direct('777ヒント(7を外し続けた時)', () => { if (idle() && window.onSevenHint) { window.czSevenColor = null; window.onSevenHint(); } }),
    direct('フリーズ→MOUNTAIN', () => { if (idle() && !isPekared) { initAudio(); freezeToZone(true); } })
  ]);
  grp('サンド目', [
    direct('サンド目 揃った演出', () => { sandFlash(); markWin([1, 4, 7], ''); if (window.LCDX && LCDX.sandWin) LCDX.sandWin(30); }),
    direct('サンド目 取りこぼし', () => missEffect()),
    direct('AT中サンド目(目押し)', () => { if (idle()) { atType = 0; atGames = Math.max(atGames, 30); updateAT(); playSand(); } })
  ]);
  grp('ボーナス消化・AT・結果', [
    ...AURA_NAMES.map((n, lv) => direct('消化 ' + n + '→AT', () => debugBonus(300, lv, true))),
    direct('消化 青→ハズレ', () => debugBonus(300, 0, false)),
    direct('チェリー', () => hitCherry(true, false)),
    direct('PUSH +10G', () => { if (!isPushing) pushReveal('+10G', false); }),
    direct('PUSH +100G', () => { if (!isPushing) pushReveal('+100G', true); }),
    ...HINT_LABELS.map((l, i) => direct('リザルト 示唆' + l, () => { if (!isAtResult) showAtResult({ gain: 1234, games: 50, bells: 21, bonuses: 1, hint: i }); })),
    direct('ボーナス終了リザルト', () => { if (!isAtResult) showAtResult({ gain: 300, games: 0, bells: 0, bonuses: 0, bonusOnly: true }); }),
    ...[222, 250, 444, 456, 666, 1000].map(n => direct(n + ' OVER', () => showOver(n))),
    ...TROPHIES.map((tr, i) => direct('トロフィー ' + tr.name, () => { if (!isAtResult) showAtResult({ gain: 800, games: 50, bells: 21, bonuses: 1, hint: 1, trophy: i + 1 }); })),
    direct('ベル 直線6枚', () => hitBell(0, true)), direct('ベル 左上から1枚', () => hitBell(1, true)), direct('ベル 左下から15枚', () => hitBell(2, true)),
    direct('ナビ 赤', () => showNavi([1, 2, 0], 'red')), direct('ナビ 紫', () => showNavi([2, 0, 1], 'purple')), direct('ナビ 消す', () => hideNavi())
  ]);

  /* ---------- 画面: 下パネルの下に DEBUG ボタン → 演出の一覧 ---------- */
  const css = document.createElement('style');
  css.textContent = `
    #dbg-dock { display: none; width: min(100%, 440px); margin: 8px auto 24px; padding: 0 8px; box-sizing: border-box; font-family: 'Noto Sans JP', sans-serif; color: #e5e7eb; }
    #dbg-dock.on { display: block; }
    #dbg-dock .dbg-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    #dbg-dock button { min-height: 34px; padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(167, 139, 250, .6); background: #1b1238; color: #e9d5ff; font-size: 12px; font-weight: 700; cursor: pointer; touch-action: manipulation; }
    #dbg-dock button:active { transform: translateY(1px); }
    #dbg-dock .dbg-main { background: #4c1d95; }
    #dbg-dock .dbg-state { flex: 1; min-width: 0; font-size: 12px; color: #fde68a; }
    #dbg-dock .dbg-list { margin-top: 8px; max-height: 56vh; overflow-y: auto; padding: 6px; border-radius: 10px; background: rgba(11, 7, 25, .92); border: 1px solid rgba(167, 139, 250, .4); }
    #dbg-dock .dbg-list[hidden] { display: none; }
    #dbg-dock .dbg-g { margin: 8px 0 4px; font-size: 11px; color: #a5b4fc; font-weight: 900; }
    #dbg-dock .dbg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
    #dbg-dock .dbg-grid button { font-size: 11px; line-height: 1.2; padding: 4px 2px; }
    #dbg-dock .dbg-grid button.sel { background: #b45309; border-color: #fde68a; color: #fff; }
  `;
  document.head.appendChild(css);

  const dock = document.createElement('div');
  dock.id = 'dbg-dock';
  dock.innerHTML = `<div class="dbg-bar"><button type="button" class="dbg-main" id="dbg-toggle">DEBUG ▼</button><span class="dbg-state" id="dbg-state">予約なし</span><button type="button" id="dbg-cancel" hidden>取消</button><button type="button" id="dbg-clear">演出クリア</button><button type="button" id="dbg-exit">終了</button></div><div class="dbg-list" id="dbg-list" hidden></div>`;
  const cab = document.querySelector('.cabinet');
  (cab && cab.parentNode ? cab.parentNode : document.body).insertBefore(dock, cab ? cab.nextSibling : null);
  const listEl = dock.querySelector('#dbg-list'), stateEl = dock.querySelector('#dbg-state'), cancelEl = dock.querySelector('#dbg-cancel');
  const KIND_NOTE = { pre: '次のレバーONで演出', role: '次のゲームでこの役', direct: '次のレバーONでこの演出' };
  const refresh = () => {
    stateEl.textContent = DBG.next ? `予約: ${DBG.next.label}（${KIND_NOTE[DBG.next.kind]}）` : '予約なし';
    cancelEl.hidden = !DBG.next;
    listEl.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b._e === DBG.next));
  };
  G.forEach(g => {
    const h = document.createElement('div'); h.className = 'dbg-g'; h.textContent = g.name; listEl.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'dbg-grid'; listEl.appendChild(grid);
    g.items.forEach(e => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = e.label; b._e = e;
      b.addEventListener('click', () => { DBG.next = DBG.next === e ? null : e; refresh(); });
      grid.appendChild(b);
    });
  });
  dock.querySelector('#dbg-toggle').addEventListener('click', e => { listEl.hidden = !listEl.hidden; e.currentTarget.textContent = listEl.hidden ? 'DEBUG ▼' : 'DEBUG ▲'; });
  cancelEl.addEventListener('click', () => { DBG.next = null; refresh(); });
  dock.querySelector('#dbg-clear').addEventListener('click', () => { DBG.next = null; clearAll(); refresh(); });
  dock.querySelector('#dbg-exit').addEventListener('click', () => window.toggleDebugMode(false));
  refresh();

  window.toggleDebugMode = function (force) {
    DBG.on = force === undefined ? !DBG.on : !!force;
    dock.classList.toggle('on', DBG.on);
    if (!DBG.on) { DBG.next = null; DBG.role = null; refresh(); }
    return DBG.on;
  };

  /* ---------- レバーON: 予約を実行する ---------- */
  const _hs = handleSpin;
  const canStart = () => !isReelSpinning && !isPushing && !isAtResult && !window.leverWaiting && !(window.FX && FX.busy > 0) && !reelLocked;
  handleSpin = function () {
    const e = DBG.on ? DBG.next : null;
    if (!e || !canStart()) { _hs(); return; }
    DBG.next = null; refresh();
    try { initAudio(); } catch (er) { /* 音なしでも続ける */ }
    if (e.kind === 'direct') { e.fire(); return; }                       // ゲームは回さず、演出だけ出す
    if (e.kind === 'role') { DBG.role = e.role; setTimeout(() => { DBG.role = null; }, 10000); }
    else e.fire();                                                         // 予告: 先に演出を出す（リールは演出が終わってから回る）
    const busy = window.FX ? FX.busy : 0;                                  // 演出の「待ち」でレバーが弾かれないよう、この呼び出しの間だけ解除
    if (window.FX) FX.busy = 0;
    try { _hs(); } finally { if (window.FX) FX.busy = Math.max(FX.busy, busy); }
  };
  spinBtn.removeEventListener('click', _hs);
  spinBtn.addEventListener('click', handleSpin);
})();
