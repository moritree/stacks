use mlua::prelude::*;
use serde_json::Value;
use std::fs;
use std::path::Path;
use std::sync::mpsc;
use tauri::{Emitter, Manager, State, WebviewWindow};

/// Hold a reference to the Lua thread communication channel
#[derive(Clone)]
pub struct LuaState {
    tx: mpsc::Sender<LuaMessage>,
}

impl LuaState {
    pub fn shutdown(&self) -> Result<(), String> {
        self.tx.send(LuaMessage::Die).map_err(|e| e.to_string())
    }
}

/// Messages to Lua thread
pub enum LuaMessage {
    /// Game loop tick with the given time difference.
    Tick(f64),
    EmitEvent(String, Value),
    UpdateEntityId(String, String),
    UpdateEntityProperties(String, Value, bool),
    DeleteEntity(String),
    DuplicateEntity(String),
    SaveScene(String),
    LoadScene(String),
    LoadScript(String, String),
    RunScript(String, String),
    Die,
}

/// Set up Lua environment
pub fn init_lua_thread(window: WebviewWindow) -> LuaState {
    let (tx, rx) = mpsc::channel(); // create communication channel
    let event_tx = tx.clone(); // clone sender, multiple parts of code can send messages (rust ownership is weird)
    let w = window.clone();

    let _ = std::thread::Builder::new()
        .name("Lua Environment".to_string())
        .spawn(move || {
            let lua = Lua::new();

            // let lua emit messages that TS can pick up
            let emit = move |_: &Lua, (evt, data): (String, LuaValue)| {
                let json = serde_json::to_value(&data).expect(&format!(
                    "Lua event {}: Couldn't convert data to valid JSON value.",
                    evt
                ));
                event_tx
                    .send(LuaMessage::EmitEvent(evt, json))
                    .map_err(|e| mlua::Error::runtime(e.to_string()))?;
                Ok(())
            };
            lua.globals()
                .set(
                    "emit",
                    lua.create_function(emit)
                        .expect("Couldn't create Lua emit function"),
                )
                .expect("Couldn't set emit global in Lua");

            // intercept & tag lua prints to stdout
            lua.globals()
                .set(
                    "print",
                    lua.create_function(|_, msg: String| {
                        println!("[lua] {}", msg);
                        Ok(())
                    })
                    .expect("Couldn't create Lua custom print function"),
                )
                .expect("Couldn't set print global in Lua");

            // Preload modules
            preload_lua_modules(window, &lua).expect("Failed to preload Lua modules");

            // load main scene
            let lua_main: LuaTable =
                lua // Do this last to minimise risk of any code on .eval() not working
                    .load(include_str!("../resources/lua/main.lua"))
                    .eval()
                    .expect("Couldn't load lua scene file");
            lua.globals()
                .set(
                    "currentScene",
                    lua_main
                        .get::<_, mlua::Table>("scene")
                        .expect("Couldn't get Lua scene"),
                )
                .expect("Couldn't set scene global in Lua");

            // message processing loop
            while let Ok(msg) = rx.recv() {
                match msg {
                    LuaMessage::Tick(dt) => {
                        let scene: LuaTable = lua
                            .globals()
                            .get("currentScene")
                            .expect("Couldn't get Lua scene");
                        let update: LuaFunction = scene
                            .get("emit_update")
                            .expect("Couldn't get Lua emit_update function");
                        update
                            .call::<_, ()>((scene, dt))
                            .expect("Failed calling emit_update")
                    }
                    LuaMessage::UpdateEntityId(original_id, new_id) => {
                        let scene: LuaTable = lua
                            .globals()
                            .get("currentScene")
                            .expect("Couldn't get Lua scene");
                        let id_func: LuaFunction = scene
                            .get("update_entity_id")
                            .expect("Couldn't get Lua update_entity_id function");
                        id_func
                            .call::<_, ()>((scene, original_id, new_id))
                            .expect("Couldn't call update_entity_property")
                    }
                    LuaMessage::UpdateEntityProperties(id, data, complete) => {
                        let scene: LuaTable = lua
                            .globals()
                            .get("currentScene")
                            .expect("Couldn't get Lua scene");
                        let mut function_name: &str = "update_entity_properties";
                        if complete {
                            function_name = "replace_entity";
                        }
                        let update_func: LuaFunction = scene
                            .get(function_name)
                            .expect(&format!("Couldn't get Lua {} function", function_name));
                        update_func
                            .call::<_, ()>((
                                scene,
                                id,
                                json_value_to_lua(&lua, &data)
                                    .expect("Couldn't convert json data to Lua object"),
                            ))
                            .expect(&format!("Couldn't call {}", function_name))
                    }
                    LuaMessage::DeleteEntity(id) => {
                        let scene: LuaTable = lua
                            .globals()
                            .get("currentScene")
                            .expect("Couldn't get Lua scene");
                        let update_func: LuaFunction = scene
                            .get("delete_entity")
                            .expect("Couldn't get Lua delete_entity function");
                        update_func
                            .call::<_, ()>((scene, id))
                            .expect("Couldn't call delete_entity")
                    }
                    LuaMessage::DuplicateEntity(id) => {
                        let scene: LuaTable = lua
                            .globals()
                            .get("currentScene")
                            .expect("Couldn't get Lua scene");
                        let update_func: LuaFunction = scene
                            .get("duplicate_entity")
                            .expect("Couldn't get Lua duplicate_entity function");
                        update_func
                            .call::<_, ()>((scene, id))
                            .expect("Couldn't call duplicate_entity")
                    }
                    LuaMessage::EmitEvent(evt, data) => w
                        .emit(&evt, data)
                        .expect(&format!("Couldn't emit event {}", evt)),
                    LuaMessage::SaveScene(path) => {
                        let scene: LuaTable = lua
                            .globals()
                            .get("currentScene")
                            .expect("Couldn't get Lua scene");
                        let save_func: LuaFunction = scene
                            .get("save_scene")
                            .expect("Couldn't get Lua save_scene function");
                        save_func
                            .call::<_, ()>((scene, path))
                            .expect("Couldn't call save_scene")
                    }
                    LuaMessage::LoadScene(path) => {
                        let scene: LuaTable = lua
                            .globals()
                            .get("currentScene")
                            .expect("Couldn't get Lua scene");
                        let load_func: LuaFunction = scene
                            .get("load_scene")
                            .expect("Couldn't get Lua load_scene function");
                        load_func
                            .call::<_, ()>((scene, path))
                            .expect("Couldn't call load_scene")
                    }
                    LuaMessage::LoadScript(path, id) => {
                        let scene: LuaTable = lua
                            .globals()
                            .get("currentScene")
                            .expect("Couldn't get Lua scene");
                        let scripts_module: LuaTable = lua
                            .load(fs::read_to_string(path).expect("Couldn't load file to string"))
                            .eval()
                            .expect("Couldn't load into table");
                        let update_func: LuaFunction = scene
                            .get("update_entity_properties")
                            .expect("Couldn't get Lua update_entity_properties function");
                        update_func
                            .call::<_, ()>((scene, id, scripts_module))
                            .expect("Couldn't call update_entity_property")
                    }
                    LuaMessage::RunScript(id, function) => {
                        println!("RunScript called");
                        let scene: LuaTable = lua
                            .globals()
                            .get("currentScene")
                            .expect("Couldn't get Lua scene");
                        let entity: LuaTable = scene
                            .get::<_, LuaTable>("entities")
                            .expect("Couldn't get entities table from scene")
                            .get::<_, LuaTable>(id.clone())
                            .expect("Couldn't get entity");
                        let script: LuaFunction =
                            entity.get(function).expect("Couldn't get script function");
                        script
                            .call::<_, ()>((entity, id))
                            .expect("Couldn't call script");
                    }
                    LuaMessage::Die => break, // TODO trigger any shutdown code
                }
            }
        });

    LuaState { tx } // original tx lives here
}

