#ifndef MIHO_C_H
#define MIHO_C_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct MihoVariable
{
    const char* name;
    int value; /* Exactly 0 or 1. */
} MihoVariable;

enum MihoStatus
{
    MIHO_OK = 0,
    MIHO_INVALID_ARGUMENT = 1,
    MIHO_EXPRESSION_ERROR = 2,
    MIHO_INTERNAL_ERROR = 3
};

/* Evaluate a NUL-terminated expression. No allocations cross the ABI.
 * source and result must not be NULL. variables may be NULL only when count is 0.
 * Each name must be a nonempty NUL-terminated string; duplicate names are invalid.
 * error may be NULL only when error_capacity is 0. Otherwise it must point to
 * error_capacity writable bytes; the message is truncated and NUL-terminated.
 * result is set to 0 on failure and 0/1 on success. No C++ exceptions escape.
 * Callers own all buffers, must keep them valid during the call, and must not
 * overlap input/output buffers. Calls with separate buffers are thread-safe.
 */
int miho_evaluate(const char* source, const MihoVariable* variables, size_t count,
                  int* result, char* error, size_t error_capacity);

#ifdef __cplusplus
}
#endif

#endif
