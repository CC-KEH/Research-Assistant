import { Config, Tab } from "@/lib/types";
import { getConfig, saveConfig } from "@/lib/backend";
import { error, info } from "@/lib/logger";
import React, {
  createContext,
  useEffect,
  useState,
  useContext,
  useRef,
} from "react";

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
  getActiveTabsConfig: () => Tab[] | null;
  getLlmConfig: () => Config["llmConfig"] | null;
  getTodos: () => Config["todos"] | null;

  updateConfig: (newConfig: Config) => void;
  updateBasicConfig: (basicConfig: Config["basicConfig"]) => void;
  updateBookmarks: (bookmarks: Config["bookmarks"]) => void;
  updateKnowledgeStoreConfig: (
    knowledgeStoreConfig: Config["knowledgeStoreConfig"],
  ) => void;
  updateTabsConfig: (tabsConfig: Config["tabsConfig"]) => void;
  updateLlmConfig: (llmConfig: Config["llmConfig"]) => void;
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
  // Tracks whether the current config state was just loaded from disk.
  // If true, the save effect will skip saving (and reloading) to prevent
  // an infinite load → save → reload loop.
  const isLoadingRef = useRef(false);

  const reloadConfig = async () => {
    if (!config_path) {
      setConfig(null);
      return;
    }

    setLoading(true);
    isLoadingRef.current = true; // Mark: next config change comes from a load
    try {
      const result = await getConfig(config_path);
      setConfig(result);
      info(`✅ Config loaded, ${config_path}`);
    } catch (err) {
      error(`Failed to load config: ${err}`);
      setConfig(null);
    } finally {
      setLoading(false);
      // isLoadingRef is cleared inside the save effect after it skips once
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

  const getActiveTabsConfig = (): Tab[] | null => {
    return config?.tabsConfig?.tabs.filter((tab) => tab.enabled) || null;
  };

  const getLlmConfig = (): Config["llmConfig"] | null => {
    return config?.llmConfig || null;
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

  const updateTodos = (todos: Config["todos"]) => {
    if (config) {
      setConfig({ ...config, todos });
    }
  };

  // Reload config when config_path changes
  useEffect(() => {
    if (config_path) {
      reloadConfig();
    } else {
      setConfig(null);
    }
  }, [config_path]);

  // Save config to disk whenever it changes, then reload to stay in sync.
  // Skip the save+reload cycle when the change itself came from a load
  // (isLoadingRef=true), which would otherwise cause an infinite loop.
  useEffect(() => {
    if (!config_path || !config) return;

    if (isLoadingRef.current) {
      // This state update was triggered by reloadConfig — skip saving
      isLoadingRef.current = false;
      return;
    }

    // User-driven change: save, then reload to confirm persisted state
    const saveAndReload = async () => {
      await saveConfig(config_path, config);
      await reloadConfig();
    };

    saveAndReload();
  }, [config, config_path]);

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
        getActiveTabsConfig,
        getLlmConfig,
        getTodos,
        updateConfig,
        updateBasicConfig,
        updateBookmarks,
        updateKnowledgeStoreConfig,
        updateTabsConfig,
        updateLlmConfig,
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
