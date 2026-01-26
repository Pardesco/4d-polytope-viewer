/**
 * DonationAvatar - Shows a donation prompt after user engages with viewer
 * Desktop only, with hybrid timing:
 * - First visit: 3 minutes delay
 * - Return visits: 1 minute delay
 * - Skipped for Creator tier users (they already supported!)
 */

import { licenseManager } from '../license/LicenseManager.js';

export class DonationAvatar {
  constructor(options = {}) {
    this.firstVisitDelayMs = options.firstVisitDelayMs || 3 * 60 * 1000; // 3 minutes
    this.returnVisitDelayMs = options.returnVisitDelayMs || 60 * 1000; // 1 minute
    this.donationUrl = options.donationUrl || 'https://4d.pardesco.com/ebook/';
    this.videoUrl = options.videoUrl || '/videos/donation-request.mp4';
    this.storageKey = 'donation_avatar_dismissed';
    this.visitKey = 'donation_avatar_visited';
    this.container = null;
    this.timeoutId = null;
    this.isVisible = false;
  }

  /**
   * Initialize the donation avatar (desktop only, free tier only)
   */
  init() {
    // Skip for Creator/Professional tier users - they already supported!
    const tier = licenseManager.getTier();
    if (tier === 'creator' || tier === 'professional') {
      console.log(`[DonationAvatar] Skipping - ${tier} tier user`);
      return;
    }

    // Only show on desktop
    if (this.isMobile()) {
      console.log('[DonationAvatar] Skipping - mobile device detected');
      return;
    }

    // Check if user has dismissed before
    if (this.wasDismissed()) {
      console.log('[DonationAvatar] Skipping - previously dismissed');
      return;
    }

    // Determine delay based on visit history
    const isReturningVisitor = this.isReturningVisitor();
    const delayMs = isReturningVisitor ? this.returnVisitDelayMs : this.firstVisitDelayMs;

    // Mark this visit
    this.markVisit();

    // Start the timer
    this.startTimer(delayMs);
    console.log(`[DonationAvatar] ${isReturningVisitor ? 'Returning' : 'First-time'} visitor - will show in ${delayMs / 1000}s`);
  }

  /**
   * Check if this is a returning visitor
   */
  isReturningVisitor() {
    try {
      return localStorage.getItem(this.visitKey) !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Mark this visit in localStorage
   */
  markVisit() {
    try {
      localStorage.setItem(this.visitKey, new Date().toISOString());
    } catch (e) {
      // localStorage not available
    }
  }

  /**
   * Check if device is mobile
   */
  isMobile() {
    return window.innerWidth <= 768 ||
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Check if user has dismissed the avatar before
   */
  wasDismissed() {
    try {
      const dismissed = localStorage.getItem(this.storageKey);
      if (dismissed) {
        const dismissedDate = new Date(dismissed);
        const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
        // Show again after 7 days
        return daysSince < 7;
      }
    } catch (e) {
      // localStorage not available
    }
    return false;
  }

  /**
   * Mark as dismissed
   */
  markDismissed() {
    try {
      localStorage.setItem(this.storageKey, new Date().toISOString());
    } catch (e) {
      // localStorage not available
    }
  }

  /**
   * Start the delay timer
   * @param {number} delayMs - Delay in milliseconds
   */
  startTimer(delayMs) {
    this.timeoutId = setTimeout(() => {
      this.show();
    }, delayMs);
  }

  /**
   * Show the donation avatar
   */
  show() {
    if (this.isVisible) return;

    this.createDOM();
    this.isVisible = true;

    // Animate in
    requestAnimationFrame(() => {
      this.container.classList.add('visible');
    });

    console.log('[DonationAvatar] Shown');
  }

  /**
   * Hide and dismiss the avatar
   */
  dismiss() {
    if (!this.container) return;

    this.container.classList.remove('visible');
    this.container.classList.add('hiding');

    setTimeout(() => {
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
    }, 300);

    this.markDismissed();
    this.isVisible = false;
    console.log('[DonationAvatar] Dismissed');
  }

  /**
   * Navigate to donation page
   */
  navigate() {
    window.open(this.donationUrl, '_blank');
    this.dismiss();
  }

  /**
   * Create the DOM elements
   */
  createDOM() {
    // Main container
    this.container = document.createElement('div');
    this.container.className = 'donation-avatar';
    this.container.innerHTML = `
      <div class="donation-avatar-inner">
        <!-- Close button -->
        <button class="donation-close" aria-label="Dismiss">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Clickable content area -->
        <div class="donation-content">
          <!-- Video avatar -->
          <div class="donation-video-wrapper">
            <video
              class="donation-video"
              src="${this.videoUrl}"
              autoplay
              loop
              muted
              playsinline
            ></video>
          </div>

          <!-- Speech bubble -->
          <div class="donation-bubble">
            <div class="donation-bubble-arrow"></div>
            <p class="donation-message">Enjoying the content?<br><span class="donation-highlight">Throw a coin in the bucket!</span></p>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    const closeBtn = this.container.querySelector('.donation-close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss();
    });

    const content = this.container.querySelector('.donation-content');
    content.addEventListener('click', () => {
      this.navigate();
    });

    // Add to DOM (above rotation matrix panel)
    document.body.appendChild(this.container);
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.container) {
      this.container.remove();
    }
  }
}

export default DonationAvatar;
