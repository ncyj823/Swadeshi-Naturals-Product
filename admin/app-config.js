/**
 * ============================================================
 * Swadeshi Natural Products — App Config
 * ============================================================
 *
 * This file handles static frontend portal configuration and host detection.
 * It is loaded by all storefront and admin pages.
 */
(function (root) {
  'use strict';

  var hostname = typeof location !== 'undefined' ? location.hostname.toLowerCase() : '';
  var isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Rules for determining portal mode
  var MODE = 'customer'; // Default to customer portal
  if (hostname === 'owner.swadeshinatural.com' || isLocal) {
    MODE = 'owner';
  }

  // apiBase resolution
  var API_BASE = isLocal && typeof location !== 'undefined' ? location.origin : 'https://api.swadeshinatural.com';

  var MODES = Object.freeze({ CUSTOMER: 'customer', OWNER: 'owner' });

  root.APP_CONFIG = Object.freeze({
    mode: MODE,
    apiBase: API_BASE,
    MODES: MODES,
    isCustomer: function () { return MODE === MODES.CUSTOMER; },
    isOwner:    function () { return MODE === MODES.OWNER; },
    setMode: function () {
      console.warn('[APP_CONFIG] Mode is host-controlled and cannot be changed dynamically.');
    }
  });

  console.info('[APP_CONFIG] Loaded frontend config -> mode: ' + MODE + ', apiBase: ' + API_BASE);
}(typeof window !== 'undefined' ? window : this));
