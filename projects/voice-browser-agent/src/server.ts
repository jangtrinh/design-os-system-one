import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { BrowserController } from "./browser.js";
import { JevSemanticEngine } from "./jev.js";
import type { WSClientMessage, WSServerMessage } from "./types.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const PORT = process.env.PORT || 3000;
const browser = new BrowserController(true); // Mặc định mở cửa sổ Chromium thật
const jev = new JevSemanticEngine();

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());

// API kiểm tra trạng thái
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasApiKey: jev.hasRealApiKey() });
});

// Broadcast helper
function broadcast(msg: WSServerMessage) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

async function sendCurrentStatus() {
  const status = await browser.getStatus();
  broadcast({ type: "status", status });
}

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

wss.on("connection", (ws: WebSocket) => {
  const connTime = new Date().toLocaleTimeString();
  console.log(`🔗 ${colors.green}[WEBSOCKET CONNECTED ${connTime}]${colors.reset} Web Client đã kết nối`);

  // Gửi trạng thái ban đầu bất đồng bộ không chặn gắn listener
  browser.getStatus().then((initialStatus) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "status", status: initialStatus }));
    }
  }).catch((err) => console.error("Lỗi lấy status ban đầu:", err));

  ws.on("message", async (data: string) => {
    try {
      const msg: WSClientMessage = JSON.parse(data.toString());

      if (msg.type === "client_console") {
        const ts = new Date().toLocaleTimeString();
        const lvlColor = msg.level === "error" ? colors.red : msg.level === "warn" ? colors.yellow : colors.gray;
        console.log(`🌐 ${lvlColor}[BROWSER ${msg.level.toUpperCase()} ${ts}]${colors.reset} ${msg.text}`);
        return;
      }

      if (msg.type === "speech_event") {
        const ts = new Date().toLocaleTimeString();
        const detailStr = msg.details ? (typeof msg.details === "object" ? JSON.stringify(msg.details) : msg.details) : "";
        let icon = "🎙️";
        let color = colors.cyan;
        if (msg.event.includes("error")) {
          icon = "❌";
          color = colors.red;
        } else if (msg.event.includes("result")) {
          icon = "🗣️";
          color = colors.green;
        } else if (msg.event.includes("start")) {
          icon = "🟢";
          color = colors.cyan;
        } else if (msg.event.includes("end")) {
          icon = "🔴";
          color = colors.yellow;
        }
        console.log(`${icon} ${color}[SPEECH EVENT ${ts}]${colors.reset} ${colors.bright}${msg.event}${colors.reset} ${colors.dim}${detailStr}${colors.reset}`);
        return;
      }

      if (msg.type === "set_api_key") {
        jev.updateApiKey(msg.apiKey);
        console.log(`🔑 ${colors.magenta}[API KEY UPDATED]${colors.reset} Real API: ${jev.hasRealApiKey()}`);
        broadcast({
          type: "log",
          level: "info",
          message: jev.hasRealApiKey()
            ? "Đã cập nhật TYPESAFE_API_KEY (Đang dùng Jev Live API)"
            : "Đã xóa API Key (Chuyển sang chế độ Smart Fallback)"
        });
        return;
      }

      if (msg.type === "toggle_headful") {
        console.log(`🖥️ ${colors.blue}[BROWSER CONFIG]${colors.reset} Headful: ${msg.headful}`);
        broadcast({ type: "log", level: "info", message: `Chuyển chế độ trình duyệt: ${msg.headful ? "Cửa sổ thật (Headful)" : "Chạy ngầm (Headless)"}` });
        await browser.setHeadful(msg.headful);
        await sendCurrentStatus();
        return;
      }

      if (msg.type === "request_status") {
        await sendCurrentStatus();
        return;
      }

      if (msg.type === "voice_command" || msg.type === "manual_command") {
        const rawText = msg.text.trim();
        if (!rawText) return;

        const cmdType = msg.type === "voice_command" ? "VOICE" : "MANUAL";
        console.log(`\n💬 ${colors.bright}${colors.green}[COMMAND RECEIVED - ${cmdType}]${colors.reset} "${rawText}"`);
        broadcast({ type: "log", level: "info", message: `🎤 Nhận lệnh (${cmdType}): "${rawText}"` });
        broadcast({ type: "jev_evaluating", text: rawText });

        const startTime = Date.now();
        const page = await browser.ensurePage();
        const currentUrl = page.url();
        const currentTitle = await page.title();
        const elements = await browser.getInteractiveElements();

        console.log(`⚡ ${colors.magenta}[JEV SYSTEM ONE]${colors.reset} Evaluating intent against active DOM (${elements.length} elements)...`);
        // Đánh giá bằng Jev System One
        const decision = await jev.interpret(rawText, currentUrl, currentTitle, elements);
        const elapsed = Date.now() - startTime;

        console.log(`🎯 ${colors.magenta}[JEV DECISION]${colors.reset} Intent: ${colors.bright}${decision.intent}${colors.reset} | Confidence: ${(decision.confidence * 100).toFixed(1)}% | Latency: ${elapsed}ms`);
        if (decision.targetUrl) console.log(`   🔗 Target URL: ${decision.targetUrl}`);
        if (decision.targetElementText) console.log(`   🎯 Target Element: "${decision.targetElementText}" (#${decision.targetElementId})`);
        if (decision.inputText) console.log(`   ⌨️  Input Text: "${decision.inputText}"`);
        if (decision.reasoningNote) console.log(`   💡 Note: ${decision.reasoningNote}`);

        broadcast({
          type: "jev_result",
          decision,
          executionTimeMs: elapsed,
        });

        // Kiểm tra an toàn: Confidence-gated routing
        if (decision.intent === "unsupported") {
          broadcast({
            type: "action_failed",
            action: "unsupported",
            error: "Jev không nhận diện được lệnh điều khiển trình duyệt hợp lệ trong câu nói.",
          });
          return;
        }

        if (decision.confidence < 0.55) {
          broadcast({
            type: "action_failed",
            action: decision.intent,
            error: `Độ tin cậy quá thấp (${(decision.confidence * 100).toFixed(0)}%). Vui lòng nói rõ hơn hoặc chỉ định cụ thể link/nút.`,
          });
          return;
        }

        // Thực thi hành động tương ứng
        console.log(`🚀 ${colors.blue}[BROWSER ACTION]${colors.reset} Bắt đầu thực thi: ${colors.bright}${decision.intent}${colors.reset} (Mục tiêu: ${decision.targetUrl || decision.targetElementText || decision.inputText || 'none'})`);
        broadcast({
          type: "action_started",
          action: decision.intent,
          details: decision.targetUrl || decision.targetElementText || decision.inputText || decision.intent,
        });

        try {
          switch (decision.intent) {
            case "navigate":
              if (decision.targetUrl) {
                console.log(`   🌐 Đang mở URL: ${decision.targetUrl}`);
                await browser.goto(decision.targetUrl);
                console.log(`   ✅ Đã tải xong trang: ${decision.targetUrl}`);
                broadcast({ type: "action_completed", action: "navigate", message: `Đã mở: ${decision.targetUrl}` });
              }
              break;

            case "click":
              if (decision.targetElementId || decision.targetElementText) {
                console.log(`   🖱️ Đang click vào: "${decision.targetElementText || '#' + decision.targetElementId}"`);
                const clicked = await browser.clickElement(decision.targetElementId || "1", decision.targetElementText);
                if (clicked) {
                  console.log(`   ✅ Đã click thành công!`);
                  broadcast({ type: "action_completed", action: "click", message: `Đã click vào: "${decision.targetElementText || 'phần tử #' + decision.targetElementId}"` });
                } else {
                  throw new Error(`Không thể bấm vào phần tử "${decision.targetElementText || '#' + decision.targetElementId}" trên trang hiện tại`);
                }
              } else {
                throw new Error("Không xác định được phần tử mục tiêu để click");
              }
              break;

            case "type":
              if (decision.inputText) {
                console.log(`   ⌨️ Đang gõ văn bản: "${decision.inputText}"`);
                await browser.typeIntoElement(decision.targetElementId || "1", decision.inputText);
                console.log(`   ✅ Đã nhập văn bản thành công!`);
                broadcast({ type: "action_completed", action: "type", message: `Đã nhập từ khóa: "${decision.inputText}"` });
              }
              break;

            case "scroll_down":
              console.log(`   📜 Đang cuộn xuống...`);
              await browser.scroll("down");
              broadcast({ type: "action_completed", action: "scroll_down", message: "Đã cuộn trang xuống dưới" });
              break;

            case "scroll_up":
              console.log(`   📜 Đang cuộn lên...`);
              await browser.scroll("up");
              broadcast({ type: "action_completed", action: "scroll_up", message: "Đã cuộn trang lên trên" });
              break;

            case "go_back":
              console.log(`   🔙 Đang quay lại trang trước...`);
              await browser.goBack();
              broadcast({ type: "action_completed", action: "go_back", message: "Đã quay lại trang trước" });
              break;

            case "refresh":
              console.log(`   🔄 Đang tải lại trang...`);
              await browser.refresh();
              broadcast({ type: "action_completed", action: "refresh", message: "Đã tải lại trang" });
              break;
          }

          // Cập nhật lại Interactive Elements và Screenshot
          await browser.getInteractiveElements();
          await sendCurrentStatus();
          console.log(`✨ ${colors.green}[BROWSER UPDATED]${colors.reset} Đã chụp ảnh màn hình và quét lại phần tử tương tác.\n`);

        } catch (err: any) {
          console.error(`❌ ${colors.red}[BROWSER ACTION ERROR]${colors.reset}:`, err?.message || err);
          broadcast({
            type: "action_failed",
            action: decision.intent,
            error: err?.message || "Lỗi không xác định khi thực thi trên trình duyệt",
          });
        }
      }
    } catch (e) {
      console.error("Lỗi xử lý WebSocket message:", e);
    }
  });

  ws.on("close", () => {
    console.log("🔌 Web Client đã ngắt kết nối WebSocket");
  });
});

async function start() {
  console.log("🚀 Đang khởi động Playwright Browser...");
  await browser.init();
  console.log("✅ Playwright Browser đã sẵn sàng!");

  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎙️  JEV Voice Browser Agent đang chạy tại:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

start().catch((err) => {
  console.error("Lỗi khởi động server:", err);
  process.exit(1);
});
