import { getConfig } from "@/lib/backend";
import { Config } from "@/lib/types";
import React, { createContext, useEffect, useState, useContext } from "react";
import { error } from "@/lib/logger";

interface ConfigContextType {
  config: Config | null;
  setConfig: (config: Config) => void;
  reloadConfig: () => Promise<void>;
  loading: boolean;

  // Explicit return types for helper functions
  getBasicConfig: () => Config["basicConfig"] | null;
  getBookmarks: () => Config["bookmarks"] | null;
  getKnowledgeStoreConfig: () => Config["knowledgeStoreConfig"] | null;
  getTabsConfig: () => Config["tabsConfig"] | null;
  getLlmConfig: () => Config["llmConfig"] | null;
  getEmbeddingsConfig: () => Config["embeddingsConfig"] | null;
  getVectorStoreConfig: () => Config["vectorStoreConfig"] | null;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ConfigProvider = ({
  configPath,
  children,
}: {
  configPath: string | null;
  children: React.ReactNode;
}) => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);

  const reloadConfig = async () => {
    if (!configPath) {
      setConfig(null);
      return;
    }

    setLoading(true);
    try {
      const result = await getConfig(configPath);
      setConfig(result);
    } catch (err) {
      error(`Failed to load config: ${err}`);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions with explicit return types
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

  useEffect(() => {
    if (configPath) {
      reloadConfig();
    } else {
      setConfig(null);
    }
  }, [configPath]);

  return (
    <ConfigContext.Provider
      value={{
        config,
        setConfig,
        reloadConfig,
        loading,
        getBasicConfig,
        getBookmarks,
        getKnowledgeStoreConfig,
        getTabsConfig,
        getLlmConfig,
        getEmbeddingsConfig,
        getVectorStoreConfig,
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
