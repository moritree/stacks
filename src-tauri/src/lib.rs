mod lua_init;
use lua_init::{init_lua_thread, tick};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let state = init_lua_thread(window.clone());
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![tick])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
