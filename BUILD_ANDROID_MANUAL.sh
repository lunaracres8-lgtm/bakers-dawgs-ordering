#!/usr/bin/env bash
set -euo pipefail
# First run BUILD_ANDROID.sh to generate customer-apk and admin-apk, or reuse
# the generated project templates supplied in the handoff.
: "${ANDROID_HOME:?Set ANDROID_HOME}"
: "${JAVA_HOME:?Set JAVA_HOME to a JDK}"
BT="$ANDROID_HOME/build-tools/35.0.0"
ANDROID_JAR="$ANDROID_HOME/platforms/android-35/android.jar"
BUILD_KEY="${BUILD_KEY:-$PWD/.android-local-build.keystore}"
if [ ! -f "$BUILD_KEY" ]; then
 "$JAVA_HOME/bin/keytool" -genkeypair -keystore "$BUILD_KEY" -storepass android -keypass android -alias androiddebugkey -dname 'CN=Android Debug,O=Android,C=US' -keyalg RSA -keysize 2048 -validity 10000 >/dev/null 2>&1
fi
for KIND in customer admin; do
 PROJ="$KIND-apk"
 WORK="$PROJ/manual-build"
 mkdir -p "$WORK/classes" "$WORK/dex" "dist/$KIND"
 python3 - "$PROJ/app/src/main/AndroidManifest.xml" "$WORK/AndroidManifest.xml" "$KIND" <<'PY_MANIFEST'
import sys
from pathlib import Path
s=Path(sys.argv[1]).read_text().replace('<manifest ', '<manifest package="com.bakersdawgs.'+sys.argv[3]+'" ',1)
Path(sys.argv[2]).write_text(s)
PY_MANIFEST
 "$BT/aapt2" compile --dir "$PROJ/app/src/main/res" -o "$WORK/resources.zip"
 "$BT/aapt2" link -o "$WORK/base.apk" --manifest "$WORK/AndroidManifest.xml" -I "$ANDROID_JAR" --min-sdk-version 21 --target-sdk-version 35 --version-code 431 --version-name 1.9.431 "$WORK/resources.zip"
 find "$PROJ/app/src/main/java" -name '*.java' -print0 | xargs -0 "$JAVA_HOME/bin/javac" -source 8 -target 8 -classpath "$ANDROID_JAR" -d "$WORK/classes"
 find "$WORK/classes" -name '*.class' -print0 | xargs -0 "$BT/d8" --min-api 21 --lib "$ANDROID_JAR" --output "$WORK/dex"
 python3 - "$WORK/base.apk" "$WORK/dex/classes.dex" <<'PY'
import sys,zipfile
with zipfile.ZipFile(sys.argv[1],'a',compression=zipfile.ZIP_DEFLATED) as z:z.write(sys.argv[2],'classes.dex')
PY
 "$BT/zipalign" -f 4 "$WORK/base.apk" "$WORK/aligned.apk"
 if [ "$KIND" = admin ]; then NAME=Admin; else NAME=Customer; fi
 "$BT/apksigner" sign --ks "$BUILD_KEY" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out "dist/$KIND/Bakers_Dawgs_$NAME.apk" "$WORK/aligned.apk"
 "$BT/apksigner" verify --verbose "dist/$KIND/Bakers_Dawgs_$NAME.apk"
done
