use super::{
    globals::set_globals,
    types::{LuaError, LuaMessage, LuaState},
    utils::{get_entity, get_scene, json_value_to_lua},
};
use mlua::prelude::*;
use std::fs;
use std::path::Path;
use std::sync::mpsc;
use tauri::{Manager, WebviewWindow};

pub fn init_lua_thread(window: WebviewWindow) -> Result<LuaState, LuaError> {
    let (tx, rx) = mpsc::channel(); // create communication channel
    let _ = std::thread::Builder::new()
        .name("Lua Environment".to_string())
        .spawn(move || -> Result<(), LuaError> {
            let lua = Lua::new();
            set_globals(&lua, window.clone())?;

            // Preload modules
            preload_lua_modules(window.clone(), &lua)
                .map_err(|e| LuaError::InitializationError(e.to_string()))?;

            // load main scene
            let lua_main: LuaTable =
                lua // Do this last to minimise risk of any code on .eval() not working
                    .load(include_str!("../../resources/lua/main.lua"))
                    .eval::<LuaTable>()
                    .map_err(|e| {
                        LuaError::InitializationError(format!("Failed loading main scene: {}", e))
                    })?;
            lua.globals().set("currentScene", lua_main).map_err(|e| {
                LuaError::InitializationError(format!("Failed to set main scene: {}", e))
            })?;

            while let Ok(msg) = rx.recv() {
                match_message(&lua, msg)?;
            }
            Ok(())
        });
    Ok(LuaState { tx })
}

