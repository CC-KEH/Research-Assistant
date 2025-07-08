import { indexPapers } from "./indexing"; // Your indexing module
import { askResearchAssistant } from "./retrieve_and_generate"; // Your chatbot module

async function fullTest() {
  const sessionId = "test_user";

  console.log("=== 📥 INDEXING TEST ===");

  const { docs, splits } = await indexPapers();

  if (!docs.length) throw new Error("❌ No documents loaded from directory.");
  if (!splits.length) throw new Error("❌ No document chunks created.");

  const exampleDoc = docs[0];
  const exampleChunk = splits[0];

  if (!exampleDoc.metadata.paperId)
    throw new Error("❌ Loaded doc missing paperId in metadata.");
  if (!exampleChunk.metadata.paperId)
    throw new Error("❌ Split chunk missing paperId in metadata.");
  if (exampleChunk.pageContent.length > 1200)
    throw new Error("❌ Chunk seems too large, check splitter settings.");

  const paperId = exampleDoc.metadata.paperId;
  console.log(`✅ Indexed "${paperId}" with ${splits.length} chunks.`);

  console.log("\n=== 🤖 CHATBOT TEST: GLOBAL MODE ===");

  const globalResponse = await askResearchAssistant({
    question: "What is Attention Mechanism?",
    sessionId,
    mode: "global",
  });

  if (!globalResponse || globalResponse.length < 5)
    throw new Error("❌ Empty or too short response in global mode.");

  console.log("🧠 Global Response:\n", globalResponse);

  console.log("\n=== 🤖 CHATBOT TEST: FOCUSED MODE ===");

  const focusedResponse = await askResearchAssistant({
    question: "What are the contributions of this paper?",
    sessionId,
    mode: "focused",
    paperId,
  });

  if (!focusedResponse || focusedResponse.length < 5)
    throw new Error("❌ Empty or too short response in focused mode.");

  console.log("📄 Focused Response:\n", focusedResponse);

  console.log("\n✅ ALL TESTS PASSED.");
}

fullTest().catch((err) => {
  console.error("❌ TEST FAILED:", err.message);
});
