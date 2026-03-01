package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class TrainingRoadmapResponse {

    private Integer roadmapId;
    private String roadmapName;
    private Integer breedId;
    private String breedName;
    private String targetRole;
    private String description;
    private Integer totalDurationWeeks;
    private String phaseName;
    private Integer phaseOrder;
    private Integer phaseDurationWeeks;
    private String phaseObjectives;
    private String assessmentCriteria;
    private String status;
    private String createdByName;
    private List<RoadmapExerciseItem> exercises;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Getter
    @Setter
    @Builder
    public static class RoadmapExerciseItem {
        private Integer exerciseId;
        private String exerciseName;
        private Integer exerciseOrder;
        private Boolean isMandatory;
    }
}
