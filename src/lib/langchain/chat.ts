import { model } from "@/lib/langchain/models";
import {
  chat_prompt_value,
  chunks_prompt_value,
  final_combine_prompt_value,
} from "@/lib/langchain/prompts";

const response = await model.invoke(chat_prompt_value);
console.log(`${response.content}`);
