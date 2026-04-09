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
  useCallback,
  useMemo,
} from "react";

export type { ChatMessage, ChatSessionMetadata, ChatSession, Chats };

// ─── Config Context ────────────────────────────────────────────────────────────

interface ConfigContextType {
  config: Config | null;
  loading: boolean;
  reloadConfig: () => Promise<void>;

  getFullConfig: () => Config | null;
  getBasicConfig: () => Config["basicConfig"] | null;
  getKnowledgeStoreConfig: () => Config["knowledgeStoreConfig"] | null;
  getTabsConfig: () => Config["tabsConfig"] | null;
  getActiveTabsConfig: () => Tab[] | null;
  getLlmConfig: () => Config["llmConfig"] | null;
  getTodos: () => Config["todos"] | null;

  updateConfig: (newConfig: Config) => void;
  updateBasicConfig: (basicConfig: Config["basicConfig"]) => void;
  updateKnowledgeStoreConfig: (
    knowledgeStoreConfig: Config["knowledgeStoreConfig"],
  ) => void;
  updateTabsConfig: (tabsConfig: Config["tabsConfig"]) => void;
  updateLlmConfig: (llmConfig: Config["llmConfig"]) => void;
  updateTodos: (todos: Config["todos"]) => void;
}

// ─── Chats Context ─────────────────────────────────────────────────────────────

interface ChatsContextType {
  chats: Chats | null;
  chatsLoading: boolean;
  reloadChats: () => Promise<void>;

  sessions: ChatSession[];

  getChats: () => Chats | null;
  getChatSessions: () => ChatSession[] | null;
  getChatSession: (name: string) => ChatSession | null;

  updateChats: (chats: Chats) => void;
  addChatSession: (session: ChatSession) => void;
  updateChatSession: (name: string, session: ChatSession) => void;
  removeChatSession: (name: string) => void;
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

const ConfigContext = createContext<ConfigContextType | null>(null);
const ChatsContext = createContext<ChatsContextType | null>(null);

// ─── usePersistedJson ─────────────────────────────────────────────────────────
//
// Tracks whether the current `value` came from a disk-load or from a user
// edit by stamping each loaded value with a monotonically-increasing
// `loadGen` counter.  The save effect only runs when the value's stamp does
// NOT match the latest load generation, meaning the value changed due to an
// edit, not a load — eliminating the unreliable isFromLoadRef boolean.

interface Stamped<T> {
  data: T;
  gen: number; // which load generation produced this value
}

function usePersistedJson<T>(
  path: string | null,
  label: string,
): {
  value: T | null;
  loading: boolean;
  reload: () => Promise<void>;
  setValue: (updater: T | ((prev: T | null) => T | null)) => void;
} {
  // gen that was last loaded from disk
  const loadGenRef = useRef(0);

  const [stamped, setStamped] = useState<Stamped<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    if (!path) {
      setStamped(null);
      return;
    }

    // Increment load generation so any in-flight previous load is ignored
    loadGenRef.current += 1;
    const thisGen = loadGenRef.current;

    setLoading(true);

    try {
      const result = await getConfig(path);
      if (!mountedRef.current || thisGen !== loadGenRef.current) return;

      // Stamp the loaded value with thisGen so the save effect can detect it
      setStamped({ data: result as unknown as T, gen: thisGen });
      info(`✅ ${label} loaded, ${path}`);
    } catch (err) {
      if (!mountedRef.current || thisGen !== loadGenRef.current) return;
      error(`Failed to load ${label}: ${err}`);
      setStamped(null);
    } finally {
      if (mountedRef.current && thisGen === loadGenRef.current) {
        setLoading(false);
      }
    }
  }, [path, label]);

  // Reload whenever path changes
  useEffect(() => {
    if (path) {
      reload();
    } else {
      loadGenRef.current += 1; // invalidate any in-flight load
      setStamped(null);
      setLoading(false);
    }
  }, [path, reload]);

  // Save to disk only when the stamped value came from an edit (gen mismatch)
  useEffect(() => {
    if (!path || !stamped) return;

    // If this value was produced by the most recent load, don't save it back
    if (stamped.gen === loadGenRef.current) return;

    saveConfig(path, stamped.data as unknown as Config).catch((err) => {
      error(`Failed to save ${label}: ${err}`);
    });
  }, [stamped, path, label]);

  // Expose a stable setter that keeps the gen as "edit" (0, never matching loadGenRef)
  const setValue = useCallback(
    (updater: T | ((prev: T | null) => T | null)) => {
      setStamped((prev) => {
        const prevData = prev?.data ?? null;
        const nextData =
          typeof updater === "function"
            ? (updater as (prev: T | null) => T | null)(prevData)
            : updater;
        if (nextData === null) return null;
        // gen: -1 ensures it never equals loadGenRef.current (which starts at 0
        // and only increments), so the save effect will always fire for edits.
        return { data: nextData, gen: -1 };
      });
    },
    [],
  );

  const value = stamped?.data ?? null;

  return { value, loading, reload, setValue };
}

