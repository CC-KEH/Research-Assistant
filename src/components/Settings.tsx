import { useState } from "react";
import CustomSlider from "@/components/small/Slider";
import CustomSelect from "@/components/small/CustomSelect";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "./ui/text-area";
import { Tabs } from "@/components/ui/Tabs";

const tabs = [
  { id: "llm", label: "LLM" },
  { id: "embeddings", label: "Embeddings" },
  { id: "retrieval", label: "Retrieval" },
  { id: "developer", label: "Developer" },
];

const modelsByProvider: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: "GPT-3.5", value: "gpt-3.5" },
    { label: "GPT-4", value: "gpt-4" },
  ],
  anthropic: [{ label: "Claude 3", value: "claude-3" }],
  google: [{ label: "Gemini Pro", value: "gemini-pro" }],
  xai: [{ label: "Grok-3", value: "grok-3" }],
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("llm");

  // LLM state
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    const defaultModel = modelsByProvider[provider]?.[0]?.value || "";
    setSelectedModel(defaultModel);
  };

  return (
    <div className="flex flex-col justify-center items-center gap-6 max-w-2xl mx-auto py-10">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <Tabs
        tabs={tabs}
        onTabChange={(tabId) => setActiveTab(tabId)}
        className="mb-3"
      />

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
          <Switch />
          <Textarea placeholder="You are a helpful assistant..." />
        </div>
      )}

      {activeTab === "embeddings" && (
        <div className="w-full space-y-4">
          <h2 className="text-xl font-medium">Embeddings</h2>
          <CustomSelect
            label="Embedding Model"
            options={[
              { label: "Embedding 3 Small", value: "text-embedding-3-small" },
              { label: "Embedding 3 Large", value: "text-embedding-3-large" },
            ]}
          />
          <CustomSlider label="Chunk Size" min={100} max={1000} step={100} />
          <CustomSlider label="Chunk Overlap" min={0} max={300} step={10} />
        </div>
      )}

      {activeTab === "retrieval" && (
        <div className="w-full space-y-4">
          <h2 className="text-xl font-medium">Retrieval</h2>
          <CustomSelect
            label="Vector Store Provider"
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

      {activeTab === "developer" && (
        <div className="w-full space-y-4">
          <h2 className="text-xl font-medium">Developer</h2>
          <CustomSelect
            label="Log Level"
            options={[
              { label: "Debug", value: "debug" },
              { label: "Info", value: "info" },
              { label: "Warn", value: "warn" },
              { label: "Error", value: "error" },
            ]}
          />
          <Switch />
          <Switch />
          {/* <CustomInput label="Custom Endpoint URL" type="url" /> */}
        </div>
      )}
    </div>
  );
}
