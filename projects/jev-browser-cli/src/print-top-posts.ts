import { BrowserManager } from "./browser-manager.js";
import { ThreadsResearcher } from "./threads-researcher.js";

async function main() {
  const browserMgr = new BrowserManager(9222);
  const researcher = new ThreadsResearcher();

  console.log("=== RESEARCHING 3D PRINTING ===");
  const res3d = await researcher.researchCommunity(browserMgr, "3dprinting", 5, false);
  console.log(`Community: ${res3d.communityName} (${res3d.memberCount})`);
  res3d.topPosts.forEach((p, i) => {
    console.log(`[${i+1}] @${p.author} (${p.timeAgo}) - ${p.likes} likes, ${p.replies} replies`);
    console.log(`    Hook: "${p.extractedHook}"`);
    console.log(`    Archetype: ${p.archetype}, Virality: ${p.viralityScore}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
