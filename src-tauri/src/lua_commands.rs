use crate::lua_types::{LuaMessage, LuaState};
use serde_json::Value;
use tauri::State;

#[tauri::command]
pub async fn tick(state: State<'_, LuaState>, dt: f64) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::Tick(dt))
        .map_err(|e| e.to_string())
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
        .expect("Couldn't get valid new ID")
        .as_str()
        .expect("New ID is not a string")
        .to_string();
    let mut trimmed_data = data.clone();
    trimmed_data
        .as_object_mut()
        .expect("Couldn't turn data into object")
        .remove("id")
        .expect("Failed to remove id from data");
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
pub async fn load_scene(state: State<'_, LuaState>, path: String) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::LoadScene(path))
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
) -> Result<(), String> {
    state
        .tx
        .send(LuaMessage::HandleInspectorSave(
            original_id,
            inspector,
            scripts,
        ))
        .map_err(|e| e.to_string())
}
