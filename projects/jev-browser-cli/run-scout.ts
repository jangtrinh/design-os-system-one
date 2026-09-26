import { CommunityScoutDraftEngine } from "./src/community-scout-draft.js";

async function main() {
  console.log("🚀 Starting Safe Scout & Draft Run...");
  const engine = new CommunityScoutDraftEngine();
  const drafts = await engine.scoutAndDraft();
  console.log(`\n✅ Completed. Generated ${drafts.length} drafts.`);
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Error running scout:", err);
  process.exit(1);
});
