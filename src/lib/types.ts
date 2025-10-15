export type Project = {
  name: string;
  path: string;
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
