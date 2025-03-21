use serde_json::Value;
use std::sync::mpsc::{self, Sender};
use thiserror::Error;

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
    HandleInspectorSave(String, String, Value, Sender<(bool, String, String)>),
}

#[derive(Error, Debug)]
pub enum LuaError {
    #[error("Failed to initialize Lua environment: {0}")]
    InitializationError(String),

    #[error("Failed to load Lua module: {0}")]
    ModuleLoadError(String),

    #[error("Failed to process entity {0}: {1}")]
    EntityProcessingError(String, String),

    #[error("Invalid data format: {0}")]
    FormatError(String),

    #[error("Communication error: {0}")]
    CommunicationError(String),

    #[error("Invalid user syntax: {0}")]
    UserSyntaxError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Lua error: {0}")]
    LuaError(#[from] mlua::Error),
}

impl From<LuaError> for mlua::Error {
    fn from(err: LuaError) -> Self {
        mlua::Error::RuntimeError(err.to_string())
    }
}
