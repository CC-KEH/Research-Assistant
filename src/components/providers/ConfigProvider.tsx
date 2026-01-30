import { Config } from "@/lib/types";
import { getConfig } from "@/lib/backend";
import { error, info } from "@/lib/logger";
import React, { createContext, useEffect, useState, useContext } from "react";

interface ConfigContextType {
  config: Config | null;
  setConfig: (config: Config) => void;
  reloadConfig: () => Promise<void>;
  loading: boolean;

  // Explicit return types for helper functions
  getFullConfig: () => Config | null;
  getBasicConfig: () => Config["basicConfig"] | null;
  getBookmarks: () => Config["bookmarks"] | null;
  getKnowledgeStoreConfig: () => Config["knowledgeStoreConfig"] | null;
  getTabsConfig: () => Config["tabsConfig"] | null;
  getLlmConfig: () => Config["llmConfig"] | null;
  getEmbeddingsConfig: () => Config["embeddingsConfig"] | null;
  getVectorStoreConfig: () => Config["vectorStoreConfig"] | null;
  getAIConfig: () => Config["aiConfig"] | null;
  getTodos: () => Config["todos"] | null;

  updateConfig: (newConfig: Config) => void;
  updateBasicConfig: (basicConfig: Config["basicConfig"]) => void;
  updateBookmarks: (bookmarks: Config["bookmarks"]) => void;
  updateKnowledgeStoreConfig: (
    knowledgeStoreConfig: Config["knowledgeStoreConfig"],
  ) => void;
  updateTabsConfig: (tabsConfig: Config["tabsConfig"]) => void;
  updateLlmConfig: (llmConfig: Config["llmConfig"]) => void;
  updateEmbeddingsConfig: (
    embeddingsConfig: Config["embeddingsConfig"],
  ) => void;
  updateVectorStoreConfig: (
    vectorStoreConfig: Config["vectorStoreConfig"],
  ) => void;
  updateAIConfig: (aiConfig: Config["aiConfig"]) => void;
  updateTodos: (todos: Config["todos"]) => void;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ConfigProvider = ({
  config_path,
  children,
}: {
  config_path: string | null;
  children: React.ReactNode;
}) => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);

  const reloadConfig = async () => {
    if (!config_path) {
      setConfig(null);
      return;
    }

    setLoading(true);
    try {
      const result = await getConfig(config_path);
      setConfig(result);
      info(`✅ Config loaded, ${config_path}`);
    } catch (err) {
      error(`Failed to load config: ${err}`);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions with explicit return types

  const getFullConfig = (): Config | null => {
    return config;
  };

  const getBasicConfig = (): Config["basicConfig"] | null => {
    return config?.basicConfig || null;
  };

  const getBookmarks = (): Config["bookmarks"] | null => {
    return config?.bookmarks || null;
  };

  const getKnowledgeStoreConfig = (): Config["knowledgeStoreConfig"] | null => {
    return config?.knowledgeStoreConfig || null;
  };

  const getTabsConfig = (): Config["tabsConfig"] | null => {
    return config?.tabsConfig || null;
  };

  const getLlmConfig = (): Config["llmConfig"] | null => {
    return config?.llmConfig || null;
  };

  const getEmbeddingsConfig = (): Config["embeddingsConfig"] | null => {
    return config?.embeddingsConfig || null;
  };

  const getVectorStoreConfig = (): Config["vectorStoreConfig"] | null => {
    return config?.vectorStoreConfig || null;
  };

  const getAIConfig = (): Config["aiConfig"] | null => {
    return config?.aiConfig || null;
  };

  const getTodos = (): Config["todos"] | null => {
    return config?.todos || null;
  };

  const updateConfig = (newConfig: Config) => {
    setConfig(newConfig);
  };

  const updateBasicConfig = (basicConfig: Config["basicConfig"]) => {
    if (config) {
      setConfig({ ...config, basicConfig });
    }
  };

  const updateBookmarks = (bookmarks: Config["bookmarks"]) => {
    if (config) {
      setConfig({ ...config, bookmarks });
    }
  };

  const updateKnowledgeStoreConfig = (
    knowledgeStoreConfig: Config["knowledgeStoreConfig"],
  ) => {
    if (config) {
      setConfig({ ...config, knowledgeStoreConfig });
    }
  };

  const updateTabsConfig = (tabsConfig: Config["tabsConfig"]) => {
    if (config) {
      setConfig({ ...config, tabsConfig });
    }
  };

  const updateLlmConfig = (llmConfig: Config["llmConfig"]) => {
    if (config) {
      setConfig({ ...config, llmConfig });
    }
  };

  const updateEmbeddingsConfig = (
    embeddingsConfig: Config["embeddingsConfig"],
  ) => {
    if (config) {
      setConfig({ ...config, embeddingsConfig });
    }
  };

  const updateVectorStoreConfig = (
    vectorStoreConfig: Config["vectorStoreConfig"],
  ) => {
    if (config) {
      setConfig({ ...config, vectorStoreConfig });
    }
  };

  const updateAIConfig = (aiConfig: Config["aiConfig"]) => {
    if (config) {
      setConfig({ ...config, aiConfig });
    }
  };

  const updateTodos = (todos: Config["todos"]) => {
    if (config) {
      setConfig({ ...config, todos });
    }
  };

  useEffect(() => {
    if (config_path) {
      reloadConfig();
    } else {
      setConfig(null);
    }
  }, [config_path]);

  return (
    <ConfigContext.Provider
      value={{
        config,
        setConfig,
        reloadConfig,
        loading,
        getFullConfig,
        getBasicConfig,
        getBookmarks,
        getKnowledgeStoreConfig,
        getTabsConfig,
        getLlmConfig,
        getEmbeddingsConfig,
        getVectorStoreConfig,
        getAIConfig,
        getTodos,
        updateConfig,
        updateBasicConfig,
        updateBookmarks,
        updateKnowledgeStoreConfig,
        updateTabsConfig,
        updateLlmConfig,
        updateEmbeddingsConfig,
        updateVectorStoreConfig,
        updateAIConfig,
        updateTodos,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used inside a ConfigProvider");
  }
  return context;
};
