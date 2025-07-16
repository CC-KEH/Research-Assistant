import { PromptTemplate } from "@langchain/core/prompts";

export const paper_summary_prompt = PromptTemplate.fromTemplate(`
You are a research assistant. Your task is to generate a structured and concise summary of the academic paper below.

"{paper}"

The summary should include:
- Problem Statement
- Methodology
- Key Results
- Conclusion

Be clear and factual. Avoid speculation.
`);

export const paper_contributions_prompt = PromptTemplate.fromTemplate(`
You are a research assistant. Identify and summarize the **key contributions** of the academic paper below.

"{paper}"

Return a structured list of contributions. Focus on novel methods, findings, or insights introduced by the paper.
Avoid general background or boilerplate content.
`);

export const paper_critical_analysis_prompt = PromptTemplate.fromTemplate(`
You are a research assistant. Provide a critical analysis of the following academic paper:

"{paper}"

Your analysis should include:
- Strengths
- Limitations or Weaknesses
- Assumptions
- Potential Biases or Gaps

Be objective and constructive. Base your analysis only on the content of the paper.
`);

export const paper_dictionary_prompt = PromptTemplate.fromTemplate(`
You are a research assistant. Extract and define key technical terms or domain-specific concepts from the following academic paper:

"{paper}"

Return a dictionary-style list of terms with clear and concise definitions. Focus on terms essential for understanding the paper.
`);

export const paper_future_work_prompt = PromptTemplate.fromTemplate(`
You are an AI researcher. Based on the content of the academic paper below, suggest potential directions for future research.

"{paper}"

Respond in bullet points. Each point should be specific, actionable, and grounded in the context of the paper.
`);

export const allPrompts = {
  summarize: paper_summary_prompt,
  contributions: paper_contributions_prompt,
  critical_analysis: paper_critical_analysis_prompt,
  dictionary: paper_dictionary_prompt,
  future_work: paper_future_work_prompt,
};

export type PromptType = keyof typeof allPrompts;
