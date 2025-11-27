use std::sync::Mutex;
use tauri::{AppHandle, State};

pub struct PythonServer {
    pub child: Mutex<Option<tauri_plugin_shell::process::CommandChild>>,
}

#[tauri::command]
pub async fn start_python_server(
    app: tauri::AppHandle,
    state: State<'_, PythonServer>,
) -> Result<String, String> {
    let mut child_guard = state.child.lock().unwrap();

    if child_guard.is_some() {
        return Ok("Server already running".to_string());
    }

    // For now, just return a message since the Python server isn't implemented yet
    // When ready, uncomment and use the shell plugin:

    /*
    let shell = app.shell();
    let command = shell.command("python");
    let child = command
        .args(&["src-python/main.py"])
        .spawn()
        .map_err(|e| format!("Failed to start Python server: {}", e))?;

    *child_guard = Some(child);
    */

    Ok("Python server would start here (not implemented yet)".to_string())
}

#[tauri::command]
pub async fn stop_python_server(state: State<'_, PythonServer>) -> Result<String, String> {
    let mut child_guard = state.child.lock().unwrap();

    if let Some(child) = child_guard.take() {
        // When implemented, kill the child process
        // child.kill().map_err(|e| format!("Failed to stop server: {}", e))?;
        Ok("Server would stop here (not implemented yet)".to_string())
    } else {
        Ok("Server not running".to_string())
    }
}

#[tauri::command]
pub async fn check_python_server(state: State<'_, PythonServer>) -> Result<bool, String> {
    let child_guard = state.child.lock().unwrap();
    Ok(child_guard.is_some())
}
