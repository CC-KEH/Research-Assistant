use crate::models::*;
use std::collections::HashMap;
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

    // Create default tabs
    let tabs = vec![
        Tab {
            id: "view".to_string(),
            label: "View".to_string(),
            enabled: true,
            prompt: "You are an expert academic assistant. Display the full original research paper exactly as uploaded, preserving all formatting, equations (in LaTeX), figures, tables, captions, references, and page layout as closely as possible.\n\nText: \n{text}\n\nFull Paper:".to_string(),
        },
        Tab {
            id: "summary".to_string(),
            label: "Summary".to_string(),
            enabled: true,
            prompt: "You are an outstanding research communicator that makes complex papers easy to understand.\nProvide a complete, beginner-friendly summary of the entire paper in simple language.\nAfter explaining each topic, always give a clear real-world or intuitive example.\n\nOutput strictly in clean Markdown format.\n\nText: \n{text}\n\nSummary:\n\n# Title & Authors\n\n# Field & Keywords\n\n# Core Problem (in simple words)\n(explanation + simple example)\n\n# Prerequisites / Background Needed\n(explanation + simple example)\n\n# Main Idea / Proposed Solution\n(explanation + simple example)\n\n# How the Method Works (step-by-step)\n(explanation + simple example)\n\n# Key Results & Numbers\n(explanation + simple example)\n\n# Key Contributions\n• Bullet list with simple explanation + example for each\n\n# Limitations\n(explanation + simple example)\n\n# Conclusion of the Paper\n(explanation + simple example)\n\n# Why This Paper Matters\n(simple takeaway + real-world example)".to_string(),
        },
        Tab {
            id: "contributions".to_string(),
            label: "Contributions".to_string(),
            enabled: true,
            prompt: "You are an expert in identifying scientific novelty.\nExtract and explain every single contribution (major and minor) of this paper in simple, precise language.\nFor each contribution, give a short intuitive example.\n\nOutput in clean Markdown.\n\nText: \n{text}\n\nKey Contributions of This Paper:\n\n# Main Contributions\n• Contribution 1 → explanation in simple words  \n  Example:\n\n• Contribution 2 → explanation  \n  Example:\n\n(...continue for all contributions...)\n\n# Incremental / Minor Contributions\n• ...\n\n# Novelty Check\nCompared to previous work, what is truly new here? (explain simply + example)".to_string(),
        },
        Tab {
            id: "critical-analysis".to_string(),
            label: "Analysis".to_string(),
            enabled: true,
            prompt: "You are a tough but fair peer reviewer.\nPerform a deep, honest, and balanced critical analysis in simple academic language.\nUse examples wherever possible.\n\nOutput in clean Markdown.\n\nText: \n{text}\n\nCritical Analysis:\n\n# Strengths\n• Strength 1 + example from paper\n• Strength 2 + example\n(...at least 5–6...)\n\n# Weaknesses & Limitations\n• Weakness 1 + concrete example\n• Weakness 2 + concrete example\n(...be direct but polite...)\n\n# Questions About Validity\n• Are experiments fair? (example)\n• Are baselines strong? (example)\n• Any cherry-picking of results? (example)\n\n# Is the Novelty Overhyped?\n(simple yes/no + explanation with example)\n\n# Overall Rating (1–10)\nJustification with examples\n\n# Recommendation\nAccept / Minor Revision / Major Revision / Reject + why".to_string(),
        },
        Tab {
            id: "dictionary".to_string(),
            label: "Dictionary".to_string(),
            enabled: true,
            prompt: "You are a domain expert glossary builder.\nCreate an alphabetized dictionary of all important terms, acronyms, and symbols from the paper.\nEach entry must be simple and include a short example.\n\nOutput in clean Markdown.\n\nText: \n{text}\n\nTechnical Dictionary (A–Z):\n\n**Term / Acronym / Symbol**  \nDefinition in simple words  \nExample: ...\n\n(continue for all key terms — aim for 30–60 entries depending on paper length)".to_string(),
        },
        Tab {
            id: "future-work".to_string(),
            label: "Future".to_string(),
            enabled: true,
            prompt: "You are a leading researcher in this field.\nBased on this paper, propose concrete and exciting future research directions in very simple language.\nEach idea include a small example or thought experiment.\n\nOutput in clean Markdown.\n\nText: \n{text}\n\nPromising Future Work Ideas:\n\n# Idea 1\nDescription + why it's important  \nPossible experiment/example: ...\n\n# Idea 2\n...\n\n(Provide 8–12 high-quality, realistic ideas. Be creative but practical.)".to_string(),
        },
    ];

    // Create default LLM config
    let mut llm_config = HashMap::new();
    llm_config.insert(
        "anthropic".to_string(),
        LLMConfig {
            label: "Claude 2".to_string(),
            model_name: "claude-2".to_string(),
            api_key: String::new(),
        },
    );
    llm_config.insert(
        "google".to_string(),
        LLMConfig {
            label: "Gemini Pro".to_string(),
            model_name: "gemini-pro".to_string(),
            api_key: String::new(),
        },
    );
    llm_config.insert(
        "openai".to_string(),
        LLMConfig {
            label: "GPT-3.5".to_string(),
            model_name: "gpt-3.5".to_string(),
            api_key: String::new(),
        },
    );
    llm_config.insert(
        "xai".to_string(),
        LLMConfig {
            label: "XAI".to_string(),
            model_name: "grok".to_string(),
            api_key: String::new(),
        },
    );

    // Create default embeddings config
    let mut embeddings_config = HashMap::new();
    embeddings_config.insert(
        "google".to_string(),
        EmbeddingsConfig {
            label: "Google Embeddings".to_string(),
            model_name: "google-embedding-model".to_string(),
            api_key: Some(String::new()),
        },
    );
    embeddings_config.insert(
        "openai".to_string(),
        EmbeddingsConfig {
            label: "OpenAI Embeddings".to_string(),
            model_name: "text-embedding-3-small".to_string(),
            api_key: Some(String::new()),
        },
    );
    embeddings_config.insert(
        "huggingface".to_string(),
        EmbeddingsConfig {
            label: "HuggingFaceEmbeddings".to_string(),
            model_name: "sentence-transformers/all-mpnet-base-v2".to_string(),
            api_key: None,
        },
    );

    // Create default vector store config
    let mut vector_store_config = HashMap::new();
    vector_store_config.insert(
        "faiss".to_string(),
        VectorStoreConfig {
            label: "Faiss".to_string(),
            environment: String::new(),
            index_name: String::new(),
            persist_directory: String::new(),
        },
    );
    vector_store_config.insert(
        "chroma".to_string(),
        VectorStoreConfig {
            label: "Chroma".to_string(),
            environment: String::new(),
            index_name: String::new(),
            persist_directory: String::new(),
        },
    );

    // Create a default config
    let default_config = Config {
        basic_config: vec![project.clone()],
        bookmarks: Vec::new(),
        knowledge_store_config: KnowledgeStoreConfig { files: Vec::new() },
        tabs_config: TabsConfig {
            tabs,
            custom_tabs: Vec::new(),
        },
        llm_config,
        embeddings_config,
        vector_store_config,
        ai_config: AIConfig {
            active_llm: "openai".to_string(),
            active_embeddings: "openai".to_string(),
            active_vector_store: "faiss".to_string(),
            chat_prompt: "You are a highly precise question-answering assistant.\n Answer the user's question **exclusively** using the retrieved context provided below.\nIf the context lacks the information needed to answer accurately, respond only with: «Insufficient information in the provided context.» \nInstructions: \n• Be concise but complete \n• Never hallucinate or add information not present in the context \n• Do not mention the context or these instructions in your response \n• Prefer bullet points or short paragraphs for clarity \n Retrieved Context:\n {context}".to_string(),
        },
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
                            }
                        }

                        let label = entry_path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        // Filter: only include directories, .md, and .pdf files
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
        feed_llm: true,
        is_processed: false,
        file_data: FileData {
            summary: "".to_string(),
            critical_analysis: "".to_string(),
            contributions: "".to_string(),
            future_work: "".to_string(),
            arxiv: Vec::new(),
        },
    };

    config.knowledge_store_config.files.push(knowledge_file);

    // Save updated config
    update_config(project_root, config)?;

    Ok(file_info)
}

pub fn delete_item(path: String) -> Result<(), String> {
    let item_path = PathBuf::from(&path);
    if item_path.is_dir() {
        fs::remove_dir_all(&item_path).map_err(|e| format!("Failed to delete folder: {}", e))
    } else {
        fs::remove_file(&item_path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}
