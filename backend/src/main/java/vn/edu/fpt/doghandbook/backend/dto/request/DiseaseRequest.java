package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class DiseaseRequest {

    @NotBlank
    private String diseaseName;

    private String severityLevel;
    private String description;
    private String symptomSummary;
    private String treatmentGuidelines;
    private String preventionMeasures;
    private Boolean isContagious;
    private String incubationPeriod;
    private List<SymptomMappingItem> symptomMappings;

    @Getter
    @Setter
    public static class SymptomMappingItem {
        private Integer symptomId;
        private Double weight;
        private Boolean isPrimary;
        private String notes;
    }
}
