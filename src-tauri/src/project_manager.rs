use crate::models::Config;
use std::fs;
use std::path::Path;

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
