use std::path::Path;

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    Path::new(&path).is_file()
}
