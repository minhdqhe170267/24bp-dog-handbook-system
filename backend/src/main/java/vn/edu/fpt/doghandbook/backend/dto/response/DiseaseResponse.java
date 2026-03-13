package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DiseaseResponse {

    private Integer diseaseId;
    private String diseaseName;
    private String severityLevel;
    private String description;
    private String symptomSummary;
    private String treatmentGuidelines;
    private String preventionMeasures;
    private Boolean isContagious;
    private String incubationPeriod;
    private String status;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<DiseaseSymptomItem> symptoms;

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DiseaseSymptomItem {
        private Integer symptomId;
        private String symptomName;
        private Double weight;
        private Boolean isPrimary;
    }
}
