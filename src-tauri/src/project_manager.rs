use crate::models::*;
use std::fs;
use std::path::PathBuf;

/// Get the config.json path from the project path
fn get_config_path(project_path: &str) -> PathBuf {
    PathBuf::from(project_path).join("config.json")
}

/// Read and parse the config.json file
#[tauri::command]
pub fn get_config(project_path: String) -> Result<Config, String> {
    let config_path = get_config_path(&project_path);

    if !config_path.exists() {
        return Err(format!(
            "Config file not found at: {}",
            config_path.display()
        ));
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: Config = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config JSON: {}", e))?;

    Ok(config)
}

/// Update the config.json file
#[tauri::command]
pub fn update_config(project_path: String, config: Config) -> Result<(), String> {
    let config_path = get_config_path(&project_path);

    let json_content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, json_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

/// Get a list of previous projects by scanning a base directory
#[tauri::command]
pub fn get_previous_projects(base_path: String) -> Result<Vec<BasicConfig>, String> {
    let base = PathBuf::from(&base_path);

    if !base.exists() {
        return Ok(Vec::new());
    }

    let mut projects = Vec::new();

    let entries = fs::read_dir(&base).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            let config_path = path.join("config.json");

            if config_path.exists() {
                // Try to read the config
                if let Ok(content) = fs::read_to_string(&config_path) {
                    if let Ok(config) = serde_json::from_str::<Config>(&content) {
                        if !config.basic_config.is_empty() {
                            projects.push(config.basic_config[0].clone());
                        }
                    }
                }
            }
        }
    }

    Ok(projects)
}

/// Create a new project with a default config.json
#[tauri::command]
pub fn create_new_project(project: BasicConfig) -> Result<BasicConfig, String> {
    let project_path = PathBuf::from(&project.project_path);

    // Create the project directory if it doesn't exist
    if !project_path.exists() {
        fs::create_dir_all(&project_path)
            .map_err(|e| format!("Failed to create project directory: {}", e))?;
    }

    // Create resources directory if it doesn't exist
    let resources_path = PathBuf::from(&project.resoures_path);
    if !resources_path.exists() {
        fs::create_dir_all(&resources_path)
            .map_err(|e| format!("Failed to create resources directory: {}", e))?;
    }

    // Create a default config
    let default_config = Config {
        basic_config: vec![project.clone()],
        bookmarks: Vec::new(),
        knowledge_store_config: KnowledgeStoreConfig { files: Vec::new() },
        tabs_config: TabsConfig {
            tabs: vec![
                Tab {
                    id: "view".to_string(),
                    label: "View".to_string(),
                    prompt: "Prompt goes here".to_string(),
                },
                Tab {
                    id: "summary".to_string(),
                    label: "Summary".to_string(),
                    prompt: "Prompt goes here".to_string(),
                },
                Tab {
                    id: "contributions".to_string(),
                    label: "Contributions".to_string(),
                    prompt: "Prompt goes here".to_string(),
                },
                Tab {
                    id: "critical-analysis".to_string(),
                    label: "Analysis".to_string(),
                    prompt: "Prompt goes here".to_string(),
                },
                Tab {
                    id: "dictionary".to_string(),
                    label: "Dictionary".to_string(),
                    prompt: "Prompt goes here".to_string(),
                },
                Tab {
                    id: "future-work".to_string(),
                    label: "Future".to_string(),
                    prompt: "Prompt goes here".to_string(),
                },
            ],
            custom_tabs: Vec::new(),
        },
        llm_config: vec![
            LLMConfig {
                name: "openai".to_string(),
                label: "GPT-3.5".to_string(),
                value: "gpt-3.5".to_string(),
                api_key: String::new(),
            },
            LLMConfig {
                name: "google".to_string(),
                label: "Gemini".to_string(),
                value: "gemini".to_string(),
                api_key: String::new(),
            },
            LLMConfig {
                name: "anthropic".to_string(),
                label: "Claude".to_string(),
                value: "claude".to_string(),
                api_key: String::new(),
            },
            LLMConfig {
                name: "xai".to_string(),
                label: "Grok".to_string(),
                value: "grok".to_string(),
                api_key: String::new(),
            },
        ],
        embeddings_config: vec![
            EmbeddingsConfig {
                name: "openai".to_string(),
                label: "OpenAI".to_string(),
                value: "openai".to_string(),
                api_key: String::new(),
            },
            EmbeddingsConfig {
                name: "google".to_string(),
                label: "Gemini".to_string(),
                value: "gemini".to_string(),
                api_key: String::new(),
            },
            EmbeddingsConfig {
                name: "voyage".to_string(),
                label: "Voyage".to_string(),
                value: "voyage".to_string(),
                api_key: String::new(),
            },
        ],
        vector_store_config: vec![
            VectorStoreConfig {
                name: "Pinecone".to_string(),
                label: "Pinecone".to_string(),
                value: "Pinecone".to_string(),
                api_key: String::new(),
            },
            VectorStoreConfig {
                name: "Weaviate".to_string(),
                label: "Weaviate".to_string(),
                value: "weaviate".to_string(),
                api_key: String::new(),
            },
            VectorStoreConfig {
                name: "Chroma".to_string(),
                label: "Chroma".to_string(),
                value: "chroma".to_string(),
                api_key: String::new(),
            },
        ],
    };

    // Write config to file
    let config_path = project_path.join("config.json");
    let json_content = serde_json::to_string_pretty(&default_config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, json_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(project)
}

/// List files and directories in a given path
#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<FileItem>, String> {
    let dir_path = PathBuf::from(&path);

    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut items = Vec::new();

    let entries =
        fs::read_dir(&dir_path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();
        let is_directory = entry_path.is_dir();

        let extension = if !is_directory {
            entry_path
                .extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_string())
        } else {
            None
        };

        let name = entry.file_name().to_string_lossy().to_string();

        items.push(FileItem {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_directory,
            extension,
        });
    }

    // Sort: directories first, then files
    items.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(items)
}

