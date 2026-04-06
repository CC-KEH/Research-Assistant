import {
  useState,
  FormEvent,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  CornerDownLeft,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { join } from "@tauri-apps/api/path";
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { ChatInput } from "@/components/ui/chat-input";
import { useAnimatedText } from "@/components/ui/animated-text";
import type {
  ChatSession,
  Message,
  SessionInfo,
  AssistantProps,
  InitializationState,
  InitializationPhase,
  KnowledgeFile,
} from "@/lib/types";
import {
  initializePythonBackend,
  createSession,
  getAllSessions,
  getSessionHistory,
  switchSession,
  sendChatMessage,
  switchLLM,
  checkPythonServer,
  deleteSession,
  updateSession,
  processTabs,
} from "@/lib/backend";
import { error, info } from "@/lib/logger";
import { useConfig } from "./providers/ConfigProvider";
import { useChats } from "./providers/ConfigProvider";
import Settings from "./Settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export interface AssistantHandle {
  createSession: () => void;
  resetChat: () => void;
  openSettings: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_STATE: InitializationState = { phase: "idle", message: "" };

const PROVIDER_DISPLAY: Record<string, { icon: string; name: string }> = {
  openai: { icon: "/openai.svg", name: "ChatGPT" },
  anthropic: { icon: "/claude.svg", name: "Claude" },
  google: { icon: "/gemini.svg", name: "Gemini" },
};

const DEFAULT_PROVIDER_DISPLAY = { icon: "/openai.svg", name: "AI" };

const WELCOME_MESSAGE: Message = {
  id: 0,
  content: "Hello! How can I help you today?",
  sender: "ai",
};

// ─── Session Sidebar ──────────────────────────────────────────────────────────

interface SessionSidebarProps {
  sessions: SessionInfo[];
  currentSessionIndex: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSwitch: (index: number) => void;
  onCreate: () => void;
  onRename: (index: number, currentName: string) => void;
  onDelete: (index: number) => void;
  loadingSessions: boolean;
}

function SessionSidebar({
  sessions,
  currentSessionIndex,
  isOpen,
  onClose,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  loadingSessions,
}: SessionSidebarProps) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // FIX: store timeout id in a ref so it can be cancelled on unmount and when
  // the user rapidly clicks different delete buttons. The old code used a bare
  // setTimeout with no cleanup — it fired setState on unmounted components.
  const deleteTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current !== null) {
        window.clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (confirmDelete === index) {
      if (deleteTimeoutRef.current !== null) {
        window.clearTimeout(deleteTimeoutRef.current);
        deleteTimeoutRef.current = null;
      }
      onDelete(index);
      setConfirmDelete(null);
    } else {
      if (deleteTimeoutRef.current !== null) {
        window.clearTimeout(deleteTimeoutRef.current);
      }
      setConfirmDelete(index);
      deleteTimeoutRef.current = window.setTimeout(() => {
        setConfirmDelete(null);
        deleteTimeoutRef.current = null;
      }, 3000);
    }
  };

  const handleRenameClick = (
    e: React.MouseEvent,
    index: number,
    name: string,
  ) => {
    e.stopPropagation();
    onRename(index, name);
  };

  return (
    <>
      {isOpen && (
        <div
          className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[1px] md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
          absolute top-0 left-0 h-full z-20
          flex flex-col bg-background border-r
          transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? "w-64 shadow-xl" : "w-0"}
        `}
      >
        {isOpen && (
          <>
            <div className="flex items-center justify-between px-3 py-3 border-b shrink-0">
              <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Sessions
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={onCreate}
                  title="New session"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={onClose}
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-1.5 scrollbar-thin">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                  Loading...
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                  <MessageSquare className="w-6 h-6 opacity-30" />
                  <p className="text-xs">No sessions yet</p>
                </div>
              ) : (
                sessions.map((session) => {
                  const isActive = session.index === currentSessionIndex;
                  const isConfirming = confirmDelete === session.index;

                  return (
                    <div
                      key={session.index}
                      onClick={() => !isActive && onSwitch(session.index)}
                      className={`
                        group relative mx-1.5 my-0.5 px-2.5 py-2 rounded-lg cursor-pointer
                        flex items-center gap-2 transition-colors duration-150
                        ${
                          isActive
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        }
                      `}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
                      )}
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : ""}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium truncate ${isActive ? "text-foreground" : ""}`}
                        >
                          {session.name || (
                            <span className="italic opacity-60">Untitled</span>
                          )}
                        </p>
                        {session.total_messages !== undefined && (
                          <p className="text-[10px] text-muted-foreground">
                            {session.total_messages} messages
                          </p>
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-0.5 ${isConfirming ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
                      >
                        <button
                          className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) =>
                            handleRenameClick(e, session.index, session.name)
                          }
                          title="Rename"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          className={`p-1 rounded transition-colors ${
                            isConfirming
                              ? "bg-destructive/15 text-destructive"
                              : "hover:bg-background/80 text-muted-foreground hover:text-destructive"
                          }`}
                          onClick={(e) => handleDeleteClick(e, session.index)}
                          title={
                            isConfirming ? "Click again to confirm" : "Delete"
                          }
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-3 py-2.5 border-t shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs gap-1.5"
                onClick={onCreate}
              >
                <Plus className="w-3 h-3" />
                New Session
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Rename Modal ─────────────────────────────────────────────────────────────

interface RenameModalProps {
  isOpen: boolean;
  initialName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

function RenameModal({
  isOpen,
  initialName,
  onConfirm,
  onCancel,
}: RenameModalProps) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialName);
      selectTimeoutRef.current = window.setTimeout(() => {
        inputRef.current?.select();
        selectTimeoutRef.current = null;
      }, 50);
    }
    return () => {
      if (selectTimeoutRef.current !== null) {
        window.clearTimeout(selectTimeoutRef.current);
        selectTimeoutRef.current = null;
      }
    };
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (value.trim()) onConfirm(value.trim());
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-background border rounded-xl shadow-2xl p-5 w-72 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Rename Session</h3>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-4"
          placeholder="Session name..."
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!value.trim()}
          >
            Rename
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

