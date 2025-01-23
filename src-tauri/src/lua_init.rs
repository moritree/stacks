use mlua::prelude::*;
use serde_json::Value;
use std::sync::mpsc;
use tauri::{Emitter, State, WebviewWindow};

#[derive(Clone)]
pub struct LuaState {
    tx: mpsc::Sender<LuaMessage>,
}

impl LuaState {
    pub fn tick(&self, dt: f64) -> Result<(), String> {
        self.tx
            .send(LuaMessage::Tick(dt))
            .map_err(|e| e.to_string())
    }

    // Handle cleanup
    pub fn shutdown(&self) -> Result<(), String> {
        self.tx.send(LuaMessage::Die).map_err(|e| e.to_string())
    }
}

// Messages TO Lua thread
pub enum LuaMessage {
    Tick(f64),
    EmitEvent(String, Value),
    Die,
}

pub fn init_lua_thread(window: WebviewWindow) -> LuaState {
    let (tx, rx) = mpsc::channel(); // create communication channel
    let event_tx = tx.clone(); // clone sender, allow multiple parts of code to send messages
    let w = window.clone();

    std::thread::spawn(move || {
        let lua = Lua::new();
        lua.globals()
            .set(
                "print",
                lua.create_function(|_, msg: String| {
                    println!("[lua] {}", msg); // force stdout flush
                    Ok(())
                })
                .unwrap(),
            )
            .unwrap();
        setup_lua(&lua, event_tx);

        // message processing loop: runs in separate thread
        while let Ok(msg) = rx.recv() {
            match msg {
                LuaMessage::Tick(dt) => tick_lua(&lua, dt),
                LuaMessage::EmitEvent(evt, data) => w.emit(&evt, data).unwrap(),
                LuaMessage::Die => break,
            }
        }
    });

    LuaState { tx } // original tx lives here
}

fn setup_lua(lua: &Lua, event_tx: mpsc::Sender<LuaMessage>) {
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

    // CRUCIAL BIT: load AND set global
    let scene: LuaTable = lua.load(include_str!("../lua/scene.lua")).eval().unwrap();
    lua.globals().set("scene", scene).unwrap();
}

// Calls the Lua update function for each tick of the app loop
fn tick_lua(lua: &Lua, dt: f64) {
    let scene: LuaTable = lua.globals().get("scene").unwrap();
    let update: LuaFunction = scene.get("update").unwrap();
    update.call::<_, ()>(dt).unwrap(); // return unit type bc idc
}

#[tauri::command]
pub async fn tick(state: State<'_, LuaState>, dt: f64) -> Result<(), String> {
    state.tick(dt)
}
