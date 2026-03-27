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
public class ImportColumnSpecResponse {
    private String fieldName;
    private String name;
    private String label;
    private boolean required;
    private String dataType;
    private List<String> allowedValues;
    private String description;
    private String example;
}
