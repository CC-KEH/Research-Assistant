import { getConfig } from "@/lib/backend";
import React, { createContext, useEffect, useState, useContext } from "react";

interface Config {
  project_name: string;
  project_path: string;
  config_path: string;
  knowledge_store_path: string;
  llms: Record<string, string>;
  embeddings: Record<string, string>;
  vectorstores: Record<string, string>;
}

interface ConfigContextType {
  config: Config | null;
  setConfig: (config: Config) => void;
  reloadConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ConfigProvider = ({
  configPath,
  children,
}: {
  configPath: string;
  children: React.ReactNode;
}) => {
  const [config, setConfig] = useState<Config | null>(null);

  const reloadConfig = async () => {
    try {
      const result = await getConfig(configPath);
      setConfig(result);
    } catch (error) {
      console.error("Failed to load config:", error);
      setConfig(null);
    }
  };

  useEffect(() => {
    reloadConfig();
  }, [configPath]); // re-run when project changes

  return (
    <ConfigContext.Provider value={{ config, setConfig, reloadConfig }}>
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
