mod frontend_commands;
mod lua;
mod system_menu;

use frontend_commands::{resize_window, set_frontend_ready, window_scale};
use lua::commands::{
    delete_entity, duplicate_entity, get_entity_string, handle_inspector_save, load_scene,
    new_entity, run_script, save_scene, tick, update_entity,
};
use lua::setup::init_lua_thread;
use system_menu::setup_system_menu;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let state = init_lua_thread(window.clone()).expect("Error initializing lua thread");
            app.manage(state);
            let handle = app.handle();

            // setup system menu
            setup_system_menu(&handle, &app, &window)?;

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            tick,
            new_entity,
            update_entity,
            delete_entity,
            duplicate_entity,
            save_scene,
            load_scene,
            run_script,
            resize_window,
            window_scale,
            set_frontend_ready,
            get_entity_string,
            handle_inspector_save
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
