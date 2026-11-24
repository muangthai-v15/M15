// ==UserScript==
// @name         Ultra Performance V26.6.0 (OMNIFORGE MAX-PERF - Firefox Android Native FS Lock & Single-Flight Guard)
// @namespace    Violentmonkey Scripts
// @version      26.6.0
// @description  Zero Floating Button. Fix Firefox Android (Fenix) Pseudo-FS fallback on Condition (1): captures Transient User Activation immediately on Play before network buffering expires it, adds single-flight isEnteringFullscreen lock to prevent loadeddata/playing race conditions, and keeps Top-Level Native Fullscreen Anchor across episode transitions.
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

  const KEY = '__TM_VIDEO_CONTROLLER_V2660__';
  const pageWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  if (window[KEY] || pageWin[KEY]) return;
  window[KEY] = true;
  try { pageWin[KEY] = true; } catch (_) {}

  // Fast-Exit Guard สำหรับ Tracking/Ad Iframes ขนาดจิ๋ว
  if (window !== window.top) {
    try {
      if (window.innerWidth > 0 && window.innerHeight > 0 && window.innerWidth < 40 && window.innerHeight < 40) {
        return;
      }
    } catch (_) {}
  }

  const instanceId = Math.random().toString(36).slice(2, 10);

  const CFG = {
    schemaVersion: 261,
    hideDelay: 3000,
    seekStep: 30,
    doubleTapMs: 250,
    longPressMs: 400,
    swipePx: 40,
    maxDepth: 7,
    minMainVideoDurationSec: 240,
    bestVideoCacheMs: 320,
    adWatchIntervalMs: 1100,
    ajaxTimeoutMs: 4200,
    shadowHostId: '__tmv260_host',
    overlayId: '__tmv260_overlay',
    hostStyleId: '__tmv260_host_style',
    hostAttr: 'data-tmv260-host',
    pseudoAttr: 'data-tmv260-pseudo',
    parentIframeFsAttr: 'data-tmv260-iframe-fs',
    parentWrapFsAttr: 'data-tmv260-wrap-fs',
    videoAttr: 'data-tmv260-video',
    fitAttr: 'data-tmv260-fit',
    lockScrollAttr: 'data-tmv260-noscroll',
    titleType: '__TMV260_TITLE__',
    prefKey: '__tmv260_prefs__',
    resumeKey: '__tmv260_resume__',
    epScrollKey: '__tmv260_ep_scroll__',
    autoFsBridgeKey: '__tmv260_autofs_bridge__'
  };

  const ASPECT_MODES = [
    { key: 'contain', label: 'พอดีจอ (Contain)' },
    { key: 'cover', label: 'เต็มจอ (Cover)' },
    { key: 'fill', label: 'ยืดเต็มจอ (Stretch)' }
  ];

  const DOUBLE_TAP_MODES = [
    { key: 'zone', label: 'ซ้าย/ขวา เลื่อนเวลา • กลาง เล่น/หยุด' },
    { key: 'seek_only', label: 'ซ้าย/ขวา เลื่อนเวลาอย่างเดียว' },
    { key: 'playpause', label: 'แตะ 2 ครั้ง เล่น/หยุด ทั้งหน้าจอ' },
    { key: 'off', label: 'ปิดการแตะ 2 ครั้ง' }
  ];

  const SVG = {
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" stroke="none"/>',
    back: '<path d="M12.5 3a9 9 0 1 0 8.7 6.6M12.5 3V7M12.5 3L8.5 3"/><text x="12" y="15.5" font-size="7.5" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none" class="v260-seek-txt">30</text>',
    next: '<path d="M11.5 3a9 9 0 1 1-8.7 6.6M11.5 3V7M11.5 3L15.5 3"/><text x="12" y="15.5" font-size="7.5" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none" class="v260-seek-txt">30</text>',
    nextEp: '<polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    aspect: '<rect x="2.5" y="2.5" width="19" height="19" rx="5"/><path d="M7.5 16.5 16.5 7.5M11.5 7.5h5v5M12.5 16.5h-5v-5"/>',
    rocket: '<path d="M3.6 16.2A9.5 9.5 0 0 1 12 2.5"/><path d="M21.5 12a9.5 9.5 0 0 1-15.9 7l4-4"/><path d="M10.2 11.2 7 10.5 8.5 8h3.7c2.8-2.8 5.2-3.3 7-3.2.1 1.8-.4 4.2-3.2 7v3.7l-2.5 1.5-.7-3.2"/>',
    fastForward: '<polygon points="13 19 22 12 13 5 13 19" fill="currentColor" stroke="none"/><polygon points="2 19 11 12 2 5 2 19" fill="currentColor" stroke="none"/>',
    fastRewind: '<polygon points="11 19 2 12 11 5 11 19" fill="currentColor" stroke="none"/><polygon points="22 19 13 12 22 5 22 19" fill="currentColor" stroke="none"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
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
    speedHideTimer: 0,
    settingsHideTimer: 0,
    hudTimer: 0,
    tapToggleTimer: 0,
    longPressTimer: 0,
    epScrollTimer: 0,
    autoPlayPollTimer: 0,
    adWatchTimer: 0,
    rewindRaf: 0,
    rewindLastTs: 0,
    lastScrubSeekTs: 0,
    wasPlayingBeforeRewind: false,
    progressFrame: 0,
    wakeLock: null,
    locked: false,
    seeking: false,
    interactingSlider: false,
    destroyed: false,
    pseudoFullscreen: false,
    orientationLocked: false,
    lastTap: 0,
    lastTapZone: '',
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
    longPressSpeed: 16,
    doubleTapStep: 30,
    doubleTapMode: 'zone',
    resumeEnabled: true,
    autoNextEnabled: true,
    autoFsOnPlayEnabled: true,
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
    preLongPressSpeed: 1,
    isLongPressSpeeding: false,
    cachedTitle: '',
    lastRawDocTitle: '',
    currentEp: '',
    // V26 MAX-PERF
    bestVideoCache: null,
    bestVideoCacheTs: 0,
    bestVideoCacheRoot: null,
    adWatchActive: false,
    lastAdCheckTs: 0,
    lastProgressUpdateTs: 0,
    // V26.3 Strict Play-to-FS & Normal-Page Next-EP State Machine
    lastUserGestureTs: 0,
    manualExitAt: 0,
    manualExitVideo: null,
    suppressAutoFsUntilPlay: false,
    pendingPlayAutoFsVideo: null,
    pendingPlayAutoFsTs: 0,
    isTransitioningNextEp: false,
    armedFromAutoNext: false,
    lastBigPlayKickTs: 0,
    topHasNativeFs: false,
    topAnchorEl: null,
    isEnteringFullscreen: false,
    enteringFullscreenTs: 0
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
     0. ZERO-OVERHEAD VISUAL DEBUG CONSOLE & HYBRID STORAGE
  ========================================================= */

  function dbg(tag, msg) {
    if (!state.debugEnabled) return;
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const line = `[${ts}] [${tag}] ${msg}`;
    state.debugLogs.push(line);
    if (state.debugLogs.length > 25) state.debugLogs.shift();
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
    const rs = v ? `RS:${v.readyState}` : '';
    if (headTxt) {
      headTxt.textContent = `OMNIFORGE V26.6.0 (${res} | ${rate} | ${rs})`;
    }
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
        if (!merged[k] || (gmData[k]?.u || 0) >= (merged[k]?.u || 0)) {
          merged[k] = gmData[k];
        }
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
        state.maxSpeed = 3;
      }
      if (typeof data.longPressSpeed === 'number' && Number.isFinite(data.longPressSpeed)) {
        state.longPressSpeed = clamp(data.longPressSpeed, 1.0, 16);
      }
      if (typeof data.doubleTapStep === 'number' && Number.isFinite(data.doubleTapStep)) {
        state.doubleTapStep = clamp(Math.round(data.doubleTapStep), 1, 300);
        CFG.seekStep = state.doubleTapStep;
      }
      if (typeof data.doubleTapMode === 'string' && DOUBLE_TAP_MODES.some(m => m.key === data.doubleTapMode)) {
        state.doubleTapMode = data.doubleTapMode;
      }
      if (typeof data.resumeEnabled === 'boolean') {
        state.resumeEnabled = data.resumeEnabled;
      }
      if (typeof data.autoNextEnabled === 'boolean') {
        state.autoNextEnabled = data.autoNextEnabled;
      }
      if (typeof data.autoFsOnPlayEnabled === 'boolean') {
        state.autoFsOnPlayEnabled = data.autoFsOnPlayEnabled;
      }
      if (typeof data.debugEnabled === 'boolean') {
        state.debugEnabled = data.debugEnabled;
      }

      if (data._schema !== CFG.schemaVersion) {
        savePrefs();
      }
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
        longPressSpeed: state.longPressSpeed,
        doubleTapStep: state.doubleTapStep,
        doubleTapMode: state.doubleTapMode,
        resumeEnabled: state.resumeEnabled,
        autoNextEnabled: state.autoNextEnabled,
        autoFsOnPlayEnabled: state.autoFsOnPlayEnabled,
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
          if (!map[k] || (freshDisk[k]?.u || 0) > (map[k]?.u || 0)) {
            map[k] = freshDisk[k];
          }
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
    if (!state.resumeEnabled || !video || state.seeking || state.isLongPressSpeeding || state.isSkippingAd) return;
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

    for (let i = 0; i < keys.length; i++) {
      map[keys[i]] = { t: sec, u: now };
    }
    state.resumeDirty = true;

    if (forceDiskFlush || now - state.lastDiskFlushTime >= 18000) {
      flushResumeCacheToDisk();
    }
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
          setTimeout(() => {
            showHud(`รับชมต่อจาก ${formatTime(entry.t)}`, 2200, 'history');
          }, 180);
        }
      } catch (_) {}
    };

    if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
      applyRestore();
    } else {
      video.addEventListener('loadedmetadata', applyRestore, { once: true });
    }
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
      : `${String(m).padStart(2, '0')}:${String(s).padStart(s ? 2 : 2, '0')}`;
  }

  /* =========================================================
     1. TRUE TOP-LEVEL HARDWARE FULLSCREEN BRIDGE & LIVE DOM SYNC (V26.0 ENHANCED)
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
      // Force allowBareNumber for elements that look like episode buttons
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
      // Priority 1: Explicit active episode buttons (most reliable)
      // 037-anime uses class containing "episode-list-bg-active"
      const activePrioritySelectors = [
        // anime-sugoi / cyber-ep pattern (highest priority)
        '.cyber-ep-btn.active', 'button.cyber-ep-btn.active', '[data-ep].active', 'button[data-ep].active',
        '[class*="cyber-ep"].active',
        '[class*="episode-list-bg-active"]',
        '[class*="ep-list-bg-active"]',
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

      // Priority 2: Among all .episode elements, pick the one that looks "active"
      // by having a different / stronger background or class containing active
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
          // Pink / highlight colors often used for active (rough heuristic via computed style)
          try {
            const st = doc.defaultView?.getComputedStyle?.(el);
            if (st) {
              const bg = (st.backgroundColor || '').toLowerCase();
              // pink / magenta / strong accent (not pure blue/gray)
              if (bg.includes('rgb') && !bg.includes('0, 0, 0') && !bg.includes('255, 255, 255')) {
                const m = bg.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                if (m) {
                  const r = +m[1], g = +m[2], b = +m[3];
                  // pink-ish or strong red/magenta accent
                  if (r > 180 && g < 120 && b > 80) score += 80;
                  // green active (some sites)
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

      // Priority 3: <select> selected option
      const selects = doc.querySelectorAll('select');
      for (let i = 0; i < selects.length; i++) {
        const opt = selects[i].selectedOptions?.[0];
        if (opt) {
          const ep = parseEpBadge(opt.textContent || '', true) || parseEpBadge(opt.value || '', false);
          if (ep) return ep;
        }
      }

      // Priority 4: URL (often reliable on multi-page sites)
      const urlEp = extractEpFromUrl(doc.location?.href || '');
      if (urlEp) return urlEp;

      // Priority 5: document title / h1 (last resort – often lags or wrong on SPA)
      // Guard: many Thai anime sites put a range in the title e.g. "EP.22-ตอนล่าสุด"
      // which must NEVER be treated as the current episode.
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

      const meta = doc.querySelector(
        'meta[property="og:title"], meta[name="twitter:title"], meta[property="video:title"], meta[name="title"]'
      );
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
    // Strip any existing EP / ตอนที่ prefix or suffix so stale episode numbers never stick
    const cleanedBase = stripEpFromTitleText(base) || base;
    const escapedEp = ep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Already starts with this EP badge → keep as-is
    if (new RegExp(`^${escapedEp}\\b`, 'i').test(cleanedBase)) {
      return cleanedBase;
    }
    // EP always first
    return `${ep} - ${cleanedBase}`;
  }

  function setTitleUI(fullOrBase, epOverride) {
    const el = state.refs?.title;
    if (!el) return;
    const ep = String(epOverride || state.currentEp || '').trim();
    let base = stripEpFromTitleText(fullOrBase || state.cachedTitle || '');
    if (!base && fullOrBase) base = stripEpFromTitleText(String(fullOrBase));
    if (ep) {
      el.innerHTML = `<span class="v260-ep">${escapeHtml(ep)}</span><span class="v260-title-main">${escapeHtml(base)}</span>`;
    } else {
      el.textContent = base || String(fullOrBase || '');
    }
  }

  function extractFullTitleFromDoc(doc) {
    const base = extractBaseTitleFromDoc(doc);
    // During seamless auto-next, prefer the explicitly set currentEp over lagged DOM detection
    let detected = '';
    if (!state.expectingSeamlessEpisode || !state.currentEp) {
      detected = detectActiveEpFromDOM(doc);
      if (detected) state.currentEp = detected;
    } else {
      detected = detectActiveEpFromDOM(doc);
      if (detected && detected !== state.currentEp) {
        const oldN = getNumericEp(state.currentEp);
        const newN = getNumericEp(detected);
        // Accept only if it looks like a sequential step (prevents reverting to old EP)
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
      if (!forceDOMScan && state.cachedTitle && rawNow === state.lastRawDocTitle) {
        return state.cachedTitle;
      }
      state.lastRawDocTitle = rawNow;
      // Always try to keep currentEp in sync with the real active button
      const detectedEp = detectActiveEpFromDOM(document);
      if (detectedEp) {
        if (detectedEp !== state.currentEp) {
          dbg('EP-SYNC', `Title refresh synced ${state.currentEp} → ${detectedEp}`);
        }
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
        if (!forceDOMScan && state.cachedTitle && rawTop === state.lastRawDocTitle) {
          return state.cachedTitle;
        }
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
      try {
        window.top.postMessage({ type: CFG.titleType + ':req' }, '*');
      } catch (_) {}
    }
    return state.cachedTitle;
  }

  /* --- True Top-Level Hardware Fullscreen Bridge Implementation --- */

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

  function ensureTopPlayerAnchorWrapper() {
    if (window !== window.top) return null;
    const iframe = findMainPlayerIframeInTopDoc(document);
    if (!iframe) return null;
    let wrap = iframe.closest(PLAYER_AREA_SEL) || iframe.parentElement;
    if (!wrap || wrap === document.body || wrap === document.documentElement) {
      try {
        const existing = iframe.parentElement;
        if (existing && existing.hasAttribute('data-tmv260-top-anchor')) {
          wrap = existing;
        } else {
          const anchor = document.createElement('div');
          anchor.setAttribute('data-tmv260-top-anchor', '1');
          anchor.style.cssText = 'position:relative;width:100%;height:100%;';
          iframe.parentNode.insertBefore(anchor, iframe);
          anchor.appendChild(iframe);
          wrap = anchor;
        }
      } catch (_) {
        wrap = iframe;
      }
    }
    state.topAnchorEl = wrap;
    return wrap;
  }

  function broadcastTopFsState(active) {
    if (window !== window.top) return;
    state.topHasNativeFs = Boolean(active);
    broadcastToAllFrames({ type: 'tmv260_top_fs_state', active: Boolean(active) });
  }

  function anchorTopNativeFullscreen() {
    if (window !== window.top) {
      try {
        window.top.postMessage({ type: 'tmv260_top_anchor_fs' }, '*');
      } catch (_) {}
      return false;
    }
    const anchor = ensureTopPlayerAnchorWrapper();
    if (!anchor) return false;
    setTopWindowIframeFullscreenLock(true);
    const curFs = fullscreenElement();
    if (curFs && (curFs === anchor || curFs.contains(anchor) || anchor.contains(curFs))) {
      broadcastTopFsState(true);
      return true;
    }
    if (origReqFS) {
      try {
        const res = origReqFS.call(anchor, { navigationUI: 'hide' });
        if (res && typeof res.then === 'function') {
          res.then(() => {
            broadcastTopFsState(true);
            dbg('TOP-FS', 'Top-level player wrapper anchored in Native Fullscreen');
          }).catch(() => {
            dbg('TOP-FS', 'Top-level requestFullscreen deferred (awaiting activation)');
          });
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  function releaseTopNativeFullscreen() {
    if (window !== window.top) {
      try {
        window.top.postMessage({ type: 'tmv260_top_exit_fs' }, '*');
      } catch (_) {}
      return;
    }
    state.topHasNativeFs = false;
    setTopWindowIframeFullscreenLock(false);
    const fs = fullscreenElement();
    if (fs) {
      try {
        const res = document.exitFullscreen?.() ||
          document.mozCancelFullScreen?.() ||
          document.webkitExitFullscreen?.();
        if (res?.catch) res.catch(() => {});
      } catch (_) {}
    }
    broadcastTopFsState(false);
  }

  function setTopWindowIframeFullscreenLock(enable) {
    if (window !== window.top) {
      try {
        window.top.postMessage({ type: 'tmv260_parent_fs_lock', enable: Boolean(enable) }, '*');
      } catch (_) {}
      return;
    }

    installHostStyles(document);
    if (enable) {
      const iframe = findMainPlayerIframeInTopDoc(document);
      if (!iframe) return;
      iframe.setAttribute(CFG.parentIframeFsAttr, '1');
      const wrap = ensureTopPlayerAnchorWrapper();
      if (wrap && wrap !== document.body && wrap !== document.documentElement) {
        wrap.setAttribute(CFG.parentWrapFsAttr, '1');
      }
      document.documentElement.setAttribute(CFG.lockScrollAttr, '1');
    } else {
      const lockedFrames = document.querySelectorAll(`[${CFG.parentIframeFsAttr}]`);
      for (let i = 0; i < lockedFrames.length; i++) {
        lockedFrames[i].removeAttribute(CFG.parentIframeFsAttr);
      }
      const lockedWraps = document.querySelectorAll(`[${CFG.parentWrapFsAttr}]`);
      for (let i = 0; i < lockedWraps.length; i++) {
        lockedWraps[i].removeAttribute(CFG.parentWrapFsAttr);
      }
      if (!state.pseudoFullscreen) {
        document.documentElement.removeAttribute(CFG.lockScrollAttr);
      }
    }
  }

  /* --- Live DOM Navigation Sync & URL Pattern Synthesizer --- */

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
        if (base) {
          h1.textContent = composeFullTitle(base, nextEpBadge);
        }
      }
    } catch (_) {}
  }

  function findNextEpisodeTarget(doc = document, currentEpStr = '') {
    // CRITICAL: Always prefer live DOM detection on the current document (usually top)
    // over preferredEp coming from a cross-origin player iframe (which often falls back
    // to the page title containing a range like "EP.22-ตอนล่าสุด" → wrong base number).
    const liveDetected = detectActiveEpFromDOM(doc);
    const curEpBadge = liveDetected || currentEpStr || state.currentEp || '';
    if (liveDetected && liveDetected !== state.currentEp) {
      state.currentEp = liveDetected;
      dbg('EP-SYNC', `Synced currentEp from DOM → ${liveDetected}`);
    }
    const curNum = getNumericEp(curEpBadge);
    const targetNum = Number.isFinite(curNum) ? curNum + 1 : NaN;

    // 0) HIGH-CONFIDENCE path for modern data-ep / cyber-ep-btn grids (anime-sugoi etc.)
    // Collect only real episode buttons that carry a numeric data-ep attribute.
    try {
      const dataEpBtns = Array.from(doc.querySelectorAll("[data-ep], .cyber-ep-btn, button[data-ep]"));
      const confident = [];
      for (let i = 0; i < dataEpBtns.length; i++) {
        const el = dataEpBtns[i];
        const raw = el.getAttribute("data-ep") || el.getAttribute("data-episode") || "";
        let n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) {
          const ep = extractEpFromElement(el);
          n = getNumericEp(ep);
        }
        if (!Number.isFinite(n) || n <= 0 || n > 5000) continue;
        // Skip resolution / server false positives
        if (RX.resolutionGuard.test(String(n))) continue;
        let score = 50;
        const cls = (el.className || "").toString().toLowerCase();
        if (cls.includes("cyber-ep-btn")) score += 80;
        if (cls.includes("active") || cls.includes("current")) score += 40;
        if (el.closest(".cyber-ep-grid, .cyber-ep-wrapper, [class*=\"ep-grid\"], [class*=\"episode-list\"]")) score += 30;
        if (el.tagName === "BUTTON" || el.tagName === "A") score += 15;
        confident.push({ el, n, score, ep: normalizeEpNumber(n) });
      }
      if (confident.length >= 2) {
        confident.sort((a, b) => a.n - b.n || b.score - a.score);
        // Prefer exact target number
        if (Number.isFinite(targetNum)) {
          let best = null, bestScore = -1;
          for (const c of confident) {
            if (c.n === targetNum && c.score > bestScore) {
              best = c; bestScore = c.score;
            }
          }
          if (best) {
            const clickEl = best.el.querySelector("a, button") || best.el;
            return {
              type: "element",
              element: clickEl,
              href: clickEl.getAttribute?.("href") || best.el.getAttribute?.("href") || "",
              dataSrc: best.el.getAttribute("data-src") || clickEl.getAttribute?.("data-src") || "",
              ep: best.ep,
              targetNum: best.n
            };
          }
        }
        // Sequential: find current, then next higher
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
                const clickEl = next.el.querySelector("a, button") || next.el;
                return {
                  type: "element",
                  element: clickEl,
                  href: clickEl.getAttribute?.("href") || next.el.getAttribute?.("href") || "",
                  dataSrc: next.el.getAttribute("data-src") || clickEl.getAttribute?.("data-src") || "",
                  ep: next.ep,
                  targetNum: next.n
                };
              }
            }
          }
          // Fallback smallest n > curNum
          for (const c of confident) {
            if (c.n > curNum) {
              const clickEl = c.el.querySelector("a, button") || c.el;
              return {
                type: "element",
                element: clickEl,
                href: clickEl.getAttribute?.("href") || c.el.getAttribute?.("href") || "",
                dataSrc: c.el.getAttribute("data-src") || clickEl.getAttribute?.("data-src") || "",
                ep: c.ep,
                targetNum: c.n
              };
            }
          }
        }
      }
    } catch (_) {}

    // 1) <select> based episode lists
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

    // 2) Broad candidate collection – include span/div.episode (037-anime style) and many modern patterns
    const candidates = doc.querySelectorAll(
      'a, button, li[onclick], [role="button"], [data-ep], [data-episode], ' +
      '.ep-item, .episode-item, .halim-episode, .episode, span.episode, div.episode, ' +
      '[class*="episode"], [class*="ep-item"], [class*="ep_item"], [class*="eps-"]'
    );

    // Helper: collect all valid episode elements with their numbers
    const epElements = [];
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.children.length > 6) continue;
      // Prefer leaf-ish elements
      const txt = (el.textContent || '').replace(RX.whitespace, ' ').trim();
      if (txt.length > 80) continue;

      let ep = extractEpFromElement(el);
      if (!ep && /ตอน(?:ที่)?\s*\d+/i.test(txt)) {
        // Force parse for Thai "ตอนที่ X"
        ep = parseEpBadge(txt, true);
      }
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
      // Prefer currently visible / not hidden
      try {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) score += 10;
      } catch (_) {}

      epElements.push({ el, ep, n, score, txt });
    }

    // Sort by episode number then score
    epElements.sort((a, b) => a.n - b.n || b.score - a.score);

    // 3) Exact target number match (preferred)
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

    // 4) Sequential next: find current, then take the next higher number that exists
    if (Number.isFinite(curNum) && epElements.length >= 2) {
      // Find the highest score element that matches current number (active one)
      let currentIdx = -1;
      let bestCurScore = -1;
      for (let i = 0; i < epElements.length; i++) {
        if (epElements[i].n === curNum && epElements[i].score > bestCurScore) {
          bestCurScore = epElements[i].score;
          currentIdx = i;
        }
      }
      // If we found current, take the next one in sorted list that has higher number
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
      // Fallback: just take the smallest number that is > curNum
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

    // 5) URL pattern synthesis
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

    // 6) Classic "Next" keyword buttons
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
    if (Date.now() - data.ts > 25000) {
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
          dbg('AJAX-EP', `Swapping iframe on normal page -> ${nextIframeUrl.slice(0, 60)}`);

          try { history.pushState({ ep: nextEpBadge }, nextDoc.title || document.title, absUrl); } catch (_) {}
          if (nextDoc.title) document.title = nextDoc.title;

          state.currentEp = nextEpBadge;
          const updatedTitle = refreshTitleCache(true);

          updateLiveDOMNavigationButtons(targetNum, nextEpBadge);
          // คงสถานะ Top-Level Native Fullscreen ไว้ขณะสลับ iframe src เพื่อไม่ให้หลุดไปเป็น Pseudo-FS
          const keepTopFs = Boolean(fullscreenElement() || state.topHasNativeFs);
          setTopWindowIframeFullscreenLock(keepTopFs);
          curIframe.src = nextIframeUrl;

          setTimeout(() => {
            broadcastTitleToFrames(updatedTitle, nextEpBadge);
            pingAllFramesNextEpAutoPlay(nextEpBadge);
          }, 550);
          return true;
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        dbg('AJAX-ERR', String(err?.message || err));
      }
    } finally {
      clearTimeout(timeoutId);
    }
    return false;
  }

  function pingAllFramesNextEpAutoPlay(epBadge) {
    try {
      const frames = document.querySelectorAll('iframe');
      for (let i = 0; i < frames.length; i++) {
        frames[i].contentWindow?.postMessage({
          type: 'tmv260_next_ep_autoplay',
          ep: epBadge || state.currentEp || '',
          title: state.cachedTitle || '',
          speed: state.savedSpeed || 1
        }, '*');
      }
    } catch (_) {}
  }

  // ตรวจสอบความพร้อมจริงของสตรีมวิดีโอ (ป้องกันเข้า Fullscreen ตอน 00:00 / LIVE หรือ readyState < 2)
  function isVideoTrulyReadyForFullscreen(v) {
    if (!v || !v.isConnected || isDisqualifiedVideo(v)) return false;
    if (v.readyState < 2 || v.videoWidth <= 0 || v.videoHeight <= 0) return false;
    const dur = v.duration;
    if (!Number.isFinite(dur) || dur <= 3) {
      // อนุญาตเฉพาะไลฟ์สตรีมจริงที่มีเฟรมพร้อมเล่นต่อเนื่องและเวลาเดินแล้ว
      if (!(v.readyState >= 3 && v.currentTime > 0.5)) return false;
    }
    return true;
  }

  // เงื่อนไข (3): เช็คความพร้อมในการเริ่มเล่นวีดีโอบนหน้าเว็บปกติ หากพร้อมแล้วให้กด Play และกลับสู่เงื่อนไข (1)
  function startNextEpisodeReadinessAutoPlay(nextEpBadge) {
    if (state.autoPlayPollTimer) {
      clearInterval(state.autoPlayPollTimer);
      state.autoPlayPollTimer = 0;
    }

    state.isTransitioningNextEp = true;
    state.expectingSeamlessEpisode = true;
    state.armedFromAutoNext = true;
    state.suppressAutoFsUntilPlay = false;
    state.manualExitVideo = null;
    state.lastBigPlayKickTs = 0;
    if (nextEpBadge) state.currentEp = nextEpBadge;

    try {
      const base = stripEpFromTitleText(state.cachedTitle || '')
        || extractBaseTitleFromDoc(document) || '';
      const forced = composeFullTitle(base, state.currentEp);
      if (forced) {
        state.cachedTitle = forced;
        state.cachedKeysList = null;
      }
    } catch (_) {}

    saveAutoFullscreenBridge(nextEpBadge || state.currentEp);
    const hasTopNativeFs = Boolean((window === window.top && fullscreenElement()) || state.topHasNativeFs);
    if (!hasTopNativeFs) {
      setTopWindowIframeFullscreenLock(false);
    }

    let attempts = 0;
    const maxAttempts = 50; // ~17.5 วินาที

    state.autoPlayPollTimer = setInterval(() => {
      attempts++;
      if (attempts > maxAttempts || state.destroyed) {
        clearInterval(state.autoPlayPollTimer);
        state.autoPlayPollTimer = 0;
        state.isTransitioningNextEp = false;
        state.expectingSeamlessEpisode = false;
        state.armedFromAutoNext = false;
        clearAutoFullscreenBridge();
        return;
      }

      try {
        if (attempts <= 6 || attempts % 3 === 0) {
          refreshTitleCache(true);
        }

        const now = Date.now();
        let v = bestVideo(document);
        if (!v && state.lastActiveVideo?.isConnected && !isDisqualifiedVideo(state.lastActiveVideo)) {
          v = state.lastActiveVideo;
        }

        // กรณี 1: ตัวเล่นยังไม่สร้างแท็ก <video> หรือตั้งค่า preload="none" (readyState=0, networkState!=2, paused)
        // กดปุ่ม Play ของตัวเล่นแบบมีระยะหน่วง (debounce 1600ms) เพื่อเริ่มโหลดสตรีมโดยยังไม่เข้า Fullscreen
        if (!v || (v.paused && v.readyState === 0 && v.networkState !== 2)) {
          if (now - state.lastBigPlayKickTs >= 1600) {
            state.lastBigPlayKickTs = now;
            clickPlayerBigPlayButton();
            dbg('NEXT-EP-INIT', `Triggered player initialization on normal page (attempt ${attempts})`);
          }
          return;
        }

        trySkipPreRollAdSafely(v);

        // กรณี 2: สตรีมกำลังโหลด (readyState < 2 หรือ duration ยังเป็น LIVE/NaN) -> รอบนหน้าเว็บปกติ ห้ามเข้า Fullscreen ก่อนพร้อม!
        if (!isVideoTrulyReadyForFullscreen(v)) {
          return;
        }

        // กรณี 3: วิดีโอพร้อมสมบูรณ์แล้ว (readyState >= 2, videoWidth > 0, duration > 3s)
        state.armedFromAutoNext = true;
        state.suppressAutoFsUntilPlay = false;
        state.manualExitVideo = null;
        state.lastUserGestureTs = now;

        // กด Play เฉพาะตอนที่วิดีโอยังหยุดอยู่เท่านั้น (ห้ามกดซ้ำตอนกำลังเล่น เพราะจะกลายเป็น Toggle Pause!)
        if (v.paused) {
          if (now - state.lastBigPlayKickTs >= 1200) {
            state.lastBigPlayKickTs = now;
            clickPlayerBigPlayButton();
            safePlay(v);
            dbg('NEXT-EP-PLAY', `Video ready (RS:${v.readyState}, dur:${Math.round(v.duration)}s) -> Pressed Play`);
          }
          return;
        }

        // กรณี 4: วิดีโอเริ่มเล่นและเฟรมเดินหน้าจริง (currentTime >= 0.08s) -> กลับเข้าเงื่อนไข (1.) ขยาย Native Fullscreen
        if (!v.paused && !v.ended && v.currentTime >= 0.08) {
          clearInterval(state.autoPlayPollTimer);
          state.autoPlayPollTimer = 0;
          state.isTransitioningNextEp = false;
          state.expectingSeamlessEpisode = false;
          clearAutoFullscreenBridge();
          dbg('NEXT-EP-READY', `Video playing (t=${v.currentTime.toFixed(2)}s) -> Returning to Condition (1)`);

          if (!state.overlay && state.autoFsOnPlayEnabled) {
            state.armedFromAutoNext = false;
            enterUniversalFullscreen(v);
          }
        }
      } catch (err) {
        dbg('NEXT-EP-ERR', String(err?.message || err));
      }
    }, 350);
  }

  async function executeNextEpisodeInTopWindow(preferredEp = '') {
    if (window !== window.top) {
      try {
        window.top.postMessage({
          type: 'tmv260_trigger_next_ep',
          currentEp: preferredEp || state.currentEp || ''
        }, '*');
      } catch (_) {}
      return true;
    }

    const now = Date.now();
    if (now - state.lastAutoNextTriggerTs < 4000) return false;

    const target = findNextEpisodeTarget(document, preferredEp || state.currentEp);
    if (!target) {
      dbg('AUTO-NEXT', 'No next episode button found');
      state.isTransitioningNextEp = false;
      state.expectingSeamlessEpisode = false;
      state.armedFromAutoNext = false;
      clearAutoFullscreenBridge();
      return false;
    }

    state.lastAutoNextTriggerTs = now;
    const nextEpBadge = target.ep || '';
    const targetNum = target.targetNum || getNumericEp(nextEpBadge);
    if (nextEpBadge) state.currentEp = nextEpBadge;
    state.cachedKeysList = null;

    saveAutoFullscreenBridge(nextEpBadge);
    markPendingEpisodeNavigation(nextEpBadge);
    const keepTopNativeFs = Boolean(fullscreenElement() || state.topHasNativeFs);
    setTopWindowIframeFullscreenLock(keepTopNativeFs);
    updateLiveDOMNavigationButtons(targetNum, nextEpBadge);
    if (!keepTopNativeFs) {
      scrollToPlayerOnNormalPage(true);
    }
    dbg('AUTO-NEXT', `Switching to ${nextEpBadge || 'Next EP'} (topNativeFs=${keepTopNativeFs})`);

    try {
      if (target.type === 'select' && target.select && target.option) {
        const optVal = target.option.value || '';
        if (/^https?:\/\//i.test(optVal) || optVal.startsWith('/')) {
          const swapped = await tryAjaxSwapEpisodeInPlace(optVal, nextEpBadge, targetNum);
          if (swapped) {
            startNextEpisodeReadinessAutoPlay(nextEpBadge);
            return true;
          }
        }
        target.select.value = target.option.value;
        target.option.selected = true;
        target.select.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (target.type === 'url_fallback' && target.href) {
        const swapped = await tryAjaxSwapEpisodeInPlace(target.href, nextEpBadge, targetNum);
        if (swapped) {
          startNextEpisodeReadinessAutoPlay(nextEpBadge);
          return true;
        }
        location.href = target.href;
        return true;
      } else if (target.type === 'element' && target.element) {
        const href = target.href || target.element.getAttribute?.('href') || '';
        const dataSrc = target.dataSrc || target.element.getAttribute?.('data-src') || '';
        const hasInlineJs = target.element.hasAttribute?.('onclick') || href.startsWith('javascript:');

        // Prefer direct player iframe swap when the button carries data-src (anime-sugoi style)
        if (dataSrc && /^https?:\/\//i.test(dataSrc)) {
          try {
            const playerIframe = document.querySelector(
              '.player-box iframe, #player-main iframe, .cyber-player-wrapper iframe, ' +
              'iframe[data-src*="playhdhls"], iframe[src*="playhdhls"], .player iframe'
            );
            if (playerIframe) {
              dbg('AUTO-NEXT', `Direct iframe swap on normal page → ${dataSrc.slice(0, 50)}`);
              try {
                const allBtns = document.querySelectorAll('.cyber-ep-btn, [data-ep]');
                for (const b of allBtns) {
                  b.classList.remove('active');
                  if (getNumericEp(extractEpFromElement(b)) === targetNum) {
                    b.classList.add('active');
                  }
                }
              } catch (_) {}
              playerIframe.src = dataSrc;
              state.currentEp = nextEpBadge;
              try { history.pushState({ ep: nextEpBadge }, document.title, location.href); } catch (_) {}
              startNextEpisodeReadinessAutoPlay(nextEpBadge);
              setTimeout(() => {
                const newTitle = refreshTitleCache(true);
                broadcastTitleToFrames(newTitle, state.currentEp);
                pingAllFramesNextEpAutoPlay(state.currentEp);
              }, 500);
              return true;
            }
          } catch (_) {}
        }

        if (href && href !== '#' && !hasInlineJs) {
          const swapped = await tryAjaxSwapEpisodeInPlace(href, nextEpBadge, targetNum);
          if (swapped) {
            startNextEpisodeReadinessAutoPlay(nextEpBadge);
            return true;
          }
        }
        target.element.click();
      }
    } catch (_) {}

    // เริ่มเช็คความพร้อมของวิดีโอบนหน้าเว็บปกติทันทีหลังเปลี่ยนตอน
    startNextEpisodeReadinessAutoPlay(nextEpBadge || state.currentEp);

    setTimeout(() => {
      const newTitle = refreshTitleCache(true);
      broadcastTitleToFrames(newTitle, state.currentEp);
      pingAllFramesNextEpAutoPlay(state.currentEp);
    }, 600);

    return true;
  }

  function broadcastToAllFrames(msg) {
    try { window.top?.postMessage(msg, '*'); } catch (_) {}
    try {
      const frames = document.querySelectorAll('iframe');
      for (let i = 0; i < frames.length; i++) {
        frames[i].contentWindow?.postMessage(msg, '*');
      }
    } catch (_) {}
  }

  function exitFullscreenForEpisodeSwitch(hasClickActivation = false) {
    state.isTransitioningNextEp = true;
    state.expectingSeamlessEpisode = true;

    // หากกดปุ่มเปลี่ยนตอนด้วยมือ (มี User Activation) ให้ตรึง Top-Level Native Fullscreen ไว้ทันที
    if (hasClickActivation) {
      anchorTopNativeFullscreen();
    }

    // ถอด Overlay ของตอนเก่าออก แต่คง Top-Level Native Fullscreen Anchor ไว้เพื่อให้ตอนใหม่กลับเข้า Native FS ได้ทันที
    destroyController();

    // หากอยู่บนหน้าหลัก (ไม่มี iframe แยก) และไม่มี Top Anchor ให้คืนหน้าปกติก่อนสลับตอน
    if (window === window.top && !findMainPlayerIframeInTopDoc(document)) {
      const fs = fullscreenElement();
      if (fs && !hasClickActivation) {
        try {
          const res = document.exitFullscreen?.() ||
            document.mozCancelFullScreen?.() ||
            document.webkitExitFullscreen?.();
          if (res?.catch) res.catch(() => {});
        } catch (_) {}
      }
    }
  }

  function triggerSeamlessNextEpisode(manual = false) {
    if (!manual && !state.autoNextEnabled) return;

    const now = Date.now();
    if (now - state.lastAutoNextTriggerTs < 4000) return;

    try {
      const live = detectActiveEpFromDOM(document);
      if (live) state.currentEp = live;
    } catch (_) {}

    if (state.video) {
      clearSavedPositionForVideo(state.video);
    }

    const wasInFullscreen = Boolean(fullscreenElement() || state.pseudoFullscreen || state.overlay);
    saveAutoFullscreenBridge(state.currentEp);

    // เงื่อนไข (3): เตรียมสลับตอนถัดไปโดยรักษาสิทธิ์ Native Fullscreen ระดับ Top-Level ไว้
    exitFullscreenForEpisodeSwitch(Boolean(manual));

    const performSwitchOnNormalPage = () => {
      if (window === window.top) {
        executeNextEpisodeInTopWindow(state.currentEp);
      } else {
        try {
          window.top.postMessage({
            type: 'tmv260_trigger_next_ep',
            currentEp: state.currentEp || ''
          }, '*');
        } catch (_) {}
      }
    };

    if (wasInFullscreen) {
      setTimeout(performSwitchOnNormalPage, 140);
    } else {
      performSwitchOnNormalPage();
    }
  }

  /* --- ระบบกดปุ่ม Play อัตโนมัติ & ข้ามโฆษณาคั่นในตัวเล่นอย่างปลอดภัย --- */

  function clickPlayerBigPlayButton() {
    try {
      // Force-click primary big-play buttons even when hidden by our FS CSS (display:none → rect 0).
      // Native player initialization (ads, stream start, ready-state) often requires the real UI click.
      // This fixes "press play in fullscreen does nothing until exit FS and play on page".
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
        if (r.width > 10 && r.height > 10) {
          b.click();
        }
      }
      // Also try generic play icons / overlays that many anime/streaming sites use
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
          if (r.width > 12 && r.height > 12 && r.top < window.innerHeight * 0.9) {
            b.click();
          }
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
        showHud('กำลังข้ามโฆษณาคั่น...', 1000, 'fastForward');
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

  function findPrimaryPlayerElement() {
    const mainIframe = findMainPlayerIframeInTopDoc(document);
    if (mainIframe) return mainIframe;

    const v = state.lastActiveVideo?.isConnected && area(state.lastActiveVideo) > 0 && !isDisqualifiedVideo(state.lastActiveVideo)
      ? state.lastActiveVideo
      : bestVideo(document);
    if (v) return ensureSafeContainer(v) || v;

    const containers = document.querySelectorAll(PLAYER_AREA_SEL);
    for (let i = 0; i < containers.length; i++) {
      const c = containers[i];
      const r = c.getBoundingClientRect();
      if (r.width >= 200 && r.height >= 120) return c;
    }

    return null;
  }

  function scrollToPlayerOnNormalPage(smooth = true) {
    if (window !== window.top) return;
    if (fullscreenElement() || state.pseudoFullscreen) return;

    const targetEl = findPrimaryPlayerElement();
    if (targetEl) {
      try {
        const rect = targetEl.getBoundingClientRect();
        const isOutOfView = rect.top < -30 || rect.bottom > window.innerHeight + 30 || rect.top > window.innerHeight * 0.45;
        if (isOutOfView) {
          const targetTop = Math.max(0, window.scrollY + rect.top - Math.max(16, (window.innerHeight - rect.height) * 0.22));
          window.scrollTo({
            top: targetTop,
            behavior: smooth ? 'smooth' : 'auto'
          });
        }
      } catch (_) {}
    }

    if (state.epScrollTimer) clearTimeout(state.epScrollTimer);
    state.epScrollTimer = setTimeout(() => {
      state.epScrollTimer = 0;
      const newTitle = refreshTitleCache(true);
      broadcastTitleToFrames(newTitle, state.currentEp);
    }, 650);
  }

  function markPendingEpisodeNavigation(epBadge) {
    try {
      sessionStorage.setItem(CFG.epScrollKey, JSON.stringify({
        ep: epBadge || '',
        ts: Date.now()
      }));
    } catch (_) {}
  }

  function checkPendingEpisodeScrollOnLoad() {
    // ตรวจสอบว่ามีการเปลี่ยนตอนอัตโนมัติ (เงื่อนไข 3) ข้ามหน้าเว็บมาหรือไม่
    const bridge = consumeAutoFullscreenBridge();
    if (bridge) {
      if (bridge.ep) state.currentEp = bridge.ep;
      if (typeof bridge.speed === 'number') state.savedSpeed = bridge.speed;
      if (typeof bridge.aspectIndex === 'number') state.aspectIndex = bridge.aspectIndex;
      if (typeof bridge.brightness === 'number') state.brightness = bridge.brightness;

      if (window === window.top) {
        setTopWindowIframeFullscreenLock(false);
        scrollToPlayerOnNormalPage(false);
        // เริ่มเช็คความพร้อมของวิดีโอบนหน้าเว็บปกติและใน iframe เพื่อกด Play -> เข้าเงื่อนไข (1)
        startNextEpisodeReadinessAutoPlay(bridge.ep || state.currentEp);
      } else {
        startNextEpisodeReadinessAutoPlay(bridge.ep || state.currentEp);
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

      const runPostLoadScroll = () => {
        const full = refreshTitleCache(true);
        broadcastTitleToFrames(full, state.currentEp);
        scrollToPlayerOnNormalPage(true);
      };

      if (document.readyState === 'complete') {
        setTimeout(runPostLoadScroll, 180);
      } else {
        window.addEventListener('load', () => setTimeout(runPostLoadScroll, 220), { once: true });
        setTimeout(runPostLoadScroll, 450);
      }
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
        setTimeout(() => {
          scrollToPlayerOnNormalPage(true);
        }, 90);
      }
    };

    const handleEpInteraction = e => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(`#${CFG.shadowHostId}`)) return;

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
        if (ep) {
          triggerManualEpisodeSwitch(ep);
        }
      }
    }, { capture: true, passive: true });
  }

  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'tmv260_parent_fs_lock' && window === window.top) {
      setTopWindowIframeFullscreenLock(Boolean(data.enable));
      return;
    }

    if (data.type === 'tmv260_top_anchor_fs' && window === window.top) {
      anchorTopNativeFullscreen();
      return;
    }

    if (data.type === 'tmv260_top_exit_fs' && window === window.top) {
      cleanupFullscreenSession(state.video || state.lastActiveVideo);
      releaseTopNativeFullscreen();
      return;
    }

    if (data.type === 'tmv260_top_fs_state' && window !== window.top) {
      const wasActive = state.topHasNativeFs;
      state.topHasNativeFs = Boolean(data.active);
      if (wasActive && !state.topHasNativeFs && !state.isTransitioningNextEp && state.overlay) {
        dbg('TOP-FS', 'Top-level Native Fullscreen exited -> Running Condition (2) cleanup');
        cleanupFullscreenSession(state.video || state.lastActiveVideo);
      }
      return;
    }

    if (data.type === 'tmv260_trigger_next_ep' && window === window.top) {
      if (typeof data.currentEp === 'string' && data.currentEp) {
        state.currentEp = data.currentEp;
      }
      executeNextEpisodeInTopWindow(state.currentEp);
      return;
    }

    if (data.type === 'tmv260_next_ep_autoplay' && window !== window.top) {
      if (typeof data.ep === 'string' && data.ep) state.currentEp = data.ep;
      if (typeof data.title === 'string' && data.title) {
        state.cachedTitle = data.title.slice(0, 220);
        setTitleUI(state.cachedTitle, state.currentEp);
      }
      if (typeof data.speed === 'number') state.savedSpeed = data.speed;
      startNextEpisodeReadinessAutoPlay(data.ep || state.currentEp);
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
      if (typeof data.ep === 'string' && data.ep) state.currentEp = data.ep;
      state.cachedTitle = data.title.slice(0, 220);
      state.cachedKeysList = null;
      setTitleUI(state.cachedTitle, state.currentEp);
      if (state.video) {
        tryRestorePlaybackPosition(state.video);
      }
    }
  });

  /* =========================================================
     2. DOM & VIDEO DISCOVERY (STRICT BANNER AD QUARANTINE)
  ========================================================= */

  function fullscreenElement() {
    return document.fullscreenElement ||
      document.mozFullScreenElement ||
      document.webkitFullscreenElement ||
      null;
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
      if (window === window.top && hasCrossOriginPlayerIframeOnPage()) {
        return true;
      }
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
        if (!isDisqualifiedVideo(vids[i])) {
          list.push(vids[i]);
        }
      }

      if (typeof document.createTreeWalker === 'function') {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node = walker.currentNode;
        let count = 0;
        while (node && count < 600) {
          if (node.shadowRoot && node.id !== CFG.shadowHostId) {
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

    // V26: short-lived cache
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

    if (video.parentElement?.hasAttribute('data-tmv260-wrapper')) {
      return video.parentElement;
    }

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
        wrapper.setAttribute('data-tmv260-wrapper', '1');
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
     3. FULLSCREEN, ORIENTATION LOCK & SCREEN WAKE LOCK
  ========================================================= */

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !state.wakeLock && !document.hidden) {
        state.wakeLock = await navigator.wakeLock.request('screen');
        state.wakeLock.addEventListener('release', () => {
          state.wakeLock = null;
        }, { once: true });
      }
    } catch (_) {}
  }

  function releaseWakeLock() {
    if (!state.wakeLock) return;
    try {
      state.wakeLock.release();
    } catch (_) {}
    state.wakeLock = null;
  }

  function tryLockLandscape(video) {
    try {
      if (!screen.orientation || typeof screen.orientation.lock !== 'function') return;
      const isVerticalVideo = video && video.videoHeight > video.videoWidth && video.videoWidth > 0;
      if (isVerticalVideo) return;
      screen.orientation.lock('landscape').then(() => {
        state.orientationLocked = true;
      }).catch(() => {});
    } catch (_) {}
  }

  function tryUnlockOrientation() {
    if (!state.orientationLocked) return;
    state.orientationLocked = false;
    try {
      screen.orientation?.unlock?.();
    } catch (_) {}
  }

  function patchFullscreenAPI() {
    if (typeof Element === 'undefined' || !origReqFS) return;

    const interceptReqFS = function (...args) {
      try {
        if (isVideo(this) && !isDisqualifiedVideo(this)) {
          state.lastActiveVideo = this;
          const container = ensureSafeContainer(this);
          if (container && container !== this) {
            if (container.hasAttribute('data-tmv260-wrapper')) {
              container.style.display = 'block';
            }
            return origReqFS.apply(container, args);
          }
        } else if (this instanceof Element) {
          const innerVideo = bestVideo(this);
          if (innerVideo) state.lastActiveVideo = innerVideo;
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
      const iframes = document.querySelectorAll('iframe:not([data-tmv260-unlocked])');
      for (let i = 0; i < iframes.length; i++) {
        const f = iframes[i];
        f.setAttribute('data-tmv260-unlocked', '1');
        if (!f.hasAttribute('allowfullscreen')) f.setAttribute('allowfullscreen', 'true');
        const allow = f.getAttribute('allow') || '';
        if (!allow.includes('fullscreen')) {
          f.setAttribute('allow', allow ? `${allow}; fullscreen *; autoplay *` : 'fullscreen *; autoplay *');
        }
      }
    } catch (_) {}
  }

  /* =========================================================
     4. SHADOW DOM ENCAPSULATED CSS & HOST LAYOUT SHIELD
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

      /* True Top-Level Hardware Fullscreen Bridge CSS Rules */
      [${CFG.parentWrapFsAttr}="1"] {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 2147483645 !important;
        background: #000 !important;
        transform: none !important;
      }
      iframe[${CFG.parentIframeFsAttr}="1"] {
        position: fixed !important;
        inset: 0 !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        z-index: 2147483646 !important;
        background: #000 !important;
      }

      [${CFG.hostAttr}="1"] {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        background: #000 !important;
        overflow: hidden !important;
      }
      [${CFG.pseudoAttr}="1"] {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 2147483646 !important;
        background: #000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      [${CFG.hostAttr}="1"] .jw-media,
      [${CFG.hostAttr}="1"] .jw-aspect,
      [${CFG.hostAttr}="1"] .plyr__video-wrapper,
      [${CFG.hostAttr}="1"] .vjs-tech,
      [${CFG.hostAttr}="1"] .html5-video-container,
      [${CFG.hostAttr}="1"] .dplayer-video-wrap,
      [${CFG.hostAttr}="1"] .art-video-player,
      [${CFG.hostAttr}="1"] .mejs__mediaelement {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"] {
        position: absolute !important;
        inset: 0 !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        min-width: 100% !important;
        min-height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: none !important;
        object-position: center center !important;
        pointer-events: none !important;
        z-index: 1 !important;
      }
      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"][${CFG.fitAttr}="contain"] { object-fit: contain !important; }
      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"][${CFG.fitAttr}="cover"] { object-fit: cover !important; }
      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"][${CFG.fitAttr}="fill"] { object-fit: fill !important; }

      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"]::-webkit-media-controls,
      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"]::-webkit-media-controls-enclosure,
      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"]::-moz-list-bullet {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      [${CFG.hostAttr}="1"] > *:not(video):not(#${CFG.shadowHostId}):not(:has(video)) {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      [${CFG.hostAttr}="1"] .vjs-control-bar,
      [${CFG.hostAttr}="1"] .vjs-big-play-button,
      [${CFG.hostAttr}="1"] .vjs-modal-dialog,
      [${CFG.hostAttr}="1"] .plyr__controls,
      [${CFG.hostAttr}="1"] .plyr__control--overlaid,
      [${CFG.hostAttr}="1"] .jw-controls,
      [${CFG.hostAttr}="1"] .jw-controls-backdrop,
      [${CFG.hostAttr}="1"] .jw-display,
      [${CFG.hostAttr}="1"] .jw-overlays,
      [${CFG.hostAttr}="1"] .jw-captions,
      [${CFG.hostAttr}="1"] .jw-title,
      [${CFG.hostAttr}="1"] .jw-floating-dismiss,
      [${CFG.hostAttr}="1"] .fp-controls,
      [${CFG.hostAttr}="1"] .fp-ui,
      [${CFG.hostAttr}="1"] .dplayer-controller,
      [${CFG.hostAttr}="1"] .dplayer-controller-mask,
      [${CFG.hostAttr}="1"] .dplayer-bezel,
      [${CFG.hostAttr}="1"] .art-bottom,
      [${CFG.hostAttr}="1"] .art-mask,
      [${CFG.hostAttr}="1"] .art-layer-autoPlayback,
      [${CFG.hostAttr}="1"] .mejs__controls,
      [${CFG.hostAttr}="1"] .mejs__layers .mejs__overlay-play,
      [${CFG.hostAttr}="1"] .ytp-chrome-bottom,
      [${CFG.hostAttr}="1"] .ytp-chrome-top,
      [${CFG.hostAttr}="1"] .ytp-gradient-bottom,
      [${CFG.hostAttr}="1"] .ytp-gradient-top,
      [${CFG.hostAttr}="1"] .ytp-bezel,
      [${CFG.hostAttr}="1"] .ytp-doubletap-ui,
      [${CFG.hostAttr}="1"] .ytp-doubletap-ui-legacy,
      [${CFG.hostAttr}="1"] #player-control-overlay,
      [${CFG.hostAttr}="1"] .ytm-custom-control,
      [${CFG.hostAttr}="1"] .shaka-controls-container,
      [${CFG.hostAttr}="1"] .bpx-player-control-wrap,
      [${CFG.hostAttr}="1"] [class*="doubletap"]:not(#${CFG.shadowHostId}),
      [${CFG.hostAttr}="1"] [class*="seek-overlay"]:not(#${CFG.shadowHostId}),
      [${CFG.hostAttr}="1"] [class*="rewind"]:not(#${CFG.shadowHostId}),
      [${CFG.hostAttr}="1"] [class*="forward"]:not(#${CFG.shadowHostId}),
      [${CFG.hostAttr}="1"] [class*="vjs-control"]:not(video),
      [${CFG.hostAttr}="1"] [class*="player-control"]:not(#${CFG.shadowHostId}):not(video),
      [${CFG.hostAttr}="1"] [class*="video-control"]:not(#${CFG.shadowHostId}):not(video),
      [${CFG.hostAttr}="1"] [class*="control-bar"]:not(#${CFG.shadowHostId}):not(video),
      [${CFG.hostAttr}="1"] [class*="controls-bar"]:not(#${CFG.shadowHostId}):not(video) {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      #${CFG.shadowHostId} {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }


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
      display: block;
      pointer-events: auto;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #fff;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    #${CFG.overlayId} {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: auto;
      background: transparent;
      isolation: isolate;
      contain: layout style size;
      touch-action: manipulation;
    }
    .v260-dimmer {
      position: absolute;
      inset: 0;
      background: #000;
      opacity: 0;
      pointer-events: none;
      z-index: 0;
      will-change: opacity;
    }
    .v260-absorber {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: auto;
      background: transparent;
      touch-action: none;
    }
    .v260-ui {
      transition: opacity 0.16s ease;
      opacity: 1;
      will-change: opacity;
    }
    #${CFG.overlayId}.hidden-ui .v260-ui {
      opacity: 0;
      pointer-events: none;
    }

    .v260-debug {
      position: absolute;
      top: calc(64px + env(safe-area-inset-top, 0px));
      left: calc(14px + env(safe-area-inset-left, 0px));
      max-width: min(360px, 78vw);
      background: rgba(8, 10, 16, 0.88);
      border: 1px solid rgba(10, 132, 255, 0.45);
      border-radius: 10px;
      padding: 6px 10px;
      color: #64d2ff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 10.5px;
      line-height: 1.35;
      z-index: 28;
      pointer-events: auto;
      display: none;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    }
    .v260-debug.active {
      display: flex;
    }
    .v260-debug-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-weight: 700;
      color: #30d158;
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
      padding-bottom: 3px;
    }
    .v260-debug-clear {
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
      border: 0;
      border-radius: 5px;
      padding: 1px 6px;
      font-size: 9.5px;
      cursor: pointer;
    }
    .v260-debug-body {
      max-height: 92px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
      overscroll-behavior: contain;
      touch-action: pan-y;
    }

    .v260-hud {
      position: absolute;
      top: 18%;
      left: 50%;
      transform: translate3d(-50%, 0, 0) scale(0.92);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(14, 14, 20, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #fff;
      padding: 8px 18px;
      border-radius: 26px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.3px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.55);
      pointer-events: none;
      z-index: 25;
      opacity: 0;
      will-change: transform, opacity;
      transition: opacity 0.14s ease, transform 0.14s ease;
    }
    .v260-hud svg {
      width: 19px;
      height: 19px;
      fill: none;
      stroke: #0a84ff;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      flex-shrink: 0;
      color: #0a84ff;
    }
    .v260-hud.show {
      opacity: 1;
      transform: translate3d(-50%, 0, 0) scale(1);
    }

    .v260-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 48px;
      height: 48px;
      margin: -24px 0 0 -24px;
      border: 4px solid rgba(255, 255, 255, 0.2);
      border-top-color: #0a84ff;
      border-radius: 50%;
      z-index: 2;
      pointer-events: none;
      display: none;
      will-change: transform;
      animation: v259spin 0.75s linear infinite;
    }
    #${CFG.overlayId}.buffering .v260-spinner {
      display: block;
    }
    @keyframes v259spin {
      to { transform: rotate(360deg); }
    }

    .v260-btn {
      background: rgba(18, 18, 24, 0.85);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 50%;
      width: 42px;
      height: 42px;
      min-width: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
      position: relative;
      z-index: 3;
      transition: transform 0.1s ease, background 0.15s ease;
    }
    .v260-btn:active {
      transform: scale(0.92);
      background: rgba(10, 132, 255, 0.88);
    }
    .v260-btn svg {
      width: 21px;
      height: 21px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .v260-slider {
      --v260-pct: 0%;
      appearance: none;
      -webkit-appearance: none;
      border-radius: 4px;
      background: linear-gradient(to right, #0a84ff 0%, #0a84ff var(--v260-pct), rgba(255, 255, 255, 0.35) var(--v260-pct), rgba(255, 255, 255, 0.35) 100%);
      accent-color: #0a84ff;
      touch-action: pan-x;
      cursor: pointer;
      pointer-events: auto;
      outline: none;
    }

    .v260-speed-wrap {
      display: inline-flex;
      align-items: center;
      background: rgba(18, 18, 24, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 26px;
      height: 42px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
      overflow: hidden;
      pointer-events: auto;
      position: relative;
      z-index: 4;
    }
    .v260-speed-wrap.expanded {
      padding-right: 10px;
      background: rgba(18, 18, 24, 0.96);
      border-color: rgba(10, 132, 255, 0.65);
    }
    #v260-speed-btn {
      background: transparent;
      border: 0;
      box-shadow: none;
      width: 40px;
      height: 40px;
      min-width: 40px;
      flex-shrink: 0;
    }
    .v260-speed-inline {
      display: none;
      align-items: center;
      gap: 8px;
      width: 155px;
      margin-left: 2px;
    }
    .v260-speed-wrap.expanded .v260-speed-inline {
      display: inline-flex;
    }
    #v260-speed {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      height: 5px;
    }
    #v260-speed::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #0a84ff;
      border: 2px solid #fff;
    }
    #v260-speed::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #0a84ff;
      border: 2px solid #fff;
    }
    .v260-speed-val {
      font-size: 11.5px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: #0a84ff;
      min-width: 40px;
      text-align: center;
      cursor: pointer;
      pointer-events: auto;
      background: rgba(10, 132, 255, 0.16);
      padding: 3px 6px;
      border-radius: 8px;
    }

    .v260-settings-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      z-index: 30;
    }
    .v260-settings-wrap.expanded #v260-settings-btn {
      background: rgba(10, 132, 255, 0.92);
      border-color: rgba(255, 255, 255, 0.5);
    }
    .v260-settings-panel {
      display: none;
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 305px;
      max-height: calc(100vh - 82px);
      max-height: calc(100dvh - 82px);
      overflow-y: auto;
      overscroll-behavior: contain;
      touch-action: pan-y;
      background: rgba(16, 16, 22, 0.97);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 18px;
      padding: 14px 16px;
      flex-direction: column;
      gap: 11px;
      box-shadow: 0 12px 34px rgba(0, 0, 0, 0.85);
      z-index: 9999;
      pointer-events: auto;
    }
    .v260-settings-wrap.expanded .v260-settings-panel {
      display: flex;
    }
    #${CFG.overlayId}.settings-open .v260-center,
    #${CFG.overlayId}.settings-open .v260-bottom {
      opacity: 0.15;
      pointer-events: none;
    }
    .v260-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
      font-size: 13px;
      font-weight: 700;
      color: #fff;
    }
    .v260-settings-title {
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }
    .v260-settings-title svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: #0a84ff;
      stroke-width: 2;
    }
    .v260-reset-btn {
      background: rgba(255, 69, 58, 0.2);
      color: #ff6961;
      border: 1px solid rgba(255, 69, 58, 0.4);
      border-radius: 8px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .v260-menu-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
    }
    .v260-menu-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }
    .v260-menu-label {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.88);
      white-space: nowrap;
    }
    .v260-stepper {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 10px;
      padding: 2px 4px;
    }
    .v260-step-btn {
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
      border: 0;
      border-radius: 7px;
      width: 26px;
      height: 26px;
      font-size: 15px;
      font-weight: 700;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      touch-action: manipulation;
    }
    .v260-step-btn:active { background: #0a84ff; }
    .v260-step-input {
      width: 44px;
      background: transparent;
      border: 0;
      color: #0a84ff;
      font-size: 12.5px;
      font-weight: 700;
      text-align: center;
      font-variant-numeric: tabular-nums;
      outline: none;
      appearance: textfield;
      -moz-appearance: textfield;
    }
    .v260-step-input::-webkit-outer-spin-button,
    .v260-step-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .v260-select {
      width: 100%;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      padding: 6px 8px;
      font-size: 12px;
      font-weight: 600;
      outline: none;
      cursor: pointer;
    }
    .v260-select option { background: #16161d; color: #fff; }

    .v260-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
      cursor: pointer;
    }
    .v260-switch input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .v260-switch-slider {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 24px;
      transition: background 0.18s ease, border-color 0.18s ease;
    }
    .v260-switch-slider::before {
      content: "";
      position: absolute;
      height: 18px;
      width: 18px;
      left: 2px;
      bottom: 2px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.18s ease;
    }
    .v260-switch input:checked + .v260-switch-slider {
      background: #0a84ff;
      border-color: #0a84ff;
    }
    .v260-switch input:checked + .v260-switch-slider::before {
      transform: translateX(20px);
    }

    .v260-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: calc(10px + env(safe-area-inset-top, 0px)) calc(14px + env(safe-area-inset-right, 0px)) 14px calc(14px + env(safe-area-inset-left, 0px));
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.82), transparent);
      position: relative;
      z-index: 20;
      width: 100%;
      pointer-events: none;
    }
    .v260-titlebox {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
    }
    .v260-title {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      color: #f5f5f7;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.2px;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
    }
    .v260-ep {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 9px;
      border-radius: 7px;
      background: linear-gradient(180deg, #2b9bff 0%, #0a84ff 100%);
      border: 1px solid rgba(255, 255, 255, 0.35);
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.35px;
      line-height: 1.35;
      text-shadow: none;
      box-shadow: 0 1px 6px rgba(10, 132, 255, 0.55);
    }
    .v260-title-main {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #f5f5f7;
      font-weight: 600;
    }
    .v260-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: auto;
      flex-shrink: 0;
    }
    .v260-center {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      z-index: 3;
      pointer-events: none;
    }
    .v260-center .v260-btn { width: 50px; height: 50px; min-width: 50px; }
    .v260-center .v260-btn svg { width: 24px; height: 24px; }
    .v260-center .v260-play {
      width: 64px;
      height: 64px;
      min-width: 64px;
      background: rgba(10, 132, 255, 0.92);
      border-color: rgba(255, 255, 255, 0.3);
    }
    .v260-center .v260-play svg { width: 30px; height: 30px; }
    .v260-bottom {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px calc(14px + env(safe-area-inset-right, 0px)) calc(14px + env(safe-area-inset-bottom, 0px)) calc(14px + env(safe-area-inset-left, 0px));
      background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
      z-index: 3;
      pointer-events: auto;
      width: 100%;
    }
    .v260-timeline-row {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    .v260-time {
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      min-width: 44px;
      text-align: center;
      text-shadow: 0 1px 3px #000;
    }
    .v260-range {
      flex: 1;
      min-width: 0;
      height: 6px;
    }
    .v260-range::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #0a84ff;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.6);
    }
    .v260-range::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #0a84ff;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.6);
    }
    .v260-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
    }
    .v260-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 18%;
      min-width: 135px;
      background: rgba(18, 18, 24, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.16);
      padding: 7px 12px;
      border-radius: 26px;
      pointer-events: auto;
    }
    .v260-pill svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      flex-shrink: 0;
    }
    .v260-pill input[type=range] {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      height: 5px;
    }
    .v260-pill input[type=range]::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #0a84ff;
      border: 2px solid #fff;
    }
    .v260-pill input[type=range]::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #0a84ff;
      border: 2px solid #fff;
    }
    #v260-mute {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 0;
      color: #fff;
      cursor: pointer;
      flex-shrink: 0;
    }
    #${CFG.overlayId}.locked .v260-titlebox,
    #${CFG.overlayId}.locked .v260-center,
    #${CFG.overlayId}.locked .v260-bottom,
    #${CFG.overlayId}.locked #v260-next-ep,
    #${CFG.overlayId}.locked #v260-speed-wrap,
    #${CFG.overlayId}.locked #v260-settings-wrap,
    #${CFG.overlayId}.locked #v260-aspect,
    #${CFG.overlayId}.locked #v260-exit {
      display: none;
    }
    #${CFG.overlayId}.locked .v260-top {
      justify-content: flex-end;
      background: transparent;
    }
    #${CFG.overlayId}.locked #v260-lock {
      pointer-events: auto;
      display: inline-flex;
      background: rgba(255, 69, 58, 0.85);
    }

    @media (max-width: 480px) {
      .v260-btn { width: 38px; height: 38px; min-width: 38px; }
      .v260-speed-wrap { height: 38px; }
      #v260-speed-btn { width: 36px; height: 36px; min-width: 36px; }
      .v260-speed-inline { width: 120px; }
      .v260-settings-panel { width: 270px; right: -36px; }
      .v260-center { gap: 16px; }
      .v260-center .v260-btn { width: 46px; height: 46px; min-width: 46px; }
      .v260-center .v260-play { width: 58px; height: 58px; min-width: 58px; }
      .v260-pill { width: 18%; min-width: 115px; padding: 6px 10px; }
    }

    @media (min-width: 768px) and (min-height: 520px), (min-width: 960px) {
      .v260-top {
        padding: calc(18px + env(safe-area-inset-top, 0px)) calc(24px + env(safe-area-inset-right, 0px)) 20px calc(24px + env(safe-area-inset-left, 0px));
        gap: 18px;
      }
      .v260-title { font-size: 19px; }
      .v260-ep { font-size: 13px; padding: 3px 11px; border-radius: 8px; }
      .v260-actions { gap: 12px; }
      .v260-btn { width: 52px; height: 52px; min-width: 52px; }
      .v260-speed-wrap { height: 52px; border-radius: 30px; }
      #v260-speed-btn { width: 50px; height: 50px; min-width: 50px; }
      .v260-speed-inline { width: 190px; gap: 10px; }
      .v260-settings-panel { width: 335px; padding: 16px 18px; gap: 13px; }
      .v260-menu-label { font-size: 13px; }
      .v260-select { font-size: 13px; padding: 8px 10px; }
      #v260-speed { height: 7px; }
      .v260-speed-val { font-size: 13px; min-width: 48px; }
      .v260-btn svg { width: 25px; height: 25px; }
      .v260-center { gap: 38px; }
      .v260-center .v260-btn { width: 66px; height: 66px; min-width: 66px; }
      .v260-center .v260-btn svg { width: 31px; height: 31px; }
      .v260-center .v260-play { width: 84px; height: 84px; min-width: 84px; }
      .v260-center .v260-play svg { width: 40px; height: 40px; }
      .v260-bottom {
        gap: 14px;
        padding: 18px calc(24px + env(safe-area-inset-right, 0px)) calc(22px + env(safe-area-inset-bottom, 0px)) calc(24px + env(safe-area-inset-left, 0px));
      }
      .v260-timeline-row { gap: 14px; }
      .v260-time { font-size: 15px; min-width: 56px; }
      .v260-range { height: 8px; border-radius: 6px; }
      .v260-range::-webkit-slider-thumb { width: 22px; height: 22px; }
      .v260-range::-moz-range-thumb { width: 22px; height: 22px; }
      .v260-pill { width: 18%; min-width: 185px; padding: 10px 16px; gap: 10px; border-radius: 32px; }
      .v260-pill svg { width: 22px; height: 22px; }
      .v260-pill input[type=range] { height: 7px; }
    }
  `;



  /* =========================================================
     5. PLAYBACK, HARDWARE-OVERLAY DIMMER, AUDIO & FULLSCREEN
  ========================================================= */

  function getCustomSeekSvg(type) {
    const step = state.doubleTapStep || 30;
    const fontSize = step >= 100 ? '5.8' : '7.5';
    if (type === 'back') {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 3a9 9 0 1 0 8.7 6.6M12.5 3V7M12.5 3L8.5 3"/><text x="12" y="15.5" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none">${step}</text></svg>`;
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.5 3a9 9 0 1 1-8.7 6.6M11.5 3V7M11.5 3L15.5 3"/><text x="12" y="15.5" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none">${step}</text></svg>`;
  }

  function showHud(text, duration = 950, iconKey = '') {
    const hud = state.refs?.hud;
    if (!hud) return;
    let svgMarkup = '';
    if (iconKey === 'back' || iconKey === 'next') {
      svgMarkup = getCustomSeekSvg(iconKey);
    } else if (iconKey && SVG[iconKey]) {
      svgMarkup = icon(iconKey);
    }
    hud.innerHTML = `${svgMarkup}<span>${escapeHtml(text)}</span>`;
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
    inputEl.style.setProperty('--v260-pct', `${p}%`);
  }

  function applyBrightness(video, val) {
    if (!video) return;
    const clamped = clamp(Number(val) || 1, 0.25, 1.75);
    state.brightness = clamped;
    const baseFilter = state.originalVideo?.filter || '';
    const dimmer = state.refs?.dimmer;

    try {
      if (clamped <= 1) {
        if (video.style.filter !== baseFilter) {
          video.style.filter = baseFilter;
        }
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
    if (state.refs?.volume) {
      styleRangeTrack(state.refs.volume, val * 100);
    }
  }

  function safePlay(video) {
    if (!video) return;
    try {
      // Primary attempt
      const p = video.play();
      if (p?.catch) {
        p.catch(() => {
          // Retry once after a short tick (common on Android / strict autoplay + first-play)
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
      // Extra nudge for players that only start after a synthetic interaction
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
    showHud(`กำลังซ่อมแซมสัญญาณภาพอัตโนมัติ...`, 2000, 'settings');

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

  function enterUniversalFullscreen(video) {
    if (!video || isDisqualifiedVideo(video)) return;

    // Single-Flight Guard: ป้องกัน loadeddata และ playing เรียกซ้อนกันในมิลลิวินาทีเดียวจน Promise ชนกัน
    const now = Date.now();
    if (state.isEnteringFullscreen && (now - state.enteringFullscreenTs) < 1200) {
      return;
    }
    if (state.overlay && state.video === video && !state.pseudoFullscreen) {
      return;
    }

    state.lastActiveVideo = video;
    const container = ensureSafeContainer(video);
    if (!container) return;

    // กรณีอยู่ใน iframe และหน้าหลัก (window.top) ยังถือ Native Fullscreen Anchor อยู่ข้ามตอน:
    if (window !== window.top && state.topHasNativeFs) {
      dbg('FS', 'Top-Level Native Fullscreen active -> Mounting Native-FS Overlay');
      tryLockLandscape(video);
      createOverlay(video, container, false);
      return;
    }

    // ถ้าอยู่ใน iframe และมี User Activation ให้ตรึง Top-Level Anchor ไว้สำหรับตอนถัดไป
    if (window !== window.top && navigator.userActivation?.isActive) {
      anchorTopNativeFullscreen();
    }

    dbg('FS', 'Entering Native Fullscreen');

    if (origReqFS) {
      try {
        if (container.hasAttribute('data-tmv260-wrapper')) {
          container.style.display = 'block';
        }
        state.isEnteringFullscreen = true;
        state.enteringFullscreenTs = now;
        const res = origReqFS.call(container, { navigationUI: 'hide' });
        if (res && typeof res.then === 'function') {
          res.then(() => {
            state.isEnteringFullscreen = false;
            if (window === window.top) {
              setTopWindowIframeFullscreenLock(false);
              broadcastTopFsState(true);
            }
            tryLockLandscape(video);
            createOverlay(video, container, false);
          }).catch(() => {
            state.isEnteringFullscreen = false;
            // หากเบราว์เซอร์เข้า Native Fullscreen สำเร็จแล้ว (จากเฟรมแม่หรือคำสั่งก่อนหน้า) ห้ามเขียนทับด้วย Pseudo-FS
            if (fullscreenElement() || (window !== window.top && state.topHasNativeFs)) {
              tryLockLandscape(video);
              createOverlay(video, container, false);
              return;
            }
            setTopWindowIframeFullscreenLock(true);
            tryLockLandscape(video);
            createOverlay(video, container, true);
          });
          return;
        }
        state.isEnteringFullscreen = false;
      } catch (_) {
        state.isEnteringFullscreen = false;
      }
    }

    setTopWindowIframeFullscreenLock(true);
    tryLockLandscape(video);
    createOverlay(video, container, true);
  }

  // เงื่อนไข (2): ล้างฟังก์ชันโหมดเต็มหน้าจอทั้งหมดและไม่พยายามเปิดซ้ำ จนกว่าจะเข้าเงื่อนไข (1.) ใหม่
  function cleanupFullscreenSession(exitedVideo = null) {
    const targetVideo = exitedVideo || state.video || state.lastActiveVideo || null;
    state.manualExitAt = Date.now();
    state.manualExitVideo = targetVideo;
    state.suppressAutoFsUntilPlay = Boolean(targetVideo && !targetVideo.paused && !targetVideo.ended);

    state.expectingSeamlessEpisode = false;
    state.isTransitioningNextEp = false;
    state.armedFromAutoNext = false;
    state.pendingPlayAutoFsVideo = null;
    state.pendingPlayAutoFsTs = 0;
    state.isEnteringFullscreen = false;
    state.enteringFullscreenTs = 0;

    clearAutoFullscreenBridge();
    setTopWindowIframeFullscreenLock(false);
    tryUnlockOrientation();
    releaseWakeLock();
    destroyController();
  }

  function exitUniversalFullscreen() {
    const currentVid = state.video || state.lastActiveVideo;
    cleanupFullscreenSession(currentVid);

    if (window !== window.top) {
      releaseTopNativeFullscreen();
    }

    const fs = fullscreenElement();
    if (fs) {
      try {
        const res = document.exitFullscreen?.() ||
          document.mozCancelFullScreen?.() ||
          document.webkitExitFullscreen?.();
        if (res?.catch) res.catch(() => {});
      } catch (_) {}
    }
  }

  /* =========================================================
     7. CONTAINER & VIDEO STATE RESTORATION (ANTI-OVERLAP)
  ========================================================= */

  function suppressHostAndNativeControls(video, container, isPseudo) {
    state.originalVideo = {
      objectFit: video.style.getPropertyValue('object-fit'),
      objectFitPriority: video.style.getPropertyPriority('object-fit'),
      objectPosition: video.style.getPropertyValue('object-position'),
      objectPositionPriority: video.style.getPropertyPriority('object-position'),
      filter: video.style.filter,
      controlsProp: Boolean(video.controls),
      controlsAttr: video.getAttribute('controls')
    };

    try {
      video.controls = false;
      video.removeAttribute('controls');
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
          if (origV.objectFit) {
            video.style.setProperty('object-fit', origV.objectFit, origV.objectFitPriority);
          } else {
            video.style.removeProperty('object-fit');
          }
          if (origV.objectPosition) {
            video.style.setProperty('object-position', origV.objectPosition, origV.objectPositionPriority);
          } else {
            video.style.removeProperty('object-position');
          }
          video.style.filter = origV.filter;
          if (origV.controlsAttr !== null) {
            video.setAttribute('controls', origV.controlsAttr);
          }
          if (origV.controlsProp) {
            video.controls = true;
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
        if (container.hasAttribute('data-tmv260-wrapper')) {
          container.style.display = 'contents';
        }
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
     8. OVERLAY LIFECYCLE, WINDOW FIREWALL & GESTURES
  ========================================================= */

  function clearHide() {
    if (state.hideTimer) clearTimeout(state.hideTimer);
    state.hideTimer = 0;
  }

  function clearSpeedHide() {
    if (state.speedHideTimer) clearTimeout(state.speedHideTimer);
    state.speedHideTimer = 0;
  }

  function clearSettingsHide() {
    if (state.settingsHideTimer) clearTimeout(state.settingsHideTimer);
    state.settingsHideTimer = 0;
  }

  function collapseSpeedSlider() {
    clearSpeedHide();
    state.refs?.speedWrap?.classList.remove('expanded');
  }

  function collapseSettingsPanel() {
    clearSettingsHide();
    state.refs?.settingsWrap?.classList.remove('expanded');
    state.overlay?.classList.remove('settings-open');
  }

  function collapseAllMenus() {
    collapseSpeedSlider();
    collapseSettingsPanel();
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

  function updateSpeedTrackVisual() {
    if (!state.refs?.speedInput) return;
    const val = Number(state.refs.speedInput.value) || 1;
    const span = Math.max(0.1, state.maxSpeed - state.minSpeed);
    const pct = ((val - state.minSpeed) / span) * 100;
    styleRangeTrack(state.refs.speedInput, pct);
  }

  function updateProgress(force = false) {
    const video = state.video;
    const refs = state.refs;
    if (!video || !refs || state.seeking) return;
    if (!force && !visibleUI()) return;

    const now = performance.now();
    if (!force && now - state.lastProgressUpdateTs < 180) return;
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

    if (
      state.locked ||
      state.seeking ||
      state.interactingSlider ||
      document.hidden ||
      overlay.classList.contains('settings-open')
    ) return;

    state.hideTimer = setTimeout(() => {
      state.hideTimer = 0;
      if (
        state.overlay !== overlay ||
        state.locked ||
        state.seeking ||
        state.interactingSlider ||
        overlay.classList.contains('settings-open')
      ) return;
      collapseAllMenus();
      overlay.classList.add('hidden-ui');
      cancelProgress();
    }, CFG.hideDelay);
  }

  function addEvent(target, type, handler, options, abortCtrl = state.abort) {
    if (!target || !abortCtrl) return;
    try {
      target.addEventListener(type, handler, {
        ...(options || {}),
        signal: abortCtrl.signal
      });
    } catch (_) {}
  }

  function detachOverlay() {
    clearHide();
    clearSpeedHide();
    clearSettingsHide();
    cancelProgress();
    stopAdWatcher();
    if (state.hudTimer) clearTimeout(state.hudTimer);
    if (state.tapToggleTimer) clearTimeout(state.tapToggleTimer);
    if (state.longPressTimer) clearTimeout(state.longPressTimer);
    if (state.rewindRaf) cancelAnimationFrame(state.rewindRaf);
    if (state.observerRaf) cancelAnimationFrame(state.observerRaf);
    state.hudTimer = 0;
    state.tapToggleTimer = 0;
    state.longPressTimer = 0;
    state.rewindRaf = 0;
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
    state.seeking = false;
    state.interactingSlider = false;
    state.locked = false;
    state.lastTap = 0;
    invalidateBestVideoCache();
  }

  function destroyController() {
    tryUnlockOrientation();
    releaseWakeLock();
    stopAdWatcher();
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
  }

  function createOverlay(video, container, isPseudo = false) {
    if (!isVideo(video) || !container || !video.isConnected || isDisqualifiedVideo(video)) return;

    if (
      state.video === video &&
      state.container === container &&
      state.shadowHost?.isConnected
    ) return;

    destroyController();
    loadPrefs();
    installHostStyles(container.ownerDocument || document);

    state.video = video;
    state.lastActiveVideo = video;
    state.container = container;
    state.locked = false;
    state.seeking = false;
    state.interactingSlider = false;
    state.lastVolume = video.volume > 0 ? video.volume : 1;

    suppressHostAndNativeControls(video, container, isPseudo);
    const currentTitle = refreshTitleCache(false);
    if (!video.paused) requestWakeLock();

    const initialSpeed = Math.round(clamp(Number(video.playbackRate) || 1, state.minSpeed, state.maxSpeed) * 100) / 100;
    state.savedSpeed = initialSpeed;
    CFG.seekStep = state.doubleTapStep;
    const initialVol = video.muted ? 0 : clamp(video.volume, 0, 1);

    const dtOptionsHtml = DOUBLE_TAP_MODES.map(
      m => `<option value="${m.key}"${m.key === state.doubleTapMode ? ' selected' : ''}>${escapeHtml(m.label)}</option>`
    ).join('');

    const shadowHost = document.createElement('div');
    shadowHost.id = CFG.shadowHostId;
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    const shadowStyle = document.createElement('style');
    shadowStyle.textContent = SHADOW_UI_CSS;
    shadowRoot.appendChild(shadowStyle);

    const overlay = document.createElement('div');
    overlay.id = CFG.overlayId;

    overlay.innerHTML = `
      <div class="v260-dimmer" id="v260-dimmer"></div>
      <div class="v260-absorber"></div>
      <div class="v260-debug${state.debugEnabled ? ' active' : ''}" id="v260-debug">
        <div class="v260-debug-head">
          <span id="v260-debug-head-txt">OMNIFORGE V26.6.0</span>
          <button type="button" class="v260-debug-clear" id="v260-debug-clear">Clear</button>
        </div>
        <div class="v260-debug-body" id="v260-debug-body"></div>
      </div>
      <div class="v260-hud" id="v260-hud"></div>
      <div class="v260-spinner"></div>
      <div class="v260-top v260-ui">
        <div class="v260-titlebox"><span class="v260-title" id="v260-title"></span></div>
        <div class="v260-actions">
          <button class="v260-btn" id="v260-next-ep" type="button" title="เล่นตอนถัดไป (Next Episode)" aria-label="Next Episode">${icon('nextEp')}</button>
          <div class="v260-speed-wrap" id="v260-speed-wrap">
            <button class="v260-btn" id="v260-speed-btn" type="button" title="ความเร็ววิดีโอ" aria-label="Playback Speed">${icon('rocket')}</button>
            <div class="v260-speed-inline" id="v260-speed-inline">
              <input type="range" class="v260-slider" id="v260-speed" min="${state.minSpeed}" max="${state.maxSpeed}" step="0.01" value="${initialSpeed}" aria-label="Speed Slider">
              <span class="v260-speed-val" id="v260-speed-val" title="แตะเพื่อรีเซ็ตเป็น 1.0x">${formatSpeed(initialSpeed)}</span>
            </div>
          </div>
          <div class="v260-settings-wrap" id="v260-settings-wrap">
            <button class="v260-btn" id="v260-settings-btn" type="button" title="ตั้งค่าการควบคุม" aria-label="Control Settings">${icon('settings')}</button>
            <div class="v260-settings-panel" id="v260-settings-panel">
              <div class="v260-settings-header">
                <span class="v260-settings-title">${icon('settings')}<span>ตั้งค่าการควบคุม</span></span>
                <button type="button" class="v260-reset-btn" id="v260-reset-defaults">คืนค่าเริ่มต้น</button>
              </div>
              <div class="v260-menu-row">
                <span class="v260-menu-label">แตะ 2 ครั้ง เลื่อนเวลา (±วิ)</span>
                <div class="v260-stepper">
                  <button type="button" class="v260-step-btn" id="v260-dtstep-dec">−</button>
                  <input type="number" class="v260-step-input" id="v260-dtstep-input" min="1" max="300" step="1" value="${state.doubleTapStep}">
                  <button type="button" class="v260-step-btn" id="v260-dtstep-inc">+</button>
                </div>
              </div>
              <div class="v260-menu-row">
                <span class="v260-menu-label">กดค้างเร่งความเร็ว (×)</span>
                <div class="v260-stepper">
                  <button type="button" class="v260-step-btn" id="v260-lpspeed-dec">−</button>
                  <input type="number" class="v260-step-input" id="v260-lpspeed-input" min="1" max="16" step="0.25" value="${state.longPressSpeed}">
                  <button type="button" class="v260-step-btn" id="v260-lpspeed-inc">+</button>
                </div>
              </div>
              <div class="v260-menu-row">
                <span class="v260-menu-label">ความเร็วต่ำสุดปุ่มจรวด</span>
                <div class="v260-stepper">
                  <button type="button" class="v260-step-btn" id="v260-minspeed-dec">−</button>
                  <input type="number" class="v260-step-input" id="v260-minspeed-input" min="0.1" max="2" step="0.1" value="${state.minSpeed}">
                  <button type="button" class="v260-step-btn" id="v260-minspeed-inc">+</button>
                </div>
              </div>
              <div class="v260-menu-row">
                <span class="v260-menu-label">ความเร็วสูงสุดปุ่มจรวด</span>
                <div class="v260-stepper">
                  <button type="button" class="v260-step-btn" id="v260-maxspeed-dec">−</button>
                  <input type="number" class="v260-step-input" id="v260-maxspeed-input" min="1.5" max="16" step="0.5" value="${state.maxSpeed}">
                  <button type="button" class="v260-step-btn" id="v260-maxspeed-inc">+</button>
                </div>
              </div>
              <div class="v260-menu-row" style="padding-top:6px;border-top:1px solid rgba(255,255,255,0.12);">
                <span class="v260-menu-label">ขยายเต็มจออัตโนมัติเมื่อกด Play</span>
                <label class="v260-switch" title="เปิด/ปิด การขยาย Native Fullscreen อัตโนมัติทันทีที่กด Play เริ่มเล่นวิดีโอ">
                  <input type="checkbox" id="v260-autofsonplay-toggle"${state.autoFsOnPlayEnabled ? ' checked' : ''}>
                  <span class="v260-switch-slider"></span>
                </label>
              </div>
              <div class="v260-menu-row">
                <span class="v260-menu-label">เล่น EP ถัดไปอัตโนมัติเมื่อจบ</span>
                <label class="v260-switch" title="เปิด/ปิด การเล่นตอนถัดไปอัตโนมัติโดยไม่ออกจากโหมดเต็มจอ">
                  <input type="checkbox" id="v260-autonext-toggle"${state.autoNextEnabled ? ' checked' : ''}>
                  <span class="v260-switch-slider"></span>
                </label>
              </div>
              <div class="v260-menu-row">
                <span class="v260-menu-label">รับชมต่อจากที่ดูค้างไว้</span>
                <label class="v260-switch" title="เปิด/ปิด การจำเวลาที่ดูค้างไว้">
                  <input type="checkbox" id="v260-resume-toggle"${state.resumeEnabled ? ' checked' : ''}>
                  <span class="v260-switch-slider"></span>
                </label>
              </div>
              <div class="v260-menu-row">
                <span class="v260-menu-label">แสดงสถานะระบบ (Debug)</span>
                <label class="v260-switch" title="เปิด/ปิด กล่องตรวจสอบสถานะบนหน้าจอ">
                  <input type="checkbox" id="v260-debug-toggle"${state.debugEnabled ? ' checked' : ''}>
                  <span class="v260-switch-slider"></span>
                </label>
              </div>
              <div class="v260-menu-col">
                <span class="v260-menu-label">โหมดการแตะหน้าจอ 2 ครั้ง</span>
                <select class="v260-select" id="v260-dt-mode" aria-label="Double Tap Mode">
                  ${dtOptionsHtml}
                </select>
              </div>
            </div>
          </div>
          <button class="v260-btn" id="v260-aspect" type="button" title="Switch Aspect Ratio" aria-label="Aspect ratio">${icon('aspect')}</button>
          <button class="v260-btn" id="v260-lock" type="button" title="Lock Screen" aria-label="Lock Screen">${icon('unlock')}</button>
          <button class="v260-btn" id="v260-exit" type="button" title="Exit Fullscreen" aria-label="Exit Fullscreen">${icon('exit')}</button>
        </div>
      </div>
      <div class="v260-center v260-ui">
        <button class="v260-btn" id="v260-back" type="button" aria-label="Rewind">${icon('back')}</button>
        <button class="v260-btn v260-play" id="v260-play" type="button" aria-label="Play/Pause">${icon(video.paused ? 'play' : 'pause')}</button>
        <button class="v260-btn" id="v260-next" type="button" aria-label="Forward">${icon('next')}</button>
      </div>
      <div class="v260-bottom v260-ui">
        <div class="v260-timeline-row">
          <span class="v260-time" id="v260-current">00:00</span>
          <input class="v260-range v260-slider" id="v260-timeline" type="range" min="0" max="100" value="0" step="0.1" aria-label="Video progress">
          <span class="v260-time" id="v260-duration">LIVE</span>
        </div>
        <div class="v260-controls">
          <div class="v260-pill">${icon('sun')}
            <input type="range" class="v260-slider" id="v260-brightness" min="0.25" max="1.75" step="0.01" value="${state.brightness}" aria-label="Brightness">
          </div>
          <div class="v260-pill">
            <button id="v260-mute" type="button" aria-label="Mute">${icon(video.muted || video.volume === 0 ? 'mute' : 'volume')}</button>
            <input type="range" class="v260-slider" id="v260-volume" min="0" max="1" step="0.01" value="${initialVol}" aria-label="Volume">
          </div>
        </div>
      </div>
    `;

    shadowRoot.appendChild(overlay);
    state.shadowHost = shadowHost;
    state.shadowRoot = shadowRoot;
    state.overlay = overlay;
    state.abort = new AbortController();

    const $ = sel => overlay.querySelector(sel);
    const dimmer = $('#v260-dimmer');
    const absorber = $('.v260-absorber');
    const debugBox = $('#v260-debug');
    const debugHeadTxt = $('#v260-debug-head-txt');
    const debugBody = $('#v260-debug-body');
    const debugClearBtn = $('#v260-debug-clear');
    const hud = $('#v260-hud');
    const nextEpBtn = $('#v260-next-ep');
    const playBtn = $('#v260-play');
    const backBtn = $('#v260-back');
    const nextBtn = $('#v260-next');
    const speedWrap = $('#v260-speed-wrap');
    const speedBtn = $('#v260-speed-btn');
    const speedInline = $('#v260-speed-inline');
    const speedInput = $('#v260-speed');
    const speedVal = $('#v260-speed-val');
    const settingsWrap = $('#v260-settings-wrap');
    const settingsBtn = $('#v260-settings-btn');
    const settingsPanel = $('#v260-settings-panel');
    const resetDefaultsBtn = $('#v260-reset-defaults');
    const dtStepDec = $('#v260-dtstep-dec');
    const dtStepInc = $('#v260-dtstep-inc');
    const dtStepInput = $('#v260-dtstep-input');
    const minSpeedDec = $('#v260-minspeed-dec');
    const minSpeedInc = $('#v260-minspeed-inc');
    const minSpeedInput = $('#v260-minspeed-input');
    const maxSpeedDec = $('#v260-maxspeed-dec');
    const maxSpeedInc = $('#v260-maxspeed-inc');
    const maxSpeedInput = $('#v260-maxspeed-input');
    const lpSpeedDec = $('#v260-lpspeed-dec');
    const lpSpeedInc = $('#v260-lpspeed-inc');
    const lpSpeedInput = $('#v260-lpspeed-input');
    const autoFsOnPlayToggle = $('#v260-autofsonplay-toggle');
    const autoNextToggle = $('#v260-autonext-toggle');
    const resumeToggle = $('#v260-resume-toggle');
    const debugToggle = $('#v260-debug-toggle');
    const dtModeSelect = $('#v260-dt-mode');
    const aspectBtn = $('#v260-aspect');
    const lockBtn = $('#v260-lock');
    const exitBtn = $('#v260-exit');
    const timeline = $('#v260-timeline');
    const currentLabel = $('#v260-current');
    const durationLabel = $('#v260-duration');
    const brightness = $('#v260-brightness');
    const volume = $('#v260-volume');
    const muteBtn = $('#v260-mute');
    const titleLabel = $('.v260-title');

    state.refs = {
      dimmer,
      debugBox,
      debugHeadTxt,
      debugBody,
      title: titleLabel,
      current: currentLabel,
      duration: durationLabel,
      timeline,
      speedWrap,
      settingsWrap,
      speedInput,
      speedVal,
      brightness,
      volume,
      hud,
      lastSecond: -1,
      lastPercent: -1,
      lastDuration: -2
    };

    setTitleUI(currentTitle, state.currentEp);
    applyBrightness(video, state.brightness);
    styleRangeTrack(volume, initialVol * 100);
    updateSpeedTrackVisual();
    dbg('UI', `Overlay mounted (${isPseudo ? 'Pseudo-FS' : 'Native-FS'})`);

    addEvent(debugClearBtn, 'click', e => {
      e.stopPropagation();
      state.debugLogs.length = 0;
      renderDebugConsole();
    });

    addEvent(nextEpBtn, 'click', e => {
      e.stopPropagation();
      triggerSeamlessNextEpisode(true);
      resetAutoHide();
    });

    function syncSeekBadges() {
      const txts = overlay.querySelectorAll('.v260-seek-txt');
      const fontSize = state.doubleTapStep >= 100 ? '5.8' : '7.5';
      for (let i = 0; i < txts.length; i++) {
        txts[i].textContent = String(state.doubleTapStep);
        txts[i].setAttribute('font-size', fontSize);
      }
    }
    syncSeekBadges();

    const shieldEvents = [
      'touchstart', 'touchmove', 'touchend',
      'pointerdown', 'pointermove', 'pointerup',
      'mousedown', 'mousemove', 'mouseup',
      'click', 'dblclick', 'contextmenu'
    ];
    for (let i = 0; i < shieldEvents.length; i++) {
      addEvent(overlay, shieldEvents[i], e => {
        if (e.type === 'contextmenu') e.preventDefault();
        e.stopPropagation();
      });
    }

    function updatePlayIcon() {
      if (state.overlay !== overlay || !state.video) return;
      playBtn.innerHTML = icon(state.video.paused ? 'play' : 'pause');
    }

    function updateVolumeIcon() {
      if (state.overlay !== overlay || !state.video) return;
      const curVol = state.video.muted ? 0 : clamp(state.video.volume, 0, 1);
      muteBtn.innerHTML = icon(curVol <= 0 ? 'mute' : 'volume');
      if (state.refs?.volume) {
        state.refs.volume.value = String(curVol);
        styleRangeTrack(state.refs.volume, curVol * 100);
      }
    }

    /* --- Smart Unified Touch Gesture Engine --- */
    let startX = 0;
    let startY = 0;
    let startAt = 0;
    let cachedRectLeft = 0;
    let cachedRectWidth = 1;
    let cachedVerticalSpan = 220;
    let activePointer = null;
    let gestureMode = '';
    let initialBright = 1;
    let initialVolLevel = 1;

    function stopLongPressSpeed() {
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = 0;
      }
      if (state.rewindRaf) {
        cancelAnimationFrame(state.rewindRaf);
        state.rewindRaf = 0;
      }
      // Always remove window-level safety listeners
      try { window.removeEventListener('pointerup', windowLpUp, true); } catch (_) {}
      try { window.removeEventListener('pointercancel', windowLpUp, true); } catch (_) {}
      try { window.removeEventListener('touchend', windowLpUp, true); } catch (_) {}
      try { window.removeEventListener('touchcancel', windowLpUp, true); } catch (_) {}

      if (state.isLongPressSpeeding && state.video) {
        const wasRewinding = state.isLongPressSpeeding === 'rewind';
        const restoreRate = clamp(Number(state.preLongPressSpeed) || 1, state.minSpeed, state.maxSpeed);
        state.isLongPressSpeeding = false;
        // Force rate multiple times – some players (HLS / custom) ignore or override the first set
        const forceRate = () => {
          try {
            if (state.video && !state.isLongPressSpeeding) {
              state.video.playbackRate = restoreRate;
            }
          } catch (_) {}
        };
        forceRate();
        // Microtask + short delays to beat player-side rate resets common on anime-sugoi / playhdhls
        Promise.resolve().then(forceRate);
        setTimeout(forceRate, 30);
        setTimeout(forceRate, 120);
        setTimeout(forceRate, 350);
        if (wasRewinding && state.wasPlayingBeforeRewind) {
          safePlay(state.video);
        }
        showHud(`ความเร็ว ${formatSpeed(restoreRate)}`, 700, 'rocket');
      } else if (state.video) {
        // Safety: even if flag was already cleared, snap high rates back
        const r = Number(state.video.playbackRate) || 1;
        if (r > state.maxSpeed + 0.05 || r > 3.5) {
          try { state.video.playbackRate = state.preLongPressSpeed || state.savedSpeed || 1; } catch (_) {}
        }
      }
    }

    function windowLpUp(e) {
      // Global safety net when absorber misses pointerup (common on Android + complex Shadow DOM / iframe players)
      if (state.isLongPressSpeeding) {
        stopLongPressSpeed();
      }
    }

    function startDecoderSafeRewind(rate) {
      if (!state.video) return;
      state.wasPlayingBeforeRewind = !state.video.paused;
      try { state.video.pause(); } catch (_) {}
      state.rewindLastTs = performance.now();

      const stepRewind = now => {
        if (state.isLongPressSpeeding !== 'rewind' || !state.video) {
          state.rewindRaf = 0;
          return;
        }
        const elapsedMs = now - state.rewindLastTs;
        if (!state.video.seeking && elapsedMs >= 110) {
          const dt = Math.min(elapsedMs / 1000, 0.45);
          state.rewindLastTs = now;
          const nextTime = Math.max(0, state.video.currentTime - dt * rate);
          safeSeek(state.video, nextTime, true);
          queueProgress(true);
          if (nextTime <= 0) {
            state.rewindRaf = 0;
            showHud('ถึงจุดเริ่มต้นวิดีโอ', 900, 'back');
            return;
          }
        }
        state.rewindRaf = requestAnimationFrame(stepRewind);
      };

      if (state.rewindRaf) cancelAnimationFrame(state.rewindRaf);
      state.rewindRaf = requestAnimationFrame(stepRewind);
    }

    addEvent(absorber, 'pointerdown', e => {
      e.stopPropagation();

      promotePseudoToNativeFs();

      if (overlay.classList.contains('settings-open') || speedWrap.classList.contains('expanded')) {
        collapseAllMenus();
        resetAutoHide();
        return;
      }
      if (state.locked) {
        resetAutoHide();
        return;
      }

      const rect = absorber.getBoundingClientRect();
      cachedRectLeft = rect.left;
      cachedRectWidth = rect.width || window.innerWidth || 1;
      cachedVerticalSpan = clamp((rect.height || window.innerHeight || 360) * 0.62, 160, 420);

      activePointer = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startAt = performance.now();
      gestureMode = '';
      initialBright = state.brightness;
      initialVolLevel = state.video.muted ? 0 : clamp(state.video.volume, 0, 1);

      try { absorber.setPointerCapture(e.pointerId); } catch (_) {}

      if (state.longPressTimer) clearTimeout(state.longPressTimer);
      state.longPressTimer = setTimeout(() => {
        state.longPressTimer = 0;
        if (activePointer !== null && !gestureMode && state.video) {
          const isLeftSide = startX < cachedRectLeft + cachedRectWidth * 0.5;
          const targetLpSpeed = clamp(Number(state.longPressSpeed) || 2, 1, 16);
          state.preLongPressSpeed = state.video.playbackRate || 1;

          if (isLeftSide) {
            state.isLongPressSpeeding = 'rewind';
            startDecoderSafeRewind(targetLpSpeed);
            showHud(`เร่งถอยหลัง ${formatSpeed(targetLpSpeed)}`, 15000, 'fastRewind');
          } else if (!state.video.paused) {
            state.isLongPressSpeeding = 'forward';
            try { state.video.playbackRate = targetLpSpeed; } catch (_) {}
            showHud(`เร่งเดินหน้า ${formatSpeed(targetLpSpeed)}`, 15000, 'fastForward');
          }
          // Window-level safety listeners (Android / Shadow DOM / player often swallow pointerup on absorber)
          try {
            window.addEventListener('pointerup', windowLpUp, true);
            window.addEventListener('pointercancel', windowLpUp, true);
            window.addEventListener('touchend', windowLpUp, true);
            window.addEventListener('touchcancel', windowLpUp, true);
          } catch (_) {}
        }
      }, CFG.longPressMs);
    });

    addEvent(absorber, 'pointermove', e => {
      if (state.locked || e.pointerId !== activePointer) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 14 || Math.abs(dy) > 14) {
        if (state.longPressTimer) {
          clearTimeout(state.longPressTimer);
          state.longPressTimer = 0;
        }
      }

      if (state.isLongPressSpeeding) return;

      if (!gestureMode && Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        gestureMode = startX < cachedRectLeft + cachedRectWidth * 0.45 ? 'vertical-bright' : 'vertical-vol';
      }

      if (gestureMode === 'vertical-bright') {
        const delta = -dy / cachedVerticalSpan;
        const nextB = clamp(Math.round((initialBright + delta) * 100) / 100, 0.25, 1.75);
        applyBrightness(state.video, nextB);
        brightness.value = String(nextB);
        showHud(`ความสว่าง ${Math.round(nextB * 100)}%`, 700, 'sun');
      } else if (gestureMode === 'vertical-vol') {
        const delta = -dy / cachedVerticalSpan;
        const nextV = clamp(Math.round((initialVolLevel + delta) * 100) / 100, 0, 1);
        setNativeVolume(state.video, nextV);
        volume.value = String(nextV);
        updateVolumeIcon();
        showHud(`ระดับเสียง ${Math.round(nextV * 100)}%`, 700, nextV <= 0 ? 'mute' : 'volume');
      }
    });

    addEvent(absorber, 'pointerup', e => {
      e.stopPropagation();
      // When long-press is active, always stop even if pointerId mismatches (Android WebView quirk)
      if (state.locked && !state.isLongPressSpeeding) return;
      if (e.pointerId !== activePointer && !state.isLongPressSpeeding) return;
      try { absorber.releasePointerCapture(e.pointerId); } catch (_) {}
      activePointer = null;

      if (state.isLongPressSpeeding) {
        stopLongPressSpeed();
        return;
      }
      stopLongPressSpeed();

      if (gestureMode) {
        savePrefs();
        gestureMode = '';
        return;
      }

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const elapsed = performance.now() - startAt;

      if (Math.abs(dx) >= CFG.swipePx && Math.abs(dx) > Math.abs(dy) * 1.35 && elapsed < 900) {
        const step = dx > 0 ? state.doubleTapStep : -state.doubleTapStep;
        safeSeek(state.video, state.video.currentTime + step, false);
        showHud(step > 0 ? `+${step} วินาที` : `${step} วินาที`, 950, step > 0 ? 'next' : 'back');
        state.lastTap = 0;
        resetAutoHide();
        return;
      }

      if (Math.abs(dx) > 18 || Math.abs(dy) > 18 || elapsed > 500) {
        state.lastTap = 0;
        return;
      }

      const now = performance.now();
      const relX = (e.clientX - cachedRectLeft) / cachedRectWidth;
      const zone = relX < 0.35 ? 'left' : relX > 0.65 ? 'right' : 'center';

      const isSameTapTarget = state.doubleTapMode === 'playpause' ||
        (state.doubleTapMode === 'seek_only' ? (relX < 0.5 ? 'left' : 'right') === state.lastTapZone : state.lastTapZone === zone);

      if (state.doubleTapMode !== 'off' && now - state.lastTap < CFG.doubleTapMs && isSameTapTarget) {
        state.lastTap = 0;
        if (state.tapToggleTimer) {
          clearTimeout(state.tapToggleTimer);
          state.tapToggleTimer = 0;
        }

        const stepSec = state.doubleTapStep;

        if (state.doubleTapMode === 'playpause') {
          if (state.video.paused) {
            clickPlayerBigPlayButton();
            safePlay(state.video);
            showHud('เล่น', 900, 'play');
            setTimeout(() => {
              if (state.video && state.video.paused && !state.destroyed) {
                clickPlayerBigPlayButton();
                safePlay(state.video);
              }
            }, 220);
          } else {
            state.video.pause();
            showHud('หยุด', 900, 'pause');
          }
        } else if (state.doubleTapMode === 'seek_only') {
          if (relX < 0.5) {
            safeSeek(state.video, state.video.currentTime - stepSec, false);
            showHud(`-${stepSec} วินาที`, 950, 'back');
          } else {
            safeSeek(state.video, state.video.currentTime + stepSec, false);
            showHud(`+${stepSec} วินาที`, 950, 'next');
          }
        } else {
          if (zone === 'left') {
            safeSeek(state.video, state.video.currentTime - stepSec, false);
            showHud(`-${stepSec} วินาที`, 950, 'back');
          } else if (zone === 'right') {
            safeSeek(state.video, state.video.currentTime + stepSec, false);
            showHud(`+${stepSec} วินาที`, 950, 'next');
          } else {
            if (state.video.paused) {
              clickPlayerBigPlayButton();
              safePlay(state.video);
              showHud('เล่น', 900, 'play');
              setTimeout(() => {
                if (state.video && state.video.paused && !state.destroyed) {
                  clickPlayerBigPlayButton();
                  safePlay(state.video);
                }
              }, 220);
            } else {
              state.video.pause();
              showHud('หยุด', 900, 'pause');
            }
          }
        }
        resetAutoHide();
      } else {
        state.lastTap = now;
        state.lastTapZone = state.doubleTapMode === 'seek_only' ? (relX < 0.5 ? 'left' : 'right') : zone;
        if (state.tapToggleTimer) clearTimeout(state.tapToggleTimer);
        state.tapToggleTimer = setTimeout(() => {
          state.tapToggleTimer = 0;
          if (overlay.classList.contains('hidden-ui')) {
            resetAutoHide();
          } else {
            collapseAllMenus();
            overlay.classList.add('hidden-ui');
            clearHide();
            cancelProgress();
          }
        }, state.doubleTapMode === 'off' ? 0 : CFG.doubleTapMs + 10);
      }
    });

    function promotePseudoToNativeFs() {
      if (!state.pseudoFullscreen || !origReqFS || !state.container || fullscreenElement()) return;
      if (window !== window.top) {
        anchorTopNativeFullscreen();
      }
      try {
        const res = origReqFS.call(state.container, { navigationUI: 'hide' });
        if (res && typeof res.then === 'function') {
          res.then(() => {
            state.pseudoFullscreen = false;
            state.container?.removeAttribute(CFG.pseudoAttr);
            document.documentElement.removeAttribute(CFG.lockScrollAttr);
            if (window === window.top) {
              setTopWindowIframeFullscreenLock(false);
              broadcastTopFsState(true);
            }
            tryLockLandscape(state.video);
            dbg('FS', 'Promoted Pseudo-FS -> True Native Fullscreen');
          }).catch(() => {});
        }
      } catch (_) {}
    }

    addEvent(absorber, 'touchend', () => {
      promotePseudoToNativeFs();
    }, { passive: true });

    addEvent(absorber, 'click', () => {
      promotePseudoToNativeFs();
    });

    addEvent(absorber, 'pointercancel', () => {
      activePointer = null;
      gestureMode = '';
      stopLongPressSpeed();
      state.lastTap = 0;
    });

    addEvent(absorber, 'lostpointercapture', () => {
      // Finger left the element / system took capture – must stop speed
      if (state.isLongPressSpeeding) {
        stopLongPressSpeed();
      }
      activePointer = null;
      gestureMode = '';
    });

    addEvent(window, 'blur', () => {
      activePointer = null;
      gestureMode = '';
      state.interactingSlider = false;
      stopLongPressSpeed();
    });

    addEvent(playBtn, 'click', e => {
      e.stopPropagation();
      if (state.video.paused) {
        clickPlayerBigPlayButton();
        safePlay(state.video);
        // Delayed second force (covers players that need a real click + async stream init)
        setTimeout(() => {
          if (state.video && state.video.paused && !state.destroyed) {
            clickPlayerBigPlayButton();
            safePlay(state.video);
          }
        }, 220);
      } else {
        state.video.pause();
      }
      resetAutoHide();
    });

    addEvent(backBtn, 'click', e => {
      e.stopPropagation();
      const step = state.doubleTapStep;
      safeSeek(state.video, state.video.currentTime - step, false);
      showHud(`-${step} วินาที`, 950, 'back');
      resetAutoHide();
    });

    addEvent(nextBtn, 'click', e => {
      e.stopPropagation();
      const step = state.doubleTapStep;
      safeSeek(state.video, state.video.currentTime + step, false);
      showHud(`+${step} วินาที`, 950, 'next');
      resetAutoHide();
    });

    /* --- Rocket Speed Slider Controls --- */
    function scheduleSpeedCollapse(delay = 2800) {
      clearSpeedHide();
      state.speedHideTimer = setTimeout(() => {
        state.speedHideTimer = 0;
        if (!state.interactingSlider) {
          speedWrap.classList.remove('expanded');
        }
      }, delay);
    }

    addEvent(speedInline, 'pointerdown', e => {
      e.stopPropagation();
      clearSpeedHide();
      clearHide();
    });

    addEvent(speedBtn, 'click', e => {
      e.stopPropagation();
      collapseSettingsPanel();
      const willExpand = !speedWrap.classList.contains('expanded');
      if (willExpand) {
        const curRate = Math.round(clamp(Number(state.video?.playbackRate) || 1, state.minSpeed, state.maxSpeed) * 100) / 100;
        speedInput.min = String(state.minSpeed);
        speedInput.max = String(state.maxSpeed);
        speedInput.value = String(curRate);
        speedVal.textContent = formatSpeed(curRate);
        updateSpeedTrackVisual();
        speedWrap.classList.add('expanded');
        scheduleSpeedCollapse(3200);
      } else {
        collapseSpeedSlider();
      }
      resetAutoHide();
    });

    addEvent(speedVal, 'click', e => {
      e.stopPropagation();
      const resetRate = clamp(1, state.minSpeed, state.maxSpeed);
      state.savedSpeed = resetRate;
      try { state.video.playbackRate = resetRate; } catch (_) {}
      speedInput.value = String(resetRate);
      speedVal.textContent = formatSpeed(resetRate);
      updateSpeedTrackVisual();
      showHud(`ความเร็ว ${formatSpeed(resetRate)}`, 900, 'rocket');
      scheduleSpeedCollapse(1600);
      resetAutoHide();
    });

    addEvent(speedInput, 'pointerdown', e => {
      e.stopPropagation();
      state.interactingSlider = true;
      clearSpeedHide();
      clearHide();
    });

    addEvent(speedInput, 'input', e => {
      e.stopPropagation();
      state.interactingSlider = true;
      clearSpeedHide();
      clearHide();
      const val = Math.round(clamp(Number(e.target.value), state.minSpeed, state.maxSpeed) * 100) / 100;
      if (!Number.isFinite(val)) return;
      state.savedSpeed = val;
      try {
        state.video.playbackRate = val;
      } catch (_) {}
      speedVal.textContent = formatSpeed(val);
      updateSpeedTrackVisual();
      showHud(`ความเร็ว ${formatSpeed(val)}`, 600, 'rocket');
    });

    const finishSpeedSelect = e => {
      e?.stopPropagation();
      state.interactingSlider = false;
      scheduleSpeedCollapse(1800);
      resetAutoHide();
    };

    addEvent(speedInput, 'change', finishSpeedSelect);
    addEvent(speedInput, 'pointerup', finishSpeedSelect);
    addEvent(speedInput, 'touchend', finishSpeedSelect);
    addEvent(speedInput, 'pointercancel', finishSpeedSelect);

    /* --- Dedicated Gear Settings Panel Controls --- */
    function scheduleSettingsCollapse(delay = 6500) {
      clearSettingsHide();
      state.settingsHideTimer = setTimeout(() => {
        state.settingsHideTimer = 0;
        settingsWrap.classList.remove('expanded');
        overlay.classList.remove('settings-open');
        resetAutoHide();
      }, delay);
    }

    addEvent(settingsPanel, 'pointerdown', e => {
      e.stopPropagation();
      clearSettingsHide();
      clearHide();
    });

    addEvent(settingsPanel, 'click', e => {
      e.stopPropagation();
      scheduleSettingsCollapse(6500);
    });

    addEvent(settingsBtn, 'click', e => {
      e.stopPropagation();
      collapseSpeedSlider();
      const willExpand = !settingsWrap.classList.contains('expanded');
      if (willExpand) {
        if (dtStepInput) dtStepInput.value = String(state.doubleTapStep);
        if (lpSpeedInput) lpSpeedInput.value = String(state.longPressSpeed);
        if (minSpeedInput) minSpeedInput.value = String(state.minSpeed);
        if (maxSpeedInput) maxSpeedInput.value = String(state.maxSpeed);
        if (autoFsOnPlayToggle) autoFsOnPlayToggle.checked = Boolean(state.autoFsOnPlayEnabled);
        if (autoNextToggle) autoNextToggle.checked = Boolean(state.autoNextEnabled);
        if (resumeToggle) resumeToggle.checked = Boolean(state.resumeEnabled);
        if (debugToggle) debugToggle.checked = Boolean(state.debugEnabled);
        if (dtModeSelect) dtModeSelect.value = state.doubleTapMode;
        settingsWrap.classList.add('expanded');
        overlay.classList.add('settings-open');
        clearHide();
        scheduleSettingsCollapse(6500);
      } else {
        collapseSettingsPanel();
        resetAutoHide();
      }
    });

    addEvent(autoFsOnPlayToggle, 'change', e => {
      e.stopPropagation();
      state.autoFsOnPlayEnabled = Boolean(e.target.checked);
      savePrefs();
      showHud(state.autoFsOnPlayEnabled ? 'เปิดขยายเต็มจออัตโนมัติเมื่อกด Play' : 'ปิดขยายเต็มจออัตโนมัติเมื่อกด Play', 1200, 'enter');
      scheduleSettingsCollapse(4500);
      resetAutoHide();
    });

    addEvent(autoNextToggle, 'change', e => {
      e.stopPropagation();
      state.autoNextEnabled = Boolean(e.target.checked);
      savePrefs();
      showHud(state.autoNextEnabled ? 'เปิดเล่น EP ถัดไปอัตโนมัติ' : 'ปิดเล่น EP ถัดไปอัตโนมัติ', 1100, 'nextEp');
      scheduleSettingsCollapse(4500);
      resetAutoHide();
    });

    addEvent(resumeToggle, 'change', e => {
      e.stopPropagation();
      state.resumeEnabled = Boolean(e.target.checked);
      savePrefs();
      showHud(state.resumeEnabled ? 'เปิดรับชมต่อจากที่ค้างไว้' : 'ปิดรับชมต่อจากที่ค้างไว้', 1100, 'history');
      scheduleSettingsCollapse(4500);
      resetAutoHide();
    });

    addEvent(debugToggle, 'change', e => {
      e.stopPropagation();
      state.debugEnabled = Boolean(e.target.checked);
      savePrefs();
      if (state.debugEnabled) {
        dbg('SYS', 'Visual Debug Console Activated');
      }
      renderDebugConsole();
      showHud(state.debugEnabled ? 'เปิด Debug Overlay' : 'ปิด Debug Overlay', 1000, 'settings');
      scheduleSettingsCollapse(4500);
      resetAutoHide();
    });

    function applyNewDoubleTapStep(val) {
      const nextStep = clamp(Math.round(Number(val) || 30), 1, 300);
      state.doubleTapStep = nextStep;
      CFG.seekStep = nextStep;
      if (dtStepInput) dtStepInput.value = String(nextStep);
      syncSeekBadges();
      savePrefs();
      showHud(`เลื่อนเวลา ±${nextStep} วินาที`, 900, 'next');
    }

    addEvent(dtStepDec, 'click', e => {
      e.stopPropagation();
      const stepDelta = state.doubleTapStep <= 5 ? 1 : 5;
      applyNewDoubleTapStep(state.doubleTapStep - stepDelta);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    addEvent(dtStepInc, 'click', e => {
      e.stopPropagation();
      const stepDelta = state.doubleTapStep < 5 ? 1 : 5;
      applyNewDoubleTapStep(state.doubleTapStep + stepDelta);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    addEvent(dtStepInput, 'change', e => {
      e.stopPropagation();
      applyNewDoubleTapStep(e.target.value);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    function applyNewLongPressSpeed(val) {
      const nextLp = Math.round(clamp(Number(val) || 2, 1, 16) * 100) / 100;
      state.longPressSpeed = nextLp;
      if (lpSpeedInput) lpSpeedInput.value = String(nextLp);
      savePrefs();
      showHud(`กดค้างเร่ง ${formatSpeed(nextLp)}`, 900, 'fastForward');
    }

    addEvent(lpSpeedDec, 'click', e => {
      e.stopPropagation();
      applyNewLongPressSpeed(state.longPressSpeed - 0.25);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    addEvent(lpSpeedInc, 'click', e => {
      e.stopPropagation();
      applyNewLongPressSpeed(state.longPressSpeed + 0.25);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    addEvent(lpSpeedInput, 'change', e => {
      e.stopPropagation();
      applyNewLongPressSpeed(e.target.value);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    function applyNewMinSpeed(val) {
      const maxAllowed = Math.min(2, state.maxSpeed - 0.25);
      const nextMin = Math.round(clamp(Number(val) || 0.5, 0.1, maxAllowed) * 100) / 100;
      state.minSpeed = nextMin;
      if (minSpeedInput) minSpeedInput.value = String(nextMin);
      speedInput.min = String(nextMin);
      if (state.video && state.video.playbackRate < nextMin) {
        try { state.video.playbackRate = nextMin; } catch (_) {}
        state.savedSpeed = nextMin;
      }
      const curRate = Math.round(clamp(Number(state.video?.playbackRate) || 1, nextMin, state.maxSpeed) * 100) / 100;
      speedInput.value = String(curRate);
      speedVal.textContent = formatSpeed(curRate);
      updateSpeedTrackVisual();
      savePrefs();
      showHud(`ความเร็วต่ำสุด ${formatSpeed(nextMin)}`, 900, 'rocket');
    }

    addEvent(minSpeedDec, 'click', e => {
      e.stopPropagation();
      applyNewMinSpeed(state.minSpeed - 0.1);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    addEvent(minSpeedInc, 'click', e => {
      e.stopPropagation();
      applyNewMinSpeed(state.minSpeed + 0.1);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    addEvent(minSpeedInput, 'change', e => {
      e.stopPropagation();
      applyNewMinSpeed(e.target.value);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    function applyNewMaxSpeed(val) {
      const minAllowed = Math.max(1.5, state.minSpeed + 0.25);
      const nextMax = Math.round(clamp(Number(val) || 3, minAllowed, 16) * 100) / 100;
      state.maxSpeed = nextMax;
      if (maxSpeedInput) maxSpeedInput.value = String(nextMax);
      speedInput.max = String(nextMax);
      if (state.video && state.video.playbackRate > nextMax) {
        try { state.video.playbackRate = nextMax; } catch (_) {}
        state.savedSpeed = nextMax;
      }
      const curRate = Math.round(clamp(Number(state.video?.playbackRate) || 1, state.minSpeed, nextMax) * 100) / 100;
      speedInput.value = String(curRate);
      speedVal.textContent = formatSpeed(curRate);
      updateSpeedTrackVisual();
      savePrefs();
      showHud(`ความเร็วสูงสุด ${formatSpeed(nextMax)}`, 900, 'rocket');
    }

    addEvent(maxSpeedDec, 'click', e => {
      e.stopPropagation();
      applyNewMaxSpeed(state.maxSpeed - 0.5);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    addEvent(maxSpeedInc, 'click', e => {
      e.stopPropagation();
      applyNewMaxSpeed(state.maxSpeed + 0.5);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    addEvent(maxSpeedInput, 'change', e => {
      e.stopPropagation();
      applyNewMaxSpeed(e.target.value);
      scheduleSettingsCollapse(5500);
      resetAutoHide();
    });

    addEvent(dtModeSelect, 'change', e => {
      e.stopPropagation();
      state.doubleTapMode = e.target.value;
      savePrefs();
      const found = DOUBLE_TAP_MODES.find(m => m.key === state.doubleTapMode);
      if (found) showHud(`โหมดแตะ 2 ครั้ง: ${found.label}`, 1100, 'settings');
      scheduleSettingsCollapse(4000);
      resetAutoHide();
    });

    addEvent(resetDefaultsBtn, 'click', e => {
      e.stopPropagation();
      state.doubleTapStep = 30;
      CFG.seekStep = 30;
      state.longPressSpeed = 16;
      state.minSpeed = 0.5;
      state.maxSpeed = 2;
      state.doubleTapMode = 'zone';
      state.autoFsOnPlayEnabled = true;
      state.autoNextEnabled = true;
      state.resumeEnabled = true;
      state.debugEnabled = false;
      state.savedSpeed = 1;
      try { state.video.playbackRate = 1; } catch (_) {}

      if (dtStepInput) dtStepInput.value = '30';
      if (lpSpeedInput) lpSpeedInput.value = '16';
      if (minSpeedInput) minSpeedInput.value = '0.5';
      if (maxSpeedInput) maxSpeedInput.value = '2';
      if (autoFsOnPlayToggle) autoFsOnPlayToggle.checked = true;
      if (autoNextToggle) autoNextToggle.checked = true;
      if (resumeToggle) resumeToggle.checked = true;
      if (debugToggle) debugToggle.checked = false;
      if (dtModeSelect) dtModeSelect.value = 'zone';
      speedInput.min = '0.5';
      speedInput.max = '2';
      speedInput.value = '1';
      speedVal.textContent = '1x';
      updateSpeedTrackVisual();
      renderDebugConsole();

      syncSeekBadges();
      savePrefs();
      showHud('คืนค่าเริ่มต้นทั้งหมดแล้ว', 1100, 'settings');
      scheduleSettingsCollapse(3500);
      resetAutoHide();
    });

    addEvent(aspectBtn, 'click', e => {
      e.stopPropagation();
      if (!state.video) return;
      state.aspectIndex = (state.aspectIndex + 1) % ASPECT_MODES.length;
      applyAspectMode(state.video, state.aspectIndex);
      savePrefs();
      showHud(ASPECT_MODES[state.aspectIndex].label, 950, 'aspect');
      resetAutoHide();
    });

    addEvent(lockBtn, 'click', e => {
      e.stopPropagation();
      collapseAllMenus();
      state.locked = !state.locked;
      if (state.locked) {
        lockBtn.innerHTML = icon('lock');
        overlay.classList.add('locked');
        overlay.classList.remove('hidden-ui');
        showHud('ล็อกหน้าจอแล้ว', 950, 'lock');
        clearHide();
        cancelProgress();
      } else {
        lockBtn.innerHTML = icon('unlock');
        overlay.classList.remove('locked');
        showHud('ปลดล็อกหน้าจอ', 950, 'unlock');
        resetAutoHide();
      }
    });

    addEvent(exitBtn, 'click', e => {
      e.stopPropagation();
      exitUniversalFullscreen();
    });

    let seekDone = false;
    addEvent(timeline, 'pointerdown', e => {
      e.stopPropagation();
      state.seeking = true;
      state.interactingSlider = true;
      seekDone = false;
      clearHide();
      cancelProgress();
    });

    addEvent(timeline, 'input', e => {
      e.stopPropagation();
      state.seeking = true;
      state.interactingSlider = true;
      seekDone = false;
      const pct = Number(timeline.value);
      styleRangeTrack(timeline, pct);
      if (Number.isFinite(state.video.duration) && state.video.duration > 0) {
        const targetSec = (pct / 100) * state.video.duration;
        currentLabel.textContent = formatTime(targetSec);
        const now = performance.now();
        if (now - state.lastScrubSeekTs >= 140 && !state.video.seeking) {
          state.lastScrubSeekTs = now;
          safeSeek(state.video, targetSec, true);
        }
      }
    });

    const finishSeek = e => {
      e?.stopPropagation();
      state.interactingSlider = false;
      if (seekDone) return;
      seekDone = true;
      if (Number.isFinite(state.video.duration) && state.video.duration > 0) {
        safeSeek(state.video, (Number(timeline.value) / 100) * state.video.duration, false);
      }
      state.seeking = false;
      state.refs.lastPercent = -1;
      state.refs.lastSecond = -1;
      queueProgress(true);
      resetAutoHide();
    };

    addEvent(timeline, 'change', finishSeek);
    addEvent(timeline, 'pointerup', finishSeek);
    addEvent(timeline, 'touchend', finishSeek);
    addEvent(timeline, 'pointercancel', finishSeek);

    addEvent(brightness, 'pointerdown', e => {
      e.stopPropagation();
      state.interactingSlider = true;
      clearHide();
    });

    addEvent(brightness, 'input', e => {
      e.stopPropagation();
      state.interactingSlider = true;
      clearHide();
      const val = clamp(Number(e.target.value), 0.25, 1.75);
      if (!Number.isFinite(val)) return;
      applyBrightness(state.video, val);
      showHud(`ความสว่าง ${Math.round(val * 100)}%`, 650, 'sun');
    });

    const finishBrightSlide = e => {
      e?.stopPropagation();
      state.interactingSlider = false;
      savePrefs();
      resetAutoHide();
    };

    addEvent(brightness, 'change', finishBrightSlide);
    addEvent(brightness, 'pointerup', finishBrightSlide);
    addEvent(brightness, 'touchend', finishBrightSlide);
    addEvent(brightness, 'pointercancel', finishBrightSlide);

    addEvent(volume, 'pointerdown', e => {
      e.stopPropagation();
      state.interactingSlider = true;
      clearHide();
    });

    addEvent(volume, 'input', e => {
      e.stopPropagation();
      state.interactingSlider = true;
      clearHide();
      const val = clamp(Number(e.target.value), 0, 1);
      if (!Number.isFinite(val)) return;
      setNativeVolume(state.video, val);
      updateVolumeIcon();
      showHud(`ระดับเสียง ${Math.round(val * 100)}%`, 650, val <= 0 ? 'mute' : 'volume');
    });

    const finishVolSlide = e => {
      e?.stopPropagation();
      state.interactingSlider = false;
      resetAutoHide();
    };

    addEvent(volume, 'change', finishVolSlide);
    addEvent(volume, 'pointerup', finishVolSlide);
    addEvent(volume, 'touchend', finishVolSlide);
    addEvent(volume, 'pointercancel', finishVolSlide);

    addEvent(muteBtn, 'click', e => {
      e.stopPropagation();
      try {
        const currentEffective = state.video.muted ? 0 : state.video.volume;
        if (currentEffective > 0) {
          state.lastVolume = currentEffective;
          setNativeVolume(state.video, 0);
          volume.value = '0';
          showHud('ปิดเสียง', 900, 'mute');
        } else {
          const restore = state.lastVolume > 0 ? state.lastVolume : 1;
          setNativeVolume(state.video, restore);
          volume.value = String(restore);
          showHud(`เสียง ${Math.round(restore * 100)}%`, 900, 'volume');
        }
      } catch (_) {}
      updateVolumeIcon();
      resetAutoHide();
    });

    /* --- Hardware Keyboard & Tablet Shortcuts --- */
    addEvent(document, 'keydown', e => {
      if (!state.overlay || !state.video) return;
      const path = e.composedPath ? e.composedPath() : [e.target];
      const realTarget = path[0] || e.target;
      const tag = realTarget?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || realTarget?.isContentEditable) return;

      if (e.code === 'Space' || e.code === 'KeyK') {
        if (state.locked) return;
        e.preventDefault();
        e.stopPropagation();
        if (state.video.paused) safePlay(state.video);
        else state.video.pause();
        resetAutoHide();
      } else if (e.code === 'ArrowRight' && !state.locked) {
        e.preventDefault();
        e.stopPropagation();
        const step = state.doubleTapStep;
        safeSeek(state.video, state.video.currentTime + step, false);
        showHud(`+${step} วินาที`, 950, 'next');
        resetAutoHide();
      } else if (e.code === 'ArrowLeft' && !state.locked) {
        e.preventDefault();
        e.stopPropagation();
        const step = state.doubleTapStep;
        safeSeek(state.video, state.video.currentTime - step, false);
        showHud(`-${step} วินาที`, 950, 'back');
        resetAutoHide();
      } else if (e.code === 'KeyN' && !state.locked) {
        e.preventDefault();
        e.stopPropagation();
        triggerSeamlessNextEpisode(true);
        resetAutoHide();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        lockBtn.click();
      } else if (e.code === 'Escape' && state.pseudoFullscreen) {
        e.preventDefault();
        exitUniversalFullscreen();
      }
    }, { capture: true });

    /* --- Scoped Video & Container Observers + Safe Ad Skipper --- */
    startAdWatcher(); // V26: conditional, longer interval

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
          if (!state.isLongPressSpeeding && state.savedSpeed && v.playbackRate !== state.savedSpeed) {
            try { v.playbackRate = state.savedSpeed; } catch (_) {}
          }
        }
        updatePlayIcon();
        requestWakeLock();
        queueProgress(true);
      }, false, vCtrl);
      addEvent(v, 'waiting', () => {
        if (!v.paused && !state.isLongPressSpeeding) overlay.classList.add('buffering');
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

        if (state.autoNextEnabled) {
          triggerSeamlessNextEpisode(false);
        } else {
          savePlaybackPosition(v, true);
        }
      }, false, vCtrl);
      addEvent(v, 'error', () => {
        const errCode = v.error ? v.error.code : 'unknown';
        dbg('VIDEO', `MediaError code: ${errCode}`);
        if (errCode === 3 || errCode === 2) {
          attemptMediaErrorRecovery(v);
        }
      }, false, vCtrl);
      addEvent(v, 'ratechange', () => {
        if (state.isLongPressSpeeding || isCurrentlyPlayingPreRollAd(v)) return;
        const rawRate = Number(v.playbackRate) || 1;
        // Safety net: player may ignore our restore and leave an extreme rate after long-press
        if (rawRate > state.maxSpeed + 0.1 || (rawRate > 3.5 && !state.isLongPressSpeeding)) {
          const restore = clamp(Number(state.preLongPressSpeed) || state.savedSpeed || 1, state.minSpeed, state.maxSpeed);
          try { v.playbackRate = restore; } catch (_) {}
          return;
        }
        const actualRate = Math.round(clamp(rawRate, state.minSpeed, state.maxSpeed) * 100) / 100;
        if (state.refs?.speedInput && state.refs?.speedVal) {
          state.refs.speedInput.value = String(actualRate);
          state.refs.speedVal.textContent = formatSpeed(actualRate);
          updateSpeedTrackVisual();
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
          !state.isLongPressSpeeding &&
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
            if (state.savedSpeed && state.savedSpeed !== 1 && !state.isLongPressSpeeding) {
              v.playbackRate = state.savedSpeed;
            }
          } catch (_) {}
          tryRestorePlaybackPosition(v);
          if (state.expectingSeamlessEpisode) {
            safePlay(v);
            clickPlayerBigPlayButton();
            if (!state.overlay) {
              setTopWindowIframeFullscreenLock(true);
              enterUniversalFullscreen(v);
            }
            // Clear only after we actually start playing
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
        if (state.isLongPressSpeeding !== 'rewind') {
          state.seeking = false;
          savePlaybackPosition(v, true);
        }
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
          dbg('VIDEO', 'Re-bound to new video element inside fullscreen container');
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
          if (state.expectingSeamlessEpisode) {
            safePlay(replacement);
          }
          updatePlayIcon();
          queueProgress(true);
        }
      });
    });

    try {
      state.containerObserver.observe(container, {
        childList: true,
        subtree: true
      });
      container.appendChild(shadowHost);
    } catch (_) {
      destroyController();
      return;
    }

    updatePlayIcon();
    updateVolumeIcon();
    updateProgress(true);
    resetAutoHide();
  }

  /* =========================================================
     9. GLOBAL FULLSCREEN, VIEWPORT ROTATION & MEDIA LISTENERS
  ========================================================= */

  function handleFullscreenChange() {
    if (state.destroyed) return;
    const fs = fullscreenElement();

    if (fs) {
      state.isEnteringFullscreen = false;
      if (window === window.top) {
        broadcastTopFsState(true);
        // ถ้า fs เป็น Top Player Anchor ของหน้าหลัก (หุ้ม iframe) ให้จัดสไตล์เต็มจอและแจ้ง iframe
        if (fs.hasAttribute(CFG.parentWrapFsAttr) || fs.hasAttribute('data-tmv260-top-anchor')) {
          setTopWindowIframeFullscreenLock(true);
          return;
        }
      }

      const video = isVideo(fs) ? fs : (bestVideo(fs) || state.lastActiveVideo);
      if (!video || isDisqualifiedVideo(video)) return;

      setTopWindowIframeFullscreenLock(false);
      tryLockLandscape(video);
      const container = fs === video ? ensureSafeContainer(video) : fs;
      if (container && container !== video) {
        createOverlay(video, container, false);
      }
      return;
    }

    if (window === window.top) {
      broadcastTopFsState(false);
    }

    // หากอยู่ระหว่างขั้นตอนเปลี่ยนตอนถัดไป (เงื่อนไข 3) ให้ล้างเฉพาะ UI เต็มหน้าจอโดยคงสถานะเปลี่ยนตอนไว้
    if (state.isTransitioningNextEp) {
      setTopWindowIframeFullscreenLock(false);
      tryUnlockOrientation();
      releaseWakeLock();
      destroyController();
      return;
    }

    // เงื่อนไข (2): เมื่อกดออกจากโหมดเต็มหน้าจอ หรือ ถูกบังคับออก ด้วยเหตุผลอื่นๆ
    // ล้างฟังก์ชันโหมดเต็มหน้าจอทั้งหมด ไม่ต้องพยายามบังคับเปิดเต็มจอ หรือพยายามเปิดซ้ำ นอกจากเข้าเงื่อนไข (1.)
    dbg('FS-EXIT', 'Exited fullscreen -> Full cleanup; waiting for Condition (1) Play');
    cleanupFullscreenSession(state.video || state.lastActiveVideo);
  }

  function isEligibleForAutoFsOnPlay(video) {
    if (!state.autoFsOnPlayEnabled) return false;
    if (!video || !video.isConnected || isDisqualifiedVideo(video)) return false;
    if (document.hidden || fullscreenElement() || state.pseudoFullscreen || state.overlay) return false;

    const now = Date.now();
    // ป้องกันการเด้งกลับเข้า Fullscreen ทันทีหลังออกจากโหมดเต็มหน้าจอ (เงื่อนไข 2)
    if (now - state.manualExitAt < 900) return false;
    if (state.suppressAutoFsUntilPlay && state.manualExitVideo === video) return false;

    // ตรวจสอบขนาดวิดีโอหลัก (ป้องกันวิดีโอโฆษณา/แบนเนอร์ขนาดจิ๋ว)
    const vArea = area(video);
    const winArea = window.innerWidth * window.innerHeight;
    const minArea = window !== window.top ? 10000 : 25000;
    if (vArea < minArea || (winArea > 0 && vArea / winArea < 0.08)) return false;

    // ตรวจสอบว่าเป็นการกด Play จริง หรือต่อเนื่องจากการเปลี่ยนตอนอัตโนมัติ (เงื่อนไข 3)
    const hasRecentGesture =
      (now - state.lastUserGestureTs) < 10000 ||
      Boolean(navigator.userActivation?.isActive) ||
      Boolean(state.armedFromAutoNext);
    if (video.muted && !hasRecentGesture) return false;

    return true;
  }

  function onMediaPause(e) {
    if (state.destroyed) return;
    const target = e.target;
    if (!isVideo(target)) return;
    // เมื่อวิดีโอหยุดเล่น ให้ยกเลิกการระงับและล้างคิวรอขยายเต็มจอ เพื่อให้การกด Play ครั้งถัดไปเริ่มเงื่อนไข (1.) ได้สมบูรณ์
    if (state.suppressAutoFsUntilPlay && state.manualExitVideo === target) {
      state.suppressAutoFsUntilPlay = false;
      state.manualExitAt = 0;
    }
    if (state.pendingPlayAutoFsVideo === target) {
      state.pendingPlayAutoFsVideo = null;
      state.pendingPlayAutoFsTs = 0;
    }
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

    const fs = fullscreenElement();
    if (fs) {
      if (!state.overlay || state.video !== target) {
        const container = fs === target ? ensureSafeContainer(target) : fs;
        if (container && container !== target) {
          createOverlay(target, container, false);
        }
      }
      return;
    }

    if (state.pseudoFullscreen && state.overlay && state.video !== target) {
      const container = ensureSafeContainer(target);
      if (container) {
        createOverlay(target, container, true);
      }
      return;
    }

    // ระหว่างกำลังเปลี่ยนตอนบนหน้าเว็บปกติ (เงื่อนไข 3) ให้ตัวเช็คความพร้อมจัดการตามลำดับขั้นตอน
    if (state.isTransitioningNextEp) {
      return;
    }

    // เงื่อนไข (1): กดปุ่ม Play ในการเล่นวีดีโอ -> ขยาย Native Fullscreen ทันทีขณะยังมีสิทธิ์ User Activation (ป้องกัน Firefox Android ตัดสิทธิ์ระหว่างรอโหลดสตรีม)
    if (e.type === 'play' && !state.pseudoFullscreen && !state.overlay) {
      if (isEligibleForAutoFsOnPlay(target)) {
        state.manualExitVideo = null;
        state.suppressAutoFsUntilPlay = false;
        state.armedFromAutoNext = false;

        const hasLiveActivation = Boolean(navigator.userActivation?.isActive);
        if (isVideoTrulyReadyForFullscreen(target) || hasLiveActivation) {
          state.pendingPlayAutoFsVideo = null;
          state.pendingPlayAutoFsTs = 0;
          dbg('AUTO-FS', `Play pressed (RS:${target.readyState}, active=${hasLiveActivation}) -> Expanding Native Fullscreen`);
          enterUniversalFullscreen(target);
        } else {
          // กรณีไม่มี User Activation สด ให้รอจนกว่าสตรีมและเฟรมภาพจะพร้อมเริ่มเล่นจริง
          state.pendingPlayAutoFsVideo = target;
          state.pendingPlayAutoFsTs = Date.now();
          dbg('AUTO-FS', `Play pressed (RS:${target.readyState}) -> Waiting for video readiness before Native Fullscreen`);
        }
      }
      return;
    }

    if (
      (e.type === 'loadeddata' || e.type === 'canplay' || e.type === 'playing') &&
      !state.pseudoFullscreen &&
      !state.overlay &&
      !target.paused
    ) {
      const isPendingReady =
        state.pendingPlayAutoFsVideo === target &&
        (Date.now() - state.pendingPlayAutoFsTs) < 15000;

      if ((isPendingReady || (e.type === 'playing' && isEligibleForAutoFsOnPlay(target))) && isVideoTrulyReadyForFullscreen(target)) {
        state.pendingPlayAutoFsVideo = null;
        state.pendingPlayAutoFsTs = 0;
        state.manualExitVideo = null;
        state.suppressAutoFsUntilPlay = false;
        state.armedFromAutoNext = false;
        dbg('AUTO-FS', `Video ready & playing (${e.type}, RS:${target.readyState}) -> Expanding Native Fullscreen`);
        enterUniversalFullscreen(target);
      }
    }
  }

  function recordUserGesture(e) {
    state.lastUserGestureTs = Date.now();
    // หากผู้ใช้กด Play เองบนหน้าเว็บหลังเคยออกจาก Fullscreen ให้ปลดล็อก suppressAutoFsUntilPlay ทันที
    if (state.suppressAutoFsUntilPlay && e?.target instanceof Element) {
      const path = e.composedPath ? e.composedPath() : [e.target];
      if (!path.some(el => el?.id === CFG.shadowHostId)) {
        state.suppressAutoFsUntilPlay = false;
        state.manualExitAt = 0;
      }
    }
  }

  function boot() {
    loadPrefs();
    patchFullscreenAPI();
    setupEpisodeClickTracker();

    document.addEventListener('fullscreenchange', handleFullscreenChange, true);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange, true);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange, true);

    document.addEventListener('play', onMediaActivity, true);
    document.addEventListener('playing', onMediaActivity, true);
    document.addEventListener('canplay', onMediaActivity, true);
    document.addEventListener('loadeddata', onMediaActivity, true);
    document.addEventListener('loadedmetadata', onMediaActivity, true);
    document.addEventListener('pause', onMediaPause, true);
    document.addEventListener('pointerdown', recordUserGesture, { capture: true, passive: true });
    document.addEventListener('click', recordUserGesture, { capture: true, passive: true });
    document.addEventListener('keydown', recordUserGesture, { capture: true, passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (state.video) savePlaybackPosition(state.video, true);
        flushResumeCacheToDisk();
        clearHide();
        cancelProgress();
        releaseWakeLock();
        stopAdWatcher();
      } else if (state.overlay) {
        if (state.video && !state.video.paused) requestWakeLock();
        startAdWatcher();
        resetAutoHide();
      }
    });

    window.addEventListener('pagehide', () => {
      state.destroyed = true;
      if (state.video) savePlaybackPosition(state.video, true);
      flushResumeCacheToDisk();
      stopAdWatcher();
      if (state.autoPlayPollTimer) clearInterval(state.autoPlayPollTimer);
      if (state.epScrollTimer) clearTimeout(state.epScrollTimer);
      destroyController();
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
