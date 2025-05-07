use crate::lua_types::{LuaMessage, LuaState};
use serde_json::Value;
use std::sync::mpsc;
use tauri::State;

#[tauri::command]
pub async fn tick(state: State<'_, LuaState>, dt: f64) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::Tick(dt))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn new_entity(state: State<'_, LuaState>, data: Value) -> Result<(bool, String), String> {
    if !data.as_object().unwrap().contains_key("id") {
        return Err(format!("Cannot create an entity with no ID."));
    }

    let id = data
        .as_object()
        .unwrap()
        .get("id")
        .ok_or_else(|| "Couldn't get ID from data")?
        .as_str()
        .ok_or_else(|| "New ID is not a string")?
        .to_string();

    let mut data_clone = data.clone();
    let obj = data_clone
        .as_object_mut()
        .ok_or_else(|| "Couldn't turn data into object")?;
    obj.remove("id"); // Remove the ID
    let trimmed_data = Value::Object(obj.clone()); // Use the remaining object

    let (response_tx, response_rx) = mpsc::channel();
    state
        .tx
        .send(LuaMessage::AddEntity(id, trimmed_data, response_tx))
        .map_err(|e| e.to_string())?;
    response_rx.recv().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_entity(
    state: State<'_, LuaState>,
    id: String,
    data: Value,
) -> Result<(), String> {
    if !data.as_object().unwrap().contains_key("id") {
        return state
            .tx
            .send(LuaMessage::UpdateEntity(id, data))
            .map_err(|e| e.to_string());
    }

    let confirmed_id = data
        .as_object()
        .unwrap()
        .get("id")
        .ok_or_else(|| "Couldn't get ID from data")?
        .as_str()
        .ok_or_else(|| "New ID is not a string")?
        .to_string();
    let mut trimmed_data = data.clone();
    trimmed_data
        .as_object_mut()
        .ok_or_else(|| "Couldn't turn data into object")?
        .remove("id")
        .ok_or_else(|| "Failed to remove id from data")?;
    state
        .tx
        .send(LuaMessage::UpdateEntityId(id, confirmed_id, trimmed_data))
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
pub async fn load_scene(
    state: State<'_, LuaState>,
    path: String,
) -> Result<(bool, String), String> {
    let (response_tx, response_rx) = mpsc::channel();
    state
        .tx
        .send(LuaMessage::LoadScene(path, response_tx))
        .map_err(|e| e.to_string())?;
    response_rx.recv().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn run_script(
    state: State<'_, LuaState>,
    id: String,
    function: String,
    params: Value,
) -> Result<(bool, String), String> {
    let (response_tx, response_rx) = mpsc::channel();
    state
        .tx
        .send(LuaMessage::RunScript(id, function, params, response_tx))
        .map_err(|e| e.to_string())?;
    response_rx.recv().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_entity_string(
    state: State<'_, LuaState>,
    id: String,
    window: String,
) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::EmitEntityString(id, window))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn handle_inspector_save(
    state: State<'_, LuaState>,
    original_id: String,
    inspector: String,
    scripts: Value,
) -> Result<(bool, String, String), String> {
    let (response_tx, response_rx) = mpsc::channel();
    state
        .tx
        .send(LuaMessage::HandleInspectorSave(
            original_id,
            inspector,
            scripts,
            response_tx,
        ))
        .map_err(|e| e.to_string())?;
    response_rx.recv().map_err(|e| e.to_string())
}
