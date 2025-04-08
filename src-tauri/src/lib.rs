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
    Emitter, Listener, Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
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

            let file_menu = SubmenuBuilder::with_id(handle, "file", "File")
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
                .separator()
                .item(&MenuItem::with_id(
                    handle,
                    "save_entity",
                    "Save Entity",
                    false,
                    Some("CmdOrCtrl+S"),
                )?)
                .item(&MenuItem::with_id(
                    handle,
                    "revert_entity",
                    "Revert Changes",
                    false,
                    Some("CmdOrCtrl+R"),
                )?)
                .build()?;
            menu.append(&file_menu)?;

            let window_menu = SubmenuBuilder::with_id(handle, "window", "Window")
                .item(&MenuItem::with_id(
                    handle,
                    "open_scene_tree_window",
                    "Scene Tree",
                    true,
                    None::<&str>,
                )?)
                .build()?;
            menu.append(&window_menu)?;

            let window_clone = window.clone();
            app.set_menu(menu)?;
            app.on_menu_event(move |app_handle: &tauri::AppHandle, event| {
                match event.id().0.as_str() {
                    file_op @ ("save_scene" | "open_scene") => {
                        if window_clone
                            .is_focused()
                            .expect("Couldn't find main window focus status")
                        {
                            app_handle
                                .emit_to("main", "file_operation", file_op)
                                .expect(&format!("Failed to emit {}", file_op));
                        }
                    }
                    "save_entity" => {
                        app_handle
                            .emit_to("inspector", "save_entity", ())
                            .expect("Failed to emit save_entity to inspector");
                    }
                    "revert_entity" => {
                        app_handle
                            .emit_to("inspector", "revert_entity", ())
                            .expect("Failed to emit revert_entity to inspector");
                    }
                    "quit" => {
                        app_handle.exit(0);
                    }
                    _ => return,
                }
            });

            // enable/disable menu items based on focused window
            fn on_focus_change(handle: &tauri::AppHandle, focus_window: String) {
                if let Some(menu) = handle.menu() {
                    if let Some(file_menu) = menu.get("file") {
                        if let Some(submenu) = file_menu.as_submenu() {
                            if let Some(save_item) = submenu.get("save_scene") {
                                if let Some(menu_item) = save_item.as_menuitem() {
                                    let _ = menu_item.set_enabled(focus_window == "main");
                                }
                            }
                            if let Some(open_item) = submenu.get("open_scene") {
                                if let Some(menu_item) = open_item.as_menuitem() {
                                    let _ = menu_item.set_enabled(focus_window == "main");
                                }
                            }
                            if let Some(save_item) = submenu.get("save_entity") {
                                if let Some(menu_item) = save_item.as_menuitem() {
                                    let _ = menu_item.set_enabled(focus_window == "inspector");
                                }
                            }
                            if let Some(save_item) = submenu.get("revert_entity") {
                                if let Some(menu_item) = save_item.as_menuitem() {
                                    let _ = menu_item.set_enabled(focus_window == "inspector");
                                }
                            }
                        }
                    }
                }
            }

            let handle_for_main = handle.clone();
            window.listen("tauri://focus", move |_| {
                on_focus_change(&handle_for_main, "main".to_string())
            });

            let handle_for_created = handle.clone();
            app.listen("tauri://window-created", move |event| {
                if let Ok(payload) = serde_json::from_str::<serde_json::Value>(event.payload()) {
                    if let Some(label) = payload.get("label").and_then(|l| l.as_str()) {
                        let label = label.to_string();
                        if let Some(w) = handle_for_created.get_webview_window(label.as_str()) {
                            let handle_for_focus = handle_for_created.clone();
                            let label_for_focus = label.clone();
                            w.listen("tauri://focus", move |_| {
                                on_focus_change(&handle_for_focus, label_for_focus.clone());
                            });
                        }
                    }
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
