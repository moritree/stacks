#[tauri::command]
pub async fn resize_window(
    window: tauri::WebviewWindow,
    width: u16,
    height: u16,
) -> Result<(), String> {
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
