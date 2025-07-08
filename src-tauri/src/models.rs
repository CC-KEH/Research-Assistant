use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// This matches the JSON structure returned by the API
#[derive(Debug, Serialize, Deserialize)]
pub struct Paper {
    pub id: u32,
    pub name: String,
    pub email: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Config {
    project_name: String,
    project_path: String,
    config_path: String,
    knowledge_store_path: String,

    llms: HashMap<String, String>,
    embeddings: HashMap<String, String>,
    vectorstores: HashMap<String, String>,
}

// {
//   "project_name": "MyApp",
//   "project_path": "./myapp",
//   "config_path": "./myapp/config.json",
//   "knowledge_store_path": "./myapp/ks",

//   "llms": {
//     "openai": "sk-abc",
//     "ollama": ""
//   },
//   "embeddings": {
//     "openai": "sk-abc",
//     "huggingface": "hf-123"
//   },
//   "vectorstores": {
//     "qdrant": "qdrant-api-key"
//   }
// }
