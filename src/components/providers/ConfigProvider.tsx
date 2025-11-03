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
    } catch (error) {
      console.error("Failed to load config:", error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
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
