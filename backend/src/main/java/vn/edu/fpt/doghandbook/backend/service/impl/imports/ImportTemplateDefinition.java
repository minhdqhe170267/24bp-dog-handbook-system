package vn.edu.fpt.doghandbook.backend.service.impl.imports;

import java.util.List;

public record ImportTemplateDefinition(
        String entityType,
        String templateName,
        String description,
        List<String> instructions,
        List<ImportFieldDefinition> columns
) {

    public ImportTemplateDefinition {
        instructions = instructions == null ? List.of() : List.copyOf(instructions);
        columns = columns == null ? List.of() : List.copyOf(columns);
    }
}
