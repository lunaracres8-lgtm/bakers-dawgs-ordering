import SwiftUI
import WebKit
import LocalAuthentication
import AVFoundation
import Speech

struct ContentView: View {
    var body: some View {
        AdminWebView()
            .ignoresSafeArea(.container, edges: .bottom)
    }
}

struct AdminWebView: UIViewRepresentable {
    private let page = URL(string: "https://bakersdawgs.com/admin.html?v=57")!

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        ["bakersBiometric", "bakersSpeak", "bakersStopSpeaking", "bakersStartListening", "bakersStopListening"].forEach {
            controller.add(context.coordinator, name: $0)
        }
        config.userContentController = controller
        config.websiteDataStore = .default()

        let web = WKWebView(frame: .zero, configuration: config)
        context.coordinator.webView = web
        web.navigationDelegate = context.coordinator
        web.allowsBackForwardNavigationGestures = true
        web.scrollView.contentInsetAdjustmentBehavior = .automatic
        web.load(URLRequest(url: page, cachePolicy: .reloadIgnoringLocalCacheData))
        context.coordinator.installBridge(in: web)
        return web
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, SFSpeechRecognizerDelegate {
        weak var webView: WKWebView?
        private let synthesizer = AVSpeechSynthesizer()
        private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        private let audioEngine = AVAudioEngine()
        private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
        private var recognitionTask: SFSpeechRecognitionTask?

        func installBridge(in web: WKWebView) {
            let js = """
            window.BakersDawgsIOS = {
              authenticateBiometric: function(purpose) {
                window.webkit.messageHandlers.bakersBiometric.postMessage(purpose || 'unlock');
              },
              speak: function(text) {
                window.webkit.messageHandlers.bakersSpeak.postMessage(String(text || ''));
              },
              stopSpeaking: function() {
                window.webkit.messageHandlers.bakersStopSpeaking.postMessage('');
              },
              startListening: function() {
                window.webkit.messageHandlers.bakersStartListening.postMessage('');
              },
              stopListening: function() {
                window.webkit.messageHandlers.bakersStopListening.postMessage('');
              }
            };
            """
            web.configuration.userContentController.addUserScript(
                WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: false)
            )
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.name {
            case "bakersBiometric": authenticate(purpose: message.body as? String ?? "unlock")
            case "bakersSpeak": speak(message.body as? String ?? "")
            case "bakersStopSpeaking": synthesizer.stopSpeaking(at: .immediate)
            case "bakersStartListening": requestSpeechAndListen()
            case "bakersStopListening": stopListening()
            default: break
            }
        }

        private func callback(_ name: String, _ value: String) {
            let escaped = value
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "'", with: "\\'")
                .replacingOccurrences(of: "\n", with: "\\n")
            DispatchQueue.main.async {
                self.webView?.evaluateJavaScript("window.\(name)&&window.\(name)('\(escaped)')")
            }
        }

        private func authenticate(purpose: String) {
            let context = LAContext()
            var error: NSError?
            guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
                callback("onNativeBiometricError", "Face ID or Touch ID is unavailable. Set it up in iPhone Settings, or use the staff PIN.")
                return
            }
            let reason = purpose == "enroll" ? "Enable biometric unlock for Baker's Dawgs Admin." : "Unlock the Baker's Dawgs order board."
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                if success { self.callback("onNativeBiometricSuccess", purpose) }
                else if let error { self.callback("onNativeBiometricError", error.localizedDescription) }
            }
        }

        private func speak(_ text: String) {
            guard !text.isEmpty else { return }
            synthesizer.stopSpeaking(at: .immediate)
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
            utterance.rate = AVSpeechUtteranceDefaultSpeechRate
            synthesizer.speak(utterance)
        }

        private func requestSpeechAndListen() {
            SFSpeechRecognizer.requestAuthorization { status in
                guard status == .authorized else {
                    self.callback("onNativeVoiceError", "Speech recognition permission is required for kitchen voice commands.")
                    return
                }
                AVAudioApplication.requestRecordPermission { allowed in
                    if allowed { DispatchQueue.main.async { self.startListening() } }
                    else { self.callback("onNativeVoiceError", "Microphone permission is required for kitchen voice commands.") }
                }
            }
        }

        private func startListening() {
            stopListening()
            guard let recognizer, recognizer.isAvailable else {
                callback("onNativeVoiceError", "Speech recognition is currently unavailable.")
                return
            }
            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = false
            recognitionRequest = request

            let session = AVAudioSession.sharedInstance()
            do {
                try session.setCategory(.record, mode: .measurement, options: .duckOthers)
                try session.setActive(true, options: .notifyOthersOnDeactivation)
                let input = audioEngine.inputNode
                let format = input.outputFormat(forBus: 0)
                input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
                    request.append(buffer)
                }
                audioEngine.prepare()
                try audioEngine.start()
                callback("onNativeVoiceStatus", "Listening for kitchen commands")
            } catch {
                callback("onNativeVoiceError", "The iPhone microphone could not be started.")
                return
            }

            recognitionTask = recognizer.recognitionTask(with: request) { result, error in
                if let result, result.isFinal {
                    self.callback("onNativeVoiceCommand", result.bestTranscription.formattedString)
                    self.stopListening()
                    self.callback("onNativeVoiceStatus", "Command received. Tap Start Listening when you need it again.")
                } else if error != nil {
                    self.stopListening()
                }
            }
        }

        private func stopListening() {
            if audioEngine.isRunning { audioEngine.stop() }
            audioEngine.inputNode.removeTap(onBus: 0)
            recognitionRequest?.endAudio()
            recognitionTask?.cancel()
            recognitionRequest = nil
            recognitionTask = nil
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel); return
            }
            if url.host == "bakersdawgs.com" || url.host == "www.bakersdawgs.com" {
                decisionHandler(.allow)
            } else if navigationAction.navigationType == .linkActivated {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        }
    }
}
