/**
 * Imran Khan Portfolio — Interactive Canvas & UI Engine
 * Features:
 * - High-DPI Canvas 240-frame scrub with physics lerp
 * - Golden-ratio framing (subject positioned right-center on desktop)
 * - 3D card tilt & parallax micro-interactions
 * - Interactive modals (Work Showcase, Let's Connect)
 * - Dynamic scroll progress synchronization
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 240;
  const FRAME_DIR = './frames';
  const LERP_FACTOR = 0.085; // Butter-smooth glide factor

  // --- DOM Elements ---
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-progress-bar');
  const loaderPercent = document.getElementById('loader-percent');
  const loaderCount = document.getElementById('loader-count');
  const progressLine = document.getElementById('progress-line');
  const bottomScrubBar = document.getElementById('bottom-scrub-bar');
  const experienceOrbit = document.querySelector('.experience-orbit');

  // Navigation & Views
  const btnDownloadResume = document.getElementById('btn-download-resume');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const drawerClose = document.getElementById('drawer-close');
  const navLinks = document.querySelectorAll('.nav-link');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  const tiltBadges = document.querySelectorAll('[data-tilt]');
  const experienceFilters = document.querySelectorAll('[data-experience-filter]');
  const experienceCards = document.querySelectorAll('[data-experience-category]');
  const archiveToggle = document.getElementById('archive-toggle');
  const archivePanel = document.getElementById('archive-panel');
  const viewClose = document.getElementById('view-close');
  const viewTriggers = document.querySelectorAll('[data-view-target]');
  const viewPanels = document.querySelectorAll('[data-view-panel]');
  const stageOnlyElements = document.querySelectorAll('[data-stage-only]');
  const portfolioContainer = document.querySelector('.portfolio-container');
  const contactForm = document.getElementById('contact-form');

  // --- State Variables ---
  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let isReady = false;
  let currentFrame = 0;
  let targetFrame = 0;
  let lastDrawnFrame = -1;
  let rafId = null;
  let activeView = null;
  let returnFocus = null;
  let lastTouchY = null;

  // Format frame URL
  function getFrameUrl(index) {
    const padded = String(index + 1).padStart(4, '0');
    return `${FRAME_DIR}/frame_${padded}.jpg`;
  }

  // --- Frame Preloading ---
  function preloadImages() {
    let completed = 0;

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFrameUrl(i);

      img.onload = () => {
        images[i] = img;
        completed++;
        loadedCount = completed;

        const percent = Math.floor((completed / TOTAL_FRAMES) * 100);
        if (loaderBar) loaderBar.style.width = `${percent}%`;
        if (loaderPercent) loaderPercent.textContent = `${percent}%`;
        if (loaderCount) loaderCount.textContent = `${completed} / ${TOTAL_FRAMES}`;

        // Render first frame immediately
        if (i === 0) {
          resizeCanvas();
          drawFrame(0);
          startRenderLoop();
        }

        if (completed === TOTAL_FRAMES) {
          onAllFramesLoaded();
        }
      };

      img.onerror = () => {
        completed++;
        if (completed === TOTAL_FRAMES) {
          onAllFramesLoaded();
        }
      };
    }
  }

  function onAllFramesLoaded() {
    isReady = true;
    setTimeout(() => {
      if (loader) loader.classList.add('loaded');
      startRenderLoop();
    }, 200);
  }

  // --- Canvas Sizing & Framing ---
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);
      lastDrawnFrame = -1;
    }

    if (images[Math.round(currentFrame)]) {
      drawFrame(Math.round(currentFrame));
    }
  }

  function findClosestLoadedFrame(targetIdx) {
    if (images[targetIdx] && images[targetIdx].complete && images[targetIdx].naturalWidth > 0) {
      return images[targetIdx];
    }
    for (let i = targetIdx - 1; i >= 0; i--) {
      if (images[i] && images[i].complete && images[i].naturalWidth > 0) return images[i];
    }
    for (let i = targetIdx + 1; i < TOTAL_FRAMES; i++) {
      if (images[i] && images[i].complete && images[i].naturalWidth > 0) return images[i];
    }
    return null;
  }

  function drawFrame(frameIndex) {
    const clampedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameIndex));
    const img = findClosestLoadedFrame(clampedIndex);

    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.min(cw / iw, ch / ih);
    const nw = iw * scale;
    const nh = ih * scale;

    let ox = (cw - nw) / 2;
    const oy = ch - nh;

    ctx.drawImage(img, ox, oy, nw, nh);
    lastDrawnFrame = clampedIndex;

    updateScrollBars(clampedIndex);
  }

  function updateScrollBars(frameIndex) {
    const progress = frameIndex / (TOTAL_FRAMES - 1);
    const progressPercent = `${(progress * 100).toFixed(1)}%`;

    if (progressLine) progressLine.style.width = progressPercent;
    if (bottomScrubBar) bottomScrubBar.style.width = progressPercent;
    if (experienceOrbit) experienceOrbit.style.setProperty('--orbit-angle', `${(progress * 360).toFixed(2)}deg`);

    tiltBadges.forEach((badge, badgeIndex) => {
      const badgePhase = progress * Math.PI * 2 + (badgeIndex * Math.PI * 2) / tiltBadges.length;
      const horizontalOffset = Math.cos(badgePhase) * 6;
      const verticalOffset = Math.sin(badgePhase) * 3;
      const rotationOffset = Math.sin(badgePhase) * 2;

      badge.style.setProperty('--scroll-shift-x', `${horizontalOffset.toFixed(2)}px`);
      badge.style.setProperty('--scroll-shift-y', `${verticalOffset.toFixed(2)}px`);
      badge.style.setProperty('--scroll-rotation', `${rotationOffset.toFixed(2)}deg`);
    });
  }

  function updateActiveNavLink(activeSection = null) {
    [...navLinks, ...mobileLinks].forEach(link => {
      const isTarget = link.getAttribute('data-section') === activeSection;
      link.classList.toggle('active', isTarget);
      const dot = link.querySelector('.active-dot');
      if (isTarget && !dot && link.classList.contains('nav-link')) {
        const newDot = document.createElement('span');
        newDot.className = 'active-dot';
        link.appendChild(newDot);
      } else if (!isTarget && dot) {
        dot.remove();
      }
    });
  }

  // --- Scroll Physics Scrubbing ---
  function scrubFrames(delta) {
    targetFrame = Math.max(0, Math.min(TOTAL_FRAMES - 1, targetFrame + delta));
  }

  function render() {
    const delta = targetFrame - currentFrame;
    if (Math.abs(delta) > 0.001) {
      currentFrame += delta * LERP_FACTOR;
    } else {
      currentFrame = targetFrame;
    }

    const frameToDraw = Math.round(currentFrame);
    if (frameToDraw !== lastDrawnFrame) {
      drawFrame(frameToDraw);
    }

    rafId = requestAnimationFrame(render);
  }

  function startRenderLoop() {
    if (!rafId) {
      rafId = requestAnimationFrame(render);
    }
  }

  function setExperienceFilter(filter) {
    experienceFilters.forEach(button => {
      const selected = button.dataset.experienceFilter === filter;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    experienceCards.forEach(card => {
      card.hidden = filter !== 'all' && card.dataset.experienceCategory !== filter;
    });
  }

  experienceFilters.forEach(button => {
    button.addEventListener('click', () => setExperienceFilter(button.dataset.experienceFilter));
  });

  if (archiveToggle && archivePanel) {
    archiveToggle.addEventListener('click', () => {
      const expanded = archiveToggle.getAttribute('aria-expanded') === 'true';
      archiveToggle.setAttribute('aria-expanded', String(!expanded));
      archivePanel.hidden = expanded;
    });
  }

  function openView(viewId, trigger) {
    const panel = [...viewPanels].find(view => view.id === viewId);
    if (!panel || activeView) return;

    returnFocus = trigger || document.activeElement;
    activeView = panel;
    panel.hidden = false;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-hidden', 'false');
    panel.setAttribute('tabindex', '-1');
    panel.scrollTop = 0;

    document.documentElement.classList.add('view-open');
    document.body.classList.add('view-open');
    document.documentElement.classList.remove('stage-locked');
    document.body.classList.remove('stage-locked');
    document.body.style.position = 'fixed';
    document.body.style.top = '0';
    document.body.style.width = '100%';
    stageOnlyElements.forEach(element => { element.inert = true; });
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');

    panel.appendChild(viewClose);
    viewClose.hidden = false;
    updateActiveNavLink(viewId);
    void panel.offsetWidth;
    panel.classList.add('is-open');
    viewClose.focus({ preventScroll: true });
  }

  function closeView() {
    if (!activeView) return;

    const panel = activeView;
    let finished = false;
    activeView = null;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    updateActiveNavLink();

    const finishClose = () => {
      if (finished) return;
      finished = true;
      panel.hidden = true;
      document.documentElement.classList.remove('view-open');
      document.body.classList.remove('view-open');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('width');
      stageOnlyElements.forEach(element => { element.inert = false; });
      portfolioContainer.appendChild(viewClose);
      viewClose.hidden = true;
      document.documentElement.classList.add('stage-locked');
      document.body.classList.add('stage-locked');

      const focusTarget = returnFocus && !returnFocus.closest('.mobile-nav-drawer') ? returnFocus : menuToggle;
      returnFocus = null;
      if (focusTarget && focusTarget.isConnected) focusTarget.focus({ preventScroll: true });
    };

    panel.addEventListener('transitionend', event => {
      if (event.target === panel && event.propertyName === 'opacity') finishClose();
    });
    setTimeout(finishClose, 360);
  }

  function showResumeToast() {
    const toast = document.createElement('div');
    toast.className = 'resume-toast';
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ff6a3d" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Downloading Imran Khan's Resume...</span>
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(22, 17, 15, 0.95);
      border: 1px solid rgba(255, 106, 61, 0.4);
      box-shadow: 0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(255,87,34,0.3);
      color: #ffffff;
      padding: 14px 24px;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      z-index: 600;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // --- 3D Floating Badge Tilt Effect ---
  function initTiltEffects() {
    tiltBadges.forEach(badge => {
      badge.addEventListener('mousemove', (e) => {
        const rect = badge.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        badge.style.transform = `perspective(500px) rotateX(${-y * 0.1}deg) rotateY(${x * 0.1}deg) scale(1.04)`;
      });

      badge.addEventListener('mouseleave', () => {
        badge.style.transform = '';
      });
    });
  }

  // --- Event Listeners ---
  window.addEventListener('wheel', event => {
    if (activeView) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    scrubFrames(event.deltaY * unit * 0.14);
  }, { passive: false });
  window.addEventListener('touchstart', event => {
    if (!activeView && event.touches.length) lastTouchY = event.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', event => {
    if (activeView || lastTouchY === null || !event.touches.length) return;
    event.preventDefault();
    const currentY = event.touches[0].clientY;
    scrubFrames((lastTouchY - currentY) * 0.24);
    lastTouchY = currentY;
  }, { passive: false });
  window.addEventListener('touchend', () => { lastTouchY = null; }, { passive: true });
  window.addEventListener('touchcancel', () => { lastTouchY = null; }, { passive: true });
  window.addEventListener('resize', () => {
    resizeCanvas();
  }, { passive: true });

  // Resume action
  if (btnDownloadResume) btnDownloadResume.addEventListener('click', showResumeToast);
  viewTriggers.forEach(trigger => {
    trigger.addEventListener('click', event => {
      event.preventDefault();
      openView(trigger.dataset.viewTarget, trigger);
    });
  });
  if (viewClose) viewClose.addEventListener('click', closeView);
  document.querySelectorAll('[data-close-view]').forEach(trigger => {
    trigger.addEventListener('click', event => {
      event.preventDefault();
      closeView();
    });
  });

  if (contactForm) {
    contactForm.addEventListener('submit', event => {
      event.preventDefault();
      const fields = new FormData(contactForm);
      const name = fields.get('name').toString().trim();
      const email = fields.get('email').toString().trim();
      const message = fields.get('message').toString().trim();
      const subject = encodeURIComponent(`Portfolio inquiry from ${name}`);
      const body = encodeURIComponent(`${message}\n\nFrom: ${name}\nEmail: ${email}`);
      window.location.href = `mailto:s.engrimrantareen@gmail.com?subject=${subject}&body=${body}`;
    });
  }

  // Mobile drawer
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      mobileDrawer.classList.toggle('open');
    });
  }
  if (drawerClose) {
    drawerClose.addEventListener('click', () => {
      mobileDrawer.classList.remove('open');
    });
  }

  if (menuToggle && mobileDrawer) {
    menuToggle.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', String(mobileDrawer.classList.contains('open')));
    });
  }
  if (drawerClose && menuToggle) {
    drawerClose.addEventListener('click', () => menuToggle.setAttribute('aria-expanded', 'false'));
  }

  // Escape key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeView();
      if (mobileDrawer) mobileDrawer.classList.remove('open');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    } else if (e.key === 'Tab' && activeView) {
      const focusable = [...activeView.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) {
        e.preventDefault();
        viewClose.focus();
      } else if (e.shiftKey && document.activeElement === focusable[0]) {
        e.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        e.preventDefault();
        focusable[0].focus();
      }
    }
  });

  // --- Initialize ---
  window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    preloadImages();
    initTiltEffects();
  });

})();
