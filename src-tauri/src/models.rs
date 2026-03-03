use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// This matches the JSON structure returned by the API
#[derive(Debug, Serialize, Deserialize)]
pub struct Paper {
    pub id: u32,
    pub name: String,
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub basic_config: Vec<BasicConfig>,
    pub bookmarks: Vec<Bookmark>,
    pub knowledge_store_config: KnowledgeStoreConfig,
    pub tabs_config: TabsConfig,
    pub llm_config: HashMap<String, LLMConfig>,
    pub todos: Vec<Todo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BasicConfig {
    pub project_name: String,
    pub project_path: String,
    pub active_llm: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub extension: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bookmark {
    pub file_name: String,
    pub file_path: String,
    pub page_no: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeStoreConfig {
    pub files: Vec<KnowledgeFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeFile {
    pub file_name: String,
    pub file_path: String,
    pub feed_llm: bool,
    pub file_type: String,
    pub is_processed: bool,
    pub file_data: FileData,
}

#[derive(Debug, Serialize, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileData {
    pub summary: String,
    pub critical_analysis: String,
    pub contributions: String,
    pub future_work: String,
    pub arxiv: Vec<Arxiv>,
}

#[derive(Debug, Serialize, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Arxiv {
    pub paper_name: String,
    pub paper_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabsConfig {
    pub tabs: Vec<Tab>,
    pub custom_tabs: Vec<Tab>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tab {
    pub id: String,
    pub label: String,
    pub enabled: bool,
    pub prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMConfig {
    pub label: String,
    pub model_name: String,
    pub api_key: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub chat_prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Todo {
    pub id: i64,
    pub title: String,
    pub priority: String,
    pub date: String,
    pub time: String,
    pub completed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(crate = "serde")]
pub struct TreeNode {
    pub id: String,
    pub label: String,
    pub path: String,
    #[serde(rename = "nodeType")]
    pub node_type: String, // "file" or "folder"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<TreeNode>>,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfo {
    pub file_name: String,
    pub file_type: String,
    pub file_path: String,
    pub file_id: String,
}
