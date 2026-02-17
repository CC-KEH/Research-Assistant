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
        log::warn!("⚠️  Server already running");
        return Ok("Server already running".to_string());
    }

    #[cfg(debug_assertions)]
    {
        log::info!("🔵 Debug mode: Starting Python server");

        let project_root = std::env::current_dir()
            .map_err(|e| format!("Failed to get current dir: {}", e))?
            .parent()
            .ok_or("Failed to get project root")?
            .to_path_buf();

        let venv_path = project_root.join("src-python").join("env");
        let src_python_dir = project_root.join("src-python");

        let python_exe = venv_path.join("Scripts").join("python.exe");

        // Validate paths
        if !python_exe.exists() {
            return Err(format!(
                "❌ Virtual environment not found at {:?}\nPlease create venv with: python -m venv env",
                venv_path
            ));
        }

        if !src_python_dir.exists() {
            return Err(format!(
                "❌ src-python directory not found at {:?}",
                src_python_dir
            ));
        }

        log::info!("✅ Paths validated");
        log::info!("   Python: {:?}", python_exe);
        log::info!("   Working dir: {:?}", src_python_dir);

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
            .env("PYTHONPATH", &src_python_dir)  // Add src-python to Python path
            .spawn()
            .map_err(|e| {
                format!(
                    "❌ Failed to start Python server: {}\nMake sure Python and Uvicorn are installed in venv",
                    e
                )
            })?;

        let pid = child.id();
        log::info!("🟢 FastAPI server started successfully (PID: {})", pid);
        log::info!("📍 Server URL: http://127.0.0.1:8000");
        log::info!("📍 Auto-reload: enabled (watches for file changes)");

        *child_guard = Some(child);

        Ok(format!(
            "FastAPI server started with PID: {}. Waiting for health check...",
            pid
        ))
    }

    #[cfg(not(debug_assertions))]
    {
        log::info!("🔵 Production mode: Starting Python server");

        let project_path = app
            .path()
            .project_dir()
            .map_err(|e| format!("Failed to get project dir: {}", e))?;

        let src_python_dir = project_path.join("src-python");
        let venv_path = project_path.join("venv");

        let python_exe = venv_path.join("Scripts").join("python.exe");

        // Validate paths
        if !python_exe.exists() {
            return Err(format!(
                "❌ Virtual environment not found at {:?}\nPlease deploy with venv included",
                venv_path
            ));
        }

        if !src_python_dir.exists() {
            return Err(format!(
                "❌ src-python directory not found at {:?}",
                src_python_dir
            ));
        }

        log::info!("✅ Paths validated");
        log::info!("   Python: {:?}", python_exe);
        log::info!("   Working dir: {:?}", src_python_dir);

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
            .env("PYTHONPATH", &src_python_dir)  // Add src-python to Python path
            .spawn()
            .map_err(|e| {
                format!(
                    "❌ Failed to start Python server: {}\nEnsure Python and Uvicorn are installed in venv",
                    e
                )
            })?;

        let pid = child.id();
        log::info!("🟢 FastAPI server started successfully (PID: {})", pid);
        log::info!("📍 Server URL: http://127.0.0.1:8000");

        *child_guard = Some(child);

        Ok(format!(
            "FastAPI server started with PID: {}. Waiting for health check...",
            pid
        ))
    }
}

#[tauri::command]
pub async fn stop_python_server(state: State<'_, PythonServer>) -> Result<String, String> {
    let mut child_guard = state.child.lock().unwrap();

    if let Some(mut child) = child_guard.take() {
        match child.kill() {
            Ok(_) => {
                log::info!("🟢 Python server stopped gracefully");
                // Try to wait for process to terminate (but don't fail if it doesn't)
                let _ = child.wait();
                Ok("Server stopped successfully".to_string())
            }
            Err(e) => {
                log::error!("❌ Failed to stop server: {}", e);
                Err(format!("Failed to stop server: {}", e))
            }
        }
    } else {
        log::warn!("⚠️  Tried to stop server, but none was running");
        Ok("Server not running".to_string())
    }
}

#[tauri::command]
pub async fn check_python_server(state: State<'_, PythonServer>) -> Result<bool, String> {
    let child_guard = state.child.lock().unwrap();
    let is_running = child_guard.is_some();

    if is_running {
        log::debug!("✅ Python server is running");
    } else {
        log::debug!("⚠️  Python server is not running");
    }

    Ok(is_running)
}
