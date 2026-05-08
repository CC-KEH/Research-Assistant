use crate::constants::*;
use crate::models::*;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use tauri::Manager;

use std::sync::{OnceLock, RwLock};

static CONFIG_CACHE: OnceLock<RwLock<Option<Config>>> = OnceLock::new();

#[tauri::command]
pub fn get_cache() -> &'static RwLock<Option<Config>> {
    CONFIG_CACHE.get_or_init(|| RwLock::new(None))
}

#[tauri::command]
pub fn clear_config_cache() -> Result<(), String> {
    if let Ok(mut cache) = get_cache().write() {
        *cache = None;
    }
    Ok(())
}

fn get_registry_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    Ok(app_data_dir.join("projects.json"))
}

fn save_project_to_registry(
    app_handle: &tauri::AppHandle,
    config: &BasicConfig,
) -> Result<(), String> {
    let registry_path = get_registry_path(app_handle)?;

    // Read existing projects
    let mut projects: Vec<BasicConfig> = if registry_path.exists() {
        let content = fs::read_to_string(&registry_path)
            .map_err(|e| format!("Failed to read registry: {}", e))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    // Add if not already present
    if !projects
        .iter()
        .any(|p| p.project_path == config.project_path)
    {
        projects.push(config.clone());
    }

    let json = serde_json::to_string_pretty(&projects)
        .map_err(|e| format!("Failed to serialize registry: {}", e))?;
    fs::write(&registry_path, json).map_err(|e| format!("Failed to write registry: {}", e))?;

    Ok(())
}

// Read and parse the config.json file
#[tauri::command]
pub fn get_config(config_path: String) -> Result<Config, String> {
    {
        let cache = get_cache().read().map_err(|e| e.to_string())?;
        if let Some(config) = cache.as_ref() {
            return Ok(config.clone());
        }
    }

    // Cache miss — read from disk
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: Config = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config JSON: {}", e))?;

    // Populate cache
    if let Ok(mut cache) = get_cache().write() {
        *cache = Some(config.clone());
    }

    Ok(config)
}

#[tauri::command]
pub fn update_config(config_path: String, config: Config) -> Result<(), String> {
    // Update cache first so concurrent readers see fresh data immediately
    if let Ok(mut cache) = get_cache().write() {
        *cache = Some(config.clone());
    }

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content).map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

fn get_projects_file_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    Ok(app_data_dir.join("projects.json"))
}

#[tauri::command]
pub fn get_previous_projects(app_handle: tauri::AppHandle) -> Result<Vec<BasicConfig>, String> {
    let projects_file = get_projects_file_path(&app_handle)?;

    if !projects_file.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&projects_file)
        .map_err(|e| format!("Failed to read projects.json: {}", e))?;

    let projects: Vec<BasicConfig> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse projects.json: {}", e))?;

    let original_count = projects.len();

    let valid_projects: Vec<BasicConfig> = projects
        .into_iter()
        .filter(|p| Path::new(&p.project_path).exists())
        .collect();

    if valid_projects.len() != original_count {
        let updated = serde_json::to_string_pretty(&valid_projects)
            .map_err(|e| format!("Failed to serialize projects.json: {}", e))?;
        fs::write(&projects_file, updated)
            .map_err(|e| format!("Failed to write projects.json: {}", e))?;
    }

    Ok(valid_projects)
}

