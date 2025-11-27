mod models;
mod project_manager;
mod server_controller;

use project_manager::*;
use server_controller::{
    check_python_server, start_python_server, stop_python_server, PythonServer,
};
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init()) // Newly added
        .manage(PythonServer {
            child: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // Your existing handlers
            get_config,
            update_config,
            get_previous_projects,
            create_new_project,
            list_dir,
            create_dir,
            read_file,
            write_file,
            map_extension_to_type,
            upload_to_knowledge_store,
            // Python server handlers
            start_python_server,
            stop_python_server,
            check_python_server,
        ])
        .setup(|app| {
            // Optional: Auto-start Python server on app launch
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                // You can manually start the server from the frontend instead
                println!("App ready. Python server can be started via frontend.");
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
