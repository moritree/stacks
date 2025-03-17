mod frontend_commands;
mod lua_commands;
mod lua_setup;
mod lua_types;
use frontend_commands::{resize_window, set_frontend_ready, window_scale, SetupState};
use lua_commands::{
    delete_entity, duplicate_entity, load_scene, run_script, save_scene, tick, update_entity,
};
use lua_setup::init_lua_thread;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(SetupState {
            frontend_ready: false,
        }))
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let state = init_lua_thread(window.clone());
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            tick,
            update_entity,
            delete_entity,
            duplicate_entity,
            save_scene,
            load_scene,
            run_script,
            resize_window,
            window_scale,
            set_frontend_ready
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
