// ---------------- Types related to config and settings ------------------ //

export interface Config {
  basicConfig: BasicConfig;
  knowledgeStoreConfig: {
    files: KnowledgeFile[];
  };
  tabsConfig: {
    tabs: Tab[];
    customTabs: Tab[];
  };
  llmConfig: Record<string, LlmProvider>;
  todos: Todo[];
  /** Canvas annotations per PDF file, keyed by absolute file path. */
  annotations?: Record<string, FileAnnotations>;
}

export type Project = {
  projectName: string;
  projectPath: string;
  activeLlmProvider: string;
};

export type TreeNode = {
  id: string;
  icon: string;
  label: string;
  path: string;
  nodeType?: "file" | "folder";
  children?: TreeNode[];
};

export interface LibraryProps {
  onFileSelect: (file: FileInfo) => void;
}

export type DialogType = "file" | "folder";

export interface Tab {
  id: string;
  label: string;
  enabled: boolean;
  prompt?: string;
}

export interface LlmProvider {
  label: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  chatPrompt: string;
}

export interface BasicConfig {
  projectName: string;
  projectPath: string;
  activeLlmProvider: string;
}

export interface KnowledgeFile {
  fileName: string;
  filePath: string;
  fileType: string;
  feedLlm: boolean;
  isProcessed: boolean;
  fileData: Record<string, string>;
}

export interface Arxiv {
  id: string;
  title: string;
  description: string;
  authors: string[];
  publishedDate: string;
  link: string;
}

export interface Todo {
  id: number;
  title: string;
  priority: string;
  date: string;
  time: string;
  completed: boolean;
}

export enum Item {
  directory,
  file,
}

export enum BugType {
  fileManager,
  fileViewer,
  assistant,
  enhancement,
}

export interface FileInfo {
  file_name: string;
  file_path: string;
  file_type: string;
}

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationPath {
  points: AnnotationPoint[];
  tool: "pen" | "highlight";
}

/** All canvas paths for a single PDF file, keyed by page number. */
export type PagePathsMap = Record<number, AnnotationPath[]>;

/** Stored under config.annotations[filePath] */
export interface FileAnnotations {
  pagePathsMap: PagePathsMap;
}

// ─── Chat Types ───────────────────────────────────────────────────────────────

export interface Chats {
  sessions: {
    sessions: ChatSession[];
  };
}

export interface SessionCreateResponse {
  message: string;
  session_index: number;
  session: ChatSession;
}

export interface ChatResponse {
  response: string;
  session_index: number;
  timestamp: string;
}

export interface ChatMessage {
  index: string;
  timestamp: string;
  message: string;
  is_ai: boolean;
}

export interface ChatSessionMetadata {
  created_at: string;
  last_updated: string;
  total_messages: number;
  tags: string[];
  context: string;
}

export interface ChatSession {
  name: string;
  history: ChatMessage[];
  metadata: ChatSessionMetadata;
}

// Assistant related types

export interface Message {
  id: number;
  content: string;
  sender: "user" | "ai" | "system";
  timestamp?: string;
}

export interface SessionInfo {
  index: number;
  name: string;
  total_messages?: number;
  last_updated?: string;
}

export interface AssistantProps {
  fileInfo: FileInfo | null;
}

export type InitializationPhase =
  | "idle"
  | "checking-server"
  | "initializing-backend"
  | "loading-session"
  | "complete"
  | "no-llm-configured"
  | "error";

export interface InitializationState {
  phase: InitializationPhase;
  message: string;
  error?: string;
}
