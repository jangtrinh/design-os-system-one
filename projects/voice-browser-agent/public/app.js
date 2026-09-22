// JEV Voice Browser Agent - Ultra-Reliable Voice & Automation Engine

let ws = null;
let recognition = null;
let isListening = false;
let currentLanguage = "vi-VN";
let isHeadful = true;
let isTtsEnabled = true;

// Buffer & Timers
let speechBuffer = "";
let silenceTimer = null;
let isSpacePressed = false;

// Console Bridge to Server Console (Real-time Debugging)
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
};

function forwardLogToServer(level, text) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: "client_console", level, text }));
    } catch {}
  }
}

function sendSpeechEvent(event, details) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: "speech_event", event, details }));
    } catch {}
  }
}

console.log = function(...args) {
  originalConsole.log.apply(console, args);
  forwardLogToServer("info", args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
};

console.warn = function(...args) {
  originalConsole.warn.apply(console, args);
  forwardLogToServer("warn", args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
};

console.error = function(...args) {
  originalConsole.error.apply(console, args);
  forwardLogToServer("error", args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
};

// DOM Elements
const micBtn = document.getElementById("mic-btn");
const micStatusPill = document.getElementById("mic-status-pill");
const micHint = document.getElementById("mic-hint");
const transcriptText = document.getElementById("transcript-text");
const langSelect = document.getElementById("lang-select");
const currentLangTag = document.getElementById("current-lang-tag");
const currentUrlEl = document.getElementById("current-url");
const connectionDot = document.getElementById("connection-dot");
const toggleHeadfulBtn = document.getElementById("toggle-headful-btn");
const headfulStatusText = document.getElementById("headful-status-text");
const ttsToggleBtn = document.getElementById("tts-toggle-btn");
const ttsStatusText = document.getElementById("tts-status-text");
const browserScreencast = document.getElementById("browser-screencast");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingMsg = document.getElementById("loading-msg");
const pageTitleDisplay = document.getElementById("page-title-display");
const elementsCountEl = document.getElementById("elements-count");
const manualForm = document.getElementById("manual-form");
const manualInput = document.getElementById("manual-input");
const logStream = document.getElementById("log-stream");
const clearLogBtn = document.getElementById("clear-log-btn");
const testMicBtn = document.getElementById("test-mic-btn");
const audioCanvas = document.getElementById("audio-visualizer");
const canvasCtx = audioCanvas.getContext("2d");

// Jev Inspector Elements
const decisionIntent = document.getElementById("decision-intent");
const decisionConfidence = document.getElementById("decision-confidence");
const confidenceBar = document.getElementById("confidence-bar");
const decisionTarget = document.getElementById("decision-target");
const probList = document.getElementById("prob-list");
const jevLatency = document.getElementById("jev-latency");

// Modal Elements
const apiModal = document.getElementById("api-modal");
const apiKeyBtn = document.getElementById("api-key-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelModalBtn = document.getElementById("cancel-modal-btn");
const saveApiKeyBtn = document.getElementById("save-api-key-btn");
const apiKeyInput = document.getElementById("api-key-input");

// ==========================================
// 1. WebSocket Connection
// ==========================================
function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  addLog("info", "Đang kết nối tới máy chủ...");
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    addLog("info", "Kết nối WebSocket thành công. Sẵn sàng!");
    connectionDot.style.backgroundColor = "var(--success)";
    connectionDot.style.boxShadow = "0 0 8px var(--success)";

    // Báo cáo chẩn đoán môi trường Client lên Server Console
    checkClientEnvironment();

    const savedKey = localStorage.getItem("TYPESAFE_API_KEY");
    if (savedKey) {
      apiKeyInput.value = savedKey;
      ws.send(JSON.stringify({ type: "set_api_key", apiKey: savedKey }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (e) {
      console.error("Lỗi parse WS message:", e);
    }
  };

  ws.onclose = () => {
    connectionDot.style.backgroundColor = "var(--danger)";
    connectionDot.style.boxShadow = "0 0 8px var(--danger)";
    addLog("warn", "Mất kết nối server. Đang thử kết nối lại sau 2 giây...");
    setTimeout(connectWebSocket, 2000);
  };
}

function handleServerMessage(msg) {
  switch (msg.type) {
    case "status":
      renderBrowserStatus(msg.status);
      break;

    case "jev_evaluating":
      jevLatency.innerText = "...";
      decisionIntent.innerText = "Đang xử lý...";
      addLog("info", `⚡ Jev System One đang phân tích: "${msg.text}"`);
      break;

    case "jev_result":
      renderJevDecision(msg.decision, msg.executionTimeMs);
      break;

    case "action_started":
      addLog("info", `▶️ Bắt đầu thực thi: [${msg.action.toUpperCase()}] -> ${msg.details}`);
      loadingOverlay.classList.remove("hidden");
      loadingMsg.innerText = `Đang thực thi: ${msg.action}...`;
      break;

    case "action_completed":
      addLog("info", `✅ Hoàn thành: ${msg.message}`);
      loadingOverlay.classList.add("hidden");
      speakFeedback(msg.message);
      break;

    case "action_failed":
      addLog("error", `❌ Thất bại: ${msg.error}`);
      loadingOverlay.classList.add("hidden");
      speakFeedback(`Lỗi: ${msg.error}`);
      break;

    case "log":
      addLog(msg.level, msg.message);
      break;
  }
}

function renderBrowserStatus(status) {
  if (status.url) currentUrlEl.innerText = status.url;
  if (status.title) {
    pageTitleDisplay.innerText = status.title;
    document.title = `${status.title} - JEV Voice Agent`;
  }
  if (status.elementCount !== undefined) {
    elementsCountEl.innerText = `${status.elementCount} phần tử tương tác`;
  }
  if (status.screenshotBase64) {
    browserScreencast.src = `data:image/jpeg;base64,${status.screenshotBase64}`;
    loadingOverlay.classList.add("hidden");
  }
}

function renderJevDecision(decision, latencyMs) {
  jevLatency.innerText = `${latencyMs} ms`;
  decisionIntent.innerText = decision.intent.toUpperCase();

  const confPercent = Math.round((decision.confidence || 0) * 100);
  decisionConfidence.innerText = `${confPercent}%`;
  confidenceBar.style.width = `${confPercent}%`;

  if (confPercent >= 80) {
    confidenceBar.style.backgroundColor = "var(--success)";
  } else if (confPercent >= 60) {
    confidenceBar.style.backgroundColor = "var(--warning)";
  } else {
    confidenceBar.style.backgroundColor = "var(--danger)";
  }

  let targetDesc = "Không có";
  if (decision.targetUrl) targetDesc = `URL: ${decision.targetUrl}`;
  else if (decision.targetElementText) targetDesc = `Element: "${decision.targetElementText}" (ID: #${decision.targetElementId})`;
  else if (decision.inputText) targetDesc = `Text: "${decision.inputText}"`;
  decisionTarget.innerText = targetDesc;

  probList.innerHTML = "";
  if (decision.probabilities && Object.keys(decision.probabilities).length > 0) {
    for (const [key, prob] of Object.entries(decision.probabilities)) {
      const item = document.createElement("div");
      item.className = "prob-item";
      item.innerHTML = `
        <span>${key}</span>
        <span style="color: #38bdf8">${(prob * 100).toFixed(1)}%</span>
      `;
      probList.appendChild(item);
    }
  } else {
    probList.innerHTML = `<div class="prob-empty">Không có phân phối chi tiết</div>`;
  }

  if (decision.reasoningNote) {
    addLog("info", `🧠 Jev Engine: ${decision.reasoningNote}`);
  }
}

// ==========================================
// 2. Audio Visualizer (Waveform Simulation)
// ==========================================
let waveInterval = null;

function startWaveform() {
  if (waveInterval) clearInterval(waveInterval);
  waveInterval = setInterval(() => {
    canvasCtx.clearRect(0, 0, audioCanvas.width, audioCanvas.height);
    canvasCtx.fillStyle = "#0c0c0e";
    canvasCtx.fillRect(0, 0, audioCanvas.width, audioCanvas.height);

    const bars = 24;
    const barWidth = audioCanvas.width / bars;

    for (let i = 0; i < bars; i++) {
      const height = isListening
        ? Math.random() * (audioCanvas.height * 0.8) + 4
        : 2;
      canvasCtx.fillStyle = isListening ? "#10b981" : "#27272a";
      canvasCtx.fillRect(i * barWidth + 2, (audioCanvas.height - height) / 2, barWidth - 4, height);
    }
  }, 80);
}

function stopWaveform() {
  if (waveInterval) clearInterval(waveInterval);
  canvasCtx.clearRect(0, 0, audioCanvas.width, audioCanvas.height);
  canvasCtx.fillStyle = "#0c0c0e";
  canvasCtx.fillRect(0, 0, audioCanvas.width, audioCanvas.height);
}

// ==========================================
// 3. Web Speech API với Auto-Commit Silence
// ==========================================
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micStatusPill.innerText = "Không hỗ trợ";
    micStatusPill.style.color = "var(--danger)";
    micHint.innerText = "Trình duyệt này không hỗ trợ Web Speech API. Vui lòng dùng Google Chrome hoặc các nút lệnh bên dưới.";
    addLog("warn", "Trình duyệt không hỗ trợ Web Speech API. Bạn hãy dùng Google Chrome.");
    return;
  }

  try {
    if (recognition) {
      try { recognition.abort(); } catch {}
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = currentLanguage;
    recognition.maxAlternatives = 1;

    // Hook toàn bộ Audio & Speech Lifecycle Events để debug Console
    recognition.onaudiostart = () => {
      sendSpeechEvent("onaudiostart", "Phần cứng mic đã bắt đầu thu nhận audio");
    };

    recognition.onsoundstart = () => {
      sendSpeechEvent("onsoundstart", "Phát hiện sóng âm thanh truyền vào");
    };

    recognition.onspeechstart = () => {
      sendSpeechEvent("onspeechstart", "Phát hiện tiếng nói con người (Speech detected)");
    };

    recognition.onspeechend = () => {
      sendSpeechEvent("onspeechend", "Tiếng nói con người tạm dừng");
    };

    recognition.onsoundend = () => {
      sendSpeechEvent("onsoundend", "Sóng âm thanh kết thúc");
    };

    recognition.onaudioend = () => {
      sendSpeechEvent("onaudioend", "Phần cứng mic kết thúc phiên thu");
    };

    recognition.onstart = () => {
      isListening = true;
      speechBuffer = "";
      micBtn.classList.add("listening");
      micStatusPill.innerText = "Đang lắng nghe...";
      micStatusPill.style.color = "var(--danger)";
      micHint.innerText = "🎙️ Đang nghe... Hãy nói lệnh (nhấn Space hoặc bấm Mic lần nữa để gửi)";
      addLog("info", `Microphone ĐANG BẬT (${currentLanguage}). Hãy nói câu lệnh!`);
      sendSpeechEvent("onstart", { lang: currentLanguage, continuous: recognition.continuous });
      startWaveform();
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const spoken = (final || interim).trim();
      const topConfidence = event.results[event.resultIndex]?.[0]?.confidence ?? 1.0;

      sendSpeechEvent("onresult", {
        transcript: spoken,
        isFinal: !!final,
        confidence: typeof topConfidence === "number" ? Number(topConfidence.toFixed(2)) : 1.0,
      });

      if (spoken) {
        speechBuffer = spoken;
        transcriptText.innerText = `"${spoken}"`;
        transcriptText.style.color = final ? "#38bdf8" : "#fde047";

        // Tự động kích hoạt Silence Timer: 1000ms sau khi ngừng nói -> Tự động gửi lệnh
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (speechBuffer.trim() && isListening) {
            addLog("info", `⏱️ Tự động gửi lệnh sau khoảng lặng: "${speechBuffer}"`);
            sendSpeechEvent("silence_auto_commit", { text: speechBuffer.trim() });
            commitAndSendVoice(speechBuffer.trim());
          }
        }, 1000);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      sendSpeechEvent("onerror", { error: event.error, message: event.message });

      if (event.error === "not-allowed") {
        stopListening();
        addLog("error", "❌ Quyền Microphone bị từ chối! Vui lòng vào Cài đặt macOS (System Settings > Privacy & Security > Microphone) và cho phép Google Chrome.");
      } else if (event.error === "network") {
        stopListening();
        addLog("error", "❌ Lỗi 'network' từ Web Speech API: Trình duyệt không thể kết nối tới máy chủ Google Speech.");
        addLog("warn", "💡 Khắc phục: Nếu đang dùng Brave Browser hoặc Arc, trình duyệt chặn dịch vụ Google Speech. Bạn hãy mở link http://localhost:3000 bằng Google Chrome chính thức, hoặc sử dụng các nút lệnh và ô nhập bên dưới.");
      } else if (event.error === "audio-capture") {
        stopListening();
        addLog("error", "❌ Không thể bắt thiết bị Microphone. Có thể một app khác đang chiếm micro.");
      } else if (event.error !== "no-speech") {
        addLog("warn", `Thông báo Speech: ${event.error}`);
      }
    };

    recognition.onend = () => {
      sendSpeechEvent("onend", { isListening, bufferedText: speechBuffer });

      // Nếu có câu nói còn tồn đọng trong buffer, gửi ngay lập tức
      if (speechBuffer.trim()) {
        commitAndSendVoice(speechBuffer.trim());
      }

      if (isListening) {
        setTimeout(() => {
          if (isListening && recognition) {
            try { recognition.start(); } catch {}
          }
        }, 300);
      } else {
        stopListening();
      }
    };
  } catch (err) {
    console.error("Lỗi khởi tạo SpeechRecognition:", err);
    sendSpeechEvent("init_error", { message: err?.message });
  }
}

function startListening() {
  initSpeechRecognition();
  if (!recognition) return;

  try {
    speechBuffer = "";
    recognition.lang = currentLanguage;
    recognition.start();
  } catch (e) {
    console.warn("Lỗi start recognition:", e);
  }
}

function stopListening() {
  isListening = false;
  clearTimeout(silenceTimer);
  micBtn.classList.remove("listening");
  micStatusPill.innerText = "Sẵn sàng";
  micStatusPill.style.color = "var(--success)";
  micHint.innerText = "Bấm Micro hoặc Giữ Phím SPACE để nói";
  stopWaveform();

  // Commit buffer nếu có
  if (speechBuffer.trim()) {
    commitAndSendVoice(speechBuffer.trim());
  }

  if (recognition) {
    try { recognition.stop(); } catch {}
  }
}

function commitAndSendVoice(text) {
  clearTimeout(silenceTimer);
  speechBuffer = "";
  transcriptText.innerText = `"${text}"`;
  transcriptText.style.color = "#38bdf8";
  sendVoiceCommand(text);
}

function sendVoiceCommand(text) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addLog("error", "Chưa kết nối tới server WebSocket. Đang kết nối lại...");
    connectWebSocket();
    return;
  }
  ws.send(JSON.stringify({
    type: "voice_command",
    text,
    language: currentLanguage
  }));
}

// ==========================================
// 4. Text-to-Speech (Agent Voice Feedback)
// ==========================================
function speakFeedback(text) {
  if (!isTtsEnabled || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/https?:\/\/[^\s]+/g, "trang web").replace(/[^\p{L}\p{N}\s.,?]/gu, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = currentLanguage === "vi-VN" ? "vi-VN" : "en-US";
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("TTS Error:", e);
  }
}

// ==========================================
// 5. Push-To-Talk (Phím SPACE) & Event Listeners
// ==========================================

// Phím Space để Push-to-Talk (Rất nhạy & tiện)
window.addEventListener("keydown", (e) => {
  // Bỏ qua nếu đang gõ trong input text
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  if (e.code === "Space" && !isSpacePressed) {
    e.preventDefault();
    isSpacePressed = true;
    addLog("info", "🎙️ [Phím SPACE] Đang giữ để nói...");
    startListening();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  if (e.code === "Space" && isSpacePressed) {
    e.preventDefault();
    isSpacePressed = false;
    addLog("info", "🎙️ [Phím SPACE] Đã nhả phím. Đang gửi lệnh...");
    stopListening();
  }
});

micBtn.addEventListener("click", () => {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
});

langSelect.addEventListener("change", (e) => {
  currentLanguage = e.target.value;
  currentLangTag.innerText = currentLanguage;
  addLog("info", `Đã chuyển ngôn ngữ nhận diện sang: ${currentLanguage}`);
  if (isListening) {
    stopListening();
    setTimeout(startListening, 300);
  }
});

ttsToggleBtn.addEventListener("click", () => {
  isTtsEnabled = !isTtsEnabled;
  ttsToggleBtn.classList.toggle("active", isTtsEnabled);
  ttsStatusText.innerText = isTtsEnabled ? "Loa: BẬT" : "Loa: TẮT";
  addLog("info", `Phản hồi giọng nói: ${isTtsEnabled ? "BẬT" : "TẮT"}`);
});

toggleHeadfulBtn.addEventListener("click", () => {
  isHeadful = !isHeadful;
  headfulStatusText.innerText = isHeadful ? "Cửa Sổ Thật: BẬT" : "Cửa Sổ Thật: TẮT";
  toggleHeadfulBtn.classList.toggle("active", isHeadful);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "toggle_headful", headful: isHeadful }));
  }
});

manualForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = manualInput.value.trim();
  if (!text) return;
  manualInput.value = "";
  transcriptText.innerText = `"${text}"`;
  transcriptText.style.color = "#38bdf8";
  sendVoiceCommand(text);
});

// Quick Action Tags
document.querySelectorAll(".tag").forEach((btn) => {
  btn.addEventListener("click", () => {
    const cmd = btn.getAttribute("data-cmd");
    if (cmd) {
      transcriptText.innerText = `"${cmd}"`;
      transcriptText.style.color = "#38bdf8";
      addLog("info", `🖱️ Lệnh nhanh: "${cmd}"`);
      sendVoiceCommand(cmd);
    }
  });
});

clearLogBtn.addEventListener("click", () => {
  logStream.innerHTML = "";
});

// Modal API Key
apiKeyBtn.addEventListener("click", () => {
  apiModal.classList.add("open");
});
closeModalBtn.addEventListener("click", () => {
  apiModal.classList.remove("open");
});
cancelModalBtn.addEventListener("click", () => {
  apiModal.classList.remove("open");
});
saveApiKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  localStorage.setItem("TYPESAFE_API_KEY", key);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "set_api_key", apiKey: key }));
  }
  apiModal.classList.remove("open");
});

// ==========================================
// 6. Chẩn Đoán Microphone & Báo Cáo Môi Trường
// ==========================================
function checkClientEnvironment() {
  const isSpeechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const userAgent = navigator.userAgent;
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);

  sendSpeechEvent("client_environment", {
    isSpeechSupported,
    isChrome,
    language: currentLanguage,
    platform: navigator.platform,
    userAgent: userAgent.slice(0, 100),
  });

  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: "microphone" }).then((status) => {
      sendSpeechEvent("mic_permission_status", { state: status.state });
      status.onchange = () => {
        sendSpeechEvent("mic_permission_status", { state: status.state });
      };
    }).catch((err) => {
      sendSpeechEvent("mic_permission_status", { error: err.message });
    });
  }
}

