import { useState, useEffect } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Card, CardContent } from "./ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { AIConfig, LlmProvider, Tab } from "@/lib/types";
import { useConfig } from "@/components/providers/ConfigProvider";
import { Input } from "./ui/input";

const tabs = [
  { id: "file-viewer", label: "File Viewer" },
  { id: "llm", label: "LLM" },
  { id: "Advanced", label: "Advanced" },
];

const llmProviders = [
  { label: "OpenAI", value: "openai" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Google", value: "google" },
];

const modelsByProvider: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: "GPT-5 Nano", value: "gpt-5-nano" },
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4o mini", value: "gpt-4o-mini" },
    { label: "GPT-4", value: "gpt-4" },
    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
  ],
  anthropic: [
    { label: "Claude Opus 4.6", value: "claude-opus-4-6-20250205" },
    { label: "Claude Opus 4.5", value: "claude-opus-4-5-20251101" },
    { label: "Claude Sonnet 4.5", value: "claude-sonnet-4-5-20250929" },
    { label: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" },
    { label: "Claude Haiku 4.5", value: "claude-haiku-4-5-20251001" },
    { label: "Claude Haiku 3.5", value: "claude-haiku-3-5-20241022" },
  ],
  google: [
    { label: "Gemini 3 Pro", value: "gemini-3-pro-preview" },
    { label: "Gemini 3 Flash", value: "gemini-3-flash-preview" },
    { label: "Gemini 2.5 Pro", value: "gemini-2-5-pro" },
    { label: "Gemini 2.5 Flash", value: "gemini-2-5-flash" },
  ],
};

