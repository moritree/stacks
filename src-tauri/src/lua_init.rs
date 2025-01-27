use mlua::prelude::*;
use serde_json::Value;
use std::sync::mpsc;
use tauri::{Emitter, State, WebviewWindow};

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

// Messages TO Lua thread
pub enum LuaMessage {
    Tick(f64),
    EmitEvent(String, Value),
    UpdateEntityProperty(String, String, Value),
    Die,
}

pub fn init_lua_thread(window: WebviewWindow) -> LuaState {
    let (tx, rx) = mpsc::channel(); // create communication channel
    let event_tx = tx.clone(); // clone sender, multiple parts of code can send messages (rust ownership is weird)
    let w = window.clone();

    std::thread::spawn(move || {
        let lua = Lua::new();

        // Physical window may not match logical size, e.g. with mac resolution scaling
        const DEFAULT_SCALE: f64 = 1.0; // fallback to 1.0 if we can't get monitor info
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
            .expect("Failed to set window_width Lua global");
        lua.globals()
            .set(
                "window_height",
                (window_size.height as f64 / scale_factor) as u32,
            )
            .expect("Failed to set window_height Lua global");

        // let lua emit messages that TS can pick up
        let emit = move |_: &Lua, (evt, data): (String, LuaValue)| {
            let json = serde_json::to_value(&data).unwrap();
            event_tx
                .send(LuaMessage::EmitEvent(evt, json))
                .map_err(|e| mlua::Error::runtime(e.to_string()))?;
            Ok(())
        };
        lua.globals()
            .set("emit", lua.create_function(emit).unwrap())
            .unwrap();

        // intercept & tag lua prints to stdout
        lua.globals()
            .set(
                "print",
                lua.create_function(|_, msg: String| {
                    println!("[lua] {}", msg);
                    Ok(())
                })
                .unwrap(),
            )
            .unwrap();

        // load AND set global
        let scene: LuaTable = lua.load(include_str!("../lua/scene.lua")).eval().unwrap();
        lua.globals().set("scene", scene).unwrap();

        // message processing loop
        while let Ok(msg) = rx.recv() {
            match msg {
                LuaMessage::Tick(dt) => {
                    let scene: LuaTable = lua.globals().get("scene").unwrap();
                    let update: LuaFunction = scene.get("update").unwrap();
                    update.call::<_, ()>(dt).unwrap(); // return unit type bc idc
                }
                LuaMessage::UpdateEntityProperty(id, key, data) => {
                    let scene: LuaTable = lua.globals().get("scene").unwrap();
                    let update_func: LuaFunction = scene
                        .get("update_entity_property")
                        .expect("Couldn't find update_entity_property function");
                    update_func
                        .call::<_, ()>((id, key, json_value_to_lua(&lua, &data).unwrap()))
                        .expect("Failed calling update_entity_property")
                }
                LuaMessage::EmitEvent(evt, data) => w.emit(&evt, data).unwrap(),
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
    println!("update_entity_property");
    state
        .tx
        .send(LuaMessage::UpdateEntityProperty(id, key, data))
        .map_err(|e| e.to_string())
}
