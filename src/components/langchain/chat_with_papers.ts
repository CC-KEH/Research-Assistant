import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  RunnableWithMessageHistory,
  RunnableMap,
} from "@langchain/core/runnables";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import type { Runnable } from "@langchain/core/runnables";

import { getVectorStore, getLLM } from "./connections";

type ChatInput {
  question: string;
  sessionId: string;
}
type ChatOutput = { content: string };

// 🔹 Prompt Template for RAG
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful research assistant. Use the provided academic context to answer user queries accurately.

Always cite excerpts from the context when relevant. Be clear and concise.`,
  ],
  new MessagesPlaceholder("history"),
  ["system", "Relevant paper excerpts:\n\n{context}"],
  ["human", "{question}"],
]);

// 🔁 Memoize chain per session (optional for reuse)


const ragChainCache = new Map<
  string,
  RunnableWithMessageHistory<ChatInput, ChatOutput>
>();


export async function chatWithPapers({
  question,
  sessionId,
}: ChatInput): Promise<string> {
  // 1. Get LLM + Vector Store
  const llm = getLLM();
  const vectorStore = await getVectorStore();

  // 2. Build retrieval chain
  const retrievalChain = RunnableMap.from<ChatInput>({
    question: (input) => input.question,

    context: async (input) => {
      const docs = await vectorStore.similaritySearch(input.question, 4);
      return docs.map((d) => d.pageContent).join("\n\n---\n\n");
    },
  });

  // 3. Combine with prompt and LLM
  const ragChain = retrievalChain.pipe(prompt).pipe(llm) as Runnable<ChatInput, ChatOutput>;


  // 4. Memoize chat chain with memory (per session)
  let chatChain = ragChainCache.get(sessionId);
  if (!chatChain) {
    chatChain = new RunnableWithMessageHistory({
      runnable: ragChain,
      getMessageHistory: (id) =>
        new UpstashRedisChatMessageHistory({
          sessionId: id,
          config: {
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
          },
        }),
      inputMessagesKey: "question",
      historyMessagesKey: "history",
    });

    ragChainCache.set(sessionId, chatChain);
  }

  // 5. Run chat
  const response = await chatChain.invoke(
    { question, sessionId },
    {
      configurable: { sessionId },
    }
  );

  return response.content;
}
