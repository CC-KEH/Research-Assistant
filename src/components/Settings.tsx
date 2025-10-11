import { useState, useEffect } from "react";
import CustomSlider from "@/components/small/Slider";
import CustomSelect from "@/components/small/CustomSelect";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "./ui/text-area";
import { Tabs } from "@/components/ui/Tabs";
import { paperViewerTabs } from "@/lib/tabs";
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
  openai: [
    { label: "GPT-4", value: "gpt-4" },
    { label: "GPT-5", value: "gpt-5" },
  ],
  anthropic: [{ label: "Claude 3", value: "claude-3" }],
  google: [{ label: "Gemini Pro", value: "gemini-pro" }],
  xai: [{ label: "Grok-3", value: "grok-3" }],
};

export default function Settings() {
  const { config, loading, setConfig, reloadConfig } = useConfig();
  // TODO: Use Set and Reload Config as well.

  const [activeTab, setActiveTab] = useState("file-viewer");

  // LLM state
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  // Embeddings state
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState("");

  // Vector store state
  const [selectedVectorStore, setSelectedVectorStore] = useState("");

  useEffect(() => {
    if (!loading && config) {
      if (config.llmConfig) {
        setSelectedProvider(config.llmConfig.name || "");
        setSelectedModel(config.llmConfig.value || "");
      }

      if (config.embeddingsConfig) {
        setSelectedEmbeddingModel(config.embeddingsConfig.value || "");
      }

      if (config.vectorStoreConfig) {
        setSelectedVectorStore(config.vectorStoreConfig.value || "");
      }
    }
  }, [loading, config]);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    const defaultModel = modelsByProvider[provider]?.[0]?.value || "";
    setSelectedModel(defaultModel);
  };

  return (
    <div className="flex flex-col justify-center items-center gap-6 max-w-2xl mx-auto py-10 h-full">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <Tabs
        tabs={tabs}
        onTabChange={(tabId) => setActiveTab(tabId)}
        className="mb-3"
      />

      {activeTab === "file-viewer" && (
        <div className="w-full h-fit space-y-4">
          <h2 className="text-xl font-medium">File Viewer</h2>
          <div className="w-full max-h-[42vh] overflow-y-auto pr-2 space-y-4 scrollbar-thin">
            {paperViewerTabs.map((tab, index) => (
              <Card
                key={index}
                className="shadow-md rounded-2xl w-full py-4 min-h-20 max-h-30 "
              >
                <CardContent className="space-y-1">
                  <h3 className="text-md font-medium">{tab.label}</h3>
                  <div className="flex flex-row justify-between">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>
                        <span className="font-semibold">Prompt:</span>{" "}
                        {tab.prompt}
                      </p>
                    </div>
                    <div className="flex flex-row gap-2">
                      <Edit2 size={20} />
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex flex-row gap-6">
            <Button variant="outline">New Tab</Button>
            <Button variant="outline">Reset</Button>
            <h4 className="mt-2 ml-52">Only 6 tabs are allowed at max.</h4>
          </div>
        </div>
      )}

      {activeTab === "llm" && (
        <div className="w-full space-y-4">
          <h2 className="text-xl font-medium">LLM</h2>
          <CustomSelect
            label="LLM Provider"
            value={selectedProvider}
            onChange={handleProviderChange}
            options={[
              { label: "Anthropic", value: "anthropic" },
              { label: "Google", value: "google" },
              { label: "OpenAI", value: "openai" },
              { label: "xAI", value: "xai" },
            ]}
          />
          <CustomSelect
            label="Model"
            value={selectedModel}
            onChange={setSelectedModel}
            options={modelsByProvider[selectedProvider] || []}
            disabled={!selectedProvider}
          />
          <CustomSlider label="Temperature" min={0} max={100} step={10} />
          <CustomSlider label="Max Tokens" min={1096} max={4096} step={100} />
          <Textarea
            placeholder={
              config?.llmConfig?.api_key
                ? "API Key already configured"
                : "Enter your LLM API Key here..."
            }
          />
        </div>
      )}

      {activeTab === "embeddings" && (
        <div className="w-full space-y-4">
          <h2 className="text-xl font-medium">Embeddings</h2>
          <CustomSelect
            label="Embedding Model"
            value={selectedEmbeddingModel}
            onChange={setSelectedEmbeddingModel}
            options={[
              { label: "Embedding 3 Small", value: "text-embedding-3-small" },
              { label: "Embedding 3 Large", value: "text-embedding-3-large" },
            ]}
          />
          <CustomSlider label="Chunk Size" min={100} max={1000} step={100} />
          <CustomSlider label="Chunk Overlap" min={0} max={300} step={10} />
        </div>
      )}

      {activeTab === "vector-store" && (
        <div className="w-full space-y-4">
          <h2 className="text-xl font-medium">Vector Store</h2>
          <CustomSelect
            label="Vector Store Provider"
            value={selectedVectorStore}
            onChange={setSelectedVectorStore}
            options={[
              { label: "Pinecone", value: "pinecone" },
              { label: "Weaviate", value: "weaviate" },
              { label: "Chroma", value: "chroma" },
              { label: "Qdrant", value: "qdrant" },
            ]}
          />
          <CustomSlider label="Retrieved Chunks" min={1} max={20} step={1} />
        </div>
      )}
    </div>
  );
}
