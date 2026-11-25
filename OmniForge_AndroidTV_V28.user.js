// ==UserScript==
// @name         OmniForge Android TV V28.0.0 (D-Pad Remote Edition)
// @namespace    Violentmonkey Scripts
// @version      28.0.0
// @description  Android TV 14 D-Pad Remote Video Controller (Up/Down/Left/Right/OK/Back), Instant Remote Fullscreen Trigger, Spatial Focus Navigation, Thai Multi-EP Engine & Final-Episode Guard.
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

  const KEY = '__TM_VIDEO_CONTROLLER_TV_V2800__';
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

  const CFG = {
    schemaVersion: 280,
    hideDelay: 4500,
    seekStep: 30,
    timelineScrubSec: 15,
    okDoubleMs: 380,
    okLongPressMs: 550,
    maxDepth: 7,
    minMainVideoDurationSec: 240,
    bestVideoCacheMs: 320,
    adWatchIntervalMs: 1100,
    ajaxTimeoutMs: 4200,
    shadowHostId: '__tmv280_host',
    overlayId: '__tmv280_overlay',
    launcherHostId: '__tmv280_launcher',
    hostStyleId: '__tmv280_host_style',
    hostAttr: 'data-tmv280-host',
    pseudoAttr: 'data-tmv280-pseudo',
    parentIframeFsAttr: 'data-tmv280-iframe-fs',
    parentWrapFsAttr: 'data-tmv280-wrap-fs',
    videoAttr: 'data-tmv280-video',
    fitAttr: 'data-tmv280-fit',
    lockScrollAttr: 'data-tmv280-noscroll',
    titleType: '__TMV280_TITLE__',
    prefKey: '__tmv280_tv_prefs__',
    resumeKey: '__tmv280_tv_resume__',
    epScrollKey: '__tmv280_tv_ep_scroll__',
    autoFsBridgeKey: '__tmv280_tv_autofs_bridge__'
  };

  const ASPECT_MODES = [
    { key: 'contain', label: 'พอดีจอ 16:9 (Contain)' },
    { key: 'cover', label: 'เต็มจอตัดขอบ (Cover)' },
    { key: 'fill', label: 'ยืดเต็มจอ (Stretch)' }
  ];

  const SVG = {
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" stroke="none"/>',
    back: '<path d="M12.5 3a9 9 0 1 0 8.7 6.6M12.5 3V7M12.5 3L8.5 3"/><text x="12" y="15.5" font-size="7.5" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none" class="v280-seek-txt">30</text>',
    next: '<path d="M11.5 3a9 9 0 1 1-8.7 6.6M11.5 3V7M11.5 3L15.5 3"/><text x="12" y="15.5" font-size="7.5" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none" class="v280-seek-txt">30</text>',
    nextEp: '<polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    endEp: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.2l2.3 2.3 4.7-4.8"/>',
    aspect: '<rect x="2.5" y="2.5" width="19" height="19" rx="5"/><path d="M7.5 16.5 16.5 7.5M11.5 7.5h5v5M12.5 16.5h-5v-5"/>',
    rocket: '<path d="M3.6 16.2A9.5 9.5 0 0 1 12 2.5"/><path d="M21.5 12a9.5 9.5 0 0 1-15.9 7l4-4"/><path d="M10.2 11.2 7 10.5 8.5 8h3.7c2.8-2.8 5.2-3.3 7-3.2.1 1.8-.4 4.2-3.2 7v3.7l-2.5 1.5-.7-3.2"/>',
    fastForward: '<polygon points="13 19 22 12 13 5 13 19" fill="currentColor" stroke="none"/><polygon points="2 19 11 12 2 5 2 19" fill="currentColor" stroke="none"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M10.91 2.46L13.09 2.46L13.61 4.98L15.65 5.83L17.98 4.49L19.51 6.02L18.17 8.35L19.02 10.39L21.54 10.91L21.54 13.09L19.02 13.61L18.17 15.65L19.51 17.98L17.98 19.51L15.65 18.17L13.61 19.02L13.09 21.54L10.91 21.54L10.39 19.02L8.35 18.17L6.02 19.51L4.49 17.98L5.83 15.65L4.98 13.61L2.46 13.09L2.46 10.91L4.98 10.39L5.83 8.35L4.49 6.02L6.02 4.49L8.35 5.83L10.39 4.98Z"/>',
    exit: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>',
    enter: '<path d="M8 3H5a2 2 0 0 0-2 2v3M18 3h3a2 2 0 0 1 2 2v3M18 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
    tvRemote: '<rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="9" r="2.3"/><path d="M12 15v3M10.5 16.5h3"/>'
  };

  const RX = {
    whitespace: /\s+/g,
    siteSuffix: /\s*[-|–—]\s*(YouTube|Netflix|Facebook|EPORNER|XVIDEOS(\.COM)?|PORNHUB(\.COM)?|Bilibili|Twitch|320HD\w*|123-HD\w*|037HD\w*|24-HD\w*|Nung2HD\w*|Bugaboo\w*|WeTV\w*|iQIYI\w*|Viu\w*|ANIME-HIT\w*|HIT-ANIME\w*|ANIME-DEE\w*|Series-DD\w*|Kseries\w*|Series24\w*|Nungsub\w*|Fairyanime\w*|Anime-Sugoi\w*|Animekimi\w*|24-Series\w*|MySeriesHD\w*).*$/i,
    thaiSuffix: /\s+(ดูหนังออนไลน์|ดูซีรี่ย์ฟรี|ดูซีรีย์ฟรี|ดูซีรี่ย์ออนไลน์|ดูหนังฟรี|ซับไทย|พากย์ไทย|เต็มเรื่อง)\s*[a-zA-Z0-9.-]*$/i,
    thaiPrefix: /^(?:ดูหนังออนไลน์|ดูหนังฟรี|ดูหนัง|ดูซีรี่ย์ออนไลน์|ดูซีรีย์ออนไลน์|ดูซีรีส์ออนไลน์|ดูซีรี่ย์|ดูซีรีย์|ดูซีรีส์|ดูการ์ตูน|ดูอนิเมะ|ดูละคร)(?:จีน|เกาหลี|ฝรั่ง|ญี่ปุ่น|ไทย|เอเชีย|พากย์ไทย|ซับไทย)?(?:\s*[-–—:]\s*|\s+)/i,
    epSuffix: /\s*(?:[-–—|:•]\s*)?(?:Season\s*\d+\s*)?(?:EP\.?|Episode|ตอน(?:ที่)?|บทที่|ช่วงที่|เบรก)\s*\d+(?:\.\d+)?(?:\s*[-–—~ถึง/]\s*\d+)?(?:\s*\(?จบ\)?|\s*END|\s*ตอนสุดท้าย)?.*$/i,
    epRange: /(?:EP\.?|Episode|ตอน(?:ที่)?|บทที่)\s*0*(\d{1,4})\s*[-–—~ถึง]\s*0*(\d{1,4})/i,
    epFraction: /(?:EP\.?|Episode|ตอน(?:ที่)?|บทที่)\s*0*(\d{1,4})(?:\.\d+)?\s*\/\s*0*(\d{1,4})/i,
    epExplicit: /(?:EP\.?|Episode|E|ตอน(?:ที่)?|บทที่|ซีซั่นที่\s*\d+\s*ตอน(?:ที่)?)\s*[-:#.]?\s*0*(\d{1,4}(?:\.\d+)?)(?!\s*[-–—~ถึง]\s*\d|\d)/i,
    epBracket: /[\[(]\s*0*(\d{1,4}(?:\.\d+)?)\s*[\])]/,
    epNumOnly: /^(?:[-•#]\s*)?0*(\d{1,4}(?:\.\d+)?)(?:\s*(?:\(?จบ\)?|END|ตอนสุดท้าย|ซับไทย|พากย์ไทย|Sub|Thai|HD|Full))?$/i,
    epUrl: /(?:[-_/]|^)(?:ep|episode|e|ton|part|chap)[-_]?0*(\d{1,4})(?:[-_/.]|$)/i,
    epUrlQuery: /[?&](?:ep|episode|part|id_ep|chap)=0*(\d{1,4})(?:&|$)/i,
    resolutionGuard: /^(?:240|360|480|720|1080|1440|2160|4320)p?$/i,
    serverGuard: /(?:server|สำรอง|ตัวเล่น|player|vip|หลัก|พากย์|ซับ|ลิงก์|link|source)\s*\d*$/i,
    finalEpMarker: /(?:\(\s*จบ\s*\)|ตอนสุดท้าย|ตอนจบ|\bEND\b|\bFINALE\b|\bFINAL\s*EP\b)/i,
    nextKeyword: /^(?:next\s*ep|next\s*episode|ตอนถัดไป|ตอนต่อไป|ตอนต่อไป\s*»|»\s*ตอนถัดไป|ถัดไป|ตอนหน้า|ep\s*ถัดไป)$/i,
    prevKeyword: /^(?:prev\s*ep|prev\s*episode|ตอนก่อนหน้า|ตอนที่แล้ว|ย้อนกลับ|«\s*ตอนก่อนหน้า)$/i,
    adBannerHint: /(?:banner|ads|ad-|sponsor|vip168|ufa|bet|casino|slot|baccarat|game88|โฆษณา|ป้ายโฆษณา)/i
  };

  const EP_CONTAINER_SEL = '[class*="ep"], [id*="ep"], [class*="episode"], [id*="episode"], [class*="list"], [class*="playlist"], [class*="season"], .les-content, .episodelist, .halim-list-eps, .b-list, .list-eps, .episode, [class*="episode-list"], [class*="ep-list"], .cyber-ep-grid, .cyber-ep-wrapper';
  const SERVER_CONTAINER_SEL = '[class*="server"], [id*="server"], [class*="source"], [id*="source"], .player-options, .halim-server, .dooplay_player_option';
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
    launcherHost: null,
    launcherBtn: null,
    abort: null,
    videoAbort: null,
    videoObserver: null,
    containerObserver: null,
    observerRaf: 0,
    hideTimer: 0,
    speedHideTimer: 0,
    settingsHideTimer: 0,
    hudTimer: 0,
    epScrollTimer: 0,
    autoPlayPollTimer: 0,
    adWatchTimer: 0,
    lastScrubSeekTs: 0,
    progressFrame: 0,
    wakeLock: null,
    seeking: false,
    destroyed: false,
    pseudoFullscreen: false,
    originalVideo: null,
    originalPosition: null,
    changedPosition: false,
    createdWrapper: null,
    aspectIndex: 0,
    savedSpeed: 1,
    minSpeed: 0.5,
    maxSpeed: 2.5,
    seekStep: 30,
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
    lastEndNoticeTs: 0,
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
    bestVideoCache: null,
    bestVideoCacheTs: 0,
    bestVideoCacheRoot: null,
    adWatchActive: false,
    lastProgressUpdateTs: 0,
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
    enteringFullscreenTs: 0,
    pendingIframeManualNext: false,
    // Android TV D-Pad Spatial Navigation State
    focusedId: 'v280-play',
    lastOkTapTs: 0,
    okHoldTimer: 0,
    okHoldTriggered: false,
    historySentinelPushed: false,
    ignoreNextPopstate: false
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
     0. ANDROID TV REMOTE KEY NORMALIZER (XIAOMI MiTV / ANDROID 14)
     ========================================================= */

  function normalizeTVKey(e) {
    if (!e) return '';
    const k = e.key || '';
    const c = e.code || '';
    const kc = Number(e.keyCode || e.which || 0);

    if (k === 'ArrowUp' || c === 'ArrowUp' || kc === 38 || kc === 19 || k === 'DPAD_UP') return 'UP';
    if (k === 'ArrowDown' || c === 'ArrowDown' || kc === 40 || kc === 20 || k === 'DPAD_DOWN') return 'DOWN';
    if (k === 'ArrowLeft' || c === 'ArrowLeft' || kc === 37 || kc === 21 || k === 'DPAD_LEFT') return 'LEFT';
    if (k === 'ArrowRight' || c === 'ArrowRight' || kc === 39 || kc === 22 || k === 'DPAD_RIGHT') return 'RIGHT';

    // Xiaomi MiTV Android 14 ส่ง key="Enter", code="", keyCode=13
    if (k === 'Enter' || k === 'NumpadEnter' || k === 'DPAD_CENTER' || k === 'Select' || c === 'Enter' || kc === 13 || kc === 23) {
      return 'OK';
    }

    // ปุ่ม Back บนรีโมท Android TV (Escape=27, Backspace=8, BrowserBack=166, GoBack=4)
    if (k === 'Escape' || k === 'Backspace' || k === 'BrowserBack' || k === 'GoBack' || kc === 27 || kc === 8 || kc === 166 || kc === 4) {
      return 'BACK';
    }

    // ปุ่มฟังก์ชันพิเศษบนรีโมท (Menu, Info, MediaPlayPause, Color buttons, F)
    if (k === 'ContextMenu' || k === 'Menu' || k === 'Info' || k === 'MediaPlayPause' || k === 'ColorF0Red' || k === 'ColorF1Green' || c === 'KeyF' || kc === 93 || kc === 82 || kc === 179 || kc === 70) {
      return 'FUNC_FS';
    }

    if (k === 'MediaFastForward' || kc === 228) return 'FF';
    if (k === 'MediaRewind' || kc === 227) return 'RW';
    if (k === 'MediaTrackNext' || kc === 176) return 'NEXT_EP';

    return '';
  }

  function isEditableTarget(e) {
    const path = e.composedPath ? e.composedPath() : [e.target];
    const el = path[0] || e.target;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'TEXTAREA' || el.isContentEditable) return true;
    if (tag === 'INPUT') {
      const t = (el.type || '').toLowerCase();
      return t === 'text' || t === 'search' || t === 'password' || t === 'url' || t === 'email';
    }
    return false;
  }

  /* =========================================================
     1. DEBUG CONSOLE & HYBRID STORAGE
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
    const rs = v ? `RS:${v.readyState}` : '';
    if (headTxt) {
      headTxt.textContent = `OMNIFORGE TV V28 (${res} | ${rate} | ${rs})`;
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
      if (typeof data.minSpeed === 'number' && Number.isFinite(data.minSpeed)) {
        state.minSpeed = clamp(data.minSpeed, 0.25, 1.5);
      }
      if (typeof data.maxSpeed === 'number' && Number.isFinite(data.maxSpeed)) {
        state.maxSpeed = clamp(data.maxSpeed, 1.5, 8);
      }
      if (state.minSpeed >= state.maxSpeed) {
        state.minSpeed = 0.5;
        state.maxSpeed = 2.5;
      }
      if (typeof data.seekStep === 'number' && Number.isFinite(data.seekStep)) {
        state.seekStep = clamp(Math.round(data.seekStep), 5, 300);
        CFG.seekStep = state.seekStep;
      }
      if (typeof data.resumeEnabled === 'boolean') state.resumeEnabled = data.resumeEnabled;
      if (typeof data.autoNextEnabled === 'boolean') state.autoNextEnabled = data.autoNextEnabled;
      if (typeof data.autoFsOnPlayEnabled === 'boolean') state.autoFsOnPlayEnabled = data.autoFsOnPlayEnabled;
      if (typeof data.debugEnabled === 'boolean') state.debugEnabled = data.debugEnabled;

      if (data._schema !== CFG.schemaVersion) savePrefs();
    } catch (_) {}
  }

  function savePrefs() {
    try {
      writeStorageJSON(CFG.prefKey, {
        _schema: CFG.schemaVersion,
        aspectIndex: state.aspectIndex,
        minSpeed: state.minSpeed,
        maxSpeed: state.maxSpeed,
        seekStep: state.seekStep,
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
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /* =========================================================
     2. THAI MULTI-EPISODE ENGINE & STRICT FINAL-EPISODE GUARD
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

  function isServerSwitcherElement(el) {
    if (!el || !(el instanceof Element)) return false;
    const txt = (el.textContent || '').replace(RX.whitespace, ' ').trim();
    if (RX.serverGuard.test(txt) && !/(?:EP\.?|Episode|ตอน(?:ที่)?)/i.test(txt)) return true;
    const serverWrap = el.closest(SERVER_CONTAINER_SEL);
    if (serverWrap && !el.closest(EP_CONTAINER_SEL)) {
      if (!/(?:EP\.?|Episode|ตอน(?:ที่)?)/i.test(txt)) return true;
    }
    return false;
  }

  function extractEpFromElement(el) {
    if (!el || !(el instanceof Element)) return '';
    if (isServerSwitcherElement(el)) return '';

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
          if (el.children.length > 6 || isServerSwitcherElement(el)) continue;
          const ep = extractEpFromElement(el);
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
      const cleanedH1 = cleanTitle((h1El && h1El.textContent) || '');
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
      el.innerHTML = `<span class="v280-ep">${escapeHtml(ep)}</span><span class="v280-title-main">${escapeHtml(base)}</span>`;
    } else {
      el.textContent = base || String(fullOrBase || '');
    }
  }

  function extractFullTitleFromDoc(doc) {
    const base = extractBaseTitleFromDoc(doc);
    const detected = detectActiveEpFromDOM(doc);
    if (detected) state.currentEp = detected;
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
      const detectedEp = detectActiveEpFromDOM(document);
      if (detectedEp) state.currentEp = detectedEp;
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

  /* --- Top-Level Cross-Frame Fullscreen Anchor --- */

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
        if (existing && existing.hasAttribute('data-tmv280-top-anchor')) {
          wrap = existing;
        } else {
          const anchor = document.createElement('div');
          anchor.setAttribute('data-tmv280-top-anchor', '1');
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
    broadcastToAllFrames({ type: 'tmv280_top_fs_state', active: Boolean(active) });
  }

  function anchorTopNativeFullscreen() {
    if (window !== window.top) {
      try { window.top.postMessage({ type: 'tmv280_top_anchor_fs' }, '*'); } catch (_) {}
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
            dbg('TOP-FS', 'Top-level player anchored in Native Fullscreen');
          }).catch(() => {});
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  function releaseTopNativeFullscreen() {
    if (window !== window.top) {
      try { window.top.postMessage({ type: 'tmv280_top_exit_fs' }, '*'); } catch (_) {}
      return;
    }
    state.topHasNativeFs = false;
    setTopWindowIframeFullscreenLock(false);
    const fs = fullscreenElement();
    if (fs) {
      try {
        const res = document.exitFullscreen?.() || document.mozCancelFullScreen?.() || document.webkitExitFullscreen?.();
        if (res?.catch) res.catch(() => {});
      } catch (_) {}
    }
    broadcastTopFsState(false);
  }

  function setTopWindowIframeFullscreenLock(enable) {
    if (window !== window.top) {
      try { window.top.postMessage({ type: 'tmv280_parent_fs_lock', enable: Boolean(enable) }, '*'); } catch (_) {}
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
      document.querySelectorAll(`[${CFG.parentIframeFsAttr}]`).forEach(el => el.removeAttribute(CFG.parentIframeFsAttr));
      document.querySelectorAll(`[${CFG.parentWrapFsAttr}]`).forEach(el => el.removeAttribute(CFG.parentWrapFsAttr));
      if (!state.pseudoFullscreen) {
        document.documentElement.removeAttribute(CFG.lockScrollAttr);
      }
    }
  }

  /* --- Episode Search & Next-EP Resolution --- */

  function synthesizeNextUrlPattern(currentHref, targetNum) {
    if (!currentHref) return '';
    try {
      const url = new URL(currentHref, location.href);
      const pathname = url.pathname;
      const epSlugMatch = pathname.match(/(-|_)(?:ep|episode|e|ton|part|chap)[-_]?(\d+)(?=[-_/.]|$)/i);
      if (epSlugMatch) {
        const prefix = epSlugMatch[1];
        const keyword = epSlugMatch[0].match(/(?:ep|episode|e|ton|part|chap)/i)[0];
        url.pathname = pathname.replace(epSlugMatch[0], `${prefix}${keyword}${targetNum}`);
        return url.href;
      }
      for (const key of url.searchParams.keys()) {
        if (/^(?:ep|episode|part|id_ep|chap)$/i.test(key)) {
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

  function hasFinalEpisodeIndicator(doc, curNum) {
    if (!doc) return false;
    try {
      const titleStr = `${doc.title || ''} ${doc.querySelector('h1')?.textContent || ''}`;
      if (Number.isFinite(curNum)) {
        const frac = titleStr.match(RX.epFraction);
        if (frac && Number(frac[1]) === curNum && Number(frac[2]) === curNum) return true;
      }
      const activeEls = doc.querySelectorAll('.active, .current, [aria-current="page"]');
      for (let i = 0; i < activeEls.length; i++) {
        const el = activeEls[i];
        if (el.children.length > 5) continue;
        const ep = extractEpFromElement(el);
        if (ep && getNumericEp(ep) === curNum) {
          const txt = `${el.textContent || ''} ${el.getAttribute('title') || ''}`;
          if (RX.finalEpMarker.test(txt)) return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function findNextEpisodeTarget(doc = document, currentEpStr = '') {
    const liveDetected = detectActiveEpFromDOM(doc);
    const curEpBadge = liveDetected || currentEpStr || state.currentEp || '';
    if (liveDetected && liveDetected !== state.currentEp) state.currentEp = liveDetected;
    const curNum = getNumericEp(curEpBadge);
    const targetNum = Number.isFinite(curNum) ? curNum + 1 : NaN;

    try {
      const dataEpBtns = Array.from(doc.querySelectorAll('[data-ep], [data-episode], .cyber-ep-btn, button[data-ep]'));
      const confident = [];
      for (let i = 0; i < dataEpBtns.length; i++) {
        const el = dataEpBtns[i];
        if (isServerSwitcherElement(el)) continue;
        const raw = el.getAttribute('data-ep') || el.getAttribute('data-episode') || '';
        let n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) n = getNumericEp(extractEpFromElement(el));
        if (!Number.isFinite(n) || n <= 0 || n > 5000 || RX.resolutionGuard.test(String(n))) continue;
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
        const maxGridEp = confident[confident.length - 1].n;
        if (Number.isFinite(curNum) && curNum >= maxGridEp) {
          return { isLastEpisode: true, currentEp: curEpBadge || normalizeEpNumber(curNum), maxEp: maxGridEp };
        }
        if (Number.isFinite(targetNum)) {
          const exact = confident.find(c => c.n === targetNum);
          if (exact) {
            const clickEl = exact.el.querySelector('a, button') || exact.el;
            return { type: 'element', element: clickEl, href: clickEl.getAttribute?.('href') || '', dataSrc: exact.el.getAttribute('data-src') || '', ep: exact.ep, targetNum: exact.n };
          }
        }
        if (Number.isFinite(curNum)) {
          const next = confident.find(c => c.n > curNum);
          if (next) {
            const clickEl = next.el.querySelector('a, button') || next.el;
            return { type: 'element', element: clickEl, href: clickEl.getAttribute?.('href') || '', dataSrc: next.el.getAttribute('data-src') || '', ep: next.ep, targetNum: next.n };
          }
        }
      }
    } catch (_) {}

    const selects = doc.querySelectorAll('select');
    for (let i = 0; i < selects.length; i++) {
      const sel = selects[i];
      if (isServerSwitcherElement(sel)) continue;
      const opts = Array.from(sel.options || []);
      if (opts.length < 2) continue;
      const parsedOpts = [];
      for (let j = 0; j < opts.length; j++) {
        const ep = parseEpBadge(opts[j].textContent || '', true) || parseEpBadge(opts[j].value || '', false);
        const n = getNumericEp(ep);
        if (Number.isFinite(n) && n > 0) parsedOpts.push({ opt: opts[j], idx: j, ep, n });
      }
      if (parsedOpts.length >= 2) {
        parsedOpts.sort((a, b) => a.n - b.n);
        const maxSelEp = parsedOpts[parsedOpts.length - 1].n;
        if (Number.isFinite(curNum) && curNum >= maxSelEp) {
          return { isLastEpisode: true, currentEp: curEpBadge || normalizeEpNumber(curNum), maxEp: maxSelEp };
        }
        if (Number.isFinite(targetNum)) {
          const exact = parsedOpts.find(p => p.n === targetNum);
          if (exact) return { type: 'select', select: sel, option: exact.opt, ep: exact.ep, targetNum: exact.n };
        }
        if (Number.isFinite(curNum)) {
          const nextBigger = parsedOpts.find(p => p.n > curNum);
          if (nextBigger) return { type: 'select', select: sel, option: nextBigger.opt, ep: nextBigger.ep, targetNum: nextBigger.n };
        }
      }
    }

    const candidates = doc.querySelectorAll(
      'a, button, li[onclick], [role="button"], [data-ep], [data-episode], ' +
      '.ep-item, .episode-item, .halim-episode, .episode, span.episode, div.episode, ' +
      '[class*="episode"], [class*="ep-item"], [class*="ep_item"], [class*="eps-"]'
    );
    const epElements = [];
    const distinctEpNums = new Set();

    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.children.length > 6 || isServerSwitcherElement(el)) continue;
      const txt = (el.textContent || '').replace(RX.whitespace, ' ').trim();
      if (txt.length > 90 || RX.prevKeyword.test(txt)) continue;
      let ep = extractEpFromElement(el);
      if (!ep && /ตอน(?:ที่)?\s*\d+/i.test(txt)) ep = parseEpBadge(txt, true);
      if (!ep) continue;
      const n = getNumericEp(ep);
      if (!Number.isFinite(n) || n <= 0) continue;

      let score = 10;
      if (el.classList.contains('episode') || /\bepisode\b/i.test(el.className || '')) score += 40;
      if ((el.className || '').toString().toLowerCase().includes('cyber-ep-btn')) score += 70;
      if (el.hasAttribute('data-ep') || el.hasAttribute('data-episode')) score += 50;
      if (el.closest(EP_CONTAINER_SEL)) score += 35;
      if (el.tagName === 'A' || el.tagName === 'BUTTON') score += 15;
      const href = el.getAttribute('href') || '';
      if (href && href !== '#' && !href.startsWith('javascript:')) score += 20;

      distinctEpNums.add(n);
      epElements.push({ el, ep, n, score });
    }

    epElements.sort((a, b) => a.n - b.n || b.score - a.score);

    let explicitNextBtn = null;
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.children.length > 4 || isServerSwitcherElement(el)) continue;
      const txt = (el.textContent || '').replace(RX.whitespace, ' ').trim();
      const aria = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
      if ((txt.length <= 40 && RX.nextKeyword.test(txt)) || (aria.length <= 40 && RX.nextKeyword.test(aria))) {
        const isDisabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || /\b(?:disabled|inactive|no-next|end)\b/i.test(el.className || '');
        const href = el.getAttribute('href') || '';
        const hasAction = (href && href !== '#' && !href.startsWith('javascript:')) || el.hasAttribute('onclick') || el.tagName === 'BUTTON';
        if (!isDisabled && hasAction) {
          const ep = extractEpFromElement(el) || (Number.isFinite(targetNum) ? normalizeEpNumber(targetNum) : 'ตอนถัดไป');
          explicitNextBtn = { type: 'element', element: el, href, dataSrc: el.getAttribute('data-src') || '', ep, targetNum: getNumericEp(ep) || targetNum };
          break;
        }
      }
    }

    if (distinctEpNums.size >= 2 && Number.isFinite(curNum)) {
      const maxEpInList = Math.max(...distinctEpNums);
      if (curNum >= maxEpInList && !explicitNextBtn) {
        return { isLastEpisode: true, currentEp: curEpBadge || normalizeEpNumber(curNum), maxEp: maxEpInList };
      }
    }

    if (Number.isFinite(targetNum)) {
      const exact = epElements.find(item => item.n === targetNum);
      if (exact) {
        const clickEl = exact.el.querySelector('a, button') || exact.el;
        return { type: 'element', element: clickEl, href: clickEl.getAttribute?.('href') || exact.el.getAttribute?.('href') || '', dataSrc: exact.el.getAttribute('data-src') || '', ep: normalizeEpNumber(targetNum), targetNum };
      }
    }

    if (Number.isFinite(curNum) && epElements.length >= 2) {
      const next = epElements.find(item => item.n > curNum);
      if (next) {
        const clickEl = next.el.querySelector('a, button') || next.el;
        return { type: 'element', element: clickEl, href: clickEl.getAttribute?.('href') || next.el.getAttribute?.('href') || '', dataSrc: next.el.getAttribute('data-src') || '', ep: next.ep, targetNum: next.n };
      }
    }

    if (explicitNextBtn) return explicitNextBtn;

    if (Number.isFinite(curNum) && hasFinalEpisodeIndicator(doc, curNum)) {
      return { isLastEpisode: true, currentEp: curEpBadge || normalizeEpNumber(curNum), maxEp: curNum };
    }

    if (distinctEpNums.size < 2 && Number.isFinite(targetNum) && extractEpFromUrl(doc.location?.href || '')) {
      const synthesizedUrl = synthesizeNextUrlPattern(doc.location?.href || location.href, targetNum);
      if (synthesizedUrl) return { type: 'url_fallback', href: synthesizedUrl, ep: normalizeEpNumber(targetNum), targetNum };
    }

    return null;
  }

  function notifyLastEpisodeReached(epLabel = '') {
    const now = Date.now();
    if (now - state.lastEndNoticeTs < 2500) return;
    state.lastEndNoticeTs = now;
    state.isTransitioningNextEp = false;
    state.expectingSeamlessEpisode = false;
    state.armedFromAutoNext = false;
    state.pendingIframeManualNext = false;
    clearAutoFullscreenBridge();

    const label = epLabel || state.currentEp || '';
    const msg = label ? `ถึงตอนสุดท้ายแล้ว (${label}) • ไม่มีตอนถัดไป` : 'ถึงตอนสุดท้ายแล้ว • ไม่มีตอนถัดไป';
    dbg('LAST-EP', msg);
    showHud(msg, 3200, 'endEp');
  }

  function saveAutoFullscreenBridge(epBadge) {
    const payload = { ep: epBadge || '', speed: state.savedSpeed || 1, aspectIndex: state.aspectIndex || 0, ts: Date.now() };
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
      const res = await fetch(absUrl, { method: 'GET', credentials: 'include', headers: { 'Accept': 'text/html,application/xhtml+xml' }, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const html = await res.text();
      if (!html || html.length < 300) return false;
      const nextDoc = new DOMParser().parseFromString(html, 'text/html');
      const nextIframe = findMainPlayerIframeInTopDoc(nextDoc);
      const curIframe = findMainPlayerIframeInTopDoc(document);
      if (nextIframe && curIframe) {
        const rawNextSrc = nextIframe.getAttribute('src') || nextIframe.getAttribute('data-src') || nextIframe.getAttribute('data-lazy-src') || '';
        if (rawNextSrc) {
          const nextIframeUrl = new URL(rawNextSrc, absUrl).href;
          try { history.pushState({ ep: nextEpBadge }, nextDoc.title || document.title, absUrl); } catch (_) {}
          if (nextDoc.title) document.title = nextDoc.title;
          state.currentEp = nextEpBadge;
          const updatedTitle = refreshTitleCache(true);
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
    } catch (_) {} finally {
      clearTimeout(timeoutId);
    }
    return false;
  }

  function pingAllFramesNextEpAutoPlay(epBadge) {
    try {
      const frames = document.querySelectorAll('iframe');
      for (let i = 0; i < frames.length; i++) {
        frames[i].contentWindow?.postMessage({
          type: 'tmv280_next_ep_autoplay',
          ep: epBadge || state.currentEp || '',
          title: state.cachedTitle || '',
          speed: state.savedSpeed || 1
        }, '*');
      }
    } catch (_) {}
  }

  function isVideoTrulyReadyForFullscreen(v) {
    if (!v || !v.isConnected || isDisqualifiedVideo(v)) return false;
    if (v.readyState < 2 || v.videoWidth <= 0 || v.videoHeight <= 0) return false;
    const dur = v.duration;
    if (!Number.isFinite(dur) || dur <= 3) {
      if (!(v.readyState >= 3 && v.currentTime > 0.5)) return false;
    }
    return true;
  }

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

    saveAutoFullscreenBridge(nextEpBadge || state.currentEp);
    const hasTopNativeFs = Boolean((window === window.top && fullscreenElement()) || state.topHasNativeFs);
    if (!hasTopNativeFs) setTopWindowIframeFullscreenLock(false);

    let attempts = 0;
    state.autoPlayPollTimer = setInterval(() => {
      attempts++;
      if (attempts > 50 || state.destroyed) {
        clearInterval(state.autoPlayPollTimer);
        state.autoPlayPollTimer = 0;
        state.isTransitioningNextEp = false;
        state.expectingSeamlessEpisode = false;
        state.armedFromAutoNext = false;
        clearAutoFullscreenBridge();
        return;
      }
      try {
        if (attempts <= 6 || attempts % 3 === 0) refreshTitleCache(true);
        const now = Date.now();
        let v = bestVideo(document);
        if (!v && state.lastActiveVideo?.isConnected && !isDisqualifiedVideo(state.lastActiveVideo)) v = state.lastActiveVideo;

        if (!v || (v.paused && v.readyState === 0 && v.networkState !== 2)) {
          if (now - state.lastBigPlayKickTs >= 1600) {
            state.lastBigPlayKickTs = now;
            clickPlayerBigPlayButton();
          }
          return;
        }
        trySkipPreRollAdSafely(v);
        if (!isVideoTrulyReadyForFullscreen(v)) return;

        state.armedFromAutoNext = true;
        state.suppressAutoFsUntilPlay = false;
        state.manualExitVideo = null;
        state.lastUserGestureTs = now;

        if (v.paused) {
          if (now - state.lastBigPlayKickTs >= 1200) {
            state.lastBigPlayKickTs = now;
            clickPlayerBigPlayButton();
            safePlay(v);
          }
          return;
        }

        if (!v.paused && !v.ended && v.currentTime >= 0.08) {
          clearInterval(state.autoPlayPollTimer);
          state.autoPlayPollTimer = 0;
          state.isTransitioningNextEp = false;
          state.expectingSeamlessEpisode = false;
          clearAutoFullscreenBridge();
          if (!state.overlay && state.autoFsOnPlayEnabled) {
            state.armedFromAutoNext = false;
            enterUniversalFullscreen(v);
          }
        }
      } catch (_) {}
    }, 350);
  }

  async function executeNextEpisodeInTopWindow(preferredEp = '', manual = false, replySource = null) {
    if (window !== window.top) {
      try {
        window.top.postMessage({ type: 'tmv280_trigger_next_ep', currentEp: preferredEp || state.currentEp || '', manual: Boolean(manual) }, '*');
      } catch (_) {}
      return true;
    }

    const now = Date.now();
    if (now - state.lastAutoNextTriggerTs < 3500) return false;

    const target = findNextEpisodeTarget(document, preferredEp || state.currentEp);
    if (!target || target.isLastEpisode) {
      const finalEp = target?.currentEp || preferredEp || state.currentEp || '';
      notifyLastEpisodeReached(finalEp);
      if (replySource) {
        try { replySource.postMessage({ type: 'tmv280_last_ep_notice', ep: finalEp }, '*'); } catch (_) {}
      }
      broadcastToAllFrames({ type: 'tmv280_last_ep_notice', ep: finalEp });
      return false;
    }

    if (replySource) {
      try { replySource.postMessage({ type: 'tmv280_confirm_next_ep_exit', nextEp: target.ep || '', manual: Boolean(manual) }, '*'); } catch (_) {}
    }

    state.lastAutoNextTriggerTs = now;
    const nextEpBadge = target.ep || '';
    const targetNum = target.targetNum || getNumericEp(nextEpBadge);
    if (nextEpBadge) state.currentEp = nextEpBadge;
    state.cachedKeysList = null;

    if (state.video) clearSavedPositionForVideo(state.video);

    const wasInTopFullscreen = Boolean(fullscreenElement() || state.pseudoFullscreen || state.overlay);
    if (wasInTopFullscreen) exitFullscreenForEpisodeSwitch(Boolean(manual));

    saveAutoFullscreenBridge(nextEpBadge);
    const keepTopNativeFs = Boolean(fullscreenElement() || state.topHasNativeFs);
    setTopWindowIframeFullscreenLock(keepTopNativeFs);

    try {
      if (target.type === 'select' && target.select && target.option) {
        const optVal = target.option.value || '';
        if (/^https?:\/\//i.test(optVal) || optVal.startsWith('/')) {
          if (await tryAjaxSwapEpisodeInPlace(optVal, nextEpBadge, targetNum)) {
            startNextEpisodeReadinessAutoPlay(nextEpBadge);
            return true;
          }
        }
        target.select.value = target.option.value;
        target.option.selected = true;
        target.select.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (target.type === 'url_fallback' && target.href) {
        if (await tryAjaxSwapEpisodeInPlace(target.href, nextEpBadge, targetNum)) {
          startNextEpisodeReadinessAutoPlay(nextEpBadge);
          return true;
        }
        location.href = target.href;
        return true;
      } else if (target.type === 'element' && target.element) {
        const href = target.href || target.element.getAttribute?.('href') || '';
        const dataSrc = target.dataSrc || target.element.getAttribute?.('data-src') || '';
        const hasInlineJs = target.element.hasAttribute?.('onclick') || href.startsWith('javascript:');
        if (dataSrc && /^https?:\/\//i.test(dataSrc)) {
          const playerIframe = findMainPlayerIframeInTopDoc(document);
          if (playerIframe) {
            playerIframe.src = dataSrc;
            state.currentEp = nextEpBadge;
            startNextEpisodeReadinessAutoPlay(nextEpBadge);
            setTimeout(() => {
              const newTitle = refreshTitleCache(true);
              broadcastTitleToFrames(newTitle, state.currentEp);
              pingAllFramesNextEpAutoPlay(state.currentEp);
            }, 500);
            return true;
          }
        }
        if (href && href !== '#' && !hasInlineJs) {
          if (await tryAjaxSwapEpisodeInPlace(href, nextEpBadge, targetNum)) {
            startNextEpisodeReadinessAutoPlay(nextEpBadge);
            return true;
          }
        }
        target.element.click();
      }
    } catch (_) {}

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
    if (hasClickActivation) anchorTopNativeFullscreen();
    destroyController();
    if (window === window.top && !findMainPlayerIframeInTopDoc(document)) {
      const fs = fullscreenElement();
      if (fs && !hasClickActivation) {
        try {
          const res = document.exitFullscreen?.() || document.mozCancelFullScreen?.() || document.webkitExitFullscreen?.();
          if (res?.catch) res.catch(() => {});
        } catch (_) {}
      }
    }
  }

  function triggerSeamlessNextEpisode(manual = false) {
    if (!manual && !state.autoNextEnabled) return;
    const now = Date.now();
    if (now - state.lastAutoNextTriggerTs < 3500) return;

    try {
      const live = detectActiveEpFromDOM(document);
      if (live) state.currentEp = live;
    } catch (_) {}

    if (window === window.top) {
      const check = findNextEpisodeTarget(document, state.currentEp);
      if (!check || check.isLastEpisode) {
        notifyLastEpisodeReached(check?.currentEp || state.currentEp);
        return;
      }
      if (state.video) clearSavedPositionForVideo(state.video);
      saveAutoFullscreenBridge(check.ep || state.currentEp);
      const wasInFullscreen = Boolean(fullscreenElement() || state.pseudoFullscreen || state.overlay);
      if (wasInFullscreen) {
        exitFullscreenForEpisodeSwitch(Boolean(manual));
        setTimeout(() => executeNextEpisodeInTopWindow(state.currentEp, manual), 140);
      } else {
        executeNextEpisodeInTopWindow(state.currentEp, manual);
      }
      return;
    }

    state.pendingIframeManualNext = Boolean(manual);
    try {
      window.top.postMessage({ type: 'tmv280_trigger_next_ep', currentEp: state.currentEp || '', manual: Boolean(manual) }, '*');
    } catch (_) {}
  }

  /* --- Auto-Play & Pre-Roll Ad Skipper --- */

  function clickPlayerBigPlayButton() {
    try {
      const forceMode = Boolean(state.overlay || state.pseudoFullscreen);
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
        if (area(skipBtns[i]) > 0) skipBtns[i].click();
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

  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'tmv280_parent_fs_lock' && window === window.top) {
      setTopWindowIframeFullscreenLock(Boolean(data.enable));
      return;
    }
    if (data.type === 'tmv280_top_anchor_fs' && window === window.top) {
      anchorTopNativeFullscreen();
      return;
    }
    if (data.type === 'tmv280_top_exit_fs' && window === window.top) {
      cleanupFullscreenSession(state.video || state.lastActiveVideo);
      releaseTopNativeFullscreen();
      return;
    }
    if (data.type === 'tmv280_top_fs_state' && window !== window.top) {
      const wasActive = state.topHasNativeFs;
      state.topHasNativeFs = Boolean(data.active);
      if (state.topHasNativeFs) state.pseudoFullscreen = false;
      if (wasActive && !state.topHasNativeFs && !state.isTransitioningNextEp && state.overlay) {
        cleanupFullscreenSession(state.video || state.lastActiveVideo);
      }
      return;
    }
    if (data.type === 'tmv280_remote_expand_req') {
      // คำสั่งจากรีโมทให้ขยายวิดีโอเข้าโหมดเต็มจอทันที
      const v = bestVideo(document) || state.lastActiveVideo;
      if (v) {
        clickPlayerBigPlayButton();
        safePlay(v);
        enterUniversalFullscreen(v);
      } else if (window === window.top) {
        const iframe = findMainPlayerIframeInTopDoc(document);
        if (iframe?.contentWindow) {
          anchorTopNativeFullscreen();
          try { iframe.contentWindow.postMessage({ type: 'tmv280_remote_expand_req' }, '*'); } catch (_) {}
        }
      }
      return;
    }
    if (data.type === 'tmv280_trigger_next_ep' && window === window.top) {
      if (typeof data.currentEp === 'string' && data.currentEp) state.currentEp = data.currentEp;
      executeNextEpisodeInTopWindow(state.currentEp, Boolean(data.manual), event.source);
      return;
    }
    if (data.type === 'tmv280_last_ep_notice' && window !== window.top) {
      notifyLastEpisodeReached(data.ep || state.currentEp || '');
      return;
    }
    if (data.type === 'tmv280_confirm_next_ep_exit' && window !== window.top) {
      if (state.video) clearSavedPositionForVideo(state.video);
      saveAutoFullscreenBridge(data.nextEp || state.currentEp);
      exitFullscreenForEpisodeSwitch(Boolean(data.manual || state.pendingIframeManualNext));
      state.pendingIframeManualNext = false;
      return;
    }
    if (data.type === 'tmv280_next_ep_autoplay' && window !== window.top) {
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
        event.source.postMessage({ type: CFG.titleType + ':res', title: refreshTitleCache(false), ep: state.currentEp || '' }, '*');
      } catch (_) {}
      return;
    }
    if (window !== window.top && data.type === CFG.titleType + ':res' && typeof data.title === 'string' && data.title) {
      if (typeof data.ep === 'string' && data.ep) state.currentEp = data.ep;
      state.cachedTitle = data.title.slice(0, 220);
      state.cachedKeysList = null;
      setTitleUI(state.cachedTitle, state.currentEp);
      if (state.video) tryRestorePlaybackPosition(state.video);
    }
  });

  /* =========================================================
     3. VIDEO DISCOVERY & ANDROID TV LAUNCHER BUTTON
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
    if (video.parentElement?.hasAttribute('data-tmv280-wrapper')) return video.parentElement;

    try {
      const known = video.closest(
        '.html5-video-player, .plyr, .video-js, .jwplayer, .flowplayer, ' +
        '.dplayer, .art-video-player, .mejs__container, .vplayer, ' +
        '[data-player], [data-video-player], [class*="player-container"], ' +
        '[class*="video-container"], [class*="video-player"], [class*="video-wrapper"]'
      );
      if (known && known !== document.body && known !== document.documentElement && known.querySelectorAll('video').length <= 2) {
        return known;
      }
    } catch (_) {}

    const vArea = area(video);
    let curr = video.parentElement;
    let best = curr;
    let bestScore = -Infinity;
    let depth = 0;

    while (curr && curr !== document.body && curr !== document.documentElement && !(curr instanceof ShadowRoot) && depth < CFG.maxDepth) {
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
        wrapper.setAttribute('data-tmv280-wrapper', '1');
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

  /* --- ปุ่มฟังก์ชันบนหน้าเว็บสำหรับรีโมททีวี (D-Pad Focusable TV Expand Trigger) --- */
  function triggerRemoteFullscreenMode() {
    const v = bestVideo(document) || state.lastActiveVideo;
    if (v) {
      clickPlayerBigPlayButton();
      safePlay(v);
      enterUniversalFullscreen(v);
      return true;
    }
    if (window === window.top) {
      const iframe = findMainPlayerIframeInTopDoc(document);
      if (iframe?.contentWindow) {
        anchorTopNativeFullscreen();
        try { iframe.contentWindow.postMessage({ type: 'tmv280_remote_expand_req' }, '*'); } catch (_) {}
        return true;
      }
    }
    return false;
  }

  function ensureTVLauncherButton() {
    if (state.overlay || state.pseudoFullscreen || fullscreenElement()) {
      removeTVLauncherButton();
      return;
    }
    const hasVideo = Boolean(bestVideo(document));
    const hasPlayerIframe = window === window.top && hasCrossOriginPlayerIframeOnPage();
    if (!hasVideo && !hasPlayerIframe) return;
    if (state.launcherHost?.isConnected) return;

    const host = document.createElement('div');
    host.id = CFG.launcherHostId;
    host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483640;pointer-events:auto;';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .tv-launch-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 11px 18px;
          border-radius: 999px;
          border: 2px solid rgba(56, 189, 248, 0.75);
          background: rgba(10, 14, 24, 0.92);
          color: #f8fafc;
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.3px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.75), 0 0 18px rgba(14, 165, 233, 0.45);
          transition: transform 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
          outline: none;
        }
        .tv-launch-btn:focus,
        .tv-launch-btn:hover {
          transform: scale(1.07);
          background: #0a84ff;
          border-color: #ffffff;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.9), 0 10px 28px rgba(10, 132, 255, 0.85);
        }
        .tv-launch-btn svg {
          width: 20px;
          height: 20px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          flex-shrink: 0;
        }
      </style>
      <button type="button" class="tv-launch-btn" id="v280-tv-launch" tabindex="0" aria-label="ขยายเต็มจอโหมดรีโมท TV">
        ${icon('enter')}
        <span>เต็มจอ TV (หรือกด OK ค้าง)</span>
      </button>
    `;
    const btn = shadow.getElementById('v280-tv-launch');
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      triggerRemoteFullscreenMode();
    });
    btn.addEventListener('keydown', e => {
      const tk = normalizeTVKey(e);
      if (tk === 'OK') {
        e.preventDefault();
        e.stopPropagation();
        triggerRemoteFullscreenMode();
      }
    });

    (document.body || document.documentElement)?.appendChild(host);
    state.launcherHost = host;
    state.launcherBtn = btn;
  }

  function removeTVLauncherButton() {
    if (state.launcherHost) {
      try { state.launcherHost.remove(); } catch (_) {}
      state.launcherHost = null;
      state.launcherBtn = null;
    }
  }

  /* =========================================================
     4. WAKE LOCK & FULLSCREEN PATCHING (NO ORIENTATION LOCK)
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

  function patchFullscreenAPI() {
    if (typeof Element === 'undefined' || !origReqFS) return;
    const interceptReqFS = function (...args) {
      try {
        if (isVideo(this) && !isDisqualifiedVideo(this)) {
          state.lastActiveVideo = this;
          const container = ensureSafeContainer(this);
          if (container && container !== this) {
            if (container.hasAttribute('data-tmv280-wrapper')) container.style.display = 'block';
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
      } catch (_) {}
    };
    applyPatchToTarget(window);
    if (pageWin && pageWin !== window) applyPatchToTarget(pageWin);
  }

  function unlockIframes() {
    try {
      const iframes = document.querySelectorAll('iframe:not([data-tmv280-unlocked])');
      for (let i = 0; i < iframes.length; i++) {
        const f = iframes[i];
        f.setAttribute('data-tmv280-unlocked', '1');
        if (!f.hasAttribute('allowfullscreen')) f.setAttribute('allowfullscreen', 'true');
        const allow = f.getAttribute('allow') || '';
        if (!allow.includes('fullscreen')) {
          f.setAttribute('allow', allow ? `${allow}; fullscreen *; autoplay *` : 'fullscreen *; autoplay *');
        }
      }
    } catch (_) {}
  }

  /* =========================================================
     5. ANDROID TV 10-FOOT SHADOW DOM UI & FOCUS RING STYLES
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
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
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
        width: 100vw !important;
        height: 100vh !important;
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
      [${CFG.hostAttr}="1"] video[${CFG.videoAttr}="1"]::-webkit-media-controls-enclosure {
        display: none !important;
        opacity: 0 !important;
      }
      [${CFG.hostAttr}="1"] > *:not(video):not(#${CFG.shadowHostId}):not(:has(video)) {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      [${CFG.hostAttr}="1"] .vjs-control-bar,
      [${CFG.hostAttr}="1"] .vjs-big-play-button,
      [${CFG.hostAttr}="1"] .plyr__controls,
      [${CFG.hostAttr}="1"] .plyr__control--overlaid,
      [${CFG.hostAttr}="1"] .jw-controls,
      [${CFG.hostAttr}="1"] .jw-display,
      [${CFG.hostAttr}="1"] .jw-overlays,
      [${CFG.hostAttr}="1"] .fp-controls,
      [${CFG.hostAttr}="1"] .dplayer-controller,
      [${CFG.hostAttr}="1"] .art-bottom,
      [${CFG.hostAttr}="1"] .mejs__controls,
      [${CFG.hostAttr}="1"] .ytp-chrome-bottom,
      [${CFG.hostAttr}="1"] .ytp-chrome-top,
      [${CFG.hostAttr}="1"] [class*="vjs-control"]:not(video),
      [${CFG.hostAttr}="1"] [class*="player-control"]:not(#${CFG.shadowHostId}):not(video),
      [${CFG.hostAttr}="1"] [class*="control-bar"]:not(#${CFG.shadowHostId}):not(video) {
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
    }
    .v280-absorber {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: auto;
      background: transparent;
    }
    .v280-ui {
      transition: opacity 0.18s ease;
      opacity: 1;
      will-change: opacity;
    }
    #${CFG.overlayId}.hidden-ui .v280-ui {
      opacity: 0;
      pointer-events: none;
    }

    /* =====================================================================
       ANDROID TV 10-FOOT HIGH-CONTRAST FOCUS CURSOR RING (D-PAD NAVIGATION)
       ===================================================================== */
    .tv-focusable {
      outline: none !important;
      transition: transform 0.14s cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 0.14s ease,
                  border-color 0.14s ease,
                  background 0.14s ease;
    }
    .tv-focusable.tv-focused {
      transform: scale(1.12);
      background: rgba(10, 132, 255, 0.96) !important;
      border-color: #ffffff !important;
      color: #ffffff !important;
      box-shadow:
        0 0 0 4px #ffffff,
        0 0 0 8px rgba(10, 132, 255, 0.65),
        0 10px 28px rgba(0, 0, 0, 0.85) !important;
      z-index: 40 !important;
    }
    .v280-range.tv-focusable.tv-focused {
      transform: scaleY(1.45);
      box-shadow:
        0 0 0 3px #ffffff,
        0 0 18px rgba(10, 132, 255, 0.95) !important;
    }
    .v280-menu-row.tv-focusable.tv-focused {
      transform: scale(1.03);
      background: rgba(10, 132, 255, 0.32) !important;
      border: 2px solid #ffffff !important;
      border-radius: 12px;
      padding: 6px 10px;
      box-shadow: 0 0 16px rgba(10, 132, 255, 0.65) !important;
    }

    /* HUD Notification */
    .v280-hud {
      position: absolute;
      top: 16%;
      left: 50%;
      transform: translate3d(-50%, 0, 0) scale(0.92);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: rgba(12, 14, 22, 0.95);
      border: 2px solid rgba(56, 189, 248, 0.55);
      color: #fff;
      padding: 12px 26px;
      border-radius: 32px;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.4px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
      pointer-events: none;
      z-index: 50;
      opacity: 0;
      transition: opacity 0.14s ease, transform 0.14s ease;
    }
    .v280-hud svg {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: #38bdf8;
      stroke-width: 2.3;
      stroke-linecap: round;
      stroke-linejoin: round;
      flex-shrink: 0;
    }
    .v280-hud.show {
      opacity: 1;
      transform: translate3d(-50%, 0, 0) scale(1);
    }

    .v280-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 56px;
      height: 56px;
      margin: -28px 0 0 -28px;
      border: 5px solid rgba(255, 255, 255, 0.22);
      border-top-color: #0a84ff;
      border-radius: 50%;
      z-index: 2;
      pointer-events: none;
      display: none;
      animation: v280spin 0.75s linear infinite;
    }
    #${CFG.overlayId}.buffering .v280-spinner {
      display: block;
    }
    @keyframes v280spin {
      to { transform: rotate(360deg); }
    }

    /* Top Bar (TV Scaled) */
    .v280-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 22px 32px 24px 32px;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.88), transparent);
      position: relative;
      z-index: 20;
      width: 100%;
    }
    .v280-titlebox {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
    }
    .v280-title {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      color: #f8fafc;
      font-size: 21px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
    }
    .v280-ep {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 13px;
      border-radius: 9px;
      background: linear-gradient(180deg, #2b9bff 0%, #0a84ff 100%);
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      box-shadow: 0 2px 8px rgba(10, 132, 255, 0.6);
    }
    .v280-title-main {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .v280-actions {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }

    .v280-btn {
      background: rgba(18, 20, 28, 0.88);
      color: #fff;
      border: 2px solid rgba(255, 255, 255, 0.24);
      border-radius: 50%;
      width: 54px;
      height: 54px;
      min-width: 54px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
      position: relative;
      z-index: 3;
    }
    .v280-btn svg {
      width: 26px;
      height: 26px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.1;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }
    .v280-btn-pill {
      width: auto;
      border-radius: 28px;
      padding: 0 18px;
      gap: 8px;
      font-size: 15px;
      font-weight: 800;
    }

    /* Center Transport Bar */
    .v280-center {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 44px;
      z-index: 3;
    }
    .v280-center .v280-btn {
      width: 68px;
      height: 68px;
      min-width: 68px;
    }
    .v280-center .v280-btn svg {
      width: 32px;
      height: 32px;
    }
    .v280-center .v280-play {
      width: 88px;
      height: 88px;
      min-width: 88px;
      background: rgba(10, 132, 255, 0.9);
      border-color: rgba(255, 255, 255, 0.45);
    }
    .v280-center .v280-play svg {
      width: 42px;
      height: 42px;
    }

    /* Bottom Timeline & D-Pad Hint Bar */
    .v280-bottom {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 20px 32px 26px 32px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
      z-index: 3;
      width: 100%;
    }
    .v280-timeline-row {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
    }
    .v280-time {
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      min-width: 62px;
      text-align: center;
      text-shadow: 0 1px 4px #000;
    }
    .v280-slider {
      --v280-pct: 0%;
      appearance: none;
      -webkit-appearance: none;
      border-radius: 6px;
      background: linear-gradient(to right, #0a84ff 0%, #0a84ff var(--v280-pct), rgba(255, 255, 255, 0.35) var(--v280-pct), rgba(255, 255, 255, 0.35) 100%);
      accent-color: #0a84ff;
      cursor: pointer;
    }
    .v280-range {
      flex: 1;
      min-width: 0;
      height: 10px;
    }
    .v280-range::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #0a84ff;
      border: 3px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.75);
    }
    .v280-dpad-guide {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      font-size: 13px;
      font-weight: 600;
      color: rgba(226, 232, 240, 0.85);
      letter-spacing: 0.2px;
    }
    .v280-key-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.24);
      padding: 3px 10px;
      border-radius: 8px;
      color: #fff;
      font-weight: 700;
    }

    /* Settings Panel (D-Pad Navigable) */
    .v280-settings-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      z-index: 30;
    }
    .v280-settings-panel {
      display: none;
      position: absolute;
      top: calc(100% + 14px);
      right: 0;
      width: 390px;
      background: rgba(14, 16, 24, 0.98);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      padding: 18px 20px;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9);
      z-index: 9999;
    }
    .v280-settings-wrap.expanded .v280-settings-panel {
      display: flex;
    }
    #${CFG.overlayId}.settings-open .v280-center,
    #${CFG.overlayId}.settings-open .v280-bottom {
      opacity: 0.18;
      pointer-events: none;
    }
    .v280-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.16);
      font-size: 16px;
      font-weight: 800;
    }
    .v280-menu-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 8px;
      border: 2px solid transparent;
      border-radius: 12px;
    }
    .v280-menu-label {
      font-size: 15px;
      font-weight: 600;
      color: #f1f5f9;
    }
    .v280-menu-val {
      font-size: 15px;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.16);
      padding: 4px 12px;
      border-radius: 8px;
      min-width: 74px;
      text-align: center;
    }

    /* Debug Box */
    .v280-debug {
      position: absolute;
      top: 90px;
      left: 32px;
      max-width: 440px;
      background: rgba(8, 10, 16, 0.9);
      border: 1px solid rgba(10, 132, 255, 0.5);
      border-radius: 12px;
      padding: 8px 12px;
      color: #64d2ff;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      line-height: 1.4;
      z-index: 28;
      display: none;
      flex-direction: column;
      gap: 4px;
    }
    .v280-debug.active { display: flex; }
    .v280-debug-head {
      font-weight: 700;
      color: #30d158;
      border-bottom: 1px solid rgba(255,255,255,0.15);
      padding-bottom: 4px;
    }
    .v280-debug-body {
      max-height: 110px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
  `;

  /* =========================================================
     6. PLAYBACK, SEEK, FULLSCREEN & ANDROID TV D-PAD ENGINE
     ========================================================= */

  function getCustomSeekSvg(type) {
    const step = state.seekStep || 30;
    const fontSize = step >= 100 ? '5.8' : '7.5';
    if (type === 'back') {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 3a9 9 0 1 0 8.7 6.6M12.5 3V7M12.5 3L8.5 3"/><text x="12" y="15.5" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none">${step}</text></svg>`;
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.5 3a9 9 0 1 1-8.7 6.6M11.5 3V7M11.5 3L15.5 3"/><text x="12" y="15.5" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none">${step}</text></svg>`;
  }

  function showHud(text, duration = 1100, iconKey = '') {
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
    inputEl.style.setProperty('--v280-pct', `${clamp(Number(pct) || 0, 0, 100)}%`);
  }

  function safePlay(video) {
    if (!video) return;
    try {
      const p = video.play();
      if (p?.catch) {
        p.catch(() => {
          setTimeout(() => {
            try { if (video.paused) video.play()?.catch?.(() => {}); } catch (_) {}
          }, 80);
        });
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
        try { video.fastSeek(target); return true; } catch (_) {}
      }
      video.currentTime = target;
      return true;
    } catch (_) {
      return false;
    }
  }

  function attemptMediaErrorRecovery(video) {
    if (!video || !video.error) return;
    const now = Date.now();
    if (now - state.lastHealAttemptTs < 2500 || state.healRetryCount >= 4) return;
    state.lastHealAttemptTs = now;
    state.healRetryCount++;
    const resumeTarget = Math.max(state.lastKnownGoodTime || 0, Number.isFinite(video.currentTime) ? video.currentTime : 0) + 0.65;
    showHud('กำลังซ่อมแซมสัญญาณภาพ...', 2000, 'settings');
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
        }
      }
    } catch (_) {}
  }

  function installHistoryBackTrap() {
    if (state.historySentinelPushed) return;
    try {
      history.pushState({ __tmv280_fs_guard: true }, document.title, location.href);
      state.historySentinelPushed = true;
    } catch (_) {}
  }

  function removeHistoryBackTrap() {
    if (!state.historySentinelPushed) return;
    state.historySentinelPushed = false;
    try {
      if (history.state && history.state.__tmv280_fs_guard) {
        state.ignoreNextPopstate = true;
        history.back();
      }
    } catch (_) {}
  }

  function enterUniversalFullscreen(video) {
    if (!video || isDisqualifiedVideo(video)) return;
    const now = Date.now();
    if (state.isEnteringFullscreen && (now - state.enteringFullscreenTs) < 1200) return;
    if (state.overlay && state.video === video && !state.pseudoFullscreen) return;

    removeTVLauncherButton();
    state.lastActiveVideo = video;
    const container = ensureSafeContainer(video);
    if (!container) return;

    installHistoryBackTrap();

    if (window !== window.top && state.topHasNativeFs) {
      createOverlay(video, container, false);
      return;
    }

    if (window !== window.top && navigator.userActivation?.isActive) {
      anchorTopNativeFullscreen();
    }

    if (origReqFS) {
      try {
        if (container.hasAttribute('data-tmv280-wrapper')) container.style.display = 'block';
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
            createOverlay(video, container, false);
          }).catch(() => {
            state.isEnteringFullscreen = false;
            if (fullscreenElement() || (window !== window.top && state.topHasNativeFs)) {
              createOverlay(video, container, false);
              return;
            }
            setTopWindowIframeFullscreenLock(true);
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
    createOverlay(video, container, true);
  }

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

    removeHistoryBackTrap();
    clearAutoFullscreenBridge();
    setTopWindowIframeFullscreenLock(false);
    releaseWakeLock();
    destroyController();
    setTimeout(ensureTVLauncherButton, 200);
  }

  function exitUniversalFullscreen() {
    const currentVid = state.video || state.lastActiveVideo;
    cleanupFullscreenSession(currentVid);
    if (window !== window.top) releaseTopNativeFullscreen();
    const fs = fullscreenElement();
    if (fs) {
      try {
        const res = document.exitFullscreen?.() || document.mozCancelFullScreen?.() || document.webkitExitFullscreen?.();
        if (res?.catch) res.catch(() => {});
      } catch (_) {}
    }
  }

  function suppressHostAndNativeControls(video, container, isPseudo) {
    state.originalVideo = {
      objectFit: video.style.getPropertyValue('object-fit'),
      objectFitPriority: video.style.getPropertyPriority('object-fit'),
      objectPosition: video.style.getPropertyValue('object-position'),
      objectPositionPriority: video.style.getPropertyPriority('object-position'),
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
    state.pseudoFullscreen = Boolean(isPseudo && !fullscreenElement() && !(window !== window.top && state.topHasNativeFs));

    try {
      container.setAttribute(CFG.hostAttr, '1');
      if (state.pseudoFullscreen) {
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
          if (origV.controlsAttr !== null) video.setAttribute('controls', origV.controlsAttr);
          if (origV.controlsProp) video.controls = true;
        }
      } catch (_) {}
    }

    const container = state.container;
    if (container) {
      try {
        container.removeAttribute(CFG.hostAttr);
        container.removeAttribute(CFG.pseudoAttr);
        if (state.changedPosition && state.originalPosition) {
          if (state.originalPosition.value) container.style.setProperty('position', state.originalPosition.value, state.originalPosition.priority);
          else container.style.removeProperty('position');
        }
        if (container.hasAttribute('data-tmv280-wrapper')) container.style.display = 'contents';
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
     7. OVERLAY LIFECYCLE & SPATIAL D-PAD FOCUS NAVIGATION
     ========================================================= */

  function clearHide() {
    if (state.hideTimer) clearTimeout(state.hideTimer);
    state.hideTimer = 0;
  }

  function clearSettingsHide() {
    if (state.settingsHideTimer) clearTimeout(state.settingsHideTimer);
    state.settingsHideTimer = 0;
  }

  function collapseSettingsPanel() {
    clearSettingsHide();
    state.refs?.settingsWrap?.classList.remove('expanded');
    state.overlay?.classList.remove('settings-open');
  }

  function cancelProgress() {
    if (state.progressFrame) cancelAnimationFrame(state.progressFrame);
    state.progressFrame = 0;
  }

  function visibleUI() {
    return !!(state.overlay && state.refs && !state.seeking && !document.hidden && !state.overlay.classList.contains('hidden-ui'));
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

  function collapseControlsUI() {
    const overlay = state.overlay;
    if (!overlay) return;
    clearHide();
    collapseSettingsPanel();
    overlay.classList.add('hidden-ui');
    cancelProgress();
  }

  function resetAutoHide() {
    const overlay = state.overlay;
    if (!overlay) return;
    clearHide();
    overlay.classList.remove('hidden-ui');
    queueProgress(true);

    if (state.seeking || document.hidden || overlay.classList.contains('settings-open')) return;
    state.hideTimer = setTimeout(() => {
      state.hideTimer = 0;
      if (state.overlay !== overlay || state.seeking || overlay.classList.contains('settings-open')) return;
      collapseControlsUI();
    }, CFG.hideDelay);
  }

  function addEvent(target, type, handler, options, abortCtrl = state.abort) {
    if (!target || !abortCtrl) return;
    try {
      target.addEventListener(type, handler, { ...(options || {}), signal: abortCtrl.signal });
    } catch (_) {}
  }

  function detachOverlay() {
    clearHide();
    clearSettingsHide();
    cancelProgress();
    stopAdWatcher();
    if (state.hudTimer) clearTimeout(state.hudTimer);
    if (state.okHoldTimer) clearTimeout(state.okHoldTimer);
    if (state.observerRaf) cancelAnimationFrame(state.observerRaf);
    state.hudTimer = 0;
    state.okHoldTimer = 0;
    state.observerRaf = 0;

    if (state.videoObserver) { state.videoObserver.disconnect(); state.videoObserver = null; }
    if (state.containerObserver) { state.containerObserver.disconnect(); state.containerObserver = null; }

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
    invalidateBestVideoCache();
  }

  function destroyController() {
    releaseWakeLock();
    stopAdWatcher();
    if (state.autoPlayPollTimer) { clearInterval(state.autoPlayPollTimer); state.autoPlayPollTimer = 0; }
    if (state.epScrollTimer) { clearTimeout(state.epScrollTimer); state.epScrollTimer = 0; }
    const video = state.video || state.lastActiveVideo;
    if (video) savePlaybackPosition(video, true);
    detachOverlay();
    restoreHostAndNativeControls();
    state.video = null;
    state.container = null;
  }

  function createOverlay(video, container, isPseudo = false) {
    if (!isVideo(video) || !container || !video.isConnected || isDisqualifiedVideo(video)) return;
    if (state.video === video && state.container === container && state.shadowHost?.isConnected) return;

    destroyController();
    loadPrefs();
    installHostStyles(container.ownerDocument || document);

    state.video = video;
    state.lastActiveVideo = video;
    state.container = container;
    state.seeking = false;
    state.focusedId = 'v280-play';

    suppressHostAndNativeControls(video, container, isPseudo);
    const currentTitle = refreshTitleCache(false);
    if (!video.paused) requestWakeLock();

    const initialSpeed = Math.round(clamp(Number(video.playbackRate) || 1, state.minSpeed, state.maxSpeed) * 100) / 100;
    state.savedSpeed = initialSpeed;
    CFG.seekStep = state.seekStep;

    const shadowHost = document.createElement('div');
    shadowHost.id = CFG.shadowHostId;
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    const shadowStyle = document.createElement('style');
    shadowStyle.textContent = SHADOW_UI_CSS;
    shadowRoot.appendChild(shadowStyle);

    const overlay = document.createElement('div');
    overlay.id = CFG.overlayId;

    overlay.innerHTML = `
      <div class="v280-absorber"></div>
      <div class="v280-debug${state.debugEnabled ? ' active' : ''}" id="v280-debug">
        <div class="v280-debug-head"><span id="v280-debug-head-txt">OMNIFORGE TV V28</span></div>
        <div class="v280-debug-body" id="v280-debug-body"></div>
      </div>
      <div class="v280-hud" id="v280-hud"></div>
      <div class="v280-spinner"></div>

      <div class="v280-top v280-ui">
        <div class="v280-titlebox"><span class="v280-title" id="v280-title"></span></div>
        <div class="v280-actions">
          <button class="v280-btn v280-btn-pill tv-focusable" id="v280-next-ep" data-tv-id="v280-next-ep" type="button" aria-label="ตอนถัดไป">
            ${icon('nextEp')}<span>EP ถัดไป</span>
          </button>
          <button class="v280-btn v280-btn-pill tv-focusable" id="v280-speed-btn" data-tv-id="v280-speed-btn" type="button" aria-label="ความเร็ว">
            ${icon('rocket')}<span id="v280-speed-label">${formatSpeed(initialSpeed)}</span>
          </button>
          <button class="v280-btn v280-btn-pill tv-focusable" id="v280-aspect" data-tv-id="v280-aspect" type="button" aria-label="สัดส่วนภาพ">
            ${icon('aspect')}<span id="v280-aspect-label">${ASPECT_MODES[state.aspectIndex].key.toUpperCase()}</span>
          </button>
          <div class="v280-settings-wrap" id="v280-settings-wrap">
            <button class="v280-btn tv-focusable" id="v280-settings-btn" data-tv-id="v280-settings-btn" type="button" aria-label="ตั้งค่า">${icon('settings')}</button>
            <div class="v280-settings-panel" id="v280-settings-panel">
              <div class="v280-settings-header">
                <span>ตั้งค่ารีโมท Android TV (กด ◀ ▶ ปรับค่า)</span>
              </div>
              <div class="v280-menu-row tv-focusable" data-tv-id="set-seek-step">
                <span class="v280-menu-label">เลื่อนเวลา ซ้าย/ขวา (±วิ)</span>
                <span class="v280-menu-val" id="val-seek-step">${state.seekStep} วิ</span>
              </div>
              <div class="v280-menu-row tv-focusable" data-tv-id="set-autofs">
                <span class="v280-menu-label">เต็มจออัตโนมัติเมื่อกด Play</span>
                <span class="v280-menu-val" id="val-autofs">${state.autoFsOnPlayEnabled ? 'เปิด' : 'ปิด'}</span>
              </div>
              <div class="v280-menu-row tv-focusable" data-tv-id="set-autonext">
                <span class="v280-menu-label">เล่น EP ถัดไปอัตโนมัติ</span>
                <span class="v280-menu-val" id="val-autonext">${state.autoNextEnabled ? 'เปิด' : 'ปิด'}</span>
              </div>
              <div class="v280-menu-row tv-focusable" data-tv-id="set-resume">
                <span class="v280-menu-label">รับชมต่อจากที่ดูค้างไว้</span>
                <span class="v280-menu-val" id="val-resume">${state.resumeEnabled ? 'เปิด' : 'ปิด'}</span>
              </div>
              <div class="v280-menu-row tv-focusable" data-tv-id="set-debug">
                <span class="v280-menu-label">แสดงสถานะระบบ (Debug)</span>
                <span class="v280-menu-val" id="val-debug">${state.debugEnabled ? 'เปิด' : 'ปิด'}</span>
              </div>
              <div class="v280-menu-row tv-focusable" data-tv-id="set-close">
                <span class="v280-menu-label">ปิดเมนูตั้งค่า</span>
                <span class="v280-menu-val">ตกลง (OK)</span>
              </div>
            </div>
          </div>
          <button class="v280-btn tv-focusable" id="v280-exit" data-tv-id="v280-exit" type="button" aria-label="ออกเต็มจอ">${icon('exit')}</button>
        </div>
      </div>

      <div class="v280-center v280-ui">
        <button class="v280-btn tv-focusable" id="v280-back" data-tv-id="v280-back" type="button" aria-label="ถอยหลัง">${icon('back')}</button>
        <button class="v280-btn v280-play tv-focusable" id="v280-play" data-tv-id="v280-play" type="button" aria-label="เล่น/หยุด">${icon(video.paused ? 'play' : 'pause')}</button>
        <button class="v280-btn tv-focusable" id="v280-next" data-tv-id="v280-next" type="button" aria-label="เดินหน้า">${icon('next')}</button>
      </div>

      <div class="v280-bottom v280-ui">
        <div class="v280-timeline-row">
          <span class="v280-time" id="v280-current">00:00</span>
          <input class="v280-range v280-slider tv-focusable" id="v280-timeline" data-tv-id="v280-timeline" type="range" min="0" max="100" value="0" step="0.1" aria-label="แถบเวลา">
          <span class="v280-time" id="v280-duration">LIVE</span>
        </div>
        <div class="v280-dpad-guide">
          <span><span class="v280-key-chip">▲ ▼ ◀ ▶</span> ย้ายตัวเลือกปุ่ม</span>
          <span><span class="v280-key-chip">OK</span> ยืนยัน / เล่น-หยุด</span>
          <span><span class="v280-key-chip">BACK</span> ซ่อนแถบ / ออกเต็มจอ</span>
        </div>
      </div>
    `;

    shadowRoot.appendChild(overlay);
    state.shadowHost = shadowHost;
    state.shadowRoot = shadowRoot;
    state.overlay = overlay;
    state.abort = new AbortController();

    const $ = sel => overlay.querySelector(sel);
    const absorber = $('.v280-absorber');
    const debugBox = $('#v280-debug');
    const debugHeadTxt = $('#v280-debug-head-txt');
    const debugBody = $('#v280-debug-body');
    const hud = $('#v280-hud');
    const nextEpBtn = $('#v280-next-ep');
    const playBtn = $('#v280-play');
    const backBtn = $('#v280-back');
    const nextBtn = $('#v280-next');
    const speedBtn = $('#v280-speed-btn');
    const speedLabel = $('#v280-speed-label');
    const settingsWrap = $('#v280-settings-wrap');
    const settingsBtn = $('#v280-settings-btn');
    const aspectBtn = $('#v280-aspect');
    const aspectLabel = $('#v280-aspect-label');
    const exitBtn = $('#v280-exit');
    const timeline = $('#v280-timeline');
    const currentLabel = $('#v280-current');
    const durationLabel = $('#v280-duration');
    const titleLabel = $('#v280-title');

    state.refs = {
      debugBox, debugHeadTxt, debugBody,
      title: titleLabel, current: currentLabel, duration: durationLabel,
      timeline, settingsWrap, speedLabel, aspectLabel, hud,
      lastSecond: -1, lastPercent: -1, lastDuration: -2
    };

    setTitleUI(currentTitle, state.currentEp);
    dbg('TV-UI', `Overlay mounted (${state.pseudoFullscreen ? 'Pseudo-FS' : 'Native-FS'})`);

    function syncSeekBadges() {
      const txts = overlay.querySelectorAll('.v280-seek-txt');
      const fontSize = state.seekStep >= 100 ? '5.8' : '7.5';
      for (let i = 0; i < txts.length; i++) {
        txts[i].textContent = String(state.seekStep);
        txts[i].setAttribute('font-size', fontSize);
      }
    }
    syncSeekBadges();

    /* =========================================================
       SPATIAL D-PAD FOCUS MATRIX (TOP / CENTER / BOTTOM / SETTINGS)
       ========================================================= */
    const TOP_ROW = ['v280-next-ep', 'v280-speed-btn', 'v280-aspect', 'v280-settings-btn', 'v280-exit'];
    const CENTER_ROW = ['v280-back', 'v280-play', 'v280-next'];
    const BOTTOM_ROW = ['v280-timeline'];
    const SETTINGS_LIST = ['set-seek-step', 'set-autofs', 'set-autonext', 'set-resume', 'set-debug', 'set-close'];

    function setTVFocus(id) {
      if (!overlay) return;
      const target = overlay.querySelector(`[data-tv-id="${id}"]`);
      if (!target) return;
      overlay.querySelectorAll('.tv-focused').forEach(el => el.classList.remove('tv-focused'));
      target.classList.add('tv-focused');
      state.focusedId = id;
    }

    function cycleSpeedTV(dir = 1) {
      if (!state.video) return;
      const steps = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];
      const cur = Number(state.video.playbackRate) || 1;
      let idx = steps.findIndex(s => Math.abs(s - cur) < 0.05);
      if (idx === -1) idx = 2;
      idx = (idx + dir + steps.length) % steps.length;
      const nextRate = steps[idx];
      state.savedSpeed = nextRate;
      try { state.video.playbackRate = nextRate; } catch (_) {}
      if (speedLabel) speedLabel.textContent = formatSpeed(nextRate);
      showHud(`ความเร็ว ${formatSpeed(nextRate)}`, 1000, 'rocket');
    }

    function togglePlayPauseTV() {
      if (!state.video) return;
      if (state.video.paused) {
        clickPlayerBigPlayButton();
        safePlay(state.video);
        showHud('เล่นวิดีโอ', 900, 'play');
      } else {
        state.video.pause();
        showHud('หยุดชั่วคราว', 900, 'pause');
      }
    }

    function seekRelativeTV(deltaSec) {
      if (!state.video) return;
      safeSeek(state.video, state.video.currentTime + deltaSec, false);
      showHud(deltaSec > 0 ? `+${deltaSec} วินาที` : `${deltaSec} วินาที`, 950, deltaSec > 0 ? 'next' : 'back');
      queueProgress(true);
    }

    function activateFocusedTVItem(id) {
      switch (id) {
        case 'v280-play': togglePlayPauseTV(); break;
        case 'v280-back': seekRelativeTV(-state.seekStep); break;
        case 'v280-next': seekRelativeTV(state.seekStep); break;
        case 'v280-next-ep': triggerSeamlessNextEpisode(true); break;
        case 'v280-speed-btn': cycleSpeedTV(1); break;
        case 'v280-aspect':
          if (state.video) {
            state.aspectIndex = (state.aspectIndex + 1) % ASPECT_MODES.length;
            applyAspectMode(state.video, state.aspectIndex);
            if (aspectLabel) aspectLabel.textContent = ASPECT_MODES[state.aspectIndex].key.toUpperCase();
            savePrefs();
            showHud(ASPECT_MODES[state.aspectIndex].label, 1100, 'aspect');
          }
          break;
        case 'v280-settings-btn':
          if (settingsWrap.classList.contains('expanded')) {
            collapseSettingsPanel();
            setTVFocus('v280-settings-btn');
          } else {
            settingsWrap.classList.add('expanded');
            overlay.classList.add('settings-open');
            setTVFocus('set-seek-step');
            clearHide();
          }
          break;
        case 'v280-exit':
          exitUniversalFullscreen();
          break;
        case 'v280-timeline':
          togglePlayPauseTV();
          break;
        // Settings Items
        case 'set-seek-step': adjustSettingTV('set-seek-step', 1); break;
        case 'set-autofs': adjustSettingTV('set-autofs', 1); break;
        case 'set-autonext': adjustSettingTV('set-autonext', 1); break;
        case 'set-resume': adjustSettingTV('set-resume', 1); break;
        case 'set-debug': adjustSettingTV('set-debug', 1); break;
        case 'set-close':
          collapseSettingsPanel();
          setTVFocus('v280-settings-btn');
          break;
      }
    }

    function adjustSettingTV(id, dir) {
      if (id === 'set-seek-step') {
        const presets = [10, 15, 30, 45, 60, 90, 120];
        let idx = presets.indexOf(state.seekStep);
        if (idx === -1) idx = 2;
        idx = (idx + dir + presets.length) % presets.length;
        state.seekStep = presets[idx];
        CFG.seekStep = state.seekStep;
        const el = overlay.querySelector('#val-seek-step');
        if (el) el.textContent = `${state.seekStep} วิ`;
        syncSeekBadges();
        savePrefs();
        showHud(`เลื่อนเวลา ±${state.seekStep} วินาที`, 900, 'next');
      } else if (id === 'set-autofs') {
        state.autoFsOnPlayEnabled = !state.autoFsOnPlayEnabled;
        const el = overlay.querySelector('#val-autofs');
        if (el) el.textContent = state.autoFsOnPlayEnabled ? 'เปิด' : 'ปิด';
        savePrefs();
      } else if (id === 'set-autonext') {
        state.autoNextEnabled = !state.autoNextEnabled;
        const el = overlay.querySelector('#val-autonext');
        if (el) el.textContent = state.autoNextEnabled ? 'เปิด' : 'ปิด';
        savePrefs();
      } else if (id === 'set-resume') {
        state.resumeEnabled = !state.resumeEnabled;
        const el = overlay.querySelector('#val-resume');
        if (el) el.textContent = state.resumeEnabled ? 'เปิด' : 'ปิด';
        savePrefs();
      } else if (id === 'set-debug') {
        state.debugEnabled = !state.debugEnabled;
        const el = overlay.querySelector('#val-debug');
        if (el) el.textContent = state.debugEnabled ? 'เปิด' : 'ปิด';
        renderDebugConsole();
        savePrefs();
      }
    }

    function moveDPadFocus(dir) {
      // กรณีเปิดหน้าต่าง Settings อยู่
      if (settingsWrap.classList.contains('expanded')) {
        const idx = SETTINGS_LIST.indexOf(state.focusedId);
        const curIdx = idx === -1 ? 0 : idx;
        if (dir === 'DOWN') {
          setTVFocus(SETTINGS_LIST[(curIdx + 1) % SETTINGS_LIST.length]);
        } else if (dir === 'UP') {
          setTVFocus(SETTINGS_LIST[(curIdx - 1 + SETTINGS_LIST.length) % SETTINGS_LIST.length]);
        } else if (dir === 'LEFT') {
          adjustSettingTV(SETTINGS_LIST[curIdx], -1);
        } else if (dir === 'RIGHT') {
          adjustSettingTV(SETTINGS_LIST[curIdx], 1);
        }
        return;
      }

      const cur = state.focusedId;

      // 1. แถวบนสุด (TOP_ROW)
      const topIdx = TOP_ROW.indexOf(cur);
      if (topIdx !== -1) {
        if (dir === 'LEFT') {
          setTVFocus(TOP_ROW[(topIdx - 1 + TOP_ROW.length) % TOP_ROW.length]);
        } else if (dir === 'RIGHT') {
          setTVFocus(TOP_ROW[(topIdx + 1) % TOP_ROW.length]);
        } else if (dir === 'DOWN') {
          // ย้ายลงแถวกลางตามตำแหน่งแนวนอนที่ใกล้เคียง
          if (topIdx <= 1) setTVFocus('v280-back');
          else if (topIdx === 2) setTVFocus('v280-play');
          else setTVFocus('v280-next');
        } else if (dir === 'UP') {
          setTVFocus('v280-timeline');
        }
        return;
      }

      // 2. แถวกลาง (CENTER_ROW)
      const midIdx = CENTER_ROW.indexOf(cur);
      if (midIdx !== -1) {
        if (dir === 'LEFT') {
          setTVFocus(CENTER_ROW[(midIdx - 1 + CENTER_ROW.length) % CENTER_ROW.length]);
        } else if (dir === 'RIGHT') {
          setTVFocus(CENTER_ROW[(midIdx + 1) % CENTER_ROW.length]);
        } else if (dir === 'UP') {
          if (midIdx === 0) setTVFocus('v280-next-ep');
          else if (midIdx === 1) setTVFocus('v280-aspect');
          else setTVFocus('v280-exit');
        } else if (dir === 'DOWN') {
          setTVFocus('v280-timeline');
        }
        return;
      }

      // 3. แถวล่างสุด (BOTTOM_ROW: Timeline Scrubber)
      if (cur === 'v280-timeline') {
        if (dir === 'LEFT') {
          seekRelativeTV(-CFG.timelineScrubSec);
        } else if (dir === 'RIGHT') {
          seekRelativeTV(CFG.timelineScrubSec);
        } else if (dir === 'UP') {
          setTVFocus('v280-play');
        } else if (dir === 'DOWN') {
          setTVFocus('v280-play');
        }
        return;
      }

      setTVFocus('v280-play');
    }

    function handleFullscreenRemoteKey(e) {
      if (!state.overlay || !state.video) return;
      if (isEditableTarget(e)) return;

      const tk = normalizeTVKey(e);
      if (!tk) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const isHidden = overlay.classList.contains('hidden-ui');

      if (tk === 'BACK') {
        if (settingsWrap.classList.contains('expanded')) {
          collapseSettingsPanel();
          setTVFocus('v280-settings-btn');
          resetAutoHide();
        } else if (!isHidden) {
          collapseControlsUI();
        } else {
          exitUniversalFullscreen();
        }
        return;
      }

      if (tk === 'FF') {
        seekRelativeTV(state.seekStep);
        return;
      }
      if (tk === 'RW') {
        seekRelativeTV(-state.seekStep);
        return;
      }
      if (tk === 'NEXT_EP') {
        triggerSeamlessNextEpisode(true);
        return;
      }

      if (tk === 'UP' || tk === 'DOWN' || tk === 'LEFT' || tk === 'RIGHT') {
        if (isHidden) {
          resetAutoHide();
          setTVFocus(state.focusedId || 'v280-play');
        } else {
          moveDPadFocus(tk);
          resetAutoHide();
        }
        return;
      }

      if (tk === 'OK') {
        if (isHidden) {
          // กด OK ตอนแถบเมนูซ่อนอยู่ -> เล่น/หยุดทันที พร้อมโชว์แถบควบคุม
          togglePlayPauseTV();
          setTVFocus('v280-play');
          resetAutoHide();
        } else {
          activateFocusedTVItem(state.focusedId || 'v280-play');
          if (state.overlay && !settingsWrap.classList.contains('expanded')) {
            resetAutoHide();
          }
        }
      }
    }

    addEvent(document, 'keydown', handleFullscreenRemoteKey, { capture: true });
    addEvent(window, 'keydown', handleFullscreenRemoteKey, { capture: true });

    // รองรับ Air-Mouse / Pointer Click บนหน้าจอทีวี
    addEvent(absorber, 'click', e => {
      e.stopPropagation();
      if (settingsWrap.classList.contains('expanded')) {
        collapseSettingsPanel();
        resetAutoHide();
        return;
      }
      if (overlay.classList.contains('hidden-ui')) {
        resetAutoHide();
        setTVFocus(state.focusedId || 'v280-play');
      } else {
        togglePlayPauseTV();
        resetAutoHide();
      }
    });

    addEvent(playBtn, 'click', e => { e.stopPropagation(); setTVFocus('v280-play'); togglePlayPauseTV(); resetAutoHide(); });
    addEvent(backBtn, 'click', e => { e.stopPropagation(); setTVFocus('v280-back'); seekRelativeTV(-state.seekStep); resetAutoHide(); });
    addEvent(nextBtn, 'click', e => { e.stopPropagation(); setTVFocus('v280-next'); seekRelativeTV(state.seekStep); resetAutoHide(); });
    addEvent(nextEpBtn, 'click', e => { e.stopPropagation(); setTVFocus('v280-next-ep'); triggerSeamlessNextEpisode(true); resetAutoHide(); });
    addEvent(speedBtn, 'click', e => { e.stopPropagation(); setTVFocus('v280-speed-btn'); cycleSpeedTV(1); resetAutoHide(); });
    addEvent(aspectBtn, 'click', e => { e.stopPropagation(); setTVFocus('v280-aspect'); activateFocusedTVItem('v280-aspect'); resetAutoHide(); });
    addEvent(settingsBtn, 'click', e => { e.stopPropagation(); activateFocusedTVItem('v280-settings-btn'); });
    addEvent(exitBtn, 'click', e => { e.stopPropagation(); exitUniversalFullscreen(); });

    SETTINGS_LIST.forEach(itemId => {
      const rowEl = overlay.querySelector(`[data-tv-id="${itemId}"]`);
      if (rowEl) {
        addEvent(rowEl, 'click', e => {
          e.stopPropagation();
          setTVFocus(itemId);
          activateFocusedTVItem(itemId);
        });
      }
    });

    addEvent(timeline, 'input', e => {
      e.stopPropagation();
      const pct = Number(timeline.value);
      styleRangeTrack(timeline, pct);
      if (Number.isFinite(state.video.duration) && state.video.duration > 0) {
        safeSeek(state.video, (pct / 100) * state.video.duration, false);
        queueProgress(true);
      }
      resetAutoHide();
    });

    /* --- Video Listeners & Observers --- */
    startAdWatcher();

    function updatePlayIcon() {
      if (state.overlay !== overlay || !state.video) return;
      playBtn.innerHTML = icon(state.video.paused ? 'play' : 'pause');
    }

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
        state.videoObserver.observe(v, { attributes: true, attributeFilter: ['controls', 'style', 'class', CFG.fitAttr] });
      } catch (_) {}
    }

    function bindVideoListeners(v) {
      try { state.videoAbort?.abort(); } catch (_) {}
      state.videoAbort = new AbortController();
      const vCtrl = state.videoAbort;
      observeVideoAttributes(v);

      addEvent(v, 'play', () => { updatePlayIcon(); requestWakeLock(); }, false, vCtrl);
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
      addEvent(v, 'waiting', () => { if (!v.paused) overlay.classList.add('buffering'); }, false, vCtrl);
      addEvent(v, 'canplay', () => { overlay.classList.remove('buffering'); }, false, vCtrl);
      addEvent(v, 'ended', () => {
        overlay.classList.remove('buffering');
        updatePlayIcon();
        releaseWakeLock();
        queueProgress(true);
        if (state.isSkippingAd || !Number.isFinite(v.duration) || v.duration < CFG.minMainVideoDurationSec) return;
        if (state.autoNextEnabled) triggerSeamlessNextEpisode(false);
        else savePlaybackPosition(v, true);
      }, false, vCtrl);
      addEvent(v, 'error', () => {
        const errCode = v.error ? v.error.code : 0;
        if (errCode === 3 || errCode === 2) attemptMediaErrorRecovery(v);
      }, false, vCtrl);
      addEvent(v, 'timeupdate', () => {
        if (trySkipPreRollAdSafely(v)) return;
        if (!v.seeking && !v.error && v.currentTime > 1) state.lastKnownGoodTime = v.currentTime;
        queueProgress();
        savePlaybackPosition(v, false);
        if (
          state.autoNextEnabled && !state.seeking && !state.isSkippingAd &&
          Number.isFinite(v.duration) && v.duration >= CFG.minMainVideoDurationSec &&
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
          try { if (state.savedSpeed && state.savedSpeed !== 1) v.playbackRate = state.savedSpeed; } catch (_) {}
          tryRestorePlaybackPosition(v);
          if (state.expectingSeamlessEpisode) {
            safePlay(v);
            clickPlayerBigPlayButton();
            setTimeout(() => {
              if (v && !v.paused) {
                state.expectingSeamlessEpisode = false;
                clearAutoFullscreenBridge();
              }
            }, 1200);
          }
        }
        applyAspectMode(v, state.aspectIndex);
        queueProgress(true);
      }, false, vCtrl);
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
          state.video = candidate;
          state.lastActiveVideo = candidate;
          state.cachedKeysList = null;
          candidate.controls = false;
          candidate.removeAttribute('controls');
          candidate.setAttribute(CFG.videoAttr, '1');
          applyAspectMode(candidate, state.aspectIndex);
          try { candidate.playbackRate = state.savedSpeed || 1; } catch (_) {}
          bindVideoListeners(candidate);
          tryRestorePlaybackPosition(candidate);
          updatePlayIcon();
          queueProgress(true);
        }
      });
    });

    try {
      state.containerObserver.observe(container, { childList: true, subtree: true });
      container.appendChild(shadowHost);
    } catch (_) {
      destroyController();
      return;
    }

    updatePlayIcon();
    updateProgress(true);
    setTVFocus('v280-play');
    resetAutoHide();
  }

  /* =========================================================
     8. GLOBAL ANDROID TV REMOTE TRIGGER (OUTSIDE FULLSCREEN)
        - กดปุ่ม OK (Enter) ค้าง 0.55 วิ หรือกด OK 2 ครั้งติดกัน
        - หรือกดปุ่มฟังก์ชัน (Menu / ContextMenu / PlayPause / F)
        - หรือเลื่อน D-Pad ไปกดปุ่ม "เต็มจอ TV" มุมขวาบน
     ========================================================= */

  function setupGlobalRemoteTrigger() {
    window.addEventListener('keydown', e => {
      if (state.destroyed || state.overlay) return;
      if (isEditableTarget(e)) return;

      const tk = normalizeTVKey(e);
      if (!tk) return;

      if (tk === 'FUNC_FS') {
        if (triggerRemoteFullscreenMode()) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      if (tk === 'OK' && !e.repeat) {
        const now = Date.now();
        // ตรวจสอบการกด OK 2 ครั้งติดกัน (Double-OK) เมื่อมีวิดีโออยู่บนหน้าเว็บ
        if (now - state.lastOkTapTs <= CFG.okDoubleMs) {
          state.lastOkTapTs = 0;
          if (state.okHoldTimer) { clearTimeout(state.okHoldTimer); state.okHoldTimer = 0; }
          if (triggerRemoteFullscreenMode()) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        state.lastOkTapTs = now;

        // ตรวจสอบการกด OK ค้างไว้ (Long-Press OK) เพื่อขยายเต็มจอทันที
        state.okHoldTriggered = false;
        if (state.okHoldTimer) clearTimeout(state.okHoldTimer);
        state.okHoldTimer = setTimeout(() => {
          state.okHoldTimer = 0;
          state.okHoldTriggered = true;
          triggerRemoteFullscreenMode();
        }, CFG.okLongPressMs);
      }
    }, true);

    window.addEventListener('keyup', e => {
      const tk = normalizeTVKey(e);
      if (tk === 'OK') {
        if (state.okHoldTimer) {
          clearTimeout(state.okHoldTimer);
          state.okHoldTimer = 0;
        }
        if (state.okHoldTriggered) {
          state.okHoldTriggered = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, true);

    // ดักจับปุ่ม Back ของรีโมท Android TV ที่เรียก browser history.back()
    window.addEventListener('popstate', () => {
      if (state.ignoreNextPopstate) {
        state.ignoreNextPopstate = false;
        return;
      }
      if (state.overlay || state.pseudoFullscreen || fullscreenElement()) {
        state.historySentinelPushed = false;
        exitUniversalFullscreen();
      }
    }, true);
  }

  /* =========================================================
     9. GLOBAL FULLSCREEN & MEDIA LISTENERS
     ========================================================= */

  function handleFullscreenChange() {
    if (state.destroyed) return;
    const fs = fullscreenElement();

    if (fs) {
      state.isEnteringFullscreen = false;
      removeTVLauncherButton();
      if (state.pseudoFullscreen) {
        state.pseudoFullscreen = false;
        state.container?.removeAttribute(CFG.pseudoAttr);
        document.documentElement.removeAttribute(CFG.lockScrollAttr);
      }
      if (window === window.top) {
        broadcastTopFsState(true);
        if (fs.hasAttribute(CFG.parentWrapFsAttr) || fs.hasAttribute('data-tmv280-top-anchor')) {
          setTopWindowIframeFullscreenLock(true);
          return;
        }
      }

      const video = isVideo(fs) ? fs : (bestVideo(fs) || state.lastActiveVideo);
      if (!video || isDisqualifiedVideo(video)) return;

      setTopWindowIframeFullscreenLock(false);
      const container = fs === video ? ensureSafeContainer(video) : fs;
      if (container && container !== video) createOverlay(video, container, false);
      return;
    }

    if (window === window.top) broadcastTopFsState(false);

    if (state.isTransitioningNextEp) {
      setTopWindowIframeFullscreenLock(false);
      releaseWakeLock();
      destroyController();
      return;
    }

    cleanupFullscreenSession(state.video || state.lastActiveVideo);
  }

  function isEligibleForAutoFsOnPlay(video) {
    if (!state.autoFsOnPlayEnabled) return false;
    if (!video || !video.isConnected || isDisqualifiedVideo(video)) return false;
    if (document.hidden || fullscreenElement() || state.pseudoFullscreen || state.overlay) return false;

    const now = Date.now();
    if (now - state.manualExitAt < 900) return false;
    if (state.suppressAutoFsUntilPlay && state.manualExitVideo === video) return false;

    const vArea = area(video);
    const winArea = window.innerWidth * window.innerHeight;
    const minArea = window !== window.top ? 10000 : 25000;
    if (vArea < minArea || (winArea > 0 && vArea / winArea < 0.08)) return false;

    const hasRecentGesture = (now - state.lastUserGestureTs) < 10000 || Boolean(navigator.userActivation?.isActive) || Boolean(state.armedFromAutoNext);
    if (video.muted && !hasRecentGesture) return false;
    return true;
  }

  function onMediaPause(e) {
    if (state.destroyed) return;
    const target = e.target;
    if (!isVideo(target)) return;
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
    ensureTVLauncherButton();

    if (e.type === 'loadedmetadata' || !state.cachedTitle) {
      unlockIframes();
      refreshTitleCache(false);
    }

    const fs = fullscreenElement();
    if (fs) {
      if (!state.overlay || state.video !== target) {
        const container = fs === target ? ensureSafeContainer(target) : fs;
        if (container && container !== target) createOverlay(target, container, false);
      }
      return;
    }

    if (state.pseudoFullscreen && state.overlay && state.video !== target) {
      const container = ensureSafeContainer(target);
      if (container) createOverlay(target, container, true);
      return;
    }

    if (state.isTransitioningNextEp) return;

    if (e.type === 'play' && !state.pseudoFullscreen && !state.overlay) {
      if (isEligibleForAutoFsOnPlay(target)) {
        state.manualExitVideo = null;
        state.suppressAutoFsUntilPlay = false;
        state.armedFromAutoNext = false;

        if (isVideoTrulyReadyForFullscreen(target) || Boolean(navigator.userActivation?.isActive)) {
          state.pendingPlayAutoFsVideo = null;
          state.pendingPlayAutoFsTs = 0;
          enterUniversalFullscreen(target);
        } else {
          state.pendingPlayAutoFsVideo = target;
          state.pendingPlayAutoFsTs = Date.now();
        }
      }
      return;
    }

    if ((e.type === 'loadeddata' || e.type === 'canplay' || e.type === 'playing') && !state.pseudoFullscreen && !state.overlay && !target.paused) {
      const isPendingReady = state.pendingPlayAutoFsVideo === target && (Date.now() - state.pendingPlayAutoFsTs) < 15000;
      if ((isPendingReady || (e.type === 'playing' && isEligibleForAutoFsOnPlay(target))) && isVideoTrulyReadyForFullscreen(target)) {
        state.pendingPlayAutoFsVideo = null;
        state.pendingPlayAutoFsTs = 0;
        state.manualExitVideo = null;
        state.suppressAutoFsUntilPlay = false;
        state.armedFromAutoNext = false;
        enterUniversalFullscreen(target);
      }
    }
  }

  function recordUserGesture(e) {
    state.lastUserGestureTs = Date.now();
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
    setupGlobalRemoteTrigger();

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
        if (!state.overlay.classList.contains('hidden-ui')) resetAutoHide();
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

    const onReady = () => {
      unlockIframes();
      refreshTitleCache(false);
      ensureTVLauncherButton();
      const bridge = consumeAutoFullscreenBridge();
      if (bridge) {
        if (bridge.ep) state.currentEp = bridge.ep;
        if (typeof bridge.speed === 'number') state.savedSpeed = bridge.speed;
        if (typeof bridge.aspectIndex === 'number') state.aspectIndex = bridge.aspectIndex;
        startNextEpisodeReadinessAutoPlay(bridge.ep || state.currentEp);
      }
    };

    if (document.readyState !== 'loading') onReady();
    else document.addEventListener('DOMContentLoaded', onReady, { once: true });
  }

  boot();
})();
