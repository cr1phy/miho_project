use std::{env, path::PathBuf};

/// Compiles the C++ logic core (`../../core`) into a static library linked into the app.
fn build_core() {
    println!("cargo:rerun-if-env-changed=MIHO_CORE_DIR");
    let manifest = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let core = env::var_os("MIHO_CORE_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| manifest.join("../../core"));
    assert!(
        core.join("miho_c.h").is_file(),
        "Cannot find the C++ core at {}; set MIHO_CORE_DIR to its source directory",
        core.display()
    );
    for file in [
        "lexer.cpp",
        "lexer.hpp",
        "parser.cpp",
        "parser.hpp",
        "token.hpp",
        "miho_c.cpp",
        "miho_c.h",
    ] {
        println!("cargo:rerun-if-changed={}", core.join(file).display());
    }
    cc::Build::new()
        .cpp(true)
        .std("c++20")
        .include(&core)
        .files(["lexer.cpp", "parser.cpp", "miho_c.cpp"].map(|file| core.join(file)))
        .compile("miho_core");
}

fn main() {
    build_core();
    tauri_build::build()
}
