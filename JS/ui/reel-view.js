// ==========================================
// JS/ui/reel-view.js  —  リール配列の表示
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
// ==========================================
// リール配列の表示
// ==========================================
const reelModal = document.getElementById('reel-modal');
const reelView = document.getElementById('reel-view');
function miniSym(k) {
  const fb = k === 'bar' ? '<span class=&quot;rv-txt rv-bar&quot;>BAR</span>' : k === 'replay' ? '<span class=&quot;rv-txt rv-replay&quot;>RE</span>' : isSeven(k) ? `<span class=&quot;rv-txt rv-${k}&quot;>7</span>` : `<span class=&quot;rv-emoji&quot;>${EMOJI[k] || ''}</span>`;
  return `<img class="rv-img" src="${ASSET_DIR.img}${k}.png" alt="${k}" draggable="false" onerror="this.outerHTML='${fb}'">`;
}
function buildReelView() {
  const names = ['左', '中', '右'];
  reelView.innerHTML = STRIPS.map((strip, c) => {
    const cells = [];
    for (let i = STRIP_LEN - 1; i >= 0; i--) {       // 上が先に流れ落ちてくる側。回転は下向き
      cells.push(`<div class="rv-cell"><i>${i + 1}</i>${miniSym(strip[i])}</div>`);
    }
    return `<div class="rv-col"><div class="rv-head">${names[c]}</div>${cells.join('')}</div>`;
  }).join('');
}
document.getElementById('reel-btn').addEventListener('click', () => { buildReelView(); openModal(reelModal); });


