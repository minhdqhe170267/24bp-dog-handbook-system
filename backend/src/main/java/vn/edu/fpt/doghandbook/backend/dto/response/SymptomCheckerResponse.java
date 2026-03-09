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
public class SymptomCheckerResponse {

    private List<DiagnosisResult> possibleDiseases;
    private String urgencyLevel;
    private String recommendation;
    private int totalSymptomsChecked;

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DiagnosisResult {
        private Integer diseaseId;
        private String diseaseName;
        private String severityLevel;
        private double matchPercentage;
        private int matchedSymptoms;
        private int totalDiseaseSymptoms;
        private List<String> matchedSymptomNames;
        private List<String> missingSymptomNames;
        private String treatmentGuidelines;
        private String preventionMeasures;
    }
}
