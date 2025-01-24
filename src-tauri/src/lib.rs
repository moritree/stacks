mod lua_init;
use lua_init::{init_lua_thread, tick};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let state = init_lua_thread(window.clone());

            let state_clone = state.clone();
            // Shutting down the clone WILL shut down the actual original state.
            // The `mpsc::Sender` type specifically is designed to work this way
            // a clone isn't a deep copy of the channel, but another handle to it
            // We need a clone bc rust ownership means scope changes lose the var
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Destroyed = event {
                    let _ = state_clone.shutdown();
                }
            });

            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![tick])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
