export interface Config {
  basicConfig: {
    project_name: string;
    project_path: string;
    resoures_path: string;
  }[];
  bookmarks: {
    file_name: string;
    page_no: string;
  }[];
  knowledgeStoreConfig: {
    files: {
      file_name: string;
      file_path: string;
      feed_llm: string;
    }[];
  };
  tabsConfig: {
    tabs: {
      id: string;
      label: string;
      prompt: string;
    }[];
    customTabs: {
      id: string;
      label: string;
      prompt: string;
    }[];
  };

  llmConfig: {
    name: string;
    label: string;
    value: string;
    api_key: string;
    temperature: string;
  };

  embeddingsConfig: {
    name: string;
    label: string;
    value: string;
    api_key: string;
  };
  vectorStoreConfig: {
    name: string;
    label: string;
    value: string;
    api_key: string;
  };
}
