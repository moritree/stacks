use crate::lua_types::{LuaMessage, LuaState};
use mlua::prelude::*;
use std::fs;
use std::path::Path;
use std::sync::mpsc;
use tauri::{Emitter, Manager, WebviewWindow};

pub fn init_lua_thread(window: WebviewWindow) -> LuaState {
    let (tx, rx) = mpsc::channel(); // create communication channel
    let _ = std::thread::Builder::new()
        .name("Lua Environment".to_string())
        .spawn(move || {
            let lua = Lua::new();
            set_globals(&lua, window);

            while let Ok(msg) = rx.recv() {
                match_message(&lua, msg);
            }
        });

    LuaState { tx }
}

fn set_globals(lua: &Lua, window: WebviewWindow) {
    // let lua emit messages that TS can pick up
    let w_emit = window.clone();
    lua.globals()
        .set(
            "emit",
            lua.create_function(move |_: &Lua, (evt, data): (String, LuaValue)| {
                let json = serde_json::to_value(&data).expect(&format!(
                    "Lua event {}: Couldn't convert data to valid JSON value.",
                    evt
                ));
                w_emit
                    .emit(&evt, json)
                    .expect(&format!("Couldn't emit event {}", evt));
                Ok(())
            })
            .expect("Couldn't create Lua emit function"),
        )
        .expect("Couldn't set emit global in Lua");

    let w_emit_to = window.clone();
    lua.globals()
        .set(
            "emit_to",
            lua.create_function(
                move |_: &Lua, (evt, window_label, data): (String, String, LuaValue)| {
                    let json = serde_json::to_value(&data).expect(&format!(
                        "Lua event {}: Couldn't convert data to valid JSON value.",
                        evt
                    ));
                    w_emit_to
                        .emit_to(window_label.clone(), &evt, json)
                        .expect(&format!("Couldn't emit event {} to {}", evt, window_label));
                    Ok(())
                },
            )
            .expect("Couldn't create Lua emit function"),
        )
        .expect("Couldn't set emit_to global in Lua");

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
    preload_lua_modules(window.clone(), &lua).expect("Failed to preload Lua modules");

    // load main scene
    let lua_main: LuaTable = lua // Do this last to minimise risk of any code on .eval() not working
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
}

