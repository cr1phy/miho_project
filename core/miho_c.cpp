#include "miho_c.h"
#include "parser.hpp"
#include <cstring>
#include <new>

namespace
{
void writeError(char* buffer, std::size_t capacity, const char* message) noexcept
{
    if (!buffer || capacity == 0)
        return;
    const std::size_t length = std::strlen(message);
    const std::size_t copied = length < capacity - 1 ? length : capacity - 1;
    std::memcpy(buffer, message, copied);
    buffer[copied] = '\0';
}
}

extern "C" int miho_evaluate(const char* source, const MihoVariable* variables,
                              size_t count, int* result, char* error, size_t error_capacity)
{
    if (result)
        *result = 0;
    if (!source || !result || (!variables && count != 0) || (!error && error_capacity != 0))
    {
        writeError(error, error_capacity, "Invalid argument");
        return MIHO_INVALID_ARGUMENT;
    }
    writeError(error, error_capacity, "");
    try
    {
        Expression::Variables values;
        for (std::size_t i = 0; i < count; ++i)
        {
            if (!variables[i].name || variables[i].name[0] == '\0' ||
                (variables[i].value != 0 && variables[i].value != 1))
            {
                writeError(error, error_capacity, "Invalid variable name or value");
                return MIHO_INVALID_ARGUMENT;
            }
            if (!values.emplace(variables[i].name, variables[i].value != 0).second)
            {
                writeError(error, error_capacity, "Duplicate variable name");
                return MIHO_INVALID_ARGUMENT;
            }
        }
        *result = Parser(std::string(source)).parse()->evaluate(values) ? 1 : 0;
        return MIHO_OK;
    }
    catch (const std::bad_alloc&)
    {
        writeError(error, error_capacity, "Not enough memory");
        return MIHO_INTERNAL_ERROR;
    }
    catch (const std::exception& exception)
    {
        writeError(error, error_capacity, exception.what());
        return MIHO_EXPRESSION_ERROR;
    }
    catch (...)
    {
        writeError(error, error_capacity, "Unknown internal error");
        return MIHO_INTERNAL_ERROR;
    }
}
