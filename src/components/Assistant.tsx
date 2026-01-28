import { useState, FormEvent, useEffect } from "react";
import { Mic, CornerDownLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { ChatInput } from "@/components/ui/chat-input";
import { useAnimatedText } from "@/components/ui/animated-text";
import type { FileInfo } from "@/lib/types";
import {
  startPythonServer,
  initializePythonBackend,
  createSession,
  getAllSessions,
  getSessionHistory,
  switchSession,
  sendChatMessage,
  switchLLM,
} from "@/lib/backend";
import { error, info } from "@/lib/logger";
import { useConfig } from "./providers/ConfigProvider";
import {
  Stepper,
  StepperItem,
  StepperTitle,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperDescription,
} from "./small/Stepper";

interface Message {
  id: number;
  content: string;
  sender: "user" | "ai" | "system";
  timestamp?: string;
}

interface AssistantProps {
  fileInfo: FileInfo | null;
}

const steps = [
  {
    step: 1,
    title: "Setting up server.",
    description: "Desc for step one",
  },
  {
    step: 2,
    title: "Loading config",
    description: "Desc for step two",
  },
  {
    step: 3,
    title: "Loading chat",
    description: "Desc for step three",
  },
];

export default function Assistant({ fileInfo }: AssistantProps) {
  const {
    getBasicConfig,
    getAIConfig,
    getLlmConfig,
    getEmbeddingsConfig,
    getVectorStoreConfig,
    getKnowledgeStoreConfig,
  } = useConfig();

  const basicConfig = getBasicConfig();
  const aiConfig = getAIConfig();
  const llmConfig = getLlmConfig();
  const embeddingsConfig = getEmbeddingsConfig();
  const vectorStoreConfig = getVectorStoreConfig();
  const knowledgeStoreConfig = getKnowledgeStoreConfig();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAiMessage, setCurrentAiMessage] = useState("");
  const [currentProvider, setCurrentProvider] = useState<string>("");
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number | null>(
    null,
  );
  const [initializationStep, setInitializationStep] =
    useState<string>("Starting...");

  const animatedText = useAnimatedText(
    currentAiMessage,
    currentAiMessage ? "" : undefined,
  );

  // Initialize backend on mount
  useEffect(() => {
    const initializeBackend = async () => {
      try {
        setInitializationStep("Starting server...");

        // 1. Start Python server
        await startPythonServer();

        // 2. Wait for server to be healthy
        setInitializationStep("Waiting for server to be ready...");

        // 3. Initialize Python backend with paths
        setInitializationStep("Initializing backend...");
        const projectPath = basicConfig?.[0]?.project_path;
        if (!projectPath) {
          throw new Error("Project path not found in config");
        }

        const config_path = `${projectPath}\\config.json`;
        const chatPath = `${projectPath}\\chats.json`;
        info(`Config path: ${config_path}`);

        const initResult = await initializePythonBackend(config_path, chatPath);
        info(`Backend initialized: ${initResult}`);

        // 4. Set current provider from aiConfig
        if (aiConfig) {
          setCurrentProvider(aiConfig?.[0]?.active_llm);

          // Get available providers (those with API keys configured)
          // llmConfig is now a Record/HashMap with keys like "openai", "anthropic", etc.
          const providers: string[] = [];

          if (llmConfig) {
            Object.entries(llmConfig).forEach(([key, provider]) => {
              if (provider.api_key && provider.api_key.trim() !== "") {
                providers.push(key); // key is "openai", "anthropic", "google", "xai"
              }
            });
          }

          setAvailableProviders(providers);
        }

        // 5. Load or create session
        setInitializationStep("Loading session...");
        const sessionsData = await getAllSessions();

        if (sessionsData.sessions && sessionsData.sessions.length > 0) {
          // Use the most recent session (last one)
          const sessionIndex = sessionsData.sessions.length - 1;
          setCurrentSessionIndex(sessionIndex);

          // Switch to this session
          await switchSession(sessionIndex);

          // Load session history
          const historyData = await getSessionHistory(sessionIndex);

          if (historyData.history && historyData.history.length > 0) {
            const loadedMessages: Message[] = historyData.history.map(
              (msg: any, idx: number) => ({
                id: Date.now() + idx,
                content: msg.message,
                sender: msg.is_ai ? "ai" : "user",
                timestamp: msg.timestamp,
              }),
            );
            setMessages(loadedMessages);
          }
        } else {
          // Create a new session
          const newSessionResult = await createSession("Chat Session");
          setCurrentSessionIndex(newSessionResult.session_index);

          // Add welcome message
          setMessages([
            {
              id: 1,
              content: "Hello! How can I help you today?",
              sender: "ai",
            },
          ]);
        }

        setInitializationStep("");
        setIsInitialized(true);
        info("✅ App fully initialized!");
      } catch (err) {
        error(`Error initializing: ${err}`);
        setModelError(
          err instanceof Error ? err.message : "Failed to initialize backend",
        );
        setInitializationStep("");
      }
    };

    if (basicConfig && aiConfig && llmConfig) {
      initializeBackend();
    }
  }, [basicConfig, aiConfig, llmConfig]);

  // Notify user of new file selection
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isInitialized) return;

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
    setModelError(null);

    try {
      // Call the chat API
      const data = await sendChatMessage(
        userMessageContent,
        false, // useRAG - set to true if you want to use RAG
        currentSessionIndex ?? undefined,
        4, // k value for RAG
      );

      // Add AI response to messages
      const aiMessage: Message = {
        id: Date.now() + 1,
        content: data.response,
        sender: "ai",
        timestamp: data.timestamp,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setCurrentAiMessage(data.response);
      setIsLoading(false);
    } catch (err) {
      error(`Error calling API: ${err}`);
      const errorMessage: Message = {
        id: Date.now() + 1,
        content:
          err instanceof Error
            ? `Error: ${err.message}`
            : "Sorry, I encountered an error. Please try again.",
        sender: "ai",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setModelError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  };

  const handleMicrophoneClick = () => {
    // TODO: Implement voice input
    info("Microphone clicked");
  };

  const handleLLMSwitch = async () => {
    if (availableProviders.length === 0) {
      alert("No LLM providers configured. Please add API keys in Settings.");
      return;
    }

    try {
      // Cycle through available providers
      const currentIndex = availableProviders.indexOf(currentProvider);
      const nextIndex = (currentIndex + 1) % availableProviders.length;
      const nextProvider = availableProviders[nextIndex];

      // Switch the LLM on the backend
      await switchLLM(nextProvider);

      setCurrentProvider(nextProvider);

      // Show system message
      const systemMessage: Message = {
        id: Date.now(),
        content: `Switched to ${getProviderDisplay(nextProvider).name}`,
        sender: "system",
      };
      setMessages((prev) => [...prev, systemMessage]);
    } catch (err) {
      error(`Error switching LLM: ${err}`);
      setModelError(
        err instanceof Error ? err.message : "Failed to switch LLM",
      );
    }
  };

  // Get display name and icon for provider
  const getProviderDisplay = (provider?: string) => {
    const p = provider || currentProvider;
    switch (p) {
      case "openai":
        return { icon: "/openai.svg", name: "GPT-4" };
      case "anthropic":
        return { icon: "/anthropic.svg", name: "Claude" };
      case "google":
        return { icon: "/google.svg", name: "Gemini" };
      case "xai":
        return { icon: "/xai.svg", name: "Grok" };
      default:
        return { icon: "/openai.svg", name: "AI" };
    }
  };

  const providerDisplay = getProviderDisplay();

  return (
    <div className="h-full border bg-background rounded-lg flex flex-col relative">
      {!isInitialized && initializationStep && (
        <div className="p-2 bg-blue-50 border-b border-blue-200 text-blue-700 text-sm">
          {initializationStep}
        </div>
      )}

      {modelError && (
        <div className="p-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          {modelError}
        </div>
      )}

      <div className="px-10 my-12 self-center">
        <Stepper defaultValue={2} orientation="vertical">
          {steps.map(({ step, title, description }) => (
            <StepperItem
              key={step}
              step={step}
              className="relative items-start [&:not(:last-child)]:flex-1"
            >
              <div className="pb-4">
                <StepperIndicator />
                <StepperTitle>{title}</StepperTitle>
                <StepperDescription>{description}</StepperDescription>
              </div>
              {step < steps.length && (
                <StepperSeparator className="absolute inset-y-0 left-3 top-[calc(1.5rem+0.125rem)] -order-1 m-0 -translate-x-1/2 group-data-[orientation=vertical]/stepper:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=horizontal]/stepper:w-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=horizontal]/stepper:flex-none" />
              )}
            </StepperItem>
          ))}
        </Stepper>
      </div>

      <div className="flex-1 min-h-0 relative">
        <ChatMessageList>
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            const isAnimated =
              message.sender === "ai" &&
              message.content === currentAiMessage &&
              isLast &&
              isLoading === false;

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
        </ChatMessageList>
      </div>

      <div className="p-4 border-t shrink-0 bg-background z-10">
        <form
          onSubmit={handleSubmit}
          className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1"
        >
          <ChatInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center p-3 pt-2 justify-between">
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="default"
                type="button"
                onClick={handleLLMSwitch}
              >
                <img
                  src={providerDisplay.icon}
                  alt={providerDisplay.name}
                  className="pr-1 w-5 h-5"
                />
                {providerDisplay.name}
                <ChevronDown className="ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={handleMicrophoneClick}
              >
                <Mic className="size-4" />
              </Button>
            </div>
            <Button type="submit" size="sm" className="ml-auto gap-1.5">
              Ask
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
