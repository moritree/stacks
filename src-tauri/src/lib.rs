mod lua_setup;
use lua_setup::{
    delete_entity, init_lua_thread, load_scene, resize_window, run_script, save_scene, tick,
    update_entity_property, window_scale,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let state = init_lua_thread(window.clone());
            let state_clone = state.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Destroyed = event {
                    let _ = state_clone.shutdown();
                }
            });
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            tick,
            update_entity_property,
            delete_entity,
            save_scene,
            load_scene,
            run_script,
            resize_window,
            window_scale
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
