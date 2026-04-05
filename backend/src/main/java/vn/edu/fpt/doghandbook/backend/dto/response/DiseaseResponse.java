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
    private List<DiseaseMedicationItem> medications;
    private List<DiseaseFirstAidItem> firstAidGuides;

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

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DiseaseMedicationItem {
        private Integer medicationId;
        private String medicationName;
        private String dosageInstructions;
        private String administrationMethod;
        private Integer priority;
        private String notes;
    }

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DiseaseFirstAidItem {
        private Integer guideId;
        private String guideTitle;
        private String emergencyType;
        private String immediateSteps;
        private Integer priority;
        private String notes;
    }
}
