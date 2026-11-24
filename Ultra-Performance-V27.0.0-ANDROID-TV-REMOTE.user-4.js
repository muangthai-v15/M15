// ==UserScript==
// @name         Ultra Performance V27.2.0 (ANDROID TV REMOTE · NATIVE-FS FIX)
// @namespace    Violentmonkey Scripts
// @version      27.2.0
// @description  Android TV remote. Prefer Native Fullscreen (no URL bar); body-level focus-sink + capture keys so D-pad works after FS. Pseudo fallback if native blocked. keyCode 37-40 / Enter 13 / Ch 33-34.
// @author       Senior JavaScript Engineer & 404тнєвσσм
// @match        *://*/*
// @allFrames    true
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const KEY = '__TM_VIDEO_CONTROLLER_V270_TV__';
  const pageWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  if (window[KEY] || pageWin[KEY]) return;
  window[KEY] = true;
  try { pageWin[KEY] = true; } catch (_) {}

  // Fast-exit for tiny tracking/ad iframes
  if (window !== window.top) {
    try {
      if (window.innerWidth > 0 && window.innerHeight > 0 && window.innerWidth < 40 && window.innerHeight < 40) {
        return;
      }
    } catch (_) {}
  }

  const instanceId = Math.random().toString(36).slice(2, 10);
  let lastRecoveryTime = 0;

  const CFG = {
    schemaVersion: 270,
    hideDelay: 4500,
    seekStep: 30,
    seekStepHold: 10,          // per tick while holding ←/→
    holdRepeatMs: 180,
    maxDepth: 7,
    minMainVideoDurationSec: 240,
    bestVideoCacheMs: 400,
    adWatchIntervalMs: 1200,
    ajaxTimeoutMs: 4200,
    shadowHostId: '__tmv270_host',
    overlayId: '__tmv270_overlay',
    hostStyleId: '__tmv270_host_style',
    recoveryHostId: '__tmv270_rec_host',
    recoveryId: '__tmv270_recovery',
    hostAttr: 'data-tmv270-host',
    pseudoAttr: 'data-tmv270-pseudo',
    parentIframeFsAttr: 'data-tmv270-iframe-fs',
    parentWrapFsAttr: 'data-tmv270-wrap-fs',
    videoAttr: 'data-tmv270-video',
    fitAttr: 'data-tmv270-fit',
    lockScrollAttr: 'data-tmv270-noscroll',
    titleType: '__TMV270_TITLE__',
    prefKey: '__tmv270_prefs__',
    resumeKey: '__tmv270_resume__',
    epScrollKey: '__tmv270_ep_scroll__',
    autoFsBridgeKey: '__tmv270_autofs_bridge__'
  };

  const ASPECT_MODES = [
    { key: 'contain', label: 'พอดีจอ (Contain)' },
    { key: 'cover', label: 'เต็มจอ (Cover)' },
    { key: 'fill', label: 'ยืดเต็มจอ (Stretch)' }
  ];

  const SVG = {
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" stroke="none"/>',
    back: '<path d="M12.5 3a9 9 0 1 0 8.7 6.6M12.5 3V7M12.5 3L8.5 3"/><text x="12" y="15.5" font-size="7.5" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none" class="v270-seek-txt">30</text>',
    next: '<path d="M11.5 3a9 9 0 1 1-8.7 6.6M11.5 3V7M11.5 3L15.5 3"/><text x="12" y="15.5" font-size="7.5" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none" class="v270-seek-txt">30</text>',
    nextEp: '<polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    aspect: '<rect x="2.5" y="2.5" width="19" height="19" rx="5"/><path d="M7.5 16.5 16.5 7.5M11.5 7.5h5v5M12.5 16.5h-5v-5"/>',
    rocket: '<path d="M3.6 16.2A9.5 9.5 0 0 1 12 2.5"/><path d="M21.5 12a9.5 9.5 0 0 1-15.9 7l4-4"/><path d="M10.2 11.2 7 10.5 8.5 8h3.7c2.8-2.8 5.2-3.3 7-3.2.1 1.8-.4 4.2-3.2 7v3.7l-2.5 1.5-.7-3.2"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M10.91 2.46L13.09 2.46L13.61 4.98L15.65 5.83L17.98 4.49L19.51 6.02L18.17 8.35L19.02 10.39L21.54 10.91L21.54 13.09L19.02 13.61L18.17 15.65L19.51 17.98L17.98 19.51L15.65 18.17L13.61 19.02L13.09 21.54L10.91 21.54L10.39 19.02L8.35 18.17L6.02 19.51L4.49 17.98L5.83 15.65L4.98 13.61L2.46 13.09L2.46 10.91L4.98 10.39L5.83 8.35L4.49 6.02L6.02 4.49L8.35 5.83L10.39 4.98Z"/>',
    exit: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>',
    enter: '<path d="M8 3H5a2 2 0 0 0-2 2v3M18 3h3a2 2 0 0 1 2 2v3M18 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14"/>',
    mute: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="m17 9 5 6m0-6-5 6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><circle cx="12" cy="16" r="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><circle cx="12" cy="16" r="1.5"/><path d="M8 11V7a4 4 0 0 1 7.8-1.2"/>'
  };

  const RX = {
    whitespace: /\s+/g,
    siteSuffix: /\s*[-|–—]\s*(YouTube|Netflix|Facebook|EPORNER|XVIDEOS(\.COM)?|PORNHUB(\.COM)?|Bilibili|Twitch|320HD\w*|123-HD\w*|037HD\w*|24-HD\w*|Nung2HD\w*|Bugaboo\w*|WeTV\w*|iQIYI\w*|Viu\w*|ANIME-HIT\w*|HIT-ANIME\w*|ANIME-DEE\w*).*$/i,
    thaiSuffix: /\s+(ดูหนังออนไลน์|ดูซีรี่ย์ฟรี|ดูซีรีย์ฟรี|ดูซีรี่ย์ออนไลน์|ดูหนังฟรี|ซับไทย|พากย์ไทย|เต็มเรื่อง)\s*[a-zA-Z0-9.-]*$/i,
    thaiPrefix: /^(?:ดูหนังออนไลน์|ดูหนังฟรี|ดูหนัง|ดูซีรี่ย์ออนไลน์|ดูซีรีย์ออนไลน์|ดูซีรีส์ออนไลน์|ดูซีรี่ย์|ดูซีรีย์|ดูซีรีส์|ดูการ์ตูน|ดูอนิเมะ|ดูละคร)(?:จีน|เกาหลี|ฝรั่ง|ญี่ปุ่น|ไทย|เอเชีย|พากย์ไทย|ซับไทย)?(?:\s*[-–—:]\s*|\s+)/i,
    epSuffix: /\s*(?:[-–—|:•]\s*)?(?:Season\s*\d+\s*)?(?:EP\.?|Episode|ตอน(?:ที่)?|บทที่)\s*\d+(?:\.\d+)?(?:\s*[-–—~ถึง/]\s*\d+)?(?:\s*\(?จบ\)?|\s*END)?.*$/i,
    epRange: /(?:EP\.?|Episode|ตอน(?:ที่)?|บทที่)\s*0*(\d{1,4})\s*[-–—~ถึง]\s*0*(\d{1,4})/i,
    epFraction: /(?:EP\.?|Episode|ตอน(?:ที่)?|บทที่)\s*0*(\d{1,4})(?:\.\d+)?\s*\/\s*\d{1,4}/i,
    epExplicit: /(?:EP\.?|Episode|E|ตอน(?:ที่)?|บทที่|ซีซั่นที่\s*\d+\s*ตอน(?:ที่)?)\s*[-:#.]?\s*0*(\d{1,4}(?:\.\d+)?)(?!\s*[-–—~ถึง]\s*\d|\d)/i,
    epBracket: /[\[(]\s*0*(\d{1,4}(?:\.\d+)?)\s*[\])]/,
    epNumOnly: /^(?:[-•#]\s*)?0*(\d{1,4}(?:\.\d+)?)(?:\s*(?:\(?จบ\)?|END|ซับไทย|พากย์ไทย|Sub|Thai|HD|Full))?$/i,
    epUrl: /(?:[-_/]|^)(?:ep|episode|e|ton|part)[-_]?0*(\d{1,4})(?:[-_/.]|$)/i,
    epUrlQuery: /[?&](?:ep|episode|part|id_ep)=0*(\d{1,4})(?:&|$)/i,
    resolutionGuard: /^(?:240|360|480|720|1080|1440|2160|4320)p?$/i,
    serverGuard: /(?:server|สำรอง|ตัวเล่น|player|vip|หลัก|พากย์|ซับ)\s*\d*$/i,
    nextKeyword: /^(?:next\s*ep|next\s*episode|ตอนถัดไป|ตอนต่อไป|ตอนต่อไป\s*»|»\s*ตอนถัดไป|ถัดไป|ตอนหน้า)$/i,
    adBannerHint: /(?:banner|ads|ad-|sponsor|vip168|ufa|bet|casino|slot|baccarat|game88|โฆษณา|ป้ายโฆษณา)/i
  };

  const EP_CONTAINER_SEL = '[class*="ep"], [id*="ep"], [class*="episode"], [id*="episode"], [class*="list"], [class*="playlist"], [class*="season"], .les-content, .episodelist, .halim-list-eps, .b-list, .list-eps, .episode, [class*="episode-list"], [class*="ep-list"]';
  const PLAYER_AREA_SEL = '.player-embed, .video-embed, #player, #video-player, .player-box, .play-box, .halim-player, .dooplay_player, .movie-player, .embed-responsive, .video-container, .player-container, [id*="player-"], [class*="player-wrap"]';
  const AD_SKIP_SEL = '.jw-skip, .vjs-skip-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, [class*="skip-ad"], [class*="skip_ad"], [id*="skip-ad"], [id*="skip_ad"], [class*="ad-skip"]';
  const BIG_PLAY_SEL = '.jw-icon-display, .jw-display-icon-container, .vjs-big-play-button, .plyr__control--overlaid, .dplayer-bezel-icon, .art-state, .fp-play';

  const state = {
    video: null,
    lastActiveVideo: null,
    container: null,
    shadowHost: null,
    shadowRoot: null,
    overlay: null,
    refs: null,
    abort: null,
    videoAbort: null,
    videoObserver: null,
    containerObserver: null,
    observerRaf: 0,
    hideTimer: 0,
    settingsHideTimer: 0,
    recoveryHideTimer: 0,
    hudTimer: 0,
    epScrollTimer: 0,
    autoPlayPollTimer: 0,
    adWatchTimer: 0,
    progressFrame: 0,
    holdTimer: 0,
    holdInterval: 0,
    wakeLock: null,
    locked: false,
    seeking: false,
    destroyed: false,
    pseudoFullscreen: false,
    orientationLocked: false,
    originalVideo: null,
    originalPosition: null,
    changedPosition: false,
    createdWrapper: null,
    lastVolume: 1,
    aspectIndex: 0,
    brightness: 1,
    savedSpeed: 1,
    minSpeed: 0.5,
    maxSpeed: 2,
    seekStep: 30,
    resumeEnabled: true,
    autoNextEnabled: true,
    debugEnabled: false,
    debugLogs: [],
    lastSaveSecond: -1,
    lastKnownGoodTime: 0,
    lastHealAttemptTs: 0,
    healRetryCount: 0,
    lastAutoNextTriggerTs: 0,
    nearEndTriggeredSig: '',
    expectingSeamlessEpisode: false,
    isSkippingAd: false,
    lastDiskFlushTime: 0,
    resumeDirty: false,
    resumeCache: null,
    cachedKeysVideo: null,
    cachedKeysSrc: '',
    cachedKeysList: null,
    lastResumedSignature: '',
    cachedTitle: '',
    lastRawDocTitle: '',
    currentEp: '',
    // Focus system (TV)
    focusables: [],
    focusIndex: 0,
    focusGroup: 'main',          // main | settings | recovery
    settingsOpen: false,
    focusSink: null,             // always-focused element for TV key delivery
    focusGuardTimer: 0,          // re-assert focus while overlay active
    lastKeyTs: 0,                // debounce double key delivery
    lastKeySig: '',
    // Hold key
    holdKey: null,
    holdStarted: 0,
    // Performance
    bestVideoCache: null,
    bestVideoCacheTs: 0,
    bestVideoCacheRoot: null,
    adWatchActive: false,
    lastProgressUpdateTs: 0
  };

  const origReqFS = typeof Element !== 'undefined' ? (
    Element.prototype.requestFullscreen ||
    Element.prototype.webkitRequestFullscreen ||
    Element.prototype.mozRequestFullScreen
  ) : null;

  const isVideo = el =>
    typeof HTMLVideoElement !== 'undefined' && (el instanceof HTMLVideoElement || el?.tagName === 'VIDEO');

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const formatSpeed = val => `${Number(Number(val).toFixed(2))}x`;
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${SVG[name] || ''}</svg>`;

  /* =========================================================
     0. DEBUG + HYBRID STORAGE
  ========================================================= */

  function dbg(tag, msg) {
    if (!state.debugEnabled) return;
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const line = `[${ts}] [${tag}] ${msg}`;
    state.debugLogs.push(line);
    if (state.debugLogs.length > 20) state.debugLogs.shift();
    renderDebugConsole();
  }

  function renderDebugConsole() {
    const box = state.refs?.debugBox;
    const body = state.refs?.debugBody;
    const headTxt = state.refs?.debugHeadTxt;
    if (!box) return;
    if (!state.debugEnabled) {
      box.classList.remove('active');
      return;
    }
    box.classList.add('active');
    const v = state.video;
    const res = v ? `${v.videoWidth || 0}x${v.videoHeight || 0}` : 'no-vid';
    const rate = v ? formatSpeed(v.playbackRate || 1) : '-';
    if (headTxt) headTxt.textContent = `TV REMOTE V27 (${res} | ${rate})`;
    if (body) {
      body.textContent = state.debugLogs.join('\n');
      body.scrollTop = body.scrollHeight;
    }
  }

  const hasGMStorage = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';

  function readStorageJSON(key) {
    let gmData = null;
    let lsData = null;
    if (hasGMStorage) {
      try {
        const raw = GM_getValue(key, null);
        if (raw) gmData = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (_) {}
    }
    try {
      const rawLs = localStorage.getItem(key);
      if (rawLs) lsData = JSON.parse(rawLs);
    } catch (_) {}
    if (gmData && lsData && key === CFG.resumeKey) {
      const merged = { ...lsData };
      for (const k of Object.keys(gmData)) {
        if (!merged[k] || (gmData[k]?.u || 0) >= (merged[k]?.u || 0)) merged[k] = gmData[k];
      }
      return merged;
    }
    return gmData || lsData || null;
  }

  function writeStorageJSON(key, val) {
    const serialized = JSON.stringify(val);
    if (hasGMStorage) {
      try { GM_setValue(key, serialized); } catch (_) {}
    }
    try { localStorage.setItem(key, serialized); } catch (_) {}
  }

  function loadPrefs() {
    try {
      const data = readStorageJSON(CFG.prefKey);
      if (!data || typeof data !== 'object') return;
      if (typeof data.aspectIndex === 'number' && Number.isFinite(data.aspectIndex)) {
        state.aspectIndex = clamp(Math.round(data.aspectIndex), 0, ASPECT_MODES.length - 1);
      }
      if (typeof data.brightness === 'number' && Number.isFinite(data.brightness)) {
        state.brightness = clamp(data.brightness, 0.25, 1.75);
      }
      if (typeof data.minSpeed === 'number' && Number.isFinite(data.minSpeed)) {
        state.minSpeed = clamp(data.minSpeed, 0.1, 2);
      }
      if (typeof data.maxSpeed === 'number' && Number.isFinite(data.maxSpeed)) {
        state.maxSpeed = clamp(data.maxSpeed, 1.5, 16);
      }
      if (state.minSpeed >= state.maxSpeed) {
        state.minSpeed = 0.5;
        state.maxSpeed = 2;
      }
      if (typeof data.seekStep === 'number' && Number.isFinite(data.seekStep)) {
        state.seekStep = clamp(Math.round(data.seekStep), 5, 300);
        CFG.seekStep = state.seekStep;
      }
      if (typeof data.resumeEnabled === 'boolean') state.resumeEnabled = data.resumeEnabled;
      if (typeof data.autoNextEnabled === 'boolean') state.autoNextEnabled = data.autoNextEnabled;
      if (typeof data.debugEnabled === 'boolean') state.debugEnabled = data.debugEnabled;
      if (data._schema !== CFG.schemaVersion) savePrefs();
    } catch (_) {}
  }

  function savePrefs() {
    try {
      writeStorageJSON(CFG.prefKey, {
        _schema: CFG.schemaVersion,
        aspectIndex: state.aspectIndex,
        brightness: state.brightness,
        minSpeed: state.minSpeed,
        maxSpeed: state.maxSpeed,
        seekStep: state.seekStep,
        resumeEnabled: state.resumeEnabled,
        autoNextEnabled: state.autoNextEnabled,
        debugEnabled: state.debugEnabled
      });
    } catch (_) {}
  }

  function ensureResumeCache() {
    if (state.resumeCache) return state.resumeCache;
    try {
      const data = readStorageJSON(CFG.resumeKey);
      state.resumeCache = data && typeof data === 'object' ? data : {};
    } catch (_) {
      state.resumeCache = {};
    }
    return state.resumeCache;
  }

  function flushResumeCacheToDisk() {
    if (!state.resumeDirty || !state.resumeCache) return;
    state.resumeDirty = false;
    state.lastDiskFlushTime = Date.now();
    try {
      const freshDisk = readStorageJSON(CFG.resumeKey);
      const map = state.resumeCache;
      if (freshDisk && typeof freshDisk === 'object') {
        for (const k of Object.keys(freshDisk)) {
          if (!map[k] || (freshDisk[k]?.u || 0) > (map[k]?.u || 0)) map[k] = freshDisk[k];
        }
      }
      const allKeys = Object.keys(map);
      if (allKeys.length > 90) {
        allKeys.sort((a, b) => (map[a]?.u || 0) - (map[b]?.u || 0));
        for (let i = 0; i < allKeys.length - 70; i++) delete map[allKeys[i]];
      }
      writeStorageJSON(CFG.resumeKey, map);
    } catch (_) {}
  }

  function getVideoStorageKeys(video) {
    const src = (video?.currentSrc || video?.src || '').split('?')[0];
    const title = state.cachedTitle;
    const ep = state.currentEp || '';
    const cacheSig = `${title}|${ep}|${src}`;
    if (state.cachedKeysVideo === video && state.cachedKeysSrc === cacheSig && state.cachedKeysList) {
      return state.cachedKeysList;
    }
    const keys = [];
    if (title && title.length > 2) keys.push(`t:${title}`);
    try {
      const topHref = window.top?.location?.href;
      if (topHref) keys.push(`u:${topHref.split('#')[0]}|${ep}`);
    } catch (_) {}
    keys.push(`s:${location.host}${location.pathname}|${ep}|${src.slice(-65)}`);
    state.cachedKeysVideo = video;
    state.cachedKeysSrc = cacheSig;
    state.cachedKeysList = keys;
    return keys;
  }

  function getVideoSignature(video) {
    if (!video) return '';
    const title = state.cachedTitle || '';
    const ep = state.currentEp || '';
    const src = (video.currentSrc || video.src || '').split('?')[0].slice(-80);
    const dur = Number.isFinite(video.duration) ? Math.round(video.duration) : 0;
    return `${title}|${ep}|${src}|${dur}`;
  }

  function clearSavedPositionForVideo(video) {
    if (!video) return;
    try {
      const keys = getVideoStorageKeys(video);
      const map = ensureResumeCache();
      let deleted = false;
      for (let i = 0; i < keys.length; i++) {
        if (map[keys[i]]) {
          delete map[keys[i]];
          deleted = true;
        }
      }
      if (deleted) {
        state.resumeDirty = true;
        flushResumeCacheToDisk();
      }
    } catch (_) {}
  }

  function savePlaybackPosition(video, forceDiskFlush = false) {
    if (!state.resumeEnabled || !video || state.seeking || state.isSkippingAd) return;
    if (isDisqualifiedVideo(video) || isCurrentlyPlayingPreRollAd(video)) return;
    const cur = video.currentTime;
    const dur = video.duration;
    if (!Number.isFinite(cur) || cur < 5) return;
    if (!Number.isFinite(dur) || dur < CFG.minMainVideoDurationSec) return;
    const sec = Math.floor(cur);
    if (!forceDiskFlush && sec === state.lastSaveSecond) return;
    if (!forceDiskFlush && sec % 4 !== 0) return;
    state.lastSaveSecond = sec;
    const keys = getVideoStorageKeys(video);
    if (!keys.length) return;
    const map = ensureResumeCache();
    const now = Date.now();
    if (cur > dur - 15) {
      clearSavedPositionForVideo(video);
      return;
    }
    for (let i = 0; i < keys.length; i++) map[keys[i]] = { t: sec, u: now };
    state.resumeDirty = true;
    if (forceDiskFlush || now - state.lastDiskFlushTime >= 18000) flushResumeCacheToDisk();
  }

  function tryRestorePlaybackPosition(video) {
    if (!state.resumeEnabled || !video) return;
    const applyRestore = () => {
      if (!state.resumeEnabled || !video) return;
      if (isDisqualifiedVideo(video) || isCurrentlyPlayingPreRollAd(video)) return;
      const dur = video.duration;
      if (!Number.isFinite(dur) || dur < CFG.minMainVideoDurationSec) return;
      const sig = getVideoSignature(video);
      if (sig && state.lastResumedSignature === sig) return;
      try {
        const keys = getVideoStorageKeys(video);
        if (!keys.length) return;
        const fresh = readStorageJSON(CFG.resumeKey);
        const map = fresh && typeof fresh === 'object' ? (state.resumeCache = fresh) : ensureResumeCache();
        let entry = null;
        for (let i = 0; i < keys.length; i++) {
          if (map[keys[i]] && typeof map[keys[i]].t === 'number') {
            entry = map[keys[i]];
            break;
          }
        }
        if (!entry) return;
        state.lastResumedSignature = sig;
        if (entry.t >= 5 && entry.t < dur - 15 && video.currentTime < 12 && Math.abs(video.currentTime - entry.t) > 4) {
          safeSeek(video, entry.t, false);
          dbg('RESUME', `Restored to ${formatTime(entry.t)}`);
          setTimeout(() => showHud(`รับชมต่อจาก ${formatTime(entry.t)}`, 2200), 180);
        }
      } catch (_) {}
    };
    if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) applyRestore();
    else video.addEventListener('loadedmetadata', applyRestore, { once: true });
  }

  function escapeHtml(value) {
    if (!value) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return '00:00';
    const n = Math.floor(value);
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    return h
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /* =========================================================
     1. TITLE / EP DETECTION (kept from V26, simplified)
  ========================================================= */

  function cleanTitle(raw) {
    if (!raw) return '';
    return String(raw)
      .replace(RX.whitespace, ' ')
      .replace(RX.siteSuffix, '')
      .replace(RX.thaiSuffix, '')
      .replace(RX.thaiPrefix, '')
      .replace(RX.epSuffix, '')
      .trim();
  }

  function normalizeEpNumber(numStr) {
    const n = Number(numStr);
    if (!Number.isFinite(n) || n <= 0 || n > 4000) return '';
    if (n === 240 || n === 360 || n === 480 || n === 720 || n === 1080 || n === 1440 || n === 2160) return '';
    return `EP ${String(numStr).replace(/^0+(?=\d)/, '')}`;
  }

  function getNumericEp(epBadge) {
    if (!epBadge) return NaN;
    const m = String(epBadge).match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : NaN;
  }

  function parseEpBadge(text, allowBareNumber = false) {
    if (!text) return '';
    const str = String(text).replace(RX.whitespace, ' ').trim();
    if (!str || str.length > 160) return '';
    if (RX.resolutionGuard.test(str) || RX.serverGuard.test(str)) return '';
    const fracMatch = str.match(RX.epFraction);
    if (fracMatch) return normalizeEpNumber(fracMatch[1]);
    const rangeMatch = str.match(RX.epRange);
    if (rangeMatch && rangeMatch[1] !== rangeMatch[2]) return '';
    const explicit = str.match(RX.epExplicit);
    if (explicit) return normalizeEpNumber(explicit[1]);
    if (allowBareNumber) {
      const numOnly = str.match(RX.epNumOnly);
      if (numOnly) return normalizeEpNumber(numOnly[1]);
      const bracket = str.match(RX.epBracket);
      if (bracket) return normalizeEpNumber(bracket[1]);
    }
    return '';
  }

  function extractEpFromUrl(urlStr) {
    if (!urlStr) return '';
    try {
      const decoded = decodeURIComponent(String(urlStr));
      const qMatch = decoded.match(RX.epUrlQuery);
      if (qMatch) {
        const res = normalizeEpNumber(qMatch[1]);
        if (res) return res;
      }
      const pMatch = decoded.match(RX.epUrl);
      if (pMatch) {
        const res = normalizeEpNumber(pMatch[1]);
        if (res) return res;
      }
      const thaiUrlMatch = decoded.match(/(?:ตอน(?:ที่)?|ep)[-_\s]*0*(\d{1,4})(?!\s*[-–—~ถึง]\s*\d|\d)/i);
      if (thaiUrlMatch) {
        const res = normalizeEpNumber(thaiUrlMatch[1]);
        if (res) return res;
      }
    } catch (_) {}
    return '';
  }

  function extractEpFromElement(el) {
    if (!el || !(el instanceof Element)) return '';
    const attrNames = ['data-ep', 'data-episode', 'data-num', 'data-number', 'data-index', 'data-part', 'data-id', 'data-episode-id', 'data-chap'];
    for (let i = 0; i < attrNames.length; i++) {
      const val = el.getAttribute(attrNames[i]);
      if (val) {
        const ep = parseEpBadge(val, true);
        if (ep) return ep;
      }
    }
    const inEpContainer = Boolean(el.closest(EP_CONTAINER_SEL));
    const txt = (el.textContent || '').replace(RX.whitespace, ' ').trim();
    const isEpisodeClass = el.classList.contains('episode') || /\bepisode\b/i.test(el.className || '');
    if (txt && txt.length <= 120) {
      const epFromTxt = parseEpBadge(txt, inEpContainer || isEpisodeClass || /ตอน(?:ที่)?\s*\d+/i.test(txt));
      if (epFromTxt) return epFromTxt;
    }
    const titleAttr = el.getAttribute('title') || el.getAttribute('aria-label') || '';
    if (titleAttr) {
      const epFromTitle = parseEpBadge(titleAttr, inEpContainer);
      if (epFromTitle) return epFromTitle;
    }
    const href = el.getAttribute('href') || el.getAttribute('data-href') || el.getAttribute('data-url') || '';
    if (href && href !== '#' && !href.startsWith('javascript:')) {
      const epFromHref = extractEpFromUrl(href);
      if (epFromHref) return epFromHref;
    }
    return '';
  }

  function detectActiveEpFromDOM(doc = document) {
    if (!doc) return '';
    try {
      const activePrioritySelectors = [
        '.cyber-ep-btn.active', 'button.cyber-ep-btn.active', '[data-ep].active', 'button[data-ep].active',
        '[class*="cyber-ep"].active', '[class*="episode-list-bg-active"]', '[class*="ep-list-bg-active"]',
        '.episode.active', '.episode.current', '.episode.playing', '.episode.selected',
        '.ep-item.active', '.episode-item.active', '.halim-episode.active',
        '.les-content a.active', '.episodelist a.active', '.ep-list a.active',
        '.play-list a.active', '.halim-list-eps a.active', '.b-list a.active',
        '[class*="ep-"][class*="active"]', '[class*="episode"][class*="active"]',
        '[class*="ep-"][class*="current"]', '[class*="episode"][class*="current"]',
        '[aria-current="page"]', '[aria-current="true"]', '[aria-selected="true"]',
        'button.active', 'a.active', 'li.active'
      ];
      for (let s = 0; s < activePrioritySelectors.length; s++) {
        const nodes = doc.querySelectorAll(activePrioritySelectors[s]);
        for (let i = 0; i < nodes.length; i++) {
          const el = nodes[i];
          if (el.children.length > 6) continue;
          const ep = extractEpFromElement(el);
          if (ep) return ep;
        }
      }
      const allEps = doc.querySelectorAll('.episode, span.episode, div.episode, [class*="episode-item"], [class*="ep-item"]');
      if (allEps.length >= 2) {
        let bestEl = null;
        let bestScore = -1;
        for (let i = 0; i < allEps.length; i++) {
          const el = allEps[i];
          if (el.children.length > 6) continue;
          const ep = extractEpFromElement(el);
          if (!ep) continue;
          let score = 0;
          const cls = (el.className || '').toString().toLowerCase();
          if (cls.includes('active') || cls.includes('current') || cls.includes('playing') || cls.includes('selected')) score += 100;
          if (cls.includes('bg-active') || cls.includes('list-bg-active')) score += 120;
          try {
            const st = doc.defaultView?.getComputedStyle?.(el);
            if (st) {
              const bg = (st.backgroundColor || '').toLowerCase();
              if (bg.includes('rgb') && !bg.includes('0, 0, 0') && !bg.includes('255, 255, 255')) {
                const m = bg.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                if (m) {
                  const r = +m[1], g = +m[2], b = +m[3];
                  if (r > 180 && g < 120 && b > 80) score += 80;
                  if (g > 150 && r < 100) score += 40;
                }
              }
              if (st.fontWeight === 'bold' || parseInt(st.fontWeight, 10) >= 600) score += 15;
            }
          } catch (_) {}
          if (score > bestScore) {
            bestScore = score;
            bestEl = el;
          }
        }
        if (bestEl && bestScore >= 40) {
          const ep = extractEpFromElement(bestEl);
          if (ep) return ep;
        }
      }
      const selects = doc.querySelectorAll('select');
      for (let i = 0; i < selects.length; i++) {
        const opt = selects[i].selectedOptions?.[0];
        if (opt) {
          const ep = parseEpBadge(opt.textContent || '', true) || parseEpBadge(opt.value || '', false);
          if (ep) return ep;
        }
      }
      const urlEp = extractEpFromUrl(doc.location?.href || '');
      if (urlEp) return urlEp;
      const rawTitle = doc.title || '';
      const looksLikeRange = /EP\.\s*\d+\s*[-–—~ถึง]|ตอนล่าสุด|EP\.\d+-\d+/i.test(rawTitle);
      if (!looksLikeRange) {
        const titleEp = parseEpBadge(rawTitle, false);
        if (titleEp) return titleEp;
      }
      const h1 = doc.querySelector('h1.entry-title, h1.video-title, h1.title, h1');
      if (h1) {
        const h1Ep = parseEpBadge(h1.textContent || '', false);
        if (h1Ep) return h1Ep;
      }
    } catch (_) {}
    return '';
  }

  function extractBaseTitleFromDoc(doc) {
    if (!doc) return '';
    try {
      const rawTitle = doc.title || '';
      const cleanedDocTitle = cleanTitle(rawTitle);
      const h1El = doc.querySelector('h1.entry-title, h1.video-title, h1.title, .film-name, h1');
      const rawH1 = (h1El && h1El.textContent) || '';
      const cleanedH1 = cleanTitle(rawH1);
      if (cleanedDocTitle) return cleanedDocTitle;
      if (cleanedH1 && cleanedH1.length < 150) return cleanedH1;
      const meta = doc.querySelector('meta[property="og:title"], meta[name="twitter:title"], meta[property="video:title"], meta[name="title"]');
      if (meta) {
        const content = meta.getAttribute('content') || '';
        if (content && content.trim()) return cleanTitle(content);
      }
    } catch (_) {}
    return '';
  }

  function stripEpFromTitleText(text) {
    if (!text) return '';
    return String(text)
      .replace(/^(?:EP\.?|Episode|ตอน(?:ที่)?)\s*\d+(?:\.\d+)?\s*[-–—|:•]?\s*/i, '')
      .replace(/\s*[-–—|:•]\s*(?:EP\.?|Episode|ตอน(?:ที่)?)\s*\d+(?:\.\d+)?.*$/i, '')
      .replace(/\s*(?:EP\.?|Episode|ตอน(?:ที่)?)\s*\d+(?:\.\d+)?\s*$/i, '')
      .trim();
  }

  function composeFullTitle(baseTitle, epBadge) {
    const base = (baseTitle || '').trim();
    const ep = (epBadge || '').trim();
    if (!base) return ep;
    if (!ep) return base;
    const cleanedBase = stripEpFromTitleText(base) || base;
    const escapedEp = ep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`^${escapedEp}\\b`, 'i').test(cleanedBase)) return cleanedBase;
    return `${ep} - ${cleanedBase}`;
  }

  function setTitleUI(fullOrBase, epOverride) {
    const el = state.refs?.title;
    if (!el) return;
    const ep = String(epOverride || state.currentEp || '').trim();
    let base = stripEpFromTitleText(fullOrBase || state.cachedTitle || '');
    if (!base && fullOrBase) base = stripEpFromTitleText(String(fullOrBase));
    if (ep) {
      el.innerHTML = `<span class="v270-ep">${escapeHtml(ep)}</span><span class="v270-title-main">${escapeHtml(base)}</span>`;
    } else {
      el.textContent = base || String(fullOrBase || '');
    }
  }

  function extractFullTitleFromDoc(doc) {
    const base = extractBaseTitleFromDoc(doc);
    let detected = '';
    if (!state.expectingSeamlessEpisode || !state.currentEp) {
      detected = detectActiveEpFromDOM(doc);
      if (detected) state.currentEp = detected;
    } else {
      detected = detectActiveEpFromDOM(doc);
      if (detected && detected !== state.currentEp) {
        const oldN = getNumericEp(state.currentEp);
        const newN = getNumericEp(detected);
        if (!Number.isFinite(oldN) || (Number.isFinite(newN) && Math.abs(newN - oldN) <= 3 && newN >= oldN)) {
          state.currentEp = detected;
        }
      }
    }
    const ep = state.currentEp || detected;
    return composeFullTitle(base, ep);
  }

  function broadcastTitleToFrames(fullTitle, epBadge = state.currentEp) {
    if (!fullTitle) return;
    try {
      const frames = document.querySelectorAll('iframe');
      for (let i = 0; i < frames.length; i++) {
        frames[i].contentWindow?.postMessage({
          type: CFG.titleType + ':res',
          title: fullTitle,
          ep: epBadge || ''
        }, '*');
      }
    } catch (_) {}
  }

  function refreshTitleCache(forceDOMScan = false) {
    if (window === window.top) {
      const rawNow = document.title || '';
      if (!forceDOMScan && state.cachedTitle && rawNow === state.lastRawDocTitle) return state.cachedTitle;
      state.lastRawDocTitle = rawNow;
      const detectedEp = detectActiveEpFromDOM(document);
      if (detectedEp) {
        if (detectedEp !== state.currentEp) dbg('EP-SYNC', `Title refresh synced ${state.currentEp} → ${detectedEp}`);
        state.currentEp = detectedEp;
      }
      const full = extractFullTitleFromDoc(document).slice(0, 220);
      if (full) {
        state.cachedTitle = full;
        state.cachedKeysList = null;
        setTitleUI(full, state.currentEp);
      }
      return state.cachedTitle;
    }
    try {
      if (window.top?.document) {
        const rawTop = window.top.document.title || '';
        if (!forceDOMScan && state.cachedTitle && rawTop === state.lastRawDocTitle) return state.cachedTitle;
        state.lastRawDocTitle = rawTop;
        const topTitle = extractFullTitleFromDoc(window.top.document).slice(0, 220);
        if (topTitle) {
          state.cachedTitle = topTitle;
          state.cachedKeysList = null;
          setTitleUI(topTitle, state.currentEp);
          return topTitle;
        }
      }
    } catch (_) {}
    if (!state.cachedTitle || forceDOMScan) {
      const local = extractFullTitleFromDoc(document).slice(0, 220);
      if (local) state.cachedTitle = local;
      try { window.top.postMessage({ type: CFG.titleType + ':req' }, '*'); } catch (_) {}
    }
    return state.cachedTitle;
  }

  /* =========================================================
     2. FULLSCREEN BRIDGE + LIVE DOM NEXT-EP (kept core)
  ========================================================= */

  function findMainPlayerIframeInTopDoc(doc = document) {
    const playerZones = doc.querySelectorAll(PLAYER_AREA_SEL);
    for (let i = 0; i < playerZones.length; i++) {
      const f = playerZones[i].querySelector('iframe[src], iframe[data-src], iframe[data-lazy-src]');
      if (f) {
        const src = f.getAttribute('src') || f.getAttribute('data-src') || '';
        if (!RX.adBannerHint.test(src)) return f;
      }
    }
    let bestF = null;
    let bestA = 0;
    const allFrames = doc.querySelectorAll('iframe');
    for (let i = 0; i < allFrames.length; i++) {
      const f = allFrames[i];
      const src = f.getAttribute('src') || f.getAttribute('data-src') || '';
      if (!src || RX.adBannerHint.test(src) || /facebook|twitter|doubleclick|googlesyndication/i.test(src)) continue;
      const r = f.getBoundingClientRect();
      const a = r.width * r.height;
      if (r.width >= 200 && r.height >= 120 && a > bestA) {
        bestA = a;
        bestF = f;
      }
    }
    return bestF;
  }

  function setTopWindowIframeFullscreenLock(enable) {
    if (window !== window.top) {
      try { window.top.postMessage({ type: 'tmv270_parent_fs_lock', enable: Boolean(enable) }, '*'); } catch (_) {}
      return;
    }
    installHostStyles(document);
    if (enable) {
      const iframe = findMainPlayerIframeInTopDoc(document);
      if (!iframe) return;
      iframe.setAttribute(CFG.parentIframeFsAttr, '1');
      const wrap = iframe.closest(PLAYER_AREA_SEL) || iframe.parentElement;
      if (wrap && wrap !== document.body && wrap !== document.documentElement) {
        wrap.setAttribute(CFG.parentWrapFsAttr, '1');
      }
      document.documentElement.setAttribute(CFG.lockScrollAttr, '1');
    } else {
      const lockedFrames = document.querySelectorAll(`[${CFG.parentIframeFsAttr}]`);
      for (let i = 0; i < lockedFrames.length; i++) lockedFrames[i].removeAttribute(CFG.parentIframeFsAttr);
      const lockedWraps = document.querySelectorAll(`[${CFG.parentWrapFsAttr}]`);
      for (let i = 0; i < lockedWraps.length; i++) lockedWraps[i].removeAttribute(CFG.parentWrapFsAttr);
      if (!state.pseudoFullscreen) document.documentElement.removeAttribute(CFG.lockScrollAttr);
    }
  }

  function synthesizeNextUrlPattern(currentHref, targetNum) {
    if (!currentHref) return '';
    try {
      const url = new URL(currentHref, location.href);
      const pathname = url.pathname;
      const epSlugMatch = pathname.match(/(-|_)(?:ep|episode|e|ton|part)[-_]?(\d+)/i);
      if (epSlugMatch) {
        const prefix = epSlugMatch[1];
        const keyword = epSlugMatch[0].match(/(?:ep|episode|e|ton|part)/i)[0];
        const newPath = pathname.replace(epSlugMatch[0], `${prefix}${keyword}${targetNum}`);
        url.pathname = newPath;
        return url.href;
      }
      for (const key of url.searchParams.keys()) {
        if (/^(?:ep|episode|part|id_ep)$/i.test(key)) {
          url.searchParams.set(key, String(targetNum));
          return url.href;
        }
      }
      const trailingNumMatch = pathname.match(/\/(\d+)(?:\/?$|\.html?|\/)/);
      if (trailingNumMatch) {
        const oldNumStr = trailingNumMatch[1];
        const newPath = pathname.replace(new RegExp(`/${oldNumStr}(?=/|$|\\.html?)`), `/${targetNum}`);
        if (newPath !== pathname) {
          url.pathname = newPath;
          return url.href;
        }
      }
    } catch (_) {}
    return '';
  }

  function updateLiveDOMNavigationButtons(targetNum, nextEpBadge) {
    if (window !== window.top) return;
    try {
      const epButtons = document.querySelectorAll('a, button, [role="button"]');
      for (let i = 0; i < epButtons.length; i++) {
        const el = epButtons[i];
        const txt = (el.textContent || '').replace(RX.whitespace, ' ').trim();
        const ep = extractEpFromElement(el);
        const n = getNumericEp(ep);
        if (n === targetNum || RX.nextKeyword.test(txt)) {
          el.classList.add('active', 'current');
          el.setAttribute('aria-current', 'page');
        } else if (n && n !== targetNum) {
          el.classList.remove('active', 'current');
          el.removeAttribute('aria-current');
        }
      }
      const h1s = document.querySelectorAll('h1.entry-title, h1.video-title, h1.title, h1');
      for (let i = 0; i < h1s.length; i++) {
        const h1 = h1s[i];
        const base = cleanTitle(h1.textContent);
        if (base) h1.textContent = composeFullTitle(base, nextEpBadge);
      }
    } catch (_) {}
  }

  function findNextEpisodeTarget(doc = document, currentEpStr = '') {
    const liveDetected = detectActiveEpFromDOM(doc);
    const curEpBadge = liveDetected || currentEpStr || state.currentEp || '';
    if (liveDetected && liveDetected !== state.currentEp) {
      state.currentEp = liveDetected;
      dbg('EP-SYNC', `Synced currentEp from DOM → ${liveDetected}`);
    }
    const curNum = getNumericEp(curEpBadge);
    const targetNum = Number.isFinite(curNum) ? curNum + 1 : NaN;

    try {
      const dataEpBtns = Array.from(doc.querySelectorAll('[data-ep], .cyber-ep-btn, button[data-ep]'));
      const confident = [];
      for (let i = 0; i < dataEpBtns.length; i++) {
        const el = dataEpBtns[i];
        const raw = el.getAttribute('data-ep') || el.getAttribute('data-episode') || '';
        let n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) {
          const ep = extractEpFromElement(el);
          n = getNumericEp(ep);
        }
        if (!Number.isFinite(n) || n <= 0 || n > 5000) continue;
        if (RX.resolutionGuard.test(String(n))) continue;
        let score = 50;
        const cls = (el.className || '').toString().toLowerCase();
        if (cls.includes('cyber-ep-btn')) score += 80;
        if (cls.includes('active') || cls.includes('current')) score += 40;
        if (el.closest('.cyber-ep-grid, .cyber-ep-wrapper, [class*="ep-grid"], [class*="episode-list"]')) score += 30;
        if (el.tagName === 'BUTTON' || el.tagName === 'A') score += 15;
        confident.push({ el, n, score, ep: normalizeEpNumber(n) });
      }
      if (confident.length >= 2) {
        confident.sort((a, b) => a.n - b.n || b.score - a.score);
        if (Number.isFinite(targetNum)) {
          let best = null, bestScore = -1;
          for (const c of confident) {
            if (c.n === targetNum && c.score > bestScore) {
              best = c;
              bestScore = c.score;
            }
          }
          if (best) {
            const clickEl = best.el.querySelector('a, button') || best.el;
            return {
              type: 'element',
              element: clickEl,
              href: clickEl.getAttribute?.('href') || best.el.getAttribute?.('href') || '',
              dataSrc: best.el.getAttribute('data-src') || clickEl.getAttribute?.('data-src') || '',
              ep: best.ep,
              targetNum: best.n
            };
          }
        }
        if (Number.isFinite(curNum)) {
          let curIdx = -1, bestCur = -1;
          for (let i = 0; i < confident.length; i++) {
            if (confident[i].n === curNum && confident[i].score > bestCur) {
              bestCur = confident[i].score;
              curIdx = i;
            }
          }
          if (curIdx >= 0) {
            for (let i = curIdx + 1; i < confident.length; i++) {
              if (confident[i].n > curNum) {
                const next = confident[i];
                const clickEl = next.el.querySelector('a, button') || next.el;
                return {
                  type: 'element',
                  element: clickEl,
                  href: clickEl.getAttribute?.('href') || next.el.getAttribute?.('href') || '',
                  dataSrc: next.el.getAttribute('data-src') || clickEl.getAttribute?.('data-src') || '',
                  ep: next.ep,
                  targetNum: next.n
                };
              }
            }
          }
          for (const c of confident) {
            if (c.n > curNum) {
              const clickEl = c.el.querySelector('a, button') || c.el;
              return {
                type: 'element',
                element: clickEl,
                href: clickEl.getAttribute?.('href') || c.el.getAttribute?.('href') || '',
                dataSrc: c.el.getAttribute('data-src') || clickEl.getAttribute?.('data-src') || '',
                ep: c.ep,
                targetNum: c.n
              };
            }
          }
        }
      }
    } catch (_) {}

    const selects = doc.querySelectorAll('select');
    for (let i = 0; i < selects.length; i++) {
      const sel = selects[i];
      const opts = Array.from(sel.options || []);
      if (opts.length < 2) continue;
      if (Number.isFinite(targetNum)) {
        for (let j = 0; j < opts.length; j++) {
          const ep = parseEpBadge(opts[j].textContent || '', true) || parseEpBadge(opts[j].value || '', false);
          if (getNumericEp(ep) === targetNum) {
            return { type: 'select', select: sel, option: opts[j], ep: normalizeEpNumber(targetNum), targetNum };
          }
        }
      }
      const idx = sel.selectedIndex;
      if (idx >= 0 && idx + 1 < opts.length) {
        const nextOpt = opts[idx + 1];
        const nextEp = parseEpBadge(nextOpt.textContent || '', true) || parseEpBadge(nextOpt.value || '', false);
        if (nextEp) {
          return { type: 'select', select: sel, option: nextOpt, ep: nextEp, targetNum: getNumericEp(nextEp) };
        }
      }
    }

    const candidates = doc.querySelectorAll(
      'a, button, li[onclick], [role="button"], [data-ep], [data-episode], ' +
      '.ep-item, .episode-item, .halim-episode, .episode, span.episode, div.episode, ' +
      '[class*="episode"], [class*="ep-item"], [class*="ep_item"], [class*="eps-"]'
    );
    const epElements = [];
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.children.length > 6) continue;
      const txt = (el.textContent || '').replace(RX.whitespace, ' ').trim();
      if (txt.length > 80) continue;
      let ep = extractEpFromElement(el);
      if (!ep && /ตอน(?:ที่)?\s*\d+/i.test(txt)) ep = parseEpBadge(txt, true);
      if (!ep) continue;
      const n = getNumericEp(ep);
      if (!Number.isFinite(n) || n <= 0) continue;
      let score = 10;
      if (el.classList.contains('episode') || /\bepisode\b/i.test(el.className || '')) score += 40;
      if ((el.className || '').toString().toLowerCase().includes('cyber-ep-btn')) score += 70;
      if (el.hasAttribute('data-ep') || el.hasAttribute('data-episode')) score += 50;
      if (el.closest(EP_CONTAINER_SEL) || el.closest('.cyber-ep-grid, .cyber-ep-wrapper')) score += 30;
      if (el.tagName === 'A' || el.tagName === 'BUTTON') score += 15;
      const href = el.getAttribute('href') || '';
      if (href && href !== '#' && !href.startsWith('javascript:')) score += 20;
      try {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) score += 10;
      } catch (_) {}
      epElements.push({ el, ep, n, score, txt });
    }
    epElements.sort((a, b) => a.n - b.n || b.score - a.score);

    if (Number.isFinite(targetNum)) {
      let bestMatch = null;
      let bestScore = -1;
      for (let i = 0; i < epElements.length; i++) {
        if (epElements[i].n === targetNum && epElements[i].score > bestScore) {
          bestScore = epElements[i].score;
          bestMatch = epElements[i];
        }
      }
      if (bestMatch) {
        const clickEl = bestMatch.el.querySelector('a, button') || bestMatch.el;
        return {
          type: 'element',
          element: clickEl,
          href: clickEl.getAttribute?.('href') || bestMatch.el.getAttribute?.('href') || '',
          ep: normalizeEpNumber(targetNum),
          targetNum
        };
      }
    }

    if (Number.isFinite(curNum) && epElements.length >= 2) {
      let currentIdx = -1;
      let bestCurScore = -1;
      for (let i = 0; i < epElements.length; i++) {
        if (epElements[i].n === curNum && epElements[i].score > bestCurScore) {
          bestCurScore = epElements[i].score;
          currentIdx = i;
        }
      }
      if (currentIdx >= 0) {
        for (let j = currentIdx + 1; j < epElements.length; j++) {
          if (epElements[j].n > curNum) {
            const next = epElements[j];
            const clickEl = next.el.querySelector('a, button') || next.el;
            return {
              type: 'element',
              element: clickEl,
              href: clickEl.getAttribute?.('href') || next.el.getAttribute?.('href') || '',
              ep: next.ep,
              targetNum: next.n
            };
          }
        }
      }
      for (let i = 0; i < epElements.length; i++) {
        if (epElements[i].n > curNum) {
          const next = epElements[i];
          const clickEl = next.el.querySelector('a, button') || next.el;
          return {
            type: 'element',
            element: clickEl,
            href: clickEl.getAttribute?.('href') || next.el.getAttribute?.('href') || '',
            ep: next.ep,
            targetNum: next.n
          };
        }
      }
    }

    if (Number.isFinite(targetNum)) {
      const synthesizedUrl = synthesizeNextUrlPattern(location.href, targetNum);
      if (synthesizedUrl) {
        return {
          type: 'url_fallback',
          href: synthesizedUrl,
          ep: normalizeEpNumber(targetNum),
          targetNum
        };
      }
    }

    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.children.length > 4) continue;
      const txt = (el.textContent || '').replace(RX.whitespace, ' ').trim();
      if (txt.length <= 40 && RX.nextKeyword.test(txt)) {
        const ep = extractEpFromElement(el) || (Number.isFinite(targetNum) ? normalizeEpNumber(targetNum) : 'ตอนถัดไป');
        return {
          type: 'element',
          element: el,
          href: el.getAttribute?.('href') || '',
          ep,
          targetNum: getNumericEp(ep) || targetNum
        };
      }
    }
    return null;
  }

  function saveAutoFullscreenBridge(epBadge) {
    const payload = {
      ep: epBadge || '',
      speed: state.savedSpeed || 1,
      aspectIndex: state.aspectIndex || 0,
      brightness: state.brightness || 1,
      ts: Date.now()
    };
    writeStorageJSON(CFG.autoFsBridgeKey, payload);
    try { sessionStorage.setItem(CFG.autoFsBridgeKey, JSON.stringify(payload)); } catch (_) {}
  }

  function consumeAutoFullscreenBridge() {
    let data = readStorageJSON(CFG.autoFsBridgeKey);
    if (!data) {
      try {
        const raw = sessionStorage.getItem(CFG.autoFsBridgeKey);
        if (raw) data = JSON.parse(raw);
      } catch (_) {}
    }
    if (!data || typeof data.ts !== 'number') return null;
    if (Date.now() - data.ts > 20000) {
      clearAutoFullscreenBridge();
      return null;
    }
    return data;
  }

  function clearAutoFullscreenBridge() {
    writeStorageJSON(CFG.autoFsBridgeKey, null);
    try { sessionStorage.removeItem(CFG.autoFsBridgeKey); } catch (_) {}
  }

  async function tryAjaxSwapEpisodeInPlace(targetUrl, nextEpBadge, targetNum) {
    if (!targetUrl || targetUrl === '#' || targetUrl.startsWith('javascript:')) return false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CFG.ajaxTimeoutMs);
    try {
      const absUrl = new URL(targetUrl, location.href).href;
      if (absUrl === location.href) return false;
      dbg('AJAX-EP', `Fetching ${nextEpBadge}: ${absUrl.slice(0, 70)}`);
      const res = await fetch(absUrl, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'text/html,application/xhtml+xml' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const html = await res.text();
      if (!html || html.length < 300) return false;
      const parser = new DOMParser();
      const nextDoc = parser.parseFromString(html, 'text/html');
      if (!nextDoc) return false;
      const nextIframe = findMainPlayerIframeInTopDoc(nextDoc);
      const curIframe = findMainPlayerIframeInTopDoc(document);
      if (nextIframe && curIframe) {
        const rawNextSrc = nextIframe.getAttribute('src') || nextIframe.getAttribute('data-src') || nextIframe.getAttribute('data-lazy-src') || '';
        if (rawNextSrc) {
          const nextIframeUrl = new URL(rawNextSrc, absUrl).href;
          dbg('AJAX-EP', `Swapping iframe -> ${nextIframeUrl.slice(0, 60)}`);
          try { history.pushState({ ep: nextEpBadge }, nextDoc.title || document.title, absUrl); } catch (_) {}
          if (nextDoc.title) document.title = nextDoc.title;
          state.currentEp = nextEpBadge;
          const updatedTitle = refreshTitleCache(true);
          updateLiveDOMNavigationButtons(targetNum, nextEpBadge);
          setTopWindowIframeFullscreenLock(true);
          curIframe.src = nextIframeUrl;
          setTimeout(() => {
            broadcastTitleToFrames(updatedTitle, nextEpBadge);
            pingAllFramesAutoPlayAndFullscreen(nextEpBadge);
          }, 550);
          return true;
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') dbg('AJAX-ERR', String(err?.message || err));
    } finally {
      clearTimeout(timeoutId);
    }
    return false;
  }

  function pingAllFramesAutoPlayAndFullscreen(epBadge) {
    try {
      const frames = document.querySelectorAll('iframe');
      for (let i = 0; i < frames.length; i++) {
        frames[i].contentWindow?.postMessage({
          type: 'tmv270_seamless_start',
          ep: epBadge || state.currentEp || '',
          title: state.cachedTitle || '',
          speed: state.savedSpeed || 1
        }, '*');
      }
    } catch (_) {}
  }

  function startSeamlessEpisodeRecovery(nextEpBadge) {
    if (state.autoPlayPollTimer) {
      clearInterval(state.autoPlayPollTimer);
      state.autoPlayPollTimer = 0;
    }
    state.expectingSeamlessEpisode = true;
    if (nextEpBadge) state.currentEp = nextEpBadge;
    try {
      const base = stripEpFromTitleText(state.cachedTitle || '') || extractBaseTitleFromDoc(document) || '';
      const forced = composeFullTitle(base, state.currentEp);
      if (forced) {
        state.cachedTitle = forced;
        state.cachedKeysList = null;
        setTitleUI(forced, state.currentEp);
        broadcastTitleToFrames(forced, state.currentEp);
      }
    } catch (_) {}
    saveAutoFullscreenBridge(nextEpBadge || state.currentEp);
    setTopWindowIframeFullscreenLock(true);
    let attempts = 0;
    const maxAttempts = 40;
    state.autoPlayPollTimer = setInterval(() => {
      attempts++;
      if (attempts > maxAttempts || state.destroyed) {
        clearInterval(state.autoPlayPollTimer);
        state.autoPlayPollTimer = 0;
        return;
      }
      try {
        if (attempts <= 6 || attempts % 2 === 0) {
          const t = refreshTitleCache(true);
          if (t) setTitleUI(t, state.currentEp);
        }
        clickPlayerBigPlayButton();
        try {
          const extraPlay = document.querySelectorAll(
            '.vjs-big-play-button, .jw-icon-display, .plyr__control--overlaid, ' +
            '[class*="play-button"], [class*="big-play"], button[aria-label*="Play"], ' +
            '.fp-play, .dplayer-bezel-icon, .art-state'
          );
          for (let i = 0; i < extraPlay.length; i++) {
            const b = extraPlay[i];
            const r = b.getBoundingClientRect();
            if (r.width > 10 && r.height > 10 && r.top < window.innerHeight && r.left < window.innerWidth) b.click();
          }
        } catch (_) {}
        let v = bestVideo(document);
        if (!v && state.lastActiveVideo?.isConnected) v = state.lastActiveVideo;
        if (v && !isDisqualifiedVideo(v)) {
          trySkipPreRollAdSafely(v);
          safePlay(v);
          if (state.overlay && state.video !== v) {
            const container = ensureSafeContainer(v);
            if (container) createOverlay(v, container, state.pseudoFullscreen || !fullscreenElement());
          }
          if (!state.overlay && !fullscreenElement()) {
            setTopWindowIframeFullscreenLock(true);
            enterUniversalFullscreen(v);
          } else if (state.overlay && state.video === v) {
            if (v.paused) safePlay(v);
          }
          if (
            state.overlay &&
            !v.paused &&
            Number.isFinite(v.duration) &&
            v.duration >= 30 &&
            v.currentTime >= 0
          ) {
            clearInterval(state.autoPlayPollTimer);
            state.autoPlayPollTimer = 0;
            state.expectingSeamlessEpisode = false;
            clearAutoFullscreenBridge();
            dbg('SEAMLESS', `Recovery success at attempt ${attempts} for ${state.currentEp}`);
            showHud(`กำลังเล่น ${state.currentEp || 'ตอนถัดไป'}`, 1800);
          }
        }
      } catch (err) {
        dbg('SEAMLESS-ERR', String(err?.message || err));
      }
    }, 400);
  }

  async function executeNextEpisodeInTopWindow(preferredEp = '') {
    if (window !== window.top) {
      try {
        window.top.postMessage({
          type: 'tmv270_trigger_next_ep',
          currentEp: preferredEp || state.currentEp || ''
        }, '*');
      } catch (_) {}
      return true;
    }
    const now = Date.now();
    if (now - state.lastAutoNextTriggerTs < 5000) return false;
    const target = findNextEpisodeTarget(document, preferredEp || state.currentEp);
    if (!target) {
      dbg('AUTO-NEXT', 'No next episode button found');
      broadcastToAllFrames({ type: 'tmv270_no_next_ep' });
      return false;
    }
    state.lastAutoNextTriggerTs = now;
    const nextEpBadge = target.ep || '';
    const targetNum = target.targetNum || getNumericEp(nextEpBadge);
    if (nextEpBadge) state.currentEp = nextEpBadge;
    state.cachedKeysList = null;
    saveAutoFullscreenBridge(nextEpBadge);
    markPendingEpisodeNavigation(nextEpBadge);
    setTopWindowIframeFullscreenLock(true);
    updateLiveDOMNavigationButtons(targetNum, nextEpBadge);
    dbg('AUTO-NEXT', `Switching to ${nextEpBadge || 'Next EP'}`);
    try {
      if (target.type === 'select' && target.select && target.option) {
        const optVal = target.option.value || '';
        if (/^https?:\/\//i.test(optVal) || optVal.startsWith('/')) {
          const swapped = await tryAjaxSwapEpisodeInPlace(optVal, nextEpBadge, targetNum);
          if (swapped) return true;
        }
        target.select.value = target.option.value;
        target.option.selected = true;
        target.select.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (target.type === 'url_fallback' && target.href) {
        const swapped = await tryAjaxSwapEpisodeInPlace(target.href, nextEpBadge, targetNum);
        if (swapped) return true;
        location.href = target.href;
        return true;
      } else if (target.type === 'element' && target.element) {
        const href = target.href || target.element.getAttribute?.('href') || '';
        const dataSrc = target.dataSrc || target.element.getAttribute?.('data-src') || '';
        const hasInlineJs = target.element.hasAttribute?.('onclick') || href.startsWith('javascript:');
        if (dataSrc && /^https?:\/\//i.test(dataSrc)) {
          try {
            const playerIframe = document.querySelector(
              '.player-box iframe, #player-main iframe, .cyber-player-wrapper iframe, ' +
              'iframe[data-src*="playhdhls"], iframe[src*="playhdhls"], .player iframe'
            );
            if (playerIframe) {
              dbg('AUTO-NEXT', `Direct iframe swap → ${dataSrc.slice(0, 50)}`);
              try {
                const allBtns = document.querySelectorAll('.cyber-ep-btn, [data-ep]');
                for (const b of allBtns) {
                  b.classList.remove('active');
                  if (getNumericEp(extractEpFromElement(b)) === targetNum) b.classList.add('active');
                }
              } catch (_) {}
              playerIframe.src = dataSrc;
              state.currentEp = nextEpBadge;
              try { history.pushState({ ep: nextEpBadge }, document.title, location.href); } catch (_) {}
              startSeamlessEpisodeRecovery(nextEpBadge);
              setTimeout(() => {
                const newTitle = refreshTitleCache(true);
                broadcastTitleToFrames(newTitle, state.currentEp);
                pingAllFramesAutoPlayAndFullscreen(state.currentEp);
              }, 500);
              return true;
            }
          } catch (_) {}
        }
        if (href && href !== '#' && !hasInlineJs) {
          const swapped = await tryAjaxSwapEpisodeInPlace(href, nextEpBadge, targetNum);
          if (swapped) return true;
        }
        target.element.click();
      }
    } catch (_) {}
    startSeamlessEpisodeRecovery(nextEpBadge || state.currentEp);
    setTimeout(() => {
      const newTitle = refreshTitleCache(true);
      broadcastTitleToFrames(newTitle, state.currentEp);
      pingAllFramesAutoPlayAndFullscreen(state.currentEp);
    }, 600);
    setTimeout(() => {
      if (state.expectingSeamlessEpisode) {
        clickPlayerBigPlayButton();
        const v = bestVideo(document) || state.lastActiveVideo;
        if (v && !isDisqualifiedVideo(v)) {
          safePlay(v);
          if (!state.overlay) enterUniversalFullscreen(v);
        }
      }
    }, 1800);
    return true;
  }

  function broadcastToAllFrames(msg) {
    try { window.top?.postMessage(msg, '*'); } catch (_) {}
    try {
      const frames = document.querySelectorAll('iframe');
      for (let i = 0; i < frames.length; i++) frames[i].contentWindow?.postMessage(msg, '*');
    } catch (_) {}
  }

  function triggerSeamlessNextEpisode(manual = false) {
    if (!manual && !state.autoNextEnabled) return;
    const now = Date.now();
    if (now - state.lastAutoNextTriggerTs < 5000) return;
    try {
      const live = detectActiveEpFromDOM(document);
      if (live) state.currentEp = live;
    } catch (_) {}
    if (state.video) clearSavedPositionForVideo(state.video);
    state.expectingSeamlessEpisode = true;
    saveAutoFullscreenBridge(state.currentEp);
    setTopWindowIframeFullscreenLock(true);
    const curNum = getNumericEp(state.currentEp);
    const nextLabel = Number.isFinite(curNum) ? `EP ${curNum + 1}` : 'ตอนถัดไป';
    showHud(`กำลังเข้าสู่ ${nextLabel} อัตโนมัติ...`, 3200);
    if (window === window.top) {
      executeNextEpisodeInTopWindow(state.currentEp);
    } else {
      try {
        window.top.postMessage({
          type: 'tmv270_trigger_next_ep',
          currentEp: state.currentEp || ''
        }, '*');
      } catch (_) {}
    }
  }

  function clickPlayerBigPlayButton() {
    try {
      const forceMode = !!(state.overlay || state.pseudoFullscreen ||
        (document.documentElement && document.documentElement.hasAttribute(CFG.hostAttr)) ||
        (document.body && document.body.hasAttribute(CFG.hostAttr)));
      const btns = document.querySelectorAll(BIG_PLAY_SEL);
      for (let i = 0; i < btns.length; i++) {
        const b = btns[i];
        if (forceMode) {
          try { b.click(); } catch (_) {}
          continue;
        }
        const r = b.getBoundingClientRect();
        if (r.width > 10 && r.height > 10) b.click();
      }
      if (!(window === window.top && hasCrossOriginPlayerIframeOnPage())) {
        const extra = document.querySelectorAll(
          '[class*="big-play"], [class*="play-button"], [class*="btn-play"], ' +
          'button[title*="Play"], button[aria-label*="Play"], .play-icon, .icon-play, ' +
          '[class*="play-btn"], [class*="btn_play"]'
        );
        for (let i = 0; i < extra.length; i++) {
          const b = extra[i];
          if (forceMode) {
            try { b.click(); } catch (_) {}
            continue;
          }
          const r = b.getBoundingClientRect();
          if (r.width > 12 && r.height > 12 && r.top < window.innerHeight * 0.9) b.click();
        }
      }
    } catch (_) {}
  }

  function isCurrentlyPlayingPreRollAd(video) {
    if (!video) return false;
    try {
      const skipBtn = document.querySelector(AD_SKIP_SEL);
      if (skipBtn && area(skipBtn) > 0) return true;
      const adIndicators = document.querySelectorAll('.jw-flag-ads, .vjs-ad-playing, .ima-ad-container, [class*="ad-showing"]');
      if (adIndicators.length > 0) return true;
    } catch (_) {}
    return false;
  }

  function trySkipPreRollAdSafely(video) {
    if (!video || !isCurrentlyPlayingPreRollAd(video)) return false;
    try {
      state.isSkippingAd = true;
      const skipBtns = document.querySelectorAll(AD_SKIP_SEL);
      for (let i = 0; i < skipBtns.length; i++) {
        const btn = skipBtns[i];
        if (area(btn) > 0) {
          btn.click();
          dbg('AD-SKIP', 'Clicked Skip Ad button');
        }
      }
      const dur = video.duration;
      if (Number.isFinite(dur) && dur > 1 && dur < 120 && video.currentTime < dur - 0.5) {
        showHud('กำลังข้ามโฆษณาคั่น...', 1000);
        safeSeek(video, dur - 0.3, false);
      }
      setTimeout(() => { state.isSkippingAd = false; }, 1500);
      return true;
    } catch (_) {
      state.isSkippingAd = false;
    }
    return false;
  }

  function stopAdWatcher() {
    if (state.adWatchTimer) {
      clearInterval(state.adWatchTimer);
      state.adWatchTimer = 0;
    }
    state.adWatchActive = false;
  }

  function startAdWatcher() {
    if (state.adWatchActive || !state.video) return;
    state.adWatchActive = true;
    state.adWatchTimer = setInterval(() => {
      if (!state.video || state.destroyed) {
        stopAdWatcher();
        return;
      }
      if (isCurrentlyPlayingPreRollAd(state.video) || (Number.isFinite(state.video.duration) && state.video.duration < 90)) {
        trySkipPreRollAdSafely(state.video);
      }
    }, CFG.adWatchIntervalMs);
  }

  function markPendingEpisodeNavigation(epBadge) {
    try {
      sessionStorage.setItem(CFG.epScrollKey, JSON.stringify({ ep: epBadge || '', ts: Date.now() }));
    } catch (_) {}
  }

  function checkPendingEpisodeScrollOnLoad() {
    const bridge = consumeAutoFullscreenBridge();
    if (bridge) {
      state.expectingSeamlessEpisode = true;
      if (bridge.ep) state.currentEp = bridge.ep;
      if (typeof bridge.speed === 'number') state.savedSpeed = bridge.speed;
      if (typeof bridge.aspectIndex === 'number') state.aspectIndex = bridge.aspectIndex;
      if (typeof bridge.brightness === 'number') state.brightness = bridge.brightness;
      if (window === window.top) {
        setTopWindowIframeFullscreenLock(true);
      } else {
        let attempts = 0;
        if (state.autoPlayPollTimer) clearInterval(state.autoPlayPollTimer);
        state.autoPlayPollTimer = setInterval(() => {
          attempts++;
          if (attempts > 32) {
            clearInterval(state.autoPlayPollTimer);
            state.autoPlayPollTimer = 0;
            return;
          }
          clickPlayerBigPlayButton();
          const v = bestVideo(document);
          if (v && !isDisqualifiedVideo(v)) {
            trySkipPreRollAdSafely(v);
            safePlay(v);
            if (!state.overlay) {
              setTopWindowIframeFullscreenLock(true);
              enterUniversalFullscreen(v);
            }
            if (state.overlay && !v.paused && Number.isFinite(v.duration) && v.duration >= CFG.minMainVideoDurationSec) {
              clearInterval(state.autoPlayPollTimer);
              state.autoPlayPollTimer = 0;
              clearAutoFullscreenBridge();
            }
          }
        }, 400);
      }
    }
    if (window !== window.top) return;
    try {
      const raw = sessionStorage.getItem(CFG.epScrollKey);
      if (!raw) return;
      sessionStorage.removeItem(CFG.epScrollKey);
      const data = JSON.parse(raw);
      if (!data || typeof data.ts !== 'number' || Date.now() - data.ts > 15000) return;
      if (data.ep) state.currentEp = data.ep;
    } catch (_) {}
  }

  function setupEpisodeClickTracker() {
    if (window !== window.top) return;
    const triggerManualEpisodeSwitch = ep => {
      state.currentEp = ep;
      state.cachedKeysList = null;
      if (!fullscreenElement() && !state.pseudoFullscreen && !state.overlay) {
        clearAutoFullscreenBridge();
        markPendingEpisodeNavigation(ep);
        const full = refreshTitleCache(true);
        broadcastTitleToFrames(full, ep);
      }
    };
    const handleEpInteraction = e => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(`#${CFG.shadowHostId}, #${CFG.recoveryHostId}`)) return;
      const clickable = target.closest(
        'a, button, li, [role="button"], [onclick], [data-ep], [data-episode], ' +
        '.ep-item, .episode-item, .episode, span.episode, div.episode, [class*="ep"]'
      );
      if (!clickable || clickable.children.length > 6) return;
      let ep = extractEpFromElement(clickable);
      if (!ep) {
        const inner = target.closest('.episode, span.episode, [data-ep], [data-episode]');
        if (inner) ep = extractEpFromElement(inner);
      }
      if (ep) {
        state.currentEp = ep;
        state.cachedKeysList = null;
        triggerManualEpisodeSwitch(ep);
        dbg('EP-CLICK', `User selected ${ep}`);
      }
    };
    document.addEventListener('click', handleEpInteraction, { capture: true, passive: true });
    document.addEventListener('change', e => {
      if (e.target instanceof HTMLSelectElement) {
        const opt = e.target.selectedOptions?.[0];
        const ep = parseEpBadge(opt ? opt.textContent : '', true) || parseEpBadge(opt ? opt.value : '', false);
        if (ep) triggerManualEpisodeSwitch(ep);
      }
    }, { capture: true, passive: true });
  }

  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'tmv270_hide_btn' && data.id !== instanceId) {
      if (Math.abs(data.time - lastRecoveryTime) < 100) {
        if (data.id > instanceId) removeRecovery();
      } else {
        removeRecovery();
      }
      return;
    }
    if (data.type === 'tmv270_parent_fs_lock' && window === window.top) {
      setTopWindowIframeFullscreenLock(Boolean(data.enable));
      return;
    }
    if (data.type === 'tmv270_trigger_next_ep' && window === window.top) {
      if (typeof data.currentEp === 'string' && data.currentEp) state.currentEp = data.currentEp;
      executeNextEpisodeInTopWindow(state.currentEp);
      return;
    }
    if (data.type === 'tmv270_no_next_ep') {
      if (state.overlay) showHud('ไม่พบตอนถัดไป (อาจเป็นตอนล่าสุดแล้ว)', 2200);
      return;
    }
    if (data.type === 'tmv270_seamless_start' && window !== window.top) {
      state.expectingSeamlessEpisode = true;
      if (typeof data.ep === 'string' && data.ep) state.currentEp = data.ep;
      if (typeof data.title === 'string' && data.title) {
        state.cachedTitle = data.title.slice(0, 220);
        setTitleUI(state.cachedTitle, state.currentEp);
      }
      if (typeof data.speed === 'number') state.savedSpeed = data.speed;
      setTopWindowIframeFullscreenLock(true);
      startSeamlessEpisodeRecovery(data.ep || state.currentEp);
      clickPlayerBigPlayButton();
      const v = bestVideo(document);
      if (v && !isDisqualifiedVideo(v)) {
        safePlay(v);
        if (!state.overlay) enterUniversalFullscreen(v);
      }
      return;
    }
    if (data.type === 'tmv270_show_recovery') {
      if (typeof data.ep === 'string' && data.ep) state.currentEp = data.ep;
      if (typeof data.title === 'string' && data.title) {
        state.cachedTitle = data.title.slice(0, 220);
        state.cachedKeysList = null;
        setTitleUI(state.cachedTitle, state.currentEp);
      }
      const v = state.lastActiveVideo?.isConnected && area(state.lastActiveVideo) > 0 && !isDisqualifiedVideo(state.lastActiveVideo)
        ? state.lastActiveVideo
        : bestVideo(document);
      if (v) showRecovery(v);
      return;
    }
    if (window === window.top && data.type === CFG.titleType + ':req' && event.source) {
      try {
        event.source.postMessage({
          type: CFG.titleType + ':res',
          title: refreshTitleCache(false),
          ep: state.currentEp || ''
        }, '*');
      } catch (_) {}
      return;
    }
    if (window !== window.top && data.type === CFG.titleType + ':res' && typeof data.title === 'string' && data.title) {
      const prevEp = state.currentEp;
      if (typeof data.ep === 'string' && data.ep) state.currentEp = data.ep;
      state.cachedTitle = data.title.slice(0, 220);
      state.cachedKeysList = null;
      setTitleUI(state.cachedTitle, state.currentEp);
      if (prevEp && state.currentEp && prevEp !== state.currentEp && state.overlay) {
        showHud(`กำลังเล่น ${state.currentEp}`, 2200);
      }
      if (state.video) tryRestorePlaybackPosition(state.video);
    }
  });

  function broadcastHideRecovery() {
    const msg = { type: 'tmv270_hide_btn', id: instanceId, time: lastRecoveryTime };
    broadcastToAllFrames(msg);
  }

  /* =========================================================
     3. VIDEO DISCOVERY
  ========================================================= */

  function fullscreenElement() {
    return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || null;
  }

  function area(el) {
    try {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r.width * r.height : 0;
    } catch (_) {
      return 0;
    }
  }

  function hasCrossOriginPlayerIframeOnPage() {
    if (window !== window.top) return false;
    return Boolean(findMainPlayerIframeInTopDoc(document));
  }

  function isDisqualifiedVideo(v) {
    if (!isVideo(v)) return true;
    try {
      if (window === window.top && hasCrossOriginPlayerIframeOnPage()) return true;
      if (v.closest('a[href]')) return true;
      const src = `${v.currentSrc || ''} ${v.src || ''}`;
      if (RX.adBannerHint.test(src)) return true;
      const adParent = v.closest('[class*="banner"], [id*="banner"], [class*="ads"], [id*="ads"], .widget, header, nav, footer');
      if (adParent && !adParent.matches(PLAYER_AREA_SEL)) return true;
    } catch (_) {}
    return false;
  }

  function collectVideos(root = document, list = [], depth = 0) {
    if (!root || depth > 5) return list;
    if (window === window.top && hasCrossOriginPlayerIframeOnPage()) return list;
    if (isVideo(root)) {
      if (!isDisqualifiedVideo(root)) list.push(root);
      return list;
    }
    try {
      const vids = root.querySelectorAll('video');
      for (let i = 0; i < vids.length; i++) {
        if (!isDisqualifiedVideo(vids[i])) list.push(vids[i]);
      }
      if (typeof document.createTreeWalker === 'function') {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node = walker.currentNode;
        let count = 0;
        while (node && count < 600) {
          if (node.shadowRoot && node.id !== CFG.shadowHostId && node.id !== CFG.recoveryHostId) {
            collectVideos(node.shadowRoot, list, depth + 1);
          }
          node = walker.nextNode();
          count++;
        }
      }
    } catch (_) {}
    return list;
  }

  function invalidateBestVideoCache() {
    state.bestVideoCache = null;
    state.bestVideoCacheTs = 0;
    state.bestVideoCacheRoot = null;
  }

  function bestVideo(root = document) {
    if (window === window.top && hasCrossOriginPlayerIframeOnPage()) return null;
    const now = performance.now();
    if (
      state.bestVideoCache &&
      state.bestVideoCacheRoot === root &&
      (now - state.bestVideoCacheTs) < CFG.bestVideoCacheMs &&
      state.bestVideoCache.isConnected &&
      area(state.bestVideoCache) > 0 &&
      !isDisqualifiedVideo(state.bestVideoCache)
    ) {
      return state.bestVideoCache;
    }
    if (isVideo(root)) {
      const res = isDisqualifiedVideo(root) ? null : root;
      state.bestVideoCache = res;
      state.bestVideoCacheTs = now;
      state.bestVideoCacheRoot = root;
      return res;
    }
    const videos = collectVideos(root);
    if (!videos.length) {
      if (state.lastActiveVideo?.isConnected && area(state.lastActiveVideo) > 0 && !isDisqualifiedVideo(state.lastActiveVideo)) {
        state.bestVideoCache = state.lastActiveVideo;
        state.bestVideoCacheTs = now;
        state.bestVideoCacheRoot = root;
        return state.lastActiveVideo;
      }
      state.bestVideoCache = null;
      state.bestVideoCacheTs = now;
      state.bestVideoCacheRoot = root;
      return null;
    }
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      if (!v.isConnected) continue;
      const vArea = area(v);
      let score = 0;
      if (vArea > 0) score += 20000;
      if (!v.paused && !v.ended) score += 100000;
      if (v === state.lastActiveVideo) score += 50000;
      if (Number.isFinite(v.duration) && v.duration >= CFG.minMainVideoDurationSec) score += 80000;
      if (v.readyState >= 2) score += 10000;
      score += Math.min(vArea / 100, 40000);
      if (v.currentTime > 0) score += 1000;
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    state.bestVideoCache = best;
    state.bestVideoCacheTs = now;
    state.bestVideoCacheRoot = root;
    return best;
  }

  function ensureSafeContainer(video) {
    if (!video) return null;
    if (video.parentElement?.hasAttribute('data-tmv270-wrapper')) return video.parentElement;
    try {
      const known = video.closest(
        '.html5-video-player, .plyr, .video-js, .jwplayer, .flowplayer, ' +
        '.dplayer, .art-video-player, .mejs__container, .vplayer, ' +
        '[data-player], [data-video-player], [class*="player-container"], ' +
        '[class*="video-container"], [class*="video-player"], [class*="video-wrapper"]'
      );
      if (
        known &&
        known !== document.body &&
        known !== document.documentElement &&
        known.querySelectorAll('video').length <= 2
      ) {
        return known;
      }
    } catch (_) {}
    const vArea = area(video);
    let curr = video.parentElement;
    let best = curr;
    let bestScore = -Infinity;
    let depth = 0;
    while (
      curr &&
      curr !== document.body &&
      curr !== document.documentElement &&
      !(curr instanceof ShadowRoot) &&
      depth < CFG.maxDepth
    ) {
      const a = area(curr);
      if (a > 0) {
        const ratio = vArea ? a / vArea : 999;
        let score = ratio >= 0.95 && ratio <= 2.2 ? 100 : ratio <= 4.5 ? 40 : -Math.min(ratio, 120);
        try {
          if (getComputedStyle(curr).position !== 'static') score += 10;
          if (curr.querySelectorAll('video').length > 1) score -= 80;
        } catch (_) {}
        score -= depth * 4;
        if (score > bestScore) {
          bestScore = score;
          best = curr;
        }
      }
      curr = curr.parentElement;
      depth++;
    }
    if (!best || best === document.body || best === document.documentElement) {
      try {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-tmv270-wrapper', '1');
        wrapper.style.cssText = 'position:relative;width:100%;height:100%;display:contents;';
        video.parentNode.insertBefore(wrapper, video);
        wrapper.appendChild(video);
        state.createdWrapper = wrapper;
        return wrapper;
      } catch (_) {
        return video.parentElement;
      }
    }
    return best;
  }

  /* =========================================================
     4. FULLSCREEN / WAKELOCK
  ========================================================= */

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !state.wakeLock && !document.hidden) {
        state.wakeLock = await navigator.wakeLock.request('screen');
        state.wakeLock.addEventListener('release', () => { state.wakeLock = null; }, { once: true });
      }
    } catch (_) {}
  }

  function releaseWakeLock() {
    if (!state.wakeLock) return;
    try { state.wakeLock.release(); } catch (_) {}
    state.wakeLock = null;
  }

  function tryLockLandscape(video) {
    try {
      if (!screen.orientation || typeof screen.orientation.lock !== 'function') return;
      const isVerticalVideo = video && video.videoHeight > video.videoWidth && video.videoWidth > 0;
      if (isVerticalVideo) return;
      screen.orientation.lock('landscape').then(() => { state.orientationLocked = true; }).catch(() => {});
    } catch (_) {}
  }

  function tryUnlockOrientation() {
    if (!state.orientationLocked) return;
    state.orientationLocked = false;
    try { screen.orientation?.unlock?.(); } catch (_) {}
  }

  function patchFullscreenAPI() {
    if (typeof Element === 'undefined' || !origReqFS) return;
    // Route video fullscreen through our enter path (native first, pseudo fallback)
    const interceptReqFS = function (...args) {
      try {
        if (isVideo(this) && !isDisqualifiedVideo(this)) {
          state.lastActiveVideo = this;
          enterUniversalFullscreen(this);
          return Promise.resolve();
        }
        if (this instanceof Element) {
          const innerVideo = bestVideo(this);
          if (innerVideo) {
            state.lastActiveVideo = innerVideo;
            enterUniversalFullscreen(innerVideo);
            return Promise.resolve();
          }
        }
      } catch (_) {}
      return origReqFS.apply(this, args);
    };
    const applyPatchToTarget = targetWin => {
      if (!targetWin || !targetWin.Element) return;
      try {
        const proto = targetWin.Element.prototype;
        if (proto.requestFullscreen) proto.requestFullscreen = interceptReqFS;
        if (proto.mozRequestFullScreen) proto.mozRequestFullScreen = interceptReqFS;
        if (proto.webkitRequestFullscreen) proto.webkitRequestFullscreen = interceptReqFS;
        if (targetWin.HTMLVideoElement?.prototype?.webkitEnterFullscreen) {
          targetWin.HTMLVideoElement.prototype.webkitEnterFullscreen = function () {
            enterUniversalFullscreen(this);
          };
        }
      } catch (_) {}
    };
    applyPatchToTarget(window);
    if (pageWin && pageWin !== window) applyPatchToTarget(pageWin);
  }

  function unlockIframes() {
    try {
      const iframes = document.querySelectorAll('iframe:not([data-tmv270-unlocked])');
      for (let i = 0; i < iframes.length; i++) {
        const f = iframes[i];
        f.setAttribute('data-tmv270-unlocked', '1');
        if (!f.hasAttribute('allowfullscreen')) f.setAttribute('allowfullscreen', 'true');
        const allow = f.getAttribute('allow') || '';
        if (!allow.includes('fullscreen')) {
          f.setAttribute('allow', allow ? `${allow}; fullscreen *; autoplay *` : 'fullscreen *; autoplay *');
        }
      }
    } catch (_) {}
  }

  /* =========================================================
     5. CSS (TV optimized – large focus rings)
  ========================================================= */

  function installHostStyles(rootDoc = document) {
    if (!rootDoc || rootDoc.getElementById(CFG.hostStyleId)) return;
    const style = rootDoc.createElement('style');
    style.id = CFG.hostStyleId;
    style.textContent = `
      html[${CFG.lockScrollAttr}="1"],
      html[${CFG.lockScrollAttr}="1"] body {
        overflow: hidden !important;
        overscroll-behavior: none !important;
      }
      [${CFG.parentWrapFsAttr}="1"] {
        position: fixed !important; inset: 0 !important;
        width: 100vw !important; height: 100vh !important; height: 100dvh !important;
        max-width: none !important; max-height: none !important;
        margin: 0 !important; padding: 0 !important;
        z-index: 2147483645 !important; background: #000 !important; transform: none !important;
      }
      iframe[${CFG.parentIframeFsAttr}="1"] {
        position: fixed !important; inset: 0 !important; top: 0 !important; left: 0 !important;
        width: 100vw !important; height: 100vh !important; height: 100dvh !important;
        max-width: none !important; max-height: none !important;
        margin: 0 !important; padding: 0 !important; border: 0 !important;
        z-index: 2147483646 !important; background: #000 !important;
      }
      [${CFG.hostAttr}="1"] {
        position: relative !important; width: 100% !important; height: 100% !important;
        max-width: none !important; max-height: none !important;
        background: #000 !important; overflow: hidden !important;
      }
      [${CFG.pseudoAttr}="1"] {
        position: fixed !important; inset: 0 !important;
        width: 100vw !important; height: 100vh !important; height: 100dvh !important;
        max-width: none !important; max-height: none !important;
        margin: 0 !important; padding: 0 !important;
        z-index: 2147483646 !important; background: #000 !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
      }
      [${CFG.hostAttr}="1"] .jw-media, [${CFG.hostAttr}="1"] .jw-aspect,
      [${CFG.hostAttr}="1"] .plyr__video-wrapper, [${CFG.hostAttr}="1"] .vjs-tech,
      [${CFG.hostAttr}="1"] .html5-video-container, [${CFG.hostAttr}="1"] .dplayer-video-wrap,
      [${CFG.hostAttr}="1"] .art-video-player, [${CFG.hostAttr}="1"] .mejs__mediaelement {
        position: absolute !important; inset: 0 !important;
        width: 100% !important; height: 100% !important;
        max-width: none !important; max-height: none !important;
        padding: 0 !important; margin: 0 !important;
      }
      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"] {
        position: absolute !important; inset: 0 !important; top: 0 !important; left: 0 !important;
        width: 100% !important; height: 100% !important;
        max-width: none !important; max-height: none !important;
        min-width: 100% !important; min-height: 100% !important;
        margin: 0 !important; padding: 0 !important; transform: none !important;
        object-position: center center !important; pointer-events: none !important; z-index: 1 !important;
      }
      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"][${CFG.fitAttr}="contain"] { object-fit: contain !important; }
      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"][${CFG.fitAttr}="cover"] { object-fit: cover !important; }
      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"][${CFG.fitAttr}="fill"] { object-fit: fill !important; }
    `;
    (rootDoc.head || rootDoc.documentElement)?.appendChild(style);
  }

  const SHADOW_UI_CSS = `
    :host {
      all: initial;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483647;
      pointer-events: none;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    #${CFG.overlayId} {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #fff;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #${CFG.overlayId}.hidden-ui .v270-ui { opacity: 0; pointer-events: none; }
    #${CFG.overlayId}.hidden-ui .v270-hud { opacity: 0; }
    .v270-dimmer {
      position: absolute;
      inset: 0;
      background: #000;
      opacity: 0;
      pointer-events: none;
      z-index: 0;
      transition: opacity 0.2s ease;
    }
    .v270-absorber {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
    }
    .v270-debug {
      position: absolute;
      top: 12%;
      left: 4%;
      width: 42%;
      max-height: 36%;
      background: rgba(0,0,0,0.82);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 12px;
      line-height: 1.4;
      z-index: 50;
      display: none;
      overflow: hidden;
      pointer-events: none;
    }
    .v270-debug.active { display: block; }
    .v270-debug-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-weight: 700;
      color: #0a84ff;
    }
    .v270-debug-body {
      max-height: 220px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      color: #ccc;
      font-family: ui-monospace, monospace;
      font-size: 11px;
    }
    .v270-hud {
      position: absolute;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.78);
      border: 1.5px solid rgba(255,255,255,0.28);
      border-radius: 16px;
      padding: 14px 28px;
      font-size: 22px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 12px;
      opacity: 0;
      transition: opacity 0.18s ease;
      z-index: 40;
      pointer-events: none;
      text-shadow: 0 1px 4px #000;
    }
    .v270-hud.show { opacity: 1; }
    .v270-hud svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 2; flex-shrink: 0; }
    .v270-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 48px;
      height: 48px;
      margin: -24px 0 0 -24px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #0a84ff;
      border-radius: 50%;
      animation: v270spin 0.7s linear infinite;
      opacity: 0;
      z-index: 30;
      pointer-events: none;
    }
    #${CFG.overlayId}.buffering .v270-spinner { opacity: 1; }
    @keyframes v270spin { to { transform: rotate(360deg); } }

    .v270-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      min-width: 64px;
      border-radius: 50%;
      background: rgba(18, 18, 24, 0.88);
      border: 2px solid rgba(255,255,255,0.22);
      color: #fff;
      cursor: default;
      pointer-events: auto;
      outline: none;
      transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, background 0.12s ease;
    }
    .v270-btn svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      pointer-events: none;
    }
    .v270-btn:focus,
    .v270-btn.focused {
      outline: none;
      border-color: #0a84ff;
      box-shadow: 0 0 0 4px rgba(10, 132, 255, 0.55), 0 0 24px rgba(10, 132, 255, 0.35);
      background: rgba(10, 132, 255, 0.35);
      transform: scale(1.12);
      z-index: 5;
    }

    .v270-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 28px 36px 18px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.88), transparent);
      position: relative;
      z-index: 20;
      width: 100%;
      pointer-events: none;
      box-sizing: border-box;
    }
    .v270-titlebox {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
    }
    .v270-title {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      color: #f5f5f7;
      font-size: 22px;
      font-weight: 600;
      text-shadow: 0 1px 6px rgba(0,0,0,0.9);
    }
    .v270-ep {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 14px;
      border-radius: 10px;
      background: linear-gradient(180deg, #2b9bff 0%, #0a84ff 100%);
      border: 1px solid rgba(255,255,255,0.35);
      color: #fff;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.4px;
      line-height: 1.35;
      box-shadow: 0 2px 10px rgba(10, 132, 255, 0.55);
    }
    .v270-title-main {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #f5f5f7;
      font-weight: 600;
    }
    .v270-actions {
      display: flex;
      align-items: center;
      gap: 14px;
      pointer-events: auto;
      flex-shrink: 0;
    }

    .v270-center {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 40px;
      z-index: 3;
      pointer-events: none;
    }
    .v270-center .v270-btn { width: 72px; height: 72px; min-width: 72px; }
    .v270-center .v270-btn svg { width: 32px; height: 32px; }
    .v270-center .v270-play {
      width: 96px;
      height: 96px;
      min-width: 96px;
      background: rgba(10, 132, 255, 0.92);
      border-color: rgba(255,255,255,0.35);
    }
    .v270-center .v270-play svg { width: 42px; height: 42px; }
    .v270-center .v270-play:focus,
    .v270-center .v270-play.focused {
      background: rgba(10, 132, 255, 1);
      box-shadow: 0 0 0 5px rgba(10, 132, 255, 0.6), 0 0 32px rgba(10, 132, 255, 0.45);
      transform: scale(1.1);
    }

    .v270-bottom {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 16px 36px 32px;
      background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
      z-index: 3;
      pointer-events: auto;
      width: 100%;
      box-sizing: border-box;
    }
    .v270-timeline-row {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
    }
    .v270-time {
      color: #fff;
      font-size: 18px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      min-width: 64px;
      text-align: center;
      text-shadow: 0 1px 4px #000;
    }
    .v270-range {
      flex: 1;
      min-width: 0;
      height: 10px;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      outline: none;
      pointer-events: auto;
    }
    .v270-range::-webkit-slider-runnable-track {
      height: 10px;
      border-radius: 6px;
      background: linear-gradient(to right, #0a84ff var(--v270-pct, 0%), rgba(255,255,255,0.25) var(--v270-pct, 0%));
    }
    .v270-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #0a84ff;
      border: 3px solid #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.6);
      margin-top: -9px;
    }
    .v270-range:focus,
    .v270-range.focused {
      outline: none;
    }
    .v270-range:focus::-webkit-slider-thumb,
    .v270-range.focused::-webkit-slider-thumb {
      box-shadow: 0 0 0 5px rgba(10, 132, 255, 0.55), 0 2px 12px rgba(0,0,0,0.6);
      transform: scale(1.15);
    }
    .v270-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      width: 100%;
    }
    .v270-pill {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 200px;
      background: rgba(18, 18, 24, 0.88);
      border: 2px solid rgba(255,255,255,0.18);
      padding: 10px 18px;
      border-radius: 32px;
      pointer-events: auto;
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
    }
    .v270-pill.focused,
    .v270-pill:focus-within {
      border-color: #0a84ff;
      box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.45);
    }
    .v270-pill svg {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      flex-shrink: 0;
    }
    .v270-pill input[type=range] {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      height: 8px;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      outline: none;
    }
    .v270-pill input[type=range]::-webkit-slider-runnable-track {
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(to right, #0a84ff var(--v270-pct, 0%), rgba(255,255,255,0.22) var(--v270-pct, 0%));
    }
    .v270-pill input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #0a84ff;
      border: 2px solid #fff;
      margin-top: -7px;
    }
    #v270-mute {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 0;
      color: #fff;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
      outline: none;
    }
    #v270-mute:focus,
    #v270-mute.focused {
      box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.55);
      background: rgba(10, 132, 255, 0.25);
    }
    #v270-mute svg { width: 24px; height: 24px; }

    /* Settings panel – modal style for TV */
    .v270-settings-panel {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 520px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      background: rgba(16, 16, 22, 0.97);
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 18px;
      padding: 24px 28px;
      z-index: 60;
      display: none;
      flex-direction: column;
      gap: 16px;
      pointer-events: auto;
      box-shadow: 0 12px 48px rgba(0,0,0,0.7);
    }
    .v270-settings-panel.open { display: flex; }
    .v270-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.12);
    }
    .v270-settings-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 700;
    }
    .v270-settings-title svg { width: 24px; height: 24px; }
    .v270-reset-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.25);
      color: #fff;
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 15px;
      outline: none;
    }
    .v270-reset-btn:focus,
    .v270-reset-btn.focused {
      border-color: #0a84ff;
      box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.5);
      background: rgba(10, 132, 255, 0.25);
    }
    .v270-menu-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 48px;
    }
    .v270-menu-label {
      font-size: 16px;
      color: #e8e8ed;
      flex: 1;
    }
    .v270-stepper {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .v270-step-btn {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(255,255,255,0.1);
      border: 2px solid rgba(255,255,255,0.2);
      color: #fff;
      font-size: 22px;
      font-weight: 700;
      outline: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .v270-step-btn:focus,
    .v270-step-btn.focused {
      border-color: #0a84ff;
      box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.5);
      background: rgba(10, 132, 255, 0.3);
    }
    .v270-step-input {
      width: 72px;
      height: 44px;
      text-align: center;
      font-size: 18px;
      font-weight: 600;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      color: #fff;
      outline: none;
    }
    .v270-step-input:focus {
      border-color: #0a84ff;
      box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.4);
    }
    .v270-switch {
      position: relative;
      width: 56px;
      height: 32px;
      flex-shrink: 0;
    }
    .v270-switch input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .v270-switch-slider {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.2);
      border-radius: 32px;
      border: 2px solid rgba(255,255,255,0.25);
      transition: 0.2s;
      cursor: default;
    }
    .v270-switch-slider::before {
      content: '';
      position: absolute;
      width: 24px;
      height: 24px;
      left: 2px;
      bottom: 2px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }
    .v270-switch input:checked + .v270-switch-slider {
      background: #0a84ff;
      border-color: #0a84ff;
    }
    .v270-switch input:checked + .v270-switch-slider::before {
      transform: translateX(24px);
    }
    .v270-switch.focused .v270-switch-slider,
    .v270-switch:focus-within .v270-switch-slider {
      box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.55);
    }

    #${CFG.overlayId}.locked .v270-titlebox,
    #${CFG.overlayId}.locked .v270-center,
    #${CFG.overlayId}.locked .v270-bottom,
    #${CFG.overlayId}.locked #v270-next-ep,
    #${CFG.overlayId}.locked #v270-settings-btn,
    #${CFG.overlayId}.locked #v270-aspect,
    #${CFG.overlayId}.locked #v270-exit {
      display: none;
    }
    #${CFG.overlayId}.locked .v270-top {
      justify-content: flex-end;
      background: transparent;
    }
    #${CFG.overlayId}.locked #v270-lock {
      pointer-events: auto;
      display: inline-flex;
      background: rgba(255, 69, 58, 0.85);
    }
  `;

  const RECOVERY_SHADOW_CSS = `
    :host {
      all: initial;
      position: fixed;
      inset: 0;
      width: 0;
      height: 0;
      z-index: 2147483646;
      pointer-events: none;
    }
    #${CFG.recoveryId} {
      position: fixed;
      top: 80px;
      right: 28px;
      z-index: 2147483646;
      background: rgba(10, 132, 255, 0.92);
      border: 3px solid rgba(255,255,255,0.55);
      border-radius: 50%;
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 0;
      margin: 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.55);
      pointer-events: auto;
      outline: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    #${CFG.recoveryId} svg {
      width: 32px;
      height: 32px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      pointer-events: none;
    }
    #${CFG.recoveryId}:focus,
    #${CFG.recoveryId}.focused {
      outline: none;
      box-shadow: 0 0 0 5px rgba(10, 132, 255, 0.6), 0 4px 24px rgba(0,0,0,0.6);
      transform: scale(1.12);
    }
  `;

  /* =========================================================
     6. PLAYBACK HELPERS
  ========================================================= */

  function showHud(text, duration = 1000) {
    const hud = state.refs?.hud;
    if (!hud) return;
    hud.innerHTML = `<span>${escapeHtml(text)}</span>`;
    hud.classList.add('show');
    if (state.hudTimer) clearTimeout(state.hudTimer);
    state.hudTimer = setTimeout(() => {
      state.hudTimer = 0;
      hud.classList.remove('show');
    }, duration);
  }

  function applyAspectMode(video, modeIndex) {
    if (!video) return;
    const mode = ASPECT_MODES[modeIndex] || ASPECT_MODES[0];
    try {
      video.setAttribute(CFG.fitAttr, mode.key);
      video.style.setProperty('object-fit', mode.key, 'important');
      video.style.setProperty('object-position', 'center center', 'important');
    } catch (_) {}
  }

  function styleRangeTrack(inputEl, pct) {
    if (!inputEl) return;
    const p = clamp(Number(pct) || 0, 0, 100);
    inputEl.style.setProperty('--v270-pct', `${p}%`);
  }

  function applyBrightness(video, val) {
    if (!video) return;
    const clamped = clamp(Number(val) || 1, 0.25, 1.75);
    state.brightness = clamped;
    const baseFilter = state.originalVideo?.filter || '';
    const dimmer = state.refs?.dimmer;
    try {
      if (clamped <= 1) {
        if (video.style.filter !== baseFilter) video.style.filter = baseFilter;
        if (dimmer) {
          const dimOpacity = Math.round((1 - clamped) * 0.88 * 1000) / 1000;
          dimmer.style.opacity = dimOpacity > 0.005 ? String(dimOpacity) : '0';
        }
      } else {
        if (dimmer) dimmer.style.opacity = '0';
        video.style.filter = `${baseFilter ? baseFilter + ' ' : ''}brightness(${clamped})`;
      }
    } catch (_) {}
    if (state.refs?.brightness) {
      const pct = ((clamped - 0.25) / 1.5) * 100;
      styleRangeTrack(state.refs.brightness, pct);
    }
  }

  function setNativeVolume(video, level) {
    if (!video) return;
    const val = clamp(Number(level) || 0, 0, 1);
    try {
      video.volume = val;
      video.muted = val <= 0;
      if (val > 0) state.lastVolume = val;
    } catch (_) {}
    if (state.refs?.volume) styleRangeTrack(state.refs.volume, val * 100);
  }

  function safePlay(video) {
    if (!video) return;
    try {
      const p = video.play();
      if (p?.catch) {
        p.catch(() => {
          setTimeout(() => {
            try {
              if (video.paused) {
                const p2 = video.play();
                if (p2?.catch) p2.catch(() => {});
              }
            } catch (_) {}
          }, 80);
        });
      }
      if (video.paused) {
        try {
          video.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch (_) {}
      }
    } catch (_) {}
  }

  function isMSEOrBlobStream(video) {
    const src = video?.currentSrc || video?.src || '';
    return src.startsWith('blob:') || !src;
  }

  function safeSeek(video, time, useFastSeek = false) {
    if (!video || !Number.isFinite(time)) return false;
    try {
      let target = Math.max(0, time);
      const dur = video.duration;
      if (Number.isFinite(dur) && dur > 0) {
        target = Math.min(target, Math.max(0, dur - 0.25));
      } else {
        const ranges = video.seekable;
        if (ranges && ranges.length > 0) {
          const start = ranges.start(0);
          const end = ranges.end(ranges.length - 1);
          if (end > 1) target = clamp(target, start, end);
        }
      }
      if (useFastSeek && typeof video.fastSeek === 'function' && !isMSEOrBlobStream(video)) {
        try {
          video.fastSeek(target);
          return true;
        } catch (_) {}
      }
      video.currentTime = target;
      return true;
    } catch (_) {
      return false;
    }
  }

  function attemptMediaErrorRecovery(video) {
    if (!video || !video.error) return;
    const code = video.error.code;
    const now = Date.now();
    if (now - state.lastHealAttemptTs < 2500) return;
    if (state.healRetryCount >= 4) {
      dbg('HEAL', `Max retries reached for MediaError ${code}`);
      return;
    }
    state.lastHealAttemptTs = now;
    state.healRetryCount++;
    const resumeTarget = Math.max(
      state.lastKnownGoodTime || 0,
      Number.isFinite(video.currentTime) ? video.currentTime : 0
    ) + 0.65;
    dbg('HEAL', `Recovering MediaError ${code} -> ${formatTime(resumeTarget)} (#${state.healRetryCount})`);
    showHud('กำลังซ่อมแซมสัญญาณภาพอัตโนมัติ...', 2000);
    try {
      if (isMSEOrBlobStream(video)) {
        safeSeek(video, resumeTarget, false);
        setTimeout(() => safePlay(video), 150);
      } else {
        const curSrc = video.currentSrc || video.src;
        if (curSrc) {
          video.load();
          video.addEventListener('loadedmetadata', () => {
            safeSeek(video, resumeTarget, false);
            safePlay(video);
          }, { once: true });
        } else {
          safeSeek(video, resumeTarget, false);
          safePlay(video);
        }
      }
    } catch (_) {}
  }

  function enterPseudoFullscreen(video, container) {
    dbg('FS', 'Entering Pseudo Fullscreen (fallback)');
    if (container.hasAttribute('data-tmv270-wrapper')) {
      try { container.style.display = 'block'; } catch (_) {}
    }
    setTopWindowIframeFullscreenLock(true);
    tryLockLandscape(video);
    createOverlay(video, container, true);
    setTimeout(() => ensureFocusSink(), 120);
    setTimeout(() => ensureFocusSink(), 400);
  }

  function enterUniversalFullscreen(video) {
    if (!video || isDisqualifiedVideo(video)) return;
    state.lastActiveVideo = video;
    const container = ensureSafeContainer(video);
    if (!container) return;
    removeRecovery();

    // Prefer Native Fullscreen (no browser address bar) on Android TV.
    // If native FS fails or is blocked → Pseudo fallback.
    // Remote keys are kept alive via body-level focus sink + capture listeners
    // (see ensureFocusSink / installRemoteKeyListeners) — NOT tied to Shadow only.
    dbg('FS', 'Trying Native Fullscreen first (clean chrome)');
    if (container.hasAttribute('data-tmv270-wrapper')) {
      try { container.style.display = 'block'; } catch (_) {}
    }

    if (origReqFS) {
      try {
        const res = origReqFS.call(container, { navigationUI: 'hide' });
        if (res && typeof res.then === 'function') {
          res.then(() => {
            dbg('FS', 'Native Fullscreen OK');
            setTopWindowIframeFullscreenLock(false);
            tryLockLandscape(video);
            createOverlay(video, container, false);
            // Aggressive reclaim — TV WebView focuses <video> right after FS
            [50, 150, 350, 700, 1200, 2000].forEach(ms =>
              setTimeout(() => ensureFocusSink(true), ms)
            );
          }).catch(err => {
            dbg('FS', `Native FS rejected → Pseudo (${err && err.message ? err.message : 'err'})`);
            enterPseudoFullscreen(video, container);
          });
          return;
        }
        // Non-promise path (older WebKit)
        if (fullscreenElement()) {
          setTopWindowIframeFullscreenLock(false);
          tryLockLandscape(video);
          createOverlay(video, container, false);
          [50, 200, 600, 1200].forEach(ms => setTimeout(() => ensureFocusSink(true), ms));
          return;
        }
      } catch (err) {
        dbg('FS', `Native FS threw → Pseudo`);
      }
    }
    enterPseudoFullscreen(video, container);
  }

  function exitUniversalFullscreen() {
    state.expectingSeamlessEpisode = false;
    clearAutoFullscreenBridge();
    setTopWindowIframeFullscreenLock(false);
    tryUnlockOrientation();
    releaseWakeLock();
    if (state.pseudoFullscreen) {
      destroyController(true);
      return;
    }
    const fs = fullscreenElement();
    if (fs) {
      try {
        const res = document.exitFullscreen?.() || document.mozCancelFullScreen?.() || document.webkitExitFullscreen?.();
        if (res?.catch) res.catch(() => destroyController(true));
      } catch (_) {
        destroyController(true);
      }
    } else {
      destroyController(true);
    }
  }

  /* =========================================================
     7. RECOVERY BUTTON (TV – focusable, no drag)
  ========================================================= */

  function removeRecovery() {
    if (state.recoveryHideTimer) {
      clearTimeout(state.recoveryHideTimer);
      state.recoveryHideTimer = 0;
    }
    document.getElementById(CFG.recoveryHostId)?.remove();
  }

  function showRecovery(video) {
    if (
      !video ||
      !video.isConnected ||
      isDisqualifiedVideo(video) ||
      document.hidden ||
      fullscreenElement() ||
      state.pseudoFullscreen ||
      state.overlay
    ) return;
    const vArea = area(video);
    const winArea = window.innerWidth * window.innerHeight;
    if (vArea < 25000 || (winArea > 0 && vArea / winArea < 0.08)) return;

    installHostStyles();
    let recHost = document.getElementById(CFG.recoveryHostId);
    lastRecoveryTime = Date.now();

    if (!recHost) {
      recHost = document.createElement('div');
      recHost.id = CFG.recoveryHostId;
      const shadow = recHost.attachShadow({ mode: 'open' });
      const styleEl = document.createElement('style');
      styleEl.textContent = RECOVERY_SHADOW_CSS;
      shadow.appendChild(styleEl);

      const btn = document.createElement('button');
      btn.id = CFG.recoveryId;
      btn.type = 'button';
      btn.title = 'Enter Fullscreen';
      btn.setAttribute('aria-label', 'Enter Fullscreen');
      btn.setAttribute('tabindex', '0');
      btn.innerHTML = icon('enter');

      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const targetVideo = (state.lastActiveVideo?.isConnected && area(state.lastActiveVideo) > 0 && !isDisqualifiedVideo(state.lastActiveVideo))
          ? state.lastActiveVideo
          : bestVideo();
        removeRecovery();
        if (targetVideo) enterUniversalFullscreen(targetVideo);
      });

      // Keyboard: OK / Enter on recovery button
      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Select') {
          e.preventDefault();
          e.stopPropagation();
          btn.click();
        }
      });

      shadow.appendChild(btn);
      (document.body || document.documentElement)?.appendChild(recHost);
      broadcastHideRecovery();
      // Auto-focus recovery so remote can press OK immediately
      setTimeout(() => {
        try { btn.focus(); } catch (_) {}
      }, 80);
    }

    if (state.recoveryHideTimer) clearTimeout(state.recoveryHideTimer);
    state.recoveryHideTimer = setTimeout(() => {
      state.recoveryHideTimer = 0;
      recHost?.remove();
    }, 8000);
  }

  /* =========================================================
     8. HOST / NATIVE CONTROLS
  ========================================================= */

  function suppressHostAndNativeControls(video, container, isPseudo) {
    state.originalVideo = {
      objectFit: video.style.getPropertyValue('object-fit'),
      objectFitPriority: video.style.getPropertyPriority('object-fit'),
      objectPosition: video.style.getPropertyValue('object-position'),
      objectPositionPriority: video.style.getPropertyPriority('object-position'),
      filter: video.style.filter,
      controlsProp: Boolean(video.controls),
      controlsAttr: video.getAttribute('controls'),
      tabIndexAttr: video.getAttribute('tabindex')
    };
    try {
      video.controls = false;
      video.removeAttribute('controls');
      // Prevent <video> from stealing D-pad focus on Android TV
      video.setAttribute('tabindex', '-1');
      try { video.blur(); } catch (_) {}
      video.setAttribute(CFG.videoAttr, '1');
      applyAspectMode(video, state.aspectIndex);
    } catch (_) {}
    state.originalPosition = null;
    state.changedPosition = false;
    state.pseudoFullscreen = Boolean(isPseudo);
    try {
      container.setAttribute(CFG.hostAttr, '1');
      if (isPseudo) {
        container.setAttribute(CFG.pseudoAttr, '1');
        document.documentElement.setAttribute(CFG.lockScrollAttr, '1');
        setTopWindowIframeFullscreenLock(true);
      } else if (getComputedStyle(container).position === 'static') {
        state.originalPosition = {
          value: container.style.getPropertyValue('position'),
          priority: container.style.getPropertyPriority('position')
        };
        container.style.setProperty('position', 'relative', 'important');
        state.changedPosition = true;
      }
    } catch (_) {}
  }

  function restoreHostAndNativeControls() {
    const video = state.video;
    const origV = state.originalVideo;
    if (video) {
      try {
        video.removeAttribute(CFG.videoAttr);
        video.removeAttribute(CFG.fitAttr);
        if (origV) {
          if (origV.objectFit) video.style.setProperty('object-fit', origV.objectFit, origV.objectFitPriority);
          else video.style.removeProperty('object-fit');
          if (origV.objectPosition) video.style.setProperty('object-position', origV.objectPosition, origV.objectPositionPriority);
          else video.style.removeProperty('object-position');
          video.style.filter = origV.filter;
          if (origV.controlsAttr !== null) video.setAttribute('controls', origV.controlsAttr);
          if (origV.controlsProp) video.controls = true;
          if (origV.tabIndexAttr !== null && origV.tabIndexAttr !== undefined) {
            video.setAttribute('tabindex', origV.tabIndexAttr);
          } else {
            video.removeAttribute('tabindex');
          }
        }
      } catch (_) {}
    }
    const container = state.container;
    if (container) {
      try {
        container.removeAttribute(CFG.hostAttr);
        container.removeAttribute(CFG.pseudoAttr);
        if (state.changedPosition && state.originalPosition) {
          if (state.originalPosition.value) {
            container.style.setProperty('position', state.originalPosition.value, state.originalPosition.priority);
          } else {
            container.style.removeProperty('position');
          }
        }
        if (container.hasAttribute('data-tmv270-wrapper')) container.style.display = 'contents';
      } catch (_) {}
    }
    document.documentElement.removeAttribute(CFG.lockScrollAttr);
    setTopWindowIframeFullscreenLock(false);
    state.originalVideo = null;
    state.originalPosition = null;
    state.changedPosition = false;
    state.pseudoFullscreen = false;
  }

  /* =========================================================
     9. FOCUS SYSTEM + REMOTE KEY HANDLER (CORE OF TV)
  ========================================================= */

  function clearHide() {
    if (state.hideTimer) clearTimeout(state.hideTimer);
    state.hideTimer = 0;
  }

  function clearSettingsHide() {
    if (state.settingsHideTimer) clearTimeout(state.settingsHideTimer);
    state.settingsHideTimer = 0;
  }

  function cancelProgress() {
    if (state.progressFrame) cancelAnimationFrame(state.progressFrame);
    state.progressFrame = 0;
  }

  function visibleUI() {
    return !!(
      state.overlay &&
      state.refs &&
      !state.locked &&
      !state.seeking &&
      !document.hidden &&
      !state.overlay.classList.contains('hidden-ui')
    );
  }

  function updateProgress(force = false) {
    const video = state.video;
    const refs = state.refs;
    if (!video || !refs || state.seeking) return;
    if (!force && !visibleUI()) return;
    const now = performance.now();
    if (!force && now - state.lastProgressUpdateTs < 200) return;
    state.lastProgressUpdateTs = now;
    const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const second = Math.floor(current);
    if (force || refs.lastSecond !== second) {
      refs.lastSecond = second;
      refs.current.textContent = formatTime(current);
      if (state.debugEnabled) renderDebugConsole();
    }
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      if (refs.lastDuration !== -1) {
        refs.lastDuration = -1;
        refs.duration.textContent = 'LIVE';
        refs.timeline.disabled = true;
        refs.timeline.value = '0';
        styleRangeTrack(refs.timeline, 0);
      }
      return;
    }
    refs.timeline.disabled = false;
    const percent = clamp((current / duration) * 100, 0, 100);
    const rounded = Math.round(percent * 10) / 10;
    if (force || refs.lastPercent !== rounded) {
      refs.lastPercent = rounded;
      refs.timeline.value = String(rounded);
      styleRangeTrack(refs.timeline, rounded);
    }
    const durSec = Math.floor(duration);
    if (force || refs.lastDuration !== durSec) {
      refs.lastDuration = durSec;
      refs.duration.textContent = formatTime(duration);
    }
  }

  function queueProgress(force = false) {
    if (!state.refs) return;
    if (force) {
      cancelProgress();
      updateProgress(true);
      return;
    }
    if (!visibleUI() || state.progressFrame) return;
    state.progressFrame = requestAnimationFrame(() => {
      state.progressFrame = 0;
      updateProgress();
    });
  }

  function resetAutoHide() {
    const overlay = state.overlay;
    if (!overlay) return;
    clearHide();
    overlay.classList.remove('hidden-ui');
    queueProgress(true);
    if (state.locked || state.seeking || document.hidden || state.settingsOpen) return;
    state.hideTimer = setTimeout(() => {
      state.hideTimer = 0;
      if (
        state.overlay !== overlay ||
        state.locked ||
        state.seeking ||
        state.settingsOpen
      ) return;
      closeSettingsPanel();
      overlay.classList.add('hidden-ui');
      cancelProgress();
    }, CFG.hideDelay);
  }

  function addEvent(target, type, handler, options, abortCtrl = state.abort) {
    if (!target || !abortCtrl) return;
    try {
      target.addEventListener(type, handler, { ...(options || {}), signal: abortCtrl.signal });
    } catch (_) {}
  }

  // ---- Focus management ----
  function rebuildFocusList() {
    if (!state.overlay || !state.refs) {
      state.focusables = [];
      return;
    }
    if (state.settingsOpen) {
      // Settings panel focusables
      const panel = state.refs.settingsPanel;
      if (!panel) {
        state.focusables = [];
        return;
      }
      const list = [];
      const selectors = [
        '#v270-seekstep-dec', '#v270-seekstep-inc',
        '#v270-minspeed-dec', '#v270-minspeed-inc',
        '#v270-maxspeed-dec', '#v270-maxspeed-inc',
        '#v270-autonext-toggle',
        '#v270-resume-toggle',
        '#v270-debug-toggle',
        '#v270-reset-defaults',
        '#v270-settings-close'
      ];
      for (const sel of selectors) {
        const el = panel.querySelector(sel);
        if (el) list.push(el);
      }
      state.focusables = list;
      state.focusGroup = 'settings';
      return;
    }
    // Main UI focusables (row order for D-pad)
    // Row1: nextEp, settings, aspect, lock, exit
    // Row2: back, play, next
    // Row3: timeline
    // Row4: brightness, mute, volume
    const r = state.refs;
    const list = [];
    const ids = [
      'nextEpBtn', 'settingsBtn', 'aspectBtn', 'lockBtn', 'exitBtn',
      'backBtn', 'playBtn', 'nextBtn',
      'timeline',
      'brightness', 'muteBtn', 'volume'
    ];
    for (const id of ids) {
      const el = r[id];
      if (el) list.push(el);
    }
    state.focusables = list;
    state.focusGroup = 'main';
  }

  function setFocusedIndex(idx, showHudHint = false) {
    const list = state.focusables;
    if (!list.length) return;
    const prev = list[state.focusIndex];
    if (prev) {
      prev.classList.remove('focused');
      try { prev.blur(); } catch (_) {}
    }
    state.focusIndex = clamp(idx, 0, list.length - 1);
    const cur = list[state.focusIndex];
    if (cur) {
      cur.classList.add('focused');
      try { cur.focus({ preventScroll: true }); } catch (_) {}
    }
  }

  function moveFocus(delta) {
    if (!state.focusables.length) return;
    setFocusedIndex(state.focusIndex + delta);
    resetAutoHide();
  }

  function activateFocused() {
    const el = state.focusables[state.focusIndex];
    if (!el) return;
    const id = el.id || '';
    // Dispatch click for buttons / switches
    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' && el.type === 'checkbox') {
      el.click();
      return;
    }
    // Timeline / ranges: OK does nothing special (use ←→ to scrub)
    if (id === 'v270-timeline' || id === 'v270-brightness' || id === 'v270-volume') {
      showHud('ใช้ปุ่ม ← → เพื่อปรับค่า', 900);
      return;
    }
    el.click?.();
  }

  function closeSettingsPanel() {
    if (!state.settingsOpen) return;
    state.settingsOpen = false;
    clearSettingsHide();
    const panel = state.refs?.settingsPanel;
    if (panel) panel.classList.remove('open');
    state.overlay?.classList.remove('settings-open');
    rebuildFocusList();
    // Focus settings button after close
    const idx = state.focusables.findIndex(el => el === state.refs?.settingsBtn);
    setFocusedIndex(idx >= 0 ? idx : 0);
    resetAutoHide();
  }

  function openSettingsPanel() {
    state.settingsOpen = true;
    clearHide();
    clearSettingsHide();
    const panel = state.refs?.settingsPanel;
    if (panel) panel.classList.add('open');
    state.overlay?.classList.add('settings-open');
    // Sync values
    const r = state.refs;
    if (r.seekStepInput) r.seekStepInput.value = String(state.seekStep);
    if (r.minSpeedInput) r.minSpeedInput.value = String(state.minSpeed);
    if (r.maxSpeedInput) r.maxSpeedInput.value = String(state.maxSpeed);
    if (r.autoNextToggle) r.autoNextToggle.checked = Boolean(state.autoNextEnabled);
    if (r.resumeToggle) r.resumeToggle.checked = Boolean(state.resumeEnabled);
    if (r.debugToggle) r.debugToggle.checked = Boolean(state.debugEnabled);
    rebuildFocusList();
    setFocusedIndex(0);
  }

  function stopHold() {
    if (state.holdTimer) {
      clearTimeout(state.holdTimer);
      state.holdTimer = 0;
    }
    if (state.holdInterval) {
      clearInterval(state.holdInterval);
      state.holdInterval = 0;
    }
    state.holdKey = null;
  }

  function startHold(key, actionFn) {
    stopHold();
    state.holdKey = key;
    state.holdStarted = performance.now();
    // First tick after short delay, then repeat
    state.holdTimer = setTimeout(() => {
      state.holdTimer = 0;
      actionFn();
      state.holdInterval = setInterval(actionFn, CFG.holdRepeatMs);
    }, 380);
  }

  /* Android TV / Leanback keyCode map (many WebViews only set keyCode, key="Unidentified") */
  function mapRemoteKey(e) {
    const key = e.key || '';
    const code = e.code || '';
    const kc = e.keyCode || e.which || 0;
    // DPAD: 19 up, 20 down, 21 left, 22 right, 23 center
    // BACK: 4, ENTER: 66, SPACE: 62, ESC: 27
    // MEDIA: 85 play/pause, 126 play, 127 pause, 87 next, 88 prev, 90 FF, 89 RW
    const isLeft =
      key === 'ArrowLeft' || code === 'ArrowLeft' || key === 'Left' ||
      code === 'KeyA' || kc === 21 || kc === 37;
    const isRight =
      key === 'ArrowRight' || code === 'ArrowRight' || key === 'Right' ||
      code === 'KeyD' || kc === 22 || kc === 39;
    const isUp =
      key === 'ArrowUp' || code === 'ArrowUp' || key === 'Up' ||
      code === 'KeyW' || kc === 19 || kc === 38;
    const isDown =
      key === 'ArrowDown' || code === 'ArrowDown' || key === 'Down' ||
      code === 'KeyS' || kc === 20 || kc === 40;
    // OK: Xiaomi/Chrome TV often sends keyCode 13 (not Android 23/66)
    const isOK =
      key === 'Enter' || key === ' ' || key === 'Select' || code === 'Select' ||
      code === 'NumpadEnter' || code === 'Space' ||
      kc === 13 || kc === 23 || kc === 66 || kc === 32 || kc === 62 || kc === 160;
    const isBack =
      key === 'Escape' || key === 'Backspace' || key === 'BrowserBack' ||
      key === 'GoBack' || code === 'Escape' || code === 'Backspace' ||
      code === 'GoBack' || kc === 4 || kc === 27 || kc === 8 || kc === 166;
    // Channel +/- on TV remote (Chrome: key ChannelUp/Down, kc 33/34)
    const isChUp =
      key === 'ChannelUp' || code === 'ChannelUp' || key === 'PageUp' || code === 'PageUp' || kc === 33;
    const isChDown =
      key === 'ChannelDown' || code === 'ChannelDown' || key === 'PageDown' || code === 'PageDown' || kc === 34;
    const isMediaPlay =
      key === 'MediaPlay' || code === 'MediaPlay' ||
      key === 'MediaPlayPause' || code === 'MediaPlayPause' ||
      kc === 126 || kc === 85;
    const isMediaPause =
      key === 'MediaPause' || code === 'MediaPause' || kc === 127;
    const isMediaNext =
      key === 'MediaTrackNext' || code === 'MediaTrackNext' || kc === 87;
    const isMediaPrev =
      key === 'MediaTrackPrevious' || code === 'MediaTrackPrevious' || kc === 88;
    const isMediaFF =
      key === 'MediaFastForward' || code === 'MediaFastForward' || kc === 90;
    const isMediaRW =
      key === 'MediaRewind' || code === 'MediaRewind' || kc === 89;
    return {
      isLeft, isRight, isUp, isDown, isOK, isBack, isChUp, isChDown,
      isMediaPlay, isMediaPause, isMediaNext, isMediaPrev, isMediaFF, isMediaRW,
      kc, key, code
    };
  }

  function handleRemoteKey(e) {
    if (!state.overlay || state.destroyed) return;

    const mapped = mapRemoteKey(e);
    const {
      isLeft, isRight, isUp, isDown, isOK, isBack, isChUp, isChDown,
      isMediaPlay, isMediaPause, isMediaNext, isMediaPrev, isMediaFF, isMediaRW, kc
    } = mapped;

    // Not a remote navigation key → ignore
    if (!(isLeft || isRight || isUp || isDown || isOK || isBack || isChUp || isChDown ||
          isMediaPlay || isMediaPause || isMediaNext || isMediaPrev || isMediaFF || isMediaRW)) {
      return;
    }

    // Debounce: same key delivered on both window+document within 30ms
    const sig = `${kc}|${mapped.key}|${mapped.code}|${isLeft}|${isRight}|${isUp}|${isDown}|${isOK}|${isBack}`;
    const now = performance.now();
    if (sig === state.lastKeySig && now - state.lastKeyTs < 40) return;
    state.lastKeySig = sig;
    state.lastKeyTs = now;

    // Always consume — prevent browser spatial-nav / exit-FS from stealing
    try {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    } catch (_) {}

    // Re-assert focus sink so subsequent keys keep arriving on TV WebViews
    ensureFocusSink();
    dbg('KEY', `${mapped.key||'?'} code=${mapped.code||'?'} kc=${kc}`);

    // Locked mode: only OK unlocks, Back exits
    if (state.locked) {
      if (isOK) {
        // Unlock
        state.locked = false;
        state.refs?.lockBtn && (state.refs.lockBtn.innerHTML = icon('unlock'));
        state.overlay.classList.remove('locked');
        showHud('ปลดล็อกหน้าจอ', 900);
        rebuildFocusList();
        setFocusedIndex(0);
        resetAutoHide();
      } else if (isBack) {
        exitUniversalFullscreen();
      }
      return;
    }

    // Settings panel open
    if (state.settingsOpen) {
      if (isBack) {
        closeSettingsPanel();
        return;
      }
      if (isUp) {
        moveFocus(-1);
        return;
      }
      if (isDown) {
        moveFocus(1);
        return;
      }
      if (isOK) {
        activateFocused();
        return;
      }
      // Left/Right on steppers when focused
      if (isLeft || isRight) {
        const el = state.focusables[state.focusIndex];
        if (!el) return;
        const id = el.id || '';
        if (id.includes('dec') && isLeft) el.click();
        else if (id.includes('inc') && isRight) el.click();
        else if (id.includes('dec') && isRight) {
          // jump to matching inc
          const pair = id.replace('-dec', '-inc');
          const idx = state.focusables.findIndex(x => x.id === pair);
          if (idx >= 0) setFocusedIndex(idx);
        } else if (id.includes('inc') && isLeft) {
          const pair = id.replace('-inc', '-dec');
          const idx = state.focusables.findIndex(x => x.id === pair);
          if (idx >= 0) setFocusedIndex(idx);
        }
        return;
      }
      return;
    }

    // Hidden UI → any key shows UI first
    if (state.overlay.classList.contains('hidden-ui')) {
      if (isBack) {
        exitUniversalFullscreen();
        return;
      }
      resetAutoHide();
      rebuildFocusList();
      // Prefer focusing play button
      const playIdx = state.focusables.findIndex(el => el === state.refs?.playBtn);
      setFocusedIndex(playIdx >= 0 ? playIdx : 0);
      if (isOK || isMediaPlay || isMediaPause) {
        // Also toggle play
        togglePlayPause();
      }
      return;
    }

    // Media keys (global shortcuts) — PlayPause (85) toggles
    if (isMediaPlay || isMediaPause) {
      togglePlayPause();
      resetAutoHide();
      return;
    }
    if (isMediaNext || isMediaFF) {
      const step = state.seekStep;
      safeSeek(state.video, (state.video?.currentTime || 0) + step, false);
      showHud(`+${step} วินาที`, 800);
      queueProgress(true);
      resetAutoHide();
      return;
    }
    if (isMediaPrev || isMediaRW) {
      const step = state.seekStep;
      safeSeek(state.video, (state.video?.currentTime || 0) - step, false);
      showHud(`-${step} วินาที`, 800);
      queueProgress(true);
      resetAutoHide();
      return;
    }
    // Channel +/- on remote → seek (Xiaomi TV: keyCode 33/34)
    if (isChUp) {
      const step = state.seekStep;
      safeSeek(state.video, (state.video?.currentTime || 0) + step, false);
      showHud(`+${step} วินาที`, 800);
      queueProgress(true);
      resetAutoHide();
      return;
    }
    if (isChDown) {
      const step = state.seekStep;
      safeSeek(state.video, (state.video?.currentTime || 0) - step, false);
      showHud(`-${step} วินาที`, 800);
      queueProgress(true);
      resetAutoHide();
      return;
    }

    // Back hierarchy
    if (isBack) {
      if (state.settingsOpen) {
        closeSettingsPanel();
        return;
      }
      // If UI visible → hide UI first
      if (!state.overlay.classList.contains('hidden-ui')) {
        state.overlay.classList.add('hidden-ui');
        clearHide();
        cancelProgress();
        return;
      }
      exitUniversalFullscreen();
      return;
    }

    // OK / Select
    if (isOK) {
      // Special: when focused on play, or no specific focus, toggle play
      const el = state.focusables[state.focusIndex];
      if (!el || el === state.refs?.playBtn) {
        togglePlayPause();
      } else {
        activateFocused();
      }
      resetAutoHide();
      return;
    }

    // D-pad navigation + contextual actions
    const focused = state.focusables[state.focusIndex];
    const fid = focused?.id || '';

    // Timeline focused → ← → seek, ↑ ↓ leave timeline
    if (fid === 'v270-timeline') {
      if (isLeft || isRight) {
        const step = state.seekStep;
        const delta = isLeft ? -step : step;
        safeSeek(state.video, (state.video?.currentTime || 0) + delta, false);
        showHud(`${delta > 0 ? '+' : ''}${delta} วินาที`, 700);
        queueProgress(true);
        // Hold support
        if (!state.holdKey) {
          startHold(isLeft ? 'ArrowLeft' : 'ArrowRight', () => {
            const d = isLeft ? -CFG.seekStepHold : CFG.seekStepHold;
            safeSeek(state.video, (state.video?.currentTime || 0) + d, true);
            queueProgress(true);
          });
        }
        resetAutoHide();
        return;
      }
      if (isUp) {
        // go to center row (play area)
        const playIdx = state.focusables.findIndex(el => el === state.refs?.playBtn);
        setFocusedIndex(playIdx >= 0 ? playIdx : state.focusIndex - 1);
        resetAutoHide();
        return;
      }
      if (isDown) {
        // go to bottom controls
        const brightIdx = state.focusables.findIndex(el => el === state.refs?.brightness);
        setFocusedIndex(brightIdx >= 0 ? brightIdx : state.focusIndex + 1);
        resetAutoHide();
        return;
      }
    }

    // Brightness / Volume focused → ← → adjust
    if (fid === 'v270-brightness') {
      if (isLeft || isRight) {
        const delta = isLeft ? -0.05 : 0.05;
        const next = clamp(Math.round((state.brightness + delta) * 100) / 100, 0.25, 1.75);
        applyBrightness(state.video, next);
        if (state.refs.brightness) state.refs.brightness.value = String(next);
        showHud(`ความสว่าง ${Math.round(next * 100)}%`, 700);
        savePrefs();
        resetAutoHide();
        return;
      }
    }
    if (fid === 'v270-volume') {
      if (isLeft || isRight) {
        const cur = state.video?.muted ? 0 : clamp(state.video?.volume || 0, 0, 1);
        const delta = isLeft ? -0.05 : 0.05;
        const next = clamp(Math.round((cur + delta) * 100) / 100, 0, 1);
        setNativeVolume(state.video, next);
        if (state.refs.volume) state.refs.volume.value = String(next);
        updateVolumeIcon();
        showHud(`ระดับเสียง ${Math.round(next * 100)}%`, 700);
        resetAutoHide();
        return;
      }
    }

    // Generic D-pad focus movement
    // Layout mental model:
    // [nextEp] [settings] [aspect] [lock] [exit]     ← top row
    // [back]   [play]     [next]                      ← center
    // [-------- timeline --------]                    ← timeline
    // [brightness] [mute] [volume]                    ← bottom
    if (isLeft) {
      moveFocus(-1);
      return;
    }
    if (isRight) {
      moveFocus(1);
      return;
    }
    if (isUp) {
      // Jump up by approximate row sizes
      // Top: 0-4, Center: 5-7, Timeline: 8, Bottom: 9-11
      const i = state.focusIndex;
      if (i >= 9) setFocusedIndex(8);          // bottom → timeline
      else if (i === 8) setFocusedIndex(6);    // timeline → play
      else if (i >= 5) setFocusedIndex(Math.min(i - 5, 4)); // center → top
      else moveFocus(-1);
      return;
    }
    if (isDown) {
      const i = state.focusIndex;
      if (i <= 4) setFocusedIndex(6);          // top → play
      else if (i >= 5 && i <= 7) setFocusedIndex(8); // center → timeline
      else if (i === 8) setFocusedIndex(9);    // timeline → brightness
      else moveFocus(1);
      return;
    }
  }

  function handleRemoteKeyUp(e) {
    const mapped = mapRemoteKey(e);
    if (mapped.isLeft || mapped.isRight) stopHold();
  }

  /* Focus sink strategy for Android TV:
     - Native FS: browser often routes D-pad only to document.activeElement.
       Shadow-DOM focus is unreliable → keep a LIGHTWEIGHT button on document.body
       (outside shadow) and focus it whenever UI is hidden / locked.
     - When UI visible: focus the highlighted control inside shadow.
     - Always blur <video> so it cannot eat arrow keys. */
  function ensureFocusSink(force) {
    if (!state.overlay || state.destroyed) return;

    // Blur video — critical on native FS (Xiaomi/Chrome TV)
    try {
      if (state.video) {
        state.video.setAttribute('tabindex', '-1');
        if (document.activeElement === state.video) state.video.blur();
      }
    } catch (_) {}

    // Body-level sink (outside Shadow DOM) — survives native fullscreen focus quirks
    let bodySink = document.getElementById('__tmv270_body_sink');
    if (!bodySink || !bodySink.isConnected) {
      bodySink = document.createElement('button');
      bodySink.id = '__tmv270_body_sink';
      bodySink.type = 'button';
      bodySink.setAttribute('tabindex', '0');
      bodySink.setAttribute('aria-hidden', 'true');
      bodySink.style.cssText =
        'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;z-index:2147483647;' +
        'border:0;padding:0;margin:0;background:transparent;outline:none;';
      // Forward keys from sink itself (some WebViews only deliver to focused node)
      bodySink.addEventListener('keydown', handleRemoteKey, true);
      bodySink.addEventListener('keyup', handleRemoteKeyUp, true);
      (document.body || document.documentElement).appendChild(bodySink);
    }
    state.focusSink = bodySink;

    // Optional in-shadow sink for when UI is open
    if (state.shadowRoot) {
      let shadowSink = state.shadowRoot.getElementById('v270-focus-sink');
      if (!shadowSink) {
        shadowSink = document.createElement('button');
        shadowSink.id = 'v270-focus-sink';
        shadowSink.type = 'button';
        shadowSink.setAttribute('tabindex', '0');
        shadowSink.setAttribute('aria-hidden', 'true');
        shadowSink.style.cssText =
          'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;top:0;border:0;padding:0;margin:0;';
        state.shadowRoot.appendChild(shadowSink);
      }
    }

    const uiVisible = state.overlay && !state.overlay.classList.contains('hidden-ui') && !state.locked;
    const cur = state.focusables[state.focusIndex];
    let target = bodySink;
    if (uiVisible && cur) target = cur;

    try {
      const active = document.activeElement;
      const shadowActive = state.shadowRoot && state.shadowRoot.activeElement;
      const needFocus =
        force ||
        active === state.video ||
        active === document.body ||
        active === document.documentElement ||
        !active ||
        (active !== target && shadowActive !== target);
      if (needFocus) {
        target.focus({ preventScroll: true });
      }
    } catch (_) {
      try { bodySink.focus({ preventScroll: true }); } catch (__) {}
    }
  }

  function startFocusGuard() {
    stopFocusGuard();
    // Native FS steals focus back to <video> aggressively — reclaim often
    state.focusGuardTimer = setInterval(() => {
      if (!state.overlay || state.destroyed) {
        stopFocusGuard();
        return;
      }
      ensureFocusSink(false);
    }, 400);
  }

  function stopFocusGuard() {
    if (state.focusGuardTimer) {
      clearInterval(state.focusGuardTimer);
      state.focusGuardTimer = 0;
    }
  }

  function togglePlayPause() {
    if (!state.video) return;
    if (state.video.paused) {
      clickPlayerBigPlayButton();
      safePlay(state.video);
      showHud('เล่น', 700);
      setTimeout(() => {
        if (state.video && state.video.paused && !state.destroyed) {
          clickPlayerBigPlayButton();
          safePlay(state.video);
        }
      }, 220);
    } else {
      state.video.pause();
      showHud('หยุด', 700);
    }
  }

  function updatePlayIcon() {
    if (state.overlay !== state.overlay || !state.video || !state.refs?.playBtn) return;
    state.refs.playBtn.innerHTML = icon(state.video.paused ? 'play' : 'pause');
  }

  function updateVolumeIcon() {
    if (!state.overlay || !state.video || !state.refs?.muteBtn) return;
    const curVol = state.video.muted ? 0 : clamp(state.video.volume, 0, 1);
    state.refs.muteBtn.innerHTML = icon(curVol <= 0 ? 'mute' : 'volume');
    if (state.refs?.volume) {
      state.refs.volume.value = String(curVol);
      styleRangeTrack(state.refs.volume, curVol * 100);
    }
  }

  /* =========================================================
     10. OVERLAY LIFECYCLE
  ========================================================= */

  function detachOverlay() {
    clearHide();
    clearSettingsHide();
    cancelProgress();
    stopAdWatcher();
    stopHold();
    stopFocusGuard();
    if (state.hudTimer) clearTimeout(state.hudTimer);
    if (state.observerRaf) cancelAnimationFrame(state.observerRaf);
    state.hudTimer = 0;
    state.observerRaf = 0;
    if (state.videoObserver) {
      state.videoObserver.disconnect();
      state.videoObserver = null;
    }
    if (state.containerObserver) {
      state.containerObserver.disconnect();
      state.containerObserver = null;
    }
    try { state.videoAbort?.abort(); } catch (_) {}
    try { state.abort?.abort(); } catch (_) {}
    state.videoAbort = null;
    state.abort = null;
    state.shadowHost?.remove();
    state.shadowHost = null;
    state.shadowRoot = null;
    state.overlay = null;
    state.refs = null;
    state.focusSink = null;
    try { document.getElementById('__tmv270_body_sink')?.remove(); } catch (_) {}
    state.seeking = false;
    state.locked = false;
    state.settingsOpen = false;
    state.focusables = [];
    state.focusIndex = 0;
    invalidateBestVideoCache();
  }

  function destroyController(showQuickBtn = false) {
    tryUnlockOrientation();
    releaseWakeLock();
    stopAdWatcher();
    stopHold();
    if (state.autoPlayPollTimer) {
      clearInterval(state.autoPlayPollTimer);
      state.autoPlayPollTimer = 0;
    }
    if (state.epScrollTimer) {
      clearTimeout(state.epScrollTimer);
      state.epScrollTimer = 0;
    }
    const video = state.video || state.lastActiveVideo;
    if (video) savePlaybackPosition(video, true);
    detachOverlay();
    restoreHostAndNativeControls();
    state.video = null;
    state.container = null;
    if (showQuickBtn && video && !document.hidden) showRecovery(video);
  }

  function createOverlay(video, container, isPseudo = false) {
    if (!isVideo(video) || !container || !video.isConnected || isDisqualifiedVideo(video)) return;
    if (
      state.video === video &&
      state.container === container &&
      state.shadowHost?.isConnected
    ) return;

    destroyController(false);
    loadPrefs();
    installHostStyles(container.ownerDocument || document);
    removeRecovery();

    state.video = video;
    state.lastActiveVideo = video;
    state.container = container;
    state.locked = false;
    state.seeking = false;
    state.settingsOpen = false;
    state.lastVolume = video.volume > 0 ? video.volume : 1;

    suppressHostAndNativeControls(video, container, isPseudo);
    const currentTitle = refreshTitleCache(false);
    if (!video.paused) requestWakeLock();

    const initialSpeed = Math.round(clamp(Number(video.playbackRate) || 1, state.minSpeed, state.maxSpeed) * 100) / 100;
    state.savedSpeed = initialSpeed;
    CFG.seekStep = state.seekStep;
    const initialVol = video.muted ? 0 : clamp(video.volume, 0, 1);

    const shadowHost = document.createElement('div');
    shadowHost.id = CFG.shadowHostId;
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    const shadowStyle = document.createElement('style');
    shadowStyle.textContent = SHADOW_UI_CSS;
    shadowRoot.appendChild(shadowStyle);

    const overlay = document.createElement('div');
    overlay.id = CFG.overlayId;

    overlay.innerHTML = `
      <div class="v270-dimmer" id="v270-dimmer"></div>
      <div class="v270-absorber"></div>
      <div class="v270-debug${state.debugEnabled ? ' active' : ''}" id="v270-debug">
        <div class="v270-debug-head">
          <span id="v270-debug-head-txt">TV REMOTE V27</span>
        </div>
        <div class="v270-debug-body" id="v270-debug-body"></div>
      </div>
      <div class="v270-hud" id="v270-hud"></div>
      <div class="v270-spinner"></div>
      <div class="v270-top v270-ui">
        <div class="v270-titlebox"><span class="v270-title" id="v270-title"></span></div>
        <div class="v270-actions">
          <button class="v270-btn" id="v270-next-ep" type="button" tabindex="0" title="ตอนถัดไป" aria-label="Next Episode">${icon('nextEp')}</button>
          <button class="v270-btn" id="v270-settings-btn" type="button" tabindex="0" title="ตั้งค่า" aria-label="Settings">${icon('settings')}</button>
          <button class="v270-btn" id="v270-aspect" type="button" tabindex="0" title="อัตราส่วนภาพ" aria-label="Aspect">${icon('aspect')}</button>
          <button class="v270-btn" id="v270-lock" type="button" tabindex="0" title="ล็อกหน้าจอ" aria-label="Lock">${icon('unlock')}</button>
          <button class="v270-btn" id="v270-exit" type="button" tabindex="0" title="ออกจากเต็มจอ" aria-label="Exit">${icon('exit')}</button>
        </div>
      </div>
      <div class="v270-center v270-ui">
        <button class="v270-btn" id="v270-back" type="button" tabindex="0" aria-label="Rewind">${icon('back')}</button>
        <button class="v270-btn v270-play" id="v270-play" type="button" tabindex="0" aria-label="Play/Pause">${icon(video.paused ? 'play' : 'pause')}</button>
        <button class="v270-btn" id="v270-next" type="button" tabindex="0" aria-label="Forward">${icon('next')}</button>
      </div>
      <div class="v270-bottom v270-ui">
        <div class="v270-timeline-row">
          <span class="v270-time" id="v270-current">00:00</span>
          <input class="v270-range" id="v270-timeline" type="range" min="0" max="100" value="0" step="0.1" tabindex="0" aria-label="Progress">
          <span class="v270-time" id="v270-duration">LIVE</span>
        </div>
        <div class="v270-controls">
          <div class="v270-pill" id="v270-bright-pill">
            ${icon('sun')}
            <input type="range" id="v270-brightness" min="0.25" max="1.75" step="0.01" value="${state.brightness}" tabindex="0" aria-label="Brightness">
          </div>
          <div class="v270-pill" id="v270-vol-pill">
            <button id="v270-mute" type="button" tabindex="0" aria-label="Mute">${icon(video.muted || video.volume === 0 ? 'mute' : 'volume')}</button>
            <input type="range" id="v270-volume" min="0" max="1" step="0.01" value="${initialVol}" tabindex="0" aria-label="Volume">
          </div>
        </div>
      </div>
      <div class="v270-settings-panel" id="v270-settings-panel">
        <div class="v270-settings-header">
          <span class="v270-settings-title">${icon('settings')}<span>ตั้งค่า (รีโมท)</span></span>
          <button type="button" class="v270-reset-btn" id="v270-settings-close" tabindex="0">ปิด</button>
        </div>
        <div class="v270-menu-row">
          <span class="v270-menu-label">เลื่อนเวลา (วินาที)</span>
          <div class="v270-stepper">
            <button type="button" class="v270-step-btn" id="v270-seekstep-dec" tabindex="0">−</button>
            <input type="number" class="v270-step-input" id="v270-seekstep-input" min="5" max="300" step="5" value="${state.seekStep}" tabindex="-1" readonly>
            <button type="button" class="v270-step-btn" id="v270-seekstep-inc" tabindex="0">+</button>
          </div>
        </div>
        <div class="v270-menu-row">
          <span class="v270-menu-label">ความเร็วต่ำสุด</span>
          <div class="v270-stepper">
            <button type="button" class="v270-step-btn" id="v270-minspeed-dec" tabindex="0">−</button>
            <input type="number" class="v270-step-input" id="v270-minspeed-input" min="0.1" max="2" step="0.1" value="${state.minSpeed}" tabindex="-1" readonly>
            <button type="button" class="v270-step-btn" id="v270-minspeed-inc" tabindex="0">+</button>
          </div>
        </div>
        <div class="v270-menu-row">
          <span class="v270-menu-label">ความเร็วสูงสุด</span>
          <div class="v270-stepper">
            <button type="button" class="v270-step-btn" id="v270-maxspeed-dec" tabindex="0">−</button>
            <input type="number" class="v270-step-input" id="v270-maxspeed-input" min="1.5" max="16" step="0.5" value="${state.maxSpeed}" tabindex="-1" readonly>
            <button type="button" class="v270-step-btn" id="v270-maxspeed-inc" tabindex="0">+</button>
          </div>
        </div>
        <div class="v270-menu-row">
          <span class="v270-menu-label">เล่น EP ถัดไปอัตโนมัติเมื่อจบ</span>
          <label class="v270-switch" id="v270-autonext-wrap">
            <input type="checkbox" id="v270-autonext-toggle"${state.autoNextEnabled ? ' checked' : ''} tabindex="0">
            <span class="v270-switch-slider"></span>
          </label>
        </div>
        <div class="v270-menu-row">
          <span class="v270-menu-label">รับชมต่อจากที่ดูค้างไว้</span>
          <label class="v270-switch" id="v270-resume-wrap">
            <input type="checkbox" id="v270-resume-toggle"${state.resumeEnabled ? ' checked' : ''} tabindex="0">
            <span class="v270-switch-slider"></span>
          </label>
        </div>
        <div class="v270-menu-row">
          <span class="v270-menu-label">แสดงสถานะระบบ (Debug)</span>
          <label class="v270-switch" id="v270-debug-wrap">
            <input type="checkbox" id="v270-debug-toggle"${state.debugEnabled ? ' checked' : ''} tabindex="0">
            <span class="v270-switch-slider"></span>
          </label>
        </div>
        <div class="v270-menu-row" style="justify-content:center;padding-top:8px;">
          <button type="button" class="v270-reset-btn" id="v270-reset-defaults" tabindex="0">คืนค่าเริ่มต้น</button>
        </div>
      </div>
    `;

    shadowRoot.appendChild(overlay);
    state.shadowHost = shadowHost;
    state.shadowRoot = shadowRoot;
    state.overlay = overlay;
    state.abort = new AbortController();

    const $ = sel => overlay.querySelector(sel);
    const dimmer = $('#v270-dimmer');
    const debugBox = $('#v270-debug');
    const debugHeadTxt = $('#v270-debug-head-txt');
    const debugBody = $('#v270-debug-body');
    const hud = $('#v270-hud');
    const nextEpBtn = $('#v270-next-ep');
    const settingsBtn = $('#v270-settings-btn');
    const aspectBtn = $('#v270-aspect');
    const lockBtn = $('#v270-lock');
    const exitBtn = $('#v270-exit');
    const backBtn = $('#v270-back');
    const playBtn = $('#v270-play');
    const nextBtn = $('#v270-next');
    const timeline = $('#v270-timeline');
    const currentLabel = $('#v270-current');
    const durationLabel = $('#v270-duration');
    const brightness = $('#v270-brightness');
    const volume = $('#v270-volume');
    const muteBtn = $('#v270-mute');
    const titleLabel = $('.v270-title');
    const settingsPanel = $('#v270-settings-panel');
    const settingsClose = $('#v270-settings-close');
    const seekStepDec = $('#v270-seekstep-dec');
    const seekStepInc = $('#v270-seekstep-inc');
    const seekStepInput = $('#v270-seekstep-input');
    const minSpeedDec = $('#v270-minspeed-dec');
    const minSpeedInc = $('#v270-minspeed-inc');
    const minSpeedInput = $('#v270-minspeed-input');
    const maxSpeedDec = $('#v270-maxspeed-dec');
    const maxSpeedInc = $('#v270-maxspeed-inc');
    const maxSpeedInput = $('#v270-maxspeed-input');
    const autoNextToggle = $('#v270-autonext-toggle');
    const resumeToggle = $('#v270-resume-toggle');
    const debugToggle = $('#v270-debug-toggle');
    const resetDefaultsBtn = $('#v270-reset-defaults');

    state.refs = {
      dimmer,
      debugBox,
      debugHeadTxt,
      debugBody,
      title: titleLabel,
      current: currentLabel,
      duration: durationLabel,
      timeline,
      brightness,
      volume,
      hud,
      playBtn,
      backBtn,
      nextBtn,
      nextEpBtn,
      settingsBtn,
      aspectBtn,
      lockBtn,
      exitBtn,
      muteBtn,
      settingsPanel,
      seekStepInput,
      minSpeedInput,
      maxSpeedInput,
      autoNextToggle,
      resumeToggle,
      debugToggle,
      lastSecond: -1,
      lastPercent: -1,
      lastDuration: -2
    };

    // Sync seek badge text
    const seekTxts = overlay.querySelectorAll('.v270-seek-txt');
    for (let i = 0; i < seekTxts.length; i++) {
      seekTxts[i].textContent = String(state.seekStep);
    }

    setTitleUI(currentTitle, state.currentEp);
    applyBrightness(video, state.brightness);
    styleRangeTrack(volume, initialVol * 100);
    dbg('UI', `Overlay mounted TV (${isPseudo ? 'Pseudo-FS' : 'Native-FS'})`);

    // Button actions
    addEvent(nextEpBtn, 'click', e => {
      e.stopPropagation();
      triggerSeamlessNextEpisode(true);
      resetAutoHide();
    });
    addEvent(settingsBtn, 'click', e => {
      e.stopPropagation();
      openSettingsPanel();
    });
    addEvent(settingsClose, 'click', e => {
      e.stopPropagation();
      closeSettingsPanel();
    });
    addEvent(aspectBtn, 'click', e => {
      e.stopPropagation();
      if (!state.video) return;
      state.aspectIndex = (state.aspectIndex + 1) % ASPECT_MODES.length;
      applyAspectMode(state.video, state.aspectIndex);
      savePrefs();
      showHud(ASPECT_MODES[state.aspectIndex].label, 900);
      resetAutoHide();
    });
    addEvent(lockBtn, 'click', e => {
      e.stopPropagation();
      closeSettingsPanel();
      state.locked = !state.locked;
      if (state.locked) {
        lockBtn.innerHTML = icon('lock');
        overlay.classList.add('locked');
        overlay.classList.remove('hidden-ui');
        showHud('ล็อกหน้าจอแล้ว — กด OK เพื่อปลด', 1200);
        clearHide();
        cancelProgress();
      } else {
        lockBtn.innerHTML = icon('unlock');
        overlay.classList.remove('locked');
        showHud('ปลดล็อกหน้าจอ', 900);
        rebuildFocusList();
        setFocusedIndex(0);
        resetAutoHide();
      }
    });
    addEvent(exitBtn, 'click', e => {
      e.stopPropagation();
      exitUniversalFullscreen();
    });
    addEvent(playBtn, 'click', e => {
      e.stopPropagation();
      togglePlayPause();
      resetAutoHide();
    });
    addEvent(backBtn, 'click', e => {
      e.stopPropagation();
      const step = state.seekStep;
      safeSeek(state.video, state.video.currentTime - step, false);
      showHud(`-${step} วินาที`, 800);
      queueProgress(true);
      resetAutoHide();
    });
    addEvent(nextBtn, 'click', e => {
      e.stopPropagation();
      const step = state.seekStep;
      safeSeek(state.video, state.video.currentTime + step, false);
      showHud(`+${step} วินาที`, 800);
      queueProgress(true);
      resetAutoHide();
    });
    addEvent(muteBtn, 'click', e => {
      e.stopPropagation();
      try {
        const currentEffective = state.video.muted ? 0 : state.video.volume;
        if (currentEffective > 0) {
          state.lastVolume = currentEffective;
          setNativeVolume(state.video, 0);
          volume.value = '0';
          showHud('ปิดเสียง', 800);
        } else {
          const restore = state.lastVolume > 0 ? state.lastVolume : 1;
          setNativeVolume(state.video, restore);
          volume.value = String(restore);
          showHud(`เสียง ${Math.round(restore * 100)}%`, 800);
        }
      } catch (_) {}
      updateVolumeIcon();
      resetAutoHide();
    });

    // Settings steppers
    function applySeekStep(val) {
      const next = clamp(Math.round(Number(val) || 30), 5, 300);
      state.seekStep = next;
      CFG.seekStep = next;
      if (seekStepInput) seekStepInput.value = String(next);
      const txts = overlay.querySelectorAll('.v270-seek-txt');
      for (let i = 0; i < txts.length; i++) txts[i].textContent = String(next);
      savePrefs();
      showHud(`เลื่อนเวลา ±${next} วินาที`, 800);
    }
    addEvent(seekStepDec, 'click', e => {
      e.stopPropagation();
      applySeekStep(state.seekStep - 5);
    });
    addEvent(seekStepInc, 'click', e => {
      e.stopPropagation();
      applySeekStep(state.seekStep + 5);
    });

    function applyMinSpeed(val) {
      const maxAllowed = Math.min(2, state.maxSpeed - 0.25);
      const next = Math.round(clamp(Number(val) || 0.5, 0.1, maxAllowed) * 100) / 100;
      state.minSpeed = next;
      if (minSpeedInput) minSpeedInput.value = String(next);
      if (state.video && state.video.playbackRate < next) {
        try { state.video.playbackRate = next; } catch (_) {}
        state.savedSpeed = next;
      }
      savePrefs();
      showHud(`ความเร็วต่ำสุด ${formatSpeed(next)}`, 800);
    }
    addEvent(minSpeedDec, 'click', e => {
      e.stopPropagation();
      applyMinSpeed(state.minSpeed - 0.1);
    });
    addEvent(minSpeedInc, 'click', e => {
      e.stopPropagation();
      applyMinSpeed(state.minSpeed + 0.1);
    });

    function applyMaxSpeed(val) {
      const minAllowed = Math.max(1.5, state.minSpeed + 0.25);
      const next = Math.round(clamp(Number(val) || 2, minAllowed, 16) * 100) / 100;
      state.maxSpeed = next;
      if (maxSpeedInput) maxSpeedInput.value = String(next);
      if (state.video && state.video.playbackRate > next) {
        try { state.video.playbackRate = next; } catch (_) {}
        state.savedSpeed = next;
      }
      savePrefs();
      showHud(`ความเร็วสูงสุด ${formatSpeed(next)}`, 800);
    }
    addEvent(maxSpeedDec, 'click', e => {
      e.stopPropagation();
      applyMaxSpeed(state.maxSpeed - 0.5);
    });
    addEvent(maxSpeedInc, 'click', e => {
      e.stopPropagation();
      applyMaxSpeed(state.maxSpeed + 0.5);
    });

    addEvent(autoNextToggle, 'change', e => {
      e.stopPropagation();
      state.autoNextEnabled = Boolean(e.target.checked);
      savePrefs();
      showHud(state.autoNextEnabled ? 'เปิดเล่น EP ถัดไปอัตโนมัติ' : 'ปิดเล่น EP ถัดไปอัตโนมัติ', 1000);
    });
    addEvent(resumeToggle, 'change', e => {
      e.stopPropagation();
      state.resumeEnabled = Boolean(e.target.checked);
      savePrefs();
      showHud(state.resumeEnabled ? 'เปิดรับชมต่อจากที่ค้างไว้' : 'ปิดรับชมต่อจากที่ค้างไว้', 1000);
    });
    addEvent(debugToggle, 'change', e => {
      e.stopPropagation();
      state.debugEnabled = Boolean(e.target.checked);
      savePrefs();
      if (state.debugEnabled) dbg('SYS', 'Debug Console On');
      renderDebugConsole();
      showHud(state.debugEnabled ? 'เปิด Debug' : 'ปิด Debug', 900);
    });
    addEvent(resetDefaultsBtn, 'click', e => {
      e.stopPropagation();
      state.seekStep = 30;
      CFG.seekStep = 30;
      state.minSpeed = 0.5;
      state.maxSpeed = 2;
      state.autoNextEnabled = true;
      state.resumeEnabled = true;
      state.debugEnabled = false;
      state.savedSpeed = 1;
      try { state.video.playbackRate = 1; } catch (_) {}
      if (seekStepInput) seekStepInput.value = '30';
      if (minSpeedInput) minSpeedInput.value = '0.5';
      if (maxSpeedInput) maxSpeedInput.value = '2';
      if (autoNextToggle) autoNextToggle.checked = true;
      if (resumeToggle) resumeToggle.checked = true;
      if (debugToggle) debugToggle.checked = false;
      const txts = overlay.querySelectorAll('.v270-seek-txt');
      for (let i = 0; i < txts.length; i++) txts[i].textContent = '30';
      renderDebugConsole();
      savePrefs();
      showHud('คืนค่าเริ่มต้นแล้ว', 1000);
    });

    // Body + shadow focus sinks (Native FS needs body-level sink for D-pad)
    startFocusGuard();
    setTimeout(() => {
      ensureFocusSink(true);
      rebuildFocusList();
      const playIdx = state.focusables.findIndex(el => el === state.refs?.playBtn);
      setFocusedIndex(playIdx >= 0 ? playIdx : 0);
      ensureFocusSink(true);
    }, 120);
    [400, 900, 1600, 2500].forEach(ms => setTimeout(() => ensureFocusSink(true), ms));

    // Video listeners
    startAdWatcher();

    function observeVideoAttributes(v) {
      if (state.videoObserver) state.videoObserver.disconnect();
      state.videoObserver = new MutationObserver(() => {
        if (!state.video) return;
        if (state.video.controls || state.video.hasAttribute('controls')) {
          state.video.controls = false;
          state.video.removeAttribute('controls');
        }
        const expectedFit = ASPECT_MODES[state.aspectIndex]?.key || 'contain';
        if (state.video.getAttribute(CFG.fitAttr) !== expectedFit) {
          applyAspectMode(state.video, state.aspectIndex);
        }
      });
      try {
        state.videoObserver.observe(v, {
          attributes: true,
          attributeFilter: ['controls', 'style', 'class', CFG.fitAttr]
        });
      } catch (_) {}
    }

    function bindVideoListeners(v) {
      try { state.videoAbort?.abort(); } catch (_) {}
      state.videoAbort = new AbortController();
      const vCtrl = state.videoAbort;
      observeVideoAttributes(v);

      addEvent(v, 'play', () => {
        updatePlayIcon();
        requestWakeLock();
      }, false, vCtrl);
      addEvent(v, 'pause', () => {
        overlay.classList.remove('buffering');
        updatePlayIcon();
        savePlaybackPosition(v, true);
        releaseWakeLock();
      }, false, vCtrl);
      addEvent(v, 'playing', () => {
        overlay.classList.remove('buffering');
        state.healRetryCount = 0;
        if (Number.isFinite(v.duration) && v.duration >= CFG.minMainVideoDurationSec) {
          if (state.savedSpeed && v.playbackRate !== state.savedSpeed) {
            try { v.playbackRate = state.savedSpeed; } catch (_) {}
          }
        }
        updatePlayIcon();
        requestWakeLock();
        queueProgress(true);
      }, false, vCtrl);
      addEvent(v, 'waiting', () => {
        if (!v.paused) overlay.classList.add('buffering');
      }, false, vCtrl);
      addEvent(v, 'canplay', () => {
        overlay.classList.remove('buffering');
      }, false, vCtrl);
      addEvent(v, 'ended', () => {
        overlay.classList.remove('buffering');
        updatePlayIcon();
        releaseWakeLock();
        queueProgress(true);
        if (
          state.isSkippingAd ||
          !Number.isFinite(v.duration) ||
          v.duration < CFG.minMainVideoDurationSec
        ) {
          dbg('AUTO-NEXT', `Ignored ended on short/ad clip (${Math.round(v.duration || 0)}s)`);
          return;
        }
        if (state.autoNextEnabled) triggerSeamlessNextEpisode(false);
        else savePlaybackPosition(v, true);
      }, false, vCtrl);
      addEvent(v, 'error', () => {
        const errCode = v.error ? v.error.code : 'unknown';
        dbg('VIDEO', `MediaError code: ${errCode}`);
        if (errCode === 3 || errCode === 2) attemptMediaErrorRecovery(v);
      }, false, vCtrl);
      addEvent(v, 'ratechange', () => {
        if (isCurrentlyPlayingPreRollAd(v)) return;
        const rawRate = Number(v.playbackRate) || 1;
        if (rawRate > state.maxSpeed + 0.1 || rawRate > 3.5) {
          const restore = clamp(Number(state.savedSpeed) || 1, state.minSpeed, state.maxSpeed);
          try { v.playbackRate = restore; } catch (_) {}
        }
      }, false, vCtrl);
      addEvent(v, 'timeupdate', () => {
        if (trySkipPreRollAdSafely(v)) return;
        if (!v.seeking && !v.error && v.currentTime > 1) {
          state.lastKnownGoodTime = v.currentTime;
        }
        queueProgress();
        savePlaybackPosition(v, false);
        if (
          state.autoNextEnabled &&
          !state.seeking &&
          !state.isSkippingAd &&
          Number.isFinite(v.duration) &&
          v.duration >= CFG.minMainVideoDurationSec &&
          v.currentTime >= v.duration - 0.5
        ) {
          const sig = getVideoSignature(v);
          if (sig && state.nearEndTriggeredSig !== sig) {
            state.nearEndTriggeredSig = sig;
            triggerSeamlessNextEpisode(false);
          }
        }
      }, false, vCtrl);
      addEvent(v, 'durationchange', () => queueProgress(true), false, vCtrl);
      addEvent(v, 'loadedmetadata', () => {
        state.cachedKeysList = null;
        state.lastKnownGoodTime = 0;
        state.nearEndTriggeredSig = '';
        refreshTitleCache(false);
        if (!isCurrentlyPlayingPreRollAd(v) && Number.isFinite(v.duration) && v.duration >= CFG.minMainVideoDurationSec) {
          try {
            if (state.savedSpeed && state.savedSpeed !== 1) v.playbackRate = state.savedSpeed;
          } catch (_) {}
          tryRestorePlaybackPosition(v);
          if (state.expectingSeamlessEpisode) {
            safePlay(v);
            clickPlayerBigPlayButton();
            if (!state.overlay) {
              setTopWindowIframeFullscreenLock(true);
              enterUniversalFullscreen(v);
            }
            setTimeout(() => {
              if (v && !v.paused) {
                state.expectingSeamlessEpisode = false;
                clearAutoFullscreenBridge();
              }
            }, 1200);
          }
        }
        applyAspectMode(v, state.aspectIndex);
        applyBrightness(v, state.brightness);
        queueProgress(true);
      }, false, vCtrl);
      addEvent(v, 'volumechange', updateVolumeIcon, false, vCtrl);
      addEvent(v, 'seeked', () => {
        state.seeking = false;
        savePlaybackPosition(v, true);
        overlay.classList.remove('buffering');
        queueProgress(true);
      }, false, vCtrl);
    }

    bindVideoListeners(video);
    tryRestorePlaybackPosition(video);

    state.containerObserver = new MutationObserver(() => {
      if (state.observerRaf) return;
      state.observerRaf = requestAnimationFrame(() => {
        state.observerRaf = 0;
        if (!state.container || !state.shadowHost) return;
        if (!state.shadowHost.isConnected) {
          try { state.container.appendChild(state.shadowHost); } catch (_) {}
        }
        const currentInvalid = !state.video || !state.video.isConnected;
        const candidate = bestVideo(state.container);
        if ((currentInvalid && candidate) || (candidate && candidate !== state.video && !candidate.paused)) {
          const replacement = candidate;
          dbg('VIDEO', 'Re-bound to new video element');
          state.video = replacement;
          state.lastActiveVideo = replacement;
          state.cachedKeysList = null;
          replacement.controls = false;
          replacement.removeAttribute('controls');
          replacement.setAttribute(CFG.videoAttr, '1');
          applyAspectMode(replacement, state.aspectIndex);
          applyBrightness(replacement, state.brightness);
          try { replacement.playbackRate = state.savedSpeed || 1; } catch (_) {}
          bindVideoListeners(replacement);
          tryRestorePlaybackPosition(replacement);
          if (state.expectingSeamlessEpisode) safePlay(replacement);
          updatePlayIcon();
          queueProgress(true);
        }
      });
    });

    try {
      state.containerObserver.observe(container, { childList: true, subtree: true });
      container.appendChild(shadowHost);
    } catch (_) {
      destroyController(false);
      return;
    }

    updatePlayIcon();
    updateVolumeIcon();
    updateProgress(true);

    // Initial focus list (deferred ensureFocusSink already scheduled above)
    rebuildFocusList();
    const playIdx = state.focusables.findIndex(el => el === playBtn);
    setFocusedIndex(playIdx >= 0 ? playIdx : 0);
    resetAutoHide();
    // Keep UI visible longer on first enter so user sees focus ring
    clearHide();
    state.hideTimer = setTimeout(() => {
      state.hideTimer = 0;
      if (state.overlay && !state.locked && !state.settingsOpen) {
        state.overlay.classList.add('hidden-ui');
        cancelProgress();
      }
    }, Math.max(CFG.hideDelay, 6000));
  }

  /* =========================================================
     11. GLOBAL LISTENERS + BOOT
  ========================================================= */

  function handleFullscreenChange() {
    if (state.destroyed) return;
    const fs = fullscreenElement();
    if (fs) {
      removeRecovery();
      const video = isVideo(fs) ? fs : (bestVideo(fs) || state.lastActiveVideo);
      if (!video || isDisqualifiedVideo(video)) return;
      setTopWindowIframeFullscreenLock(false);
      tryLockLandscape(video);
      const container = (fs === video) ? ensureSafeContainer(video) : fs;
      if (container) {
        createOverlay(video, container, false);
        [50, 200, 500, 1000, 1800].forEach(ms => setTimeout(() => ensureFocusSink(true), ms));
      }
      return;
    }
    if (state.expectingSeamlessEpisode || consumeAutoFullscreenBridge()) {
      const v = bestVideo(document) || state.lastActiveVideo;
      if (v && v.isConnected && !isDisqualifiedVideo(v)) {
        const container = ensureSafeContainer(v);
        if (container) {
          dbg('FS-BRIDGE', 'Holding Pseudo-Fullscreen across episode transition');
          setTopWindowIframeFullscreenLock(true);
          createOverlay(v, container, true);
          safePlay(v);
          setTimeout(() => ensureFocusSink(true), 200);
          return;
        }
      }
    }
    setTopWindowIframeFullscreenLock(false);
    tryUnlockOrientation();
    releaseWakeLock();
    if (!state.pseudoFullscreen) destroyController(true);
  }

  function onMediaActivity(e) {
    if (state.destroyed || document.hidden) return;
    const target = e.target;
    if (!isVideo(target) || isDisqualifiedVideo(target)) return;
    state.lastActiveVideo = target;
    invalidateBestVideoCache();
    if (e.type === 'loadedmetadata' || !state.cachedTitle) {
      unlockIframes();
      refreshTitleCache(false);
    }
    const bridge = consumeAutoFullscreenBridge();
    if (bridge && !state.overlay) {
      if (bridge.ep) state.currentEp = bridge.ep;
      if (typeof bridge.speed === 'number') state.savedSpeed = bridge.speed;
      dbg('FS-BRIDGE', `Auto-entering fullscreen for ${state.currentEp || 'Next EP'}`);
      setTopWindowIframeFullscreenLock(true);
      enterUniversalFullscreen(target);
      safePlay(target);
      return;
    }
    const fs = fullscreenElement();
    if (fs) {
      if (!state.overlay || state.video !== target) {
        const container = fs === target ? ensureSafeContainer(target) : fs;
        if (container) {
          createOverlay(target, container, false);
          setTimeout(() => ensureFocusSink(true), 100);
        }
      }
    } else if (state.pseudoFullscreen && state.overlay && state.video !== target) {
      const container = ensureSafeContainer(target);
      if (container) createOverlay(target, container, true);
    } else if (!state.pseudoFullscreen) {
      showRecovery(target);
    }
  }

  function onUserPointerDown(e) {
    // On TV, pointer is rare; still allow mouse/touch as fallback for recovery button
    if (state.destroyed || fullscreenElement() || state.pseudoFullscreen) return;
    if (window === window.top && hasCrossOriginPlayerIframeOnPage()) return;
    const path = e.composedPath ? e.composedPath() : [e.target];
    if (path.some(el => el?.id === CFG.recoveryHostId || el?.id === CFG.shadowHostId)) return;
    for (let i = 0; i < Math.min(path.length, 8); i++) {
      const el = path[i];
      if (isVideo(el) && !isDisqualifiedVideo(el)) {
        state.lastActiveVideo = el;
        showRecovery(el);
        return;
      }
      if (el instanceof Element) {
        const v = el.querySelector?.('video');
        if (v && !isDisqualifiedVideo(v)) {
          state.lastActiveVideo = v;
          showRecovery(v);
          return;
        }
      }
    }
  }

  /* Permanent remote key listeners — NOT tied to overlay AbortController.
     Android TV WebViews often drop listeners registered only inside FS transition. */
  function installRemoteKeyListeners() {
    const opts = { capture: true, passive: false };
    // document + window cover most TV browsers; useCapture beats page handlers
    document.addEventListener('keydown', handleRemoteKey, opts);
    document.addEventListener('keyup', handleRemoteKeyUp, opts);
    window.addEventListener('keydown', handleRemoteKey, opts);
    window.addEventListener('keyup', handleRemoteKeyUp, opts);
    // Some Android WebViews dispatch on body only after FS
    try {
      if (document.body) {
        document.body.addEventListener('keydown', handleRemoteKey, opts);
        document.body.addEventListener('keyup', handleRemoteKeyUp, opts);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body?.addEventListener('keydown', handleRemoteKey, opts);
          document.body?.addEventListener('keyup', handleRemoteKeyUp, opts);
        }, { once: true });
      }
    } catch (_) {}
  }

  function boot() {
    loadPrefs();
    patchFullscreenAPI();
    setupEpisodeClickTracker();
    installRemoteKeyListeners();

    document.addEventListener('fullscreenchange', handleFullscreenChange, true);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange, true);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange, true);

    document.addEventListener('play', onMediaActivity, true);
    document.addEventListener('playing', onMediaActivity, true);
    document.addEventListener('loadedmetadata', onMediaActivity, true);
    document.addEventListener('pointerdown', onUserPointerDown, { capture: true, passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (state.video) savePlaybackPosition(state.video, true);
        flushResumeCacheToDisk();
        clearHide();
        cancelProgress();
        releaseWakeLock();
        stopAdWatcher();
        stopHold();
      } else if (state.overlay) {
        if (state.video && !state.video.paused) requestWakeLock();
        startAdWatcher();
        ensureFocusSink();
        resetAutoHide();
      }
    });

    window.addEventListener('pagehide', () => {
      state.destroyed = true;
      if (state.video) savePlaybackPosition(state.video, true);
      flushResumeCacheToDisk();
      stopAdWatcher();
      stopHold();
      stopFocusGuard();
      if (state.autoPlayPollTimer) clearInterval(state.autoPlayPollTimer);
      if (state.epScrollTimer) clearTimeout(state.epScrollTimer);
      removeRecovery();
      destroyController(false);
    }, { once: true });

    if (document.readyState !== 'loading') {
      unlockIframes();
      refreshTitleCache(false);
      checkPendingEpisodeScrollOnLoad();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        unlockIframes();
        refreshTitleCache(false);
        checkPendingEpisodeScrollOnLoad();
      }, { once: true });
    }
  }

  boot();
})();
