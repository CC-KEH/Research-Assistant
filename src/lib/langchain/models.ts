import { ChatXAI } from "@langchain/xai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { useConfig } from "@/components/providers/ConfigProvider";

type ChatModel = ChatXAI | ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;

type EmbeddingModel = ""; // TODO: Define based on embeddingsConfig

type VectorStore = ""; // TODO: Define based on vectorStoreConfig

/** Creates a chat model instance based on available API keys in config
 * Priority order: OpenAI -> Google -> Anthropic -> XAI */
export function createModelFromConfig(): ChatModel {
  const { getLlmConfig } = useConfig();
  const llmConfig = getLlmConfig();

  if (!llmConfig || llmConfig.length === 0) {
    throw new Error(
      "No LLM configuration found. Please configure at least one LLM provider."
    );
  }

  // Try each provider in order
  const openai = llmConfig.find((p) => p.name === "openai");
  if (openai?.api_key && openai.api_key.trim() !== "") {
    return new ChatOpenAI({
      apiKey: openai.api_key,
      model: openai.value || "gpt-3.5-turbo",
      temperature: 0.7,
    });
  }

  const google = llmConfig.find((p) => p.name === "google");
  if (google?.api_key && google.api_key.trim() !== "") {
    return new ChatGoogleGenerativeAI({
      apiKey: google.api_key,
      model: google.value || "gemini-pro",
      temperature: 0.7,
    });
  }

  const anthropic = llmConfig.find((p) => p.name === "anthropic");
  if (anthropic?.api_key && anthropic.api_key.trim() !== "") {
    return new ChatAnthropic({
      apiKey: anthropic.api_key,
      model: "claude-3-5-sonnet-20241022",
      temperature: 0.7,
    });
  }

  const xai = llmConfig.find((p) => p.name === "xai");
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

  const provider = llmConfig.find((p) => p.name === providerName);

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
export function getAvailableProviders(): string[] {
  const { getLlmConfig } = useConfig();
  const llmConfig = getLlmConfig();

  if (!llmConfig) return [];

  return llmConfig
    .filter((provider) => provider.api_key && provider.api_key.trim() !== "")
    .map((provider) => provider.name);
}
