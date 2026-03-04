package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContentSuggestionRequest {

    @NotNull
    private String suggestionType;

    private Integer relatedExerciseId;

    @NotBlank
    private String title;

    @NotBlank
    private String description;
}
