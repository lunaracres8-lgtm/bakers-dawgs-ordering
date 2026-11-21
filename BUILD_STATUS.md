# Verified build status — November 21, 2026

Customer and Admin Android APKs version 1.9.431 (versionCode 431) were built locally using the official Android SDK 35 aapt2, javac, d8, zipalign and apksigner. Both APKs passed v1, v2 and v3 signature verification. Minimum Android API 21, target API 35. The APKs contain WebView launchers pointing at https://bakersdawgs.com/ and /admin.html; they require the live website, not a bundled offline application.

GitHub workflow 430 was blocked before execution by an account billing lock. Local Gradle resolution of the Android application plugin also failed; BUILD_ANDROID_MANUAL.sh completed the actual builds without Gradle. Generated Android project templates are included in the handoff for reproduction.

IMPORTANT INSTALLATION: the new signing certificate differs from the previously published APKs. An in-place update may be rejected. Do not uninstall the previous app until tablet-only offline orders, inventory counts, shift records and any other needed local data have been exported/backed up. Cloud data is separate from app-local data. Staff must know their normal login before reinstalling. No physical-device installation/audio test was performed here.

New signing certificate SHA-256: cf144cf6af07e2e44c0c466896ae49a35564bf1a8517f9474b5f687d90c5da05
Old published certificate SHA-256: 75ce9c9e1608843a0d9c8a5d31ad88cecc92538f30fd9fb53949b1548bc0b0a8

Production app.js and admin.js were downloaded and their SHA-256 hashes matched the patched source exactly. Built-in Pages deployment for cfd152be0c27de73f61b1a735680255d916e46c0 succeeded. Live customer-to-kitchen transactions and staff login were not exercised.

24 automated tests passed. Physical tablet testing remains required.

## APK checksums

- Bakers_Dawgs_Customer_1.9.431.apk: 13018 bytes; SHA-256 3a2a7d72707f097c52b8a7559544752c4a038f3897aa6f900a8dbfc1b8ca0c33

- Bakers_Dawgs_Admin_1.9.431.apk: 25306 bytes; SHA-256 15d66d60be2fd58ae2f8a3be54adfec0a05b1bb7b85b28f4a6849e84c3671f04
