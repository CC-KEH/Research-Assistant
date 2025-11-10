use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

pub struct PythonServer {
    pub child: Mutex<Option<tauri_plugin_shell::process::CommandChild>>,
}

#[tauri::command]
pub async fn start_python_server(
    app: AppHandle,
    state: State<'_, PythonServer>,
) -> Result<String, String> {
    let mut child_guard = state.child.lock().unwrap();

    if child_guard.is_some() {
        return Ok("Server already running".to_string());
    }

    // In development, use python directly
    // In production, use the bundled executable
    #[cfg(debug_assertions)]
    let python_cmd = "python";

    #[cfg(not(debug_assertions))]
    let python_cmd = {
        let resource_path = app
            .path()
            .resource_dir()
            .map_err(|e| format!("Failed to get resource dir: {}", e))?;
        resource_path
            .join("python-server")
            .to_string_lossy()
            .to_string()
    };

    let sidecar_command = app
        .shell()
        .command(python_cmd)
        .args(&["src-python/main.py"]); // Adjust path as needed

    let (mut rx, child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to start Python server: {}", e))?;

    // Handle stdout/stderr
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => println!("Python: {}", line),
                CommandEvent::Stderr(line) => eprintln!("Python Error: {}", line),
                CommandEvent::Error(err) => eprintln!("Python Command Error: {}", err),
                CommandEvent::Terminated(payload) => {
                    println!("Python server terminated with code: {:?}", payload.code);
                }
                _ => {}
            }
        }
    });

    *child_guard = Some(child);
    Ok("Python server started on http://127.0.0.1:8000".to_string())
}

#[tauri::command]
pub async fn stop_python_server(state: State<'_, PythonServer>) -> Result<String, String> {
    let mut child_guard = state.child.lock().unwrap();

    if let Some(mut child) = child_guard.take() {
        child
            .kill()
            .map_err(|e| format!("Failed to stop server: {}", e))?;
        Ok("Server stopped".to_string())
    } else {
        Ok("Server not running".to_string())
    }
}

#[tauri::command]
pub async fn check_python_server(state: State<'_, PythonServer>) -> Result<bool, String> {
    let child_guard = state.child.lock().unwrap();
    Ok(child_guard.is_some())
}
