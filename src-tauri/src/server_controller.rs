use std::sync::Mutex;
use tauri::api::process::{Command, CommandEvent};
use tauri::{Manager, State};

struct PythonServer {
    child: Mutex<Option<std::process::Child>>,
}

#[tauri::command]
async fn start_python_server(state: State<'_, PythonServer>) -> Result<String, String> {
    let mut child_guard = state.child.lock().unwrap();

    if child_guard.is_some() {
        return Ok("Server already running".to_string());
    }

    // In development, use python directly
    // In production, use the bundled executable
    #[cfg(debug_assertions)]
    let python_cmd = "python";

    #[cfg(not(debug_assertions))]
    let python_cmd = tauri::api::process::current_binary()
        .unwrap()
        .parent()
        .unwrap()
        .join("python-server");

    let (mut rx, child) = Command::new(python_cmd)
        .args(&["src-python/main.py"]) // Adjust path as needed
        .spawn()
        .map_err(|e| format!("Failed to start Python server: {}", e))?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => println!("Python: {}", line),
                CommandEvent::Stderr(line) => eprintln!("Python Error: {}", line),
                _ => {}
            }
        }
    });

    *child_guard = Some(child);
    Ok("Python server started".to_string())
}

#[tauri::command]
async fn stop_python_server(state: State<'_, PythonServer>) -> Result<String, String> {
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

fn main() {
    tauri::Builder::default()
        .manage(PythonServer {
            child: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            start_python_server,
            stop_python_server
        ])
        .setup(|app| {
            // Auto-start Python server
            let handle = app.handle();
            tauri::async_runtime::spawn(async move {
                std::thread::sleep(std::time::Duration::from_secs(1));
                // Start server on app launch
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
