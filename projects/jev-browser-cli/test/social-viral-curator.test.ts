import assert from "node:assert/strict";
import { SocialViralCurator } from "../src/social-viral-curator.js";
import { BrowserManager } from "../src/browser-manager.js";

async function runTests() {
  console.log("🧪 Bắt đầu kiểm thử toàn diện Social Viral Curator & Auto-Engager...\n");

  const curator = new SocialViralCurator();

  // ==========================================
  // TEST 1: Phân loại 5 Hình Mẫu Viral (5 Proven Archetypes)
  // ==========================================
  console.log("1. Kiểm tra phân loại 5 Viral Archetypes:");

  // 1a. Builder Proof & Hard Demo
  const builderProof = curator.classifyArchetype(
    "Mất đúng 4ms để JEV kết nối trực tiếp qua CDP Socket. Repo open source: https://github.com/typesafeai/jev-browser. Benchmark: 60fps."
  );
  assert.equal(builderProof.archetype, "builder_demo", "Phải nhận diện đúng Builder Proof");
  assert.ok(builderProof.score >= 35, "Điểm Builder Proof phải >= 35");
  console.log("  ✅ Archetype 1: Builder Proof & Hard Demo ->", builderProof.archetype, `(Score: ${builderProof.score})`);

  // 1b. Multi-part Micro-Carousel
  const microCarousel = curator.classifyArchetype(
    "Ai từng làm AI Agent chắc chắn nếm trải nỗi sợ này... 🤯 1/4\n• Thẻ 1: Lỗi token\n• Thẻ 2: Mất context\n• Thẻ 3: Vỡ layout",
    4
  );
  assert.equal(microCarousel.archetype, "micro_carousel", "Phải nhận diện đúng Micro-Carousel");
  assert.ok(microCarousel.score >= 35, "Điểm Micro-Carousel phải >= 35");
  console.log("  ✅ Archetype 2: Multi-part Micro-Carousel ->", microCarousel.archetype, `(Score: ${microCarousel.score})`);

  // 1c. Curiosity Gap
  const curiosityGap = curator.classifyArchetype(
    "Cách biến prompt tiếng Việt thành hành động click chính xác 100%. Prompt & Code in thread ↓ 1/2"
  );
  assert.equal(curiosityGap.archetype, "curiosity_gap", "Phải nhận diện đúng Curiosity Gap");
  console.log("  ✅ Archetype 3: The Curiosity Gap ->", curiosityGap.archetype, `(Score: ${curiosityGap.score})`);

  // 1d. Community Crowdsource
  const crowdsource = curator.classifyArchetype(
    "Cả nhà có ai từng dùng thử công cụ X chưa ạ? Em xin review với:\n1. Tốc độ ổn không?\n2. Có bị khóa tài khoản không?"
  );
  assert.equal(crowdsource.archetype, "community_crowdsource", "Phải nhận diện đúng Community Crowdsource");
  console.log("  ✅ Archetype 4: Community Crowdsource ->", crowdsource.archetype, `(Score: ${crowdsource.score})`);

  // 1e. Authentic Builder Confession
  const confession = curator.classifyArchetype(
    "15+ apps live. Thú thật mình vẫn ngồi code ban đêm sau giờ làm ở công ty. ❤️ Bài học xương máu là hãy ship sớm."
  );
  assert.equal(confession.archetype, "builder_confession", "Phải nhận diện đúng Authentic Builder Confession");
  console.log("  ✅ Archetype 5: Authentic Builder Confession ->", confession.archetype, `(Score: ${confession.score})`);

  // ==========================================
  // TEST 2: Đánh giá Hook Strength (0 - 25 điểm)
  // ==========================================
  console.log("\n2. Kiểm tra đánh giá Hook Strength:");
  const goodHook = curator.evaluateHookStrength(
    "Mất đúng 4ms để một AI Agent điều khiển trực tiếp tab trình duyệt thật của bạn. ⚡️\nKhông cần server trung gian..."
  );
  assert.ok(goodHook.score >= 20, "Hook tốt phải đạt ít nhất 20/25 điểm");
  console.log("  ✅ Hook ngắn gọn, có số liệu & emoji:", goodHook.score, "/ 25");

  const badHookWithLink = curator.evaluateHookStrength(
    "https://example.com/spam-link Check out this new tool that is very long and has an external link right at the start..."
  );
  assert.ok(badHookWithLink.score < goodHook.score, "Hook chứa link ngoài đầu dòng bị trừ điểm");
  console.log("  ✅ Hook chứa link ngoài bị giảm điểm:", badHookWithLink.score, "/ 25");

  // ==========================================
  // TEST 3: Đánh giá AI Slop Score & Phát hiện Sáo Rỗng (PureLink/Your-Signal)
  // ==========================================
  console.log("\n3. Kiểm tra AI Slop Score (Generic Fluff & Empty Thought Leadership):");

  const slopPost = `In today's fast-paced digital world, AI is a true game-changer that will revolutionize everything! 🚀
Here is how to unlock the true power of AI in your daily life:
💡 1. Embrace the technology
✨ 2. Supercharge your workflow
🔥 3. 10x your productivity
Consistency is key. Agree? Thoughts? 👇 #AI #Tech #Leadership`;

  const slopResult = curator.calculateSlopScore(slopPost);
  assert.ok(slopResult.slopScore > 60, "Bài viết AI khuôn mẫu phải có slopScore > 60");
  console.log("  ✅ AI Slop Post:", slopResult.slopScore, "/ 100 (Slop cao, phát hiện buzzwords & emoji spam)");

  const cleanPost = `Đã tích hợp xong CDP direct socket vào JEV Browser.
Latency: 4ms. Tiết kiệm 80% RAM so với mở full Chrome headless.
Mã nguồn: github.com/typesafeai/jev-browser`;
  const cleanResult = curator.calculateSlopScore(cleanPost);
  assert.ok(cleanResult.slopScore <= 20, "Bài viết có code/benchmark thực tế phải có slopScore thấp");
  console.log("  ✅ High-Signal Post:", cleanResult.slopScore, "/ 100 (Slop cực thấp)");

  // ==========================================
  // TEST 4: Kiểm tra Verdict logic
  // ==========================================
  console.log("\n4. Kiểm tra logic phân loại Verdict (HIGH_PRIORITY_ENGAGE / NEUTRAL / AI_SLOP_SKIP):");

  assert.equal(curator.determineVerdict(85, 10), "HIGH_PRIORITY_ENGAGE", "Viral >= 70 && Slop <= 30 -> HIGH_PRIORITY_ENGAGE");
  assert.equal(curator.determineVerdict(40, 75), "AI_SLOP_SKIP", "Slop > 60 -> AI_SLOP_SKIP");
  assert.equal(curator.determineVerdict(55, 45), "NEUTRAL", "Trung tính -> NEUTRAL");
  console.log("  ✅ HIGH_PRIORITY_ENGAGE xác nhận chính xác");
  console.log("  ✅ AI_SLOP_SKIP xác nhận chính xác");
  console.log("  ✅ NEUTRAL xác nhận chính xác");

  // ==========================================
  // TEST 5: Tự động tạo gợi ý bình luận sắc bén (Suggested Engagement)
  // ==========================================
  console.log("\n5. Kiểm tra tự động tạo bình luận gợi mở thảo luận:");

  const commentBuilder = curator.generateSuggestedEngagement({
    author: "Alex",
    text: "Mất đúng 4ms để điều khiển trình duyệt qua CDP Socket...",
    archetype: "builder_demo",
    viralScore: 85,
    slopScore: 0,
    platform: "threads",
  });
  assert.ok(commentBuilder.length > 20, "Bình luận phải có độ dài đầy đủ");
  assert.ok(!commentBuilder.includes("Great post"), "Bình luận không được sáo rỗng (không chứa 'Great post')");
  console.log("  ✅ Builder Proof Comment:\n    \"", commentBuilder, "\"");

  const commentCrowdsource = curator.generateSuggestedEngagement({
    author: "Minh",
    text: "1. Tốc độ latency thực tế có giữ được không? 2. Có hiện tượng hallucination không?",
    archetype: "community_crowdsource",
    viralScore: 80,
    slopScore: 0,
    platform: "threads",
  });
  assert.ok(commentCrowdsource.includes("1.") && commentCrowdsource.includes("2."), "Bình luận phải trả lời trực tiếp từng câu hỏi");
  console.log("  ✅ Crowdsource Comment:\n    \"", commentCrowdsource.replace(/\n/g, "\n    "), "\"");

  // ==========================================
  // TEST 6: Luồng curateFeed tích hợp
  // ==========================================
  console.log("\n6. Kiểm tra luồng curateFeed với bộ dữ liệu Mock:");
  const bm = new BrowserManager(9222);
  const report = await curator.curateFeed(bm, {
    mock: true,
    platform: "threads",
    draftReply: true,
  });

  assert.equal(report.totalScanned, 5, "Phải quét đủ 5 bài mock");
  assert.ok(report.highPriorityCount >= 3, "Phải có ít nhất 3 bài HIGH_PRIORITY_ENGAGE");
  assert.equal(report.slopCount, 1, "Phải phát hiện chính xác 1 bài AI Slop");
  assert.ok(report.posts[0].verdict === "HIGH_PRIORITY_ENGAGE", "Bài đầu tiên phải là HIGH_PRIORITY_ENGAGE");
  console.log(`  ✅ Total: ${report.totalScanned}, High Priority: ${report.highPriorityCount}, Slop: ${report.slopCount}`);

  // Test Filter by minViral
  const filteredViral = await curator.curateFeed(bm, {
    mock: true,
    minViral: 80,
  });
  assert.ok(filteredViral.posts.every((p) => p.viralScore >= 80), "Tất cả bài viết phải có viralScore >= 80");
  console.log(`  ✅ Filter minViral >= 80: Còn lại ${filteredViral.totalScanned} bài.`);

  // Test Filter by maxSlop
  const filteredSlop = await curator.curateFeed(bm, {
    mock: true,
    maxSlop: 30,
  });
  assert.ok(filteredSlop.posts.every((p) => p.slopScore <= 30), "Tất cả bài viết phải có slopScore <= 30");
  console.log(`  ✅ Filter maxSlop <= 30: Đã loại bỏ hoàn toàn các bài AI Slop (còn lại ${filteredSlop.totalScanned} bài).`);

  // ==========================================
  // TEST 7: Nhận diện Platform URL
  // ==========================================
  console.log("\n7. Kiểm tra nhận diện nền tảng từ URL:");
  assert.equal(curator.detectPlatform("https://www.threads.net/@user/post/123"), "threads");
  assert.equal(curator.detectPlatform("https://www.linkedin.com/feed/update/urn:li:activity:123"), "linkedin");
  assert.equal(curator.detectPlatform("https://x.com/home"), "x");
  assert.equal(curator.detectPlatform("https://twitter.com/user/status/123"), "x");
  console.log("  ✅ Nhận diện chính xác Threads, LinkedIn, X");

  console.log("\n🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ VƯỢT QUA THÀNH CÔNG (100% PASSED)!");
}

runTests().catch((err) => {
  console.error("❌ Kiểm thử thất bại:", err);
  process.exit(1);
});
