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
  enabled: boolean;
  prompt?: string;
}

export interface LlmProvider {
  name: string;
  label: string;
  value: string;
  api_key: string;
}

export interface AIConfig {
  activeLlm: string;
  temperature: number;
  maxTokens: number;
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

export interface Todo {
  id: number;
  title: string;
  priority: string;
  date: string;
  time: string;
  completed: boolean;
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
  aiConfig: AIConfig;
  todos: Todo[];
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
