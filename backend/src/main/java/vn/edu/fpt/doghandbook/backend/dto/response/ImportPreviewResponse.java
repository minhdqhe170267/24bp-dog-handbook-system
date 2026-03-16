package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ImportPreviewResponse {
    private String fileName;
    private String fileType;
    private Integer totalRows;
    private Integer validRows;
    private Integer errorRows;
    private List<Map<String, Object>> previewData;
    private List<String> columns;
    private List<String> errors;
}
