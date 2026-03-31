package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ExerciseProgressResponse {

    private Integer progressId;
    private Integer exerciseId;
    private String exerciseName;
    private String status;
    private BigDecimal score;
    private String trainerNotes;
    private LocalDateTime completedAt;
}