export default function Settings() {
  const { config, loading, updateTabsConfig, updateConfig } = useConfig();

  const [activeTab, setActiveTab] = useState("file-viewer");
  const [fileViewerTabs, setFileViewerTabs] = useState<Tab[]>([]);

  const [selectedLlmName, setSelectedLlmName] = useState("openai");
  const [selectedLlmModel, setSelectedLlmModel] = useState("gpt-4");
  const [llmApiKey, setLlmApiKey] = useState("");

  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [chatPrompt, setChatPrompt] = useState("");

  useEffect(() => {
    if (!loading && config) {
      if (config.tabsConfig?.tabs && Array.isArray(config.tabsConfig.tabs)) {
        setFileViewerTabs(config.tabsConfig.tabs);
      }
      const activeLlmName = config.aiConfig?.activeLlm || "openai";
      setSelectedLlmName(activeLlmName);
      loadProviderFields(activeLlmName);
    }
  }, [loading, config]);

  const loadProviderFields = (providerName: string) => {
    if (!config) return;
    const provider = config.llmConfig?.[providerName];
    if (provider) {
      setSelectedLlmModel(provider.modelName || "");
      setLlmApiKey(provider.apiKey || "");
      setTemperature(provider.temperature ?? 0.7);
      setMaxTokens(provider.maxTokens ?? 2048);
      setChatPrompt(provider.chatPrompt || "");
    } else {
      const firstModel = modelsByProvider[providerName]?.[0];
      setSelectedLlmModel(firstModel?.value || "");
      setLlmApiKey("");
      setTemperature(0.7);
      setMaxTokens(2048);
      setChatPrompt("");
    }
  };

  const handleProviderChange = (providerName: string) => {
    setSelectedLlmName(providerName);
    loadProviderFields(providerName);
  };

  const handleSaveFileViewerTabs = () => {
    if (!config) return;
    updateTabsConfig({
      tabs: fileViewerTabs,
      customTabs: config.tabsConfig?.customTabs || [],
    });
  };

  const handleToggleTab = (tabId: string, enabled: boolean) => {
    setFileViewerTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, enabled } : tab)),
    );
  };

  const handleSaveLLM = () => {
    if (!config || !selectedLlmName) return;

    const updatedLlmConfig: Record<string, LlmProvider> = {
      ...config.llmConfig,
      [selectedLlmName]: {
        ...config.llmConfig?.[selectedLlmName],
        modelName: selectedLlmModel,
        apiKey: llmApiKey,
      },
    };

    const effectiveApiKey = llmApiKey.trim();
    let activeLlm = config.aiConfig?.activeLlm;

    if (effectiveApiKey) {
      activeLlm = selectedLlmName;
    } else if (!config.llmConfig?.[activeLlm ?? ""]?.apiKey?.trim()) {
      const fallback = Object.entries(updatedLlmConfig).find(([, p]) =>
        p.apiKey?.trim(),
      );
      if (fallback) activeLlm = fallback[0];
    }

    const updatedAiConfig: AIConfig = {
      ...config.aiConfig,
      activeLlm: activeLlm ?? selectedLlmName,
    };

    updateConfig({
      ...config,
      llmConfig: updatedLlmConfig,
      aiConfig: updatedAiConfig,
    });
  };

  const handleSaveAdvanced = () => {
    if (!config || !selectedLlmName) return;

    const updatedLlmConfig: Record<string, LlmProvider> = {
      ...config.llmConfig,
      [selectedLlmName]: {
        ...config.llmConfig?.[selectedLlmName],
        temperature,
        maxTokens,
        chatPrompt,
      },
    };

    updateConfig({ ...config, llmConfig: updatedLlmConfig });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-10 h-full px-4">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <div className="flex flex-col justify-center items-center w-full">
        <Tabs
          tabs={tabs}
          onTabChange={(tabId) => setActiveTab(tabId)}
          className="mb-6 items-center"
        />
        <div className="w-full max-h-98 px-4 overflow-y-auto scrollbar-thin">
          {/* File Viewer Tab */}
          {activeTab === "file-viewer" && (
            <div className="w-full h-fit space-y-4 px-4 py-6 overflow-y-auto scrollbar-thin">
              {fileViewerTabs.length > 0 ? (
                <>
                  {fileViewerTabs.map((tab) => (
                    <Card
                      key={tab.id}
                      className="shadow-md rounded-2xl w-full py-4 min-h-20"
                    >
                      <CardContent className="space-y-2">
                        <h3 className="text-md font-medium">{tab.label}</h3>
                        <div className="flex flex-row justify-between items-start gap-4">
                          <div className="text-xs text-muted-foreground max-w-[70%]">
                            <p>
                              <span className="font-semibold">Prompt:</span>{" "}
                              {tab.prompt?.substring(0, 100)}...
                            </p>
                          </div>
                          <Switch
                            checked={tab.enabled !== false}
                            onCheckedChange={(checked) =>
                              handleToggleTab(tab.id, checked)
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button onClick={handleSaveFileViewerTabs} className="w-full">
                    Save File Viewer Configuration
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">No tabs configured</p>
              )}
            </div>
          )}

          {/* LLM Tab */}
          {activeTab === "llm" && (
            <div className="w-full h-fit space-y-4 px-4 py-6 overflow-y-auto scrollbar-thin">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LLM Provider
                </label>
                <div className="flex flex-wrap gap-2">
                  {llmProviders.map((provider) => (
                    <Button
                      key={provider.value}
                      type="button"
                      variant={
                        selectedLlmName === provider.value
                          ? "default"
                          : "outline"
                      }
                      onClick={() => handleProviderChange(provider.value)}
                    >
                      {provider.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <div className="flex flex-wrap gap-2">
                  {(modelsByProvider[selectedLlmName] || []).map((model) => (
                    <Button
                      key={model.value}
                      type="button"
                      variant={
                        selectedLlmModel === model.value ? "default" : "outline"
                      }
                      onClick={() => setSelectedLlmModel(model.value)}
                      size="sm"
                    >
                      {model.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <Input
                  placeholder="Enter your LLM API Key here..."
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                />
              </div>

              <Button onClick={handleSaveLLM} className="w-full">
                Save LLM Configuration
              </Button>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === "Advanced" && (
            <div className="w-full h-fit space-y-6 px-4 py-6 overflow-y-auto scrollbar-thin">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Editing settings for
                </label>
                <div className="flex flex-wrap gap-2">
                  {llmProviders.map((provider) => (
                    <Button
                      key={provider.value}
                      type="button"
                      variant={
                        selectedLlmName === provider.value
                          ? "default"
                          : "outline"
                      }
                      onClick={() => handleProviderChange(provider.value)}
                      size="sm"
                    >
                      {provider.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    Temperature
                  </label>
                  <span className="text-sm font-semibold text-primary w-10 text-right">
                    {temperature}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Controls randomness. Lower = more focused, higher = more
                  creative.
                </p>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 — Precise</span>
                  <span>1 — Creative</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    Max Tokens
                  </label>
                  <span className="text-sm font-semibold text-primary w-16 text-right">
                    {maxTokens}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum number of tokens the model can generate in a response.
                </p>
                <input
                  type="range"
                  min={256}
                  max={8192}
                  step={256}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>256</span>
                  <span>8192</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Chat Prompt
                </label>
                <p className="text-xs text-muted-foreground">
                  System prompt for the assistant. Use{" "}
                  <code className="bg-muted px-1 rounded">{"{context}"}</code>{" "}
                  as a placeholder for retrieved context.
                </p>
                <textarea
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  placeholder="Enter system prompt for this provider..."
                />
              </div>

              <Button onClick={handleSaveAdvanced} className="w-full">
                Save Advanced Configuration
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