fn match_message(lua: &Lua, msg: LuaMessage) -> Result<(), LuaError> {
    match msg {
        LuaMessage::Tick(dt) => {
            let scene = get_scene(lua)?;
            scene
                .get::<_, LuaFunction>("emit_update")?
                .call::<_, ()>((scene, dt))
                .map_err(|e| LuaError::LuaError(e))?
        }
        LuaMessage::AddEntity(id, data, response_tx) => {
            let scene = get_scene(lua)?;
            response_tx
                .send(
                    match scene.get::<_, LuaFunction>("add_entity")?.call::<_, ()>((
                        scene,
                        id,
                        json_value_to_lua(lua, &data)?,
                    )) {
                        Ok(_) => (true, "Success".to_string()),
                        Err(e) => (false, format!("Couldn't add entity: {}", e.to_string())),
                    },
                )
                .map_err(|e| {
                    LuaError::CommunicationError(format!("Failed to send error response: {}", e))
                })?
        }
        LuaMessage::UpdateEntityId(original_id, new_id, data) => {
            let scene = get_scene(lua)?;
            let id_func: LuaFunction = scene
                .get("update_entity_id")
                .map_err(|e| LuaError::LuaError(e))?;
            id_func.call::<_, ()>((scene, original_id, new_id, json_value_to_lua(&lua, &data)?))?;
        }
        LuaMessage::UpdateEntity(id, data) => {
            let entity: LuaTable = get_entity(lua, id.as_str())?;
            entity
                .get::<&str, LuaFunction>("update")?
                .call::<_, ()>((entity.clone(), json_value_to_lua(&lua, &data)?))
                .map_err(|e| {
                    LuaError::EntityProcessingError(
                        id,
                        format!("Couldn't call update function: {}", e),
                    )
                })?;
            // Load scripts if any are updated
            let data_object = data.as_object().ok_or_else(|| {
                LuaError::FormatError("Data cannot be parsed as object".to_string())
            })?;
            if data_object.contains_key("scripts")
                && data_object
                    .get("scripts")
                    .ok_or_else(|| {
                        LuaError::FormatError("Scripts data cannot be parsed".to_string())
                    })?
                    .is_object()
            {
                let load_func = entity.get::<_, LuaFunction>("load_script")?;
                data_object
                    .get("scripts")
                    .ok_or_else(|| {
                        LuaError::FormatError("Scripts data cannot be parsed".to_string())
                    })?
                    .as_object()
                    .ok_or_else(|| {
                        LuaError::FormatError("Scripts data cannot be parsed as object".to_string())
                    })?
                    .keys()
                    .try_for_each(|script| {
                        load_func
                            .call::<_, ()>((entity.clone(), script.clone()))
                            .map_err(|e| LuaError::LuaError(e))
                    })?;
            }
        }
        LuaMessage::DeleteEntity(id) => get_scene(lua)?
            .get::<&str, LuaTable>("entities")?
            .set(id, LuaNil)
            .map_err(|e| LuaError::LuaError(e))?,
        LuaMessage::DuplicateEntity(id) => {
            let scene = get_scene(lua)?;
            scene
                .get::<_, LuaFunction>("duplicate_entity")?
                .call::<_, ()>((scene, id))
                .map_err(|e| LuaError::LuaError(e))?
        }
        LuaMessage::SaveScene(path) => {
            let scene = get_scene(lua)?;
            scene
                .get::<_, LuaFunction>("save_scene")?
                .call::<_, ()>((scene, path))
                .map_err(|e| LuaError::LuaError(e))?;
        }
        LuaMessage::LoadScene(path, response_tx) => {
            let scene = get_scene(lua)?;
            let (success, error): (bool, Option<String>) = lua
                .globals()
                .get::<_, LuaFunction>("pcall")?
                .call((scene.get::<_, LuaFunction>("load_scene")?, scene, path))?;

            response_tx
                .send(match success {
                    true => (true, "Successfully loaded scene".to_string()),
                    false => (
                        false,
                        format!(
                            "Failed loading: {}",
                            error.unwrap_or_else(|| "Unknown error".to_string())
                        ),
                    ),
                })
                .map_err(|e| {
                    LuaError::CommunicationError(format!("Failed to send error response: {}", e))
                })?
        }
        LuaMessage::RunScript(id, function, params, response_tx) => {
            let entity: LuaTable = get_scene(lua)?
                .get::<_, LuaTable>("entities")?
                .get::<_, LuaTable>(id.clone())
                .map_err(|e| {
                    let _ = response_tx.send((false, "Couldn't find entity".to_string()));
                    LuaError::EntityProcessingError(
                        id.clone(),
                        format!("Couldn't get entity: {}", e),
                    )
                })?;

            let (success, error): (bool, Option<String>) =
                lua.globals().get::<_, LuaFunction>("pcall")?.call((
                    entity.get::<_, LuaFunction>("run_script")?,
                    entity,
                    function.clone(),
                    json_value_to_lua(lua, &params)?,
                ))?;

            response_tx
                .send(match success {
                    true => (true, "Script executed successfully".to_string()),
                    false => (false, error.unwrap_or_else(|| "Unknown error".to_string())),
                })
                .map_err(|e| {
                    LuaError::CommunicationError(format!("Failed to send error response: {}", e))
                })?
        }
        LuaMessage::EmitEntityString(id, window) => {
            let scene = get_scene(lua)?;
            let data: LuaTable = lua.create_table()?;
            data.set("id", id.clone())?;
            data.set(
                "table",
                scene
                    .get::<_, LuaFunction>("entity_as_block_string")?
                    .call::<_, LuaString>((scene, id))?,
            )?;
            lua.globals()
                .get::<_, LuaFunction>("emit_to")?
                .call::<_, ()>(("entity_string", window, data))
                .map_err(|e| LuaError::LuaError(e))?
        }
        LuaMessage::HandleInspectorSave(original_id, inspector, scripts, response_tx) => {
            // Load inspector contents as entity lua table using serpent
            let entity: LuaTable = match lua
                .load(
                    r#"
                        function(data)
                            local success, loaded = require("serpent").load("{\n" .. data .. "\n}")
                            local entity = require("Entity"):new(loaded --[[@as table]])
                            entity.scripts = {} -- otherwise we can edit the metatable?
                            return entity
                        end
                        "#,
                )
                .eval::<LuaFunction>()?
                .call(inspector)
            {
                Ok(entity) => entity,
                Err(_) => {
                    let _ = response_tx.send((
                        false,
                        "Invalid syntax in inspector.".to_string(),
                        "".to_string(),
                    )); // fail and abort save if entity cannot be deserialized valid
                    return Ok(());
                }
            };

            // extract id separately (remove from loaded entity)
            let id: LuaString = match entity.get("id") {
                Ok(id) => match id {
                    Some(id) => id,
                    None => {
                        let _ = response_tx.send((
                            false,
                            "Entity must have an ID.".to_string(),
                            "".to_string(),
                        ));
                        return Ok(());
                    }
                },
                Err(_) => {
                    let _ = response_tx.send((
                        false,
                        "Entity must have an ID.".to_string(),
                        "".to_string(),
                    ));
                    return Ok(());
                }
            };
            entity.set("id", LuaNil)?;

            for (key, value) in scripts
                .as_object()
                .ok_or_else(|| {
                    LuaError::FormatError("Couldn't parse script as object".to_string())
                })?
                .iter()
            {
                let ent_clone = entity.clone();
                let (success, error): (bool, Option<String>) =
                    lua.globals().get::<_, LuaFunction>("pcall")?.call((
                        ent_clone.get::<_, LuaFunction>("load_script")?,
                        ent_clone,
                        key.to_string(),
                        value
                            .as_str()
                            .ok_or_else(|| {
                                LuaError::FormatError("Couldn't parse script as string".to_string())
                            })?
                            .to_string(),
                    ))?;

                if !success {
                    let error_msg = error.unwrap_or_else(|| "Unknown error".to_string());
                    let _ = response_tx.send((
                        false,
                        format!("Invalid syntax in {} script: {}", key, error_msg),
                        "".to_string(),
                    ));
                    return Ok(());
                }
            }

            // finally, more standard update procedure!
            let entities: LuaTable = get_scene(lua)?.get("entities")?;

            if id != original_id {
                if entities.get::<_, LuaTable>(id.clone()).is_ok() {
                    response_tx
                        .send((
                            false,
                            format!("An entity with ID {:?} already exists.", id.clone()),
                            "".to_string(),
                        ))
                        .map_err(|e| {
                            LuaError::CommunicationError(format!("Failed to send response: {}", e))
                        })?;
                    return Ok(());
                }
                entities.set(original_id, LuaNil)?;
            }

            entities.set(&id, entity)?;
            response_tx
                .send((true, "Success".to_string(), id.to_str()?.to_string()))
                .map_err(|e| {
                    LuaError::CommunicationError(format!("Failed to send success response: {}", e))
                })?
        }
    }
    Ok(())
}

