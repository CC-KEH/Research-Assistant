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
  label: string;
  modelName: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  chatPrompt: string;
}

export interface BasicConfig {
  projectName: string;
  projectPath: string;
  activeLlm: string;
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
  basicConfig: BasicConfig;
  bookmarks: Bookmark[];
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
