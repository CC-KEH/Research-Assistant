use serde::{Deserialize, Serialize};

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
    pub llm_config: LLMConfig,
    pub embeddings_config: EmbeddingsConfig,
    pub vector_store_config: VectorStoreConfig,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BasicConfig {
    pub project_name: String,
    pub project_path: String,
    pub resoures_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bookmark {
    pub file_name: String,
    pub page_no: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeStoreConfig {
    pub files: Vec<KnowledgeFile>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeFile {
    pub file_name: String,
    pub file_path: String,
    pub feed_llm: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabsConfig {
    pub tabs: Vec<Tab>,
    pub custom_tabs: Vec<Tab>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tab {
    pub id: String,
    pub label: String,
    pub prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMConfig {
    pub name: String,
    pub label: String,
    pub value: String,
    pub api_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingsConfig {
    pub name: String,
    pub label: String,
    pub value: String,
    pub api_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorStoreConfig {
    pub name: String,
    pub label: String,
    pub value: String,
    pub api_key: String,
}