#[tauri::command]
pub fn create_new_project(
    app_handle: tauri::AppHandle,
    project: BasicConfig,
) -> Result<BasicConfig, String> {
    let project_path = PathBuf::from(&project.project_path).join(&project.project_name);

    let new_project_config = BasicConfig {
        project_name: project.project_name.clone(),
        project_path: project_path.to_string_lossy().to_string(),
        active_llm_provider: project.active_llm_provider.clone(),
    };

    log::info!(
        "📁 [create_new_project] : Creating project in {}",
        project_path.display()
    );

    // Create the project directory if it doesn't exist
    if !project_path.exists() {
        fs::create_dir_all(&project_path)
            .map_err(|e| format!("Failed to create project directory: {}", e))?;
    }

    // Create default tabs
    let tabs = vec![
        Tab {
            id: "view".to_string(),
            label: "View".to_string(),
            enabled: true,
            prompt: "No prompt required.".to_string(),
        },
        Tab {
            id: "summary".to_string(),
            label: "Summary".to_string(),
            enabled: true,
            prompt: default_summary_template.to_string(),
        },
        Tab {
            id: "contributions".to_string(),
            label: "Contributions".to_string(),
            enabled: true,
            prompt: default_contributions_template.to_string(),
        },
        Tab {
            id: "critical-analysis".to_string(),
            label: "Analysis".to_string(),
            enabled: true,
            prompt: default_critical_analysis_template.to_string(),
        },
        Tab {
            id: "future-work".to_string(),
            label: "Future".to_string(),
            enabled: true,
            prompt: default_future_work_template.to_string(),
        },
        Tab {
            id: "arxiv".to_string(),
            label: "Arxiv".to_string(),
            enabled: true,
            prompt: default_arxiv_template.to_string(),
        },
    ];

    // Create default LLM config
    let mut llm_config = HashMap::new();
    llm_config.insert(
        "anthropic".to_string(),
        LLMConfig {
            label: "Claude".to_string(),
            model: "claude-2".to_string(),
            api_key: String::new(),
            temperature: 0.7,
            max_tokens: 1000,
            chat_prompt: default_chat_prompt.to_string(),
        },
    );
    llm_config.insert(
        "google".to_string(),
        LLMConfig {
            label: "Gemini".to_string(),
            model: "gemini-pro".to_string(),
            api_key: String::new(),
            temperature: 0.7,
            max_tokens: 1000,
            chat_prompt: default_chat_prompt.to_string(),
        },
    );
    llm_config.insert(
        "openai".to_string(),
        LLMConfig {
            label: "ChatGPT".to_string(),
            model: "gpt-3.5".to_string(),
            api_key: String::new(),
            temperature: 0.7,
            max_tokens: 1000,
            chat_prompt: default_chat_prompt.to_string(),
        },
    );
    llm_config.insert(
        "deepseek".to_string(),
        LLMConfig {
            label: "DeepSeek V3".to_string(),
            model: "deepseek-chat".to_string(),
            api_key: String::new(),
            temperature: 0.7,
            max_tokens: 1000,
            chat_prompt: default_chat_prompt.to_string(),
        },
    );

    // Create a default config
    let default_config = Config {
        basic_config: new_project_config.clone(),
        knowledge_store_config: KnowledgeStoreConfig { files: Vec::new() },
        tabs_config: TabsConfig {
            tabs,
            custom_tabs: Vec::new(),
        },
        llm_config,
        todos: Vec::new(),
        annotations: None,
    };

    // Write config.json
    let config_path = project_path.join("config.json");
    let json_content = serde_json::to_string_pretty(&default_config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&config_path, json_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    // Write chats.json with empty sessions
    let chats_path = project_path.join("chats.json");
    let default_chats = serde_json::json!({
        "sessions": {
            "sessions": []
        }
    });
    let chats_content = serde_json::to_string_pretty(&default_chats)
        .map_err(|e| format!("Failed to serialize chats: {}", e))?;
    fs::write(&chats_path, chats_content)
        .map_err(|e| format!("Failed to write chats file: {}", e))?;

    // Create subdirectories
    fs::create_dir_all(project_path.join("Documents"))
        .map_err(|e| format!("Failed to create Documents directory: {}", e))?;
    fs::create_dir_all(project_path.join("Notes"))
        .map_err(|e| format!("Failed to create Notes directory: {}", e))?;
    fs::create_dir_all(project_path.join("Papers"))
        .map_err(|e| format!("Failed to create Papers directory: {}", e))?;

    save_project_to_registry(&app_handle, &new_project_config)?;
    Ok(new_project_config)
}

#[tauri::command]
pub fn get_library_tree(project_path: String) -> Result<Vec<TreeNode>, String> {
    log::info!(
        "📁 [get_library_tree] : Loading Library Tree from: {}",
        project_path
    );
    let path = Path::new(&project_path);

    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }

    if !path.is_dir() {
        return Err(format!("Project path is not a directory: {}", project_path));
    }

    let mut counter = Counter { value: 0 };
    read_directory_recursive(path, &mut counter)
}

struct Counter {
    value: u32,
}

impl Counter {
    fn next(&mut self) -> String {
        self.value += 1;
        self.value.to_string()
    }
}

const EXCLUDED_NAMES: &[&str] = &["vector_store", "config.json", "chats.json"];

