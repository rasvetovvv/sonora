// Sonora desktop shell. All UI is the bundled web build; Rust just hosts the
// webview window. Kept intentionally minimal.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running Sonora");
}
