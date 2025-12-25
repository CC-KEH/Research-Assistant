use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_shell::ShellExt;

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

    // Get the shell
    let shell = app.shell();

    #[cfg(debug_assertions)]
    let (_rx, child) = {
        // Development: run from source with venv activated

        let project_root = std::env::current_dir()
            .map_err(|e| format!("Failed to get current dir: {}", e))?
            .parent()
            .ok_or("Failed to get project root")?
            .to_path_buf();

        let venv_path = project_root.join("src-python").join("env");

        // Determine the Python executable path based on OS
        #[cfg(target_os = "windows")]
        let python_exe = venv_path.join("Scripts").join("python.exe");

        #[cfg(not(target_os = "windows"))]
        let python_exe = venv_path.join("bin").join("python");

        // Check if venv exists
        if !python_exe.exists() {
            return Err(format!(
                "Virtual environment not found at {:?}. Please run: python -m venv env",
                venv_path
            ));
        }

        shell
            .command(python_exe)
            .args(&["src-python/app.py"])
            .current_dir(&project_root)
            .spawn()
            .map_err(|e| format!("Failed to start Python server: {}", e))?
    };

    #[cfg(not(debug_assertions))]
    let (_rx, child) = {
        // Production: use bundled resources with venv activated
        let project_path = app
            .path()
            .project_dir()
            .map_err(|e| format!("Failed to get project dir: {}", e))?;
        let python_script = project_path.join("src-python").join("app.py");
        let venv_path = project_path.join("venv");

        // Determine the Python executable path based on OS
        #[cfg(target_os = "windows")]
        let python_exe = venv_path.join("Scripts").join("python.exe");

        #[cfg(not(target_os = "windows"))]
        let python_exe = venv_path.join("bin").join("python");

        shell
            .command(python_exe)
            .args(&[python_script.to_str().unwrap()])
            .spawn()
            .map_err(|e| format!("Failed to start Python server: {}", e))?
    };

    *child_guard = Some(child);

    Ok("Python server started successfully".to_string())
}

#[tauri::command]
pub async fn stop_python_server(state: State<'_, PythonServer>) -> Result<String, String> {
    let mut child_guard = state.child.lock().unwrap();

    if let Some(child) = child_guard.take() {
        child
            .kill()
            .map_err(|e| format!("Failed to stop server: {}", e))?;
        Ok("Server stopped successfully".to_string())
    } else {
        Ok("Server not running".to_string())
    }
}

#[tauri::command]
pub async fn check_python_server(state: State<'_, PythonServer>) -> Result<bool, String> {
    let child_guard = state.child.lock().unwrap();
    Ok(child_guard.is_some())
}
