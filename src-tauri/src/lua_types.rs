use serde_json::Value;
use std::sync::mpsc;

#[derive(Clone)]
pub struct LuaState {
    pub tx: mpsc::Sender<LuaMessage>,
}

pub enum LuaMessage {
    Tick(f64),
    UpdateEntityId(String, String, Value),
    UpdateEntity(String, Value),
    DeleteEntity(String),
    DuplicateEntity(String),
    SaveScene(String),
    LoadScene(String),
    RunScript(String, String),
    EmitEntityString(String, String),
}
