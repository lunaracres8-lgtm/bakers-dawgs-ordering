#!/usr/bin/env bash
set -euo pipefail
# Run from the repository root with Java 17+, Gradle 8.7+, and Android SDK 35 installed.
: "${BUILD_NUMBER:=431}"
command -v gradle >/dev/null
command -v java >/dev/null
npm ci
npm test

set -e
make_app() {
  DIR="$1"; PKG="$2"; TITLE="$3"; URL="$4"
  mkdir -p "$DIR/app/src/main/java/${PKG//.//}" "$DIR/app/src/main/res/values" "$DIR/app/src/main/res/drawable" "$DIR/app/src/main/res/mipmap-anydpi-v26"
  cat > "$DIR/settings.gradle" <<EOF
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = "$TITLE"
include ':app'
EOF
  cat > "$DIR/build.gradle" <<'EOF'
plugins { id 'com.android.application' version '8.5.2' apply false }
EOF
  cat > "$DIR/app/build.gradle" <<EOF
plugins { id 'com.android.application' }
android { namespace '$PKG'; compileSdk 35
  defaultConfig { applicationId '$PKG'; minSdk 21; targetSdk 35; versionCode ${BUILD_NUMBER}; versionName '1.9.${BUILD_NUMBER}' }
}
EOF
  cat > "$DIR/app/src/main/res/values/styles.xml" <<'EOF'
<resources><style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar"><item name="android:colorAccent">#c80d0d</item></style></resources>
EOF
  cat > "$DIR/app/src/main/res/drawable/ic_launcher.xml" <<'EOF'
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#C8102E" android:pathData="M0,0h108v108h-108z"/>
  <path android:fillColor="#FFFFFF" android:pathData="M18,30h72v48h-72z" android:strokeColor="#7A0B12" android:strokeWidth="2"/>
  <path android:fillColor="#F4B24B" android:pathData="M25,40c0,-6 5,-11 11,-11h36c6,0 11,5 11,11v28c0,6 -5,11 -11,11h-36c-6,0 -11,-5 -11,-11z"/>
  <path android:fillColor="#7A2E14" android:pathData="M31,48c0,-5 4,-9 9,-9h28c5,0 9,4 9,9v12c0,5 -4,9 -9,9h-28c-5,0 -9,-4 -9,-9z"/>
  <path android:strokeColor="#FFD21F" android:strokeWidth="4" android:strokeLineCap="round" android:fillColor="@android:color/transparent" android:pathData="M35,48 C40,42 45,54 50,48 S60,54 66,48 S76,54 78,48"/>
  <path android:strokeColor="#FFFFFF" android:strokeWidth="3" android:strokeLineCap="round" android:fillColor="@android:color/transparent" android:pathData="M35,60 C41,54 46,66 52,60 S63,66 69,60 S76,66 78,60"/>
</vector>
EOF
  cat > "$DIR/app/src/main/res/drawable/ic_launcher_background.xml" <<'EOF'
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#C8102E"/></shape>
EOF
  cat > "$DIR/app/src/main/res/drawable/ic_launcher_foreground.xml" <<'EOF'
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#FFFFFF" android:pathData="M18,30h72v48h-72z" android:strokeColor="#7A0B12" android:strokeWidth="2"/>
  <path android:fillColor="#F4B24B" android:pathData="M25,40c0,-6 5,-11 11,-11h36c6,0 11,5 11,11v28c0,6 -5,11 -11,11h-36c-6,0 -11,-5 -11,-11z"/>
  <path android:fillColor="#7A2E14" android:pathData="M31,48c0,-5 4,-9 9,-9h28c5,0 9,4 9,9v12c0,5 -4,9 -9,9h-28c-5,0 -9,-4 -9,-9z"/>
  <path android:strokeColor="#FFD21F" android:strokeWidth="4" android:strokeLineCap="round" android:fillColor="@android:color/transparent" android:pathData="M35,48 C40,42 45,54 50,48 S60,54 66,48 S76,54 78,48"/>
  <path android:strokeColor="#FFFFFF" android:strokeWidth="3" android:strokeLineCap="round" android:fillColor="@android:color/transparent" android:pathData="M35,60 C41,54 46,66 52,60 S63,66 69,60 S76,66 78,60"/>
</vector>
EOF
  cat > "$DIR/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml" <<'EOF'
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@drawable/ic_launcher_background"/>
  <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
EOF
  cat > "$DIR/app/src/main/AndroidManifest.xml" <<EOF
<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><application android:usesCleartextTraffic="true" android:theme="@style/AppTheme" android:label="$TITLE" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher"><activity android:name=".MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>
EOF
  JAVA="$DIR/app/src/main/java/${PKG//.//}/MainActivity.java"
  cat > "$JAVA" <<EOF
package $PKG;
import android.app.Activity; import android.os.Bundle; import android.webkit.WebSettings; import android.webkit.WebView; import android.webkit.WebViewClient; import android.webkit.WebChromeClient; import android.content.Intent; import android.net.Uri;
public class MainActivity extends Activity { WebView w; public void onCreate(Bundle b){super.onCreate(b);w=new WebView(this);setContentView(w);WebSettings s=w.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);s.setAllowContentAccess(true);s.setAllowFileAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);w.setWebChromeClient(new WebChromeClient());w.setWebViewClient(new WebViewClient(){ @Override public boolean shouldOverrideUrlLoading(WebView view,String url){ if(url.startsWith("http://")||url.startsWith("https://")){view.loadUrl(url);return true;} try{startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));}catch(Exception e){} return true;} });w.clearCache(true);w.clearHistory();w.loadUrl("$URL?v=30");} @Override public void onBackPressed(){if(w.canGoBack())w.goBack();else super.onBackPressed();} }
EOF
}
make_app customer-apk com.bakersdawgs.customer "Baker's Dawgs" "https://bakersdawgs.com/"
make_app admin-apk com.bakersdawgs.admin "Baker's Dawgs Admin" "https://bakersdawgs.com/admin.html"
cp android-admin/MainActivity.java admin-apk/app/src/main/java/com/bakersdawgs/admin/MainActivity.java
python3 - <<'MANIFEST'
from pathlib import Path
p=Path('admin-apk/app/src/main/AndroidManifest.xml')
s=p.read_text().replace('<application ', '<uses-permission android:name="android.permission.RECORD_AUDIO"/><uses-permission android:name="android.permission.USE_BIOMETRIC"/><uses-permission android:name="android.permission.USE_FINGERPRINT"/><queries><intent><action android:name="android.speech.RecognitionService"/></intent></queries><application ')
p.write_text(s)
MANIFEST


timeout 12m gradle -p customer-apk --no-daemon assembleDebug --stacktrace
timeout 12m gradle -p admin-apk --no-daemon assembleDebug --stacktrace
mkdir -p dist/customer dist/admin
cp customer-apk/app/build/outputs/apk/debug/app-debug.apk dist/customer/Bakers_Dawgs_Customer.apk
cp admin-apk/app/build/outputs/apk/debug/app-debug.apk dist/admin/Bakers_Dawgs_Admin.apk
cp index.html app.js style.css config.js db.js manifest.json dist/customer/
cp admin.html admin.js kitchen-voice-navigation.js daily-closeout.js admin.css config.js db.js dist/admin/

