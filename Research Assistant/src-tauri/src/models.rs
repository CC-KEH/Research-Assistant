use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// This matches the JSON structure returned by the API
#[derive(Debug, Serialize, Deserialize)]
pub struct Paper {
    pub id: u32,
    pub name: String,
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub basic_config: BasicConfig,
    pub knowledge_store_config: KnowledgeStoreConfig,
    pub tabs_config: TabsConfig,
    pub llm_config: HashMap<String, LLMConfig>,
    pub todos: Vec<Todo>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub annotations: Option<HashMap<String, FileAnnotations>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BasicConfig {
    pub project_name: String,
    pub project_path: String,
    pub active_llm_provider: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub extension: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub file_data: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArxivItem {
    pub id: String,
    pub title: String,
    pub description: String,
    pub authors: Vec<String>,
    pub published_date: String,
    pub link: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub model: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectionHighlight {
    pub id: String,
    pub page_num: u32,
    pub top: f64,
    pub left: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteRect {
    pub top: f64,
    pub left: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextNote {
    pub id: String,
    pub page_num: u32,
    pub rects: Vec<NoteRect>,
    pub selected_text: String,
    pub markdown: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationPoint {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AnnotationTool {
    Pen,
    Highlight,
}

/// One continuous stroke drawn with a pen or highlighter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationPath {
    pub points: Vec<AnnotationPoint>,
    pub tool: AnnotationTool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAnnotations {
    pub page_paths_map: HashMap<String, Vec<AnnotationPath>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub selection_highlights: Option<Vec<SelectionHighlight>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub notes: Option<Vec<TextNote>>,
}
