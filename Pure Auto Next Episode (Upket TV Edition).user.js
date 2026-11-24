// ==UserScript==
// @name         Pure Auto Next Episode (Upket Android TV Edition)
// @namespace    Violentmonkey Scripts
// @version      27.2.0
// @description  เปลี่ยน EP / ตอนถัดไปอัตโนมัติทันทีเมื่อวิดีโอจบ ทำงานได้ทันทีโดยไม่ต้องเข้าโหมดเต็มจอ เชื่อมต่อ MediaSession API ของเบราว์เซอร์หลัก
// @author       Expert Mode AI
// @match        *://*/*
// @allFrames    true
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const KEY = '__PURE_AUTO_NEXT_EP_V272__';
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
    minMainVideoDurationSec: 120,
    triggerBeforeEndSec: 0.5,
    ajaxTimeoutMs: 4000,
    bridgeKey: '__pure_autonext_bridge__',
    autoPlayMaxAttempts: 12,       // ลดจาก 18
    autoPlayIntervalMs: 900,
    playOnlyAttempts: 3            // ลอง play() อย่างเดียว 3 ครั้งก่อนใช้ปุ่ม
  };

  // ... (RX, selectors, state เหมือนเดิม ยกเว้น state เพิ่มตัวนี้) ...

  const state = {
    currentEp: '',
    lastAutoNextTriggerTs: 0,
    nearEndTriggeredSig: '',
    expectingNextEpisode: false,
    autoPlayPollTimer: 0,
    hasClickedBigPlay: false,
    autoPlayAttemptCount: 0,       // ใหม่
    lastPlayAttemptTs: 0           // ใหม่
  };

  // ... (isVideo, showToast, EP detection functions ทั้งหมดเหมือนเดิม) ...

  /* =========================================================
     3. ระบบเปลี่ยนตอนทันที & สั่งเล่นอัตโนมัติ (Fixed race)
  ========================================================= */
  function findMainPlayerIframe(doc = document) {
    // ... เหมือนเดิม ...
  }

  function clickBigPlayAndAutoPlay() {
    try {
      const videos = Array.from(document.querySelectorAll('video')).filter(v => !isDisqualifiedVideo(v));
      const anyPlaying = videos.some(v => !v.paused && !v.ended && v.readyState >= 2);

      // มีวิดีโอเล่นอยู่แล้ว → หยุดทันที
      if (anyPlaying) return true;

      const now = Date.now();
      // cooldown สั้น ๆ กันยิงถี่เกินไป
      if (now - state.lastPlayAttemptTs < 400) return false;
      state.lastPlayAttemptTs = now;
      state.autoPlayAttemptCount++;

      // ===== เฟส 1: ลอง play() โดยตรงอย่างเดียว (ไม่กดปุ่ม) =====
      let triedPlay = false;
      for (const v of videos) {
        if (v.paused && v.readyState >= 1) {
          triedPlay = true;
          const p = v.play();
          if (p?.catch) p.catch(() => {});
        }
      }

      // ถ้ายังอยู่ในช่วง play-only attempts → อย่าเพิ่งกดปุ่ม
      if (state.autoPlayAttemptCount <= CFG.playOnlyAttempts) {
        return false;
      }

      // ===== เฟส 2: last resort — กด Big Play เพียงครั้งเดียวต่อรอบ =====
      if (!state.hasClickedBigPlay && videos.every(v => v.paused)) {
        const btns = document.querySelectorAll(BIG_PLAY_SEL);
        for (const b of btns) {
          const rect = b.getBoundingClientRect();
          if (rect.width > 12 && rect.height > 12 && !b.dataset.pureAutoClicked) {
            b.dataset.pureAutoClicked = '1';
            state.hasClickedBigPlay = true;
            try { b.click(); } catch (_) {}
            break;
          }
        }
      }

      return false;
    } catch (_) {
      return false;
    }
  }

  function startAutoPlayAfterEpisodeSwitch(nextEpBadge) {
    if (state.autoPlayPollTimer) {
      clearInterval(state.autoPlayPollTimer);
      state.autoPlayPollTimer = 0;
    }

    state.expectingNextEpisode = true;
    state.hasClickedBigPlay = false;
    state.autoPlayAttemptCount = 0;
    state.lastPlayAttemptTs = 0;

    if (nextEpBadge) state.currentEp = nextEpBadge;

    try {
      sessionStorage.setItem(CFG.bridgeKey, JSON.stringify({ ep: state.currentEp, ts: Date.now() }));
    } catch (_) {}

    // รอบแรกช้ากว่าเดิมเล็กน้อย ให้อิฟเรม/เพลเยอร์โหลดก่อน
    setTimeout(() => {
      if (clickBigPlayAndAutoPlay()) {
        // เล่นแล้ว → ไม่ต้อง poll
        state.expectingNextEpisode = false;
        try { sessionStorage.removeItem(CFG.bridgeKey); } catch (_) {}
        return;
      }

      let attempts = 0;
      state.autoPlayPollTimer = setInterval(() => {
        attempts++;

        // เจอวิดีโอเล่นอยู่ → หยุดทันที
        const activeVid = Array.from(document.querySelectorAll('video'))
          .find(v => !isDisqualifiedVideo(v) && !v.paused && !v.ended && v.readyState >= 2);

        if (activeVid) {
          clearInterval(state.autoPlayPollTimer);
          state.autoPlayPollTimer = 0;
          state.expectingNextEpisode = false;
          try { sessionStorage.removeItem(CFG.bridgeKey); } catch (_) {}
          return;
        }

        if (attempts > CFG.autoPlayMaxAttempts) {
          clearInterval(state.autoPlayPollTimer);
          state.autoPlayPollTimer = 0;
          state.expectingNextEpisode = false;
          return;
        }

        clickBigPlayAndAutoPlay();

        // แจ้ง iframe ลูก (เฉพาะเมื่อยังไม่เล่น)
        try {
          document.querySelectorAll('iframe').forEach(f => {
            try {
              f.contentWindow?.postMessage({ type: 'pure_autonext_autoplay' }, '*');
            } catch (_) {}
          });
        } catch (_) {}
      }, CFG.autoPlayIntervalMs);
    }, 700);
  }

  // ... (tryAjaxSwapEpisodeInPlace, executeNextEpisode เหมือนเดิม) ...

  /* =========================================================
     4. ตรวจจับวิดีโอจบ & MediaSession (เหมือนเดิม)
  ========================================================= */
  function isDisqualifiedVideo(v) {
    // ... เหมือนเดิม ...
  }

  function bindMediaSession(video) {
    // ... เหมือนเดิม ...
  }

  function attachVideoListener(v) {
    if (!isVideo(v) || v.dataset.pureAutoNextAttached || isDisqualifiedVideo(v)) return;
    v.dataset.pureAutoNextAttached = 'true';

    v.addEventListener('play', () => {
      bindMediaSession(v);
    });

    // เพิ่ม: ถ้าเล่นสำเร็จระหว่างที่กำลังรอ autoplay → เคลียร์ state
    v.addEventListener('playing', () => {
      if (state.expectingNextEpisode) {
        if (state.autoPlayPollTimer) {
          clearInterval(state.autoPlayPollTimer);
          state.autoPlayPollTimer = 0;
        }
        state.expectingNextEpisode = false;
        try { sessionStorage.removeItem(CFG.bridgeKey); } catch (_) {}
      }
    });

    v.addEventListener('timeupdate', () => {
      if (!Number.isFinite(v.duration) || v.duration < CFG.minMainVideoDurationSec) return;
      if (v.currentTime >= v.duration - CFG.triggerBeforeEndSec) {
        const sig = `\( {v.currentSrc || v.src}| \){Math.round(v.duration)}`;
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

  // ... (scanVideos, message listener, keydown, boot เหมือนเดิม) ...

  function boot() {
    scanVideos();
    const rootNode = document.documentElement || document.body;
    if (rootNode) {
      const observer = new MutationObserver(() => scanVideos());
      observer.observe(rootNode, { childList: true, subtree: true });
    }

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