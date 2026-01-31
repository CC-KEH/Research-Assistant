import { Textarea } from "./ui/text-area";
import { useState, useEffect } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Card, CardContent } from "./ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { AIConfig, Tab } from "@/lib/types";
import CustomSelect from "@/components/small/CustomSelect";
import { useConfig } from "@/components/providers/ConfigProvider";

const tabs = [
  { id: "file-viewer", label: "File Viewer" },
  { id: "llm", label: "LLM" },
  { id: "embeddings", label: "Embeddings" },
  { id: "vector-store", label: "Vector Store" },
];

const modelsByProvider: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: "GPT-4", value: "gpt-4" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
  ],
  anthropic: [
    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
    { label: "Claude 3 Opus", value: "claude-3-opus-20240229" },
    { label: "Claude 3 Sonnet", value: "claude-3-sonnet-20240229" },
  ],
  google: [
    { label: "Gemini Pro", value: "gemini-pro" },
    { label: "Gemini Pro Vision", value: "gemini-pro-vision" },
  ],
  xai: [{ label: "Grok Beta", value: "grok-beta" }],
};

const embeddingModelsByProvider: Record<
  string,
  { label: string; value: string }[]
> = {
  openai: [
    { label: "text-embedding-3-large", value: "text-embedding-3-large" },
    { label: "text-embedding-3-small", value: "text-embedding-3-small" },
    { label: "text-embedding-ada-002", value: "text-embedding-ada-002" },
  ],
  anthropic: [{ label: "Voyage AI (via Anthropic)", value: "voyage-2" }],
  google: [{ label: "embedding-001", value: "embedding-001" }],
  cohere: [
    { label: "embed-english-v3.0", value: "embed-english-v3.0" },
    { label: "embed-multilingual-v3.0", value: "embed-multilingual-v3.0" },
  ],
  huggingface: [
    {
      label: "sentence-transformers/all-mpnet-base-v2",
      value: "sentence-transformers/all-mpnet-base-v2",
    },
  ],
};