// ─── ConfigProvider ───────────────────────────────────────────────────────────

export const ConfigProvider = ({
  config_path,
  children,
}: {
  config_path: string | null;
  children: React.ReactNode;
}) => {
  const {
    value: config,
    loading,
    reload: reloadConfig,
    setValue: setConfig,
  } = usePersistedJson<Config>(config_path, "Config");

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getFullConfig = useCallback((): Config | null => config, [config]);

  const getBasicConfig = useCallback(
    (): Config["basicConfig"] | null => config?.basicConfig ?? null,
    [config],
  );

  const getKnowledgeStoreConfig = useCallback(
    (): Config["knowledgeStoreConfig"] | null =>
      config?.knowledgeStoreConfig ?? null,
    [config],
  );

  const getTabsConfig = useCallback(
    (): Config["tabsConfig"] | null => config?.tabsConfig ?? null,
    [config],
  );

  const getActiveTabsConfig = useCallback(
    (): Tab[] | null =>
      config?.tabsConfig?.tabs.filter((tab) => tab.enabled) ?? null,
    [config],
  );

  const getLlmConfig = useCallback(
    (): Config["llmConfig"] | null => config?.llmConfig ?? null,
    [config],
  );

  const getTodos = useCallback(
    (): Config["todos"] | null => config?.todos ?? null,
    [config],
  );

  const updateConfig = useCallback(
    (newConfig: Config) => setConfig(newConfig),
    [setConfig],
  );

  const updateBasicConfig = useCallback(
    (basicConfig: Config["basicConfig"]) =>
      setConfig((prev) => (prev ? { ...prev, basicConfig } : prev)),
    [setConfig],
  );

  const updateKnowledgeStoreConfig = useCallback(
    (knowledgeStoreConfig: Config["knowledgeStoreConfig"]) =>
      setConfig((prev) => (prev ? { ...prev, knowledgeStoreConfig } : prev)),
    [setConfig],
  );

  const updateTabsConfig = useCallback(
    (tabsConfig: Config["tabsConfig"]) =>
      setConfig((prev) => (prev ? { ...prev, tabsConfig } : prev)),
    [setConfig],
  );

  const updateLlmConfig = useCallback(
    (llmConfig: Config["llmConfig"]) =>
      setConfig((prev) => (prev ? { ...prev, llmConfig } : prev)),
    [setConfig],
  );

  const updateTodos = useCallback(
    (todos: Config["todos"]) =>
      setConfig((prev) => (prev ? { ...prev, todos } : prev)),
    [setConfig],
  );

  const contextValue = useMemo<ConfigContextType>(
    () => ({
      config,
      loading,
      reloadConfig,
      getFullConfig,
      getBasicConfig,
      getKnowledgeStoreConfig,
      getTabsConfig,
      getActiveTabsConfig,
      getLlmConfig,
      getTodos,
      updateConfig,
      updateBasicConfig,
      updateKnowledgeStoreConfig,
      updateTabsConfig,
      updateLlmConfig,
      updateTodos,
    }),
    [
      config,
      loading,
      reloadConfig,
      getFullConfig,
      getBasicConfig,
      getKnowledgeStoreConfig,
      getTabsConfig,
      getActiveTabsConfig,
      getLlmConfig,
      getTodos,
      updateConfig,
      updateBasicConfig,
      updateKnowledgeStoreConfig,
      updateTabsConfig,
      updateLlmConfig,
      updateTodos,
    ],
  );

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};

