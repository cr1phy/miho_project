//! Safe wrapper around the C ABI of the C++ logic core (`core/miho_c.h`).

use std::ffi::{CStr, CString, c_char, c_int};

/// Truth tables grow as 2^n, so the number of variables is capped.
pub const MAX_VARIABLES: usize = 12;

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

fn evaluate_raw(source: &CStr, names: &[CString], values: &[bool]) -> Result<bool, String> {
    let raw: Vec<_> = names
        .iter()
        .zip(values)
        .map(|(name, value)| MihoVariable {
            name: name.as_ptr(),
            value: c_int::from(*value),
        })
        .collect();
    let mut result = 0;
    let mut error = [0 as c_char; 512];
    // SAFETY: `source`, the names behind `raw` and both output buffers stay alive for
    // the whole call, do not overlap and have the declared sizes. The C wrapper catches
    // every C++ exception and always NUL-terminates a nonempty error buffer.
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
        // SAFETY: `error` starts zero-filled and miho_evaluate NUL-terminates it.
        Err(unsafe { CStr::from_ptr(error.as_ptr()) }
            .to_string_lossy()
            .into_owned())
    }
}

fn c_string(text: &str) -> Result<CString, String> {
    CString::new(text).map_err(|_| "Строка содержит нулевой байт".to_string())
}

/// Evaluates `expression` once with the given variable values.
#[cfg(test)]
fn evaluate(expression: &str, variables: &[(&str, bool)]) -> Result<bool, String> {
    let source = c_string(expression)?;
    let names = variables
        .iter()
        .map(|(name, _)| c_string(name))
        .collect::<Result<Vec<_>, _>>()?;
    let values: Vec<_> = variables.iter().map(|(_, value)| *value).collect();
    evaluate_raw(&source, &names, &values)
}

/// Evaluates `expression` for every combination of `variables`.
/// Row `i` assigns the bits of `i` to the variables, the first variable being the most
/// significant bit, so rows go 00…0, 00…1, …, 11…1.
pub fn truth_table(expression: &str, variables: &[String]) -> Result<Vec<bool>, String> {
    if variables.len() > MAX_VARIABLES {
        return Err(format!(
            "Слишком много переменных: {} (максимум {MAX_VARIABLES})",
            variables.len()
        ));
    }
    let source = c_string(expression)?;
    let names = variables
        .iter()
        .map(|name| c_string(name))
        .collect::<Result<Vec<_>, _>>()?;
    let count = names.len();
    let mut values = vec![false; count];
    (0..1usize << count)
        .map(|row| {
            for (index, value) in values.iter_mut().enumerate() {
                *value = row >> (count - 1 - index) & 1 == 1;
            }
            evaluate_raw(&source, &names, &values)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn names(list: &[&str]) -> Vec<String> {
        list.iter().map(|name| name.to_string()).collect()
    }

    fn bits(rows: &[bool]) -> String {
        rows.iter()
            .map(|value| if *value { '1' } else { '0' })
            .collect()
    }

    #[test]
    fn evaluates_through_the_cpp_core() {
        assert_eq!(evaluate("~0 & 1", &[]), Ok(true));
        assert_eq!(evaluate("A -> B", &[("A", true), ("B", false)]), Ok(false));
        assert_eq!(evaluate("_foo2 == 1", &[("_foo2", true)]), Ok(true));
    }

    #[test]
    fn truth_tables_of_every_operator() {
        for (operator, table) in [
            ("&", "0001"),
            ("|", "0111"),
            ("^", "0110"),
            ("->", "1101"),
            ("==", "1001"),
            ("~&", "1110"),
            ("~|", "1000"),
        ] {
            let rows = truth_table(&format!("(A {operator} B)"), &names(&["A", "B"])).unwrap();
            assert_eq!(bits(&rows), table, "operator {operator}");
        }
        assert_eq!(bits(&truth_table("~A", &names(&["A"])).unwrap()), "10");
    }

    #[test]
    fn row_order_puts_the_first_variable_in_the_high_bit() {
        let rows = truth_table("((A & B) | ~C)", &names(&["A", "B", "C"])).unwrap();
        assert_eq!(bits(&rows), "10101011");
        // A variable the expression does not mention only repeats rows.
        assert_eq!(
            bits(&truth_table("B", &names(&["A", "B"])).unwrap()),
            "0101"
        );
        assert_eq!(truth_table("1", &[]), Ok(vec![true]));
    }

    #[test]
    fn core_errors_are_returned() {
        assert!(
            truth_table("A &", &names(&["A"]))
                .unwrap_err()
                .contains("position 3")
        );
        assert!(
            truth_table("A", &[])
                .unwrap_err()
                .contains("Missing variable")
        );
        assert!(
            truth_table("A", &names(&["A", "A"]))
                .unwrap_err()
                .contains("Duplicate")
        );
        assert!(truth_table("", &[]).is_err());
        assert!(truth_table("A\0B", &[]).is_err());
        let many: Vec<String> = (0..=MAX_VARIABLES)
            .map(|index| format!("X{index}"))
            .collect();
        assert!(truth_table("1", &many).unwrap_err().contains("максимум"));
    }

    #[test]
    fn parallel_calls_do_not_share_state() {
        let threads: Vec<_> = (0..8)
            .map(|_| {
                std::thread::spawn(|| {
                    for _ in 0..100 {
                        assert_eq!(evaluate("A | ~A", &[("A", false)]), Ok(true));
                        assert!(evaluate("missing", &[]).is_err());
                    }
                })
            })
            .collect();
        for thread in threads {
            thread.join().unwrap();
        }
    }
}
