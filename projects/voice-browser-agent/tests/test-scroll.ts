import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3000/ws");

ws.on("open", () => {
  console.log("✅ Test Client connected to ws://localhost:3000/ws");

  // Send scroll command
  console.log("📤 Sending voice command: 'Cuộn xuống dưới'");
  ws.send(JSON.stringify({
    type: "voice_command",
    text: "cuộn xuống dưới",
    language: "vi-VN"
  }));
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "jev_result") {
    console.log("🧠 Jev Result:", msg.decision);
  }
  if (msg.type === "action_completed") {
    console.log("🎉 Action completed:", msg);
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 1000);
  }
});
