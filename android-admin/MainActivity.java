package com.bakersdawgs.admin;

import android.Manifest;
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
import android.net.Uri;
import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends Activity {
  private static final String PAGE = "https://lunaracres8-lgtm.github.io/bakers-dawgs-ordering/admin.html";
  private WebView web;
  private TextToSpeech tts;
  private SpeechRecognizer recognizer;
  private boolean listening;
  private final Intent recognitionIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    web = new WebView(this);
    setContentView(web);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    web.addJavascriptInterface(new VoiceBridge(), "BakersDawgsAndroid");
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
        if (url.startsWith("https://lunaracres8-lgtm.github.io/bakers-dawgs-ordering/")) return false;
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
    web.loadUrl(PAGE + "?v=26");
  }

  private void callback(String method, String value) {
    String safe = org.json.JSONObject.quote(value);
    runOnUiThread(() -> web.evaluateJavascript("window." + method + "&&window." + method + "(" + safe + ")", null));
  }

  private void startRecognition() {
    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
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
          if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS || error == SpeechRecognizer.ERROR_CLIENT) {
            listening = false;
            callback("onNativeVoiceError", "Microphone unavailable. Check the app microphone permission.");
          } else {
            web.postDelayed(() -> { if (listening) recognizer.startListening(recognitionIntent); }, 750);
          }
        }
        @Override public void onResults(Bundle results) {
          ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
          if (matches != null && !matches.isEmpty()) callback("onNativeVoiceCommand", matches.get(0));
          web.postDelayed(() -> { if (listening) recognizer.startListening(recognitionIntent); }, 500);
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

  private class VoiceBridge {
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

  @Override protected void onDestroy() {
    listening = false;
    if (recognizer != null) recognizer.destroy();
    if (tts != null) { tts.stop(); tts.shutdown(); }
    web.destroy();
    super.onDestroy();
  }
  @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
