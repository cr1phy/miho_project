use std::{
    collections::HashSet,
    ffi::{CStr, CString, c_char, c_int},
};

#[repr(C)]
struct MihoVariable {
    name: *const c_char,
    value: c_int,
}

unsafe extern "C" {
    fn miho_evaluate(
        source: *const c_char,
        variables: *const MihoVariable,
        count: usize,
        result: *mut c_int,
        error: *mut c_char,
        error_capacity: usize,
    ) -> c_int;
}

fn variables(input: &str) -> Result<Vec<(CString, c_int)>, String> {
    if input.trim().is_empty() {
        return Ok(Vec::new());
    }
    let mut seen = HashSet::new();
    input
        .split(',')
        .map(|item| {
            let (name, value) = item.split_once('=').ok_or("Формат переменных: A=1, B=0")?;
            let name = name.trim();
            let valid = !name.is_empty()
                && name.bytes().enumerate().all(|(i, c)| {
                    c.is_ascii_alphabetic() || c == b'_' || (i > 0 && c.is_ascii_digit())
                });
            if !valid {
                return Err(format!("Некорректное имя переменной: {name}"));
            }
            if !seen.insert(name) {
                return Err(format!("Переменная {name} указана дважды"));
            }
            let value = match value.trim() {
                "0" => 0,
                "1" => 1,
                _ => return Err(format!("Значение {name} должно быть 0 или 1")),
            };
            Ok((CString::new(name).map_err(|e| e.to_string())?, value))
        })
        .collect()
}

pub fn evaluate(expression: &str, assignments: &str) -> Result<bool, String> {
    let source =
        CString::new(expression).map_err(|_| "Выражение содержит нулевой байт".to_string())?;
    let owned = variables(assignments)?;
    let raw: Vec<_> = owned
        .iter()
        .map(|(name, value)| MihoVariable {
            name: name.as_ptr(),
            value: *value,
        })
        .collect();
    let mut result = 0;
    let mut error = [0 as c_char; 1024];
    // SAFETY: CString storage and the array remain alive throughout the call.
    // All buffers are separate and have the declared capacity. The C wrapper
    // catches C++ exceptions and always terminates a nonempty error buffer.
    let status = unsafe {
        miho_evaluate(
            source.as_ptr(),
            raw.as_ptr(),
            raw.len(),
            &mut result,
            error.as_mut_ptr(),
            error.len(),
        )
    };
    if status == 0 {
        Ok(result != 0)
    } else {
        // SAFETY: error starts zero-filled and miho_evaluate NUL-terminates it.
        let message = unsafe { CStr::from_ptr(error.as_ptr()) }.to_string_lossy();
        Err(message.into_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn real_cpp_evaluation() {
        assert_eq!(evaluate("~0 & 1", ""), Ok(true));
        assert_eq!(evaluate("A -> B", "A=1, B=0"), Ok(false));
        assert_eq!(evaluate("A ^ B", " A = 0, B = 1 "), Ok(true));
        assert_eq!(evaluate("_foo2 == 1", "_foo2=1"), Ok(true));
    }

    #[test]
    fn all_operators_cross_abi() {
        for (operator, table) in [
            ("&", "0001"),
            ("|", "0111"),
            ("^", "0110"),
            ("->", "1101"),
            ("==", "1001"),
            ("~&", "1110"),
            ("~|", "1000"),
        ] {
            for row in 0..4 {
                let expected = table.as_bytes()[row] == b'1';
                assert_eq!(
                    evaluate(
                        &format!("A {operator} B"),
                        &format!("A={}, B={}", row / 2, row % 2)
                    ),
                    Ok(expected)
                );
            }
        }
    }

    #[test]
    fn cpp_errors_are_returned() {
        assert!(evaluate("A &", "A=1").unwrap_err().contains("position 3"));
        assert!(evaluate("A", "").unwrap_err().contains("Missing variable"));
        assert!(evaluate("@", "").unwrap_err().contains("position 0"));
        assert!(evaluate("", "").is_err());
        assert!(evaluate("A\0B", "").is_err());
        assert!(evaluate("Я", "").is_err());
    }

    #[test]
    fn invalid_assignments() {
        for input in ["A", "A=2", "=0", "2A=1", "A=1,A=0", "A=1,", "А=1", "A=1=0"] {
            assert!(evaluate("1", input).is_err(), "accepted {input}");
        }
    }

    #[test]
    fn parallel_calls_have_no_shared_error_state() {
        let threads: Vec<_> = (0..8)
            .map(|_| {
                std::thread::spawn(|| {
                    for _ in 0..100 {
                        assert_eq!(evaluate("A | ~A", "A=0"), Ok(true));
                        assert!(evaluate("missing", "").is_err());
                    }
                })
            })
            .collect();
        for thread in threads {
            thread.join().unwrap();
        }
    }
}
