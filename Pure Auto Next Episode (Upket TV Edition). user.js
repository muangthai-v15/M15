// ==UserScript==
// @name         Pure Auto Next Episode (Upket Android TV Edition)
// @namespace    Violentmonkey Scripts
// @version      27.0.0
// @description  เปลี่ยน EP / ตอนถัดไปอัตโนมัติทันทีเมื่อวิดีโอจบ ทำงานได้ทันทีโดยไม่ต้องเข้าโหมดเต็มจอ เชื่อมต่อ MediaSession API ของเบราว์เซอร์หลัก
// @author       Expert Mode AI
// @match        *://*/*
// @allFrames    true
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const KEY = '__PURE_AUTO_NEXT_EP_V27__';
  const pageWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  if (window[KEY] || pageWin[KEY]) return;
  window[KEY] = true;
  try { pageWin[KEY] = true; } catch (_) {}

  // ข้าม Iframe โฆษณาขนาดจิ๋ว
  if (window !== window.top) {
    try {
      if (window.innerWidth > 0 && window.innerHeight > 0 && window.innerWidth < 40 && window.innerHeight < 40) {
        return;
      }
    } catch (_) {}
  }

  const CFG = {
    minMainVideoDurationSec: 120, // กรองคลิปโฆษณาสั้นๆ ออก (ขั้นต่ำ 2 นาที)
    triggerBeforeEndSec: 0.5,     // เปลี่ยนตอนทันทีเมื่อเหลือเวลา 0.5 วินาทีสุดท้าย
    ajaxTimeoutMs: 4000,
    bridgeKey: '__pure_autonext_bridge__'
  };

  const RX = {
    whitespace: /\s+/g,
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
  const BIG_PLAY_SEL = '.jw-icon-display, .jw-display-icon-container, .vjs-big-play-button, .plyr__control--overlaid, .dplayer-bezel-icon, .art-state, .fp-play';

  const state = {
    currentEp: '',
    lastAutoNextTriggerTs: 0,
    nearEndTriggeredSig: '',
    expectingNextEpisode: false,
    autoPlayPollTimer: 0
  };

  const isVideo = el => typeof HTMLVideoElement !== 'undefined' && (el instanceof HTMLVideoElement || el?.tagName === 'VIDEO');

  /* =========================================================
     1. ระบบแจ้งเตือนสั้นๆ แบบ Toast (ไม่รบกวนหน้าจอ TV)
  ========================================================= */
  function showToast(text) {
    if (window !== window.top) {
      try { window.top.postMessage({ type: 'pure_autonext_toast', text }, '*'); } catch (_) {}
      return;
    }
    let toast = document.getElementById('__pure_autonext_toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = '__pure_autonext_toast';
      toast.style.cssText = `
        position: fixed; top: 28px; right: 28px; z-index: 2147483647;
        background: rgba(15, 23, 42, 0.92); color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.5); border-radius: 12px;
        padding: 12px 20px; font-size: 16px; font-weight: 700;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65);
        pointer-events: none; transition: opacity 0.25s ease;
      `;
      (document.body || document.documentElement).appendChild(toast);
    }
    toast.textContent = text;
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }

  /* =========================================================
     2. ระบบตรวจจับเลขตอน (EP) และค้นหาปุ่มตอนถัดไปอัจฉริยะ
  ========================================================= */
  function normalizeEpNumber(numStr) {
    const n = Number(numStr);
    if (!Number.isFinite(n) || n <= 0 || n > 4000) return '';
    if ([240, 360, 480, 720, 1080, 1440, 2160].includes(n)) return '';
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
      if (qMatch) return normalizeEpNumber(qMatch[1]) || '';
      const pMatch = decoded.match(RX.epUrl);
      if (pMatch) return normalizeEpNumber(pMatch[1]) || '';
      const thaiUrlMatch = decoded.match(/(?:ตอน(?:ที่)?|ep)[-_\s]*0*(\d{1,4})(?!\s*[-–—~ถึง]\s*\d|\d)/i);
      if (thaiUrlMatch) return normalizeEpNumber(thaiUrlMatch[1]) || '';
    } catch (_) {}
    return '';
  }

  function extractEpFromElement(el) {
    if (!el || !(el instanceof Element)) return '';
    const attrNames = ['data-ep', 'data-episode', 'data-num', 'data-number', 'data-index', 'data-part', 'data-id', 'data-episode-id', 'data-chap'];
    for (const attr of attrNames) {
      const val = el.getAttribute(attr);
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
      for (const sel of activePrioritySelectors) {
        const nodes = doc.querySelectorAll(sel);
        for (const el of nodes) {
          if (el.children.length > 6) continue;
          const ep = extractEpFromElement(el);
          if (ep) return ep;
        }
      }

      const selects = doc.querySelectorAll('select');
      for (const sel of selects) {
        const opt = sel.selectedOptions?.[0];
        if (opt) {
          const ep = parseEpBadge(opt.textContent || '', true) || parseEpBadge(opt.value || '', false);
          if (ep) return ep;
        }
      }

      const urlEp = extractEpFromUrl(doc.location?.href || '');
      if (urlEp) return urlEp;

      const rawTitle = doc.title || '';
      if (!/EP\.\s*\d+\s*[-–—~ถึง]|ตอนล่าสุด|EP\.\d+-\d+/i.test(rawTitle)) {
        const titleEp = parseEpBadge(rawTitle, false);
        if (titleEp) return titleEp;
      }
    } catch (_) {}
    return '';
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
        url.pathname = pathname.replace(epSlugMatch[0], `${prefix}${keyword}${targetNum}`);
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

  function findNextEpisodeTarget(doc = document, currentEpStr = '') {
    const liveDetected = detectActiveEpFromDOM(doc);
    const curEpBadge = liveDetected || currentEpStr || state.currentEp || '';
    if (liveDetected) state.currentEp = liveDetected;

    const curNum = getNumericEp(curEpBadge);
    const targetNum = Number.isFinite(curNum) ? curNum + 1 : NaN;

    // 1. ค้นหาจากปุ่มที่มี data-ep หรือ cyber-ep-btn
    try {
      const dataEpBtns = Array.from(doc.querySelectorAll('[data-ep], .cyber-ep-btn, button[data-ep]'));
      const confident = [];
      for (const el of dataEpBtns) {
        const raw = el.getAttribute('data-ep') || el.getAttribute('data-episode') || '';
        let n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) n = getNumericEp(extractEpFromElement(el));
        if (!Number.isFinite(n) || n <= 0 || n > 5000 || RX.resolutionGuard.test(String(n))) continue;
        confident.push({ el, n, ep: normalizeEpNumber(n) });
      }
      if (confident.length >= 2) {
        confident.sort((a, b) => a.n - b.n);
        const match = Number.isFinite(targetNum)
          ? confident.find(c => c.n === targetNum)
          : (Number.isFinite(curNum) ? confident.find(c => c.n > curNum) : null);
        if (match) {
          const clickEl = match.el.querySelector('a, button') || match.el;
          return {
            type: 'element',
            element: clickEl,
            href: clickEl.getAttribute?.('href') || match.el.getAttribute?.('href') || '',
            dataSrc: match.el.getAttribute('data-src') || clickEl.getAttribute?.('data-src') || '',
            ep: match.ep,
            targetNum: match.n
          };
        }
      }
    } catch (_) {}

    // 2. ค้นหาจาก <select>
    const selects = doc.querySelectorAll('select');
    for (const sel of selects) {
      const opts = Array.from(sel.options || []);
      if (opts.length < 2) continue;
      if (Number.isFinite(targetNum)) {
        const optMatch = opts.find(o => getNumericEp(parseEpBadge(o.textContent || '', true) || parseEpBadge(o.value || '', false)) === targetNum);
        if (optMatch) return { type: 'select', select: sel, option: optMatch, ep: normalizeEpNumber(targetNum), targetNum };
      }
      const idx = sel.selectedIndex;
      if (idx >= 0 && idx + 1 < opts.length) {
        const nextOpt = opts[idx + 1];
        const nextEp = parseEpBadge(nextOpt.textContent || '', true) || parseEpBadge(nextOpt.value || '', false);
        if (nextEp) return { type: 'select', select: sel, option: nextOpt, ep: nextEp, targetNum: getNumericEp(nextEp) };
      }
    }

    // 3. ค้นหาจากรายการตอนทั่วไปในหน้าเว็บ
    const candidates = doc.querySelectorAll(
      'a, button, li[onclick], [role="button"], [data-ep], [data-episode], ' +
      '.ep-item, .episode-item, .halim-episode, .episode, span.episode, div.episode, ' +
      '[class*="episode"], [class*="ep-item"], [class*="ep_item"], [class*="eps-"]'
    );

    const epElements = [];
    for (const el of candidates) {
      if (el.children.length > 6) continue;
      const txt = (el.textContent || '').replace(RX.whitespace, ' ').trim();
      if (txt.length > 80) continue;

      let ep = extractEpFromElement(el);
      if (!ep && /ตอน(?:ที่)?\s*\d+/i.test(txt)) ep = parseEpBadge(txt, true);
      if (!ep) continue;

      const n = getNumericEp(ep);
      if (!Number.isFinite(n) || n <= 0) continue;
      epElements.push({ el, ep, n });
    }

    epElements.sort((a, b) => a.n - b.n);

    if (Number.isFinite(targetNum)) {
      const exact = epElements.find(item => item.n === targetNum);
      if (exact) {
        const clickEl = exact.el.querySelector('a, button') || exact.el;
        return {
          type: 'element',
          element: clickEl,
          href: clickEl.getAttribute?.('href') || exact.el.getAttribute?.('href') || '',
          ep: normalizeEpNumber(targetNum),
          targetNum
        };
      }
    }

    if (Number.isFinite(curNum) && epElements.length >= 2) {
      const nextHigher = epElements.find(item => item.n > curNum);
      if (nextHigher) {
        const clickEl = nextHigher.el.querySelector('a, button') || nextHigher.el;
        return {
          type: 'element',
          element: clickEl,
          href: clickEl.getAttribute?.('href') || nextHigher.el.getAttribute?.('href') || '',
          ep: nextHigher.ep,
          targetNum: nextHigher.n
        };
      }
    }

    // 4. ค้นหาจากปุ่มคำว่า "ตอนถัดไป / Next"
    for (const el of candidates) {
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

    // 5. สร้าง URL ตอนถัดไปอัตโนมัติจากแพทเทิร์นลิงก์ปัจจุบัน
    if (Number.isFinite(targetNum)) {
      const synthesizedUrl = synthesizeNextUrlPattern(location.href, targetNum);
      if (synthesizedUrl) {
        return { type: 'url_fallback', href: synthesizedUrl, ep: normalizeEpNumber(targetNum), targetNum };
      }
    }

    return null;
  }

  /* =========================================================
     3. ระบบเปลี่ยนตอนทันที & สั่งเล่นอัตโนมัติในตอนใหม่ (ไม่ต้องเต็มจอ)
  ========================================================= */
  function findMainPlayerIframe(doc = document) {
    const playerZones = doc.querySelectorAll(PLAYER_AREA_SEL);
    for (const zone of playerZones) {
      const f = zone.querySelector('iframe[src], iframe[data-src], iframe[data-lazy-src]');
      if (f && !RX.adBannerHint.test(f.getAttribute('src') || f.getAttribute('data-src') || '')) return f;
    }
    let bestF = null, bestA = 0;
    for (const f of doc.querySelectorAll('iframe')) {
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

  function clickBigPlayAndAutoPlay() {
    try {
      const btns = document.querySelectorAll(BIG_PLAY_SEL);
      for (const b of btns) {
        try { b.click(); } catch (_) {}
      }
      const videos = document.querySelectorAll('video');
      for (const v of videos) {
        if (!isDisqualifiedVideo(v) && v.paused) {
          const p = v.play();
          if (p?.catch) p.catch(() => {});
        }
      }
    } catch (_) {}
  }

  function startAutoPlayAfterEpisodeSwitch(nextEpBadge) {
    if (state.autoPlayPollTimer) clearInterval(state.autoPlayPollTimer);
    state.expectingNextEpisode = true;
    if (nextEpBadge) state.currentEp = nextEpBadge;

    try {
      sessionStorage.setItem(CFG.bridgeKey, JSON.stringify({ ep: state.currentEp, ts: Date.now() }));
    } catch (_) {}

    let attempts = 0;
    state.autoPlayPollTimer = setInterval(() => {
      attempts++;
      if (attempts > 30) {
        clearInterval(state.autoPlayPollTimer);
        state.autoPlayPollTimer = 0;
        state.expectingNextEpisode = false;
        return;
      }

      clickBigPlayAndAutoPlay();

      // แจ้งเตือน Iframe ลูกให้กด Play อัตโนมัติด้วย
      try {
        document.querySelectorAll('iframe').forEach(f => {
          f.contentWindow?.postMessage({ type: 'pure_autonext_autoplay' }, '*');
        });
      } catch (_) {}

      const activeVid = Array.from(document.querySelectorAll('video')).find(v => !isDisqualifiedVideo(v) && !v.paused && v.currentTime > 0.5);
      if (activeVid) {
        clearInterval(state.autoPlayPollTimer);
        state.autoPlayPollTimer = 0;
        state.expectingNextEpisode = false;
        try { sessionStorage.removeItem(CFG.bridgeKey); } catch (_) {}
      }
    }, 450);
  }

  async function tryAjaxSwapEpisodeInPlace(targetUrl, nextEpBadge) {
    if (!targetUrl || targetUrl === '#' || targetUrl.startsWith('javascript:')) return false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CFG.ajaxTimeoutMs);
    try {
      const absUrl = new URL(targetUrl, location.href).href;
      if (absUrl === location.href) return false;

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

      const nextDoc = new DOMParser().parseFromString(html, 'text/html');
      const nextIframe = findMainPlayerIframe(nextDoc);
      const curIframe = findMainPlayerIframe(document);

      if (nextIframe && curIframe) {
        const rawNextSrc = nextIframe.getAttribute('src') || nextIframe.getAttribute('data-src') || nextIframe.getAttribute('data-lazy-src') || '';
        if (rawNextSrc) {
          const nextIframeUrl = new URL(rawNextSrc, absUrl).href;
          try { history.pushState({ ep: nextEpBadge }, nextDoc.title || document.title, absUrl); } catch (_) {}
          if (nextDoc.title) document.title = nextDoc.title;
          curIframe.src = nextIframeUrl;
          startAutoPlayAfterEpisodeSwitch(nextEpBadge);
          return true;
        }
      }
    } catch (_) {} finally {
      clearTimeout(timeoutId);
    }
    return false;
  }

  async function executeNextEpisode(preferredEp = '') {
    if (window !== window.top) {
      try {
        window.top.postMessage({
          type: 'pure_autonext_trigger',
          currentEp: preferredEp || state.currentEp || ''
        }, '*');
      } catch (_) {}
      return;
    }

    const now = Date.now();
    if (now - state.lastAutoNextTriggerTs < 4000) return;

    const target = findNextEpisodeTarget(document, preferredEp || state.currentEp);
    if (!target) {
      showToast('ไม่พบตอนถัดไป (อาจเป็นตอนล่าสุดแล้ว)');
      return;
    }

    state.lastAutoNextTriggerTs = now;
    const nextEpBadge = target.ep || 'ตอนถัดไป';
    const targetNum = target.targetNum || getNumericEp(nextEpBadge);
    state.currentEp = nextEpBadge;

    showToast(`กำลังเปลี่ยนไปยัง ${nextEpBadge}...`);

    try {
      if (target.type === 'select' && target.select && target.option) {
        const optVal = target.option.value || '';
        if (/^https?:\/\//i.test(optVal) || optVal.startsWith('/')) {
          if (await tryAjaxSwapEpisodeInPlace(optVal, nextEpBadge)) return;
        }
        target.select.value = target.option.value;
        target.option.selected = true;
        target.select.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (target.type === 'url_fallback' && target.href) {
        if (await tryAjaxSwapEpisodeInPlace(target.href, nextEpBadge)) return;
        try { sessionStorage.setItem(CFG.bridgeKey, JSON.stringify({ ep: nextEpBadge, ts: Date.now() })); } catch (_) {}
        location.href = target.href;
        return;
      } else if (target.type === 'element' && target.element) {
        const href = target.href || target.element.getAttribute?.('href') || '';
        const dataSrc = target.dataSrc || target.element.getAttribute?.('data-src') || '';
        const hasInlineJs = target.element.hasAttribute?.('onclick') || href.startsWith('javascript:');

        // สลับ src ของ Iframe โดยตรง (รองรับเว็บ SPA สมัยใหม่)
        if (dataSrc && /^https?:\/\//i.test(dataSrc)) {
          const playerIframe = findMainPlayerIframe(document);
          if (playerIframe) {
            try {
              document.querySelectorAll('.cyber-ep-btn, [data-ep]').forEach(b => {
                b.classList.remove('active');
                if (getNumericEp(extractEpFromElement(b)) === targetNum) b.classList.add('active');
              });
            } catch (_) {}
            playerIframe.src = dataSrc;
            startAutoPlayAfterEpisodeSwitch(nextEpBadge);
            return;
          }
        }

        if (href && href !== '#' && !hasInlineJs) {
          if (await tryAjaxSwapEpisodeInPlace(href, nextEpBadge)) return;
        }

        try { sessionStorage.setItem(CFG.bridgeKey, JSON.stringify({ ep: nextEpBadge, ts: Date.now() })); } catch (_) {}
        target.element.click();
      }
    } catch (_) {}

    startAutoPlayAfterEpisodeSwitch(nextEpBadge);
  }

  /* =========================================================
     4. ตรวจจับวิดีโอจบ & เชื่อมต่อตัวควบคุมเบราว์เซอร์หลัก (MediaSession)
  ========================================================= */
  function isDisqualifiedVideo(v) {
    if (!isVideo(v)) return true;
    try {
      if (v.closest('a[href]')) return true;
      const src = `${v.currentSrc || ''} ${v.src || ''}`;
      if (RX.adBannerHint.test(src)) return true;
      const adParent = v.closest('[class*="banner"], [id*="banner"], [class*="ads"], [id*="ads"], .widget, header, nav, footer');
      if (adParent && !adParent.matches(PLAYER_AREA_SEL)) return true;
    } catch (_) {}
    return false;
  }

  function bindMediaSession(video) {
    if (!('mediaSession' in navigator)) return;
    try {
      // เชื่อมปุ่ม Next Track บนตัวควบคุมสื่อของ Upket Browser / รีโมท Android TV
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        executeNextEpisode(state.currentEp);
      });
      navigator.mediaSession.setActionHandler('play', () => {
        video.play().catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        video.pause();
      });
    } catch (_) {}
  }

  function attachVideoListener(v) {
    if (!isVideo(v) || v.dataset.pureAutoNextAttached || isDisqualifiedVideo(v)) return;
    v.dataset.pureAutoNextAttached = 'true';

    v.addEventListener('play', () => {
      bindMediaSession(v);
    });

    v.addEventListener('timeupdate', () => {
      if (!Number.isFinite(v.duration) || v.duration < CFG.minMainVideoDurationSec) return;
      if (v.currentTime >= v.duration - CFG.triggerBeforeEndSec) {
        const sig = `${v.currentSrc || v.src}|${Math.round(v.duration)}`;
        if (state.nearEndTriggeredSig !== sig) {
          state.nearEndTriggeredSig = sig;
          executeNextEpisode(state.currentEp);
        }
      }
    });

    v.addEventListener('ended', () => {
      if (!Number.isFinite(v.duration) || v.duration < CFG.minMainVideoDurationSec) return;
      executeNextEpisode(state.currentEp);
    });
  }

  function scanVideos() {
    document.querySelectorAll('video').forEach(attachVideoListener);
  }

  /* =========================================================
     5. การสื่อสารข้าม Iframe & ปุ่มรีโมท Android TV
  ========================================================= */
  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'pure_autonext_trigger' && window === window.top) {
      executeNextEpisode(data.currentEp || '');
    } else if (data.type === 'pure_autonext_toast' && window === window.top) {
      showToast(data.text);
    } else if (data.type === 'pure_autonext_autoplay') {
      clickBigPlayAndAutoPlay();
    }
  });

  // รองรับปุ่ม MediaTrackNext บนรีโมท Android TV
  window.addEventListener('keydown', e => {
    if (e.key === 'MediaTrackNext' || e.keyCode === 176) {
      e.preventDefault();
      executeNextEpisode(state.currentEp);
    }
  }, true);

  function boot() {
    scanVideos();
    const observer = new MutationObserver(() => scanVideos());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // กรณีเพิ่งเปลี่ยนหน้าไปยังตอนใหม่ ให้สั่งเล่นวิดีโออัตโนมัติทันทีโดยไม่ต้องกดเอง
    try {
      const raw = sessionStorage.getItem(CFG.bridgeKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Date.now() - data.ts < 15000) {
          startAutoPlayAfterEpisodeSwitch(data.ep || '');
        } else {
          sessionStorage.removeItem(CFG.bridgeKey);
        }
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();