async function runMicDiagnostics() {
  addLog("info", "🔍 Đang bắt đầu quy trình chẩn đoán Microphone...");
  sendSpeechEvent("mic_diagnostics_started", {});

  // 1. Kiểm tra Web Speech API
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    addLog("error", "❌ Trình duyệt này không hỗ trợ Web Speech API! Bạn bắt buộc phải mở bằng Google Chrome.");
    sendSpeechEvent("mic_diagnostics_failed", { reason: "No SpeechRecognition API in browser" });
    return;
  }
  addLog("info", "✅ Web Speech API (webkitSpeechRecognition) có sẵn trong trình duyệt.");

  // 2. Kiểm tra phần cứng Microphone (getUserMedia)
  try {
    addLog("info", "🎙️ Đang yêu cầu cấp quyền phần cứng Microphone...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const tracks = stream.getAudioTracks();
    const trackName = tracks[0]?.label || "Microphone mặc định";
    addLog("info", `✅ Phần cứng Microphone hoạt động tốt: "${trackName}"`);
    sendSpeechEvent("mic_diagnostics_hardware_ok", { label: trackName });
    // Tắt ngay track để nhả tài nguyên cho SpeechRecognition
    tracks.forEach((t) => t.stop());
  } catch (err) {
    addLog("error", `❌ Không thể mở Microphone phần cứng: ${err.name} - ${err.message}`);
    addLog("warn", "💡 HƯỚNG DẪN: Trên macOS, hãy vào System Settings > Privacy & Security > Microphone > BẬT cho Google Chrome.");
    sendSpeechEvent("mic_diagnostics_hardware_failed", { error: err.name, message: err.message });
    return;
  }

  // 3. Khởi động nhận diện thử
  addLog("info", "🗣️ Đang khởi động nhận diện giọng nói thử (5 giây)... Hãy nói 'xin chào' hoặc bất kỳ câu lệnh nào!");
  startListening();
}

if (testMicBtn) {
  testMicBtn.addEventListener("click", () => {
    runMicDiagnostics();
  });
}

function addLog(level, message) {
  const entry = document.createElement("div");
  entry.className = `log-entry ${level}`;
  const time = new Date().toLocaleTimeString();
  entry.innerText = `[${time}] ${message}`;
  logStream.appendChild(entry);
  logStream.scrollTop = logStream.scrollHeight;
}

// Khởi chạy ứng dụng
window.addEventListener("DOMContentLoaded", () => {
  connectWebSocket();
  initSpeechRecognition();
  stopWaveform();
});

