export type Project = {
  projectName: string;
  projectPath: string;
};

export type TreeNode = {
  id: string;
  label: string;
  nodeType?: "file" | "folder";
  children?: TreeNode[];
};

export type Paper = {
  id: string;
  name: string;
  type: string;
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
  resourcesPath: string;
}

export interface Bookmark {
  fileName: string;
  filePath: string;
  pageNo: string;
}

export interface KnowledgeFile {
  fileName: string;
  filePath: string;
  feedLlm: string;
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
// /lib/types.ts
export interface FileInfo {
  name: string;
  type: string;
  path: string;
  id: string;
}
