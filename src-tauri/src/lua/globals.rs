use super::{
    types::LuaError,
    utils::{get_scene, serialized_table},
};
use mlua::prelude::*;
use tauri::{Emitter, Manager, WebviewWindow};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

pub fn set_globals(lua: &Lua, window: WebviewWindow) -> Result<(), LuaError> {
    let w_emit = window.clone();
    lua.globals().set(
        "emit",
        lua.create_function(move |_: &Lua, (evt, data): (String, LuaValue)| {
            let json = serde_json::to_value(&data)
                .map_err(|e| LuaError::FormatError(format!("JSON conversion error: {}", e)))?;
            w_emit.emit(&evt, json).map_err(|e| {
                LuaError::CommunicationError(format!("Couldn't emit event {}: {}", evt, e))
            })?;
            Ok(())
        })
        .map_err(|e| {
            LuaError::InitializationError(format!("Couldn't create Lua emit function: {}", e))
        })?,
    )?;

    let w_emit_to = window.clone();
    lua.globals().set(
        "emit_to",
        lua.create_function(
            move |_: &Lua, (evt, window_label, data): (String, String, LuaValue)| {
                let json = serde_json::to_value(&data)
                    .map_err(|e| LuaError::FormatError(format!("JSON conversion error: {}", e)))?;
                w_emit_to
                    .emit_to(window_label.clone(), &evt, json)
                    .map_err(|e| {
                        LuaError::CommunicationError(format!(
                            "Failed to emit event {} to {}: {}",
                            evt, window_label, e
                        ))
                    })?;
                Ok(())
            },
        )
        .map_err(|e| {
            LuaError::InitializationError(format!("Failed to create Lua emit_to function: {}", e))
        })?,
    )?;

    // broadcasting
    let w_broadcast = window.clone();
    lua.globals().set(
        "broadcast",
        lua.create_function(move |l: &Lua, (event, data): (LuaValue, LuaValue)| {
            if !event.is_string() {
                let _ = w_broadcast
                    .app_handle()
                    .dialog()
                    .message(format!(
                        "Event parameter must be a string.\nProvided: {}",
                        event.type_name()
                    ))
                    .kind(MessageDialogKind::Error)
                    .title("Broadcast failed")
                    .blocking_show();
                return Ok(());
            }
            let scene = get_scene(l)?;
            let (success, error): (bool, Option<String>) =
                l.globals().get::<_, LuaFunction>("pcall")?.call((
                    scene
                        .get::<_, LuaFunction>("handle_broadcast")
                        .map_err(|e| LuaError::LuaError(e))?,
                    scene,
                    event,
                    if let Some(table) = data.as_table() {
                        serialized_table(&l, table)?.into_lua(l)?
                    } else {
                        LuaNil
                    },
                ))?;
            if !success {
                let _ = w_broadcast
                    .app_handle()
                    .dialog()
                    .message(error.unwrap_or_else(|| "Unknown error".to_string()))
                    .kind(MessageDialogKind::Error)
                    .title("Broadcast failed")
                    .blocking_show();
            }
            Ok(())
        })
        .map_err(|e| {
            LuaError::InitializationError(format!("Failed to create Lua broadcast function: {}", e))
        })?,
    )?;

    // messaging
    let w_message = window.clone();
    lua.globals().set(
        "message",
        lua.create_function(
            move |l: &Lua, (target, event, data): (LuaValue, LuaValue, LuaValue)| {
                if !target.is_string() || !event.is_string() {
                    let _ = w_message
                        .app_handle()
                        .dialog()
                        .message(if !target.is_string() && !event.is_string() {
                            format!(
                                "Target and event parameters must both be strings.
                                \nProvided (target): {}\nProvided (event): {}",
                                target.type_name(),
                                event.type_name()
                            )
                        } else if !target.is_string() {
                            format!(
                                "Target parameter must be a string.\nProvided: {}",
                                target.type_name()
                            )
                        } else {
                            format!(
                                "Event parameter must be a string.\nProvided: {}",
                                event.type_name()
                            )
                        })
                        .kind(MessageDialogKind::Error)
                        .title("Broadcast failed")
                        .blocking_show();
                    return Ok(());
                }

                let scene = get_scene(l)?;
                let (success, error): (bool, Option<String>) =
                    l.globals().get::<_, LuaFunction>("pcall")?.call((
                        scene
                            .get::<_, LuaFunction>("handle_message")
                            .map_err(|e| LuaError::LuaError(e))?,
                        scene,
                        target,
                        event,
                        if let Some(table) = data.as_table() {
                            serialized_table(&l, table)?.into_lua(l)?
                        } else {
                            LuaNil
                        },
                    ))?;
                if !success {
                    let _ = w_message
                        .app_handle()
                        .dialog()
                        .message(error.unwrap_or_else(|| "Unknown error".to_string()))
                        .kind(MessageDialogKind::Error)
                        .title("Message failed")
                        .blocking_show();
                }
                Ok(())
            },
        )
        .map_err(|e| {
            LuaError::InitializationError(format!("Failed to create Lua message function: {}", e))
        })?,
    )?;

    // intercept & tag lua prints to stdout
    lua.globals()
        .set(
            "print",
            lua.create_function(|_, msg: String| {
                println!("[lua] {}", msg);
                Ok(())
            })?,
        )
        .map_err(|e| {
            LuaError::InitializationError(format!("Failed to set Lua print function: {}", e))
        })?;

    Ok(())
}
