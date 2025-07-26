import fs from "fs/promises";
import path from "path";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { BaseChatMessageHistory } from "@langchain/core/chat_history";

interface Message {
  index: string;
  timestamp: string;
  message: string;
  is_ai: boolean;
}

interface ChatHistory {
  sessions: Record<string, Message[]>;
}

export class LocalChatMessageHistory extends BaseChatMessageHistory {
  private readonly filePath: string;

  constructor(filePath: string = "./chat_history.json") {
    super();
    this.filePath = path.resolve(filePath);
    this.initializeFile();
  }

  private initializeFile(): void {
    try {
      fs.accessSync(this.filePath);
    } catch {
      const initialData: ChatHistory = { sessions: {} };
      fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2));
    }
  }

  async getMessages(sessionId: string): Promise<BaseMessage[]> {
    const data = await fs.readFile(this.filePath, "utf-8");
    const history: ChatHistory = JSON.parse(data);
    const sessionMessages = history.sessions[sessionId] ?? [];

    return sessionMessages.map((msg) => {
      const messageContent = msg.message;
      return msg.is_ai
        ? new AIMessage(messageContent)
        : new HumanMessage(messageContent);
    });
  }

  async addMessage(message: BaseMessage, sessionId: string): Promise<void> {
    const data = await fs.readFile(this.filePath, "utf-8");
    const history: ChatHistory = JSON.parse(data);

    if (!history.sessions[sessionId]) {
      history.sessions[sessionId] = [];
    }

    const index = history.sessions[sessionId].length.toString();
    const timestamp = new Date().toISOString();
    history.sessions[sessionId].push({
      index,
      timestamp,
      message: message.content as string,
      is_ai: message instanceof AIMessage,
    });

    await fs.writeFile(this.filePath, JSON.stringify(history, null, 2));
  }

  async addUserMessage(message: string, sessionId: string): Promise<void> {
    await this.addMessage(new HumanMessage(message), sessionId);
  }

  async addAIChatMessage(message: string, sessionId: string): Promise<void> {
    await this.addMessage(new AIMessage(message), sessionId);
  }

  async clear(): Promise<void> {
    const initialData: ChatHistory = { sessions: {} };
    await fs.writeFile(this.filePath, JSON.stringify(initialData, null, 2));
  }

  async clearSession(sessionId: string): Promise<void> {
    const data = await fs.readFile(this.filePath, "utf-8");
    const history: ChatHistory = JSON.parse(data);

    if (history.sessions[sessionId]) {
      delete history.sessions[sessionId];
      await fs.writeFile(this.filePath, JSON.stringify(history, null, 2));
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.clearSession(sessionId);
  }

  get lc_namespace(): string[] {
    return ["langchain", "chat_history"];
  }
}
