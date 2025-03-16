mod frontend_commands;
mod lua_setup;
use frontend_commands::{resize_window, window_scale};
use lua_setup::{
    delete_entity, duplicate_entity, init_lua_thread, load_scene, run_script, save_scene, tick,
    update_entity,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
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
            window_scale
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
