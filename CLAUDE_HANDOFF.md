# Baker's Dawgs — Kitchen upgrade and Claude handoff

## Verified repository state (2026-11-20)
- Public source repository: https://github.com/lunaracres8-lgtm/bakers-dawgs-ordering
- Customer entry point: `index.html`; admin entry point: `admin.html`; application scripts include `app.js` and `admin.js`.
- `index.html` already features Carolina Classic as the primary quick-checkout action.
- `app.js` currently contains duplicated wording `Anna's Anna's Homemade Slaw` in menu description and topping labels. Correct the duplicate consistently, and verify toppings in checkout payload and kitchen display.
- `admin.js` already contains kitchen speech synthesis; inspect and preserve existing logic before changing it.
- The existing README warns that a browser PIN is not a replacement for authenticated staff access. Do not publish admin credentials or privileged keys.

## Required kitchen behavior (not yet implemented or verified by this handoff)
1. On incoming order, announce customer, numbered order, items, quantities, toppings, modifications and notes.
2. Repeat notification after 30 seconds if unacknowledged; avoid multiple overlapping speech utterances.
3. After acceptance, read the order and keep command recognition available while the kitchen screen is active.
4. Voice commands: `Repeat that order`, `Next order`, `Previous order`. Repeat always targets the selected order. Navigation does not change order status.
5. Announce `Order X of Y`; at boundaries say `That's the first order` or `That's the last order`.
6. Visually highlight selected order; use large, legible cards, clear status/timer indicators and accessible contrast.
7. Explicitly distinguish microphone listening state from order announcements; avoid the system recognizing its own speech.
8. Test in a noisy kitchen on the actual Android tablet. Browser speech recognition may require connectivity and may stop unexpectedly; use a supported native recognition implementation if continuous hands-free reliability is required.
9. Retain offline visibility for previously fetched orders and clearly indicate connection/sync state. Do not claim offline orders have reached the server before sync.

## Customer ordering priorities
- Carolina Classic must be the first prominent menu choice: slaw, mustard, onions, chili by default.
- Show included toppings in item customization, cart, submitted order and kitchen receipt; support removal without silently losing default toppings.
- Clean up crowded landing-page layout; verify mobile accessibility and checkout.
- Preserve existing pricing and menu settings unless the owner confirms changes.

## Verification and release checklist
- Run `npm test` and record failures before/after changes.
- Exercise new order -> announce -> accept -> repeat -> next/previous -> complete, with multiple orders.
- Test actual audio, microphone permissions, Android screen state and background/foreground transitions.
- Confirm no duplicate announcements after refresh/reconnect.
- Test customer checkout, topping edits, and admin receipt end-to-end.
- Produce a source ZIP from the repository, a buildable Android project/APK if supported, and a README with exact build commands and required environment variables (names only, no secrets).
- Confirm public GitHub link works without sign-in; keep secret configuration out of the repository.

**Status:** This document is an inspected-source handoff and task specification, not a claim that the features above are finished or an APK is built.
