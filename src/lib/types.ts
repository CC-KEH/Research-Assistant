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
  fileViewerTab,
  assistantTab,
}
