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
    // Handle cleanup
    pub fn shutdown(&self) -> Result<(), String> {
        self.tx.send(LuaMessage::Die).map_err(|e| e.to_string())
    }
}

/// Messages to Lua thread
pub enum LuaMessage {
    /// Game loop tick with the given time difference.
    Tick(f64),
    EmitEvent(String, Value),
    UpdateEntityProperty(String, String, Value),
    Die,
}

/// Preload Lua modules (at runtime) as part of Lua initialization.
///
/// If we need compile-time checks or recompilation when Lua files change, look into writing a build script.
/// Runtime loading is probably more simple & flexible.
fn preload_lua_modules(window: WebviewWindow, lua: &Lua) -> LuaResult<()> {
    let resource_path = window
        .app_handle()
        .path()
        .resource_dir()
        .expect("Failed to get resource dir")
        .join("resources")
        .join("lua");
    println!(
        "Looking for Lua files in: {}",
        resource_path.to_str().expect("WAAA")
    );
    let lua_dir = Path::new(&resource_path);
    let preload = lua
        .globals()
        .get::<_, LuaTable>("package")?
        .get::<_, LuaTable>("preload")?;

    let mut loaded = Vec::new();

    // Scan the lua directory for .lua files
    for entry in fs::read_dir(lua_dir).expect("Failed to read lua directory") {
        let entry = entry.expect("Failed to read directory entry");
        let path = entry.path();

        // Get all the strings we need upfront
        let file_name = match (path.file_stem(), path.extension()) {
            (Some(stem), Some(ext)) => {
                if ext == "lua" {
                    stem.to_str().map(|s| s.to_string())
                } else {
                    None
                }
            }
            _ => None,
        };

        if let Some(name) = file_name {
            // Skip scene.lua since we load it separately, as the root file
            if name == "scene" {
                continue;
            }

            let source = fs::read_to_string(&path).expect("Failed to read lua file");
            let module_name = name.clone(); // Clone for the closure

            preload.set(
                name.as_str(),
                lua.create_function(move |lua, ()| -> LuaResult<LuaValue> {
                    lua.load(&source)
                        .set_name(&format!("{}.lua", module_name))
                        .eval()
                })?,
            )?;
            loaded.push(name);
        }
    }

    println!("Preloaded Lua modules: {:?}", loaded);

    Ok(())
}

/// Set up Lua environment
pub fn init_lua_thread(window: WebviewWindow) -> LuaState {
    let (tx, rx) = mpsc::channel(); // create communication channel
    let event_tx = tx.clone(); // clone sender, multiple parts of code can send messages (rust ownership is weird)
    let w = window.clone();

    std::thread::spawn(move || {
        let lua = Lua::new();

        // Physical window may not match logical size, e.g. with mac resolution scaling
        const DEFAULT_SCALE: f64 = 1.0; // fallback to 1.0 scale if we can't get monitor info
        let scale_factor = window.current_monitor().map_or(DEFAULT_SCALE, |m| {
            m.map_or(DEFAULT_SCALE, |mon| mon.scale_factor())
        });

        // give lua window size info
        let window_size = window
            .inner_size()
            .expect("There should be a working window with a size...");
        lua.globals()
            .set(
                "window_width",
                (window_size.width as f64 / scale_factor) as u32,
            )
            .expect("Couldn't set window_width Lua global");
        lua.globals()
            .set(
                "window_height",
                (window_size.height as f64 / scale_factor) as u32,
            )
            .expect("Couldn't set window_height Lua global");

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

        // load scene
        // Do this last to minimise risk of any code on .eval() not working
        let scene: LuaTable = lua
            .load(include_str!("../resources/lua/scene.lua"))
            .eval()
            .expect("Couldn't load lua scene file");
        lua.globals()
            .set("scene", scene)
            .expect("Couldn't set scene global in Lua");

        // message processing loop
        while let Ok(msg) = rx.recv() {
            match msg {
                LuaMessage::Tick(dt) => {
                    let scene: LuaTable =
                        lua.globals().get("scene").expect("Couldn't get Lua scene");
                    let update: LuaFunction = scene
                        .get("update")
                        .expect("Couldn't get Lua update function");
                    update.call::<_, ()>(dt).expect("Failed calling update")
                }
                LuaMessage::UpdateEntityProperty(id, key, data) => {
                    let scene: LuaTable =
                        lua.globals().get("scene").expect("Couldn't get Lua scene");
                    let update_func: LuaFunction = scene
                        .get("update_entity_property")
                        .expect("Couldn't get Lua update_entity_property function");
                    update_func
                        .call::<_, ()>((
                            id,
                            key,
                            json_value_to_lua(&lua, &data)
                                .expect("Couldn't convert json data to Lua object"),
                        ))
                        .expect("Couldn't call update_entity_property")
                }
                LuaMessage::EmitEvent(evt, data) => w
                    .emit(&evt, data)
                    .expect(&format!("Couldn't emit event {}", evt)),
                LuaMessage::Die => break, // TODO trigger any shutdown code
            }
        }
    });

    LuaState { tx } // original tx lives here
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
    state
        .tx
        .send(LuaMessage::UpdateEntityProperty(id, key, data))
        .map_err(|e| e.to_string())
}
