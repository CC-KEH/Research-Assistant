import { useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";

import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import ChatsTab from "./ChatsTab";
import { syncProviderFields } from "@/lib/backend";
import type { BasicConfig, LlmProvider, Tab } from "@/lib/types";
import { useConfig } from "@/components/providers/ConfigProvider";
import { llmProviders, modelsByProvider, tabs } from "@/lib/constants";

export default function Settings() {
  const location = useLocation();
  const { config, loading, updateTabsConfig, updateConfig } = useConfig();
  const [activeTab, setActiveTab] = useState(
    (location.state as { initialTab?: string })?.initialTab ?? "file-viewer",
  );

  const [fileViewerTabs, setFileViewerTabs] = useState<Tab[]>([]);

  const [selectedLlmName, setSelectedLlmName] = useState("openai");
  const [selectedLlmModel, setSelectedLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [chatPrompt, setChatPrompt] = useState("");

  const fieldSetters = useMemo(
    () => ({
      setSelectedLlmModel,
      setLlmApiKey,
      setTemperature,
      setMaxTokens,
      setChatPrompt,
    }),
    // These are all stable setState references — safe empty dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Sync form fields from config ──────────────────────────────────────────
  useEffect(() => {
    if (loading || !config) return;

    if (config.tabsConfig?.tabs && Array.isArray(config.tabsConfig.tabs)) {
      setFileViewerTabs(config.tabsConfig.tabs);
    }

    const activeLlmProvider = config.basicConfig?.activeLlmProvider || "openai";
    setSelectedLlmName(activeLlmProvider);
    syncProviderFields(activeLlmProvider, config, fieldSetters);
  }, [loading, config, fieldSetters]);

  const handleProviderChange = useCallback(
    (providerName: string) => {
      setSelectedLlmName(providerName);
      syncProviderFields(providerName, config, fieldSetters);
    },
    [config, fieldSetters],
  );

  const handleSaveFileViewerTabs = useCallback(() => {
    if (!config) return;
    updateTabsConfig({
      tabs: fileViewerTabs,
      customTabs: config.tabsConfig?.customTabs || [],
    });
  }, [config, fileViewerTabs, updateTabsConfig]);

  const handleToggleTab = useCallback((tabId: string, enabled: boolean) => {
    setFileViewerTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, enabled } : tab)),
    );
  }, []);

  const handleSaveLLM = useCallback(() => {
    if (!config || !selectedLlmName) return;

    const updatedLlmConfig: Record<string, LlmProvider> = {
      ...config.llmConfig,
      [selectedLlmName]: {
        ...config.llmConfig?.[selectedLlmName],
        model: selectedLlmModel,
        apiKey: llmApiKey,
        temperature,
        maxTokens,
        chatPrompt,
      },
    };

    const effectiveApiKey = llmApiKey.trim();
    let activeLlmProvider = config.basicConfig?.activeLlmProvider;

    if (effectiveApiKey) {
      activeLlmProvider = selectedLlmName;
    } else if (!config.llmConfig?.[activeLlmProvider ?? ""]?.apiKey?.trim()) {
      const fallback = Object.entries(updatedLlmConfig).find(([, p]) =>
        p.apiKey?.trim(),
      );
      if (fallback) activeLlmProvider = fallback[0];
    }

    const updatedBasicConfig: BasicConfig = {
      ...config.basicConfig,
      activeLlmProvider: activeLlmProvider ?? selectedLlmName,
    };

    updateConfig({
      ...config,
      llmConfig: updatedLlmConfig,
      basicConfig: updatedBasicConfig,
    });
  }, [
    config,
    selectedLlmName,
    selectedLlmModel,
    llmApiKey,
    temperature,
    maxTokens,
    chatPrompt,
    updateConfig,
  ]);

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
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId)}
          className="mb-6 items-center"
        />

        <div className="w-full max-h-98 px-4 overflow-y-auto scrollbar-thin">
          {/* <div className="w-full max-h-[calc(100vh-12rem)] px-4 overflow-y-auto scrollbar-thin"> */}
          {/* ── File Viewer Tab ── */}
          {activeTab === "file-viewer" && (
            <div className="w-full h-fit space-y-4 px-4 py-6">
              {fileViewerTabs.length > 0 ? (
                <>
                  {fileViewerTabs.map(
                    (tab) =>
                      tab.id !== "view" &&
                      tab.id !== "arxiv" && (
                        <Card
                          key={tab.id}
                          className="shadow-md rounded-2xl w-full py-4 min-h-20"
                        >
                          <CardContent className="space-y-2">
                            {/* FIX: text-gray-700 doesn't respect dark mode —
                                use text-foreground instead throughout */}
                            <h3 className="text-md font-medium text-foreground">
                              {tab.label}
                            </h3>
                            <div className="flex flex-row justify-between items-start gap-4">
                              <div className="text-xs text-muted-foreground max-w-[70%]">
                                <p>
                                  <span className="font-semibold">Prompt:</span>{" "}
                                  {tab.prompt && tab.prompt.length > 100
                                    ? `${tab.prompt.substring(0, 100)}...`
                                    : tab.prompt}
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
                      ),
                  )}
                  <Button onClick={handleSaveFileViewerTabs} className="w-full">
                    Save File Viewer Configuration
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">No tabs configured</p>
              )}
            </div>
          )}

          {/* ── LLM Tab ── */}
          {activeTab === "llm" && (
            <div className="w-full h-fit space-y-4 px-4 py-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
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
                <label className="block text-sm font-medium text-foreground mb-2">
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
                <label className="block text-sm font-medium text-foreground mb-2">
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

          {activeTab === "advanced" && (
            <div className="w-full space-y-6 px-4 py-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
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
                  <label className="block text-sm font-medium text-foreground">
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
                  <label className="block text-sm font-medium text-foreground">
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
                <label className="block text-sm font-medium text-foreground">
                  Chat Prompt
                </label>
                <textarea
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y text-foreground"
                  placeholder="Enter system prompt for this provider..."
                />
              </div>

              <Button onClick={handleSaveLLM} className="w-full">
                Save Advanced Configuration
              </Button>
            </div>
          )}

          {/* ── Chats Tab ── */}
          {activeTab === "chats" && <ChatsTab />}
        </div>
      </div>
    </div>
  );
}
