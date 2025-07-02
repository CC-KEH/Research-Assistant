import { ChatOpenAI } from "@langchain/openai";

export const model = new ChatOpenAI({
  model: "gpt-4",
  apiKey: "",
  temperature: 0.8,
});
