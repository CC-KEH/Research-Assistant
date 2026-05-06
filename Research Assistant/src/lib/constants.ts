export const tabs = [
  { id: "file-viewer", label: "File Viewer" },
  { id: "llm", label: "LLM" },
  { id: "advanced", label: "Advanced" },
  { id: "chats", label: "Chats" },
];

export const llmProviders = [
  { label: "OpenAI", value: "openai" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Google", value: "google" },
  { label: "DeepSeek", value: "deepseek" },
];

export const modelsByProvider: Record<
  string,
  { label: string; value: string }[]
> = {
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
  deepseek: [
    { label: "DeepSeek V3", value: "deepseek-chat" },
    { label: "DeepSeek R1", value: "deepseek-reasoner" },
  ],
};
