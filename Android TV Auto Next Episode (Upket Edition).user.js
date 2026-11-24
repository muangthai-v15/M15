// ==UserScript==
// @name         Android TV Auto Next Episode (Upket Pro Edition)
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  ระบบเปลี่ยนตอนถัดไปอัตโนมัติสำหรับเบราว์เซอร์ Android TV (Upket Browser) เชื่อมต่อ MediaSession API และรองรับรีโมททีวี
// @author       Expert Mode AI
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @run-at       document-idle
// @allFrames    true
// ==/UserScript==

(function () {
    'use strict';

    /**
     * ============================================================================
     * CONFIGURATION & STATE MANAGEMENT (ตั้งค่าระบบและสถานะ)
     * ============================================================================
     */
    const CONFIG = {
        countdownSeconds: 5,          // นับถอยหลังกี่วินาทีก่อนเปลี่ยนตอน
        triggerBeforeEndSec: 1.5,     // เริ่มทำงานก่อนจบจริงกี่วินาที (กันจอดำ/ค้าง)
        minVideoDuration: 60,         // ความยาววิดีโอขั้นต่ำ (วินาที) เพื่อข้ามโฆษณาสั้นๆ
        autoFullscreen: true,         // พยายามขยายเต็มจออัตโนมัติเมื่อขึ้นตอนใหม่
        debugMode: false              // แสดง Log ใน Console
    };

    const STATE = {
        isAutoNextEnabled: true,
        isCountingDown: false,
        countdownTimer: null,
        activeVideo: null,
        nextTarget: null,
        osdElement: null,
        isIframe: window.self !== window.top
    };

    // โหลดค่าที่ผู้ใช้เคยตั้งไว้ (หากเบราว์เซอร์รองรับ GM_getValue หรือใช้ localStorage)
    try {
        const savedState = localStorage.getItem('tv_auto_next_enabled');
        if (savedState !== null) {
            STATE.isAutoNextEnabled = savedState === 'true';
        }
    } catch (e) {}

    function log(...args) {
        if (CONFIG.debugMode) console.log('[TV-AutoNext]', ...args);
    }

    /**
     * ============================================================================
     * SMART NEXT EPISODE DETECTOR (ระบบค้นหาปุ่ม/ลิงก์ตอนถัดไปอัจฉริยะ)
     * ============================================================================
     */
    const NextEpisodeFinder = {
        // คำสำคัญที่ใช้ระบุปุ่มตอนถัดไป (เรียงตามความแม่นยำ)
        keywords: [
            'ตอนถัดไป', 'ตอนต่อไป', 'ตอนหน้า', 'ep ถัดไป', 'ep ต่อไป',
            'next episode', 'next ep', 'next video', 'play next',
            'ถัดไป', 'ต่อไป', 'next', '>>', '›'
        ],

        // ค้นหาจาก Selector มาตรฐานของ Player ยอดนิยม
        knownSelectors: [
            '.jw-icon-next', '.vjs-next-button', '.plyr__controls__item[data-plyr="next"]',
            '.btn-next', '.next-ep', '.next-episode', '#next-episode', '#btn-next',
            'a[rel="next"]', 'button[aria-label*="Next" i]', 'a[title*="ตอนถัดไป" i]',
            'a[title*="Next" i]', '.ep-next', '.episode-next'
        ],

        find() {
            // 1. ค้นหาจาก Known Selectors ก่อน
            for (const selector of this.knownSelectors) {
                const el = document.querySelector(selector);
                if (this.isValidElement(el)) {
                    log('พบปุ่มจาก Selector:', selector);
                    return { type: 'element', target: el, label: el.innerText.trim() || 'ตอนถัดไป' };
                }
            }

            // 2. ค้นหาจากข้อความและ Attribute ในปุ่ม/ลิงก์ทั้งหมด
            const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], .btn, li'));
            let bestMatch = null;
            let highestScore = 0;

            for (const el of candidates) {
                if (!this.isValidElement(el)) continue;

                const text = (el.innerText || el.textContent || '').trim().toLowerCase();
                const title = (el.getAttribute('title') || el.getAttribute('aria-label') || '').trim().toLowerCase();
                const combined = `${text} ${title}`;

                // ข้ามข้อความที่ยาวเกินไป (น่าจะเป็นเนื้อหาบทความไม่ใช่ปุ่ม)
                if (text.length > 35) continue;

                // ข้ามคำที่สื่อถึงการย้อนกลับ
                if (/ก่อนหน้า|ย้อนกลับ|prev|previous|back/i.test(combined)) continue;

                let score = 0;
                for (let i = 0; i < this.keywords.length; i++) {
                    const kw = this.keywords[i];
                    if (text === kw || title === kw) {
                        score += (50 - i); // ตรงเป๊ะได้คะแนนสูงสุด
                    } else if (combined.includes(kw)) {
                        score += (25 - i);
                    }
                }

                // โบนัสพิเศษถ้าเป็นลิงก์ที่มี href เปลี่ยนหน้าได้จริง
                if (el.tagName === 'A' && el.href && !el.href.startsWith('javascript:')) {
                    score += 5;
                }

                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = el;
                }
            }

            if (bestMatch && highestScore >= 15) {
                log('พบปุ่มจาก Keyword:', bestMatch, 'Score:', highestScore);
                return {
                    type: 'element',
                    target: bestMatch,
                    label: bestMatch.innerText.trim() || bestMatch.getAttribute('title') || 'ตอนถัดไป'
                };
            }

            // 3. ค้นหาจากเลขตอนปัจจุบัน + 1 (เช่น กำลังดู EP.5 -> หาลิงก์ EP.6)
            const currentEpMatch = window.location.href.match(/(?:ep|episode|ตอน|part|p)[-_./=]?(\d+)/i) ||
                                   document.title.match(/(?:ep|episode|ตอนที่|ตอน)[.\s:-]*(\d+)/i);

            if (currentEpMatch) {
                const currentNum = parseInt(currentEpMatch[1], 10);
                const nextNum = currentNum + 1;
                const nextNumPadded = String(nextNum).padStart(currentEpMatch[1].length, '0');

                const links = Array.from(document.querySelectorAll('a[href]'));
                for (const link of links) {
                    if (!this.isValidElement(link)) continue;
                    const linkText = link.innerText.trim();
                    const href = link.href;

                    // เช็คว่าข้อความของปุ่มคือเลขตอนถัดไปตรงๆ เช่น "6", "06", "EP 6", "ตอนที่ 6"
                    const textRegex = new RegExp(`^(?:ep|episode|ตอนที่|ตอน)?[.\\s:-]*0*${nextNum}$`, 'i');
                    if (textRegex.test(linkText)) {
                        log('พบลิงก์จากเลขตอนถัดไป:', linkText);
                        return { type: 'element', target: link, label: `ตอนที่ ${nextNum}` };
                    }

                    // เช็คจาก URL Pattern
                    const urlRegex = new RegExp(`(?:ep|episode|ตอน|part|p)[-_./=]?0*${nextNum}(?:[^0-9]|$)`, 'i');
                    if (urlRegex.test(href) && href !== window.location.href) {
                        log('พบลิงก์จาก URL ตอนถัดไป:', href);
                        return { type: 'element', target: link, label: `ตอนที่ ${nextNum}` };
                    }
                }
            }

            return null;
        },

        isValidElement(el) {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            if (el.disabled || el.classList.contains('disabled')) return false;
            return true;
        }
    };

    /**
     * ============================================================================
     * TV OSD USER INTERFACE (หน้าต่างแจ้งเตือนสำหรับหน้าจอ TV และรีโมท)
     * ============================================================================
     */
    const TVOverlayUI = {
        init() {
            if (STATE.isIframe || document.getElementById('tv-autonext-osd')) return;

            const container = document.createElement('div');
            container.id = 'tv-autonext-osd';
            container.style.cssText = `
                position: fixed;
                bottom: 48px;
                right: 48px;
                z-index: 2147483647;
                background: rgba(15, 23, 42, 0.92);
                backdrop-filter: blur(12px);
                border: 2px solid rgba(56, 189, 248, 0.6);
                border-radius: 16px;
                padding: 20px 28px;
                color: #f8fafc;
                font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.75);
                display: none;
                flex-direction: column;
                gap: 14px;
                min-width: 340px;
                max-width: 440px;
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            `;

            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 10px #38bdf8;"></span>
                        <span style="font-size: 14px; font-weight: 600; color: #38bdf8; letter-spacing: 0.5px; text-transform: uppercase;">Upket TV Auto-Next</span>
                    </div>
                    <span id="tv-osd-timer" style="font-size: 20px; font-weight: 800; color: #ffffff; background: rgba(56, 189, 248, 0.2); padding: 2px 10px; border-radius: 8px;">5s</span>
                </div>
                <div id="tv-osd-title" style="font-size: 18px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    กำลังเตรียมเล่นตอนถัดไป...
                </div>
                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.15); border-radius: 99px; overflow: hidden;">
                    <div id="tv-osd-progress" style="width: 100%; height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8); transition: width 1s linear;"></div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 4px;">
                    <button id="tv-osd-btn-now" tabindex="0" style="
                        flex: 1; padding: 10px 16px; border-radius: 10px; border: 2px solid transparent;
                        background: #0284c7; color: white; font-size: 15px; font-weight: 700; cursor: pointer;
                        outline: none; transition: transform 0.15s, border-color 0.15s;
                    ">เล่นทันที (OK)</button>
                    <button id="tv-osd-btn-cancel" tabindex="0" style="
                        flex: 1; padding: 10px 16px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.2);
                        background: rgba(255,255,255,0.1); color: #cbd5e1; font-size: 15px; font-weight: 600; cursor: pointer;
                        outline: none; transition: transform 0.15s, border-color 0.15s;
                    ">ยกเลิก (Back)</button>
                </div>
            `;

            document.body.appendChild(container);
            STATE.osdElement = container;

            // เพิ่ม Focus Ring สำหรับรีโมท TV (D-Pad)
            const btns = container.querySelectorAll('button');
            btns.forEach(btn => {
                btn.addEventListener('focus', () => {
                    btn.style.borderColor = '#facc15';
                    btn.style.transform = 'scale(1.04)';
                });
                btn.addEventListener('blur', () => {
                    btn.style.borderColor = btn.id === 'tv-osd-btn-now' ? 'transparent' : 'rgba(255,255,255,0.2)';
                    btn.style.transform = 'scale(1)';
                });
            });

            document.getElementById('tv-osd-btn-now').addEventListener('click', () => {
                Controller.executeNext();
            });

            document.getElementById('tv-osd-btn-cancel').addEventListener('click', () => {
                Controller.cancelCountdown();
            });
        },

        showCountdown(label, seconds, maxSeconds) {
            this.init();
            if (!STATE.osdElement) return;

            STATE.osdElement.style.display = 'flex';
            document.getElementById('tv-osd-title').textContent = `ถัดไป: ${label}`;
            document.getElementById('tv-osd-timer').textContent = `${seconds}s`;

            const pct = Math.max(0, (seconds / maxSeconds) * 100);
            document.getElementById('tv-osd-progress').style.width = `${pct}%`;

            // โฟกัสปุ่ม "เล่นทันที" อัตโนมัติเพื่อให้กดปุ่ม Enter/OK บนรีโมททีวีได้เลย
            const nowBtn = document.getElementById('tv-osd-btn-now');
            if (document.activeElement !== nowBtn && document.activeElement !== document.getElementById('tv-osd-btn-cancel')) {
                nowBtn.focus();
            }
        },

        hide() {
            if (STATE.osdElement) {
                STATE.osdElement.style.display = 'none';
            }
        },

        showToast(message) {
            if (STATE.isIframe) return;
            let toast = document.getElementById('tv-autonext-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'tv-autonext-toast';
                toast.style.cssText = `
                    position: fixed; top: 32px; right: 32px; z-index: 2147483647;
                    background: rgba(15, 23, 42, 0.9); color: #38bdf8;
                    border: 1px solid rgba(56, 189, 248, 0.5); border-radius: 12px;
                    padding: 12px 20px; font-size: 15px; font-weight: 600;
                    font-family: system-ui, sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                    transition: opacity 0.3s ease; pointer-events: none;
                `;
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            toast.style.opacity = '1';
            clearTimeout(toast._hideTimer);
            toast._hideTimer = setTimeout(() => {
                toast.style.opacity = '0';
            }, 3000);
        }
    };

    /**
     * ============================================================================
     * MEDIA SESSION & BROWSER CONTROLLER INTEGRATION
     * (เชื่อมต่อกับตัวควบคุมสื่อของเบราว์เซอร์หลักและปุ่มบนรีโมท Android TV)
     * ============================================================================
     */
    const MediaIntegration = {
        bind(videoElement) {
            if (!('mediaSession' in navigator)) return;

            try {
                // ลงทะเบียนปุ่ม Next Track บนตัวควบคุมสื่อของเบราว์เซอร์ / Android TV System UI
                navigator.mediaSession.setActionHandler('nexttrack', () => {
                    log('ได้รับคำสั่ง nexttrack จากตัวควบคุมเบราว์เซอร์/รีโมท');
                    Controller.triggerImmediateNext();
                });

                // ลงทะเบียนปุ่ม Play / Pause ให้ซิงค์กับตัวควบคุมหลัก
                navigator.mediaSession.setActionHandler('play', () => {
                    videoElement.play().catch(() => {});
                });

                navigator.mediaSession.setActionHandler('pause', () => {
                    videoElement.pause();
                });

                // อัปเดต Metadata ให้ตัวควบคุมของ Upket Browser แสดงชื่อเรื่อง/ตอนชัดเจน
                if (!navigator.mediaSession.metadata) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: document.title || 'กำลังรับชมวิดีโอ',
                        artist: window.location.hostname,
                        album: 'Upket TV Auto-Next'
                    });
                }
            } catch (err) {
                log('MediaSession Bind Error:', err);
            }
        }
    };

    /**
     * ============================================================================
     * CORE CONTROLLER & IFRAME BRIDGE (ระบบควบคุมหลักและเชื่อมต่อข้าม Iframe)
     * ============================================================================
     */
    const Controller = {
        init() {
            this.setupCrossFrameMessaging();
            this.setupRemoteKeyListener();
            this.observeVideos();
        },

        // เชื่อมต่อระหว่างหน้าเว็บหลักกับ Iframe (กรณีตัวเล่นวิดีโอฝังอยู่ใน Iframe)
        setupCrossFrameMessaging() {
            window.addEventListener('message', (event) => {
                if (!event.data || typeof event.data !== 'object') return;

                if (event.data.type === 'TV_AUTONEXT_VIDEO_ENDED' && !STATE.isIframe) {
                    log('ได้รับสัญญาณวิดีโอจบจาก Iframe');
                    this.startCountdown();
                } else if (event.data.type === 'TV_AUTONEXT_IMMEDIATE' && !STATE.isIframe) {
                    this.triggerImmediateNext();
                }
            });
        },

        // รองรับปุ่มรีโมท Android TV (MediaTrackNext, Escape/Back, ปุ่มลัดเปิด/ปิดระบบ)
        setupRemoteKeyListener() {
            window.addEventListener('keydown', (e) => {
                // ปุ่ม MediaTrackNext บนรีโมททีวี
                if (e.key === 'MediaTrackNext' || e.keyCode === 176) {
                    e.preventDefault();
                    this.triggerImmediateNext();
                }

                // ปุ่ม Back / Escape ยกเลิกการนับถอยหลังขณะแสดง OSD
                if (STATE.isCountingDown && (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 4 || e.keyCode === 27)) {
                    e.preventDefault();
                    this.cancelCountdown();
                }
            }, true);
        },

        // ตรวจจับแท็ก <video> ทั้งที่มีอยู่แล้วและที่ถูกสร้างขึ้นใหม่แบบ Dynamic (SPA)
        observeVideos() {
            const scan = () => {
                const videos = document.querySelectorAll('video');
                videos.forEach(video => this.attachVideoListeners(video));
            };

            scan();
            const observer = new MutationObserver(() => scan());
            observer.observe(document.documentElement, { childList: true, subtree: true });
        },

        attachVideoListeners(video) {
            if (video.dataset.tvAutoNextAttached) return;
            video.dataset.tvAutoNextAttached = 'true';

            log('เชื่อมต่อกับ Video Element:', video);

            video.addEventListener('play', () => {
                STATE.activeVideo = video;
                MediaIntegration.bind(video);
            });

            // ตรวจสอบใกล้จบ (ล่วงหน้า 1.5 วิ เพื่อป้องกันบางเว็บตัดเข้าหน้าจอดำก่อน event ended)
            video.addEventListener('timeupdate', () => {
                if (!STATE.isAutoNextEnabled || STATE.isCountingDown) return;
                if (!video.duration || video.duration < CONFIG.minVideoDuration) return;

                const remaining = video.duration - video.currentTime;
                if (remaining > 0 && remaining <= CONFIG.triggerBeforeEndSec) {
                    this.onVideoFinished();
                }
            });

            // ตรวจสอบเมื่อจบสมบูรณ์
            video.addEventListener('ended', () => {
                if (!STATE.isAutoNextEnabled || STATE.isCountingDown) return;
                if (video.duration && video.duration < CONFIG.minVideoDuration) return;
                this.onVideoFinished();
            });
        },

        onVideoFinished() {
            if (STATE.isIframe) {
                // ส่งสัญญาณขึ้นไปให้หน้าหลักจัดการเปลี่ยนตอน
                window.top.postMessage({ type: 'TV_AUTONEXT_VIDEO_ENDED' }, '*');
            } else {
                this.startCountdown();
            }
        },

        triggerImmediateNext() {
            if (STATE.isIframe) {
                window.top.postMessage({ type: 'TV_AUTONEXT_IMMEDIATE' }, '*');
                return;
            }
            const next = NextEpisodeFinder.find();
            if (next) {
                STATE.nextTarget = next;
                this.executeNext();
            } else {
                TVOverlayUI.showToast('ไม่พบปุ่มตอนถัดไปในหน้านี้');
            }
        },

        startCountdown() {
            if (STATE.isCountingDown) return;

            const next = NextEpisodeFinder.find();
            if (!next) {
                log('ไม่พบตอนถัดไป ยกเลิกการทำงาน');
                return;
            }

            STATE.nextTarget = next;
            STATE.isCountingDown = true;

            // ออกจากโหมด Fullscreen ชั่วคราวหากจำเป็นเพื่อให้คลิกปุ่มบนหน้าเว็บได้สมบูรณ์
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }

            let secondsLeft = CONFIG.countdownSeconds;
            TVOverlayUI.showCountdown(next.label, secondsLeft, CONFIG.countdownSeconds);

            STATE.countdownTimer = setInterval(() => {
                secondsLeft--;
                if (secondsLeft <= 0) {
                    this.executeNext();
                } else {
                    TVOverlayUI.showCountdown(next.label, secondsLeft, CONFIG.countdownSeconds);
                }
            }, 1000);
        },

        cancelCountdown() {
            clearInterval(STATE.countdownTimer);
            STATE.isCountingDown = false;
            STATE.nextTarget = null;
            TVOverlayUI.hide();
            TVOverlayUI.showToast('ยกเลิกการเปลี่ยนตอนอัตโนมัติแล้ว');
        },

        executeNext() {
            clearInterval(STATE.countdownTimer);
            STATE.isCountingDown = false;
            TVOverlayUI.hide();

            const targetInfo = STATE.nextTarget || NextEpisodeFinder.find();
            if (!targetInfo || !targetInfo.target) return;

            const el = targetInfo.target;
            TVOverlayUI.showToast(`กำลังเปลี่ยนไปยัง: ${targetInfo.label}`);

            // จำลองการคลิกแบบสมบูรณ์ (รองรับทั้ง SPA Router และลิงก์ HTML ปกติ)
            try {
                el.focus();
                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                el.click();

                // หากเป็นแท็ก <a> และคลิกแล้วยังไม่เปลี่ยนหน้าใน 800ms ให้สั่งเปลี่ยน URL โดยตรง
                if (el.tagName === 'A' && el.href && !el.href.startsWith('javascript:')) {
                    const currentUrl = window.location.href;
                    setTimeout(() => {
                        if (window.location.href === currentUrl) {
                            window.location.href = el.href;
                        }
                    }, 800);
                }
            } catch (e) {
                if (el.href) window.location.href = el.href;
            }
        }
    };

    // เริ่มต้นทำงานเมื่อหน้าเว็บพร้อม
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Controller.init());
    } else {
        Controller.init();
    }
})();
```

