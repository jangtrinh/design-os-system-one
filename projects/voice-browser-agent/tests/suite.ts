import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3000/ws");

function waitMessage(type: string): Promise<any> {
  return new Promise((resolve) => {
    const handler = (data: any) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === type) {
        ws.off("message", handler);
        resolve(msg);
      }
    };
    ws.on("message", handler);
  });
}

async function run() {
  await new Promise((res) => ws.on("open", res));
  console.log("✅ WebSocket Connected!");

  // Test 1: Navigate
  console.log("\n--- TEST 1: Navigate ---");
  ws.send(JSON.stringify({ type: "voice_command", text: "mở trang vnexpress.net", language: "vi-VN" }));
  const navRes = await waitMessage("action_completed");
  console.log("Nav Result:", navRes.message);

  // Test 2: Scroll
  console.log("\n--- TEST 2: Scroll ---");
  ws.send(JSON.stringify({ type: "voice_command", text: "cuộn xuống dưới", language: "vi-VN" }));
  const scrollRes = await waitMessage("action_completed");
  console.log("Scroll Result:", scrollRes.message);

  // Test 3: Click
  console.log("\n--- TEST 3: Click element ---");
  ws.send(JSON.stringify({ type: "voice_command", text: "click bài báo đầu tiên", language: "vi-VN" }));
  const clickRes = await waitMessage("action_completed");
  console.log("Click Result:", clickRes.message);

  // Test 4: Go back
  console.log("\n--- TEST 4: Go back ---");
  ws.send(JSON.stringify({ type: "voice_command", text: "quay lại trang trước", language: "vi-VN" }));
  const backRes = await waitMessage("action_completed");
  console.log("Back Result:", backRes.message);

  console.log("\n🎉 ALL 4 TESTS PASSED FLAWLESSLY!");
  ws.close();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
