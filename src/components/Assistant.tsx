import { useState, FormEvent, useEffect, useCallback, useRef } from "react";
import { Mic, CornerDownLeft, ChevronDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { ChatInput } from "@/components/ui/chat-input";
import { useAnimatedText } from "@/components/ui/animated-text";
import type { FileInfo } from "@/lib/types";
import {
  initializePythonBackend,
  createSession,
  getAllSessions,
  getSessionHistory,
  switchSession,
  sendChatMessage,
  switchLLM,
  checkPythonServer,
} from "@/lib/backend";
import { error, info } from "@/lib/logger";
import { useConfig } from "./providers/ConfigProvider";

interface Message {
  id: number;
  content: string;
  sender: "user" | "ai" | "system";
  timestamp?: string;
}

interface AssistantProps {
  fileInfo: FileInfo | null;
}

type InitializationPhase =
  | "idle"
  | "checking-server"
  | "initializing-backend"
  | "loading-session"
  | "complete"
  | "no-llm-configured"
  | "error";

interface InitializationState {
  phase: InitializationPhase;
  message: string;
  error?: string;
}

const INITIAL_STATE: InitializationState = {
  phase: "idle",
  message: "",
};

export default function Assistant({ fileInfo }: AssistantProps) {
  const { getBasicConfig, getLlmConfig } = useConfig();
  const basicConfig = getBasicConfig();
  const llmConfig = getLlmConfig();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAiMessage, setCurrentAiMessage] = useState("");
  const [currentProvider, setCurrentProvider] = useState<string>("");
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [initState, setInitState] =
    useState<InitializationState>(INITIAL_STATE);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number | null>(
    null,
  );

  // Refs
  const initializationAttempted = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const animatedText = useAnimatedText(
    currentAiMessage,
    currentAiMessage ? "" : undefined,
  );

  const isInitialized = initState.phase === "complete";
  const isLlmNotConfigured = initState.phase === "no-llm-configured";

  // Helper: Update initialization state
  const updateInitState = useCallback(
    (phase: InitializationPhase, message: string, errorMsg?: string) => {
      setInitState({ phase, message, error: errorMsg });
    },
    [],
  );

  // Helper: Get provider display info
  const getProviderDisplay = useCallback(
    (provider?: string) => {
      const p = provider || currentProvider;
      const providers: Record<string, { icon: string; name: string }> = {
        openai: { icon: "/openai.svg", name: "ChatGPT" },
        anthropic: { icon: "/anthropic.svg", name: "Claude" },
        google: { icon: "/google.svg", name: "Gemini" },
        xai: { icon: "/xai.svg", name: "Grok" },
      };
      return providers[p] || { icon: "/openai.svg", name: "AI" };
    },
    [currentProvider],
  );

  // Initialize backend on mount
  useEffect(() => {
    if (initializationAttempted.current) return;

    if (!basicConfig || !llmConfig) return;

    initializationAttempted.current = true;

    const activeLLM = basicConfig?.[0]?.activeLlm;
    const modelConfig = llmConfig?.[activeLLM || ""];

    const aiConfig = {
      activeLLM: activeLLM || "",
      modelName: modelConfig?.modelName || "",
      apiKey: modelConfig?.apiKey || "",
      temperature: modelConfig?.temperature || 0.7,
      maxTokens: modelConfig?.maxTokens || 2048,
      chatPrompt: modelConfig?.chatPrompt || "",
    };

    const initializeBackend = async () => {
      // Guard: check LLM config before doing anything
      if (!aiConfig?.activeLLM || !aiConfig.apiKey?.trim()) {
        updateInitState("no-llm-configured", "LLM not configured");
        return;
      }

      try {
        // Step 1: Start & Check Python server
        updateInitState("checking-server", "Checking server...");
        await checkPythonServer();
        // Step 2: Initialize backend with config paths
        updateInitState("initializing-backend", "Initializing backend...");
        const projectPath = basicConfig?.[0]?.projectPath;
        if (!projectPath) {
          throw new Error("Project path not found in config");
        }

        const configPath = `${projectPath}\\config.json`;
        const chatPath = `${projectPath}\\chats.json`;
        info(`Config path: ${configPath}`);

        const initResult = await initializePythonBackend(configPath, chatPath);
        info(`Backend initialized: ${initResult}`);

        const llmInitResult = await switchLLM(aiConfig?.activeLLM);
        info(`LLM initialized: ${llmInitResult}`);

        // Step 3: Configure LLM providers
        if (aiConfig?.activeLLM) {
          setCurrentProvider(aiConfig.activeLLM);

          const providers: string[] = [];
          if (llmConfig) {
            Object.entries(llmConfig).forEach(([key, provider]) => {
              if (provider.apiKey?.trim()) {
                providers.push(key);
              }
            });
          }

          if (providers.length === 0) {
            throw new Error(
              "No LLM providers configured. Add API keys in Settings.",
            );
          }

          setAvailableProviders(providers);
          info(`Available providers: ${providers.join(", ")}`);
        }

        // Step 4: Load or create session
        updateInitState("loading-session", "Loading session...");
        const sessionsData = await getAllSessions();

        if (sessionsData.sessions?.length > 0) {
          const sessionIndex = sessionsData.sessions.length - 1;
          setCurrentSessionIndex(sessionIndex);

          await switchSession(sessionIndex);
          const historyData = await getSessionHistory(sessionIndex);

          if (historyData.history?.length > 0) {
            const loadedMessages: Message[] = historyData.history.map(
              (msg: any, idx: number) => ({
                id: Date.now() + idx,
                content: msg.message,
                sender: msg.is_ai ? "ai" : "user",
                timestamp: msg.timestamp,
              }),
            );
            setMessages(loadedMessages);
            info(`Loaded ${loadedMessages.length} messages from session`);
          }
        } else {
          const newSessionResult = await createSession("Chat Session");
          setCurrentSessionIndex(newSessionResult.session_index);

          setMessages([
            {
              id: 1,
              content: "Hello! How can I help you today?",
              sender: "ai",
            },
          ]);
          info("Created new session");
        }

        updateInitState("complete", "");
        info("✅ App fully initialized!");
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to initialize backend";
        error(`Initialization failed: ${errorMsg}`);
        updateInitState("error", "Initialization failed", errorMsg);
      }
    };

    initializeBackend();
  }, [basicConfig, llmConfig, updateInitState]);

  // Handle file selection
  useEffect(() => {
    if (fileInfo && isInitialized) {
      const systemMessage: Message = {
        id: Date.now(),
        content: `Selected file: ${fileInfo.name} (${fileInfo.type})`,
        sender: "system",
      };
      setMessages((prev) => [...prev, systemMessage]);
    }
  }, [fileInfo, isInitialized]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !input.trim() ||
      isLoading ||
      !isInitialized ||
      currentSessionIndex === null
    ) {
      return;
    }

    const userMessageContent = input.trim();
    const newUserMessage: Message = {
      id: Date.now(),
      content: userMessageContent,
      sender: "user",
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setIsLoading(true);
    setCurrentAiMessage("");

    try {
      const data = await sendChatMessage(
        userMessageContent,
        false, // useRAG
        currentSessionIndex,
        4, // k value for RAG
      );

      const aiMessage: Message = {
        id: Date.now() + 1,
        content: data.response,
        sender: "ai",
        timestamp: data.timestamp,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setCurrentAiMessage(data.response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      error(`Error calling API: ${errorMsg}`);

      const errorMessage: Message = {
        id: Date.now() + 1,
        content: `❌ Error: ${errorMsg}`,
        sender: "ai",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle LLM provider switch
  const handleLLMSwitch = async () => {
    if (availableProviders.length === 0) {
      alert("No LLM providers configured. Please add API keys in Settings.");
      return;
    }

    if (!currentProvider) {
      error("No current provider set");
      return;
    }

    try {
      const currentIndex = availableProviders.indexOf(currentProvider);
      const nextIndex = (currentIndex + 1) % availableProviders.length;
      const nextProvider = availableProviders[nextIndex];

      await switchLLM(nextProvider);
      setCurrentProvider(nextProvider);

      const providerName = getProviderDisplay(nextProvider).name;

      info(`Switched LLM to ${providerName}`);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to switch LLM";
      error(`Error switching LLM: ${errorMsg}`);

      const errorMessage: Message = {
        id: Date.now(),
        content: `❌ Failed to switch provider: ${errorMsg}`,
        sender: "ai",
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // Handle microphone (placeholder)
  const handleMicrophoneClick = () => {
    info("Microphone clicked - TODO: implement voice input");
    // TODO: Implement voice input with speech recognition
  };

  const providerDisplay = getProviderDisplay();

  // Render: LLM not configured
  if (isLlmNotConfigured) {
    return (
      <div className="h-full border bg-background rounded-lg flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted">
          <AlertCircle className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-1">LLM Not Configured</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            No API key found. Please add your API key in{" "}
            <span className="font-medium text-foreground">Settings</span> to
            start chatting.
          </p>
        </div>
      </div>
    );
  }

  // Render: Initialization error (bad API key, wrong model name, etc.)
  if (initState.phase === "error") {
    return (
      <div className="h-full border bg-background rounded-lg flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-1">Initialization Failed</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-3">
            {initState.error ||
              "Something went wrong while starting the assistant."}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Double-check your API key and model name in{" "}
            <span className="font-medium text-foreground">Settings</span>, then
            restart the app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full border bg-background rounded-lg flex flex-col relative">
      {/* Messages Container */}
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

      {/* Input Area */}
      {isInitialized && (
        <div className="p-4 border-t shrink-0 bg-background z-10">
          <form
            onSubmit={handleSubmit}
            className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1"
          >
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0 disabled:opacity-50"
            />

            <div className="flex items-center p-3 pt-2 justify-between">
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="default"
                  type="button"
                  onClick={handleLLMSwitch}
                  disabled={isLoading || availableProviders.length === 0}
                  title={`Current: ${providerDisplay.name}`}
                >
                  <img
                    src={providerDisplay.icon}
                    alt={providerDisplay.name}
                    className="pr-1 w-5 h-5"
                  />
                  {providerDisplay.name}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={handleMicrophoneClick}
                  disabled={isLoading}
                  title="Voice input (coming soon)"
                >
                  <Mic className="size-4" />
                </Button>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isLoading}
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
  );
}
