mod ffi;

/// Truth table of `expression` (core notation, e.g. `(A & B) | ~C`) over `variables`,
/// computed by the C++ core. See [`ffi::truth_table`] for the row order.
#[tauri::command(async)]
fn truth_table(expression: String, variables: Vec<String>) -> Result<Vec<bool>, String> {
    ffi::truth_table(&expression, &variables)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![truth_table])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
