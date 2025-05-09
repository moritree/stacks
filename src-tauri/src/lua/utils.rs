use super::types::LuaError;
use mlua::prelude::*;

pub fn get_scene<'lua>(lua: &'lua Lua) -> Result<LuaTable<'lua>, LuaError> {
    lua.globals()
        .get("currentScene")
        .map_err(|e| LuaError::LuaError(e))
}

pub fn get_entity<'lua>(lua: &'lua Lua, id: &str) -> Result<LuaTable<'lua>, LuaError> {
    let scene = get_scene(lua)?;
    let entities = scene
        .get::<_, LuaTable>("entities")
        .map_err(|e| LuaError::LuaError(e))?;

    entities.get::<_, LuaTable>(id).map_err(|e| {
        LuaError::EntityProcessingError(id.to_string(), format!("Failed to get entity: {}", e))
    })
}

pub fn serialized_table<'lua>(
    lua: &'lua Lua,
    table: &LuaTable<'lua>,
) -> Result<LuaString<'lua>, LuaError> {
    let (success, result): (bool, Option<LuaString>) = lua
        .globals()
        .get::<_, LuaFunction>("pcall")
        .map_err(|e| LuaError::LuaError(e))?
        .call((
            lua.load(
                r#"function(data)
                    return assert(require("serpent").dump(data), "Serializing data failed")
                end"#,
            )
            .eval::<LuaFunction>()
            .map_err(|e| LuaError::LuaError(e))?,
            table,
        ))
        .map_err(|e| LuaError::LuaError(e))?;

    if success {
        result.ok_or_else(|| LuaError::FormatError("Serialization returned nil".to_string()))
    } else {
        let error_msg = match result {
            Some(s) => match s.to_str() {
                Ok(str) => str.to_string(),
                Err(_) => "Invalid error message".to_string(),
            },
            None => "Unknown error".to_string(),
        };
        Err(LuaError::FormatError(error_msg))
    }
}

pub fn json_value_to_lua<'lua>(
    lua: &'lua Lua,
    value: &serde_json::Value,
) -> Result<mlua::Value<'lua>, LuaError> {
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
        serde_json::Value::String(s) => {
            let lua_str = lua.create_string(s).map_err(|e| {
                LuaError::FormatError(format!("Failed to create Lua string: {}", e))
            })?;
            Ok(mlua::Value::String(lua_str))
        }
        serde_json::Value::Array(arr) => {
            let table = lua
                .create_table()
                .map_err(|e| LuaError::FormatError(format!("Failed to create Lua table: {}", e)))?;
            for (i, value) in arr.iter().enumerate() {
                let lua_value = json_value_to_lua(lua, value)?;
                table.set(i + 1, lua_value).map_err(|e| {
                    LuaError::FormatError(format!("Failed to set array value: {}", e))
                })?;
            }
            Ok(mlua::Value::Table(table))
        }
        serde_json::Value::Object(map) => {
            let table = lua
                .create_table()
                .map_err(|e| LuaError::FormatError(format!("Failed to create Lua table: {}", e)))?;
            for (key, value) in map {
                let lua_value = json_value_to_lua(lua, value)?;
                table.set(key.clone(), lua_value).map_err(|e| {
                    LuaError::FormatError(format!("Failed to set object value: {}", e))
                })?;
            }
            Ok(mlua::Value::Table(table))
        }
    }
}
