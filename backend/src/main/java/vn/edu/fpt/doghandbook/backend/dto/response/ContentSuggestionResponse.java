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
public class ContentSuggestionResponse {

    private Integer suggestionId;
    private Integer trainerId;
    private String trainerName;
    private String suggestionType;
    private Integer relatedExerciseId;
    private String relatedExerciseName;
    private String title;
    private String description;
    private String status;
    private String adminResponse;
    private Integer reviewedById;
    private String reviewedByName;
    private LocalDateTime reviewedAt;
    private LocalDateTime submittedAt;
}
