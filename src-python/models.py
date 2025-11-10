# TODO: Fix
# LLMS
import { ChatXAI } from "@langchain/xai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { useConfig } from "@/components/providers/ConfigProvider";

# Embeddings
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { OpenAIEmbeddings } from "@langchain/openai";

# VectorStores
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

# Import types
import type {
  LlmProvider,
  EmbeddingProvider,
  VectorStoreProvider,
} from "@/lib/types";

type ChatModel = ChatXAI | ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;

type EmbeddingModel = GoogleGenerativeAIEmbeddings | OpenAIEmbeddings;

type VectorStoreClient = Chroma | FaissStore | PineconeStore;

# ============================================================================
# CHAT MODELS
# ============================================================================

export function createModelFromConfig(): ChatModel {
  const { getLlmConfig } = useConfig();
  const llmConfig = getLlmConfig();

  if (!llmConfig || llmConfig.length === 0) {
    throw new Error(
      "No LLM configuration found. Please configure at least one LLM provider."
    );
  }

  const openai = llmConfig.find((p: LlmProvider) => p.name === "openai");
  if (openai?.api_key && openai.api_key.trim() !== "") {
    return new ChatOpenAI({
      apiKey: openai.api_key,
      model: openai.value || "gpt-3.5-turbo",
      temperature: 0.7,
    });
  }

  const google = llmConfig.find((p: LlmProvider) => p.name === "google");
  if (google?.api_key && google.api_key.trim() !== "") {
    return new ChatGoogleGenerativeAI({
      apiKey: google.api_key,
      model: google.value || "gemini-pro",
      temperature: 0.7,
    });
  }

  const anthropic = llmConfig.find((p: LlmProvider) => p.name === "anthropic");
  if (anthropic?.api_key && anthropic.api_key.trim() !== "") {
    return new ChatAnthropic({
      apiKey: anthropic.api_key,
      model: "claude-3-5-sonnet-20241022",
      temperature: 0.7,
    });
  }

  const xai = llmConfig.find((p: LlmProvider) => p.name === "xai");
  if (xai?.api_key && xai.api_key.trim() !== "") {
    return new ChatXAI({
      apiKey: xai.api_key,
      model: xai.value || "grok-beta",
      temperature: 0.7,
    });
  }

  throw new Error(
    "No valid API key found in LLM configuration. Please provide at least one provider with an API key in Settings."
  );
}

