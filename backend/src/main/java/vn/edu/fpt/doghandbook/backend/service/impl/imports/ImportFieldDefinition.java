package vn.edu.fpt.doghandbook.backend.service.impl.imports;

import java.util.List;

public record ImportFieldDefinition(
        String name,
        boolean required,
        ImportFieldType dataType,
        List<String> aliases,
        List<String> allowedValues,
        String description,
        String example
) {

    public ImportFieldDefinition {
        aliases = aliases == null ? List.of() : List.copyOf(aliases);
        allowedValues = allowedValues == null ? List.of() : List.copyOf(allowedValues);
    }
}
