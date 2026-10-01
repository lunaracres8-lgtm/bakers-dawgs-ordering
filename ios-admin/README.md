# Baker's Dawgs Admin — iOS

Native iPhone/iPad wrapper for the existing Baker's Dawgs admin dashboard.

## Live admin
https://bakersdawgs.com/admin.html

## Native features
- WKWebView hosting the existing admin dashboard
- Face ID / Touch ID authentication bridge
- iOS text-to-speech for kitchen order readback
- iOS speech recognition for kitchen commands
- External links open outside the admin web view

## Xcode setup
1. Create an iOS App project named `BakersDawgsAdmin` using Swift + SwiftUI.
2. Set the bundle identifier to a unique identifier you control, for example `com.lunaracres.bakersdawgs.admin`.
3. Replace the generated app/view files with `BakersDawgsAdminApp.swift` and `ContentView.swift`.
4. Add the privacy keys shown in `Info.plist.example` to the target Info settings.
5. Select your Apple Developer Team under Signing & Capabilities.
6. Build on a real iPhone. Face ID/Touch ID and microphone features should be tested on-device.

This folder does not change the Android app or customer website.
