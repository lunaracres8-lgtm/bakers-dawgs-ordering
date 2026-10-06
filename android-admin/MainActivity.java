package com.bakersdawgs.admin;

import android.Manifest;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.content.DialogInterface;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.print.PrintManager;
import android.print.PrintAttributes;
import android.content.Context;
import android.widget.Toast;
import android.widget.FrameLayout;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import android.net.Uri;
import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends Activity {
  private static final String PAGE = "https://bakersdawgs.com/admin.html";
  private WebView web;
  private TextToSpeech tts;
  private SpeechRecognizer recognizer;
  private boolean listening;
  private CancellationSignal biometricCancellation;
  private String pendingFileText;
  private WebView printView;
  private final Intent recognitionIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    web = new WebView(this);
    FrameLayout root = new FrameLayout(this);
    root.addView(web, new FrameLayout.LayoutParams(-1, -1));
    root.setOnApplyWindowInsetsListener((view, insets) -> {
      view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
      return insets;
    });
    setContentView(root);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    // Required for JavaScript alert, confirm and prompt (including manager PINs).
    web.setWebChromeClient(new WebChromeClient());
    web.addJavascriptInterface(new VoiceBridge(), "BakersDawgsAndroid");
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
        if (url.startsWith("https://bakersdawgs.com/")) return false;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
        return true;
      }
    });
    tts = new TextToSpeech(this, status -> {
      if (status == TextToSpeech.SUCCESS) tts.setLanguage(Locale.US);
      else callback("onNativeVoiceError", "Android text-to-speech is unavailable. Check the device speech engine.");
    });
    recognitionIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
    recognitionIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US");
    recognitionIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
    // New build marker makes the installed Admin app fetch the current order-board code.
    web.loadUrl(PAGE + "?v=59");
  }

  private void callback(String method, String value) {
    String safe = org.json.JSONObject.quote(value);
    runOnUiThread(() -> web.evaluateJavascript("window." + method + "&&window." + method + "(" + safe + ")", null));
  }

  private void startRecognition() {
    if (listening) {
      callback("onNativeVoiceStatus", "Already listening. Speak your kitchen command, or tap Stop Listening.");
      return;
    }
    if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 7);
      return;
    }
    if (!SpeechRecognizer.isRecognitionAvailable(this)) {
      listening = false;
      callback("onNativeVoiceError", "Speech recognition is unavailable. Install or enable Google's Speech Services.");
      return;
    }
    if (recognizer == null) {
      recognizer = SpeechRecognizer.createSpeechRecognizer(this);
      recognizer.setRecognitionListener(new RecognitionListener() {
        @Override public void onReadyForSpeech(Bundle params) { callback("onNativeVoiceStatus", "Listening for kitchen commands"); }
        @Override public void onBeginningOfSpeech() { }
        @Override public void onRmsChanged(float rms) { }
        @Override public void onBufferReceived(byte[] buffer) { }
        @Override public void onEndOfSpeech() { }
        @Override public void onError(int error) {
          if (!listening) return;
          listening = false;
          if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS || error == SpeechRecognizer.ERROR_CLIENT) {
            callback("onNativeVoiceError", "Microphone unavailable. Check the app microphone permission.");
          } else {
            callback("onNativeVoiceStatus", "No command heard. Tap Start Listening when you need the kitchen assistant.");
          }
        }
        @Override public void onResults(Bundle results) {
          ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
          if (matches != null && !matches.isEmpty()) callback("onNativeVoiceCommand", matches.get(0));
          listening = false;
          callback("onNativeVoiceStatus", "Command received. Tap Start Listening when you need it again.");
        }
        @Override public void onPartialResults(Bundle results) { }
        @Override public void onEvent(int eventType, Bundle params) { }
      });
    }
    listening = true;
    recognizer.startListening(recognitionIntent);
  }

  @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
    super.onRequestPermissionsResult(requestCode, permissions, results);
    if (requestCode == 7) {
      if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) startRecognition();
      else callback("onNativeVoiceError", "Microphone permission denied. Enable it in Android app settings.");
    }
  }

  private void authenticateBiometric(String purpose) {
    if (Build.VERSION.SDK_INT < 28) {
      callback("onNativeBiometricError", "This Android version does not support the app fingerprint prompt.");
      return;
    }
    try {
      if (biometricCancellation != null) biometricCancellation.cancel();
      biometricCancellation = new CancellationSignal();
      BiometricPrompt.Builder builder = new BiometricPrompt.Builder(this)
          .setTitle("Baker's Dawgs Admin")
          .setSubtitle(purpose.equals("enroll") ? "Enable fingerprint unlock" : "Unlock the order board")
          .setNegativeButton("Cancel", getMainExecutor(), (dialog, which) -> {});
      builder.build().authenticate(biometricCancellation, getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
        @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
          callback("onNativeBiometricSuccess", purpose);
        }
        @Override public void onAuthenticationError(int code, CharSequence message) {
          if (code != BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED)
            callback("onNativeBiometricError", message.toString());
        }
      });
    } catch (Exception error) {
      callback("onNativeBiometricError", "Fingerprint is unavailable. Set up a fingerprint in Android Settings, or use the staff PIN.");
    }
  }

  private class VoiceBridge {
    @JavascriptInterface public void saveText(String filename, String text, String mime) {
      runOnUiThread(() -> {
        if (pendingFileText != null) { Toast.makeText(MainActivity.this, "Finish the current save first.", Toast.LENGTH_SHORT).show(); return; }
        pendingFileText = text;
        Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        save.addCategory(Intent.CATEGORY_OPENABLE);
        save.setType("application/json".equals(mime) ? "application/json" : "text/plain");
        save.putExtra(Intent.EXTRA_TITLE, filename.replaceAll("[^A-Za-z0-9._-]", "_"));
        try { startActivityForResult(save, 8); }
        catch (Exception error) { pendingFileText = null; Toast.makeText(MainActivity.this, "No file-saving app is available.", Toast.LENGTH_LONG).show(); }
      });
    }
    @JavascriptInterface public void printText(String title, String text) {
      runOnUiThread(() -> {
        if (printView != null) printView.destroy();
        printView = new WebView(MainActivity.this);
        printView.setWebViewClient(new WebViewClient() {
          @Override public void onPageFinished(WebView view, String url) {
            PrintManager manager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
            if (manager != null) manager.print(title, view.createPrintDocumentAdapter(title), new PrintAttributes.Builder().build());
          }
        });
        String safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
        printView.loadDataWithBaseURL(null, "<html><body><pre style='white-space:pre-wrap;font:14px sans-serif'>" + safe + "</pre></body></html>", "text/html", "UTF-8", null);
      });
    }
    @JavascriptInterface public void authenticateBiometric(String purpose) {
      runOnUiThread(() -> MainActivity.this.authenticateBiometric("enroll".equals(purpose) ? "enroll" : "unlock"));
    }
    @JavascriptInterface public void speak(String text) {
      runOnUiThread(() -> {
        if (tts != null) { tts.stop(); tts.setSpeechRate(1.0f); tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "kitchen-order"); }
      });
    }
    @JavascriptInterface public void stopSpeaking() { runOnUiThread(() -> { if (tts != null) tts.stop(); }); }
    @JavascriptInterface public void startListening() { runOnUiThread(() -> startRecognition()); }
    @JavascriptInterface public void stopListening() {
      runOnUiThread(() -> { listening = false; if (recognizer != null) recognizer.cancel(); });
    }
  }

  @Override protected void onActivityResult(int request, int result, Intent data) {
    super.onActivityResult(request, result, data);
    if (request != 8) return;
    String text = pendingFileText;
    pendingFileText = null;
    if (result != RESULT_OK || data == null || data.getData() == null || text == null) return;
    try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
      if (out == null) throw new Exception("No output stream");
      out.write(text.getBytes(StandardCharsets.UTF_8));
      Toast.makeText(this, "File saved.", Toast.LENGTH_SHORT).show();
    } catch (Exception error) { Toast.makeText(this, "Could not save the file. Try again.", Toast.LENGTH_LONG).show(); }
  }

  @Override protected void onDestroy() {
    listening = false;
    if (biometricCancellation != null) biometricCancellation.cancel();
    if (recognizer != null) recognizer.destroy();
    if (tts != null) { tts.stop(); tts.shutdown(); }
    web.destroy();
    if (printView != null) printView.destroy();
    super.onDestroy();
  }
  @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