export default function Settings() {
  const {
    config,
    loading,
    updateTabsConfig,
    updateLlmConfig,
    updateEmbeddingsConfig,
    updateVectorStoreConfig,
    updateAIConfig,
  } = useConfig();

  const [activeTab, setActiveTab] = useState("file-viewer");

  // File Viewer state
  const [fileViewerTabs, setFileViewerTabs] = useState<Tab[]>([]);

  // LLM state
  const [selectedLlmName, setSelectedLlmName] = useState("");
  const [selectedLlmModel, setSelectedLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");

  // Embeddings state
  const [selectedEmbeddingName, setSelectedEmbeddingName] = useState("");
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState("");
  const [embeddingApiKey, setEmbeddingApiKey] = useState("");

  // Vector store state
  const [selectedVectorStoreName, setSelectedVectorStoreName] = useState("");
  const [vectorStoreApiKey, setVectorStoreApiKey] = useState("");

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

      // Embeddings Config - Handle array of providers
      if (
        Array.isArray(config.embeddingsConfig) &&
        config.embeddingsConfig.length > 0
      ) {
        const firstEmbedding = config.embeddingsConfig[0];
        setSelectedEmbeddingName(firstEmbedding.name);
        setSelectedEmbeddingModel(firstEmbedding.value);
        setEmbeddingApiKey(firstEmbedding.api_key || "");
      }

      // Vector Store Config - Handle array of providers
      if (
        Array.isArray(config.vectorStoreConfig) &&
        config.vectorStoreConfig.length > 0
      ) {
        const firstVectorStore = config.vectorStoreConfig[0];
        setSelectedVectorStoreName(firstVectorStore.name);
        setVectorStoreApiKey(firstVectorStore.api_key || "");
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
    updateAIConfig([updatedAiConfig]);
  };

  // Save Embeddings Config
  const handleSaveEmbeddings = async () => {
    if (!config || !selectedEmbeddingName) return;

    const updatedEmbeddingsConfig = Array.isArray(config.embeddingsConfig)
      ? config.embeddingsConfig.map((emb) =>
          emb.name === selectedEmbeddingName
            ? {
                ...emb,
                value: selectedEmbeddingModel,
                api_key: embeddingApiKey,
              }
            : emb,
        )
      : [
          {
            name: selectedEmbeddingName,
            label: selectedEmbeddingName,
            value: selectedEmbeddingModel,
            api_key: embeddingApiKey,
          },
        ];

    // If the provider doesn't exist, add it
    if (
      !updatedEmbeddingsConfig.some((emb) => emb.name === selectedEmbeddingName)
    ) {
      updatedEmbeddingsConfig.push({
        name: selectedEmbeddingName,
        label: selectedEmbeddingName,
        value: selectedEmbeddingModel,
        api_key: embeddingApiKey,
      });
    }

    updateEmbeddingsConfig(updatedEmbeddingsConfig);

    // Update aiConfig with selected embeddings
    const aiConfig = Array.isArray(config.aiConfig)
      ? config.aiConfig[0]
      : (config.aiConfig as AIConfig);

    const updatedAiConfig: AIConfig = {
      ...aiConfig,
      activeEmbeddings: selectedEmbeddingName,
    };

    // Always pass as array
    updateAIConfig([updatedAiConfig]);
  };

  // Save Vector Store Config
  const handleSaveVectorStore = async () => {
    if (!config || !selectedVectorStoreName) return;

    const updatedVectorStoreConfig = Array.isArray(config.vectorStoreConfig)
      ? config.vectorStoreConfig.map((store) =>
          store.name === selectedVectorStoreName
            ? {
                ...store,
                api_key: vectorStoreApiKey,
              }
            : store,
        )
      : [
          {
            name: selectedVectorStoreName,
            label: selectedVectorStoreName,
            value: selectedVectorStoreName,
            api_key: vectorStoreApiKey,
          },
        ];

    // If the store doesn't exist, add it
    if (
      !updatedVectorStoreConfig.some(
        (store) => store.name === selectedVectorStoreName,
      )
    ) {
      updatedVectorStoreConfig.push({
        name: selectedVectorStoreName,
        label: selectedVectorStoreName,
        value: selectedVectorStoreName,
        api_key: vectorStoreApiKey,
      });
    }

    updateVectorStoreConfig(updatedVectorStoreConfig);

    // Update aiConfig with selected vector store
    const aiConfig = Array.isArray(config.aiConfig)
      ? config.aiConfig[0]
      : (config.aiConfig as AIConfig);

    const updatedAiConfig: AIConfig = {
      ...aiConfig,
      activeVectorStore: selectedVectorStoreName,
    };

    // Always pass as array
    updateAIConfig([updatedAiConfig]);
  };

  // Get provider options from arrays
  const llmProviderOptions = Array.isArray(config?.llmConfig)
    ? config.llmConfig.map((provider) => ({
        label: provider.label,
        value: provider.name,
      }))
    : [];

  const embeddingProviderOptions = Array.isArray(config?.embeddingsConfig)
    ? config.embeddingsConfig.map((provider) => ({
        label: provider.label,
        value: provider.name,
      }))
    : [];

  const vectorStoreProviderOptions = Array.isArray(config?.vectorStoreConfig)
    ? config.vectorStoreConfig.map((provider) => ({
        label: provider.label,
        value: provider.name,
      }))
    : [];

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
              <CustomSelect
                label="LLM Provider"
                value={selectedLlmName}
                onChange={(name) => {
                  setSelectedLlmName(name);
                  const provider = Array.isArray(config?.llmConfig)
                    ? config.llmConfig.find((llm) => llm.name === name)
                    : null;
                  if (provider) {
                    setSelectedLlmModel(provider.value);
                    setLlmApiKey(provider.api_key || "");
                  }
                }}
                options={llmProviderOptions}
              />
              <CustomSelect
                label="Model"
                value={selectedLlmModel}
                onChange={setSelectedLlmModel}
                options={modelsByProvider[selectedLlmName] || []}
                disabled={!selectedLlmName}
              />
              <Textarea
                placeholder="Enter your LLM API Key here..."
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
              />
              <Button onClick={handleSaveLLM} className="w-full">
                Save LLM Configuration
              </Button>
            </div>
          )}

          {/* Embeddings Tab */}
          {activeTab === "embeddings" && (
            <div className="w-full h-fit space-y-4 px-4 py-6 overflow-y-auto scrollbar-thin">
              <CustomSelect
                label="Embedding Provider"
                value={selectedEmbeddingName}
                onChange={(name) => {
                  setSelectedEmbeddingName(name);
                  const provider = Array.isArray(config?.embeddingsConfig)
                    ? config.embeddingsConfig.find((emb) => emb.name === name)
                    : null;
                  if (provider) {
                    setSelectedEmbeddingModel(provider.value);
                    setEmbeddingApiKey(provider.api_key || "");
                  }
                }}
                options={embeddingProviderOptions}
              />
              <CustomSelect
                label="Embedding Model"
                value={selectedEmbeddingModel}
                onChange={setSelectedEmbeddingModel}
                options={embeddingModelsByProvider[selectedEmbeddingName] || []}
                disabled={!selectedEmbeddingName}
              />
              <Textarea
                placeholder="Enter your Embedding API Key here..."
                value={embeddingApiKey}
                onChange={(e) => setEmbeddingApiKey(e.target.value)}
              />
              <Button onClick={handleSaveEmbeddings} className="w-full">
                Save Embeddings Configuration
              </Button>
            </div>
          )}

          {/* Vector Store Tab */}
          {activeTab === "vector-store" && (
            <div className="w-full h-fit space-y-4 px-4 py-6 overflow-y-auto scrollbar-thin">
              <CustomSelect
                label="Vector Store Provider"
                value={selectedVectorStoreName}
                onChange={(name) => {
                  setSelectedVectorStoreName(name);
                  const store = Array.isArray(config?.vectorStoreConfig)
                    ? config.vectorStoreConfig.find((s) => s.name === name)
                    : null;
                  if (store) {
                    setVectorStoreApiKey(store.api_key || "");
                  }
                }}
                options={vectorStoreProviderOptions}
              />
              <Textarea
                placeholder="Enter your Vector Store API Key here..."
                value={vectorStoreApiKey}
                onChange={(e) => setVectorStoreApiKey(e.target.value)}
              />
              <Button onClick={handleSaveVectorStore} className="w-full">
                Save Vector Store Configuration
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
