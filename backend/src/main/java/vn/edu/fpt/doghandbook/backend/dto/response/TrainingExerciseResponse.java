package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class TrainingExerciseResponse {

    private Integer exerciseId;
    private String exerciseName;
    private String description;
    private String difficultyLevel;
    private Integer methodId;
    private String methodName;
    private String instructions;
    private Integer durationMinutes;
    private String safetyPrecautions;
    private String requiredEquipment;
    private String mediaUrls;
    private String status;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
