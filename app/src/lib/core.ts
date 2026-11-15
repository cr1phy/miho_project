import { invoke, isTauri } from "@tauri-apps/api/core";

/** True inside the desktop app, where the C++ core is linked in; false in a plain browser tab. */
export const coreAvailable = isTauri();

/** Keep in sync with `MAX_VARIABLES` in `src-tauri/src/ffi.rs`. */
export const MAX_TABLE_VARIABLES = 12;

/**
 * Asks the C++ core for the truth table of `expression` (core notation) over `variables`.
 * Row `i` assigns the bits of `i` to the variables, the first variable being the high bit.
 */
export function coreTruthTable(expression: string, variables: string[]) {
	return invoke<boolean[]>("truth_table", { expression, variables });
}
