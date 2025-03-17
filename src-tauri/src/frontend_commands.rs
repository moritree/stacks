use std::sync::Mutex;
use tauri::{AppHandle, Manager, State, WebviewWindow};

pub struct SetupState {
    pub frontend_ready: bool,
}

#[tauri::command]
pub async fn set_frontend_ready(
    app: AppHandle,
    state: State<'_, Mutex<SetupState>>,
) -> Result<(), ()> {
    let mut state_lock = state.lock().unwrap();
    state_lock.frontend_ready = true;
    let main_window = app.get_webview_window("main").unwrap();
    main_window.show().unwrap();
    Ok(())
}

#[tauri::command]
pub async fn resize_window(window: WebviewWindow, width: u16, height: u16) -> Result<(), String> {
    window
        .set_size(tauri::PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_scale(window: tauri::WebviewWindow) -> f64 {
    const DEFAULT_SCALE: f64 = 1.0; // fallback to 1.0 scale if we can't get monitor info
    return window.current_monitor().map_or(DEFAULT_SCALE, |m| {
        m.map_or(DEFAULT_SCALE, |mon| mon.scale_factor())
    });
}
