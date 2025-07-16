import { getVectorStore, getLLM } from "./connections";
import { allPrompts, PromptType } from "./prompts";

// Get full paper from vector store by metadata
async function getFullPaperText(paperId: string): Promise<string> {
  const store = await getVectorStore();

  const docs = await store.similaritySearch("", 100, {
    filter: { paperId },
  });

  if (!docs.length) throw new Error(`No chunks found for paperId: ${paperId}`);

  // Join all chunks (optionally sort by page/position if stored)
  return docs.map((doc) => doc.pageContent).join("\n\n");
}

// One-shot prompt execution
export async function runPromptOnPaper({
  paperId,
  type,
}: {
  paperId: string;
  type: PromptType;
}) {
  const prompt = allPrompts[type];
  if (!prompt) throw new Error(`Unknown prompt type: ${type}`);

  const llm = getLLM();
  const chain = prompt.pipe(llm);

  const paperText = await getFullPaperText(paperId);
  const result = await chain.invoke({ paper: paperText });

  return result.content;
}
