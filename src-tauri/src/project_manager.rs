use crate::models::{
    BasicConfig, Bookmark, Config, EmbeddingsConfig, KnowledgeFile, KnowledgeStoreConfig,
    LLMConfig, Tab, TabsConfig, VectorStoreConfig,
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectEntry {
    pub project_name: String,
    pub project_path: String,
}

#[tauri::command]
pub fn read_file(file_path: &str) -> Result<String, String> {
    fs::read_to_string(file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(file_path: &str, content: &str) -> Result<(), String> {
    fs::write(file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_dir(dir_path: &str) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(dir_path)
        .map_err(|e| e.to_string())?
        .map(|res| res.map(|e| e.path().display().to_string()))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(entries)
}

#[tauri::command]
pub fn create_dir(dir_path: &str) -> Result<(), String> {
    if !Path::new(dir_path).exists() {
        fs::create_dir_all(dir_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_config(config_path: &str) -> Result<Config, String> {
    fs::read_to_string(config_path)
        .map_err(|e| e.to_string())
        .and_then(|contents| serde_json::from_str(&contents).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn update_config(config_path: &str, new_config: Config) -> Result<(), String> {
    serde_json::to_string_pretty(&new_config)
        .map_err(|e| e.to_string())
        .and_then(|json| fs::write(config_path, json).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn get_previous_projects() -> Result<Vec<ProjectEntry>, String> {
    // 1️⃣ Get the current working directory (root of your Tauri app)
    let root_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let projects_file = root_dir.join("projects.json");

    // 2️⃣ If file doesn't exist, return an empty Vec
    if !projects_file.exists() {
        return Ok(Vec::new());
    }

    // 3️⃣ Read the JSON file
    let contents = fs::read_to_string(&projects_file).map_err(|e| e.to_string())?;

    // 4️⃣ Deserialize into Vec<ProjectEntry>
    let projects: Vec<ProjectEntry> = serde_json::from_str(&contents).unwrap_or_default();

    // 5️⃣ Return result
    Ok(projects)
}

#[tauri::command]
pub fn create_new_project(
    app_handle: tauri::AppHandle,
    project_name: &str,
    project_path: &str,
    resources_path: &str,
) -> Result<String, String> {
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("🚀 START: Creating new project");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("📝 Project Name: {}", project_name);
    println!("📂 Project Path: {}", project_path);
    println!("📦 Resources Path: {}", resources_path);
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Validate inputs
    if project_name.trim().is_empty() {
        let err = "Project name cannot be empty".to_string();
        println!("❌ ERROR: {}", err);
        return Err(err);
    }

    if project_path.trim().is_empty() {
        let err = "Project path cannot be empty".to_string();
        println!("❌ ERROR: {}", err);
        return Err(err);
    }

    let project_dir = Path::new(project_path);
    println!("✅ Parsed project directory path");

    // 1️⃣ Create main project directory
    println!("\n📁 Step 1: Creating main project directory...");
    if !project_dir.exists() {
        println!("   ↳ Directory doesn't exist, creating...");
        fs::create_dir_all(project_dir).map_err(|e| {
            let err = format!(
                "Failed to create project directory '{}': {}",
                project_dir.display(),
                e
            );
            println!("❌ {}", err);
            err
        })?;
        println!("   ✅ Project directory created successfully");
    } else {
        println!("   ℹ️  Project directory already exists");
    }

    // 2️⃣ Create subdirectories
    println!("\n📁 Step 2: Creating subdirectories...");
    let subdirs = ["Documents", "Notes", "Canvas"];
    for dir in &subdirs {
        println!("   ↳ Creating '{}'...", dir);
        let dir_path = project_dir.join(dir);
        fs::create_dir_all(&dir_path).map_err(|e| {
            let err = format!("Failed to create subdirectory '{}': {}", dir, e);
            println!("❌ {}", err);
            err
        })?;
        println!("   ✅ '{}' created", dir);
    }
    println!("✅ All subdirectories created successfully");

    // 3️⃣ Prepare file paths
    println!("\n📄 Step 3: Preparing file paths...");
    let config_path = project_dir.join("config.json");
    let bookmarks_path = project_dir.join("bookmarks.json");
    let chat_history_path = project_dir.join("chat_history.json");
    println!("   ✅ Config path: {}", config_path.display());
    println!("   ✅ Bookmarks path: {}", bookmarks_path.display());
    println!("   ✅ Chat history path: {}", chat_history_path.display());

    // 4️⃣ Build default Config structure
    println!("\n⚙️  Step 4: Building default configuration...");
    let default_config = Config {
        basic_config: vec![BasicConfig {
            project_name: project_name.to_string(),
            project_path: project_path.to_string(),
            resoures_path: resources_path.to_string(),
        }],
        bookmarks: Vec::<Bookmark>::new(),
        knowledge_store_config: KnowledgeStoreConfig {
            files: Vec::<KnowledgeFile>::new(),
        },
        tabs_config: TabsConfig {
            tabs: vec![Tab {
                id: "1".into(),
                label: "Default Tab".into(),
                prompt: "You can customize this tab later.".into(),
            }],
            custom_tabs: Vec::<Tab>::new(),
        },
        llm_config: LLMConfig {
            name: "default_llm".into(),
            label: "Default LLM".into(),
            value: "gpt-4".into(),
            api_key: "".into(),
        },
        embeddings_config: EmbeddingsConfig {
            name: "default_embeddings".into(),
            label: "Default Embeddings".into(),
            value: "text-embedding-3-small".into(),
            api_key: "".into(),
        },
        vector_store_config: VectorStoreConfig {
            name: "default_vector_store".into(),
            label: "Default Vector Store".into(),
            value: "local".into(),
            api_key: "".into(),
        },
    };
    println!("   ✅ Configuration structure built");

    // 5️⃣ Write config.json
    println!("\n💾 Step 5: Writing config.json...");
    let config_json = serde_json::to_string_pretty(&default_config).map_err(|e| {
        let err = format!("Failed to serialize config: {}", e);
        println!("❌ {}", err);
        err
    })?;
    fs::write(&config_path, config_json).map_err(|e| {
        let err = format!("Failed to write config.json: {}", e);
        println!("❌ {}", err);
        err
    })?;
    println!("   ✅ config.json written successfully");

    // 6️⃣ Initialize empty JSON files
    println!("\n💾 Step 6: Initializing empty JSON files...");

    println!("   ↳ Writing bookmarks.json...");
    fs::write(&bookmarks_path, "{}").map_err(|e| {
        let err = format!("Failed to write bookmarks.json: {}", e);
        println!("❌ {}", err);
        err
    })?;
    println!("   ✅ bookmarks.json created");

    println!("   ↳ Writing chat_history.json...");
    fs::write(&chat_history_path, "{}").map_err(|e| {
        let err = format!("Failed to write chat_history.json: {}", e);
        println!("❌ {}", err);
        err
    })?;
    println!("   ✅ chat_history.json created");

    // 7️⃣ Update global `projects.json` located in app data directory
    println!("\n📋 Step 7: Updating global projects.json...");

    // For Tauri v2, use the path resolver
    let app_dir = app_handle.path().app_data_dir().map_err(|e| {
        let err = format!("Could not determine app data directory: {}", e);
        println!("❌ {}", err);
        err
    })?;

    println!("   ↳ App data directory: {}", app_dir.display());

    // Create app data directory if it doesn't exist
    if !app_dir.exists() {
        println!("   ↳ Creating app data directory...");
        fs::create_dir_all(&app_dir).map_err(|e| {
            let err = format!("Failed to create app data directory: {}", e);
            println!("❌ {}", err);
            err
        })?;
    }

    let projects_file = app_dir.join("projects.json");
    println!("   ↳ Projects file path: {}", projects_file.display());

    let mut projects: Vec<ProjectEntry> = if projects_file.exists() {
        println!("   ↳ Reading existing projects.json...");
        let contents = fs::read_to_string(&projects_file).map_err(|e| {
            let err = format!("Failed to read projects.json: {}", e);
            println!("❌ {}", err);
            err
        })?;
        serde_json::from_str(&contents).unwrap_or_else(|e| {
            println!(
                "   ⚠️  Warning: Could not parse projects.json ({}), starting fresh",
                e
            );
            Vec::new()
        })
    } else {
        println!("   ↳ projects.json doesn't exist, creating new list");
        Vec::new()
    };

    // Prevent duplicates
    let duplicate = projects
        .iter()
        .any(|p| p.project_name == project_name || p.project_path == project_path);

    if duplicate {
        println!("   ⚠️  Project already exists in projects list");
    } else {
        println!("   ↳ Adding project to list...");
        projects.push(ProjectEntry {
            project_name: project_name.to_string(),
            project_path: project_path.to_string(),
        });
        println!("   ✅ Project added to list");
    }

    println!("   ↳ Writing updated projects.json...");
    let updated_json = serde_json::to_string_pretty(&projects).map_err(|e| {
        let err = format!("Failed to serialize projects list: {}", e);
        println!("❌ {}", err);
        err
    })?;
    fs::write(&projects_file, updated_json).map_err(|e| {
        let err = format!("Failed to write projects.json: {}", e);
        println!("❌ {}", err);
        err
    })?;
    println!("   ✅ projects.json updated successfully");

    println!("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("🎉 SUCCESS: Project '{}' created!", project_name);
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    Ok(format!(
        "Project '{}' created successfully at {}",
        project_name, project_path
    ))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub file_type: String,
}

#[tauri::command]
pub fn upload_to_knowledge_store(
    source_path: String,
    project_root: String,
) -> Result<FileInfo, String> {
    let src = PathBuf::from(&source_path);

    if !src.exists() {
        return Err("Source file does not exist".into());
    }

    // Ensure KnowledgeStore folder exists
    let store_dir = Path::new(&project_root).join("KnowledgeStore");
    if !store_dir.exists() {
        fs::create_dir_all(&store_dir).map_err(|e| e.to_string())?;
    }

    let file_name = src
        .file_name()
        .ok_or("Invalid file name")?
        .to_string_lossy()
        .to_string();

    let mut dest = store_dir.join(&file_name);

    // Avoid overwriting by appending a unique suffix
    if dest.exists() {
        let stem = src.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
        let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("");
        let unique_name = if ext.is_empty() {
            format!("{}_{}", stem, Uuid::new_v4())
        } else {
            format!("{}_{}.{}", stem, Uuid::new_v4(), ext)
        };
        dest = store_dir.join(unique_name);
    }

    // Copy the file into KnowledgeStore
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;

    // Gather metadata
    let ext = dest
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_lowercase();

    let file_type = map_extension_to_type(&ext);

    let info = FileInfo {
        id: Uuid::new_v4().to_string(),
        name: dest
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string(),
        path: dest.display().to_string(),
        file_type,
    };

    Ok(info)
}

#[tauri::command]
pub fn map_extension_to_type(ext: &str) -> String {
    match ext {
        "pdf" => "PDF",
        "md" => "Markdown",
        "txt" => "Text",
        "docx" => "Word Document",
        "xlsx" => "Excel Spreadsheet",
        "excalidraw" => "Excalidraw",
        _ => "Unknown",
    }
    .to_string()
}
