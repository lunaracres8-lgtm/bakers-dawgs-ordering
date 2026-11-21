# Baker's Dawgs — Claude handoff, November 21, 2026

## Start here
Continue this existing project; do not recreate the app or ask Robbie to locate its repository.
- Source: https://github.com/lunaracres8-lgtm/bakers-dawgs-ordering
- Customer: https://bakersdawgs.com/
- Staff: https://bakersdawgs.com/admin.html
- Core fixes committed as cfd152be0c27de73f61b1a735680255d916e46c0.
- The owner authorized fixing the existing customer website, staff website, Android apps, menu/flyer, and preparing this package.

## Confirmed menu instructions
- Canned soft drinks: $1.50. Never change this to $1.
- Remove 16-ounce bottled soft drinks. Water's earlier listed price is $1; distinguish water from bottled soda.
- Carolina Classic first: Anna's Homemade Slaw, yellow mustard, fresh onions, chili.
- List every hot dog style under Hot Dawgs, with its ingredients. Styles must be available individually, even when also offered as combos.
- Each main hot dog style may also have its own combo, with chips and a canned drink.
- Show available toppings and condiments separately.
- Restore the older big bubbly block-letter Baker's Dawgs menu/flyer appearance. Exact older artwork has NOT been recovered or matched in this patch. menu.html is a new editable layout, not a claim to reproduce the original.
- Existing application prices are pre-tax, adding 6.75%. Regular hot dogs are $3.28 before tax / $3.50 total; default combos $6.56 before tax / $7 total. Do not silently change tax treatment. Owner's $1.50 canned-drink instruction is preserved as existing application price; confirm tax-inclusive treatment before changing it.
- Existing tea and dessert records remain in the application; do not assume additional removal authorization from old generated documents.

## Implemented in this source and checked locally
1. Customer checkout locks synchronously before asynchronous checks. New regression test verifies rapid taps produce one create call.
2. Carolina Classic defaults include slaw through customization, cart and submitted ticket. Every other named hot dog style now selects its own included toppings too; toppings can be removed.
3. Cloud menus with only combo rows gain the matching standalone regular style and ingredient description. Carolina appears before other dogs.
4. Skip periodic menu replacement while a cart is occupied or checkout is underway; existing numeric cart indices must not shift during checkout.
5. Confirmation number uses the UUID returned by an idempotent create, including retry reuse.
6. Initial-load New tickets trigger the visible alert. A ten-second ring pattern repeats every twelve seconds until acknowledged. Acknowledgement stops current audio immediately.
7. Acknowledging multiple tickets reads them as one utterance on browser and native Android; this avoids dropping all but the first native ticket.
8. Accepting an order successfully now automatically reads it. Includes ticket number, customer, quantity, item options, item notes and order notes.
9. Native recognizer pauses while TTS speaks, then resumes if listening remains enabled. Browser recognition ignores commands during readback and resumes afterward.
10. Navigation speaks order number and contents in one utterance rather than cancelling its own introductory utterance.
11. Removed the Anna's Slaw supply-reorder drawer from the entire UI. Saved local records and export functions remain in code.
12. Customer first screen has fewer duplicate calls to action; main button retains the Carolina label after status refresh.
13. Existing buy-five-get-one and ID-checked birthday reward tests pass; these were not replaced with a new reward implementation.

## Verification
Run from source root:
```sh
npm ci
npm test
node --check app.js
node --check admin.js
node --check kitchen-voice-navigation.js
```
24 automated tests passed on November 21, 2026. Tests use jsdom and mocked services, not the live kitchen or physical tablet.

## Build status and blocker
The GitHub Android workflow for cfd152be failed BEFORE executing any build steps:
https://github.com/lunaracres8-lgtm/bakers-dawgs-ordering/actions/runs/44905432378
GitHub's visible annotation: "The job was not started because your account is locked due to a billing issue."
Do not report that this failed workflow produced new APKs. Existing downloads/*.apk files predate this patch unless a later BUILD_STATUS.md explicitly verifies replacements.

Local manual builds succeeded. BUILD_STATUS.md records exact versions, hashes, signing mismatch and verification limits. The new verified APKs are included in this handoff.

## Reproduce Android builds without GitHub Actions
Install Java 17+, Gradle 8.7+, and Android SDK with platforms;android-35 and build-tools;35.0.0. Set ANDROID_HOME and ANDROID_SDK_ROOT to that SDK.
```sh
BUILD_NUMBER=431 bash BUILD_ANDROID.sh
```
The script uses the same project generation/build steps as .github/workflows/package.yml, after npm tests.
Outputs:
- dist/customer/Bakers_Dawgs_Customer.apk
- dist/admin/Bakers_Dawgs_Admin.apk
Version name 1.9.431, code 431 by default. Choose a higher code for a later release.
Package IDs must remain com.bakersdawgs.customer and com.bakersdawgs.admin.
Builds currently use debug signing; preserve the earlier signing key for in-place updates. A different debug key may require uninstall/reinstall, which clears app-local data. Do not tell the owner to uninstall as a routine troubleshooting step.
No staff passwords, service-role keys, or signing keys are included in this package. The newly generated local debug signing key is retained separately, not placed in the repository or Claude ZIP.

## Still required before claiming everything finished
- Production app.js/admin.js were verified by matching downloaded hashes. Verify any later companion files separately; custom Actions deployment is billing-blocked but built-in Pages publication succeeded.
- APK build/signature verification is complete; see BUILD_STATUS.md. Physical device installation and behavior remain unverified.
- Test on Robbie's Android 10 tablet: long alarm, acknowledgement, acceptance auto-read, multiple orders, loud kitchen, mic permission, repeated Start/Stop, app foreground/background, and offline behavior.
- Validate live customer-to-kitchen delivery and staff sign-in without changing real customer orders or resetting credentials unnecessarily.
- Do not claim that browser autoplay, background audio or offline speech recognition works on every device.
- Test saved carts after reload when the cloud menu differs from the default menu; current cart schema still uses indices. The refresh guard protects an occupied in-session cart, but a name/ID-based cart migration would be safer across reloads.
- Finish and review the vintage bubbly-letter print menu/flyer against the actual older reference. Current menu.html lists separate styles, combos, ingredients and condiments but is not yet a visually approved final poster or PDF.
- Test all menu defaults after cloud edits, sold-out changes, and tablet refreshes.

## Manual build fallback used successfully
The handoff includes generated customer-apk/ and admin-apk/ source templates. With JDK 17 and Android SDK 35 available, run `bash BUILD_ANDROID_MANUAL.sh` to compile, dex, align and sign without Gradle. The default creates a fresh debug key; set BUILD_KEY to the retained key for future compatible updates. Never commit a keystore.