/// Preload Lua modules (at runtime) as part of Lua initialization.
fn preload_lua_modules(window: WebviewWindow, lua: &Lua) -> LuaResult<()> {
    fn get_module_path(base_path: &Path, file_path: &Path) -> Option<String> {
        if let (Some(ext), true) = (file_path.extension(), file_path.is_file()) {
            if ext == "lua" {
                // Make sure we strip the base_path and leading separator
                if let Ok(relative) = file_path.strip_prefix(base_path) {
                    let relative = relative.to_str()?;
                    // Remove leading separator if it exists
                    let relative = relative.trim_start_matches(std::path::MAIN_SEPARATOR);
                    // Remove .lua extension and convert separators to dots
                    return Some(
                        relative
                            .trim_end_matches(".lua")
                            .replace(std::path::MAIN_SEPARATOR, "."),
                    );
                }
            }
        }
        None
    }

    fn scan_directory(
        dir: &Path,
        preload: &LuaTable,
        lua: &Lua,
        loaded: &mut Vec<String>,
    ) -> LuaResult<()> {
        for entry in fs::read_dir(dir).expect("Failed to read directory") {
            let entry = entry.expect("Failed to read directory entry");
            let path = entry.path();

            if path.is_dir() {
                scan_directory(&path, preload, lua, loaded)?;
            } else {
                if let Some(module_name) = get_module_path(&dir, &path) {
                    // Skip main.lua since we load it separately
                    if module_name == "main" || loaded.contains(&module_name) {
                        continue;
                    }

                    let source = fs::read_to_string(&path).expect("Failed to read lua file");
                    let module_name_clone = module_name.clone();

                    preload.set(
                        module_name.as_str(),
                        lua.create_function(move |lua, ()| -> LuaResult<LuaValue> {
                            lua.load(&source)
                                .set_name(&format!("{}.lua", module_name_clone))
                                .eval()
                        })?,
                    )?;
                    loaded.push(module_name);
                }
            }
        }
        Ok(())
    }

    let resource_path = window
        .app_handle()
        .path()
        .resource_dir()
        .expect("Failed to get resource dir")
        .join("resources")
        .join("lua");
    println!(
        "Looking for Lua files in: {}",
        resource_path
            .to_str()
            .expect("Couldn't resolve resource path to string")
    );

    let preload = lua
        .globals()
        .get::<_, LuaTable>("package")?
        .get::<_, LuaTable>("preload")?;

    let mut loaded = Vec::new();

    // Start recursive scan from the root lua directory
    scan_directory(&resource_path, &preload, lua, &mut loaded)?;

    println!("Preloaded Lua modules: {:?}", loaded);
    Ok(())
}