fn match_message(lua: &Lua, msg: LuaMessage) {
    match msg {
        LuaMessage::Tick(dt) => {
            let scene: LuaTable = lua
                .globals()
                .get("currentScene")
                .expect("Couldn't get Lua scene");
            scene
                .get::<_, LuaFunction>("emit_update")
                .expect("Couldn't get Lua emit_update function")
                .call::<_, ()>((scene, dt))
                .expect("Failed calling emit_update")
        }
        LuaMessage::UpdateEntityId(original_id, new_id, data) => {
            let scene: LuaTable = lua
                .globals()
                .get("currentScene")
                .expect("Couldn't get Lua scene");
            let id_func: LuaFunction = scene
                .get("update_entity_id")
                .expect("Couldn't get Lua update_entity_id function");
            id_func
                .call::<_, ()>((
                    scene,
                    original_id,
                    new_id,
                    json_value_to_lua(&lua, &data)
                        .expect("Couldn't convert json data to Lua object"),
                ))
                .expect("Couldn't call update_entity_id")
        }
        LuaMessage::UpdateEntity(id, data) => {
            let entity: LuaTable = lua
                .globals()
                .get::<&str, LuaTable>("currentScene")
                .expect("Couldn't get Lua scene")
                .get::<&str, LuaTable>("entities")
                .expect("Couldn't get entities table")
                .get::<String, LuaTable>(id.clone())
                .expect(&format!("Couldn't get entity {}", id));
            entity
                .get::<&str, LuaFunction>("update")
                .expect("Couldn't get update function")
                .call::<_, ()>((
                    entity.clone(),
                    json_value_to_lua(&lua, &data)
                        .expect("Couldn't convert json data to Lua object"),
                ))
                .expect(&format!("Couldn't call update function on {}", id));
            // Load scripts if any are updated
            let data_object = data.as_object().expect("Data cannot be parsed as object");
            if data_object.contains_key("scripts")
                && data_object
                    .get("scripts")
                    .expect("Couldn't get scripts value")
                    .is_object()
            {
                let load_func = entity
                    .get::<_, LuaFunction>("load_script")
                    .expect("Couldn't get load_script function");
                data.as_object()
                    .expect("Data cannot be parsed as object")
                    .get("scripts")
                    .expect("Couldn't get scripts value")
                    .as_object()
                    .expect("Couldn't parse scripts as object")
                    .keys()
                    .for_each(|script| {
                        load_func
                            .call::<_, ()>((entity.clone(), script.clone()))
                            .expect("Couldn't call load_script function")
                    });
            }
        }
        LuaMessage::DeleteEntity(id) => lua
            .globals()
            .get::<&str, LuaTable>("currentScene")
            .expect("Couldn't get Lua scene")
            .get::<&str, LuaTable>("entities")
            .expect("Couldn't get entities table")
            .set(id, LuaNil)
            .expect("Couldn't delete entity"),
        LuaMessage::DuplicateEntity(id) => {
            let scene: LuaTable = lua
                .globals()
                .get("currentScene")
                .expect("Couldn't get Lua scene");
            scene
                .get::<_, LuaFunction>("duplicate_entity")
                .expect("Couldn't get Lua duplicate_entity function")
                .call::<_, ()>((scene, id))
                .expect("Couldn't call duplicate_entity")
        }
        LuaMessage::SaveScene(path) => {
            let scene: LuaTable = lua
                .globals()
                .get("currentScene")
                .expect("Couldn't get Lua scene");
            scene
                .get::<_, LuaFunction>("save_scene")
                .expect("Couldn't get Lua save_scene function")
                .call::<_, ()>((scene, path))
                .expect("Couldn't call save_scene")
        }
        LuaMessage::LoadScene(path) => {
            let scene: LuaTable = lua
                .globals()
                .get("currentScene")
                .expect("Couldn't get Lua scene");
            scene
                .get::<_, LuaFunction>("load_scene")
                .expect("Couldn't get Lua load_scene function")
                .call::<_, ()>((scene, path))
                .expect("Couldn't call load_scene")
        }
        LuaMessage::RunScript(id, function) => {
            let entity: LuaTable = lua
                .globals()
                .get::<_, LuaTable>("currentScene")
                .expect("Couldn't get Lua scene")
                .get::<_, LuaTable>("entities")
                .expect("Couldn't get entities table from scene")
                .get::<_, LuaTable>(id.clone())
                .expect("Couldn't get entity");
            entity
                .get::<_, LuaFunction>("run_script")
                .expect("Couldn't get run_script function")
                .call::<_, ()>((entity, function))
                .expect("Couldn't call run_script function")
        }
        LuaMessage::EmitEntityString(id, window) => {
            let scene: LuaTable = lua
                .globals()
                .get::<_, LuaTable>("currentScene")
                .expect("Couldn't get Lua scene");
            let data: LuaTable = lua.create_table().expect("Couldn't create new table");
            data.set("id", id.clone())
                .expect("Couldn't set id in return data table");
            data.set(
                "table",
                scene
                    .get::<_, LuaFunction>("entity_as_block_string")
                    .expect("Couldn't get entity_as_block_string function")
                    .call::<_, LuaString>((scene, id))
                    .expect("Couldn't call as_string function"),
            )
            .expect("Couldn't set table string in return data table");
            lua.globals()
                .get::<_, LuaFunction>("emit_to")
                .expect("Couldn't get emit_to global function")
                .call::<_, ()>(("entity_string", window, data))
                .expect("Couldn't call emit_to")
        }
        LuaMessage::HandleInspectorSave(original_id, inspector, scripts, response_tx) => {
            // Load inspector contents as entity lua table using serpent
            let entity: LuaTable = match lua
                .load(
                    r#"
                        function(data)
                            local success, loaded = require("serpent").load(data)
                            local entity = require("Entity"):new(loaded --[[@as table]])
                            entity.scripts = {} -- otherwise we can edit the metatable?
                            return entity
                        end
                        "#,
                )
                .eval::<LuaFunction>()
                .expect("Couldn't load deserialize function")
                .call(inspector)
            {
                Ok(entity) => entity,
                Err(_) => {
                    let _ = response_tx.send((
                        false,
                        "Invalid syntax in inspector.".to_string(),
                        "".to_string(),
                    )); // fail and abort save if entity cannot be deserialized valid
                    return;
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
                        return;
                    }
                },
                Err(_) => {
                    let _ = response_tx.send((
                        false,
                        "Entity must have an ID.".to_string(),
                        "".to_string(),
                    ));
                    return;
                }
            };
            entity
                .set("id", LuaNil)
                .expect("Couldn't clear id from entity table");

            // scripts are in object format (name: string), add them to entity in format [name] = { string = [str]}
            let scripts_table: LuaTable = entity
                .get("scripts")
                .expect("Couldn't get entity scripts table");
            for script in scripts
                .as_object()
                .expect("Couldn't parse scripts as object")
                .iter()
            {
                // TODO load scripts, return false if any are invalid
                scripts_table
                    .set(
                        script.0.as_str(),
                        lua.create_table().expect("Couldn't create empty table"),
                    )
                    .expect("Couldn't set script key on scripts table");
                scripts_table
                    .get::<_, LuaTable>(script.0.as_str())
                    .expect("Couldn't get script table")
                    .set(
                        "string",
                        script.1.as_str().expect("Couldn't parse script as string"),
                    )
                    .expect("Couldn't set script string");
            }

            // finally, more standard update procedure!
            let entities: LuaTable = lua
                .globals()
                .get::<_, LuaTable>("currentScene")
                .expect("Couldn't get Lua scene")
                .get("entities")
                .expect("Couldn't get scene entities");

            if id != original_id {
                // if id is different, remove original from table
                // TODO: let frontend know ID has changed so it can update its title properly!
                entities
                    .set(original_id, LuaNil)
                    .expect("Couldn't clear original entity from entities table")
            }

            entities
                .set(&id, entity)
                .expect("Couldn't update entities table with new entity");
            response_tx
                .send((
                    true,
                    "Success".to_string(),
                    id.to_str()
                        .expect("Couldn't convert ID into String")
                        .to_string(),
                ))
                .expect("Failed to send success response (ha)")
        }
    }
}

/// Preload Lua modules (at runtime) as part of Lua initialization.
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
    for entry in fs::read_dir(dir).expect("Failed to read directory") {
        let entry = entry.expect("Failed to read directory entry");
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
