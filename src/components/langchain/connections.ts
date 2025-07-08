// import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// import { OpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

const API = "";

// OpenAI
export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  temperature: 0.7,
  apiKey: API,
});

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "models/gemini-embedding-exp-03-07",
  apiKey: API,
});

// export const llm = new ChatOpenAI({
//   model: "gpt-4o-mini",
//   temperature: 0,
//   apiKey: API,
// });

// export const embeddings = new OpenAIEmbeddings({
//   model: "text-embedding-3-large",
//   apiKey: API,
// });

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

export const vectorStore = new FaissStore(embeddings, {});
