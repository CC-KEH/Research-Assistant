import { ChatXAI } from "@langchain/xai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as fs from "fs";
import * as path from "path";

interface ModelConfig {
  model?: string;
  apiKey?: string;
  temperature?: number;
}

interface Config {
  xai?: ModelConfig;
  openai?: ModelConfig;
  deepseek?: ModelConfig;
  anthropic?: ModelConfig;
  google?: ModelConfig;
}

type ChatModel =
  | ChatXAI
  | ChatOpenAI
  | ChatDeepSeek
  | ChatAnthropic
  | ChatGoogleGenerativeAI;

/**
 * Creates a chat model instance based on available API keys in config.json
 * Priority order: XAI > OpenAI > DeepSeek > Anthropic > Google
 */
export function createModelFromConfig(
  configPath: string = "./config.json"
): ChatModel {
  const configFile = fs.readFileSync(path.resolve(configPath), "utf-8");
  const config: Config = JSON.parse(configFile);

  // Check for API keys in priority order and create corresponding model
  if (config.xai?.apiKey) {
    return new ChatXAI({
      apiKey: config.xai.apiKey,
      model: config.xai.model ?? "grok-beta",
      temperature: config.xai.temperature ?? 0.7,
    });
  }

  if (config.openai?.apiKey) {
    return new ChatOpenAI({
      apiKey: config.openai.apiKey,
      model: config.openai.model ?? "gpt-4-turbo-preview",
      temperature: config.openai.temperature ?? 0.7,
    });
  }

  if (config.deepseek?.apiKey) {
    return new ChatDeepSeek({
      apiKey: config.deepseek.apiKey,
      model: config.deepseek.model ?? "deepseek-chat",
      temperature: config.deepseek.temperature ?? 0.7,
    });
  }

  if (config.anthropic?.apiKey) {
    return new ChatAnthropic({
      apiKey: config.anthropic.apiKey,
      model: config.anthropic.model ?? "claude-3-5-sonnet-20241022",
      temperature: config.anthropic.temperature ?? 0.7,
    });
  }

  if (config.google?.apiKey) {
    return new ChatGoogleGenerativeAI({
      apiKey: config.google.apiKey,
      model: config.google.model ?? "gemini-pro",
      temperature: config.google.temperature ?? 0.7,
    });
  }

  throw new Error(
    "No valid API key found in config.json. Please provide at least one provider with an apiKey."
  );
}

/**
 * Alternative: Create model with explicit provider selection
 */
export function createModel(
  provider: "xai" | "openai" | "deepseek" | "anthropic" | "google",
  configPath: string = "./config.json"
): ChatModel {
  const configFile = fs.readFileSync(path.resolve(configPath), "utf-8");
  const config: Config = JSON.parse(configFile);

  switch (provider) {
    case "xai":
      if (!config.xai?.apiKey)
        throw new Error("XAI configuration or API key not found");
      return new ChatXAI({
        apiKey: config.xai.apiKey,
        model: config.xai.model ?? "grok-beta",
        temperature: config.xai.temperature ?? 0.7,
      });

    case "openai":
      if (!config.openai?.apiKey)
        throw new Error("OpenAI configuration or API key not found");
      return new ChatOpenAI({
        apiKey: config.openai.apiKey,
        model: config.openai.model ?? "gpt-4-turbo-preview",
        temperature: config.openai.temperature ?? 0.7,
      });

    case "deepseek":
      if (!config.deepseek?.apiKey)
        throw new Error("DeepSeek configuration or API key not found");
      return new ChatDeepSeek({
        apiKey: config.deepseek.apiKey,
        model: config.deepseek.model ?? "deepseek-chat",
        temperature: config.deepseek.temperature ?? 0.7,
      });

    case "anthropic":
      if (!config.anthropic?.apiKey)
        throw new Error("Anthropic configuration or API key not found");
      return new ChatAnthropic({
        apiKey: config.anthropic.apiKey,
        model: config.anthropic.model ?? "claude-3-5-sonnet-20241022",
        temperature: config.anthropic.temperature ?? 0.7,
      });

    case "google":
      if (!config.google?.apiKey)
        throw new Error("Google configuration or API key not found");
      return new ChatGoogleGenerativeAI({
        apiKey: config.google.apiKey,
        model: config.google.model ?? "gemini-pro",
        temperature: config.google.temperature ?? 0.7,
      });

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Usage example:
const model = createModelFromConfig(); // or createModel("openai");
const response = await model.invoke("Hello, how are you?");
console.log(response.content);
