import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3000/ws");

ws.on("open", () => {
  console.log("✅ Test Client connected to ws://localhost:3000/ws");

  // Send a test voice command
  console.log("📤 Sending voice command: 'Mở trang vnexpress.net'");
  ws.send(JSON.stringify({
    type: "voice_command",
    text: "mở trang vnexpress.net",
    language: "vi-VN"
  }));
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`📥 Received WS message [${msg.type}]:`, msg.type === "status" ? { url: msg.status.url, title: msg.status.title } : msg);

  if (msg.type === "action_completed" && msg.action === "navigate") {
    console.log("🎉 SUCCESS! Navigation completed via voice command!");
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 1000);
  }
});

ws.on("error", (err) => {
  console.error("❌ WS Error:", err);
  process.exit(1);
});
