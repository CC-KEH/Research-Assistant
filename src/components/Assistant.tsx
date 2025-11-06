import { useState, FormEvent, useEffect } from "react";
import { Mic, CornerDownLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { ChatInput } from "@/components/ui/chat-input";
import { useAnimatedText } from "@/components/ui/animated-text";
import type { FileInfo } from "@/lib/types";
import {
  createModelFromConfig,
  createModelByProvider,
  getAvailableLLMProviders,
} from "@/lib/langchain/models";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

interface Message {
  id: number;
  content: string;
  sender: "user" | "ai" | "system";
}

interface AssistantProps {
  fileInfo: FileInfo | null;
}

export default function Assistant({ fileInfo }: AssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Hello! How can I help you today?",
      sender: "ai",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAiMessage, setCurrentAiMessage] = useState("");
  const [currentProvider, setCurrentProvider] = useState<string>("");
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [modelError, setModelError] = useState<string | null>(null);

  const animatedText = useAnimatedText(
    currentAiMessage,
    currentAiMessage ? "" : undefined
  );

  // Initialize available providers on mount
  useEffect(() => {
    try {
      const providers = getAvailableLLMProviders();
      setAvailableProviders(providers);
      if (providers.length > 0) {
        setCurrentProvider(providers[0]);
      }
    } catch (error) {
      console.error("Error loading LLM providers:", error);
      setModelError(
        "Failed to load LLM providers. Please check your configuration."
      );
    }
  }, []);

  // Notify user of new file selection
  useEffect(() => {
    if (fileInfo) {
      const systemMessage: Message = {
        id: Date.now(),
        content: `Selected file: ${fileInfo.name} (${fileInfo.type})`,
        sender: "system",
      };
      setMessages((prev) => [...prev, systemMessage]);
    }
  }, [fileInfo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
      // Create the model based on current provider
      const model = currentProvider
        ? createModelByProvider(currentProvider)
        : createModelFromConfig();

      // Build conversation history for context
      const conversationHistory = messages
        .filter((m) => m.sender !== "system")
        .map((m) => {
          if (m.sender === "user") {
            return new HumanMessage(m.content);
          } else {
            return new AIMessage(m.content);
          }
        });

      // Add system message if file is selected
      const systemMessages = [];
      if (fileInfo) {
        systemMessages.push(
          new SystemMessage(
            `You have access to a file: ${fileInfo.name} (${fileInfo.type}). The user may ask questions about this file.`
          )
        );
      }

      // Prepare messages for the model
      const allMessages = [
        ...systemMessages,
        ...conversationHistory,
        new HumanMessage(userMessageContent),
      ];

      // Stream the response
      let fullResponse = "";
      const stream = await model.stream(allMessages);

      // Create placeholder for AI message
      const aiMessageId = Date.now() + 1;
      const aiMessage: Message = {
        id: aiMessageId,
        content: "",
        sender: "ai",
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Process the stream
      for await (const chunk of stream) {
        const content = chunk.content;
        if (typeof content === "string") {
          fullResponse += content;
          setCurrentAiMessage(fullResponse);

          // Update the message in the list
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId ? { ...m, content: fullResponse } : m
            )
          );
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error calling LLM:", error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        content:
          error instanceof Error
            ? `Error: ${error.message}`
            : "Sorry, I encountered an error. Please check your API configuration.",
        sender: "ai",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setModelError(error instanceof Error ? error.message : "Unknown error");
      setIsLoading(false);
    }
  };

  const handleMicrophoneClick = () => {
    // TODO: Implement voice input
    console.log("Microphone clicked");
  };

  const handleLLMSwitch = () => {
    // Cycle through available providers
    if (availableProviders.length === 0) {
      alert("No LLM providers configured. Please add API keys in Settings.");
      return;
    }

    const currentIndex = availableProviders.indexOf(currentProvider);
    const nextIndex = (currentIndex + 1) % availableProviders.length;
    setCurrentProvider(availableProviders[nextIndex]);
  };

  // Get display name and icon for current provider
  const getProviderDisplay = () => {
    switch (currentProvider) {
      case "openai":
        return { icon: "openai.svg", name: "GPT-4" };
      case "anthropic":
        return { icon: "anthropic.svg", name: "Claude" };
      case "google":
        return { icon: "google.svg", name: "Gemini" };
      case "xai":
        return { icon: "xai.svg", name: "Grok" };
      default:
        return { icon: "openai.svg", name: "AI" };
    }
  };

  const providerDisplay = getProviderDisplay();

  return (
    <div className="h-full border bg-background rounded-lg flex flex-col relative">
      {modelError && (
        <div className="p-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          {modelError}
        </div>
      )}

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
            disabled={isLoading}
          />
          <div className="flex items-center p-3 pt-2 justify-between">
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="default"
                type="button"
                onClick={handleLLMSwitch}
                disabled={availableProviders.length === 0}
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
            <Button
              type="submit"
              size="sm"
              className="ml-auto gap-1.5"
              disabled={isLoading || !input.trim()}
            >
              Ask
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
