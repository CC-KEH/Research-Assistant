use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::State;

pub struct PythonServer {
    pub child: Mutex<Option<Child>>,
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

    #[cfg(debug_assertions)]
    {
        let project_root = std::env::current_dir()
            .map_err(|e| format!("Failed to get current dir: {}", e))?
            .parent()
            .ok_or("Failed to get project root")?
            .to_path_buf();

        let venv_path = project_root.join("src-python").join("env");
        let src_python_dir = project_root.join("src-python");

        let python_exe = venv_path.join("Scripts").join("python.exe");

        if !python_exe.exists() {
            return Err(format!("Virtual environment not found at {:?}", venv_path));
        }

        if !src_python_dir.exists() {
            return Err(format!(
                "src-python directory not found at {:?}",
                src_python_dir
            ));
        }

        log::info!("🔵 Starting Python server with Uvicorn");
        log::info!("🔵 Python: {:?}", python_exe);
        log::info!("🔵 Working dir: {:?}", src_python_dir);

        let child = Command::new(&python_exe)
            .args(&[
                "-m",
                "uvicorn",
                "app:app",
                "--reload",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ])
            .current_dir(&src_python_dir)
            .spawn()
            .map_err(|e| format!("Failed to start Python server: {}", e))?;

        let pid = child.id();
        *child_guard = Some(child);

        Ok(format!("FastAPI server started with PID: {}", pid))
    }

    #[cfg(not(debug_assertions))]
    {
        let project_path = app
            .path()
            .project_dir()
            .map_err(|e| format!("Failed to get project dir: {}", e))?;

        let src_python_dir = project_path.join("src-python");
        let venv_path = project_path.join("venv");

        let python_exe = venv_path.join("Scripts").join("python.exe");

        if !python_exe.exists() {
            return Err(format!("Virtual environment not found at {:?}", venv_path));
        }

        if !src_python_dir.exists() {
            return Err(format!(
                "src-python directory not found at {:?}",
                src_python_dir
            ));
        }

        log::info!("🔵 Starting Python server (production)");

        let child = Command::new(&python_exe)
            .args(&[
                "-m",
                "uvicorn",
                "app:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ])
            .current_dir(&src_python_dir)
            .spawn()
            .map_err(|e| format!("Failed to start Python server: {}", e))?;

        let pid = child.id();
        *child_guard = Some(child);

        Ok(format!("FastAPI server started with PID: {}", pid))
    }
}

#[tauri::command]
pub async fn stop_python_server(state: State<'_, PythonServer>) -> Result<String, String> {
    let mut child_guard = state.child.lock().unwrap();

    if let Some(mut child) = child_guard.take() {
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
