# Baker's Dawgs admin handoff audit — October 6, 2026

The Android APK opens the live admin website at https://bakersdawgs.com/admin.html. Both layers were reviewed. Website fixes are deployed. APK build #370 compiled successfully, passed its GitHub checks and published its download. The downloaded APK archive was verified.

## Changes

- Android JavaScript alerts, confirmation dialogs and manager PIN prompts are enabled. Their absence explained silent completion messages and blocked confirmation-driven controls.
- Completed walk-up sales show a persistent message with ticket number, total and payment method. Customer and payment fields reset for the next sale.
- Saving disables the sale controls. An unchanged retry uses the same UUID, and a lost response is reconciled against the existing database record.
- Ready tickets have a Complete Order button. Payment is required before completion.
- Voided tickets are excluded from the open count. Sales metrics consistently show currency symbols.
- Android reports/backups use the system save-file picker; reports and receipts use Android printing. System bars receive native padding.
- Public callers can insert only new, unpaid orders. Order administration, menu writes and settings writes are restricted to the existing authorized owner account. Only one account currently exists in this project.
- Nine regression tests run locally and in the APK build workflow. APK versions increase with the build number.

## Evidence

| Area | Result | Scope |
|---|---|---|
| JavaScript syntax and whitespace checks | Passed | Changed scripts and diff |
| Nine automated regression tests | Passed locally and in GitHub | Sales, duplicate clicks, missing payment, failed saves, retry UUID, lost responses, kitchen lifecycle, deletion, discounts, quantity controls, loyalty, native bridge routing, repeat-order details and password validation |
| Browser interaction | Passed | Chromium with simulated API responses: login, sale confirmation/reset, kitchen progression, payment and completion |
| Responsive layout | Passed | Orders, Kitchen, Window Sale, Menu and Owner at widths 390, 768 and 1280; no horizontal page overflow |
| Browser JavaScript errors | None in tested flows | Simulated API responses |
| Live database authorization | Passed | Real RLS: public New insertion; owner read, complete, staff insertion and delete; public Completed rejection; unrelated-user read/write rejection. Test writes rolled back |
| Live menu data | Passed | 25 items, no missing/negative prices in the inspected fields, no availability mismatches |
| Historical completed payments | Passed | No completed orders missing a payment method |
| Live deployment | Passed | GitHub Pages succeeded; live admin.js contains the new sale and completion logic |

## Device acceptance before handing over

Install the new APK on the boss's actual tablet. Confirm a sale appears once in daily sales, shows its confirmation and clears its customer fields; cancel and accept Clear Order; complete a kitchen ticket after choosing payment; approve a deletion with the manager PIN; save a report; print a receipt; and try microphone/fingerprint with that tablet's Android permissions and hardware.

Hardware biometrics, microphone recognition, Android's document picker, printer integration and native dialogs cannot be fully certified by desktop browser tests. The build still uses the repository's existing debug-signing workflow; signing-key continuity with an older installation is not guaranteed. Do not uninstall an existing app without exporting local reports/backups first.

## Remaining operational limits

- Time-clock shifts, inventory settings, cash counts, manager PINs and archived reports are stored on the device. Export them before changing devices or clearing app data.
- Fingerprint unlock opens one saved staff account; it does not identify different employees on a shared tablet.
- Square payment choices record the selected payment method; this app does not process a card charge or execute a refund. SMS ready notices open the messaging app for the operator to send.
- Loyalty currently counts completed visits and calculates rewards; it has no persistent redemption ledger.
- Public order totals are client supplied. The new RLS prevents forged completed-sales records but does not constitute server-side menu-price validation or rate limiting.
- Supabase's advisor reports leaked-password protection disabled and an unused admin_passkeys table with RLS and no policies. The table is denied by default. No provider-plan change was made. Password guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
