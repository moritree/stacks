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
    MoveEntity(String, f32, f32),
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
                LuaMessage::MoveEntity(id, x, y) => {
                    let scene: LuaTable = lua.globals().get("scene").unwrap();
                    let move_func: LuaFunction = scene.get("move_entity").unwrap();
                    move_func.call::<_, ()>((id, x, y)).unwrap();
                }
                LuaMessage::EmitEvent(evt, data) => w.emit(&evt, data).unwrap(),
                LuaMessage::Die => break, // TODO trigger any shutdown code
            }
        }
    });

    LuaState { tx } // original tx lives here
}

#[tauri::command]
pub async fn tick(state: State<'_, LuaState>, dt: f64) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::Tick(dt))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn move_entity(
    state: State<'_, LuaState>,
    id: String,
    x: f32,
    y: f32,
) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::MoveEntity(id, x, y))
        .map_err(|e| e.to_string())
}
