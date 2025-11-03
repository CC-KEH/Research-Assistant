export type Project = {
  projectName: string;
  projectPath: string;
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

export interface BasicConfig {
  project_name: string;
  project_path: string;
  resoures_path: string;
}

export interface Bookmark {
  file_name: string;
  file_path: string;
  page_no: string;
}

export interface KnowledgeFile {
  file_name: string;
  file_path: string;
  feed_llm: string;
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
