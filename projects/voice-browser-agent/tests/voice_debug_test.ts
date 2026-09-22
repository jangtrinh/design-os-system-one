import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3000/ws");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  await new Promise((res) => ws.on("open", res));
  console.log("Client test connected to WebSocket.");

  // 1. Simulate client environment
  ws.send(JSON.stringify({
    type: "speech_event",
    event: "client_environment",
    details: {
      isSpeechSupported: true,
      isChrome: true,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0",
      language: "vi-VN"
    }
  }));
  await sleep(400);

  // 2. Simulate microphone permission query
  ws.send(JSON.stringify({
    type: "speech_event",
    event: "mic_permission_status",
    details: { state: "granted" }
  }));
  await sleep(400);

  // 3. Simulate browser console log
  ws.send(JSON.stringify({
    type: "client_console",
    level: "info",
    text: "Người dùng nhấn phím SPACE để bắt đầu nói..."
  }));
  await sleep(400);

  // 4. Simulate Speech Recognition start
  ws.send(JSON.stringify({
    type: "speech_event",
    event: "onaudiostart",
    details: "Phần cứng mic đã bắt đầu thu nhận audio"
  }));
  await sleep(300);

  ws.send(JSON.stringify({
    type: "speech_event",
    event: "onspeechstart",
    details: "Phát hiện tiếng nói con người (Speech detected)"
  }));
  await sleep(500);

  // 5. Simulate Speech Recognition interim result
  ws.send(JSON.stringify({
    type: "speech_event",
    event: "onresult",
    details: { transcript: "mở youtube", isFinal: false, confidence: 0.85 }
  }));
  await sleep(600);

  // 6. Simulate Speech Recognition final result
  ws.send(JSON.stringify({
    type: "speech_event",
    event: "onresult",
    details: { transcript: "mở trang youtube.com", isFinal: true, confidence: 0.98 }
  }));
  await sleep(400);

  // 7. Simulate Speech Recognition end & silence commit
  ws.send(JSON.stringify({
    type: "speech_event",
    event: "onaudioend",
    details: "Phần cứng mic kết thúc phiên thu"
  }));
  await sleep(300);

  ws.send(JSON.stringify({
    type: "speech_event",
    event: "silence_auto_commit",
    details: { text: "mở trang youtube.com" }
  }));
  await sleep(300);

  // 8. Execute voice command
  console.log("Sending actual voice command...");
  ws.send(JSON.stringify({
    type: "voice_command",
    text: "mở trang youtube.com",
    language: "vi-VN"
  }));

  // Wait for action completion
  await new Promise<void>((resolve) => {
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "action_completed" || msg.type === "action_failed") {
        console.log(`Command response received: [${msg.type}]`, msg.message || msg.error);
        resolve();
      }
    });
  });

  await sleep(500);
  ws.close();
  console.log("Test finished successfully.");
}

run().catch(console.error);
