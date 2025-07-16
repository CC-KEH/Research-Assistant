// import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// import { OpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

const API = "";

// OpenAI
export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  temperature: 0.7,
  apiKey: API,
});

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "models/gemini-embedding-exp-03-07",
  apiKey: API,
});

// Factory function to create/load store
export async function getVectorStore() {
  try {
    return await FaissStore.load("./faiss_index", embeddings);
  } catch (e) {
    console.warn("⚠️ FAISS index not found, returning empty store.");
    return new FaissStore(embeddings, {});
  }
}

// 🔐 ENV or hardcoded API keys
// const OPENAI_API_KEY = "";
// const GOOGLE_API_KEY = "";

// // ==========================
// // 🤖 LLMs
// // ==========================
// import { ChatOpenAI } from "@langchain/openai";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// // ==========================
// // 🧠 Embeddings
// // ==========================
// import { OpenAIEmbeddings } from "@langchain/openai";
// import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// // ==========================
// // 🏪 Vector Stores
// // ==========================
// import { FaissStore } from "@langchain/community/vectorstores/faiss";
// // Add more stores here (e.g., Pinecone, Chroma, Weaviate)

// // ==========================
// // 🔧 Config: Switch providers here
// // ==========================
// const CONFIG = {
//   llmProvider: "google", // "openai" or "google"
//   embeddingProvider: "google", // "openai" or "google"
//   vectorStoreType: "faiss", // future-proof for other store types
//   faissIndexPath: "./faiss_index",
// };

// // ==========================
// // 🏭 Factory: LLM
// // ==========================
// export function getLLM() {
//   switch (CONFIG.llmProvider) {
//     case "openai":
//       return new ChatOpenAI({
//         model: "gpt-4o",
//         temperature: 0.7,
//         apiKey: OPENAI_API_KEY,
//       });
//     case "google":
//       return new ChatGoogleGenerativeAI({
//         model: "gemini-2.0-flash",
//         temperature: 0.7,
//         apiKey: GOOGLE_API_KEY,
//       });
//     default:
//       throw new Error(`Unsupported LLM provider: ${CONFIG.llmProvider}`);
//   }
// }

// // ==========================
// // 🧠 Factory: Embeddings
// // ==========================
// export function getEmbeddings() {
//   switch (CONFIG.embeddingProvider) {
//     case "openai":
//       return new OpenAIEmbeddings({
//         model: "text-embedding-3-large",
//         apiKey: OPENAI_API_KEY,
//       });
//     case "google":
//       return new GoogleGenerativeAIEmbeddings({
//         model: "models/gemini-embedding-exp-03-07",
//         apiKey: GOOGLE_API_KEY,
//       });
//     default:
//       throw new Error(
//         `Unsupported embedding provider: ${CONFIG.embeddingProvider}`
//       );
//   }
// }

// // ==========================
// // 🧱 Factory: Vector Store
// // ==========================
// export async function getVectorStore() {
//   const embeddings = getEmbeddings();

//   switch (CONFIG.vectorStoreType) {
//     case "faiss":
//       try {
//         return await FaissStore.load(CONFIG.faissIndexPath, embeddings);
//       } catch {
//         console.warn("⚠️ FAISS index not found, returning empty store.");
//         return new FaissStore(embeddings, {});
//       }
//     default:
//       throw new Error(
//         `Unsupported vector store type: ${CONFIG.vectorStoreType}`
//       );
//   }
// }
