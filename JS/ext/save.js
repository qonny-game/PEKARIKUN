/* =========================================================
   ゲーム状態の保存・復元 (save.js)  ※ 最後に読み込む
   - 自動保存: レバーが使える状態(どのレバー待ちでも)になるたびに保存。次に開いたとき続きから
   - 手動セーブ/ロード: メニューの「セーブ」「ロード」(スロット1つ)
   - 保存するもの: メダル・ゲーム数・CZ/AT/MOUNTAINの残り・ボーナス中の獲得枚数・ペカり中の状態・
     カウンタ・グラフの履歴・ポイントメーター・設定(手動セーブのみ)
   - PEKA MONEY は保存・ロードの対象外 (ロードで減らないように)
   ========================================================= */
(() => {
  'use strict';
  const STATE_KEY = 'pekari-state-v1';   // 自動保存 (ゲーム状態)
  const HIST_KEY = 'pekari-hist-v1';     // 自動保存 (グラフの履歴・ボーナス履歴)
  const SLOT_KEY = 'pekari-slot-v1';     // 手動セーブ (状態 + 履歴 + 設定)
  const SAVE_VER = 1;
  /* 手動セーブに一緒に入れる設定のキー */
  const SETTING_KEYS = ['pekari-settings-v5', 'pekari-opt-v1', 'pekari-auto-v1', 'pekari-fx-v1'];

  /* ---------- 保存する変数の一覧 (名前 / 読む関数 / 書く関数) ---------- */
  const VARS = {};
  const reg = (name, get, set) => { VARS[name] = { get, set }; };
  reg('totalGames', () => totalGames, v => { totalGames = v; });
  reg('cumulativeGames', () => cumulativeGames, v => { cumulativeGames = v; });
  reg('bigCount', () => bigCount, v => { bigCount = v; });
  reg('regCount', () => regCount, v => { regCount = v; });
  reg('atCount', () => atCount, v => { atCount = v; });
  reg('diffCoins', () => diffCoins, v => { diffCoins = v; });
  reg('currentShownCoins', () => currentShownCoins, v => { currentShownCoins = v; });
  reg('replayPending', () => replayPending, v => { replayPending = v; });
  reg('zenchoLeft', () => zenchoLeft, v => { zenchoLeft = v; });
  reg('zenchoTotal', () => zenchoTotal, v => { zenchoTotal = v; });
  reg('zenchoToCz', () => zenchoToCz, v => { zenchoToCz = v; });
  reg('fakeZencho', () => fakeZencho, v => { fakeZencho = v; });
  reg('fakeTotal', () => fakeTotal, v => { fakeTotal = v; });
  reg('latentLeft', () => latentLeft, v => { latentLeft = v; });
  reg('czLeft', () => czLeft, v => { czLeft = v; });
  reg('czNew', () => czNew, v => { czNew = v; });
  reg('czLoop', () => czLoop, v => { czLoop = v; });
  reg('atGames', () => atGames, v => { atGames = v; });
  reg('atType', () => atType, v => { atType = v; });
  reg('atSuper', () => atSuper, v => { atSuper = v; });
  reg('atEnding', () => atEnding, v => { atEnding = v; });
  reg('atRun', () => atRun, v => { atRun = v; });
  reg('atGrade', () => atGrade, v => { atGrade = v; });
  reg('modeGames', () => modeGames, v => { modeGames = v; });
  reg('modeMult', () => modeMult, v => { modeMult = v; });
  reg('cherryGames', () => cherryGames, v => { cherryGames = v; });
  reg('cherryM', () => cherryM, v => { cherryM = v; });
  reg('regBoostG', () => regBoostG, v => { regBoostG = v; });
  reg('atThrough', () => atThrough, v => { atThrough = v; });
  reg('sinceEnd', () => sinceEnd, v => { sinceEnd = v; });
  reg('pekaSpecial', () => pekaSpecial, v => { pekaSpecial = v; });
  reg('pendingBonusType', () => pendingBonusType, v => { pendingBonusType = v; });
  reg('pendingReg', () => pendingReg, v => { pendingReg = v; });
  reg('pendingZone', () => pendingZone, v => { pendingZone = v; });
  reg('pendingDisplayIndex', () => pendingDisplayIndex, v => { pendingDisplayIndex = v; });
  reg('pendingTierIndex', () => pendingTierIndex, v => { pendingTierIndex = v; });
  reg('pendingWhiteDiag', () => pendingWhiteDiag, v => { pendingWhiteDiag = v; });
  reg('pendingPlan', () => pendingPlan, v => { pendingPlan = v; });
  reg('bonusRun', () => bonusRun, v => { bonusRun = v; });
  reg('isPekared', () => isPekared, v => { isPekared = v; });
  reg('isBonusAligned', () => isBonusAligned, v => { isBonusAligned = v; });
  reg('alignStage', () => alignStage, v => { alignStage = v; });
  reg('sandLeft', () => sandLeft, v => { sandLeft = v; });
  reg('sandReachNow', () => sandReachNow, v => { sandReachNow = v; });
  reg('urMode', () => !!window.urMode, v => { window.urMode = !!v; });
  reg('roleStat', () => ({ ...roleStat }), v => { Object.keys(roleStat).forEach(k => { roleStat[k] = +v[k] || 0; }); });
  /* ウィンドウ上の演出フラグ (window.xxx) */
  const WIN_KEYS = ['czSevenColor', 'bonusSure', 'contraMixed', 'contraPair', 'wmNext', 'sevenMiss', 'pekaAt', 'pekaLit', 'sideAt', 'sideGogo', 'czFrozen'];
  WIN_KEYS.forEach(k => reg('win.' + k, () => window[k], v => { window[k] = v; }));

  const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const readJSON = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const removeKey = k => { try { localStorage.removeItem(k); } catch (e) { /* 無視 */ } };

  /* 現在の状態を、保存できる形で取り出す */
  function capture() {
    const vars = {};
    Object.keys(VARS).forEach(k => { vars[k] = clone(VARS[k].get()); });
    const ext = {
      atp: window.ATPX ? clone(window.ATPX.get()) : null,
      hamari: window.HAMARIX ? window.HAMARIX.get() : 0
    };
    return { v: SAVE_VER, app: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '', vars, ext };
  }
  /* 履歴 (グラフ・ボーナス履歴) は容量が大きいので別のキーに入れる */
  function captureHist() {
    return { h: gameHistory.map(p => [p.g, p.diff]), log: bonusLog.map(x => clone(x)) };
  }
  /* 保存した状態を読み戻す */
  function applyState(s, hist) {
    if (!s || s.v !== SAVE_VER || !s.vars) return false;
    Object.keys(VARS).forEach(k => {
      if (!(k in s.vars)) return;
      const v = s.vars[k];
      try { VARS[k].set(v === undefined ? undefined : v); } catch (e) { /* 壊れた項目は無視 */ }
    });
    // 読み込み直後は、回転や演出の途中状態を持ち越さない
    isReelSpinning = false; reelLocked = false; isCounting = false; isSuspense = false;
    isRushing = false; isPushing = false; isAtResult = false; isCooldown = false; isDebugRun = false;
    window.leverWaiting = false;
    if (hist && Array.isArray(hist.h)) {
      gameHistory.length = 0;
      hist.h.forEach(([g, diff]) => gameHistory.push({ g, diff }));
      bonusLog.length = 0;
      (hist.log || []).forEach(x => bonusLog.push(x));
    }
    if (s.ext) {
      if (window.ATPX && s.ext.atp) window.ATPX.set(s.ext.atp);
      if (window.HAMARIX) window.HAMARIX.set(s.ext.hamari || 0);
    }
    rebuildUI();
    return true;
  }

  /* 画面を、保存した状態のとおりに組み直す (音・演出は鳴らさない) */
  function rebuildUI() {
    updateUI();
    updateCherry();
    if (bonusRun) {
      const b = bonusRun;
      if (chanceLogo) {
        chanceLogo.querySelector('.cl-peka').innerHTML = b.zone ? 'PEKA<br>PEKA' : 'PEKA';
        chanceLogo.querySelector('.cl-chance').textContent = b.zone ? 'MOUNTAIN!' : 'CHANCE!';
        chanceLogo.classList.toggle('zone', !!b.zone);
        if (b.zone) setZoneLogoLevel(b.zlv || 0);
        chanceLogo.classList.add('on');
        chanceLogo.classList.toggle('judge', !!b.judgeDone && !b.zone && !!b.leverWait);
      }
      if (!b.zone) setAura(b.aura || 0);
    } else {
      setAura(null);
    }
    updateAT();
    // ペカり中: GOGO!ランプと、次に押す操作の表示
    if (isPekared && !isBonusAligned && pendingDisplayIndex >= 0) {
      const tier = BIG_TIERS[pendingDisplayIndex];
      gogoBox.className = `${GOGO_BASE} peka tier-${pendingDisplayIndex + 1}`;
      gogoBox.style.setProperty('--glow', tier.glow);
      gogoSubtext.textContent = tier.sub;
      gogoSubtext.style.opacity = '1';
    }
    if (alignStage === 1) { alignDisplay.classList.add('show-align'); }
    // レバーの文字
    if (isPekared && !isBonusAligned) spinBtn.innerText = alignStage === 1 ? 'NEXT' : '7を揃える (レバーON)';
    else if (replayPending) spinBtn.innerText = 'リプレイ (レバーON)';
    else spinBtn.innerText = 'レバーON';
    // 保存したのは「レバーが使える」状態。結果画面が出るべき場合は、その表示に任せる
    maybeShowAtResult();
    spinBtn.disabled = !!isAtResult;
    syncPanel();
  }

  /* ---------- 自動保存 ---------- */
  let lastSig = null;
  /* レバーが使える状態か (演出・回転・リザルトの途中ではない) */
  function leverReady() {
    return !!spinBtn && !spinBtn.disabled && !isReelSpinning && !reelLocked && !isCounting && !isSuspense &&
      !isRushing && !isPushing && !isAtResult && !isCooldown && !window.leverWaiting && !isDebugRun;
  }
  function autoSave() {
    if (!leverReady()) return;
    const s = capture();
    const sig = JSON.stringify(s);
    if (sig === lastSig) return;
    lastSig = sig;
    writeJSON(STATE_KEY, s);
    writeJSON(HIST_KEY, captureHist());
  }
  setInterval(() => { if (!document.hidden) autoSave(); }, 250);

  /* 起動時: 自動保存があれば続きから */
  (() => {
    const s = readJSON(STATE_KEY);
    if (!s) return;
    try {
      if (applyState(s, readJSON(HIST_KEY))) lastSig = JSON.stringify(capture());
    } catch (e) { /* 読めなければ新規扱い */ }
  })();

  /* データリセットのあとは、自動保存も消す (次に開いたとき元に戻らないように) */
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (totalGames === 0 && cumulativeGames === 0 && bigCount === 0 && atCount === 0 && diffCoins === 0 && !bonusRun && atGames === 0) {
      removeKey(STATE_KEY); removeKey(HIST_KEY); lastSig = null;
    }
  });

  /* ---------- 手動セーブ / ロード (メニュー) ---------- */
  const fmt = t => { const d = new Date(t); const p = n => String(n).padStart(2, '0'); return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  const anchor = document.getElementById('reset-btn');
  const mkBtn = (id, label) => {
    const b = document.createElement('button');
    b.type = 'button'; b.id = id; b.className = 'mm-item';
    if (anchor) anchor.parentNode.insertBefore(b, anchor);
    return b;
  };
  const saveBtn = mkBtn('save-btn', 'セーブ');
  const loadBtn = mkBtn('load-btn', 'ロード');
  function refreshBtns() {
    const slot = readJSON(SLOT_KEY);
    const at = slot && slot.savedAt ? fmt(slot.savedAt) : '未保存';
    saveBtn.innerHTML = '<span class="mm-label">セーブ</span>';
    loadBtn.innerHTML = `<span class="mm-label">ロード (${at})</span>`;
    loadBtn.disabled = !slot;
  }
  saveBtn.addEventListener('click', () => {
    if (!leverReady()) { showAtToast('レバーが使えるときにセーブできます'); return; }
    const slot = { v: SAVE_VER, savedAt: Date.now(), state: capture(), hist: captureHist(), settings: {} };
    SETTING_KEYS.forEach(k => { const raw = localStorage.getItem(k); if (raw !== null) slot.settings[k] = raw; });
    if (writeJSON(SLOT_KEY, slot)) showAtToast('セーブしました');
    else showAtToast('セーブできませんでした');
    refreshBtns();
  });
  loadBtn.addEventListener('click', () => {
    const slot = readJSON(SLOT_KEY);
    if (!slot) return;
    if (!confirm(`${fmt(slot.savedAt)} のセーブデータを読み込みますか？\n今の状態は上書きされます。`)) return;
    // 状態と設定を自動保存の場所に書いてから、ページを読み直して復元する
    writeJSON(STATE_KEY, slot.state);
    writeJSON(HIST_KEY, slot.hist);
    Object.keys(slot.settings || {}).forEach(k => { try { localStorage.setItem(k, slot.settings[k]); } catch (e) { /* 無視 */ } });
    location.reload();
  });
  refreshBtns();
  setInterval(() => { if (!document.hidden) refreshBtns(); }, 2000);

  window.GAMESAVE = { capture, applyState };   // デバッグ用
})();
