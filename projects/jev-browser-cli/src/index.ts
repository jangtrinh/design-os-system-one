import { Command } from "commander";
import dotenv from "dotenv";
import path from "path";
import { BrowserManager } from "./browser-manager.js";
import { DomExtractor } from "./dom-extractor.js";
import { JevEngine } from "./jev-engine.js";
import { SocialPoster, type PostPrivacy, type SocialPlatform } from "./social-poster.js";
import { ThreadsResearcher } from "./threads-researcher.js";
import { SocialViralCurator, type CuratorPlatform } from "./social-viral-curator.js";
import { SocialEngagementWorkflow, type SocialEngageOptions, type EngagementPersona } from "./social-engagement-workflow.js";
import { DualBrainCoordinator } from "./dual-brain.js";
import { AsyncGuard } from "./async-guard.js";
import { CdpSessionPool } from "./cdp-session-pool.js";
import {
  JevUltrafast,
  JevUltrafastAgent,
  actionSpace,
  choose,
  fieldText,
  fieldContext,
} from "./ultrafast/index.js";
import { runBenchmark, saveBenchmarkReport } from "./benchmark-choose.js";
import type { CLIResult } from "./types.js";

dotenv.config();

const program = new Command();

program
  .name("jev-browser")
  .description("Universal Browser Automation CLI for AI Agents powered by TypeSafe Jev & CDP")
  .version("1.0.0")
  .option("-p, --port <port>", "CDP debugging port", "9222")
  .option("-b, --browser <browser>", "Browser to use (arc, chrome, dia, edge)", "")
  .option("-T, --tab <query>", "Target specific tab by index, title, or URL query", "")
  .option("-j, --json", "Output machine-readable JSON for AI agents", false);

function formatOutput<T>(result: CLIResult<T>, isJson: boolean) {
  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.success) {
    console.log(`✅ [${result.action.toUpperCase()}] ${result.message}`);
    if (result.data) {
      if (typeof result.data === "string") {
        console.log(result.data);
      } else {
        console.dir(result.data, { depth: null, colors: true });
      }
    }
    if (result.executionTimeMs) {
      console.log(`⚡ Execution time: ${result.executionTimeMs}ms`);
    }
  } else {
    console.error(`❌ [${result.action.toUpperCase()} ERROR] ${result.error || result.message}`);
    process.exitCode = 1;
  }
}

