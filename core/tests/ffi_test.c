#include "miho_c.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(condition) do { if (!(condition)) { \
    fprintf(stderr, "FFI check failed at line %d: %s\n", __LINE__, #condition); \
    return EXIT_FAILURE; } } while (0)

int main(void)
{
    char error[256];
    int result = -1;
    MihoVariable values[] = {{"A", 1}, {"B", 0}};
    CHECK(miho_evaluate("A -> B", values, 2, &result, error, sizeof error) == MIHO_OK);
    CHECK(result == 0 && error[0] == '\0');
    CHECK(miho_evaluate("~0 | 1", NULL, 0, &result, NULL, 0) == MIHO_OK);
    CHECK(result == 1);
    CHECK(miho_evaluate("A&", values, 2, &result, error, sizeof error) == MIHO_EXPRESSION_ERROR);
    CHECK(result == 0 && strstr(error, "position 2") != NULL);
    CHECK(miho_evaluate("unknown", NULL, 0, &result, error, sizeof error) == MIHO_EXPRESSION_ERROR);
    CHECK(strstr(error, "unknown") != NULL);
    CHECK(miho_evaluate("@", NULL, 0, &result, error, sizeof error) == MIHO_EXPRESSION_ERROR);
    CHECK(strstr(error, "position 0") != NULL);
    CHECK(miho_evaluate("", NULL, 0, &result, error, sizeof error) == MIHO_EXPRESSION_ERROR);

    CHECK(miho_evaluate(NULL, NULL, 0, &result, error, sizeof error) == MIHO_INVALID_ARGUMENT);
    CHECK(miho_evaluate("1", NULL, 1, &result, error, sizeof error) == MIHO_INVALID_ARGUMENT);
    CHECK(miho_evaluate("1", NULL, 0, NULL, error, sizeof error) == MIHO_INVALID_ARGUMENT);
    CHECK(miho_evaluate("1", NULL, 0, &result, NULL, 1) == MIHO_INVALID_ARGUMENT);
    values[0].value = 2;
    CHECK(miho_evaluate("A", values, 1, &result, error, sizeof error) == MIHO_INVALID_ARGUMENT);
    values[0].value = 1;
    values[0].name = NULL;
    CHECK(miho_evaluate("A", values, 1, &result, error, sizeof error) == MIHO_INVALID_ARGUMENT);
    values[0].name = "";
    CHECK(miho_evaluate("A", values, 1, &result, error, sizeof error) == MIHO_INVALID_ARGUMENT);
    values[0].name = "B";
    CHECK(miho_evaluate("B", values, 2, &result, error, sizeof error) == MIHO_INVALID_ARGUMENT);

    {
        char guarded[] = {'x', 'x', 'x', 'x'};
        CHECK(miho_evaluate("@", NULL, 0, &result, guarded + 1, 2) == MIHO_EXPRESSION_ERROR);
        CHECK(guarded[0] == 'x' && guarded[1] == 'U' && guarded[2] == '\0' && guarded[3] == 'x');
        guarded[1] = 'x';
        CHECK(miho_evaluate("@", NULL, 0, &result, guarded + 1, 1) == MIHO_EXPRESSION_ERROR);
        CHECK(guarded[0] == 'x' && guarded[1] == '\0' && guarded[3] == 'x');
        guarded[1] = 'x';
        CHECK(miho_evaluate("@", NULL, 0, &result, guarded + 1, 0) == MIHO_EXPRESSION_ERROR);
        CHECK(guarded[1] == 'x');
    }
    CHECK(miho_evaluate("1", NULL, 0, &result, error, sizeof error) == MIHO_OK);
    CHECK(result == 1 && error[0] == '\0');
    puts("C ABI checks passed");
    return EXIT_SUCCESS;
}
