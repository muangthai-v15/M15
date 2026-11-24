// ==UserScript==
// @name         Android TV Remote KeyCode Debugger
// @namespace    Violentmonkey Scripts
// @version      1.0.0
// @description  Overlay แสดง key / code / keyCode / which จากรีโมท Android TV แบบเรียลไทม์ — ใช้หาค่าปุ่มก่อนแมปในสคริปต์หลัก
// @author       Grok
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  if (window.__TV_KEY_DEBUG__) return;
  window.__TV_KEY_DEBUG__ = true;

  // Known Android / Leanback keyCodes (reference)
  const ANDROID_NAMES = {
    3: 'HOME',
    4: 'BACK',
    19: 'DPAD_UP',
    20: 'DPAD_DOWN',
    21: 'DPAD_LEFT',
    22: 'DPAD_RIGHT',
    23: 'DPAD_CENTER',
    24: 'VOLUME_UP',
    25: 'VOLUME_DOWN',
    26: 'POWER',
    27: 'CAMERA',
    62: 'SPACE',
    66: 'ENTER',
    82: 'MENU',
    84: 'SEARCH',
    85: 'MEDIA_PLAY_PAUSE',
    86: 'MEDIA_STOP',
    87: 'MEDIA_NEXT',
    88: 'MEDIA_PREVIOUS',
    89: 'MEDIA_REWIND',
    90: 'MEDIA_FAST_FORWARD',
    91: 'MUTE',
    126: 'MEDIA_PLAY',
    127: 'MEDIA_PAUSE',
    164: 'VOLUME_MUTE',
    166: 'CHANNEL_UP',
    167: 'CHANNEL_DOWN',
    183: 'PROG_RED',
    184: 'PROG_GREEN',
    185: 'PROG_YELLOW',
    186: 'PROG_BLUE',
    37: 'LEFT (desktop)',
    38: 'UP (desktop)',
    39: 'RIGHT (desktop)',
    40: 'DOWN (desktop)',
    8: 'BACKSPACE',
    13: 'ENTER (13)',
    27: 'ESCAPE',
    32: 'SPACE (32)',
    160: 'NUMPAD_ENTER'
  };

  const host = document.createElement('div');
  host.id = '__tv_key_debug_host';
  host.style.cssText = [
    'all: initial',
    'position: fixed',
    'inset: 0',
    'z-index: 2147483647',
    'pointer-events: none',
    'font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  ].join(';');

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    #panel {
      position: fixed;
      left: 24px;
      right: 24px;
      bottom: 24px;
      max-height: 42vh;
      background: rgba(8, 10, 16, 0.94);
      border: 2px solid #0a84ff;
      border-radius: 16px;
      color: #e8eef8;
      padding: 16px 20px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.55);
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    #title {
      font-size: 18px;
      font-weight: 700;
      color: #0a84ff;
      letter-spacing: 0.3px;
    }
    #hint {
      font-size: 13px;
      color: #9aa6b8;
    }
    #last {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      padding: 10px 14px;
      background: rgba(10, 132, 255, 0.18);
      border-radius: 10px;
      border: 1px solid rgba(10, 132, 255, 0.45);
      word-break: break-all;
      min-height: 1.4em;
    }
    #android {
      font-size: 16px;
      color: #7dffa3;
      font-weight: 600;
    }
    #log {
      font-size: 13px;
      line-height: 1.45;
      overflow-y: auto;
      max-height: 22vh;
      white-space: pre-wrap;
      color: #c5d0e0;
    }
    .row { opacity: 0.95; }
    .row.flash { color: #fff; }
  `;

  const panel = document.createElement('div');
  panel.id = 'panel';
  panel.innerHTML = `
    <div id="title">Android TV Remote KeyCode Debugger</div>
    <div id="hint">กดปุ่มบนรีโมททุกปุ่ม · ค่าจะโชว์ด้านล่าง · ปิดแท็บเมื่อเสร็จ</div>
    <div id="last">รอรับปุ่ม…</div>
    <div id="android"></div>
    <div id="log"></div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(panel);
  (document.body || document.documentElement).appendChild(host);

  const lastEl = shadow.getElementById('last');
  const androidEl = shadow.getElementById('android');
  const logEl = shadow.getElementById('log');
  const lines = [];
  const MAX = 40;

  function pad(n, w = 3) {
    return String(n).padStart(w, ' ');
  }

  function onKey(e) {
    const key = e.key ?? '';
    const code = e.code ?? '';
    const keyCode = e.keyCode ?? 0;
    const which = e.which ?? 0;
    const type = e.type;
    const name = ANDROID_NAMES[keyCode] || ANDROID_NAMES[which] || '—';

    // Don't block page while debugging (except optional)
    // e.preventDefault(); // uncomment if page steals keys

    const line =
      `[${type}] key=${JSON.stringify(key)}  code=${JSON.stringify(code)}  ` +
      `keyCode=${pad(keyCode)}  which=${pad(which)}  → ${name}`;

    lastEl.textContent = line;
    androidEl.textContent = name !== '—' ? `Android: ${name}` : 'Android: (unknown / desktop key)';

    lines.unshift(line);
    if (lines.length > MAX) lines.length = MAX;
    logEl.textContent = lines.join('\n');

    // Also console for remote inspection
    try {
      console.log('[TV-KEY]', {
        type,
        key,
        code,
        keyCode,
        which,
        android: name,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
        repeat: e.repeat
      });
    } catch (_) {}
  }

  const opts = { capture: true, passive: true };
  window.addEventListener('keydown', onKey, opts);
  window.addEventListener('keyup', onKey, opts);
  document.addEventListener('keydown', onKey, opts);
  document.addEventListener('keyup', onKey, opts);

  // Some TV WebViews only fire on body after focus
  const attachBody = () => {
    try {
      document.body?.addEventListener('keydown', onKey, opts);
      document.body?.addEventListener('keyup', onKey, opts);
    } catch (_) {}
  };
  if (document.body) attachBody();
  else document.addEventListener('DOMContentLoaded', attachBody, { once: true });

  console.log('[TV-KEY] Debugger active — press remote buttons');
})();
