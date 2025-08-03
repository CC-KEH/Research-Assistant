export type Project = {
  name: string;
  path: string;
};

export type Paper = {
  id: string;
  name: string;
  type: string;
};

export enum tabType {
  libraryTab,
  fileManagerTab,
  assistantTab,
}

export enum fileManagerTab {
  fileViewerTab,
  paperViewerTab,
  markdownViewerTab,
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
