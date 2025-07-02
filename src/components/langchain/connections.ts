import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

// OpenAI
export const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

export const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

export const vectorStore = new FaissStore(embeddings, {});
