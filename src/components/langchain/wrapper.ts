import { getLLM, getVectorStore, getEmbeddings } from "./connections";
import { chatWithPapers } from "./chatwithpapers";
import { findSimilarArxivPapers } from "./similar papers";
import { indexPapers } from "./indexpapers";
import { runPromptOnPaper } from "./runpromptsonpaper";
import { LocalChatMessageHistory } from "./local_history";

class GenAI {
  sessions: string[];
  llm: any;
  embedding: any;
  vectorStore: Promise<any>;
  private history: LocalChatMessageHistory;

  llmConfig = {
    llmProvider: "openai",
    modelName: "gpt-4",
    api_key: process.env.OPENAI_API_KEY || "",
    temperature: 0.7,
  };

  embeddingConfig = {
    embeddingProvider: "openai",
    modelName: "text-embedding-ada-002",
    api_key: process.env.OPENAI_API_KEY || "",
  };

  vectorStoreConfig = {
    vectorStoreType: "faiss",
    faissIndexPath: "./faiss_index",
  };

  constructor(
    config: Partial<{
      llmProvider: string;
      llmModelName: string;
      llmApiKey: string;
      llmTemperature: number;
      embeddingProvider: string;
      embeddingModelName: string;
      embeddingApiKey: string;
      vectorStoreType: string;
      faissIndexPath: string;
      historyFilePath: string;
    }>
  ) {
    this.sessions = [];
    // Use environment variable or config for history file path, default to ./chat_history.json
    const historyFilePath =
      config.historyFilePath ||
      process.env.CHAT_HISTORY_PATH ||
      "./chat_history.json";
    this.history = new LocalChatMessageHistory(historyFilePath);

    // Merge provided config with defaults
    this.llmConfig = {
      ...this.llmConfig,
      llmProvider: config.llmProvider || this.llmConfig.llmProvider,
      modelName: config.llmModelName || this.llmConfig.modelName,
      api_key: config.llmApiKey || this.llmConfig.api_key,
      temperature: config.llmTemperature || this.llmConfig.temperature,
    };

    this.embeddingConfig = {
      ...this.embeddingConfig,
      embeddingProvider:
        config.embeddingProvider || this.embeddingConfig.embeddingProvider,
      modelName: config.embeddingModelName || this.embeddingConfig.modelName,
      api_key: config.embeddingApiKey || this.embeddingConfig.api_key,
    };

    this.vectorStoreConfig = {
      ...this.vectorStoreConfig,
      vectorStoreType:
        config.vectorStoreType || this.vectorStoreConfig.vectorStoreType,
      faissIndexPath:
        config.faissIndexPath || this.vectorStoreConfig.faissIndexPath,
    };

    // Validate environment variables
    if (!this.llmConfig.api_key) {
      throw new Error("OPENAI_API_KEY environment variable is not set.");
    }

    // Initialize components
    this.llm = getLLM(this.llmConfig);
    this.embedding = getEmbeddings(this.embeddingConfig);
    this.vectorStore = getVectorStore(
      this.vectorStoreConfig,
      this.embeddingConfig
    );
  }

  async query(question: string): Promise<string> {
    const sessionId = this.createNewSession();
    try {
      const response = await chatWithPapers({ question, sessionId });
      return response;
    } catch (error) {
      console.error("Query error:", error);
      return "Error processing query. Please try again.";
    }
  }

  async prepareFileViewer(filePath: string): Promise<void> {
    try {
      const vectorStore = await this.vectorStore;
      const docs = await vectorStore.similaritySearch("", 1);

      if (!docs.length) {
        console.log(`Indexing documents from ${filePath}...`);
        await indexPapers();
      } else {
        console.log("Knowledge base already populated.");
      }
    } catch (error) {
      console.error("Error preparing file viewer:", error);
      throw new Error("Failed to prepare file viewer.");
    }
  }

  async recommendPapers(paperName: string): Promise<void> {
    try {
      await findSimilarArxivPapers(paperName, 5, false);
    } catch (error) {
      console.error("Error recommending papers:", error);
      throw new Error(`Failed to find similar papers for: ${paperName}`);
    }
  }

  createNewSession(): string {
    const sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    this.sessions.push(sessionId);
    return sessionId;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const index = this.sessions.indexOf(sessionId);
    if (index !== -1) {
      this.sessions.splice(index, 1);
      await this.history.deleteSession(sessionId);
      return true;
    }
    return false;
  }

  async resetSession(sessionId: string): Promise<boolean> {
    if (!this.sessions.includes(sessionId)) {
      return false;
    }
    try {
      await this.history.clearSession(sessionId);
      return true;
    } catch (error) {
      console.error("Error resetting session:", error);
      return false;
    }
  }

  async changeModel(modelName: string): Promise<void> {
    try {
      this.llmConfig.modelName = modelName;
      this.llm = getLLM(this.llmConfig);
      console.log(`Model changed to: ${modelName}`);
    } catch (error) {
      console.error("Error changing model:", error);
      throw new Error(`Failed to change model to: ${modelName}`);
    }
  }
}

export default GenAI;
