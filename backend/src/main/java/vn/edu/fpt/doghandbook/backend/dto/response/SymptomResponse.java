package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SymptomResponse {

    private Integer symptomId;
    private String symptomCode;
    private String symptomName;
    private String category;
    private Integer severityIndicator;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
