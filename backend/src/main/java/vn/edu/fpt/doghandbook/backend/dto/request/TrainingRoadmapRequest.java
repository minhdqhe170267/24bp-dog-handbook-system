package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrainingRoadmapRequest {

    @NotBlank
    private String roadmapName;

    private Integer breedId;
    private String targetRole;
    private String description;
    private Integer totalDurationWeeks;
    private String phaseName;
    private Integer phaseOrder;
    private Integer phaseDurationWeeks;
    private String phaseObjectives;
    private String assessmentCriteria;
}