fn json_value_to_lua<'lua>(
    lua: &'lua Lua,
    value: &serde_json::Value,
) -> LuaResult<mlua::Value<'lua>> {
    match value {
        serde_json::Value::Null => Ok(mlua::Value::Nil),
        serde_json::Value::Bool(b) => Ok(mlua::Value::Boolean(*b)),
        serde_json::Value::Number(n) => {
            if let Some(f) = n.as_f64() {
                Ok(mlua::Value::Number(f))
            } else {
                Ok(mlua::Value::Number(0.0))
            }
        }
        serde_json::Value::String(s) => Ok(mlua::Value::String(lua.create_string(s)?)),
        serde_json::Value::Array(arr) => {
            let table = lua.create_table()?;
            for (i, value) in arr.iter().enumerate() {
                // indices from 1 because Lua
                table.set(i + 1, json_value_to_lua(lua, value)?)?;
            }
            Ok(mlua::Value::Table(table))
        }
        serde_json::Value::Object(map) => {
            let table = lua.create_table()?;
            for (key, value) in map {
                table.set(key.clone(), json_value_to_lua(lua, value)?)?;
            }
            Ok(mlua::Value::Table(table))
        }
    }
}

#[tauri::command]
pub async fn tick(state: State<'_, LuaState>, dt: f64) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::Tick(dt))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_entity_property(
    state: State<'_, LuaState>,
    id: String,
    key: String,
    data: Value,
) -> Result<(), String> {
    let mut properties = serde_json::Map::new();
    properties.insert(key, data);
    let properties_value = Value::Object(properties);
    state
        .tx
        .send(LuaMessage::UpdateEntityProperties(
            id,
            properties_value,
            false,
        ))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_entity_id(
    state: State<'_, LuaState>,
    original_id: String,
    new_id: String,
) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::UpdateEntityId(original_id, new_id))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_entity_properties(
    state: State<'_, LuaState>,
    id: String,
    data: Value,
    complete: bool, // Whether this is the complete version of the updated entity. Will fully overwrite.
) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::UpdateEntityProperties(id, data, complete))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_entity(state: State<'_, LuaState>, id: String) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::DeleteEntity(id))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn duplicate_entity(state: State<'_, LuaState>, id: String) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::DuplicateEntity(id))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_scene(state: State<'_, LuaState>, path: String) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::SaveScene(path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_scene(state: State<'_, LuaState>, path: String) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::LoadScene(path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_script(
    state: State<'_, LuaState>,
    path: String,
    id: String,
) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::LoadScript(path, id))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn run_script(
    state: State<'_, LuaState>,
    id: String,
    function: String,
) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::RunScript(id, function))
        .map_err(|e| e.to_string())
}
