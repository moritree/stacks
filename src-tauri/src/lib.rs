mod frontend_commands;
mod lua_commands;
mod lua_setup;
mod lua_types;
use frontend_commands::{resize_window, set_frontend_ready, window_scale, SetupState};
use lua_commands::{
    delete_entity, duplicate_entity, get_entity_string, handle_inspector_save, load_scene,
    run_script, save_scene, tick, update_entity,
};
use lua_setup::init_lua_thread;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, SubmenuBuilder},
    Emitter, Manager,
};

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
            let state = init_lua_thread(window.clone())?;
            app.manage(state);

            let handle = app.handle();

            // setup system menu
            let menu = Menu::new(handle)?;
            let stacks_menu = SubmenuBuilder::new(handle, "Stacks")
                .item(&MenuItem::with_id(
                    handle,
                    "quit",
                    "Quit",
                    true,
                    Some("CmdOrCtrl+Q"),
                )?)
                .build()?;
            menu.append(&stacks_menu)?;

            let file_menu = SubmenuBuilder::new(handle, "File")
                .item(&MenuItem::with_id(
                    handle,
                    "save_scene",
                    "Save Scene",
                    true,
                    Some("CmdOrCtrl+S"),
                )?)
                .item(&MenuItem::with_id(
                    handle,
                    "open_scene",
                    "Open Scene",
                    true,
                    Some("CmdOrCtrl+O"),
                )?)
                .build()?;
            menu.append(&file_menu)?;

            app.set_menu(menu)?;
            app.on_menu_event(move |app_handle: &tauri::AppHandle, event| {
                match event.id().0.as_str() {
                    file_op @ ("save_scene" | "open_scene") => {
                        app_handle
                            .emit_to("main", "file_operation", file_op)
                            .expect(&format!("Failed to emit {}", file_op));
                    }
                    "quit" => {
                        app_handle.exit(0);
                    }
                    _ => return,
                }
            });

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
            set_frontend_ready,
            get_entity_string,
            handle_inspector_save
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
