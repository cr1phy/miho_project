use std::{env, path::PathBuf, process::Command};

fn run(command: &mut Command) {
    let status = command
        .status()
        .expect("Could not start CMake; install cmake and a C++ compiler");
    assert!(status.success(), "Native library build failed: {command:?}");
}

fn normalize_cmake_source_path(path: PathBuf) -> PathBuf {
    #[cfg(windows)]
    {
        let raw = path.to_string_lossy();
        if let Some(rest) = raw.strip_prefix(r"\\?\UNC\") {
            return PathBuf::from(format!(r"\\{rest}"));
        }
        if let Some(rest) = raw.strip_prefix(r"\\?\") {
            return PathBuf::from(rest);
        }
    }
    path
}

fn main() {
    println!("cargo:rerun-if-env-changed=MIHO_CORE_DIR");
    let manifest = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let core = env::var_os("MIHO_CORE_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| manifest.join("../core"))
        .canonicalize()
        .expect("Cannot find ../core; set MIHO_CORE_DIR to the C++ source directory");
    let core = normalize_cmake_source_path(core);
    for file in [
        "CMakeLists.txt",
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
    assert_eq!(
        env::var("HOST").unwrap(),
        env::var("TARGET").unwrap(),
        "Cross-compilation requires a CMake toolchain; this minimal client builds for the host"
    );
    let build = PathBuf::from(env::var_os("OUT_DIR").unwrap()).join("miho-core");
    run(Command::new("cmake")
        .arg("-S")
        .arg(&core)
        .arg("-B")
        .arg(&build)
        .args([
            "-DBUILD_TESTING=OFF",
            "-DBUILD_SHARED_LIBS=OFF",
            "-DCMAKE_BUILD_TYPE=Release",
        ]));
    run(Command::new("cmake").arg("--build").arg(&build).args([
        "--config",
        "Release",
        "--target",
        "miho_project",
    ]));
    println!("cargo:rustc-link-search=native={}", build.display());
    println!(
        "cargo:rustc-link-search=native={}",
        build.join("Release").display()
    );
    println!("cargo:rustc-link-lib=static=miho_project");
    let os = env::var("CARGO_CFG_TARGET_OS").unwrap();
    let environment = env::var("CARGO_CFG_TARGET_ENV").unwrap();
    if os == "macos" {
        println!("cargo:rustc-link-lib=c++");
    } else if environment != "msvc" {
        println!("cargo:rustc-link-lib=stdc++");
    }
}
