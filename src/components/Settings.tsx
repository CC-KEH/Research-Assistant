import { Textarea } from "./ui/text-area";
import { useState, useEffect } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Card, CardContent } from "./ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { AIConfig, Tab } from "@/lib/types";
import { useConfig } from "@/components/providers/ConfigProvider";

const tabs = [
  { id: "file-viewer", label: "File Viewer" },
  { id: "llm", label: "LLM" },
  { id: "embeddings", label: "Embeddings" },
  { id: "vector-store", label: "Vector Store" },
];

const llmProviders = [
  { label: "OpenAI", value: "openai" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Google", value: "google" },
];

const modelsByProvider: Record<string, { label: string; value: string }[]> = {
  openai: [
    // Latest reasoning models
    { label: "o4-mini (Reasoning)", value: "o4-mini" },
    { label: "o4-mini-high (Reasoning)", value: "o4-mini-high" },
    { label: "o3-pro (Reasoning)", value: "o3-pro" },
    { label: "o3-mini (Reasoning)", value: "o3-mini" },

    // Latest GPT models
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4o mini", value: "gpt-4o-mini" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
    { label: "GPT-4", value: "gpt-4" },
    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
  ],
  anthropic: [
    // Latest Claude models
    { label: "Claude Opus 4.6", value: "claude-opus-4-6-20250205" },
    { label: "Claude Opus 4.5", value: "claude-opus-4-5-20251101" },
    { label: "Claude Sonnet 4.5", value: "claude-sonnet-4-5-20250929" },
    { label: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" },
    { label: "Claude Haiku 4.5", value: "claude-haiku-4-5-20251001" },
    { label: "Claude Haiku 3.5", value: "claude-haiku-3-5-20241022" },
  ],
  google: [
    // Latest Gemini models (2025)
    { label: "Gemini 3 Pro", value: "gemini-3-pro-preview" },
    { label: "Gemini 3 Flash", value: "gemini-3-flash-preview" },
    { label: "Gemini 2.5 Pro", value: "gemini-2-5-pro" },
    { label: "Gemini 2.5 Flash", value: "gemini-2-5-flash" },
  ],
};

export default function Settings() {
  const { config, loading, updateTabsConfig, updateLlmConfig, updateAIConfig } =
    useConfig();

  const [activeTab, setActiveTab] = useState("file-viewer");

  // File Viewer state
  const [fileViewerTabs, setFileViewerTabs] = useState<Tab[]>([]);

  // LLM state
  const [selectedLlmName, setSelectedLlmName] = useState("openai");
  const [selectedLlmModel, setSelectedLlmModel] = useState("gpt-4");
  const [llmApiKey, setLlmApiKey] = useState("");

  // Initialize state from config
  useEffect(() => {
    if (!loading && config) {
      // File Viewer tabs
      if (config.tabsConfig?.tabs && Array.isArray(config.tabsConfig.tabs)) {
        setFileViewerTabs(config.tabsConfig.tabs);
      }

      // LLM Config - Handle array of providers
      if (Array.isArray(config.llmConfig) && config.llmConfig.length > 0) {
        const firstLlm = config.llmConfig[0];
        setSelectedLlmName(firstLlm.name);
        setSelectedLlmModel(firstLlm.value);
        setLlmApiKey(firstLlm.api_key || "");
      }
    }
  }, [loading, config]);

  // Save File Viewer Tabs
  const handleSaveFileViewerTabs = async () => {
    if (!config) return;

    updateTabsConfig({
      tabs: fileViewerTabs,
      customTabs: config.tabsConfig?.customTabs || [],
    });
  };

  // Toggle tab enabled state
  const handleToggleTab = (tabId: string, enabled: boolean) => {
    const updatedTabs = fileViewerTabs.map((tab) =>
      tab.id === tabId ? { ...tab, enabled } : tab,
    );
    setFileViewerTabs(updatedTabs);
  };

  // Save LLM Config
  const handleSaveLLM = async () => {
    if (!config || !selectedLlmName) return;

    // Update or create LLM provider in the array
    const updatedLlmConfig = Array.isArray(config.llmConfig)
      ? config.llmConfig.map((llm) =>
          llm.name === selectedLlmName
            ? {
                ...llm,
                value: selectedLlmModel,
                api_key: llmApiKey,
              }
            : llm,
        )
      : [
          {
            name: selectedLlmName,
            label: selectedLlmName,
            value: selectedLlmModel,
            api_key: llmApiKey,
          },
        ];

    // If the provider doesn't exist, add it
    if (!updatedLlmConfig.some((llm) => llm.name === selectedLlmName)) {
      updatedLlmConfig.push({
        name: selectedLlmName,
        label: selectedLlmName,
        value: selectedLlmModel,
        api_key: llmApiKey,
      });
    }

    updateLlmConfig(updatedLlmConfig);

    // Update aiConfig with selected LLM
    const aiConfig = Array.isArray(config.aiConfig)
      ? config.aiConfig[0]
      : (config.aiConfig as AIConfig);

    const updatedAiConfig: AIConfig = {
      ...aiConfig,
      activeLlm: selectedLlmName,
    };

    // Always pass as array
    updateAIConfig(updatedAiConfig);
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
                          <div className="flex flex-row gap-2 items-center">
                            <Switch
                              checked={tab.enabled !== false}
                              onCheckedChange={(checked) =>
                                handleToggleTab(tab.id, checked)
                              }
                            />
                          </div>
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
                      onClick={() => {
                        setSelectedLlmName(provider.value);
                        // Set first model of the new provider
                        const firstModel =
                          modelsByProvider[provider.value]?.[0];
                        if (firstModel) {
                          setSelectedLlmModel(firstModel.value);
                        }
                      }}
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
                <Textarea
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
        </div>
      </div>
    </div>
  );
}
