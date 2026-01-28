export type Project = {
  projectName: string;
  projectPath: string;
};

export type TreeNode = {
  id: string;
  icon: string;
  label: string;
  path: string;
  nodeType?: "file" | "folder";
  children?: TreeNode[];
};

export interface Tab {
  id: string;
  label: string;
  prompt?: string;
}

export interface LlmProvider {
  name: string;
  label: string;
  value: string;
  api_key: string;
}

export interface EmbeddingProvider {
  name: string;
  label: string;
  value: string;
  api_key: string;
}

export interface VectorStoreProvider {
  name: string;
  label: string;
  value: string;
  api_key: string;
}

export interface AIConfig {
  activeLlm: string;
  activeEmbeddings: string;
  activeVectorStore: string;
  chatPrompt: string;
}

export interface BasicConfig {
  projectName: string;
  projectPath: string;
}

export interface Bookmark {
  fileName: string;
  filePath: string;
  pageNo: string;
}

export interface KnowledgeFile {
  fileName: string;
  filePath: string;
  fileType: string;
  feedLlm: boolean;
  isProcessed: boolean;
  fileData: {
    summary: "";
    criticalAnalysis: "";
    contributions: "";
    futureWork: "";
    arxiv: [];
  };
}

export interface Config {
  basicConfig: BasicConfig[];
  bookmarks: Bookmark[];
  knowledgeStoreConfig: {
    files: KnowledgeFile[];
  };
  tabsConfig: {
    tabs: Tab[];
    customTabs: Tab[];
  };
  llmConfig: LlmProvider[];
  embeddingsConfig: EmbeddingProvider[];
  vectorStoreConfig: VectorStoreProvider[];
  aiConfig: AIConfig[];
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
  name: string;
  path: string;
  type: string;
}