/// Create a new directory
#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    let dir_path = PathBuf::from(&path);

    fs::create_dir_all(&dir_path).map_err(|e| format!("Failed to create directory: {}", e))?;

    Ok(())
}

/// Read file contents
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    if !file_path.is_file() {
        return Err(format!("Path is not a file: {}", path));
    }

    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write content to a file
#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let file_path = PathBuf::from(&path);

    // Create parent directories if they don't exist
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
    }

    fs::write(&file_path, content).map_err(|e| format!("Failed to write file: {}", e))
}

/// Map file extension to a readable type
#[tauri::command]
pub fn map_extension_to_type(extension: String) -> String {
    match extension.to_lowercase().as_str() {
        "pdf" => "PDF Document",
        "txt" => "Text File",
        "md" => "Markdown",
        "doc" | "docx" => "Word Document",
        "xls" | "xlsx" => "Excel Spreadsheet",
        "ppt" | "pptx" => "PowerPoint Presentation",
        "json" => "JSON File",
        "xml" => "XML File",
        "csv" => "CSV File",
        "html" | "htm" => "HTML Document",
        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "svg" => "Image",
        "mp4" | "avi" | "mov" | "mkv" => "Video",
        "mp3" | "wav" | "flac" => "Audio",
        "zip" | "rar" | "7z" | "tar" | "gz" => "Archive",
        "rs" => "Rust Source",
        "py" => "Python Source",
        "js" | "ts" => "JavaScript/TypeScript",
        "java" => "Java Source",
        "cpp" | "c" | "h" => "C/C++ Source",
        _ => "Unknown",
    }
    .to_string()
}

/// Upload a file to the knowledge store (adds it to config)
#[tauri::command]
pub fn upload_to_knowledge_store(
    project_path: String,
    file_path: String,
    feed_llm: String,
) -> Result<(), String> {
    // Read current config
    let mut config = get_config(project_path.clone())?;

    // Extract file name from path
    let path = PathBuf::from(&file_path);
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid file path".to_string())?
        .to_string();

    // Check if file already exists in knowledge store
    let exists = config
        .knowledge_store_config
        .files
        .iter()
        .any(|f| f.file_path == file_path);

    if exists {
        return Err("File already exists in knowledge store".to_string());
    }

    // Add file to knowledge store
    let knowledge_file = KnowledgeFile {
        file_name,
        file_path,
        feed_llm,
    };

    config.knowledge_store_config.files.push(knowledge_file);

    // Save updated config
    update_config(project_path, config)?;

    Ok(())
}
