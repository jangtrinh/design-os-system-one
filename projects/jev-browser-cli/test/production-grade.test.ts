import { AsyncGuard } from "../src/async-guard.js";
import { DeepDomPiercer } from "../src/deep-dom-piercer.js";
import { CdpSessionPool } from "../src/cdp-session-pool.js";
import { SocialViralCurator } from "../src/social-viral-curator.js";
import type { EvaluatorAction } from "../src/types.js";

async function runProductionTests() {
  console.log("===============================================================");
  console.log("🧪 JEV BROWSER PRODUCTION-GRADE COMPREHENSIVE TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ""}`);
      failed++;
    }
  }

  // ==============================================================
  // 1. MULTI-LINGUAL GUARDRAILS TEST (6 Languages)
  // ==============================================================
  console.log("📌 SUITE 1: Multi-Lingual Guardrails (EN, VI, DE, FR, ES, JA, ZH)");
  const guard = new AsyncGuard(0.15);

  const multilingualDestructiveTests = [
    { lang: "English", text: "Delete database permanently", selector: "button.delete-btn" },
    { lang: "Vietnamese", text: "Xóa tài khoản vĩnh viễn", selector: "button.btn-danger" },
    { lang: "German", text: "Konto jetzt löschen", selector: "button.loeschen" },
    { lang: "French", text: "Supprimer le compte", selector: "button.supprimer" },
    { lang: "Spanish", text: "Eliminar cuenta de usuario", selector: "button.eliminar" },
    { lang: "Japanese", text: "アカウントを完全に削除する", selector: "button.sakujo" },
    { lang: "Chinese", text: "永久删除此账户", selector: "button.shanchu" }
  ];

  for (const t of multilingualDestructiveTests) {
    const action: EvaluatorAction = {
      action: "click",
      targetElementText: t.text,
      selector: t.selector,
      confidence: 1.0,
      rationale: "test",
      latencyMs: 0
    };
    const v = await guard.evaluateSafety(action, "https://app.example.com");
    assert(!v.allowed && v.riskLevel === "CRITICAL" && v.riskScore >= 0.9, `${t.lang} Delete Blocked`, `Risk: ${v.riskScore}, Reason: ${v.guardReason}`);
  }

  const multilingualFinancialTests = [
    { lang: "English", text: "Complete Purchase & Checkout $99", selector: "button.checkout" },
    { lang: "Vietnamese", text: "Thanh toán ngay giỏ hàng", selector: "button.pay" },
    { lang: "German", text: "Zahlungspflichtig bestellen", selector: "button.kaufen" },
    { lang: "French", text: "Procéder au paiement de la commande", selector: "button.payer" },
    { lang: "Spanish", text: "Confirmar pago y finalizar compra", selector: "button.comprar" },
    { lang: "Japanese", text: "今すぐ購入して支払いを確定する", selector: "button.kounyu" },
    { lang: "Chinese", text: "立即购买并确认付款", selector: "button.goumai" }
  ];

  for (const t of multilingualFinancialTests) {
    const action: EvaluatorAction = {
      action: "click",
      targetElementText: t.text,
      selector: t.selector,
      confidence: 1.0,
      rationale: "test",
      latencyMs: 0
    };
    const v = await guard.evaluateSafety(action, "https://shop.example.com");
    assert(!v.allowed && v.riskLevel === "CRITICAL" && v.riskScore >= 0.95, `${t.lang} Payment Blocked`, `Risk: ${v.riskScore}, Reason: ${v.guardReason}`);
  }

  // Safe Action Test across languages
  const safeTests = [
    { lang: "English", text: "Read more details" },
    { lang: "Vietnamese", text: "Xem thêm chi tiết" },
    { lang: "German", text: "Mehr erfahren" },
    { lang: "French", text: "En savoir plus" },
    { lang: "Spanish", text: "Ver más información" },
    { lang: "Japanese", text: "詳細を見る" },
    { lang: "Chinese", text: "查看详情" }
  ];

  for (const t of safeTests) {
    const action: EvaluatorAction = {
      action: "click",
      targetElementText: t.text,
      selector: "a.detail-link",
      confidence: 1.0,
      rationale: "test",
      latencyMs: 0
    };
    const v = await guard.evaluateSafety(action, "https://blog.example.com");
    assert(v.allowed && v.riskScore === 0.0, `${t.lang} Safe Action Allowed`, `Risk: ${v.riskScore}`);
  }

  // ==============================================================
  // 2. CREDENTIAL & SECRET LEAKAGE PREVENTION TEST
  // ==============================================================
  console.log("\n📌 SUITE 2: Secret & API Key Leakage Interception");

  const leakTests = [
    { name: "OpenAI Secret Key", value: "sk-proj-abc1234567890abcdef1234567890abcdef" },
    { name: "Anthropic API Key", value: "sk-ant-api03-abcdef1234567890abcdef12345" },
    { name: "GitHub Personal Token", value: "ghp_123456789012345678901234567890123456" },
    { name: "Private Key Banner", value: "-----BEGIN RSA PRIVATE KEY----- MIIEowIBAAKCAQEA0" }
  ];

  for (const t of leakTests) {
    const action: EvaluatorAction = {
      action: "type",
      value: t.value,
      selector: "input#comment",
      confidence: 1.0,
      rationale: "test",
      latencyMs: 0
    };
    const v = await guard.evaluateSafety(action, "https://public.example.com");
    assert(!v.allowed && v.riskScore >= 0.95, `Secret Intercepted: ${t.name}`, `Risk: ${v.riskScore}`);
  }

  // ==============================================================
  // 3. DEEP DOM PIERCER (SHADOW DOM & IFRAME SYNTAX) TEST
  // ==============================================================
  console.log("\n📌 SUITE 3: Deep DOM Piercer Script Generation & Syntax");

  const extractScript = DeepDomPiercer.getExtractionScript(50);
  assert(extractScript.includes("shadowRoot"), "Extraction script probes shadowRoot");
  assert(extractScript.includes("contentDocument"), "Extraction script probes iframe contentDocument");
  assert(extractScript.includes(" >>> "), "Extraction script formats deep piercer path");

  const clickScript = DeepDomPiercer.getClickScript("my-component >>> button.action", "Click Me");
  assert(clickScript.includes("findDeep"), "Click script contains recursive shadow piercer");
  assert(clickScript.includes("split(\" >>> \")"), "Click script handles hierarchical shadow paths");

  // ==============================================================
  // 4. CDP SESSION POOL SINGLETON & LIFECYCLE TEST
  // ==============================================================
  console.log("\n📌 SUITE 4: CDP Session Pool Lifecycle & Singleton");

  const pool1 = CdpSessionPool.getInstance();
  const pool2 = CdpSessionPool.getInstance();
  assert(pool1 === pool2, "CdpSessionPool is strict singleton");
  assert(typeof pool1.evaluate === "function", "CdpSessionPool exports evaluate method");
  assert(typeof pool1.send === "function", "CdpSessionPool exports send method");
  assert(pool1.getActiveSessionsCount() === 0, "Initial pool is clean");

  // ==============================================================
  // 5. SOCIAL VIRAL CURATOR AUTOMATION TEST
  // ==============================================================
  console.log("\n📌 SUITE 5: Social Viral Curator & Slop Detection");

  const curator = new SocialViralCurator();
  const mockPosts = curator.getMockCandidates("threads");

  const scored1 = await curator.evaluatePost(mockPosts[0], "threads");
  assert(scored1.archetype === "builder_demo", "Mock 1 classified as builder_demo");
  assert(scored1.viralScore >= 80, `Mock 1 high virality (${scored1.viralScore})`);
  assert(scored1.slopScore <= 10, `Mock 1 zero slop (${scored1.slopScore})`);
  assert(scored1.verdict === "HIGH_PRIORITY_ENGAGE", "Mock 1 verdict is HIGH_PRIORITY_ENGAGE");

  const scoredSlop = await curator.evaluatePost(mockPosts[1], "threads");
  assert(scoredSlop.slopScore >= 80, `Mock 2 flagged high slop (${scoredSlop.slopScore})`);
  assert(scoredSlop.verdict === "AI_SLOP_SKIP", "Mock 2 verdict is AI_SLOP_SKIP");

  console.log("\n===============================================================");
  console.log(`🏁 PRODUCTION GRADE TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionTests().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
