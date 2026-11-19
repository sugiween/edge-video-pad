const SEEK_SEC = 5;
const HIDE_MS = 2500;

// candidates: [{area, visible, paused, ref}] -> ref | null
function pickTarget(candidates) {
  const vis = (candidates || []).filter((c) => c.visible);
  if (!vis.length) return null;
  const playing = vis.filter((c) => !c.paused);
  const pool = playing.length ? playing : vis;
  let best = pool[0];
  for (const c of pool) if (c.area > best.area) best = c;
  return best.ref;
}

function stepVolume(cur, delta) {
  const n = Math.round((cur + delta) * 100) / 100;
  return Math.min(1, Math.max(0, n));
}

function sendYtKey(yp, key, code, kc) {
  yp.dispatchEvent(new KeyboardEvent('keydown', {
    key, code, keyCode: kc, which: kc, bubbles: true, cancelable: true, composed: true,
  }));
}

function findTarget() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const cands = Array.from(document.querySelectorAll('video')).map((v) => {
    const r = v.getBoundingClientRect();
    const visible = r.width > 0 && r.height > 0 &&
      r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
    return { area: r.width * r.height, visible, paused: v.paused, ref: v };
  });
  return pickTarget(cands);
}

function init() {
  if (window.__videoPadInjected) return;
  window.__videoPadInjected = true;

  const host = document.createElement('div');
  host.setAttribute('data-video-pad', '1');
  host.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);margin:0;padding:0;border:0;background:transparent;pointer-events:none;z-index:2147483647;';
  for (const old of Array.from(document.querySelectorAll('[data-video-pad="1"]'))) {
    if (old !== host) old.remove();
  }
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    .pad { display: none; gap: 4px; padding: 4px;
      background: rgba(0,0,0,0.6); border-radius: 8px; }
    .pad.show { display: flex; }
    button { width: 36px; height: 36px; font-size: 18px; pointer-events: auto; color: #fff;
      background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.4);
      border-radius: 6px; cursor: pointer; }
    button:hover { background: rgba(255,255,255,0.25); }`;
  const pad = document.createElement('div');
  pad.className = 'pad';

  const volume = (delta, key, code, kc) => {
    const v = findTarget(); if (!v) return;
    const yp = v.closest('.html5-video-player');
    if (yp) sendYtKey(yp, key, code, kc);
    else v.volume = stepVolume(v.volume, delta);
  };
  const actions = {
    volUp: () => volume(0.05, 'ArrowUp', 'ArrowUp', 38),
    volDown: () => volume(-0.05, 'ArrowDown', 'ArrowDown', 40),
    ytFull: () => {
      try {
        if (document.fullscreenElement) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); return; }
        const v = findTarget(); if (!v) return;
        const yp = v.closest('.html5-video-player');
        if (yp) { sendYtKey(yp, 'f', 'KeyF', 70); return; }
        const p = v.parentElement.requestFullscreen(); if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    },
    back: () => { const v = findTarget(); if (v) v.currentTime = Math.max(0, v.currentTime - SEEK_SEC); },
    toggle: () => {
      const v = findTarget(); if (!v) return;
      if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      else v.pause();
    },
    fwd: () => {
      const v = findTarget(); if (!v) return;
      let t = v.currentTime + SEEK_SEC;
      if (Number.isFinite(v.duration)) t = Math.min(t, v.duration);
      v.currentTime = t;
    },
    full: () => {
      if (document.fullscreenElement) {
        try { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
        return;
      }
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          const p = chrome.runtime.sendMessage({ type: 'toggleFullscreen' });
          if (p && p.catch) p.catch(() => {});
        }
      } catch (e) {}
    },
  };
  const defs = [
    ['⏯', '再生・停止', 'toggle'],
    ['←', '5秒戻る', 'back'],
    ['→', '5秒進む', 'fwd'],
    ['↑', '音量を上げる', 'volUp'],
    ['↓', '音量を下げる', 'volDown'],
    ['F', 'プレーヤー全画面 (F)', 'ytFull'],
    ['⛶', '全画面切替 (F11)', 'full'],
  ];
  for (const [label, title, key] of defs) {
    const b = document.createElement('button');
    b.textContent = label;
    b.title = title;
    for (const ev of ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick']) {
      b.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (ev === 'click') actions[key]();
      });
    }
    pad.appendChild(b);
  }
  root.append(style, pad);
  const ensureParent = () => {
    try {
      const want = document.fullscreenElement || document.documentElement;
      if (host.parentNode !== want) want.appendChild(host);
    } catch (e) {}
  };
  ensureParent();

  let timer = null, hovering = false;
  const hide = () => { pad.classList.remove('show'); hovering = false; clearTimeout(timer); };
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (!hovering) hide(); }, HIDE_MS);
  };
  pad.addEventListener('mouseenter', () => { hovering = true; clearTimeout(timer); });
  pad.addEventListener('mouseleave', () => { hovering = false; arm(); });

  document.addEventListener('fullscreenchange', ensureParent);

  let lastCheck = 0, lastHas = false;
  document.addEventListener('mousemove', () => {
    const now = Date.now();
    if (now - lastCheck >= 200) { ensureParent(); lastHas = !!findTarget(); lastCheck = now; }
    if (!lastHas) { hide(); return; }
    pad.classList.add('show');
    arm();
  }, { capture: true, passive: true });
}

if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined') module.exports = { pickTarget, stepVolume };