// ─── ChatsProvider ────────────────────────────────────────────────────────────

export const ChatsProvider = ({
  chats_path,
  children,
}: {
  chats_path: string | null;
  children: React.ReactNode;
}) => {
  const {
    value: chats,
    loading: chatsLoading,
    reload: reloadChats,
    setValue: setChats,
  } = usePersistedJson<Chats>(chats_path, "Chats");

  const sessions = useMemo<ChatSession[]>(
    () => chats?.sessions?.sessions ?? [],
    [chats],
  );

  const getChats = useCallback((): Chats | null => chats, [chats]);

  const getChatSessions = useCallback(
    (): ChatSession[] | null => chats?.sessions?.sessions ?? null,
    [chats],
  );

  const getChatSession = useCallback(
    (name: string): ChatSession | null =>
      chats?.sessions?.sessions.find((s) => s.name === name) ?? null,
    [chats],
  );

  const updateChats = useCallback(
    (newChats: Chats) => setChats(newChats),
    [setChats],
  );

  const addChatSession = useCallback(
    (session: ChatSession) => {
      setChats((prev) => {
        if (!prev) return prev;
        return {
          sessions: {
            sessions: [...prev.sessions.sessions, session],
          },
        };
      });
    },
    [setChats],
  );

  const updateChatSession = useCallback(
    (name: string, updated: ChatSession) => {
      setChats((prev) => {
        if (!prev) return prev;

        const index = prev.sessions.sessions.findIndex((s) => s.name === name);
        if (index === -1) {
          error(
            `updateChatSession: session "${name}" not found — no update applied`,
          );
          return prev;
        }

        const sessions = [...prev.sessions.sessions];
        sessions[index] = updated;
        return { sessions: { sessions } };
      });
    },
    [setChats],
  );

  const removeChatSession = useCallback(
    (name: string) => {
      setChats((prev) => {
        if (!prev) return prev;
        return {
          sessions: {
            sessions: prev.sessions.sessions.filter((s) => s.name !== name),
          },
        };
      });
    },
    [setChats],
  );

  const contextValue = useMemo<ChatsContextType>(
    () => ({
      chats,
      chatsLoading,
      reloadChats,
      sessions,
      getChats,
      getChatSessions,
      getChatSession,
      updateChats,
      addChatSession,
      updateChatSession,
      removeChatSession,
    }),
    [
      chats,
      chatsLoading,
      reloadChats,
      sessions,
      getChats,
      getChatSessions,
      getChatSession,
      updateChats,
      addChatSession,
      updateChatSession,
      removeChatSession,
    ],
  );

  return (
    <ChatsContext.Provider value={contextValue}>
      {children}
    </ChatsContext.Provider>
  );
};

// ─── Combined provider (convenience wrapper) ──────────────────────────────────

export const AppConfigProvider = ({
  config_path,
  chats_path,
  children,
}: {
  config_path: string | null;
  chats_path: string | null;
  children: React.ReactNode;
}) => (
  <ConfigProvider config_path={config_path}>
    <ChatsProvider chats_path={chats_path}>{children}</ChatsProvider>
  </ConfigProvider>
);

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used inside a ConfigProvider");
  }
  return context;
};

export const useChats = (): ChatsContextType => {
  const context = useContext(ChatsContext);
  if (!context) {
    throw new Error("useChats must be used inside a ChatsProvider");
  }
  return context;
};
