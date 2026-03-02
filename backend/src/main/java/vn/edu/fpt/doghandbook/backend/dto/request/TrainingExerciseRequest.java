package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrainingExerciseRequest {

    @NotBlank
    private String exerciseName;

    private String description;

    @NotNull
    private String difficultyLevel;

    private Integer methodId;
    private String instructions;
    private Integer durationMinutes;
    private String safetyPrecautions;
    private String requiredEquipment;
    private String mediaUrls;
}
