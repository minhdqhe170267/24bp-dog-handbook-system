package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ImportTemplateResponse {
    private String templateName;
    private String entityType;
    private String description;
    private List<String> requiredColumns;
    private List<String> optionalColumns;
    private List<String> supportedFileTypes;
    private String downloadUrl;
    private List<String> instructions;
    private List<ImportColumnSpecResponse> columns;
}
