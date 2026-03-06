import {
  Config,
  Tab,
  Chats,
  ChatSession,
  ChatSessionMetadata,
  ChatMessage,
} from "@/lib/types";
import { getConfig, saveConfig } from "@/lib/backend";
import { error, info } from "@/lib/logger";
import React, {
  createContext,
  useEffect,
  useState,
  useContext,
  useRef,
} from "react";
export type { ChatMessage, ChatSessionMetadata, ChatSession, Chats };

// ─── Context Type ─────────────────────────────────────────────────────────────

interface ConfigContextType {
  config: Config | null;
  setConfig: (config: Config) => void;
  reloadConfig: () => Promise<void>;
  loading: boolean;

  // Chats
  chats: Chats | null;
  chatsLoading: boolean;
  reloadChats: () => Promise<void>;
  getChats: () => Chats | null;
  getChatSessions: () => ChatSession[] | null;
  getChatSession: (name: string) => ChatSession | null;
  updateChats: (chats: Chats) => void;
  addChatSession: (session: ChatSession) => void;
  updateChatSession: (name: string, session: ChatSession) => void;
  removeChatSession: (name: string) => void;

  // Config helpers
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
  updateTodos: (todos: Config["todos"]) => void;
}

// ─── Context & Provider ───────────────────────────────────────────────────────

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ConfigProvider = ({
  config_path,
  chats_path,
  children,
}: {
  config_path: string | null;
  chats_path: string | null;
  children: React.ReactNode;
}) => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const isLoadingRef = useRef(false);

  const [chats, setChats] = useState<Chats | null>(null);
  const [chatsLoading, setChatsLoading] = useState(false);
  const isChatsLoadingRef = useRef(false);

  // ── Config load/save ────────────────────────────────────────────────────────

  const reloadConfig = async () => {
    if (!config_path) {
      setConfig(null);
      return;
    }
    setLoading(true);
    isLoadingRef.current = true;
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

  useEffect(() => {
    if (config_path) reloadConfig();
    else setConfig(null);
  }, [config_path]);

  useEffect(() => {
    if (!config_path || !config) return;
    if (isLoadingRef.current) {
      isLoadingRef.current = false;
      return;
    }
    const saveAndReload = async () => {
      await saveConfig(config_path, config);
      await reloadConfig();
    };
    saveAndReload();
  }, [config, config_path]);

  // ── Chats load/save ─────────────────────────────────────────────────────────

  const reloadChats = async () => {
    if (!chats_path) {
      setChats(null);
      return;
    }
    setChatsLoading(true);
    isChatsLoadingRef.current = true;
    try {
      const result = await getConfig(chats_path); // reuse getConfig — same JSON read
      setChats(result as unknown as Chats);
      info(`✅ Chats loaded, ${chats_path}`);
    } catch (err) {
      error(`Failed to load chats: ${err}`);
      setChats(null);
    } finally {
      setChatsLoading(false);
    }
  };

  useEffect(() => {
    if (chats_path) reloadChats();
    else setChats(null);
  }, [chats_path]);

  useEffect(() => {
    if (!chats_path || !chats) return;
    if (isChatsLoadingRef.current) {
      isChatsLoadingRef.current = false;
      return;
    }
    const saveAndReload = async () => {
      await saveConfig(chats_path, chats as unknown as Config);
      await reloadChats();
    };
    saveAndReload();
  }, [chats, chats_path]);

  // ── Chats helpers ───────────────────────────────────────────────────────────

  const getChats = (): Chats | null => chats;

  const getChatSessions = (): ChatSession[] | null =>
    chats?.sessions?.sessions ?? null;

  const getChatSession = (name: string): ChatSession | null =>
    chats?.sessions?.sessions.find((s) => s.name === name) ?? null;

  const updateChats = (newChats: Chats) => setChats(newChats);

  const addChatSession = (session: ChatSession) => {
    if (!chats) return;
    setChats({
      sessions: {
        sessions: [...chats.sessions.sessions, session],
      },
    });
  };

  const updateChatSession = (name: string, updated: ChatSession) => {
    if (!chats) return;
    setChats({
      sessions: {
        sessions: chats.sessions.sessions.map((s) =>
          s.name === name ? updated : s,
        ),
      },
    });
  };

  const removeChatSession = (name: string) => {
    if (!chats) return;
    setChats({
      sessions: {
        sessions: chats.sessions.sessions.filter((s) => s.name !== name),
      },
    });
  };

  // ── Config helpers ──────────────────────────────────────────────────────────

  const getFullConfig = (): Config | null => config;
  const getBasicConfig = (): Config["basicConfig"] | null =>
    config?.basicConfig ?? null;
  const getBookmarks = (): Config["bookmarks"] | null =>
    config?.bookmarks ?? null;
  const getKnowledgeStoreConfig = (): Config["knowledgeStoreConfig"] | null =>
    config?.knowledgeStoreConfig ?? null;
  const getTabsConfig = (): Config["tabsConfig"] | null =>
    config?.tabsConfig ?? null;
  const getActiveTabsConfig = (): Tab[] | null =>
    config?.tabsConfig?.tabs.filter((tab) => tab.enabled) ?? null;
  const getLlmConfig = (): Config["llmConfig"] | null =>
    config?.llmConfig ?? null;
  const getTodos = (): Config["todos"] | null => config?.todos ?? null;

  const updateConfig = (newConfig: Config) => setConfig(newConfig);
  const updateBasicConfig = (basicConfig: Config["basicConfig"]) => {
    if (config) setConfig({ ...config, basicConfig });
  };
  const updateBookmarks = (bookmarks: Config["bookmarks"]) => {
    if (config) setConfig({ ...config, bookmarks });
  };
  const updateKnowledgeStoreConfig = (
    knowledgeStoreConfig: Config["knowledgeStoreConfig"],
  ) => {
    if (config) setConfig({ ...config, knowledgeStoreConfig });
  };
  const updateTabsConfig = (tabsConfig: Config["tabsConfig"]) => {
    if (config) setConfig({ ...config, tabsConfig });
  };
  const updateLlmConfig = (llmConfig: Config["llmConfig"]) => {
    if (config) setConfig({ ...config, llmConfig });
  };
  const updateTodos = (todos: Config["todos"]) => {
    if (config) setConfig({ ...config, todos });
  };

  // ── Provider ────────────────────────────────────────────────────────────────

  return (
    <ConfigContext.Provider
      value={{
        config,
        setConfig,
        reloadConfig,
        loading,

        chats,
        chatsLoading,
        reloadChats,
        getChats,
        getChatSessions,
        getChatSession,
        updateChats,
        addChatSession,
        updateChatSession,
        removeChatSession,

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
