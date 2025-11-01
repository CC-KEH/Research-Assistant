export type Project = {
  projectName: string;
  projectPath: string;
};
export type Paper = {
  id: string;
  name: string;
  type: string;
};

export type Tab = {
  id: string;
  label: string;
  prompt?: string;
};

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
