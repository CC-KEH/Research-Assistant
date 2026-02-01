mod models;
mod project_manager;
mod server_controller;

use project_manager::*;
use server_controller::{
    check_python_server, start_python_server, stop_python_server, PythonServer,
};
use std::sync::Mutex;

use tauri_plugin_log::{Target, TargetKind};

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
        .plugin(tauri_plugin_fs::init()) // Newly added
        .manage(PythonServer {
            child: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            update_config,
            get_previous_projects,
            create_new_project,
            get_library_tree,
            list_dir,
            create_dir,
            read_file,
            write_file,
            delete_item,
            map_extension_to_type,
            upload_to_knowledge_store,
            start_python_server,
            stop_python_server,
            check_python_server,
            save_pdf
        ])
        .setup(|app| {
            // Optional: Auto-start Python server on app launch
            let _handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                println!("App ready. Python server can be started via frontend.");
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