### จุดเด่นและการติดตั้งบน Upket Browser (Android TV)
1. **วิธีติดตั้ง:** เปิด **Upket Browser** บน Android TV $\rightarrow$ เข้าไปที่เมนู **ตั้งค่า (Settings) / ส่วนขยาย (Extensions / Userscripts)** $\rightarrow$ กดเพิ่มสคริปต์ใหม่ (Add Script) แล้ววางโค้ดทั้งหมดนี้ลงไป
2. **เชื่อมต่อตัวควบคุมเบราว์เซอร์หลัก (`MediaSession API`):** ซิงค์ปุ่มควบคุมสื่อของ Upket Browser และปุ่ม **Next Track** บนรีโมท Android TV ให้สั่งข้ามไปตอนถัดไปได้ทันทีโดยไม่ต้องรอจบ
3. **ทะลุ Iframe อัตโนมัติ:** รองรับเว็บดูหนัง/อนิเมะที่ตัวเล่นวิดีโอฝังอยู่ใน Iframe โดยจะส่งสัญญาณข้ามเฟรมกลับมายังหน้าหลักเพื่อกดเปลี่ยนตอนให้
4. **TV-Friendly OSD:** เมื่อวิดีโอใกล้จบจะมีแถบแจ้งเตือนมุมขวาล่างพร้อมโฟกัสปุ่ม **"เล่นทันที"** ให้คุณกดปุ่ม **OK/Enter** บนรีโมทได้เลย หรือกด **Back** เพื่อยกเลิกได้ทันทีครับ