mod constants;
mod models;
mod project_manager;
mod server_controller;

use project_manager::*;
use server_controller::{
    check_python_server, start_python_server, stop_python_server, PythonServer,
};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(PythonServer {
            child: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            update_config,
            clear_config_cache,
            get_previous_projects,
            create_new_project,
            get_library_tree,
            list_dir,
            create_dir,
            read_file,
            write_file,
            delete_item,
            upload_to_library,
            upload_to_knowledge_store,
            get_tab_content,
            start_python_server,
            stop_python_server,
            check_python_server,
            save_pdf,
            read_pdf_file
        ])
        .setup(|app| {
            // Start Python server automatically on app launch
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let state = handle.state::<PythonServer>();
                match start_python_server(handle.clone(), state).await {
                    Ok(msg) => log::info!("🟢 {}", msg),
                    Err(e) => log::error!("❌ Failed to auto-start server: {}", e),
                }
            });
            Ok(())
        })
        // Stop server cleanly when window is destroyed
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<PythonServer>();
                let mut child_guard = state.child.lock().unwrap();
                if let Some(mut child) = child_guard.take() {
                    let _ = child.kill();
                    let _ = child.wait();
                    log::info!("🔴 Server stopped on window close");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
