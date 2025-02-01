// thanks to https://github.com/tauri-apps/tauri/issues/9470#issuecomment-2111339835

use tauri::{
    menu::{Menu, MenuItem},
    Manager, Runtime,
};

// a wrapper struct to store the context menu
struct MyContextMenu<R: Runtime>(Menu<R>);

#[tauri::command]
pub fn open_context_menu<R: Runtime>(window: tauri::Window<R>, id: String) {
    // check if we already created and stored the window
    if let Some(context_menu) = window.try_state::<MyContextMenu<R>>() {
        // if stored, then just show it
        window.popup_menu(&context_menu.inner().0).unwrap();
    } else {
        // if not, create the menu
        let context_menu = Menu::with_items(
            &window,
            &[&MenuItem::with_id(
                &window,
                "delete_entity",
                "Delete Entity",
                true,
                None::<&str>,
            )
            .unwrap()],
        )
        .unwrap();

        // register events if needed
        window.on_menu_event(|_, e| {
            println!("{:?}", e);
        });

        // show the context menu
        window.popup_menu(&context_menu).unwrap();

        // store the menu to be re-used in later calls
        window.manage(MyContextMenu(context_menu));
    }
}
