import { useState, useEffect } from "react";
import CustomSlider from "@/components/small/Slider";
import CustomSelect from "@/components/small/CustomSelect";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "./ui/text-area";
import { Tabs } from "@/components/ui/Tabs";
import { Card, CardContent } from "./ui/card";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/components/providers/ConfigProvider";

const tabs = [
  { id: "file-viewer", label: "File Viewer" },
  { id: "llm", label: "LLM" },
  { id: "embeddings", label: "Embeddings" },
  { id: "vector-store", label: "Vector Store" },
];

const modelsByProvider: Record<string, { label: string; value: string }[]> = {
  openai: [{ label: "GPT-4", value: "gpt-4" }],
  anthropic: [{ label: "Claude", value: "claude" }],
  google: [{ label: "Gemini", value: "gemini" }],
  xai: [{ label: "Grok", value: "grok" }],
};

export default function Settings() {
  const {
    config,
    loading,
    setConfig,
    reloadConfig,
    getTabsConfig,
    getLlmConfig,
    getEmbeddingsConfig,
    getVectorStoreConfig,
  } = useConfig();

  const [activeTab, setActiveTab] = useState("file-viewer");

  // File Viewer state
  const [fileViewerTabs, setFileViewerTabs] = useState<any[]>([]);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);

  // LLM state
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [temperature, setTemperature] = useState(50);
  const [maxTokens, setMaxTokens] = useState(2096);
  const [llmApiKey, setLlmApiKey] = useState("");

  // Embeddings state
  const [selectedEmbeddingProvider, setSelectedEmbeddingProvider] =
    useState("");
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  const [embeddingApiKey, setEmbeddingApiKey] = useState("");

  // Vector store state
  const [selectedVectorStore, setSelectedVectorStore] = useState("");
  const [retrievedChunks, setRetrievedChunks] = useState(5);
  const [vectorStoreApiKey, setVectorStoreApiKey] = useState("");

  useEffect(() => {
    if (!loading && config) {
      // Load File Viewer tabs using helper
      const tabsConfig = getTabsConfig();
      if (tabsConfig?.tabs) {
        setFileViewerTabs(tabsConfig.tabs);
      }

      // Load LLM config using helper
      const llmConfig = getLlmConfig();
      if (llmConfig && Array.isArray(llmConfig)) {
        const activeProvider = llmConfig.find((p) => p.api_key);
        if (activeProvider) {
          setSelectedProvider(activeProvider.name);
          setSelectedModel(activeProvider.value);
          setLlmApiKey(activeProvider.api_key || "");
        } else if (llmConfig.length > 0) {
          setSelectedProvider(llmConfig[0].name);
          setSelectedModel(llmConfig[0].value);
        }
      }

      // Load Embeddings config using helper
      const embeddingsConfig = getEmbeddingsConfig();
      if (embeddingsConfig && Array.isArray(embeddingsConfig)) {
        const activeEmbedding = embeddingsConfig.find((e) => e.api_key);
        if (activeEmbedding) {
          setSelectedEmbeddingProvider(activeEmbedding.name);
          setEmbeddingApiKey(activeEmbedding.api_key || "");
        } else if (embeddingsConfig.length > 0) {
          setSelectedEmbeddingProvider(embeddingsConfig[0].name);
        }
      }

      // Load Vector Store config using helper
      const vectorStoreConfig = getVectorStoreConfig();
      if (vectorStoreConfig && Array.isArray(vectorStoreConfig)) {
        const activeVectorStore = vectorStoreConfig.find((v) => v.api_key);
        if (activeVectorStore) {
          setSelectedVectorStore(activeVectorStore.value);
          setVectorStoreApiKey(activeVectorStore.api_key || "");
        } else if (vectorStoreConfig.length > 0) {
          setSelectedVectorStore(vectorStoreConfig[0].value);
        }
      }
    }
  }, [
    loading,
    config,
    getTabsConfig,
    getLlmConfig,
    getEmbeddingsConfig,
    getVectorStoreConfig,
  ]);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    const defaultModel = modelsByProvider[provider]?.[0]?.value || "";
    setSelectedModel(defaultModel);

    // Load existing API key if available
    const llmConfig = getLlmConfig();
    const providerConfig = llmConfig?.find((p: any) => p.name === provider);
    if (providerConfig?.api_key) {
      setLlmApiKey(providerConfig.api_key);
    } else {
      setLlmApiKey("");
    }
  };

  const handleEmbeddingProviderChange = (provider: string) => {
    setSelectedEmbeddingProvider(provider);

    // Load existing API key if available
    const embeddingsConfig = getEmbeddingsConfig();
    const providerConfig = embeddingsConfig?.find(
      (e: any) => e.name === provider
    );
    if (providerConfig?.api_key) {
      setEmbeddingApiKey(providerConfig.api_key);
    } else {
      setEmbeddingApiKey("");
    }
  };

  const handleVectorStoreChange = (store: string) => {
    setSelectedVectorStore(store);

    // Load existing API key if available
    const vectorStoreConfig = getVectorStoreConfig();
    const storeConfig = vectorStoreConfig?.find((v: any) => v.value === store);
    if (storeConfig?.api_key) {
      setVectorStoreApiKey(storeConfig.api_key);
    } else {
      setVectorStoreApiKey("");
    }
  };

  const handleSaveLLM = async () => {
    if (!config) return;

    const llmConfig = getLlmConfig();
    if (!llmConfig) return;

    const updatedLlmConfig = llmConfig.map((provider: any) => {
      if (provider.name === selectedProvider) {
        return {
          ...provider,
          value: selectedModel,
          api_key: llmApiKey,
        };
      }
      return provider;
    });

    setConfig({
      ...config,
      llmConfig: updatedLlmConfig,
    });

    // Optionally reload config to ensure sync
    await reloadConfig();
  };

  const handleSaveEmbeddings = async () => {
    if (!config) return;

    const embeddingsConfig = getEmbeddingsConfig();
    if (!embeddingsConfig) return;

    const updatedEmbeddingsConfig = embeddingsConfig.map((provider: any) => {
      if (provider.name === selectedEmbeddingProvider) {
        return {
          ...provider,
          api_key: embeddingApiKey,
        };
      }
      return provider;
    });

    setConfig({
      ...config,
      embeddingsConfig: updatedEmbeddingsConfig,
    });

    await reloadConfig();
  };

  const handleSaveVectorStore = async () => {
    if (!config) return;

    const vectorStoreConfig = getVectorStoreConfig();
    if (!vectorStoreConfig) return;

    const updatedVectorStoreConfig = vectorStoreConfig.map((store: any) => {
      if (store.value === selectedVectorStore) {
        return {
          ...store,
          api_key: vectorStoreApiKey,
        };
      }
      return store;
    });

    setConfig({
      ...config,
      vectorStoreConfig: updatedVectorStoreConfig,
    });

    await reloadConfig();
  };

  const handleToggleTab = (tabId: string, enabled: boolean) => {
    // Implement tab enable/disable logic
    console.log(`Toggle tab ${tabId}: ${enabled}`);
  };

  const handleResetTabs = () => {
    // Reset tabs to default
    const tabsConfig = getTabsConfig();
    if (tabsConfig?.tabs) {
      setFileViewerTabs([...tabsConfig.tabs]);
    }
  };

  // Get config values for rendering
  const llmConfigOptions = getLlmConfig();
  const embeddingsConfigOptions = getEmbeddingsConfig();
  const vectorStoreConfigOptions = getVectorStoreConfig();

  return (
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto py-10 h-full">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <div className="justify-center items-center">
        <Tabs
          tabs={tabs}
          onTabChange={(tabId) => setActiveTab(tabId)}
          className="mb-3 items-center"
        />

        {activeTab === "file-viewer" && (
          <div className="w-full h-fit py-10 overflow-y-auto scrollbar-thin">
            {fileViewerTabs.map((tab) => (
              <Card
                key={tab.id}
                className="shadow-md rounded-2xl w-full py-4 min-h-20 max-h-30"
              >
                <CardContent className="space-y-1">
                  <h3 className="text-md font-medium">{tab.label}</h3>
                  <div className="flex flex-row justify-between">
                    <div className="text-xs text-muted-foreground space-y-0.5 max-w-[70%]">
                      <p>
                        <span className="font-semibold">Prompt:</span>{" "}
                        {tab.prompt}
                      </p>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                      <Edit2
                        size={20}
                        className="cursor-pointer hover:text-primary"
                        onClick={() => setEditingTabId(tab.id)}
                      />
                      <Switch
                        onCheckedChange={(checked) =>
                          handleToggleTab(tab.id, checked)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="flex flex-row gap-4 items-center">
              <Button variant="outline">New Tab</Button>
              <Button variant="outline" onClick={handleResetTabs}>
                Reset
              </Button>
              <p className="text-sm text-muted-foreground ml-auto">
                Only 6 tabs are allowed at max.
              </p>
            </div>
          </div>
        )}

        {activeTab === "llm" && (
          <div className="w-full h-fit space-y-4 px-4 overflow-y-auto scrollbar-thin">
            <CustomSelect
              label="LLM Provider"
              value={selectedProvider}
              onChange={handleProviderChange}
              options={
                llmConfigOptions?.map((provider: any) => ({
                  label: provider.label,
                  value: provider.name,
                })) || []
              }
            />
            <CustomSelect
              label="Model"
              value={selectedModel}
              onChange={setSelectedModel}
              options={modelsByProvider[selectedProvider] || []}
              disabled={!selectedProvider}
            />
            <CustomSlider
              label="Temperature"
              min={0}
              max={100}
              step={10}
              defaultValue={temperature}
              onChange={setTemperature}
            />
            <CustomSlider
              label="Max Tokens"
              min={1096}
              max={4096}
              step={100}
              defaultValue={maxTokens}
              onChange={setMaxTokens}
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

        {activeTab === "embeddings" && (
          <div className="w-full h-fit space-y-4 px-4 overflow-y-auto scrollbar-thin">
            <CustomSelect
              label="Embedding Provider"
              value={selectedEmbeddingProvider}
              onChange={handleEmbeddingProviderChange}
              options={
                embeddingsConfigOptions?.map((provider: any) => ({
                  label: provider.label,
                  value: provider.name,
                })) || []
              }
            />
            <CustomSlider
              label="Chunk Size"
              min={100}
              max={1000}
              step={100}
              defaultValue={chunkSize}
              onChange={setChunkSize}
            />
            <CustomSlider
              label="Chunk Overlap"
              min={0}
              max={300}
              step={10}
              defaultValue={chunkOverlap}
              onChange={setChunkOverlap}
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

        {activeTab === "vector-store" && (
          <div className="w-full space-y-4 overflow-y-auto scrollbar-thin">
            <CustomSelect
              label="Vector Store Provider"
              value={selectedVectorStore}
              onChange={handleVectorStoreChange}
              options={
                vectorStoreConfigOptions?.map((store: any) => ({
                  label: store.label,
                  value: store.value,
                })) || []
              }
            />
            <CustomSlider
              label="Retrieved Chunks"
              min={1}
              max={20}
              step={1}
              defaultValue={retrievedChunks}
              onChange={setRetrievedChunks}
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
  );
}
