import { getConfig } from "@/lib/backend";
import React, { createContext, useEffect, useState, useContext } from "react";
import { Config } from "@/lib/interfaces";

interface ConfigContextType {
  config: Config | null;
  setConfig: (config: Config) => void;
  reloadConfig: () => Promise<void>;
  loading: boolean;
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

  const [loading, setLoading] = useState(true);

  const reloadConfig = async () => {
    setLoading(true);
    try {
      const result = await getConfig(configPath);
      setConfig(result);
    } catch (error) {
      console.error("Failed to load config:", error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadConfig();
  }, [configPath]); // re-run when project changes

  return (
    <ConfigContext.Provider
      value={{ config, setConfig, reloadConfig, loading }}
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