/** Creates a chat model for a specific provider */
export function createModelByProvider(providerName: string): ChatModel {
  const { getLlmConfig } = useConfig();
  const llmConfig = getLlmConfig();

  if (!llmConfig) {
    throw new Error("LLM configuration not loaded");
  }

  const provider = llmConfig.find((p: LlmProvider) => p.name === providerName);

  if (!provider?.api_key || provider.api_key.trim() === "") {
    throw new Error(
      `No API key found for provider: ${providerName}. Please configure it in Settings.`
    );
  }

  switch (providerName) {
    case "openai":
      return new ChatOpenAI({
        apiKey: provider.api_key,
        model: provider.value || "gpt-3.5-turbo",
        temperature: 0.7,
      });

    case "google":
      return new ChatGoogleGenerativeAI({
        apiKey: provider.api_key,
        model: provider.value || "gemini-pro",
        temperature: 0.7,
      });

    case "anthropic":
      return new ChatAnthropic({
        apiKey: provider.api_key,
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.7,
      });

    case "xai":
      return new ChatXAI({
        apiKey: provider.api_key,
        model: provider.value || "grok-beta",
        temperature: 0.7,
      });

    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}

/** Get all available LLM providers with API keys */
export function getAvailableLLMProviders(): string[] {
  const { getLlmConfig } = useConfig();
  const llmConfig = getLlmConfig();

  if (!llmConfig) return [];

  return llmConfig
    .filter(
      (provider: LlmProvider) =>
        provider.api_key && provider.api_key.trim() !== ""
    )
    .map((provider: LlmProvider) => provider.name);
}

# ============================================================================
# EMBEDDINGS
# ============================================================================

export function createEmbeddingFromConfig(): EmbeddingModel {
  const { getEmbeddingsConfig } = useConfig();
  const embeddingsConfig = getEmbeddingsConfig();

  if (!embeddingsConfig || embeddingsConfig.length === 0) {
    throw new Error(
      "No embeddings configuration found. Please configure at least one embeddings provider."
    );
  }

  const openai = embeddingsConfig.find(
    (p: EmbeddingProvider) => p.name === "openai"
  );
  if (openai?.api_key && openai.api_key.trim() !== "") {
    return new OpenAIEmbeddings({
      apiKey: openai.api_key,
      model: "text-embedding-3-small",
    });
  }

  const google = embeddingsConfig.find(
    (p: EmbeddingProvider) => p.name === "google"
  );
  if (google?.api_key && google.api_key.trim() !== "") {
    return new GoogleGenerativeAIEmbeddings({
      apiKey: google.api_key,
      model: "embedding-001",
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });
  }

  const voyage = embeddingsConfig.find(
    (p: EmbeddingProvider) => p.name === "voyage"
  );
  if (voyage?.api_key && voyage.api_key.trim() !== "") {
    # Note: You'll need to add VoyageEmbeddings import if you want to use it
    throw new Error("Voyage embeddings not yet implemented");
  }

  throw new Error(
    "No valid API key found in embeddings configuration. Please provide at least one provider with an API key in Settings."
  );
}

/** Creates an embedding model for a specific provider */
export function createEmbeddingByProvider(
  providerName: string
): EmbeddingModel {
  const { getEmbeddingsConfig } = useConfig();
  const embeddingsConfig = getEmbeddingsConfig();

  if (!embeddingsConfig) {
    throw new Error("Embeddings configuration not loaded");
  }

  const provider = embeddingsConfig.find(
    (p: EmbeddingProvider) => p.name === providerName
  );

  if (!provider?.api_key || provider.api_key.trim() === "") {
    throw new Error(
      `No API key found for embeddings provider: ${providerName}. Please configure it in Settings.`
    );
  }

  switch (providerName) {
    case "openai":
      return new OpenAIEmbeddings({
        apiKey: provider.api_key,
        model: "text-embedding-3-small",
      });

    case "google":
      return new GoogleGenerativeAIEmbeddings({
        apiKey: provider.api_key,
        model: "embedding-001",
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });

    case "voyage":
      throw new Error("Voyage embeddings not yet implemented");

    default:
      throw new Error(`Unsupported embeddings provider: ${providerName}`);
  }
}

/** Get all available embedding providers with API keys */
export function getAvailableEmbeddingProviders(): string[] {
  const { getEmbeddingsConfig } = useConfig();
  const embeddingsConfig = getEmbeddingsConfig();

  if (!embeddingsConfig) return [];

  return embeddingsConfig
    .filter(
      (provider: EmbeddingProvider) =>
        provider.api_key && provider.api_key.trim() !== ""
    )
    .map((provider: EmbeddingProvider) => provider.name);
}

# ============================================================================
# VECTOR STORES
# ============================================================================

export function getVectorStoreConfig() {
  const { getVectorStoreConfig: getVectorConfig } = useConfig();
  const vectorStoreConfig = getVectorConfig();

  if (!vectorStoreConfig || vectorStoreConfig.length === 0) {
    throw new Error(
      "No vector store configuration found. Please configure at least one vector store provider."
    );
  }

  const pinecone = vectorStoreConfig.find(
    (p: VectorStoreProvider) => p.name === "Pinecone"
  );
  if (pinecone?.api_key && pinecone.api_key.trim() !== "") {
    return { provider: "pinecone", config: pinecone };
  }

  const chroma = vectorStoreConfig.find(
    (p: VectorStoreProvider) => p.name === "Chroma"
  );
  if (chroma?.api_key && chroma.api_key.trim() !== "") {
    return { provider: "chroma", config: chroma };
  }

  const weaviate = vectorStoreConfig.find(
    (p: VectorStoreProvider) => p.name === "Weaviate"
  );
  if (weaviate?.api_key && weaviate.api_key.trim() !== "") {
    return { provider: "weaviate", config: weaviate };
  }

  throw new Error(
    "No valid API key found in vector store configuration. Please provide at least one provider with an API key in Settings."
  );
}

/** Initialize Pinecone client */
export function createPineconeClient(apiKey: string): PineconeClient {
  return new PineconeClient({
    apiKey: apiKey,
  });
}

/** Create a Pinecone vector store */
export async function createPineconeStore(
  indexName: string,
  embeddings: EmbeddingModel
): Promise<PineconeStore> {
  const { getVectorStoreConfig: getVectorConfig } = useConfig();
  const vectorStoreConfig = getVectorConfig();

  if (!vectorStoreConfig) {
    throw new Error("Vector store configuration not loaded");
  }

  const pinecone = vectorStoreConfig.find(
    (p: VectorStoreProvider) => p.name === "Pinecone"
  );

  if (!pinecone?.api_key || pinecone.api_key.trim() === "") {
    throw new Error("No Pinecone API key found in configuration");
  }

  const client = createPineconeClient(pinecone.api_key);
  const pineconeIndex = client.Index(indexName);

  return await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
  });
}

/** Create a Chroma vector store */
export async function createChromaStore(
  collectionName: string,
  embeddings: EmbeddingModel,
  url?: string
): Promise<Chroma> {
  return await Chroma.fromExistingCollection(embeddings, {
    collectionName,
    url: url || "http:#localhost:8000",
  });
}

/** Get all available vector store providers with API keys */
export function getAvailableVectorStoreProviders(): string[] {
  const { getVectorStoreConfig: getVectorConfig } = useConfig();
  const vectorStoreConfig = getVectorConfig();

  if (!vectorStoreConfig) return [];

  return vectorStoreConfig
    .filter(
      (provider: VectorStoreProvider) =>
        provider.api_key && provider.api_key.trim() !== ""
    )
    .map((provider: VectorStoreProvider) => provider.name);
}