// 1. Launch Command
program
  .command("launch [browser]")
  .description("Khởi chạy trình duyệt thật với Chrome DevTools Protocol (CDP port 9222)")
  .action(async (browserArg) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browser = new BrowserManager(port);
    const chosenBrowser = browserArg || opts.browser || undefined;

    const start = Date.now();
    try {
      const res = await browser.launchBrowser(chosenBrowser);
      formatOutput(
        {
          success: true,
          action: "launch",
          message: res.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "launch",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 2. Status Command
program
  .command("status")
  .description("Kiểm tra trạng thái kết nối trình duyệt, URL hiện tại và số tab")
  .action(async () => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browser = new BrowserManager(port);

    const start = Date.now();
    try {
      const status = await browser.getStatus(opts.tab);

      if (!status.connected && (await browser.isDiaRunning())) {
        const diaTab = await browser.diaGetActiveTab();
        formatOutput(
          {
            success: true,
            action: "status",
            message: `Đang kết nối trực tiếp vào cửa sổ DIA thật của bạn: "${diaTab.title}" (${diaTab.url})`,
            data: {
              connected: true,
              mode: "dia-native",
              browser: "dia",
              url: diaTab.url,
              title: diaTab.title,
              note: "Đang gắn trực tiếp vào cửa sổ DIA có sẵn của bạn (giữ nguyên đầy đủ tài khoản, session).",
            },
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
        return;
      }

      formatOutput(
        {
          success: true,
          action: "status",
          message: status.connected
            ? `Đã kết nối tới tab "${status.title}" (${status.url})`
            : `Chưa kết nối CDP trên cổng ${port}. Hãy chạy 'jev-browser launch'`,
          data: status,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "status",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 2b. Tabs Command (List all open tabs)
program
  .command("tabs")
  .description("Danh sách tất cả các tab đang mở trong trình duyệt")
  .action(async () => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);
    const start = Date.now();
    try {
      const tabs = await browserMgr.getTabs();
      formatOutput(
        {
          success: true,
          action: "tabs",
          message: `Tìm thấy ${tabs.length} tab đang mở trong trình duyệt`,
          data: tabs,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "tabs",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 2c. Switch Tab Command
program
  .command("switch <query>")
  .description("Chuyển sang tab theo index, tiêu đề hoặc URL")
  .action(async (query) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);
    const start = Date.now();
    try {
      const res = await browserMgr.switchTab(query);
      formatOutput(
        {
          success: true,
          action: "switch",
          message: `Đã chuyển sang tab #${res.index}: "${res.title}" (${res.url})`,
          data: res,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "switch",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 3. Do Command (Jev Semantic Auto Execution)
program
  .command("do <instruction...>")
  .description("Dùng Jev System One AI hiểu câu lệnh tự nhiên và tự động thực thi trên trang")
  .action(async (instructionWords) => {
    const instruction = instructionWords.join(" ");
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);
    const jev = new JevEngine();

    const start = Date.now();
    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        const currentUrl = page.url();
        const currentTitle = await page.title();
        const elements = await DomExtractor.extractInteractiveElements(page);

        // Đánh giá ý định qua Jev AI
        const decision = await jev.interpret(instruction, currentUrl, currentTitle, elements);

        if (decision.intent === "unsupported") {
          throw new Error("Jev không nhận diện được lệnh điều khiển trình duyệt hợp lệ.");
        }

        let actionResult = "";

        switch (decision.intent) {
          case "navigate":
            if (decision.targetUrl) {
              await page.goto(decision.targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
              actionResult = `Đã mở URL: ${decision.targetUrl}`;
            }
            break;

          case "click":
            const target = decision.targetElementId ? `#${decision.targetElementId}` : decision.targetElementText || "";
            actionResult = await browserMgr.clickElement(page, target, elements);
            break;

          case "type":
            actionResult = await browserMgr.typeIntoElement(page, decision.inputText || instruction, undefined, elements);
            break;

          case "scroll_down":
            await page.mouse.wheel(0, 500);
            actionResult = "Đã cuộn trang xuống dưới 500px";
            break;

          case "scroll_up":
            await page.mouse.wheel(0, -500);
            actionResult = "Đã cuộn trang lên trên 500px";
            break;

          case "go_back":
            await page.goBack({ waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => {});
            actionResult = "Đã quay lại trang trước";
            break;

          case "refresh":
            await page.reload({ waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => {});
            actionResult = "Đã tải lại trang";
            break;
        }

        // Chờ trang ổn định nhẹ
        await page.waitForTimeout(300);

        const newUrl = page.url();
        const newTitle = await page.title();

        formatOutput(
          {
            success: true,
            action: "do",
            message: actionResult,
            data: {
              prompt: instruction,
              decision,
              page: { url: newUrl, title: newTitle },
            },
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "do",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 3a. Jev Ultrafast Autonomous Agent Loop (Browser-Use Parity)
program
  .command("ultrafast [goal]")
  .alias("uf")
  .description("⚡ Jev Ultrafast Autonomous Agent: Vòng lặp tự động điều khiển trình duyệt siêu tốc với Speculative Fan-Out & Indexed Action Space")
  .option("-g, --goal <goal>", "Mục tiêu cần hoàn thành trên trang", "")
  .option("-m, --max-steps <number>", "Số bước tối đa", "10")
  .option("--dry-run", "Chạy mô phỏng không click hay nhập thật", false)
  .option("--screenshots", "Lưu ảnh chụp màn hình mỗi bước", false)
  .action(async (goalArg, cmdOpts) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);
    const goal = goalArg || cmdOpts.goal || "Khám phá trang";
    const maxSteps = parseInt(cmdOpts.maxSteps || "10", 10);
    const dryRun = !!cmdOpts.dryRun;
    const start = Date.now();

    try {
      const target = await browserMgr.findTarget(opts.tab);
      if (!target || !target.webSocketDebuggerUrl) {
        throw new Error(`Không tìm thấy tab trình duyệt phù hợp trên port ${port}. Hãy chạy 'jev-browser launch' trước.`);
      }

      const agent = new JevUltrafastAgent(target.webSocketDebuggerUrl, goal, {
        maxSteps,
        dryRun,
        screenshots: cmdOpts.screenshots,
      });

      await agent.init();

      if (!opts.json) {
        console.log(`\n⚡ [JEV ULTRAFAST AGENT · BROWSER-USE PARITY]`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🎯 Mục tiêu:        "${goal}"`);
        console.log(`🌐 Tab mục tiêu:    "${agent.state.page.title}" (${agent.state.page.url})`);
        console.log(`🔄 Giới hạn:        ${maxSteps} bước | Mô phỏng: ${dryRun ? "DRY-RUN" : "LIVE ACTION"}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      }

      for await (const snap of agent.run()) {
        const lastStep = agent.state.history[agent.state.history.length - 1];
        if (!lastStep) continue;

        if (!opts.json) {
          const changed = lastStep.page_changed ? "🔄 Đổi trang" : "⏹ Giữ nguyên";
          const helperInfo = lastStep.text_helper ? ` (Text: "${lastStep.text}", Helper: ${lastStep.text_latency_ms}ms)` : "";
          console.log(
            `[Bước ${lastStep.step}] ⚡ ${lastStep.operation} -> ${lastStep.action}${helperInfo}`
          );
          console.log(
            `        • Lựa chọn: ${lastStep.choice} | Tự tin: ${(lastStep.confidence * 100).toFixed(1)}% | Quyết định: ${lastStep.latency_ms}ms | Thực thi: ${lastStep.executed_ms}ms [${changed}]`
          );
        }
      }

      const totalTime = Date.now() - start;
      const isSuccess = agent.state.status === "done";

      if (!opts.json) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🏁 Kết quả:         ${isSuccess ? "✅ HOÀN THÀNH (DONE)" : "⏸️ DỪNG / BỊ CHẶN (" + agent.state.status.toUpperCase() + ")"}`);
        console.log(`⏱️ Tổng thời gian:  ${totalTime}ms (${agent.state.history.length} bước)`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      } else {
        formatOutput(
          {
            success: isSuccess,
            action: "ultrafast",
            message: `Hoàn tất với trạng thái: ${agent.state.status}`,
            data: agent.state,
            executionTimeMs: totalTime,
          },
          true
        );
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "ultrafast",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    } finally {
      CdpSessionPool.getInstance().closeAll();
    }
  });

// 3a-2. Jev Ultrafast Single-Turn Evaluation (Speculative Fan-Out Inspector)
program
  .command("ultrafast-eval [goal]")
  .alias("ufe")
  .description("🔍 Kiểm tra Indexed Action Space & Speculative Fan-Out Decision trong <200ms mà không thực thi")
  .option("-g, --goal <goal>", "Mục tiêu kiểm tra", "")
  .action(async (goalArg, cmdOpts) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);
    const goal = goalArg || cmdOpts.goal || "Khám phá trang";
    const start = Date.now();

    try {
      const target = await browserMgr.findTarget(opts.tab);
      if (!target || !target.webSocketDebuggerUrl) {
        throw new Error(`Không tìm thấy tab trình duyệt trên port ${port}.`);
      }

      const driver = new JevUltrafast();
      await driver.enableFocusEmulation(target.webSocketDebuggerUrl);
      const pageState = await driver.observe(target.webSocketDebuggerUrl);
      const { elements, targets, controls } = actionSpace(pageState.actions);

      const decision = await choose(pageState, goal, []);
      const totalTime = Date.now() - start;

      if (opts.json) {
        formatOutput(
          {
            success: true,
            action: "ultrafast-eval",
            message: `Evaluated in ${totalTime}ms`,
            data: {
              goal,
              decision,
              elementsCount: elements.length,
              elements: elements.slice(0, 20),
            },
            executionTimeMs: totalTime,
          },
          true
        );
        return;
      }

      console.log(`\n⚡ [JEV ULTRAFAST SPECULATIVE FAN-OUT EVALUATION]`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🎯 Mục tiêu:            "${goal}"`);
      console.log(`🌐 Tab:                 "${pageState.title}" (${pageState.url})`);
      console.log(`⚡ Độ trễ System One:   ${decision.latency_ms}ms (1 network round trip)`);
      console.log(`\n📊 [QUYẾT ĐỊNH HÀNH ĐỘNG]`);
      console.log(`  • Thao tác (Operation): ${decision.operation}`);
      console.log(`  • Phần tử đã chọn:     ${decision.choice} (Target: ${decision.target || "N/A"})`);
      console.log(`  • Độ tin cậy:          ${(decision.confidence * 100).toFixed(1)}%`);

      console.log(`\n🎲 [XÁC SUẤT CÁC PHÉP TOÁN (Operation Probabilities)]`);
      for (const [op, prob] of Object.entries(decision.operation_probabilities)) {
        const bar = "█".repeat(Math.round(prob * 20));
        console.log(`  • ${op.padEnd(12)}: ${(prob * 100).toFixed(1).padStart(5)}% ${bar}`);
      }

      if (decision.target_probabilities && Object.keys(decision.target_probabilities).length > 0) {
        console.log(`\n🎯 [XÁC SUẤT CÁC MỤC TIÊU CHO "${decision.operation}"]`);
        const topTargets = Object.entries(decision.target_probabilities)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        for (const [tIdx, prob] of topTargets) {
          const el = elements.find((e) => e.index === tIdx.split(":")[0]);
          const label = el ? el.label : tIdx;
          console.log(`  • [${tIdx}] "${label}": ${(prob * 100).toFixed(1)}%`);
        }
      }

      console.log(`\n📋 [INDEXED ACTION SPACE MẪU (${elements.length} phần tử)]`);
      elements.slice(0, 8).forEach((el) => {
        console.log(`  [${el.index}] ${(el.role || "element").padEnd(10)} ${el.label} [${el.operations.join(", ")}]`);
      });
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "ultrafast-eval",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    } finally {
      CdpSessionPool.getInstance().closeAll();
    }
  });

// 3c. Benchmark Command (Milestone 0: Baseline Metrics p50/p95/p99 & Economics)
program
  .command("benchmark")
  .alias("bench")
  .description("Đo đạc baseline metrics (p50/p95/p99 latency, tokens, cost) của JEV System One")
  .option("-n, --iterations <number>", "Số lượt benchmark", "10")
  .option("-o, --output <file>", "Đường dẫn file JSON báo cáo", "benchmark-baseline.json")
  .action(async (cmdOpts) => {
    const opts = program.opts();
    const iterations = parseInt(cmdOpts.iterations, 10) || 10;
    const start = Date.now();

    try {
      console.log(`\n⚡ Bắt đầu Benchmark JEV System One (${iterations} iterations)...`);
      const metrics = await runBenchmark(iterations);
      saveBenchmarkReport(metrics, path.resolve(process.cwd(), cmdOpts.output));

      if (opts.json) {
        formatOutput(
          {
            success: true,
            action: "benchmark",
            message: `Hoàn tất benchmark (${iterations} iterations)`,
            data: metrics,
            executionTimeMs: Date.now() - start,
          },
          true
        );
        return;
      }

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 JEV SYSTEM ONE BASELINE METRICS (M0)`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Iterations:   ${metrics.iterations}`);
      console.log(`Min Latency:  ${metrics.percentiles.min}ms`);
      console.log(`Mean Latency: ${metrics.percentiles.mean}ms`);
      console.log(`p50 (Median): ${metrics.percentiles.p50}ms`);
      console.log(`p95 Latency:  ${metrics.percentiles.p95}ms`);
      console.log(`p99 Latency:  ${metrics.percentiles.p99}ms`);
      console.log(`Max Latency:  ${metrics.percentiles.max}ms`);
      console.log(`Avg Tokens:   ${metrics.tokens.avgTokensPerCall} tokens/call`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`💰 ECONOMIC COMPARISON:`);
      console.log(`JEV Cost (Est):   $${metrics.economics.jevEstimatedCostUsd.toFixed(4)}`);
      console.log(`Claude/GPT Cost:  $${metrics.economics.autoregressiveLlmLikelyCostUsd.toFixed(4)}`);
      console.log(`Cost Reduction:   ${metrics.economics.costReductionPct}%`);
      console.log(`Report Saved:     ${cmdOpts.output}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "benchmark",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 3b. Scan Command (Full Architectural Analysis via JEV System One Speculative Fan-Out)
program
  .command("scan")
  .description("Quét và phân tích toàn bộ kiến trúc trang web qua TypeSafe JEV System One (Speculative Fan-Out)")
  .action(async () => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);
    const jev = new JevEngine();

    const start = Date.now();
    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        const url = page.url();
        const title = await page.title();
        const elements = await DomExtractor.extractInteractiveElements(page);

        // Thu thập semantic landmarks của DOM
        const landmarks = await page.evaluate(() => {
          const tags = ["header", "nav", "aside", "main", "footer", "form", "dialog"];
          const found = tags.filter((t) => !!document.querySelector(t));
          const hasModal = !!document.querySelector("[role='dialog'], .modal, .popup");
          const hasSidebar = !!document.querySelector("aside, .sidebar, [role='navigation']");
          const hasChat = !!document.querySelector(".chat, .messages, [data-id*='chat'], #richInput");
          return `Landmarks: [${found.join(", ")}], Modal: ${hasModal}, Sidebar: ${hasSidebar}, Chat/Composer: ${hasChat}`;
        });

        const architecture = await jev.scanArchitecture(url, title, elements, landmarks);

        if (opts.json) {
          formatOutput(
            {
              success: true,
              action: "scan",
              message: `Đã phân tích xong kiến trúc trang (${architecture.category})`,
              data: architecture,
              executionTimeMs: Date.now() - start,
            },
            true
          );
          return;
        }

        // Pretty print human-readable architecture
        console.log(`\n🏛️  [KIẾN TRÚC WEB PAGE - PHÂN TÍCH BỞI JEV SYSTEM ONE]`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🌐 URL:          ${architecture.url}`);
        console.log(`📑 Title:        ${architecture.title}`);
        console.log(`📦 Thể loại:     ${architecture.category.toUpperCase()} (Độ tin cậy: ${(architecture.confidence * 100).toFixed(1)}%)`);
        console.log(`📐 Layout Model: ${architecture.interactionModel}`);
        console.log(`🔐 Đã đăng nhập: ${architecture.isAuthenticated ? "CÓ (Session User)" : "KHÔNG (Guest / Public)"} (xác suất: ${(architecture.authProbability * 100).toFixed(0)}%)`);
        console.log(`⚙️  Độ phức tạp:  Bậc ${architecture.complexityScore}/2 (${architecture.complexityScore === 2 ? "Complex SPA / Real-Time" : architecture.complexityScore === 1 ? "Dynamic Form/List" : "Static Content"})`);
        console.log(`🎯 Vùng trọng tâm: ${architecture.primaryInteractionZone}`);
        console.log(`🛡️  Blocking Popups: ${architecture.hasBlockingOverlay ? "CÓ PHÁT HIỆN OVERLAY" : "SẠCH (Không có popup chặn)"}`);
        console.log(`\n📍 [ĐIỂM NEO TƯƠNG TÁC CHÍNH (ANCHORS)]`);
        if (architecture.anchors.primarySearch) {
          console.log(`  🔍 Search:   #${architecture.anchors.primarySearch.id} (${architecture.anchors.primarySearch.placeholder || architecture.anchors.primarySearch.selector})`);
        }
        if (architecture.anchors.primaryInput) {
          console.log(`  ✍️  Input:    #${architecture.anchors.primaryInput.id} (${architecture.anchors.primaryInput.placeholder || architecture.anchors.primaryInput.selector})`);
        }
        if (architecture.anchors.primaryAction) {
          console.log(`  ⚡ Action:   #${architecture.anchors.primaryAction.id} (${architecture.anchors.primaryAction.text || architecture.anchors.primaryAction.selector})`);
        }
        console.log(`\n🗺️  [CÁC PHÂN VÙNG KIẾN TRÚC (ZONES)]`);
        for (const zone of architecture.zones) {
          console.log(`  • ${zone.name} (${zone.elementCount} elements): ${zone.description}`);
        }
        console.log(`\n🤖 [PLAYBOOK DÀNH CHO AI AGENT]`);
        for (const step of architecture.agentPlaybook) {
          console.log(`  ${step}`);
        }
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`⚡ Thời gian phân tích Jev: ${Date.now() - start}ms\n`);
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "scan",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 4. Snapshot Command (DOM Tree for AI Agent context)
program
  .command("snapshot")
  .description("Trích xuất danh sách phần tử tương tác trên trang dạng rút gọn cho AI Agent")
  .action(async () => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);

    const start = Date.now();
    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        const url = page.url();
        const title = await page.title();
        const elements = await DomExtractor.extractInteractiveElements(page);
        const textSnapshot = DomExtractor.formatSnapshotForAI(elements, url, title);

        formatOutput(
          {
            success: true,
            action: "snapshot",
            message: `Tìm thấy ${elements.length} phần tử tương tác trên trang`,
            data: opts.json ? { url, title, elements } : textSnapshot,
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "snapshot",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 5. Navigate Command
program
  .command("nav <url>")
  .option("-n, --new", "Mở trong một tab mới thay vì tab hiện tại", false)
  .description("Mở một địa chỉ trang web cụ thể")
  .action(async (urlArg, cmdOpts) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);

    let targetUrl = urlArg;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    const start = Date.now();
    try {
      if (!(await browserMgr.isCDPOpen()) && (await browserMgr.isDiaRunning())) {
        const msg = await browserMgr.diaNewTab(targetUrl);
        formatOutput(
          {
            success: true,
            action: "nav",
            message: `${msg} (sử dụng cửa sổ DIA đang chạy của bạn)`,
            data: { url: targetUrl, mode: "dia-native" },
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
        return;
      }

      const { browser, page: existingPage } = await browserMgr.connect(opts.tab);
      let page = existingPage;
      if (cmdOpts.new) {
        const context = browser.contexts()[0];
        page = await context.newPage();
      }
      try {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
        const finalUrl = page.url();
        const title = await page.title();

        formatOutput(
          {
            success: true,
            action: "nav",
            message: `Đã chuyển tới: ${finalUrl}`,
            data: { url: finalUrl, title },
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "nav",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 6. Click Command
program
  .command("click <target>")
  .description("Click vào phần tử theo synthetic ID (#1), text hoặc selector")
  .action(async (target) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);

    const start = Date.now();
    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        const elements = await DomExtractor.extractInteractiveElements(page);
        const clickRes = await browserMgr.clickElement(page, target, elements);
        await page.waitForTimeout(400);

        formatOutput(
          {
            success: true,
            action: "click",
            message: clickRes,
            data: { url: page.url(), title: await page.title() },
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "click",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 7. Type Command
program
  .command("type <text>")
  .option("-t, --target <target>", "Target input element (#ID hoặc selector)")
  .option("-e, --enter", "Press Enter after typing", false)
  .description("Nhập văn bản vào ô input hoặc bàn phím")
  .action(async (text, cmdOpts) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);

    const start = Date.now();
    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        const elements = await DomExtractor.extractInteractiveElements(page);
        const typeRes = await browserMgr.typeIntoElement(page, text, cmdOpts.target, elements, cmdOpts.enter);

        formatOutput(
          {
            success: true,
            action: "type",
            message: typeRes,
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "type",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 8. Scroll Command
program
  .command("scroll <direction>")
  .description("Cuộn trang: down, up, top, bottom")
  .action(async (direction) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);

    const start = Date.now();
    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        const dir = direction.toLowerCase();
        if (dir === "down") await page.mouse.wheel(0, 500);
        else if (dir === "up") await page.mouse.wheel(0, -500);
        else if (dir === "top") await page.evaluate(() => window.scrollTo(0, 0));
        else if (dir === "bottom") await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        else throw new Error(`Hướng cuộn không hợp lệ: "${direction}". Dùng down, up, top, bottom.`);

        formatOutput(
          {
            success: true,
            action: "scroll",
            message: `Đã cuộn trang: ${dir}`,
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "scroll",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 9. Back / Reload
program
  .command("back")
  .description("Quay lại trang trước")
  .action(async () => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);

    const start = Date.now();
    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        await page.goBack({ waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => {});
        formatOutput(
          {
            success: true,
            action: "back",
            message: `Đã quay lại: ${page.url()}`,
            data: { url: page.url(), title: await page.title() },
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "back",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

program
  .command("reload")
  .description("Tải lại trang hiện tại")
  .action(async () => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);

    const start = Date.now();
    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => {});
        formatOutput(
          {
            success: true,
            action: "reload",
            message: "Đã tải lại trang",
            data: { url: page.url(), title: await page.title() },
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "reload",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 10. Eval Command (Run JavaScript in browser)
program
  .command("eval <script...>")
  .description("Thực thi trực tiếp mã JavaScript trên trang và trả về giá trị")
  .action(async (scriptWords) => {
    const script = scriptWords.join(" ");
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);

    const start = Date.now();
    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        const evalResult = await page.evaluate(async (code) => {
          try {
            return (0, eval)(code);
          } catch (e: any) {
            if (e instanceof SyntaxError && (e.message.includes("return") || e.message.includes("await") || e.message.includes("Unexpected token"))) {
              const fn = new Function(`return (async () => {\n${code}\n})();`);
              return await fn();
            }
            throw e;
          }
        }, script);

        formatOutput(
          {
            success: true,
            action: "eval",
            message: "Đã thực thi JavaScript thành công",
            data: evalResult,
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "eval",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 11. Screenshot Command
program
  .command("screenshot [outputPath]")
  .description("Chụp ảnh màn hình tab hiện tại")
  .action(async (outputPath) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);
    const out = outputPath || path.join(process.cwd(), "screenshot.png");

    const start = Date.now();
    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        await page.screenshot({ path: out, fullPage: false });
        formatOutput(
          {
            success: true,
            action: "screenshot",
            message: `Đã lưu ảnh màn hình tại: ${out}`,
            data: { path: out },
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "screenshot",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 12. Key Command
program
  .command("key <keyName>")
  .description("Gửi phím bàn phím tới trang web (Escape, Enter, Tab, ArrowDown, Backspace, ...)")
  .action(async (keyName) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);
    const start = Date.now();

    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        const res = await browserMgr.pressKey(page, keyName);
        formatOutput(
          {
            success: true,
            action: "key",
            message: res,
            data: { key: keyName, url: page.url() },
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "key",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 13. Post Command (Social Media with JEV & Strict Privacy)
program
  .command("post <content>")
  .description("Đăng bài tự động lên mạng xã hội (Facebook, Threads, LinkedIn) với JEV System One và Privacy Lock")
  .option("-P, --platform <platform>", "Nền tảng mạng xã hội (facebook | threads | linkedin | auto)", "auto")
  .option("--privacy <privacy>", "Quyền riêng tư (only_me | friends | connections | public | draft)", "only_me")
  .option("--dry-run", "Chỉ soạn thảo và chuẩn bị, không bấm nút xuất bản", false)
  .action(async (content, cmdOpts) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);
    const poster = new SocialPoster();
    const start = Date.now();

    try {
      const { browser, page } = await browserMgr.connect(opts.tab);
      try {
        const result = await poster.post(page, content, {
          platform: cmdOpts.platform as SocialPlatform,
          privacy: cmdOpts.privacy as PostPrivacy,
          dryRun: cmdOpts.dryRun,
        });

        formatOutput(
          {
            success: result.success,
            action: "post",
            message: result.message,
            data: {
              platform: result.platform,
              privacy: result.privacy,
              content: result.content,
              verified: result.verified,
              url: page.url(),
            },
            executionTimeMs: Date.now() - start,
          },
          opts.json
        );
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "post",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 14. Research Command (Threads & Social Communities Analysis)
const researchCmd = program
  .command("research")
  .description("Nghiên cứu thị trường và các cộng đồng mạng xã hội để tối ưu hóa bài viết");

researchCmd
  .command("threads [community]")
  .description("Nghiên cứu cộng đồng Threads (AI Threads, Design Threads, 3D Printing...), phân tích 5 hình mẫu viral và tạo bản thảo bài đăng")
  .option("-l, --limit <number>", "Số lượng bài viết phân tích", "10")
  .option("--no-drafts", "Không sinh bài viết mẫu gợi ý")
  .action(async (communityArg, cmdOpts) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browserMgr = new BrowserManager(port);
    const researcher = new ThreadsResearcher();
    const limit = parseInt(cmdOpts.limit, 10) || 10;
    const generateDrafts = cmdOpts.drafts !== false;
    const start = Date.now();

    try {
      const result = await researcher.researchCommunity(browserMgr, communityArg, limit, generateDrafts);

      if (opts.json) {
        formatOutput(
          {
            success: true,
            action: "research:threads",
            message: `Đã nghiên cứu cộng đồng "${result.communityName}" thành công`,
            data: result,
            executionTimeMs: Date.now() - start,
          },
          true
        );
        return;
      }

      console.log(`\n🧵 [NGHIÊN CỨU CỘNG ĐỒNG THREADS: ${result.communityName.toUpperCase()}]`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🌐 URL:                ${result.url}`);
      if (result.memberCount) {
        console.log(`👥 Quy mô thành viên:  ${result.memberCount}`);
      }
      console.log(`📊 Số bài phân tích:   ${result.postsAnalyzed} bài viết thịnh hành`);
      console.log(`❤️ Tương tác TB/bài:    ${result.averageEngagement.likes} likes | ${result.averageEngagement.replies} replies | ${result.averageEngagement.reposts} reposts`);
      console.log(`\n📈 [PHÂN BỔ CÁC HÌNH MẪU VIRAL (VIRAL ARCHETYPES)]`);
      for (const [arch, count] of Object.entries(result.archetypeDistribution)) {
        if (count > 0) {
          console.log(`  • ${arch.padEnd(22)}: ${count} bài (${Math.round((count / Math.max(1, result.postsAnalyzed)) * 100)}%)`);
        }
      }

      console.log(`\n🎯 [CHIẾN LƯỢC VIRAL KHUYẾN NGHỊ TỪ JEV SYSTEM ONE]`);
      console.log(`  ⭐ Hình mẫu ưu tiên:   ${result.strategy.primaryRecommendedArchetype.toUpperCase()}`);
      console.log(`  🪝 Công thức Hook:     ${result.strategy.hookFormula}`);
      console.log(`  📏 Độ dài tối ưu:      ${result.strategy.optimalLength}`);
      console.log(`  💡 Lời khuyên định dạng: ${result.strategy.formatAdvice}`);

      if (result.strategy.suggestedDrafts.length > 0) {
        console.log(`\n📝 [GỢI Ý 3 BẢN THẢO BÀI ĐĂNG DỄ VIRAL CHO SẢN PHẨM CỦA BẠN]`);
        result.strategy.suggestedDrafts.forEach((draft) => {
          console.log(`\n--- ${draft.title} ---`);
          console.log(`[Card 1 - Hook]: ${draft.hook}`);
          console.log(`[Body]:\n${draft.body}`);
          console.log(`[CTA]: ${draft.cta}`);
          console.log(`💡 Lý do dễ viral: ${draft.whyViral}`);
        });
      }
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`⚡ Thời gian nghiên cứu & phân tích: ${Date.now() - start}ms\n`);
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "research:threads",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

// 15. Social Viral Curator & Auto-Engager (LinkedIn / Threads / X)
program
  .command("curate-feed")
  .description("🎯 Social Viral Curator & Auto-Engager: Quét feed Threads/LinkedIn/X, tính viralScore & slopScore, lọc nội dung chất lượng cao và gợi ý tương tác")
  .option("-p, --platform <platform>", "Nền tảng mạng xã hội (threads | linkedin | x | auto)", "auto")
  .option("-l, --limit <number>", "Số lượng bài viết phân tích", "10")
  .option("--min-viral <number>", "Ngưỡng điểm viralScore tối thiểu (0-100)")
  .option("--max-slop <number>", "Ngưỡng điểm slopScore tối đa cho phép (0-100)")
  .option("--draft-reply", "Tự động hiển thị bản thảo bình luận sắc bén cho bài viết ưu tiên", false)
  .option("--mock", "Sử dụng bộ dữ liệu mẫu thực tế để kiểm thử (không cần mở feed)", false)
  .action(async (cmdOpts) => {
    const opts = program.opts();
    let platform = (cmdOpts.platform || "auto") as CuratorPlatform;
    let port = parseInt(opts.port, 10);
    // Graceful resolution if -p was consumed by global --port option
    if (isNaN(port) || opts.port === "threads" || opts.port === "linkedin" || opts.port === "x") {
      platform = opts.port as CuratorPlatform;
      port = 9222;
    }
    const browserMgr = new BrowserManager(port);
    const curator = new SocialViralCurator();
    const limit = parseInt(cmdOpts.limit, 10) || 10;
    const minViral = cmdOpts.minViral !== undefined ? parseInt(cmdOpts.minViral, 10) : undefined;
    const maxSlop = cmdOpts.maxSlop !== undefined ? parseInt(cmdOpts.maxSlop, 10) : undefined;
    const isJson = Boolean(cmdOpts.json || opts.json);
    const start = Date.now();

    try {
      const report = await curator.curateFeed(browserMgr, {
        platform,
        limit,
        minViral,
        maxSlop,
        draftReply: cmdOpts.draftReply,
        mock: cmdOpts.mock,
        tabQuery: opts.tab,
      });

      if (isJson) {
        formatOutput(
          {
            success: true,
            action: "curate-feed",
            message: `Đã xử lý ${report.totalScanned} bài viết từ ${report.platform.toUpperCase()} (${report.highPriorityCount} bài ưu tiên, ${report.slopCount} bài slop)`,
            data: report,
            executionTimeMs: Date.now() - start,
          },
          true
        );
        return;
      }

      console.log(`\n🎯 [SOCIAL VIRAL CURATOR & AUTO-ENGAGER: ${report.platform.toUpperCase()}]`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 Tổng bài phân tích:   ${report.totalScanned} bài viết`);
      console.log(`⭐ Ưu tiên tương tác:    ${report.highPriorityCount} bài (HIGH_PRIORITY_ENGAGE)`);
      console.log(`🗑️ AI Slop phát hiện:    ${report.slopCount} bài (AI_SLOP_SKIP)`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      if (report.posts.length === 0) {
        console.log(`Không có bài viết nào thỏa mãn bộ lọc (minViral: ${minViral ?? 'N/A'}, maxSlop: ${maxSlop ?? 'N/A'}).`);
      } else {
        report.posts.forEach((p, idx) => {
          let badge = "⚪ [NEUTRAL]";
          if (p.verdict === "HIGH_PRIORITY_ENGAGE") {
            badge = "🟢 [HIGH_PRIORITY_ENGAGE]";
          } else if (p.verdict === "AI_SLOP_SKIP") {
            badge = "🔴 [AI_SLOP_SKIP]";
          }

          console.log(`────────────────────────────────────────────────────────────`);
          console.log(`[#${idx + 1}] ${p.author} ${badge}`);
          console.log(`    Archetype:     ${p.archetype || "general"}`);
          console.log(`    Virality:      ${p.viralScore}/100 | Slop Score: ${p.slopScore}/100`);
          if (p.likes !== undefined || p.replies !== undefined || p.reposts !== undefined) {
            console.log(`    Tương tác:     ${p.likes ?? 0} likes | ${p.replies ?? 0} replies | ${p.reposts ?? 0} reposts`);
          }
          console.log(`\n    📝 Nội dung:\n    "${p.text.split("\n").join("\n    ")}"`);

          if (p.reasons.length > 0) {
            console.log(`\n    💡 Phân tích JEV System One:`);
            p.reasons.slice(0, 4).forEach((r) => console.log(`      • ${r}`));
          }

          if (cmdOpts.draftReply && p.suggestedEngagement) {
            console.log(`\n    💬 [GỢI Ý BÌNH LUẬN SẮC BÉN (SPARK DISCUSSION)]:`);
            console.log(`    "${p.suggestedEngagement}"`);
          }
          console.log(``);
        });
      }
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`⚡ Thời gian xử lý: ${Date.now() - start}ms\n`);
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "curate-feed",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        isJson
      );
    } finally {
      CdpSessionPool.getInstance().closeAll();
    }
  });

// 16. Social Engagement Autonomous Workflow
program
  .command("social-engage")
  .description("🚀 Social Engagement Autonomous Workflow: Tìm kiếm bài viết, lọc AI Slop, chấm điểm Viral, tạo bình luận chuyên môn cao và tự động tương tác có kiểm soát an toàn")
  .option("-p, --platform <platform>", "Nền tảng mạng xã hội (linkedin | threads | x)", "linkedin")
  .option("-q, --query <searchQuery>", "Từ khóa tìm kiếm trên nền tảng (ví dụ: 'AI Product Design', '3D Design AI')")
  .option("-l, --limit <number>", "Số lượng bài viết quét", "8")
  .option("--min-viral <number>", "Điểm Viral tối thiểu (0-100)")
  .option("--max-slop <number>", "Điểm Slop tối đa (0-100)", "40")
  .option("--persona <persona>", "Persona người bình luận (principal_engineer | product_designer | hardware_specialist | general_tech)", "principal_engineer")
  .option("--dry-run", "Chạy thử nghiệm và lưu ảnh chụp bản nháp, không gửi bình luận thật", false)
  .option("--auto-submit", "Tự động gửi bình luận thật và chụp ảnh nghiệm thu", false)
  .option("--max-engagements <number>", "Số lượng bài tối đa tương tác trong đợt này", "1")
  .action(async (cmdOpts) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10) || 9222;
    const browserMgr = new BrowserManager(port);
    const workflow = new SocialEngagementWorkflow();
    const isJson = Boolean(cmdOpts.json || opts.json);
    const start = Date.now();

    try {
      const report = await workflow.runWorkflow(browserMgr, {
        platform: cmdOpts.platform as CuratorPlatform,
        query: cmdOpts.query,
        limit: parseInt(cmdOpts.limit, 10) || 8,
        minViral: cmdOpts.minViral ? parseInt(cmdOpts.minViral, 10) : undefined,
        maxSlop: cmdOpts.maxSlop ? parseInt(cmdOpts.maxSlop, 10) : 40,
        persona: cmdOpts.persona as EngagementPersona,
        dryRun: Boolean(cmdOpts.dryRun),
        autoSubmit: Boolean(cmdOpts.autoSubmit),
        maxEngagements: parseInt(cmdOpts.maxEngagements, 10) || 1,
        tabQuery: opts.tab,
      });

      if (isJson) {
        formatOutput(
          {
            success: true,
            action: "social-engage",
            message: `Hoàn tất chu trình tương tác mạng xã hội trên ${report.platform.toUpperCase()}`,
            data: report,
            executionTimeMs: Date.now() - start,
          },
          true
        );
        return;
      }

      console.log(`\n🚀 [AUTONOMOUS SOCIAL ENGAGEMENT WORKFLOW: ${report.platform.toUpperCase()}]`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      if (report.query) console.log(`🔍 Từ khóa tìm kiếm:    "${report.query}"`);
      console.log(`📊 Tổng bài quét:        ${report.totalScanned} bài viết`);
      console.log(`🎯 Số bài đã tương tác:  ${report.selectedTargets.length} bài`);
      console.log(`🛡️ Chế độ an toàn:       ${report.dryRun ? "DRY-RUN (Bản nháp)" : report.autoSubmit ? "AUTO-SUBMIT (Đã xuất bản)" : "DRAFT ONLY"}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      report.selectedTargets.forEach((target, idx) => {
        console.log(`[#${idx + 1}] Tác giả: ${target.author}`);
        console.log(`    Trạng thái:    ${target.status === "submitted" ? "✅ ĐÃ XUẤT BẢN" : target.status === "draft_ready" ? "📝 BẢN NHÁP ĐÃ TẠO" : "⚠️ " + target.status}`);
        console.log(`    Viral Score:   ${target.viralScore}/100 | Slop Score: ${target.slopScore}/100`);
        console.log(`\n    💬 Nội dung bình luận đã tạo:`);
        console.log(`    "${target.comment.split("\n").join("\n    ")}"`);
        if (target.screenshotPath) {
          console.log(`\n    📸 Ảnh minh chứng: ${target.screenshotPath}`);
        }
        if (target.error) {
          console.log(`\n    ❌ Lỗi: ${target.error}`);
        }
        console.log(`────────────────────────────────────────────────────────────`);
      });

      console.log(`⚡ Tổng thời gian thực thi: ${Date.now() - start}ms\n`);
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "social-engage",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        isJson
      );
    } finally {
      CdpSessionPool.getInstance().closeAll();
    }
  });

// ==========================================
// JEV BROWSER DUAL-BRAIN COMMANDS
// ==========================================

// 1. Fast Action Evaluator (Brain 1) + Guard Check (Brain 2)
program
  .command("eval-action [goal]")
  .description("⚡ Fast Action Evaluator (Brain 1): Đánh giá DOM và ra quyết định hành động trong <200ms có bảo vệ an toàn (Brain 2)")
  .option("-g, --goal <goal>", "Mục tiêu cần hoàn thành trên trang", "")
  .option("--threshold <number>", "Ngưỡng rủi ro tối đa cho Guard (mặc định: 0.15)", "0.15")
  .option("--allow-destructive", "Cho phép thực thi cả thao tác có rủi ro", false)
  .action(async (goalArg, cmdOpts) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browser = new BrowserManager(port);
    const threshold = parseFloat(cmdOpts.threshold || "0.15");
    const coordinator = new DualBrainCoordinator(browser, threshold);
    const goal = goalArg || cmdOpts.goal || "Khám phá trang";
    const start = Date.now();

    try {
      const { action, guard } = await coordinator.evaluateStep(opts.tab || 0, goal, {
        riskThreshold: threshold,
        allowDestructive: cmdOpts.allowDestructive,
      });

      const totalTime = Date.now() - start;

      if (opts.json) {
        formatOutput(
          {
            success: true,
            action: "dual-brain:eval",
            message: `Evaluated in ${totalTime}ms (Brain 1: ${action.latencyMs}ms, Brain 2: ${guard.latencyMs}ms)`,
            data: { action, guard },
            executionTimeMs: totalTime,
          },
          true
        );
        return;
      }

      console.log(`\n🧠 [JEV BROWSER DUAL-BRAIN: ACTION EVALUATION]`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🎯 Mục tiêu:            "${goal}"`);
      console.log(`⚡ Tổng độ trễ:         ${totalTime}ms (Brain 1: ${action.latencyMs}ms, Brain 2: ${guard.latencyMs}ms)`);
      console.log(`\n🔹 [BRAIN 1: FAST ACTION EVALUATOR] (<200ms)`);
      console.log(`  • Quyết định:         ${action.action.toUpperCase()}`);
      if (action.targetElementText) {
        console.log(`  • Phần tử mục tiêu:   "${action.targetElementText}" (#${action.targetElementId || "?"})`);
      }
      if (action.selector) {
        console.log(`  • CSS Selector:       ${action.selector}`);
      }
      if (action.value) {
        console.log(`  • Giá trị nhập/URL:   "${action.value}"`);
      }
      console.log(`  • Độ tin cậy:         ${(action.confidence * 100).toFixed(1)}%`);
      console.log(`  • Giải thích logic:   ${action.rationale}`);

      console.log(`\n🛡️ [BRAIN 2: ASYNCHRONOUS SAFETY GUARD]`);
      const statusIcon = guard.allowed ? "✅ PHÊ DUYỆT (SAFE)" : "🚫 CHẶN LẠI (BLOCKED)";
      console.log(`  • Trạng thái:         ${statusIcon}`);
      console.log(`  • Mức độ rủi ro:      ${guard.riskLevel} (Điểm: ${guard.riskScore.toFixed(2)} / Ngưỡng: ${threshold})`);
      console.log(`  • Nhận xét an toàn:   ${guard.guardReason}`);
      if (guard.policyViolations.length > 0) {
        console.log(`  ⚠️ Vi phạm chính sách:`);
        guard.policyViolations.forEach((v) => console.log(`     - ${v}`));
      }
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "dual-brain:eval",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    } finally {
      CdpSessionPool.getInstance().closeAll();
    }
  });

// 2. Autonomous Auto-Step Loop (Dual-Brain Pipeline)
program
  .command("auto-step [goal]")
  .description("🤖 Autonomous Auto-Step: Vòng lặp tự động điều khiển trình duyệt kết hợp Brain 1 (Quyết định) & Brain 2 (An toàn)")
  .option("-g, --goal <goal>", "Mục tiêu người dùng muốn thực hiện", "")
  .option("-m, --max-steps <number>", "Số bước tối đa", "6")
  .option("-d, --delay <number>", "Khoảng nghỉ giữa các bước (ms)", "800")
  .option("--threshold <number>", "Ngưỡng chặn rủi ro của Guard", "0.15")
  .option("--allow-destructive", "Cho phép thực thi thao tác rủi ro cao", false)
  .option("--dry-run", "Chạy mô phỏng không tác động thật vào DOM", false)
  .action(async (goalArg, cmdOpts) => {
    const opts = program.opts();
    const port = parseInt(opts.port, 10);
    const browser = new BrowserManager(port);
    const threshold = parseFloat(cmdOpts.threshold || "0.15");
    const coordinator = new DualBrainCoordinator(browser, threshold);
    const goal = goalArg || cmdOpts.goal || "Khám phá trang";
    const maxSteps = parseInt(cmdOpts.maxSteps || "6", 10);
    const delay = parseInt(cmdOpts.delay || "800", 10);
    const start = Date.now();

    try {
      console.log(`\n🚀 [JEV BROWSER DUAL-BRAIN: AUTONOMOUS RUNNER]`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🎯 Mục tiêu:        "${goal}"`);
      console.log(`🔄 Số bước tối đa:  ${maxSteps} bước | Delay: ${delay}ms`);
      console.log(`🛡️ Chế độ an toàn:  Ngưỡng ${threshold} (Destructive: ${cmdOpts.allowDestructive ? "BẬT" : "TẮT"})`);
      if (cmdOpts.dryRun) console.log(`🔍 Mô phỏng:        DRY-RUN (Không click thật)`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const result = await coordinator.autoRun(opts.tab || 0, goal, {
        maxSteps,
        delayBetweenStepsMs: delay,
        riskThreshold: threshold,
        allowDestructive: cmdOpts.allowDestructive,
        dryRun: cmdOpts.dryRun,
      });

      if (opts.json) {
        formatOutput(
          {
            success: result.completed,
            action: "dual-brain:auto-step",
            message: result.stoppedReason,
            data: result,
            executionTimeMs: Date.now() - start,
          },
          true
        );
        return;
      }

      result.steps.forEach((s) => {
        const guardTag = s.guard.allowed ? "✅ SAFE" : "🚫 BLOCKED";
        console.log(`[Bước ${s.step}] ⚡ ${s.action.action.toUpperCase()} (${s.durationMs}ms) [${guardTag}]`);
        if (s.action.targetElementText) {
          console.log(`        Phần tử: "${s.action.targetElementText}" (#${s.action.targetElementId || "?"})`);
        }
        if (s.action.value) {
          console.log(`        Giá trị: "${s.action.value}"`);
        }
        if (!s.guard.allowed) {
          console.log(`        ⚠️ Guard chặn: ${s.guard.guardReason}`);
        }
      });

      console.log(`\n🏁 Kết quả: ${result.completed ? "✅ HOÀN THÀNH" : "⏸️ DỪNG LẠI"}`);
      console.log(`💡 Lý do:   ${result.stoppedReason}`);
      console.log(`⏱️ Tổng thời gian: ${result.totalDurationMs}ms (${result.totalSteps} bước)\n`);
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "dual-brain:auto-step",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    } finally {
      CdpSessionPool.getInstance().closeAll();
    }
  });

// 3. Standalone Safety Guard Check (Brain 2)
program
  .command("guard-check <action>")
  .description("🛡️ Asynchronous Guard Check: Kiểm tra độ an toàn của một hành động trước khi thực thi")
  .option("-s, --selector <css>", "CSS selector của phần tử", "")
  .option("-t, --text <text>", "Văn bản hiển thị trên nút/link", "")
  .option("-v, --value <value>", "Giá trị nhập hoặc URL điều hướng", "")
  .option("--threshold <number>", "Ngưỡng rủi ro chặn (mặc định: 0.15)", "0.15")
  .option("--allow-destructive", "Bỏ qua chặn rủi ro", false)
  .action(async (actionType, cmdOpts) => {
    const opts = program.opts();
    const threshold = parseFloat(cmdOpts.threshold || "0.15");
    const guard = new AsyncGuard(threshold);
    const start = Date.now();

    try {
      const mockAction = {
        action: actionType as any,
        selector: cmdOpts.selector,
        targetElementText: cmdOpts.text,
        value: cmdOpts.value,
        confidence: 1.0,
        rationale: "Guard verification test",
        latencyMs: 0,
      };

      const verdict = await guard.evaluateSafety(mockAction, "https://example.com", {
        riskThreshold: threshold,
        allowDestructive: cmdOpts.allowDestructive,
      });

      if (opts.json) {
        formatOutput(
          {
            success: verdict.allowed,
            action: "guard:check",
            message: verdict.guardReason,
            data: verdict,
            executionTimeMs: Date.now() - start,
          },
          true
        );
        return;
      }

      console.log(`\n🛡️ [ASYNCHRONOUS GUARD VERIFICATION]`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Hành động:          ${actionType.toUpperCase()}`);
      if (cmdOpts.text) console.log(`Text:               "${cmdOpts.text}"`);
      if (cmdOpts.selector) console.log(`Selector:           ${cmdOpts.selector}`);
      if (cmdOpts.value) console.log(`Value:              "${cmdOpts.value}"`);
      console.log(`Phán quyết:         ${verdict.allowed ? "✅ CHO PHÉP (SAFE)" : "🚫 CHẶN ĐỨNG (BLOCKED)"}`);
      console.log(`Điểm rủi ro:        ${verdict.riskScore.toFixed(2)} (Mức: ${verdict.riskLevel} / Ngưỡng: ${threshold})`);
      console.log(`Lý do:              ${verdict.guardReason}`);
      if (verdict.policyViolations.length > 0) {
        console.log(`Vi phạm:`);
        verdict.policyViolations.forEach((v) => console.log(`  • ${v}`));
      }
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    } catch (err: any) {
      formatOutput(
        {
          success: false,
          action: "guard:check",
          message: err.message,
          error: err.message,
          executionTimeMs: Date.now() - start,
        },
        opts.json
      );
    }
  });

program.parse(process.argv);

