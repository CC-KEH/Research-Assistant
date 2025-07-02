import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  RunnableWithMessageHistory,
  RunnableMap,
} from "@langchain/core/runnables";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import { vectorStore, llm } from "./connections";

// 📄 Input definition with mode
interface ResearchChatInput {
  question: string;
  mode: "global" | "focused";
  paperId?: string;
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an expert research assistant. Use the provided academic context to give precise and thoughtful answers.
Avoid speculation, cite examples from the provided context, and keep it concise.`,
  ],
  new MessagesPlaceholder("history"),
  ["system", "Here are relevant excerpts from research papers:\n\n{context}"],
  ["human", "{question}"],
]);

// 🔍 Retrieval logic depending on mode
const retrievalChain = RunnableMap.from<ResearchChatInput>({
  question: (input) => input.question,

  context: async (input) => {
    const { question, mode, paperId } = input;
    let docs;

    if (mode === "focused") {
      if (!paperId) {
        throw new Error("Focused mode requires a paperId.");
      }

      // Search within a specific paper using metadata filter
      docs = await vectorStore.similaritySearch(question, 4, {
        filter: { paperId },
      });
    } else {
      // Search across all papers
      docs = await vectorStore.similaritySearch(question, 4);
    }

    return docs.map((doc) => doc.pageContent).join("\n\n---\n\n");
  },
});

const ragChain = retrievalChain.pipe(prompt).pipe(llm);

const chatWithHistory = new RunnableWithMessageHistory({
  runnable: ragChain,
  getMessageHistory: (sessionId) =>
    new UpstashRedisChatMessageHistory({
      sessionId,
      config: {
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      },
    }),
  inputMessagesKey: "question",
  historyMessagesKey: "history",
});

// Exported function
export async function askResearchAssistant({
  question,
  sessionId,
  mode = "global",
  paperId,
}: {
  question: string;
  sessionId: string;
  mode: "global" | "focused";
  paperId?: string;
}) {
  const response = await chatWithHistory.invoke(
    { question, mode, paperId },
    {
      configurable: { sessionId },
    }
  );

  return response.content;
}

// import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
// import { RunnableWithMessageHistory, RunnableMap } from "@langchain/core/runnables";
// import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
// import { vectorStore, llm } from "./connections";

// // 📄 Input definition with mode
// interface ResearchChatInput {
//   question: string;
//   mode: "global" | "focused";
//   paperId?: string;
// }

// const prompt = ChatPromptTemplate.fromMessages([
//   [
//     "system",
//     `You are an expert research assistant. Use the provided academic context to give precise and thoughtful answers.
// Avoid speculation, cite examples from the provided context, and keep it concise.`,
//   ],
//   new MessagesPlaceholder("history"),
//   ["system", "Here are relevant excerpts from research papers:\n\n{context}"],
//   ["human", "{question}"],
// ]);

// // 🔍 Retrieval logic depending on mode
// const retrievalChain = RunnableMap.from<ResearchChatInput>({
//   question: (input) => input.question,

//   context: async (input) => {
//     const { question, mode, paperId } = input;
//     let docs;

//     if (mode === "focused") {
//       if (!paperId) {
//         throw new Error("Focused mode requires a paperId.");
//       }

//       // Search within a specific paper using metadata filter
//       docs = await vectorStore.similaritySearch(question, 4, {
//         filter: { paperId },
//       });
//     } else {
//       // Search across all papers
//       docs = await vectorStore.similaritySearch(question, 4);
//     }

//     return docs.map((doc) => doc.pageContent).join("\n\n---\n\n");
//   },
// });

// const ragChain = retrievalChain.pipe(prompt).pipe(llm);

// const chatWithHistory = new RunnableWithMessageHistory({
//   runnable: ragChain,
//   getMessageHistory: (sessionId) =>
//     new UpstashRedisChatMessageHistory({
//       sessionId,
//       config: {
//         url: process.env.UPSTASH_REDIS_REST_URL!,
//         token: process.env.UPSTASH_REDIS_REST_TOKEN!,
//       },
//     }),
//   inputMessagesKey: "question",
//   historyMessagesKey: "history",
// });

// // Exported function
// export async function askResearchAssistant({
//   question,
//   sessionId,
//   mode = "global",
//   paperId,
// }: {
//   question: string;
//   sessionId: string;
//   mode: "global" | "focused";
//   paperId?: string;
// }) {
//   const response = await chatWithHistory.invoke(
//     { question, mode, paperId },
//     {
//       configurable: { sessionId },
//     }
//   );

//   return response.content;
// }