let _msgId = 1;
const nextMsgId = () => ++_msgId;

const Assistant = forwardRef<AssistantHandle, AssistantProps>(
  function Assistant({ fileInfo }, ref) {
    const { config, updateKnowledgeStoreConfig } = useConfig();

    const { reloadChats } = useChats();

    const projectPath = config?.basicConfig?.projectPath ?? "";
    const llmConfig = config?.llmConfig;
    const tabsConfig = config?.tabsConfig;

    // Core state
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [currentAiMessage, setCurrentAiMessage] = useState("");
    const [currentProvider, setCurrentProvider] = useState<string>("");
    const [availableProviders, setAvailableProviders] = useState<string[]>([]);
    const [initState, setInitState] =
      useState<InitializationState>(INITIAL_STATE);
    const [currentSessionIndex, setCurrentSessionIndex] = useState<
      number | null
    >(null);
    const [showSettings, setShowSettings] = useState(false);

    // Session state
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [sessionActionLoading, setSessionActionLoading] = useState(false);
    const [renameModal, setRenameModal] = useState<{
      index: number;
      name: string;
    } | null>(null);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const animatedText = useAnimatedText(
      currentAiMessage,
      currentAiMessage ? "" : "",
    );

    const isInitialized = initState.phase === "complete";
    const isLlmNotConfigured = initState.phase === "no-llm-configured";

    const updateInitState = useCallback(
      (phase: InitializationPhase, message: string, errorMsg?: string) => {
        setInitState({ phase, message, error: errorMsg });
      },
      [],
    );

    const getProviderDisplay = useCallback(
      (provider?: string) =>
        PROVIDER_DISPLAY[provider ?? currentProvider] ??
        DEFAULT_PROVIDER_DISPLAY,
      [currentProvider],
    );

    // ── For AssistantContextMenu ────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      createSession: handleCreateSession,
      resetChat: () => setMessages([{ ...WELCOME_MESSAGE, id: nextMsgId() }]),
      openSettings: () => setShowSettings(true),
    }));

    // ── Fetch sessions list ────────────────────────────────────────────────────

    const fetchSessions = useCallback(async (): Promise<SessionInfo[]> => {
      setLoadingSessions(true);
      try {
        const raw: ChatSession[] = await getAllSessions();
        const sessionList: SessionInfo[] = (raw ?? []).map((s, i) => ({
          index: i,
          name: s.name || `Session ${i + 1}`,
          total_messages: s.metadata?.total_messages ?? s.history?.length ?? 0,
          last_updated: s.metadata?.last_updated,
        }));
        setSessions(sessionList);
        return sessionList;
      } catch (err) {
        error(`Failed to fetch sessions: ${err}`);
        return [];
      } finally {
        setLoadingSessions(false);
      }
    }, []);

    // ── Load messages for a session ────────────────────────────────────────────

    const loadSessionMessages = useCallback(
      async (index: number): Promise<Message[]> => {
        const history: ChatSession["history"] = await getSessionHistory(index);
        if (history?.length > 0) {
          const loaded: Message[] = history.map((msg) => ({
            id: nextMsgId(),
            content: msg.message,
            sender: msg.is_ai ? "ai" : "user",
            timestamp: msg.timestamp,
          }));
          setMessages(loaded);
          return loaded;
        }
        setMessages([]);
        return [];
      },
      [],
    );

    const submitMessage = useCallback(async () => {
      if (
        !input.trim() ||
        isLoading ||
        !isInitialized ||
        currentSessionIndex === null
      )
        return;

      const userMessageContent = input.trim();
      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), content: userMessageContent, sender: "user" },
      ]);
      setInput("");
      setIsLoading(true);
      setCurrentAiMessage("");

      try {
        const data = await sendChatMessage(
          userMessageContent,
          true,
          currentSessionIndex,
          4,
        );
        setMessages((prev) => [
          ...prev,
          {
            id: nextMsgId(),
            content: data.response,
            sender: "ai",
            timestamp: data.timestamp,
          },
        ]);
        setCurrentAiMessage(data.response);
        await fetchSessions();
        reloadChats();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        error(`Error calling API: ${errorMsg}`);
        setMessages((prev) => [
          ...prev,
          { id: nextMsgId(), content: `❌ Error: ${errorMsg}`, sender: "ai" },
        ]);
      } finally {
        setIsLoading(false);
      }
    }, [
      input,
      isLoading,
      isInitialized,
      currentSessionIndex,
      fetchSessions,
      reloadChats,
    ]);

    const handleSubmit = useCallback(
      (e: FormEvent) => {
        e.preventDefault();
        submitMessage();
      },
      [submitMessage],
    );

    // ── Initialize ─────────────────────────────────────────────────────────────

    useEffect(() => {
      if (initState.phase !== "idle") return;
      if (!config?.basicConfig || !llmConfig) return;

      const activeLlmProvider = config.basicConfig.activeLlmProvider;
      const modelConfig = llmConfig[activeLlmProvider ?? ""];
      const aiConfig = {
        activeLlmProvider: activeLlmProvider ?? "",
        model: modelConfig?.model ?? "",
        apiKey: modelConfig?.apiKey ?? "",
        temperature: modelConfig?.temperature ?? 0.7,
        maxTokens: modelConfig?.maxTokens ?? 2048,
        chatPrompt: modelConfig?.chatPrompt ?? "",
      };

      const initializeBackend = async () => {
        if (!aiConfig.activeLlmProvider || !aiConfig.apiKey.trim()) {
          updateInitState("no-llm-configured", "LLM not configured");
          return;
        }

        try {
          updateInitState("checking-server", "Checking server...");
          await checkPythonServer();

          updateInitState("initializing-backend", "Initializing backend...");
          if (!projectPath) throw new Error("Project path not found in config");

          const configPath = await join(projectPath, "config.json");
          const chatPath = await join(projectPath, "chats.json");

          await initializePythonBackend(configPath, chatPath);
          await switchLLM(aiConfig.activeLlmProvider);

          setCurrentProvider(aiConfig.activeLlmProvider);

          const providers = Object.entries(llmConfig)
            .filter(([, p]) => p.apiKey?.trim())
            .map(([key]) => key);

          if (providers.length === 0)
            throw new Error("No LLM providers configured.");
          setAvailableProviders(providers);

          updateInitState("loading-session", "Loading session...");
          const sessionList = await fetchSessions();

          if (sessionList.length > 0) {
            const lastIndex = sessionList.length - 1;
            setCurrentSessionIndex(lastIndex);
            await switchSession(lastIndex);
            const msgs = await loadSessionMessages(lastIndex);
            if (msgs.length === 0)
              setMessages([{ ...WELCOME_MESSAGE, id: nextMsgId() }]);
          } else {
            const newSession = await createSession("Chat Session");
            setCurrentSessionIndex(newSession.session_index);
            await fetchSessions();
            setMessages([{ ...WELCOME_MESSAGE, id: nextMsgId() }]);
          }

          updateInitState("complete", "");
          info("✅ App fully initialized!");
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to initialize";
          error(`Initialization failed: ${errorMsg}`);
          updateInitState("error", "Initialization failed", errorMsg);
        }
      };

      initializeBackend();
    }, [
      initState.phase,
      config,
      llmConfig,
      projectPath,
      updateInitState,
      fetchSessions,
      loadSessionMessages,
    ]);

    // ── Scroll to bottom ───────────────────────────────────────────────────────

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // ── Process knowledge store file tabs ──────────────────────────────────────

    useEffect(() => {
      const knowledgeFiles = config?.knowledgeStoreConfig?.files;
      if (!knowledgeFiles || !fileInfo?.file_path) return;

      const knowledgeFile = knowledgeFiles.find(
        (file: KnowledgeFile) => file.filePath === fileInfo.file_path,
      );

      if (!knowledgeFile?.feedLlm || knowledgeFile.isProcessed !== false)
        return;
      if (!tabsConfig) return;

      let cancelled = false;

      const processAndUpdate = async () => {
        const accumulatedData: Record<string, string> = {};

        const saveProgress = (tab_id: string, content: string) => {
          if (cancelled) return;
          accumulatedData[tab_id] = content;

          const currentFiles = config?.knowledgeStoreConfig?.files ?? [];
          const updatedFiles = currentFiles.map((file: KnowledgeFile) =>
            file.filePath === knowledgeFile.filePath
              ? {
                  ...knowledgeFile,
                  isProcessed: false,
                  fileData: { ...accumulatedData },
                }
              : file,
          );
          updateKnowledgeStoreConfig({ files: updatedFiles });
        };

        try {
          const knowledgeFileData = await processTabs(
            fileInfo,
            tabsConfig,
            saveProgress,
          );
          if (cancelled) return;

          const currentFiles = config?.knowledgeStoreConfig?.files ?? [];
          const updatedFiles = currentFiles.map((file: KnowledgeFile) =>
            file.filePath === knowledgeFile.filePath
              ? {
                  ...knowledgeFile,
                  isProcessed: true,
                  fileData: knowledgeFileData,
                }
              : file,
          );
          updateKnowledgeStoreConfig({ files: updatedFiles });
          info(JSON.stringify(knowledgeFileData));
        } catch (err) {
          if (!cancelled) error(`Failed to process tabs: ${err}`);
        }
      };

      processAndUpdate();
      return () => {
        cancelled = true;
      };
    }, [fileInfo, config, tabsConfig, updateKnowledgeStoreConfig]);

    // ── LLM switch ─────────────────────────────────────────────────────────────

    const prevLlmConfigRef = useRef<string>("");

    useEffect(() => {
      if (!llmConfig || !config?.basicConfig?.activeLlmProvider) return;

      const activeProvider = config.basicConfig.activeLlmProvider;
      const activeConfig = llmConfig[activeProvider];
      if (!activeConfig) return;

      // Serialize every field from LlmProvider that affects AI behavior
      const serialized = JSON.stringify({
        provider: activeProvider,
        model: activeConfig.model,
        apiKey: activeConfig.apiKey,
        temperature: activeConfig.temperature,
        maxTokens: activeConfig.maxTokens,
        chatPrompt: activeConfig.chatPrompt,
      });

      if (prevLlmConfigRef.current === "") {
        prevLlmConfigRef.current = serialized;
        return;
      }

      if (serialized !== prevLlmConfigRef.current) {
        prevLlmConfigRef.current = serialized;
        // Only reset from terminal states — never interrupt an active init
        setInitState((prev) =>
          prev.phase === "complete" ||
          prev.phase === "no-llm-configured" ||
          prev.phase === "error"
            ? INITIAL_STATE
            : prev,
        );
      }
    }, [llmConfig, config?.basicConfig?.activeLlmProvider]);

    const handleLLMSelect = useCallback(
      async (provider: string) => {
        if (provider === currentProvider) return;
        try {
          await switchLLM(provider);
          setCurrentProvider(provider);
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to switch LLM";
          setMessages((prev) => [
            ...prev,
            {
              id: nextMsgId(),
              content: `❌ Failed to switch provider: ${errorMsg}`,
              sender: "ai",
            },
          ]);
        }
      },
      [currentProvider],
    );

    // ── Session: Create ────────────────────────────────────────────────────────

    const handleCreateSession = useCallback(async () => {
      setSessionActionLoading(true);
      try {
        const result = await createSession(`Session ${Date.now()}`);
        const newIndex = result.session_index;
        await switchSession(newIndex);
        setCurrentSessionIndex(newIndex);
        setMessages([{ ...WELCOME_MESSAGE, id: nextMsgId() }]);
        await fetchSessions();
        reloadChats();
        info(`Created and switched to session ${newIndex}`);
      } catch (err) {
        error(`Failed to create session: ${err}`);
      } finally {
        setSessionActionLoading(false);
      }
    }, [fetchSessions, reloadChats]);

    // ── Session: Switch ────────────────────────────────────────────────────────

    const handleSwitchSession = useCallback(
      async (index: number) => {
        if (index === currentSessionIndex || sessionActionLoading) return;
        setSessionActionLoading(true);
        try {
          await switchSession(index);
          setCurrentSessionIndex(index);
          const msgs = await loadSessionMessages(index);
          if (msgs.length === 0)
            setMessages([{ ...WELCOME_MESSAGE, id: nextMsgId() }]);
          setSidebarOpen(false);
          info(`Switched to session ${index}`);
        } catch (err) {
          error(`Failed to switch session: ${err}`);
        } finally {
          setSessionActionLoading(false);
        }
      },
      [currentSessionIndex, sessionActionLoading, loadSessionMessages],
    );

    // ── Session: Delete ────────────────────────────────────────────────────────

    const handleDeleteSession = useCallback(
      async (index: number) => {
        setSessionActionLoading(true);
        const isDeletingCurrent = index === currentSessionIndex;
        try {
          await deleteSession(index);
          const updatedList = await fetchSessions();
          reloadChats();

          if (!isDeletingCurrent) return;

          if (updatedList.length > 0) {
            const targetIndex = Math.min(index, updatedList.length - 1);
            const target = updatedList[targetIndex];
            await switchSession(target.index);
            setCurrentSessionIndex(target.index);
            const msgs = await loadSessionMessages(target.index);
            if (msgs.length === 0)
              setMessages([{ ...WELCOME_MESSAGE, id: nextMsgId() }]);
            info(
              `Deleted session ${index}, switched to session ${target.index}`,
            );
          } else {
            const result = await createSession("Chat Session");
            const newIndex = result.session_index;
            await switchSession(newIndex);
            setCurrentSessionIndex(newIndex);
            setMessages([{ ...WELCOME_MESSAGE, id: nextMsgId() }]);
            await fetchSessions();
            reloadChats();
            info(`Deleted last session, created new session ${newIndex}`);
          }
        } catch (err) {
          error(`Failed to delete session: ${err}`);
        } finally {
          setSessionActionLoading(false);
        }
      },
      [currentSessionIndex, fetchSessions, loadSessionMessages, reloadChats],
    );

    // ── Session: Rename ────────────────────────────────────────────────────────

    const handleOpenRename = useCallback((index: number, name: string) => {
      setRenameModal({ index, name });
    }, []);

    const handleRenameConfirm = useCallback(
      async (newName: string) => {
        if (!renameModal) return;
        const { index } = renameModal;
        setRenameModal(null);
        setSessionActionLoading(true);
        try {
          await updateSession(index, { name: newName });
          await fetchSessions();
          reloadChats();
          info(`Renamed session ${index} to "${newName}"`);
        } catch (err) {
          error(`Failed to rename session: ${err}`);
        } finally {
          setSessionActionLoading(false);
        }
      },
      [renameModal, fetchSessions, reloadChats],
    );

    // ── Derived ────────────────────────────────────────────────────────────────

    const providerDisplay = getProviderDisplay();
    const currentSession = sessions.find(
      (s) => s.index === currentSessionIndex,
    );

    // ── Render: LLM not configured ─────────────────────────────────────────────

    if (isLlmNotConfigured && !showSettings) {
      return (
        <div className="h-full border bg-background rounded-lg flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted">
            <AlertCircle className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">LLM Not Configured</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              No API key found. Please add your API key in{" "}
              <span
                onClick={() => setShowSettings(true)}
                className="cursor-pointer font-medium text-foreground underline underline-offset-2"
              >
                Settings
              </span>{" "}
              to start chatting.
            </p>
          </div>
        </div>
      );
    }

    // ── Render: error ──────────────────────────────────────────────────────────

    if (initState.phase === "error" && !showSettings) {
      return (
        <div className="h-full border bg-background rounded-lg flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">
              Initialization Failed
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-3">
              {initState.error ||
                "Something went wrong while starting the assistant."}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Double-check your API key and model name in{" "}
              <span
                onClick={() => setShowSettings(true)}
                className="cursor-pointer font-medium text-foreground underline underline-offset-2"
              >
                Settings
              </span>
              , then restart the app.
            </p>
          </div>
        </div>
      );
    }

    // ── Render: main ───────────────────────────────────────────────────────────

    return (
      <div className="h-full border bg-background rounded-lg flex flex-col relative overflow-hidden">
        <div className={showSettings ? "flex flex-col h-full" : "hidden"}>
          <div className="flex items-end self-end border-b border-l p-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(false)}
            >
              ✕
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Settings />
          </div>
        </div>

        <div
          className={
            showSettings
              ? "hidden"
              : "flex flex-col h-full relative overflow-hidden"
          }
        >
          {/* Session Sidebar */}
          <SessionSidebar
            sessions={sessions}
            currentSessionIndex={currentSessionIndex}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onSwitch={handleSwitchSession}
            onCreate={handleCreateSession}
            onRename={handleOpenRename}
            onDelete={handleDeleteSession}
            loadingSessions={loadingSessions}
          />

          {/* Rename Modal */}
          <RenameModal
            isOpen={!!renameModal}
            initialName={renameModal?.name ?? ""}
            onConfirm={handleRenameConfirm}
            onCancel={() => setRenameModal(null)}
          />

          {/* Top bar */}
          {isInitialized && (
            <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0 bg-background/95 backdrop-blur-sm z-10">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={() => setSidebarOpen((v) => !v)}
                title="Sessions"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </Button>

              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium truncate">
                  {currentSession?.name || "Chat"}
                </span>
                <button
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() =>
                    currentSessionIndex !== null &&
                    handleOpenRename(
                      currentSessionIndex,
                      currentSession?.name ?? "",
                    )
                  }
                  title="Rename session"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 shrink-0"
                onClick={handleCreateSession}
                disabled={sessionActionLoading}
              >
                <Plus className="w-3 h-3" />
                New
              </Button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {!isInitialized ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-pulse mb-4">
                    <div className="h-12 w-12 bg-gray-300 rounded-full mx-auto mb-4" />
                  </div>
                  <p className="text-gray-600">
                    {initState.message || "Starting..."}
                  </p>
                </div>
              </div>
            ) : (
              <ChatMessageList>
                {messages.map((message, index) => {
                  const isLast = index === messages.length - 1;
                  const isAnimated =
                    message.sender === "ai" &&
                    message.content === currentAiMessage &&
                    isLast &&
                    !isLoading;

                  return (
                    <ChatBubble
                      key={message.id}
                      variant={
                        message.sender === "user"
                          ? "sent"
                          : message.sender === "system"
                            ? undefined
                            : "received"
                      }
                    >
                      <ChatBubbleMessage
                        variant={
                          message.sender === "user"
                            ? "sent"
                            : message.sender === "system"
                              ? undefined
                              : "received"
                        }
                      >
                        {isAnimated ? animatedText : message.content}
                      </ChatBubbleMessage>
                    </ChatBubble>
                  );
                })}

                {isLoading && (
                  <ChatBubble variant="received">
                    <ChatBubbleMessage isLoading />
                  </ChatBubble>
                )}

                <div ref={messagesEndRef} />
              </ChatMessageList>
            )}
          </div>

          {/* Input area */}
          {isInitialized && (
            <div className="p-4 border-t shrink-0 bg-background z-10">
              <form
                onSubmit={handleSubmit}
                className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1"
              >
                <ChatInput
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitMessage();
                    } else if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      setInput((prev) => prev + "\n");
                    }
                  }}
                  placeholder="Type your message..."
                  disabled={isLoading || sessionActionLoading}
                  className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0 disabled:opacity-50"
                />

                <div className="flex items-center p-3 pt-2 justify-between">
                  <div className="flex gap-1">
                    <Select
                      value={currentProvider}
                      onValueChange={(value) => handleLLMSelect(value)}
                      disabled={isLoading || availableProviders.length === 0}
                    >
                      <SelectTrigger className="w-auto">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <img
                              src={providerDisplay.icon}
                              alt={providerDisplay.name}
                              className="w-4 h-4"
                            />
                            <span>{providerDisplay.name}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        {availableProviders.map((provider) => {
                          const display = getProviderDisplay(provider);
                          return (
                            <SelectItem key={provider} value={provider}>
                              <div className="flex items-center gap-2">
                                <img
                                  src={display.icon}
                                  alt={display.name}
                                  className="w-4 h-4"
                                />
                                <span>{display.name}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      !input.trim() || isLoading || sessionActionLoading
                    }
                    className="ml-auto gap-1.5"
                  >
                    Ask
                    <CornerDownLeft className="size-3.5" />
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  },
);
export default Assistant;
