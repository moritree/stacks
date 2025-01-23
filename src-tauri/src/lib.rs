use mlua::prelude::*;
use tauri::Emitter;

#[tauri::command]
async fn init_scene(window: tauri::Window) -> Result<(), String> {
    let lua = Lua::new();
    let scene_code = include_str!("../lua/scene.lua");

    let emit = move |_lua: &Lua, (evt, data): (String, String)| -> mlua::Result<()> {
        window.emit(&evt, data).unwrap();
        Ok(())
    };

    lua.globals()
        .set(
            "emit",
            lua.create_function(emit).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;

    lua.load(scene_code).exec().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![init_scene])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
