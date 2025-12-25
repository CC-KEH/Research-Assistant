use crate::models::*;
use std::fs;
use std::path::Path;
use std::path::PathBuf;

// Read and parse the config.json file
#[tauri::command]
pub fn get_config(config_path: String) -> Result<Config, String> {
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: Config = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config JSON: {}", e))?;

    Ok(config)
}

// Update the config.json file
#[tauri::command]
pub fn update_config(config_path: String, config: Config) -> Result<(), String> {
    let json_content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, json_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

// Get a list of previous projects by scanning a base directory
fn get_projects_file_path() -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        // During development, read from src-tauri directory
        let project_root =
            std::env::current_dir().map_err(|e| format!("Failed to get current dir: {}", e))?;
        Ok(project_root.join("projects.json"))
    } else {
        // In production, use home directory or app data directory
        if let Some(home) = dirs::home_dir() {
            Ok(home.join(".your_app_name").join("projects.json"))
        } else {
            Err("Failed to determine app data directory".to_string())
        }
    }
}

#[tauri::command]
pub fn get_previous_projects() -> Result<Vec<BasicConfig>, String> {
    let projects_file = get_projects_file_path()?;

    if !projects_file.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&projects_file)
        .map_err(|e| format!("Failed to read projects.json: {}", e))?;
    let projects: Vec<BasicConfig> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse projects.json: {}", e))?;
    Ok(projects)
}

/// Create a new project with a default config.json
#[tauri::command]
pub fn create_new_project(project: BasicConfig) -> Result<BasicConfig, String> {
    let project_path = PathBuf::from(&project.project_path);
    log::info!(
        "📁 [create_new_project] : Creating project in {}",
        project_path.display()
    );

    // Create the project directory if it doesn't exist
    if !project_path.exists() {
        fs::create_dir_all(&project_path)
            .map_err(|e| format!("Failed to create project directory: {}", e))?;
    }

    // Create resources directory if it doesn't exist
    let resources_path = PathBuf::from(&project.resources_path);
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

    // Create 2 directories: Documents, Notes
    fs::create_dir_all(project_path.join("Documents"))
        .map_err(|e| format!("Failed to create Documents directory: {}", e))?;

    fs::create_dir_all(project_path.join("Notes"))
        .map_err(|e| format!("Failed to create Notes directory: {}", e))?;

    // TODO: Add Project BasicConfig to projects.json
    Ok(project)
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

fn read_directory_recursive(path: &Path, counter: &mut Counter) -> Result<Vec<TreeNode>, String> {
    let mut nodes = Vec::new();

    match fs::read_dir(path) {
        Ok(entries) => {
            let mut entries: Vec<_> = entries.collect();

            // Sort entries for consistent ordering
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

                        // Skip hidden files/folders (starting with .)
                        if let Some(file_name) = entry_path.file_name() {
                            if let Some(name_str) = file_name.to_str() {
                                if name_str.starts_with('.') {
                                    continue;
                                }
                            }
                        }

                        let label = entry_path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        let id = counter.next();

                        let node = if entry_path.is_dir() {
                            match read_directory_recursive(&entry_path, counter) {
                                Ok(children) => TreeNode {
                                    id,
                                    label,
                                    children: if children.is_empty() {
                                        None
                                    } else {
                                        Some(children)
                                    },
                                },
                                Err(_) => {
                                    // Skip directories we can't read
                                    continue;
                                }
                            }
                        } else {
                            TreeNode {
                                id,
                                label,
                                children: None,
                            }
                        };

                        nodes.push(node);
                    }
                    Err(_) => {
                        // Skip entries we can't read
                        continue;
                    }
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
    source_path: String,
    project_root: String,
) -> Result<FileInfo, String> {
    // Read current config
    let mut config = get_config(project_root.clone())?;

    // Extract file name from path
    let path = PathBuf::from(&source_path);

    // Verify file exists
    if !path.exists() {
        return Err(format!("File does not exist: {}", source_path));
    }

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid file path".to_string())?
        .to_string();

    // Get file extension
    let file_extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_lowercase();

    // Check if file already exists in knowledge store
    let exists = config
        .knowledge_store_config
        .files
        .iter()
        .any(|f| f.file_path == source_path);

    if exists {
        return Err("File already exists in knowledge store".to_string());
    }

    // Create file info to return
    let file_info = FileInfo {
        name: file_name.clone(),
        file_type: file_extension.clone(),
        path: source_path.clone(),
        id: format!("{:?}", path.canonicalize().unwrap_or(path.clone())),
    };

    // Add file to knowledge store (always fed to LLM)
    let knowledge_file = KnowledgeFile {
        file_name,
        file_path: source_path,
        feed_llm: "true".to_string(),
    };

    config.knowledge_store_config.files.push(knowledge_file);

    // Save updated config
    update_config(project_root, config)?;

    Ok(file_info)
}
