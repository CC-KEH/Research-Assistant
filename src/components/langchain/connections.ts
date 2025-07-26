// ==========================
// 🤖 LLMs
// ==========================
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// ==========================
// 🧠 Embeddings
// ==========================
import { OpenAIEmbeddings } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// ==========================
// 🏪 Vector Stores
// ==========================
import { FaissStore } from "@langchain/community/vectorstores/faiss";
// Add more stores here (e.g., Pinecone, Chroma, Weaviate)

// ==========================
// 🔧 Config: Switch providers here
// ==========================

// ==========================
// 🏭 Factory: LLM
// ==========================
export function getLLM(llmConfig) {
  switch (llmConfig.llmProvider) {
    case "openai":
      return new ChatOpenAI({
        model: llmConfig.modelName,
        temperature: llmConfig.temperature,
        apiKey: llmConfig.api_key,
      });
    case "google":
      return new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0.7,
        apiKey: llmConfig.api_key,
      });
    default:
      throw new Error(`Unsupported LLM provider: ${llmConfig.llmProvider}`);
  }
}

// ==========================
// 🧠 Factory: Embeddings
// ==========================
export function getEmbeddings(embeddingConfig) {
  switch (embeddingConfig.embeddingProvider) {
    case "openai":
      return new OpenAIEmbeddings({
        model: embeddingConfig.modelName,
        apiKey: embeddingConfig.api_key,
      });
    case "google":
      return new GoogleGenerativeAIEmbeddings({
        model: embeddingConfig.modelName,
        apiKey: embeddingConfig.api_key,
      });
    default:
      throw new Error(
        `Unsupported embedding provider: ${embeddingConfig.embeddingProvider}`
      );
  }
}

// ==========================
// 🧱 Factory: Vector Store
// ==========================
export async function getVectorStore(vectorStoreConfig, embeddingConfig) {
  const embeddings = getEmbeddings(embeddingConfig);

  switch (vectorStoreConfig.vectorStoreType) {
    case "faiss":
      try {
        return await FaissStore.load(
          vectorStoreConfig.faissIndexPath,
          embeddings
        );
      } catch {
        console.warn("⚠️ FAISS index not found, returning empty store.");
        return [embeddings, new FaissStore(embeddings, {})];
      }
    default:
      throw new Error(
        `Unsupported vector store type: ${vectorStoreConfig.vectorStoreType}`
      );
  }
}