fn read_directory_recursive(path: &Path, counter: &mut Counter) -> Result<Vec<TreeNode>, String> {
    let mut nodes = Vec::new();

    match fs::read_dir(path) {
        Ok(entries) => {
            let mut entries: Vec<_> = entries.collect();

            entries.sort_by(|a, b| {
                let a_name = a
                    .as_ref()
                    .ok()
                    .and_then(|e| e.file_name().into_string().ok())
                    .unwrap_or_default()
                    .to_lowercase();
                let b_name = b
                    .as_ref()
                    .ok()
                    .and_then(|e| e.file_name().into_string().ok())
                    .unwrap_or_default()
                    .to_lowercase();
                a_name.cmp(&b_name)
            });

            for entry in entries {
                match entry {
                    Ok(entry) => {
                        let entry_path = entry.path();

                        if let Some(file_name) = entry_path.file_name() {
                            if let Some(name_str) = file_name.to_str() {
                                if name_str.starts_with('.') {
                                    continue;
                                }
                                if EXCLUDED_NAMES.contains(&name_str) {
                                    continue;
                                }
                            }
                        }

                        let label = entry_path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        let should_include = if entry_path.is_dir() {
                            true
                        } else {
                            label.ends_with(".md") || label.ends_with(".pdf")
                        };

                        if !should_include {
                            continue;
                        }

                        let id = counter.next();

                        let node = if entry_path.is_dir() {
                            match read_directory_recursive(&entry_path, counter) {
                                Ok(children) => TreeNode {
                                    id,
                                    label,
                                    path: entry_path.to_string_lossy().to_string(),
                                    node_type: "folder".to_string(),
                                    children: if children.is_empty() {
                                        None
                                    } else {
                                        Some(children)
                                    },
                                },
                                Err(_) => continue,
                            }
                        } else {
                            TreeNode {
                                id,
                                label,
                                path: entry_path.to_string_lossy().to_string(),
                                node_type: "file".to_string(),
                                children: None,
                            }
                        };

                        nodes.push(node);
                    }
                    Err(_) => continue,
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }

    Ok(nodes)
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

#[tauri::command]
pub fn upload_to_library(
    source_path: String,
    destination: String, // pass root, not full destination
) -> Result<FileInfo, String> {
    let source_file_path = PathBuf::from(&source_path);

    if !source_file_path.exists() {
        return Err(format!("File does not exist: {}", source_path));
    }

    let file_name = source_file_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid file path".to_string())?
        .to_string();

    let file_extension = source_file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_lowercase();

    // Construct destination internally, just like upload_to_knowledge_store
    let library_dir = PathBuf::from(&destination);
    if !library_dir.exists() {
        fs::create_dir_all(&library_dir)
            .map_err(|e| format!("Failed to create library directory: {}", e))?;
    }

    let dest_path = library_dir.join(&file_name);
    let destination_path = dest_path
        .to_str()
        .ok_or_else(|| "Invalid destination path".to_string())?
        .to_string();

    fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy file to library: {}", e))?;

    let file_info = FileInfo {
        file_name: file_name.clone(),
        file_type: file_extension,
        file_path: destination_path.clone(),
        file_id: format!("{:?}", dest_path.canonicalize().unwrap_or(dest_path)),
    };

    log::info!(
        "📁 [upload_to_library] : Uploaded file '{}' to library at '{}'",
        file_name,
        destination_path,
    );
    Ok(file_info)
}

#[tauri::command]
pub fn upload_to_knowledge_store(
    source_path: String,
    project_root: String,
    for_llm: bool,
) -> Result<FileInfo, String> {
    // Construct paths
    let config_path = PathBuf::from(&project_root).join("config.json");
    let config_path_str = config_path
        .to_str()
        .ok_or_else(|| "Invalid config path".to_string())?
        .to_string();

    let papers_dir = PathBuf::from(&project_root).join("Papers");

    // Create Papers directory if it doesn't exist
    if !papers_dir.exists() {
        fs::create_dir_all(&papers_dir)
            .map_err(|e| format!("Failed to create Papers directory: {}", e))?;
    }

    // Read current config
    let mut config = get_config(config_path_str.clone())?;

    // Extract file name from path
    let source_file_path = PathBuf::from(&source_path);

    // Verify source file exists
    if !source_file_path.exists() {
        return Err(format!("File does not exist: {}", source_path));
    }

    let file_name = source_file_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid file path".to_string())?
        .to_string();

    // Get file extension
    let file_extension = source_file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_lowercase();

    // Create destination path in Papers directory
    let dest_path = papers_dir.join(&file_name);
    let dest_path_str = dest_path
        .to_str()
        .ok_or_else(|| "Invalid destination path".to_string())?
        .to_string();

    // Check if file already exists in knowledge store
    let exists = config
        .knowledge_store_config
        .files
        .iter()
        .any(|f| f.file_path == dest_path_str);

    if exists {
        return Err("File already exists in knowledge store".to_string());
    }

    // Copy file to Papers directory
    fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy file to Papers directory: {}", e))?;

    // Create file info to return
    let file_info = FileInfo {
        file_name: file_name.clone(),
        file_type: file_extension.clone(),
        file_path: dest_path_str.clone(),
        file_id: format!(
            "{:?}",
            dest_path.canonicalize().unwrap_or(dest_path.clone())
        ),
    };

    // Add file to knowledge store (always fed to LLM)
    let knowledge_file = KnowledgeFile {
        file_name,
        file_path: dest_path_str,
        file_type: file_extension.clone(),
        feed_llm: for_llm,
        is_processed: false,
        file_data: HashMap::new(),
    };

    config.knowledge_store_config.files.push(knowledge_file);

    // Save updated config
    update_config(config_path_str, config)?;

    Ok(file_info)
}

#[tauri::command]
pub fn update_knowledge_store(
    file_path: String,
    project_root: String,
    feed_llm: Option<bool>,
    is_processed: Option<bool>,
    file_data: Option<HashMap<String, serde_json::Value>>,
) -> Result<FileInfo, String> {
    // Construct config path
    let config_path = PathBuf::from(&project_root).join("config.json");
    let config_path_str = config_path
        .to_str()
        .ok_or_else(|| "Invalid config path".to_string())?
        .to_string();

    // Read current config
    let mut config = get_config(config_path_str.clone())?;

    // Find the file in the knowledge store
    let knowledge_file = config
        .knowledge_store_config
        .files
        .iter_mut()
        .find(|f| f.file_path == file_path)
        .ok_or_else(|| format!("File not found in knowledge store: {}", file_path))?;

    // Apply partial updates — only fields that are Some(...)
    if let Some(feed_llm_val) = feed_llm {
        knowledge_file.feed_llm = feed_llm_val;
    }
    if let Some(is_processed_val) = is_processed {
        knowledge_file.is_processed = is_processed_val;
    }
    if let Some(file_data_val) = file_data {
        knowledge_file.file_data = file_data_val;
    }

    // Capture return info before config is moved
    let file_info = FileInfo {
        file_name: knowledge_file.file_name.clone(),
        file_type: knowledge_file.file_type.clone(),
        file_path: knowledge_file.file_path.clone(),
        file_id: format!(
            "{:?}",
            PathBuf::from(&knowledge_file.file_path)
                .canonicalize()
                .unwrap_or(PathBuf::from(&knowledge_file.file_path))
        ),
    };

    // Save updated config
    update_config(config_path_str, config)?;

    Ok(file_info)
}

#[tauri::command]
pub fn delete_item(path: String) -> Result<(), String> {
    let item_path = PathBuf::from(&path);
    if item_path.is_dir() {
        fs::remove_dir_all(&item_path).map_err(|e| format!("Failed to delete folder: {}", e))
    } else {
        fs::remove_file(&item_path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
pub fn save_pdf(file_path: String, pdf_data: Vec<u8>) -> Result<(), String> {
    std::fs::write(&file_path, pdf_data).map_err(|e| format!("Failed to write PDF: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn read_pdf_file(file_path: String) -> Result<String, String> {
    std::fs::read(&file_path)
        .map(|bytes| {
            // Convert bytes to base64
            base64_encode(&bytes)
        })
        .map_err(|e| format!("Failed to read PDF: {}", e))
}

#[tauri::command]
pub fn get_tab_content(
    tab_id: String,
    file_name: String,
    config_path: String,
) -> Result<String, String> {
    // Use cache if available, avoids racing with update_config's file write
    let config = get_config(config_path.clone())?;

    let Some(file_info) = config
        .knowledge_store_config
        .files
        .iter()
        .find(|f| f.file_name == file_name)
    else {
        return Ok(String::new());
    };

    Ok(file_info
        .file_data
        .get(&tab_id)
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_default())
}

fn base64_encode(data: &[u8]) -> String {
    use base64::{engine::general_purpose, Engine as _};
    general_purpose::STANDARD.encode(data)
}
