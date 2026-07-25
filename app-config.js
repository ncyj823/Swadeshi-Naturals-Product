/**
 * ============================================================
 * Swadeshi Natural Products — App Config
 * ============================================================
 *
 * THIS FILE IS SERVED DYNAMICALLY BY THE SERVER.
 *
 * In production (and during `node server.js`), this file on
 * disk is NEVER sent to the browser. The server intercepts
 * GET /app-config.js and returns a generated version with
 * the portal mode derived from the incoming request's Host
 * header:
 *
 *   yourdomain.com        → mode = 'customer'
 *   owner.yourdomain.com  → mode = 'owner'
 *
 * This static copy is a REFERENCE / FALLBACK ONLY — it runs
 * only when the server is not serving it (e.g. direct file://
 * browsing or tooling). It must not bypass the server's route
 * interception (app-config.js is in the static-file blocklist).
 *
 * ── Architecture ───────────────────────────────────────────
 *   One EC2 backend  ←──→  yourdomain.com      (customer)
 *                    ←──→  owner.yourdomain.com (owner)
 *
 *   Server helpers in server.js:
 *     isOwnerPortal(req)    → true for owner.yourdomain.com
 *     isCustomerPortal(req) → true for everything else
 *
 *   Per-request: GET /app-config.js returns a generated JS
 *   snippet with the correct mode baked in for that Host.
 *
 * ── What the server generates ──────────────────────────────
 *   window.APP_CONFIG = {
 *     mode        : 'customer' | 'owner',    // from Host header
 *     MODES       : { CUSTOMER, OWNER },
 *     isCustomer(): boolean,
 *     isOwner()  : boolean,
 *     setMode()  : (disabled — host-controlled)
 *   }
 *
 * ── Usage in any page script ───────────────────────────────
 *   if (APP_CONFIG.isOwner())    { showAdminFeature(); }
 *   if (APP_CONFIG.isCustomer()) { showCustomerOnlyUI(); }
 *
 * ── Configure owner hosts ──────────────────────────────────
 *   In your .env file (or hosting environment):
 *     OWNER_HOST=owner.yourdomain.com
 *   Multiple hosts:
 *     OWNER_HOST=owner.yourdomain.com,admin.yourdomain.com
 *   Local dev: localhost and 127.0.0.1 default to owner.
 * ============================================================
 */

/* Dev-only fallback (only used if the server is NOT running): */
(function (root) {
  'use strict';

  if (root.APP_CONFIG) return; // server already set this — nothing to do

  var MODE = 'customer'; // safe default
  var isLocal = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  var API_BASE = isLocal ? location.origin : 'https://api.swadeshinatural.com';

  var MODES = Object.freeze({ CUSTOMER: 'customer', OWNER: 'owner' });

  root.APP_CONFIG = Object.freeze({
    mode: MODE,
    apiBase: API_BASE,
    MODES: MODES,
    isCustomer: function () { return MODE === MODES.CUSTOMER; },
    isOwner:    function () { return MODE === MODES.OWNER; },
    setMode: function () {
      console.warn(
        '[APP_CONFIG] Mode is host-controlled. ' +
        'Access the owner domain (OWNER_HOST) to use the admin portal.'
      );
    }
  });

  console.warn(
    '[APP_CONFIG] Using static fallback — server not running. ' +
    'Mode defaults to "customer".'
  );
}(typeof window !== 'undefined' ? window : this));
