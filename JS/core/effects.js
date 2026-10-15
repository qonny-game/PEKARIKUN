// ==========================================
// JS/core/effects.js  —  画面演出（フラッシュ・パーティクル・シェイク）
// 読み込み順は index.html の <script> 並びどおり。グローバル変数で共有するので順序を変えない。
// ==========================================
// ==========================================
// 演出: フラッシュ / パーティクル / シェイク
// ==========================================
let flashTimer = null;
function triggerFlash() {
  clearTimeout(flashTimer);
  flashOverlay.classList.remove('flash-screen');
  void flashOverlay.offsetWidth; // アニメーション再始動
  flashOverlay.classList.add('flash-screen');
  flashTimer = setTimeout(() => flashOverlay.classList.remove('flash-screen'), 250);
}

function tripleFlash() {
  triggerFlash();
  setTimeout(triggerFlash, 100);
  setTimeout(triggerFlash, 200);
}

function shakeMain(ms) {
  mainEl.classList.add('shake-main');
  if (ms) setTimeout(() => mainEl.classList.remove('shake-main'), ms);
}

// パーティクル (金貨 / 紙吹雪)
let particles = [];
let particleMode = null; // 'gold' | 'mega' | null
let particleRAF = null;

function resizeCanvas() {
  // 粒子は液晶の中だけに出す（キャンバスは液晶と同じ大きさ）
  const r = (fxCanvas.parentElement || document.body).getBoundingClientRect();
  fxCanvas.width = Math.max(1, Math.round(r.width) || window.innerWidth);
  fxCanvas.height = Math.max(1, Math.round(r.height) || window.innerHeight);
}
if (window.ResizeObserver && fxCanvas.parentElement) new ResizeObserver(resizeCanvas).observe(fxCanvas.parentElement);
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function makeParticle(mode, x, y, vx, vy, g) {
  return {
    x, y, vx, vy, g,
    r: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    kind: mode === 'gold' ? 'coin' : 'confetti',
    color: mode === 'gold'
      ? (Math.random() < 0.7 ? '#ffd700' : '#fff3a0')
      : `hsl(${Math.floor(Math.random() * 360)}, 100%, 60%)`
  };
}

function drawParticle(p) {
  fxCtx.save();
  fxCtx.translate(p.x, p.y);
  if (p.kind === 'coin') {
    fxCtx.scale(Math.max(0.15, Math.abs(Math.cos(p.rot))), 1);
    fxCtx.beginPath();
    fxCtx.arc(0, 0, p.r * 1.3, 0, Math.PI * 2);
    fxCtx.fillStyle = p.color;
    fxCtx.fill();
    fxCtx.lineWidth = 2;
    fxCtx.strokeStyle = '#b8860b';
    fxCtx.stroke();
  } else {
    fxCtx.rotate(p.rot);
    fxCtx.fillStyle = p.color;
    fxCtx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
  }
  fxCtx.restore();
}

function tickParticles() {
  particleRAF = null;
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

  if (particleMode) {
    const n = particleMode === 'mega' ? 4 : 2;
    for (let k = 0; k < n; k++) {
      particles.push(makeParticle(
        particleMode,
        Math.random() * fxCanvas.width, -20,
        (Math.random() - 0.5) * 1.5, 2 + Math.random() * 3, 0
      ));
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    if (p.y > fxCanvas.height + 40 || p.x < -100 || p.x > fxCanvas.width + 100) {
      particles.splice(i, 1);
      continue;
    }
    drawParticle(p);
  }

  if (particleMode || particles.length) {
    particleRAF = requestAnimationFrame(tickParticles);
  }
}

function ensureParticleLoop() {
  if (!particleRAF) particleRAF = requestAnimationFrame(tickParticles);
}

function startParticles(mode) {
  particleMode = mode;
  ensureParticleLoop();
}

function burstParticles(mode, count) {
  const cx = fxCanvas.width / 2;
  const cy = fxCanvas.height * 0.45;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 4 + Math.random() * 9;
    particles.push(makeParticle(mode, cx, cy, Math.cos(a) * s, Math.sin(a) * s, 0.22));
  }
  ensureParticleLoop();
}

function stopParticles() {
  particleMode = null;
  particles = [];
  if (particleRAF) cancelAnimationFrame(particleRAF);
  particleRAF = null;
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
}