/// Preload Lua modules (at runtime) as part of Lua initialization.
fn preload_lua_modules(window: WebviewWindow, lua: &Lua) -> LuaResult<()> {
    let resource_path = window
        .app_handle()
        .path()
        .resource_dir()
        .map_err(|e| LuaError::InitializationError(format!("Failed to get resource dir: {}", e)))?
        .join("resources")
        .join("lua");
    println!(
        "Looking for Lua files in: {}",
        resource_path.to_str().ok_or_else(|| {
            LuaError::InitializationError(
                "Couldn't resolve resource dir path to string".to_string(),
            )
        })?
    );

    let preload = lua
        .globals()
        .get::<_, LuaTable>("package")?
        .get::<_, LuaTable>("preload")?;

    let mut loaded = Vec::new();

    // Start recursive scan from the root lua directory
    scan_directory(&resource_path, &preload, lua, &mut loaded)
        .map_err(|e| LuaError::ModuleLoadError(format!("Failed scanning directory: {}", e)))?;

    println!("Preloaded Lua modules: {:?}", loaded);
    Ok(())
}

fn get_module_path(base_path: &Path, file_path: &Path) -> Option<String> {
    if let (Some(ext), true) = (file_path.extension(), file_path.is_file()) {
        if ext != "lua" {
            return None;
        }

        // Make sure we strip the base_path and leading separator
        if let Ok(relative) = file_path.strip_prefix(base_path) {
            let mut relative = relative.to_str()?;
            relative = relative.trim_start_matches(std::path::MAIN_SEPARATOR); // Remove any leading separator
            return Some(
                relative
                    .trim_end_matches(".lua") // cemove .lua extension
                    .replace(std::path::MAIN_SEPARATOR, "."), // convert separators to dots
            );
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
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            scan_directory(&path, preload, lua, loaded)?;
            continue;
        }

        if let Some(module_name) = get_module_path(&dir, &path) {
            // Skip main.lua since we load it separately
            if module_name == "main" || loaded.contains(&module_name) {
                continue;
            }

            let source = fs::read_to_string(&path)?;
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
    Ok(())
}
